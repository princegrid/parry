---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

## Scope

Single-screen server browser at `/` (Operate mode). Audience: Blade Ball traders who want a specific trading instance fast. Action: compare occupancy, then Join or Copy link. Constraints: Roblox public-servers API only, 3 req/min upstream, snapshot data, deep-link joining.

## Direction contract

THESIS: The instance list is the whole screen; occupancy is read as slots, not percentages. Refuses the category default of a hero banner over a grid of identical server cards with "best server" badges.

OWN-WORLD: Deep charcoal ground with three cool-neutral surface steps, 1px hairlines, one icy-blue accent used only for selection, focus, open-slot emphasis and the primary Join. Geist for UI with tabular numerals for every figure; Geist Mono only for instance IDs and links. (Amended after build: mono figures read as a technical costume at 13px and the detector flagged mono at 71% of text; tabular sans keeps place-value alignment.) 6/8/10px radius ladder. Phosphor icons at one weight.

STORY: The visitor sees live-snapshot rows immediately, spots rooms with open slots by the slot strip, narrows with sort and filters, joins with one press, and always knows the counts are a snapshot of loaded pages.

FIRST VIEWPORT: 68px header (amended from 56px: room for the 18px product name and a 32px Refresh without crowding) (mark + "Parry", "Blade Ball trading servers", snapshot time, Refresh). 52px toolbar (sort segmented control, hide full, min/max players, ID search, reset). Dense table fills the rest: Players with 30-tick slot strip, Open, Ping (API), FPS, Instance, Join + Copy at the right edge. Sticky status bar at the bottom: loaded / shown counts, more pages, Load more, snapshot note, keyboard hints.

FORM: Brief-pinned direction (no concept roll). Dense comparison table on desktop collapsing to two-line rows on mobile. Seed key: none (pinned by brief).

SIGNATURE: The slot strip: each instance's capacity drawn as one tick per slot, filled ticks for players, accent ticks for open slots. Motion grammar: 120-180ms ease-out on state changes only; refresh keeps rows in place (light dim while in flight) and player counts that changed since the previous snapshot glow ice for about 1.5s (ping and FPS jitter on every refresh, so they are not flagged).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
