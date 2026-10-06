#!/usr/bin/env node
/**
 * Writes snapshot.json (Blade Ball trading servers) to the `data` branch.
 *
 *   node scripts/snapshot.mjs            one snapshot, then exit (manual refresh)
 *   node scripts/snapshot.mjs --loop     one snapshot per minute until LOOP_MINUTES elapse
 *
 * Env: GITHUB_TOKEN (contents:write), GITHUB_REPOSITORY (owner/repo),
 *      DATA_BRANCH (default "data"), LOOP_MINUTES (default 340).
 *
 * Roblox allows about 3 calls a minute per IP, so each minute fetches page 1 of both
 * orders plus page 2 of one order (alternating). The branch keeps a single commit that
 * is amended and force-pushed, so the repository does not grow.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PLACE_ID = "16581637217";
const ENDPOINT = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public`;
const PAGES_PER_SORT = 2;
const SPACING_MS = 20_500; // three calls a minute, just under the quota
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURSOR = /^[A-Za-z0-9+/=_-]{1,2048}$/;

const loop = process.argv.includes("--loop");
const loopMinutes = Number(process.env.LOOP_MINUTES ?? 340);
const branch = process.env.DATA_BRANCH ?? "data";
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log(new Date().toISOString(), ...args);

/* ---------------- Roblox ---------------- */

let blockedUntil = 0;

function num(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function normalise(raw) {
  if (!raw || typeof raw !== "object" || !UUID.test(raw.id)) return null;
  const playing = num(raw.playing, 0, 1000);
  const maxPlayers = num(raw.maxPlayers, 1, 1000);
  return {
    id: raw.id.toLowerCase(),
    playing: playing === null ? null : Math.round(playing),
    maxPlayers: maxPlayers === null ? null : Math.round(maxPlayers),
    ping: num(raw.ping, 0, 60_000),
    fps: num(raw.fps, 0.1, 1000),
  };
}

function retryAfterSeconds(headers) {
  const value = headers.get("retry-after") ?? headers.get("x-ratelimit-reset");
  const seconds = Number(value?.match(/\d+/)?.[0]);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 300) : 60;
}

/** Returns { page, cursor } or null when the call failed (the previous page is then kept). */
async function fetchPage(sort, cursor) {
  const wait = blockedUntil - Date.now();
  if (wait > 0) await sleep(wait);
  const params = new URLSearchParams({ sortOrder: sort === "asc" ? "Asc" : "Desc", limit: "100" });
  if (cursor) params.set("cursor", cursor);
  try {
    const response = await fetch(`${ENDPOINT}?${params}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 429) {
      const seconds = retryAfterSeconds(response.headers);
      blockedUntil = Date.now() + seconds * 1000;
      log(`rate limited on ${sort}; waiting ${seconds}s`);
      return null;
    }
    if (response.headers.get("x-ratelimit-remaining")?.trim().startsWith("0")) {
      blockedUntil = Date.now() + retryAfterSeconds(response.headers) * 1000;
    }
    if (!response.ok) {
      log(`roblox ${response.status} on ${sort}`);
      return null;
    }
    const body = await response.json();
    if (!Array.isArray(body?.data)) {
      log(`unexpected response shape on ${sort}`);
      return null;
    }
    const seen = new Set();
    const servers = [];
    for (const raw of body.data) {
      const server = normalise(raw);
      if (server && !seen.has(server.id)) {
        seen.add(server.id);
        servers.push(server);
      }
    }
    const next = CURSOR.test(body.nextPageCursor ?? "") ? body.nextPageCursor : null;
    return { page: { fetchedAt: new Date().toISOString(), servers, hasMore: next !== null }, cursor: next };
  } catch (error) {
    log(`fetch failed on ${sort}: ${error.message}`);
    return null;
  }
}

/* ---------------- state + git ---------------- */

const state = {
  asc: { pages: [], cursors: [] },
  desc: { pages: [], cursors: [] },
};

/** Updates page `index` of `sort`. Page 2+ needs the cursor from the page before it. */
async function refresh(sort, index) {
  if (index > 0 && !state[sort].cursors[index - 1]) return;
  const result = await fetchPage(sort, index === 0 ? null : state[sort].cursors[index - 1]);
  if (!result) return;
  state[sort].pages[index] = result.page;
  state[sort].cursors[index] = result.cursor;
  if (!result.cursor) {
    // The list ends here: drop deeper pages from an older, longer list.
    state[sort].pages.length = index + 1;
    state[sort].cursors.length = index + 1;
  }
}

const dir = mkdtempSync(join(tmpdir(), "snapshot-"));
const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] }).toString();

function setupRepo() {
  git("init", "-q", "-b", branch);
  git("config", "user.name", "github-actions[bot]");
  git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
  git("remote", "add", "origin", `https://x-access-token:${token}@github.com/${repo}.git`);
}

let committed = false;
function publish() {
  const ready = ["asc", "desc"].every((s) => state[s].pages.length > 0);
  if (!ready) {
    log("not publishing: a sort order has no data yet");
    return;
  }
  const snapshot = {
    placeId: PLACE_ID,
    updatedAt: new Date().toISOString(),
    sorts: { asc: state.asc.pages, desc: state.desc.pages },
  };
  writeFileSync(join(dir, "snapshot.json"), JSON.stringify(snapshot));
  writeFileSync(
    join(dir, "README.md"),
    "Data branch for the Parry server browser. `snapshot.json` is rewritten about once a minute by the Snapshot workflow; this branch keeps a single commit.\n",
  );
  git("add", "-A");
  git("commit", "-q", ...(committed ? ["--amend"] : []), "-m", `Snapshot ${snapshot.updatedAt}`);
  committed = true;
  git("push", "-q", "--force", "origin", `HEAD:${branch}`);
  const counts = ["asc", "desc"].map((s) => `${s}:${state[s].pages.map((p) => p.servers.length).join("+")}`);
  log(`published ${counts.join(" ")}`);
}

/**
 * Start from the published snapshot so a restart (or a one-off manual refresh) keeps the
 * deeper pages a previous run stored. Pages older than 10 minutes are discarded.
 */
function seedFromBranch() {
  try {
    git("fetch", "-q", "--depth", "1", "origin", branch);
    const previous = JSON.parse(git("show", "FETCH_HEAD:snapshot.json"));
    const cutoff = Date.now() - 10 * 60_000;
    for (const sort of ["asc", "desc"]) {
      const pages = Array.isArray(previous?.sorts?.[sort]) ? previous.sorts[sort] : [];
      for (const [i, page] of pages.entries()) {
        if (Date.parse(page.fetchedAt) < cutoff) break;
        state[sort].pages[i] = page;
      }
    }
    log("seeded from the existing snapshot");
  } catch {
    log("no existing snapshot to seed from");
  }
}

/* ---------------- run ---------------- */

setupRepo();
seedFromBranch();
const deadline = Date.now() + loopMinutes * 60_000;
let minute = 0;

do {
  const started = Date.now();
  // Page 1 of both orders every minute; deeper pages rotate through the third call.
  const extraSort = minute % 2 === 0 ? "asc" : "desc";
  const extraIndex = 1 + (Math.floor(minute / 2) % Math.max(1, PAGES_PER_SORT - 1));
  const plan = [
    ["asc", 0],
    ["desc", 0],
    [extraSort, extraIndex],
  ];
  for (const [i, [sort, index]] of plan.entries()) {
    if (i > 0) await sleep(SPACING_MS);
    await refresh(sort, index);
  }
  try {
    publish();
  } catch (error) {
    log(`publish failed: ${error.stderr?.toString() || error.message}`);
  }
  minute++;
  if (!loop) break;
  const rest = 60_000 - (Date.now() - started);
  if (rest > 0) await sleep(rest);
} while (Date.now() < deadline);

if (!committed) {
  console.error("No snapshot was published.");
  process.exit(1);
}
