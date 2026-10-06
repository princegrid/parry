import type { ApiErrorBody, ServerPage, SortOrder } from "@/lib/roblox/types";

import { fetchSnapshotPage } from "./snapshot";
import { DATA_SOURCE } from "./source";

export type FetchErrorKind =
  | "rate_limited"
  | "network"
  | "timeout"
  | "upstream"
  | "shape"
  | "cursor_invalid"
  | "bad_request";

export interface FetchError {
  kind: FetchErrorKind;
  message: string;
  /** Seconds to wait, for `rate_limited`. */
  retryAfter?: number;
}

export type FetchResult =
  | { ok: true; page: ServerPage }
  | { ok: false; error: FetchError }
  | { ok: false; aborted: true };

const CLIENT_TIMEOUT_MS = 15_000;
const FALLBACK_COOLDOWN_S = 60;

const KIND_BY_CODE: Record<ApiErrorBody["error"], FetchErrorKind> = {
  rate_limited: "rate_limited",
  upstream_timeout: "timeout",
  upstream_unreachable: "network",
  upstream_error: "upstream",
  upstream_shape: "shape",
  cursor_invalid: "cursor_invalid",
  bad_request: "bad_request",
};

function isServerPage(value: unknown): value is ServerPage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<ServerPage>;
  return (
    Array.isArray(v.servers) &&
    (v.nextCursor === null || typeof v.nextCursor === "string") &&
    typeof v.fetchedAt === "string" &&
    (v.sort === "asc" || v.sort === "desc") &&
    (v.cache === "hit" || v.cache === "miss" || v.cache === "stale")
  );
}

/** Fetches one page from the build's data source. Never throws. */
export function fetchServerPage(sort: SortOrder, cursor: string | null, signal: AbortSignal) {
  return DATA_SOURCE === "snapshot"
    ? fetchSnapshotPage(sort, cursor, signal)
    : fetchLivePage(sort, cursor, signal);
}

/** Fetches one page through the same-origin API route. Never throws. */
async function fetchLivePage(
  sort: SortOrder,
  cursor: string | null,
  signal: AbortSignal,
): Promise<FetchResult> {
  const params = new URLSearchParams({ sort });
  if (cursor) params.set("cursor", cursor);

  const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`/api/servers?${params}`, {
      signal: AbortSignal.any([signal, timeout]),
      headers: { accept: "application/json" },
    });
  } catch {
    if (signal.aborted) return { ok: false, aborted: true };
    if (timeout.aborted) {
      return { ok: false, error: { kind: "timeout", message: "The request took too long." } };
    }
    return {
      ok: false,
      error: { kind: "network", message: "Your connection to this site failed." },
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (signal.aborted) return { ok: false, aborted: true };
    body = undefined;
  }

  if (response.ok) {
    if (isServerPage(body)) return { ok: true, page: body };
    return { ok: false, error: { kind: "shape", message: "The server list came back unreadable." } };
  }

  const apiError = body as Partial<ApiErrorBody> | undefined;
  const kind =
    (apiError?.error && KIND_BY_CODE[apiError.error]) ||
    (response.status === 429 ? "rate_limited" : "upstream");
  const headerWait = Number(response.headers.get("retry-after"));
  return {
    ok: false,
    error: {
      kind,
      message: apiError?.message ?? `Request failed with status ${response.status}.`,
      retryAfter:
        kind === "rate_limited"
          ? apiError?.retryAfter ?? (Number.isFinite(headerWait) && headerWait > 0 ? headerWait : FALLBACK_COOLDOWN_S)
          : undefined,
    },
  };
}
