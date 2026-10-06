# Parry: Blade Ball trading servers

A focused web utility for finding a public instance of the Blade Ball trading place
(Roblox place `16581637217`), comparing occupancy, and joining that exact instance.
It replaces the `BladeBall_Servers.bat` WinForms script and keeps its features: refresh,
cursor-based Load more, fewest/most players order, hide full servers, player counts,
API-reported ping, server FPS, instance IDs, join and copy-link, and rate-limit cooldowns.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Checks:

```bash
npx tsc --noEmit
npm run lint
```

No environment variables, API keys, cookies or Roblox login are needed.

## How it works

```
browser ──► GET /api/servers?sort=asc|desc&cursor=…   (same origin)
              └─► GET https://games.roblox.com/v1/games/16581637217/servers/Public
                      ?sortOrder=Asc|Desc&limit=100&cursor=…
```

The Roblox endpoint sends no CORS headers, so the browser cannot call it directly.
`src/app/api/servers/route.ts` is a small proxy for that one fixed URL. It is not an
open proxy:

- **Fixed upstream.** Only the place ID and path above. The caller controls `sort`
  (`asc`/`desc`) and an optional `cursor`, which must look like a Roblox page token
  (base64 alphabet, at most 2048 characters). Anything else returns 400.
- **Timeout.** 8 s upstream (15 s on the client).
- **Caching.** Each `(sort, cursor)` page is reused for 30 s and identical concurrent
  requests share one upstream call. Responses also carry `s-maxage=20` so a CDN can
  absorb bursts.
- **Rate limits.** Roblox allows about **3 calls per minute per server IP**
  (`x-ratelimit-limit: 3, 3;w=60`), shared by every visitor of one deployment. On a 429
  (or when the quota header reaches 0) the route stops calling Roblox until the reset
  time and returns `429` with `Retry-After`. If a saved copy of the requested page is
  less than 5 minutes old, it serves that instead, marked `"cache": "stale"` with its
  original fetch time. The UI labels it as a saved copy and shows the countdown.
- **Per-client guard.** At most 30 requests per minute per client IP.
- **Normalisation.** Responses are validated and reduced to
  `{ id, playing, maxPlayers, ping, fps }`. Missing or invalid metrics become `null` and
  render as "n/a", never as 0.

## Joining a server

Roblox documents deep links with `placeId` and `gameInstanceId`
([create.roblox.com/docs/production/promotion/deeplinks](https://create.roblox.com/docs/production/promotion/deeplinks)):

| Where | Link used |
| --- | --- |
| Join on desktop | `roblox://placeId=16581637217&gameInstanceId=<id>` (direct to app) |
| Join on phones/tablets | `https://www.roblox.com/games/start?placeId=16581637217&gameInstanceId=<id>`, opened in a new tab |
| Copy link | The https form above, since it works when pasted anywhere |

The original script's `roblox://experiences/start?…` form is not in the documentation,
so it is not used.

Limitations to know:

- Roblox marks deep links as deprecated in favour of *share links*. Share links can only
  be created by the game's owner and cannot target an instance, so deep links are the only
  documented way to join a specific server.
- A browser cannot tell whether the Roblox app opened or whether the join succeeded. The
  site says it *asked* the browser to open Roblox, and offers Copy link as a fallback.
- `roblox://` needs the Roblox app installed. Browsers may show an "Open Roblox?" prompt.
- Player counts are a snapshot. An instance can fill or close between refresh and join.
  Full servers have Join disabled; their link can still be copied.
- Stats cover loaded pages only, not every live server.

## Deploying

The app builds in two modes.

### GitHub Pages (snapshot mode): how this repo is published

Live site: **https://princegrid.github.io/parry/**

GitHub Pages cannot run server code, and Roblox's API blocks direct browser requests, so
the Pages build reads a snapshot instead:

```
Snapshot workflow (always running, 1 run ≈ 5h40m, restarted by schedule)
  every 60 s: Roblox page 1 (fewest + most players) + one page 2, ≤3 calls/min
  └─► force-pushes snapshot.json to the `data` branch (always a single commit)

Pages site (static export, basePath /parry)
  └─► reads snapshot.json via api.github.com (≈60 s cache)
      └─ falls back to raw.githubusercontent.com (≤5 min cache) if the visitor's
         60 requests/hour GitHub API quota is spent
```

Workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `pages.yml` | push to `main`, manual | Static export (`STATIC_EXPORT=1`, `NEXT_PUBLIC_DATA_SOURCE=snapshot`), removes the API route, deploys to Pages |
| `snapshot.yml` | manual (first start), every 15 min (restart) | Loops for ~5h40m, publishing `snapshot.json` every minute |
| `refresh.yml` | manual only | Publishes one snapshot immediately (`gh workflow run refresh.yml`) |

The site's Refresh button downloads the newest published snapshot. It cannot start a
workflow: that needs a GitHub token, and any token embedded in a public page could be
taken and misused. If nothing newer exists, the page says so. A snapshot older than
5 minutes shows a "may be delayed" notice.

Things to know:

- **GitHub Actions terms.** A permanently looping job is a grey area under GitHub's
  Actions terms (which exclude using runners as general serverless compute). If GitHub
  objects, disable `snapshot.yml` and rely on `refresh.yml` or a 5-minute cron instead.
- GitHub never starts a scheduled run more often than every 5 minutes, and scheduled runs
  are often late. The loop design means only the first start depends on that.
- In public repos, scheduled workflows are switched off after 60 days without repository
  activity. Re-enable them from the Actions tab if that happens.
- Snapshot mode stores 2 pages per order (up to ~400 servers). The status bar says when
  Roblox had more than the snapshot holds.

Build the Pages version locally:

```bash
STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/parry NEXT_PUBLIC_DATA_SOURCE=snapshot npx next build
```

(Move `src/app/api` aside first, as the workflow does; static export cannot include it.)

### Node hosting (live mode)

`/api/servers` needs a server runtime:

- **Vercel**: import the repo; no settings needed. The route runs as a Node function.
- **Any Node host** (Render, Fly.io, a VPS): `npm ci && npm run build && npm start`,
  behind a reverse proxy that sets `x-forwarded-for`.

Notes for hosting:

- The cache and rate-limit state live in memory per server instance. A single
  long-running instance shares one cache across all visitors, which suits Roblox's
  3/min limit best. Serverless platforms keep a cache per warm instance, and the CDN
  `s-maxage` header covers the rest.
- All visitors of one deployment share Roblox's per-IP quota. Expect cooldowns under heavy
  use; the UI keeps loaded results usable and shows when refresh unlocks.

## Project layout

```
src/app/api/servers/route.ts       API route: validation, headers
src/lib/server/roblox-servers.ts   upstream fetch, cache, cooldown, normalisation
src/lib/roblox/                    shared types, constants, join links
src/lib/client/                    data source (live API or snapshot), filters/ordering, clipboard, formatting
src/hooks/useServerBrowser.ts      request state machine (abort, stale-ignore, dedupe, cooldown)
src/hooks/usePreferences.ts        persisted sort/filters (localStorage)
src/components/browser/            header, toolbar, table, slot strip, status bar, states
src/components/ui/                 buttons, fields, segmented control, hint, toast
scripts/snapshot.mjs               snapshot job for the GitHub Pages build
.github/workflows/                 Pages deploy, snapshot loop, manual refresh
DESIGN.md                          visual system
PRODUCT.md                         product context
```

`.design-references/` is a local checkout of design reference documents used while
designing. It is not imported by the app.
