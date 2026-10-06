/**
 * Where server data comes from, fixed at build time.
 * - `live`: the same-origin `/api/servers` route (Node hosting, e.g. Vercel).
 * - `snapshot`: a static build (GitHub Pages) reading `snapshot.json`, which a scheduled
 *   GitHub Actions job rewrites on a data branch about once a minute.
 */
export const DATA_SOURCE: "live" | "snapshot" =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "snapshot" ? "snapshot" : "live";

/** `owner/repo` holding the data branch (snapshot mode only). */
export const SNAPSHOT_REPO = process.env.NEXT_PUBLIC_SNAPSHOT_REPO ?? "princegrid/parry";
export const SNAPSHOT_BRANCH = process.env.NEXT_PUBLIC_SNAPSHOT_BRANCH ?? "data";

/** A snapshot older than this is called out as delayed. */
export const SNAPSHOT_STALE_MS = 5 * 60_000;
