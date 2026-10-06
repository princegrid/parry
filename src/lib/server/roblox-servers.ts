import "server-only";

import {
  PAGE_LIMIT,
  SERVERS_ENDPOINT,
  TRADING_PLACE_ID,
  isCursor,
  isInstanceId,
} from "@/lib/roblox/constants";
import type { ApiErrorBody, ServerInstance, ServerPage, SortOrder } from "@/lib/roblox/types";

/**
 * How long a fetched page is reused. Roblox allows roughly 3 calls a minute per
 * server IP, shared by every visitor, so pages are reused for 30s.
 */
const CACHE_TTL_MS = 30_000;
/** While rate-limited, a saved page up to this old is served (clearly labelled) instead of an error. */
const STALE_MAX_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 120;
const UPSTREAM_TIMEOUT_MS = 8_000;
/** Used when Roblox rate-limits without saying for how long. */
const FALLBACK_COOLDOWN_S = 60;
const MAX_COOLDOWN_S = 300;

export type PageOutcome =
  | { ok: true; page: ServerPage }
  | { ok: false; status: number; body: ApiErrorBody };

interface CacheEntry {
  fetched: number;
  page: Omit<ServerPage, "cache" | "retryAfter">;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PageOutcome>>();
/** Epoch ms before which we do not call Roblox at all (set after a 429 or an exhausted quota). */
let blockedUntil = 0;

function cacheKey(sort: SortOrder, cursor: string | null) {
  return `${sort}:${cursor ?? ""}`;
}

function remember(key: string, page: CacheEntry["page"]) {
  cache.delete(key); // re-insert so iteration order stays oldest-first
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, entry] of cache) if (now - entry.fetched > STALE_MAX_MS) cache.delete(k);
    // Still full: drop the oldest insertion.
    if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  }
  cache.set(key, { fetched: Date.now(), page });
}

/** A saved copy to show while Roblox is refusing new requests, if one is recent enough. */
function staleOr(key: string, outcome: PageOutcome): PageOutcome {
  if (outcome.ok || outcome.body.error !== "rate_limited") return outcome;
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.fetched > STALE_MAX_MS) return outcome;
  return { ok: true, page: { ...entry.page, cache: "stale", retryAfter: outcome.body.retryAfter } };
}

function finiteOrNull(value: unknown, { min, max }: { min: number; max: number }) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
}

function normaliseServer(raw: unknown): ServerInstance | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (!isInstanceId(s.id)) return null;
  const playing = finiteOrNull(s.playing, { min: 0, max: 1000 });
  const maxPlayers = finiteOrNull(s.maxPlayers, { min: 1, max: 1000 });
  return {
    id: s.id.toLowerCase(),
    playing: playing === null ? null : Math.round(playing),
    maxPlayers: maxPlayers === null ? null : Math.round(maxPlayers),
    ping: finiteOrNull(s.ping, { min: 0, max: 60_000 }),
    fps: finiteOrNull(s.fps, { min: 0.1, max: 1000 }),
  };
}

/** Reads `Retry-After` (seconds or HTTP date), then `x-ratelimit-reset`, in seconds. */
export function parseRetryAfter(headers: Headers): number | null {
  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return clampCooldown(seconds);
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return clampCooldown((date - Date.now()) / 1000);
  }
  const reset = headers.get("x-ratelimit-reset")?.match(/\d+/)?.[0];
  if (reset) return clampCooldown(Number(reset));
  return null;
}

function clampCooldown(seconds: number) {
  return Math.min(MAX_COOLDOWN_S, Math.max(1, Math.ceil(seconds)));
}

function rateLimited(retryAfter: number): PageOutcome {
  return {
    ok: false,
    status: 429,
    body: {
      error: "rate_limited",
      message: "Roblox is limiting requests to the server list.",
      retryAfter,
    },
  };
}

async function fetchUpstream(sort: SortOrder, cursor: string | null): Promise<PageOutcome> {
  const params = new URLSearchParams({
    sortOrder: sort === "asc" ? "Asc" : "Desc",
    limit: String(PAGE_LIMIT),
  });
  if (cursor) params.set("cursor", cursor);

  let response: Response;
  try {
    response = await fetch(`${SERVERS_ENDPOINT}?${params}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      body: timedOut
        ? { error: "upstream_timeout", message: "Roblox took too long to respond." }
        : { error: "upstream_unreachable", message: "Roblox could not be reached." },
    };
  }

  if (response.status === 429) {
    const retryAfter = parseRetryAfter(response.headers) ?? FALLBACK_COOLDOWN_S;
    blockedUntil = Date.now() + retryAfter * 1000;
    return rateLimited(retryAfter);
  }

  // Quota spent on this call: hold further upstream calls until the window resets.
  if (response.headers.get("x-ratelimit-remaining")?.trim().startsWith("0")) {
    const reset = parseRetryAfter(response.headers);
    if (reset) blockedUntil = Date.now() + reset * 1000;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = undefined;
  }

  if (!response.ok) {
    const invalidCursor =
      response.status === 400 &&
      JSON.stringify(json ?? "").toLowerCase().includes("cursor");
    if (invalidCursor) {
      return {
        ok: false,
        status: 400,
        body: { error: "cursor_invalid", message: "That page of results has expired." },
      };
    }
    return {
      ok: false,
      status: 502,
      body: { error: "upstream_error", message: `Roblox responded with status ${response.status}.` },
    };
  }

  const body = json as { data?: unknown; nextPageCursor?: unknown } | undefined;
  if (!body || !Array.isArray(body.data)) {
    return {
      ok: false,
      status: 502,
      body: { error: "upstream_shape", message: "Roblox returned a response in an unexpected format." },
    };
  }

  const servers: ServerInstance[] = [];
  const seen = new Set<string>();
  for (const raw of body.data) {
    const server = normaliseServer(raw);
    if (server && !seen.has(server.id)) {
      seen.add(server.id);
      servers.push(server);
    }
  }

  const page: CacheEntry["page"] = {
    placeId: TRADING_PLACE_ID,
    sort,
    servers,
    nextCursor: isCursor(body.nextPageCursor) ? body.nextPageCursor : null,
    fetchedAt: new Date().toISOString(),
  };
  remember(cacheKey(sort, cursor), page);
  return { ok: true, page: { ...page, cache: "miss" } };
}

/**
 * Returns one page of public instances for the trading place.
 * Serves a fresh cached copy when possible, shares concurrent identical requests,
 * and stops calling Roblox while it is rate-limiting us.
 */
export async function getServerPage(sort: SortOrder, cursor: string | null): Promise<PageOutcome> {
  const key = cacheKey(sort, cursor);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetched < CACHE_TTL_MS) {
    return { ok: true, page: { ...cached.page, cache: "hit" } };
  }

  const waitMs = blockedUntil - Date.now();
  if (waitMs > 0) return staleOr(key, rateLimited(clampCooldown(waitMs / 1000)));

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = fetchUpstream(sort, cursor)
    .then((outcome) => staleOr(key, outcome))
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

/* ---------- light per-client guard so the route cannot be used to hammer Roblox ---------- */

const CLIENT_WINDOW_MS = 60_000;
const CLIENT_MAX_REQUESTS = 30;
const clientHits = new Map<string, number[]>();

/** Returns seconds to wait when this client exceeded its budget, otherwise `null`. */
export function clientRetryAfter(clientKey: string): number | null {
  const now = Date.now();
  const hits = (clientHits.get(clientKey) ?? []).filter((t) => now - t < CLIENT_WINDOW_MS);
  if (hits.length >= CLIENT_MAX_REQUESTS) {
    clientHits.set(clientKey, hits);
    return clampCooldown((hits[0] + CLIENT_WINDOW_MS - now) / 1000);
  }
  hits.push(now);
  clientHits.set(clientKey, hits);
  if (clientHits.size > 5_000) {
    for (const [k, v] of clientHits) if (!v.some((t) => now - t < CLIENT_WINDOW_MS)) clientHits.delete(k);
  }
  return null;
}
