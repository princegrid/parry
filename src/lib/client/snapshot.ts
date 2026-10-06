import { isCursor, isInstanceId, TRADING_PLACE_ID } from "@/lib/roblox/constants";
import type { ServerInstance, ServerPage, SortOrder } from "@/lib/roblox/types";

import type { FetchResult } from "./api";
import { SNAPSHOT_BRANCH, SNAPSHOT_REPO } from "./source";

/* Shape written by scripts/snapshot.mjs onto the data branch. */
interface SnapshotPage {
  fetchedAt: string;
  servers: ServerInstance[];
  /** Roblox reported more pages after this one. */
  hasMore: boolean;
}
interface SnapshotFile {
  placeId: string;
  updatedAt: string;
  sorts: Record<SortOrder, SnapshotPage[]>;
}

/*
 * Primary: the GitHub contents API. It serves the branch head with a 60s cache, sends CORS
 * headers, and conditional requests (ETag, 304) do not count against the 60 requests/hour
 * an anonymous visitor gets. Fallback: raw.githubusercontent.com, which has no visitor quota
 * but a CDN cache of up to 5 minutes. Either way, each page carries its real fetch time.
 */
const API_URL = `https://api.github.com/repos/${SNAPSHOT_REPO}/contents/snapshot.json?ref=${SNAPSHOT_BRANCH}`;
const RAW_URL = `https://raw.githubusercontent.com/${SNAPSHOT_REPO}/${SNAPSHOT_BRANCH}/snapshot.json`;

/** Load more reads from the snapshot the first page came from, so pages always match. */
let current: SnapshotFile | null = null;

function isPage(value: unknown): value is SnapshotPage {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<SnapshotPage>;
  return typeof p.fetchedAt === "string" && Array.isArray(p.servers) && typeof p.hasMore === "boolean";
}

function isSnapshot(value: unknown): value is SnapshotFile {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Partial<SnapshotFile>;
  return (
    typeof s.updatedAt === "string" &&
    !!s.sorts &&
    Array.isArray(s.sorts.asc) &&
    Array.isArray(s.sorts.desc) &&
    s.sorts.asc.every(isPage) &&
    s.sorts.desc.every(isPage)
  );
}

async function download(url: string, signal: AbortSignal, accept: string) {
  const response = await fetch(url, { signal, cache: "no-cache", headers: { accept } });
  if (!response.ok) return { status: response.status, body: undefined };
  try {
    return { status: response.status, body: (await response.json()) as unknown };
  } catch {
    return { status: response.status, body: undefined };
  }
}

async function loadSnapshot(signal: AbortSignal): Promise<SnapshotFile | "missing" | "shape"> {
  let result = await download(API_URL, signal, "application/vnd.github.raw+json").catch((e) => {
    if (signal.aborted) throw e;
    return null;
  });
  // Visitor quota spent (403/429) or API unreachable: use the raw CDN copy instead.
  if (!result || result.status === 403 || result.status === 429 || result.status >= 500) {
    result = await download(RAW_URL, signal, "application/json");
  }
  if (result.status === 404) return "missing";
  if (!isSnapshot(result.body)) return "shape";
  return result.body;
}

function pageIndex(cursor: string | null) {
  if (cursor === null) return 0;
  const match = isCursor(cursor) ? /^page([0-9]{1,3})$/.exec(cursor) : null;
  return match ? Number(match[1]) : -1;
}

/** Snapshot-mode equivalent of the live API route. Never throws. */
export async function fetchSnapshotPage(
  sort: SortOrder,
  cursor: string | null,
  signal: AbortSignal,
): Promise<FetchResult> {
  const index = pageIndex(cursor);
  if (index < 0) {
    return { ok: false, error: { kind: "cursor_invalid", message: "That page of results has expired." } };
  }

  try {
    if (index === 0 || !current) {
      const loaded = await loadSnapshot(signal);
      if (loaded === "missing") {
        return {
          ok: false,
          error: { kind: "upstream", message: "No snapshot has been published yet." },
        };
      }
      if (loaded === "shape") {
        return { ok: false, error: { kind: "shape", message: "The snapshot file was unreadable." } };
      }
      current = loaded;
    }
  } catch {
    if (signal.aborted) return { ok: false, aborted: true };
    return { ok: false, error: { kind: "network", message: "The snapshot could not be downloaded." } };
  }

  const pages = current.sorts[sort];
  const page = pages[index];
  if (!page) {
    return { ok: false, error: { kind: "cursor_invalid", message: "That page of results has expired." } };
  }
  const isLast = index === pages.length - 1;
  return {
    ok: true,
    page: {
      placeId: TRADING_PLACE_ID,
      sort,
      servers: page.servers.filter((s) => isInstanceId(s.id)),
      nextCursor: isLast ? null : `page${index + 1}`,
      fetchedAt: page.fetchedAt,
      cache: "hit",
      truncated: isLast && page.hasMore,
    } satisfies ServerPage,
  };
}
