/** Blade Ball trading place. */
export const TRADING_PLACE_ID = "16581637217";

/** Fixed upstream endpoint. The API route never accepts a different host or path. */
export const SERVERS_ENDPOINT = `https://games.roblox.com/v1/games/${TRADING_PLACE_ID}/servers/Public`;

/** Largest page size the endpoint accepts. */
export const PAGE_LIMIT = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isInstanceId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * Roblox page cursors are opaque base64 tokens. Anything outside this alphabet,
 * or absurdly long, is rejected before it reaches the upstream request.
 */
const CURSOR = /^[A-Za-z0-9+/=_-]{1,2048}$/;

export function isCursor(value: unknown): value is string {
  return typeof value === "string" && CURSOR.test(value);
}
