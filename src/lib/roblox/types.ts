/** Upstream sort values accepted by the Roblox public-servers endpoint. */
export type SortOrder = "asc" | "desc";

/** One public instance, normalised. Metrics the API omits or garbles are `null`, never 0. */
export interface ServerInstance {
  id: string;
  playing: number | null;
  maxPlayers: number | null;
  /** Ping as reported by the Roblox API for the instance. Not the visitor's latency. */
  ping: number | null;
  fps: number | null;
}

/** Successful response body of `GET /api/servers`. */
export interface ServerPage {
  placeId: string;
  sort: SortOrder;
  servers: ServerInstance[];
  nextCursor: string | null;
  /** ISO time the page was fetched from Roblox (cached pages keep their original time). */
  fetchedAt: string;
  /**
   * `stale`: Roblox is rate-limiting, so this is the most recent saved copy.
   * `retryAfter` then says when a fresh copy can be requested.
   */
  cache: "hit" | "miss" | "stale";
  retryAfter?: number;
  /** Snapshot mode: this is the last stored page but Roblox had more. */
  truncated?: boolean;
}

export type ApiErrorCode =
  | "bad_request"
  | "cursor_invalid"
  | "rate_limited"
  | "upstream_timeout"
  | "upstream_unreachable"
  | "upstream_error"
  | "upstream_shape";

/** Error response body of `GET /api/servers`. */
export interface ApiErrorBody {
  error: ApiErrorCode;
  message: string;
  /** Seconds until a retry is worthwhile; present on `rate_limited`. */
  retryAfter?: number;
}
