import { TRADING_PLACE_ID } from "./constants";

/*
 * Roblox documents two deep-link forms that accept `placeId` and `gameInstanceId`
 * (create.roblox.com/docs/production/promotion/deeplinks):
 *   Direct to app:     roblox://placeId=<id>&gameInstanceId=<jobId>
 *   Web listing to app: https://www.roblox.com/games/start?placeId=<id>&gameInstanceId=<jobId>
 * The `roblox://experiences/start?...` form used by the original script is not documented.
 */

function query(instanceId: string) {
  return new URLSearchParams({ placeId: TRADING_PLACE_ID, gameInstanceId: instanceId }).toString();
}

/** Opens the installed Roblox client directly. Desktop and mobile apps register this scheme. */
export function appJoinUri(instanceId: string) {
  return `roblox://${query(instanceId)}`;
}

/** Shareable https link. Opens roblox.com, which hands off to the app (or app store on mobile). */
export function webJoinUrl(instanceId: string) {
  return `https://www.roblox.com/games/start?${query(instanceId)}`;
}

/** `6a119422…4f38` style label for dense layouts; the full ID is always available nearby. */
export function shortId(instanceId: string) {
  return `${instanceId.slice(0, 8)}…${instanceId.slice(-4)}`;
}
