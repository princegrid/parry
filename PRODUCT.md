# Product

<!-- impeccable:product-schema 1 -->

> Captured from the written brief and the original `BladeBall_Servers.bat` script. The user asked for decisions to be made from the brief without an interview round, so every fact below is taken from those two sources; nothing here was confirmed in a separate Q&A.

## Platform

web

## Stack

delegated: Next.js (App Router, TypeScript) with a same-origin Route Handler. The brief ruled out Vite and required a backend route because the Roblox endpoint sends no CORS headers. Plain CSS with custom-property tokens and CSS Modules; one icon library (Phosphor). No UI kit.

## Users

Blade Ball players who trade items. They open the tool, want a trading server with room in it (or a busy one), and join it within seconds. Repeat, daily use; many keep it bookmarked. Desktop with Roblox installed is the main case; phones are a real secondary case.

## Product Purpose

Discover public instances of the Blade Ball trading place, compare their occupancy, and join a specific instance. Success: a player goes from opening the page to launching into a chosen instance in a few seconds, and understands that the list is a snapshot.

## Positioning

A focused, honest instance browser for one place. It shows only what the Roblox public-servers API reports, labels it as such, and makes joining a specific instance a single explicit action.

## Operating Context

- Data source: `GET https://games.roblox.com/v1/games/16581637217/servers/Public` (sortOrder Asc/Desc, limit 100, cursor pagination). No CORS headers, so it is called through a same-origin route.
- The upstream is rate-limited aggressively (observed `x-ratelimit-limit: 3, 3;w=60`). Caching, request de-duplication and visible cooldowns are part of the product, not an afterthought.
- Joining uses Roblox deep-link parameters (`placeId`, `gameInstanceId`), documented on create.roblox.com (marked deprecated in favour of owner-only share links, which cannot target an instance).

## Capabilities and Constraints

- Refresh, cursor-based Load more, fewest/most players ordering (upstream sort), hide full servers, min/max player filters, search by instance ID, reset filters.
- Per instance: players / capacity, occupancy, open slots, API-reported ping, server FPS, instance ID, Join, Copy link.
- Statistics describe loaded results only, never every live server.
- No credentials, cookies or login.
- Must not fabricate: regions, visitor latency, server age, trade activity, item availability, empty instances the API did not return, or a way to force a fresh server.
- A launched protocol link is not a confirmed connection.

## Brand Commitments

- Product name and mark are new (no prior brand). The trading place ID `16581637217` is fixed.
- Visual direction pinned by the brief: dark charcoal, subtly different surface layers, one restrained accent, crisp type, thin borders, soft shadows, compact consistent icons, subtle transitions. No marketing hero, rainbow gradients, glass, neon, decorative dashboards or repetitive cards.

## Evidence on Hand

- Original script: `C:\Users\Grid\Downloads\BladeBall_Servers.bat` (WinForms + PowerShell), the functional reference.
- Live API responses (observed 2026-10-06): 100 servers per page, `maxPlayers` 30, `fps` around 60, `ping` reported per instance, `playerTokens`/`players` empty.
- No screenshots, logos, testimonials or usage numbers exist. None may be invented.

## Product Principles

1. The list is the product. It is usable the moment the page renders.
2. Honest numbers: unavailable is shown as unavailable, snapshots are labelled as snapshots, ping is labelled as API-reported.
3. Every network action is explicit, cancellable and rate-aware.
4. Joining is one deliberate action with a working fallback.

## Accessibility & Inclusion

WCAG 2.2 AA contrast, full keyboard operation of the list and actions, visible focus, reduced-motion support, touch targets of at least 44px on coarse pointers.
