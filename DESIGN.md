---
name: Parry
description: A dark, precise instance browser for Blade Ball traders. The list is the product.
colors:
  ground: "#0c0d0f"
  surface-1: "#121316"
  surface-2: "#17181c"
  surface-3: "#1d1f24"
  surface-4: "#24262c"
  line-faint: "rgb(255 255 255 / 0.04)"
  line: "rgb(255 255 255 / 0.065)"
  line-strong: "rgb(255 255 255 / 0.11)"
  line-focus: "rgb(255 255 255 / 0.2)"
  text: "#eceef2"
  text-2: "#a9aeb7"
  text-3: "#858b95"
  ice: "#8fcdf2"
  ice-strong: "#b3dcf6"
  ice-ink: "#08141c"
  ice-soft: "rgb(143 205 242 / 0.12)"
  ice-wash: "rgb(143 205 242 / 0.06)"
  ice-line: "rgb(143 205 242 / 0.38)"
  warn: "#e6bd73"
  danger: "#f0928a"
  slot-filled: "#5b606b"
  slot-full: "#3d4149"
  slot-open: "rgb(143 205 242 / 0.8)"
typography:
  product-name:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  state-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  count:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  identifier:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  tick: "2px"
  keycap: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-join:
    backgroundColor: "{colors.ice-soft}"
    textColor: "{colors.ice}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "30px"
  button-join-engaged:
    backgroundColor: "{colors.ice}"
    textColor: "{colors.ice-ink}"
    rounded: "{rounded.md}"
  button-join-full:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text-3}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-3}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    height: "32px"
  input-field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "32px"
  segment-selected:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "26px"
  panel:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.lg}"
  row-selected:
    backgroundColor: "{colors.ice-wash}"
  tooltip:
    backgroundColor: "{colors.surface-4}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

# Design System: Parry

## Overview

**Creative North Star: "The lobby roster."**

Parry is a working tool people open dozens of times a week to find a Blade Ball trading server and join it. It looks like a careful desktop app, not a website: one charcoal panel holds the toolbar, the server table and a status bar, and nothing competes with the list. The identity comes from precision and one signature device, not from decoration. Each server's capacity is drawn as a row of slot ticks, so a half-empty lobby is visible before you read any number.

The system is dark because the use is dark. Players open it beside a game client, often at night, next to Roblox's own dark UI. A bright page would flash between the two.

References studied, not copied: Linear (surface ladder and hairlines carrying hierarchy instead of shadows, a single scarce accent), Raycast (in-product chrome at full scale, keycaps as a quiet affordance), and Vercel (tabular figures, stacked soft shadows, sentence-case labels). Parry's own decisions: an icy-blue accent that marks *room* and *action*, not brand; Geist with tabular numerals for comparison; and the slot strip.

**Key Characteristics:**
- One panel, one table, one accent. The list is usable on first paint.
- Four-step cool charcoal ladder plus 1px hairlines carry all hierarchy.
- Icy blue means three things only: open slots, the Join action and selection/focus.
- Numbers are tabular Geist. Monospace is reserved for identifiers (instance IDs, links).
- Every state is designed: skeleton, refreshing, empty, no match, failure, rate limit, saved copy, vanished instance, launch attempt.

## Colors

A cool neutral ladder with one cold accent and two state colours. No gradients except the slot strip and the refresh sweep.

### Primary
- **Ice** (`#8fcdf2`): open slots in the slot strip, open-slot counts, the engaged Join button, focus rings, the caret of an expanded row. Text on solid ice uses **Ice Ink** (`#08141c`, 10.8:1).
- **Ice Strong** (`#b3dcf6`): hover on solid ice.
- **Ice Soft / Wash / Line**: tinted Join at rest, the selected row background, focused input borders.

### Neutral
- **Ground** (`#0c0d0f`) under everything; also the inset fill of inputs and the segmented track.
- **Surface 1-4** (`#121316` → `#24262c`): panel, hover row and buttons, pressed/selected segment, floating layers (tooltip, toast).
- **Text** `#eceef2`, **Text 2** `#a9aeb7` (8.3:1 on the panel), **Text 3** `#858b95` (5.4:1 on the panel, the floor for any readable text).

### State
- **Warn** (`#e6bd73`): rate limiting and saved copies only.
- **Danger** (`#f0928a`): failures and invalid input only.

### Named Rules
**The Room Rule.** Ice marks room and action. It never decorates headings, borders of static containers or icons that do nothing.

**The Unavailable Rule.** A metric the API does not report renders as a muted "n/a" with a tooltip, never as 0.

## Typography

One family, Geist, at UI sizes, with tabular figures (`font-variant-numeric: tabular-nums`) wherever numbers are compared. Geist Mono appears only for identifiers. Hierarchy comes from weight and tone more than size; the steps that exist are deliberate.

### Hierarchy
| Role | Size / weight | Use |
| --- | --- | --- |
| product-name | 18 / 600, -0.015em | "Parry" in the header |
| state-title | 17 / 600 | Titles of empty, error and rate-limit states |
| count | 14 / 500 tabular | Player count in each row |
| body | 13 / 400-500 | Cells, buttons, notices, toolbar |
| label | 12 / 500 | Column headers, status note, field labels |
| identifier | 12-12.5 mono | Instance IDs, join links |

### Named Rules
**The Sentence Case Rule.** No uppercase eyebrows, no tracked micro-labels. Column headers and labels are sentence case at 12px in Text 3.

**The No Dash Rule.** Copy uses periods, commas and colons. No em or en dashes as punctuation.

## Layout

- Shell max width 1120px, 24px gutters (12px under 720px).
- Header 68px: mark and name left, last-updated and Refresh right.
- The panel fills the remaining height: sticky toolbar, then the table with a sticky column header that sits directly under the toolbar (offset measured at runtime), then a sticky status bar.
- Desktop columns: Players (flex) / Open 80 / Ping 100 / FPS 80 / Instance 184 / Actions 148. Rows are 46px (56px on touch tablets). Open, Ping and FPS are right-aligned so figures line up by place value.
- The slot strip is fluid inside the Players column (90-210px). Its tick gap is 40% of each slot, so ticks keep the same thin shape at every width.
- Under 1024px FPS narrows to 64px, Instance to 160px, and keyboard hints hide.
- Under 720px each row becomes two lines: count and strip with Join and Copy on the right, then open/ping/fps/ID with inline units. The column header is removed; the ping explanation moves to the status bar. Toolbar becomes a grid: sort; search (with Reset beside it only when filters are active); hide-full + min/max.

## Elevation & Depth

Depth is the surface ladder first, shadow second.

- **Panel**: surface-1, 1px line border, inset top highlight plus a long soft drop (`--shadow-panel`).
- **Raised controls**: inset 1px top highlight and a 1-2px shadow (`--shadow-raised`).
- **Floating** (tooltip, toast): surface-4, line-strong border, `--shadow-float` (offset, blurred, never a zero-offset glow).
- z-index scale: sticky 10, tooltip 30, toast 40.

## Shapes

**The Ladder Rule.** 2px ticks, 4px keycaps and small tags, 6px segments and icon buttons inside controls, 8px buttons and inputs, 12px panels and toasts. Nothing is pill-shaped.

## Components

### Buttons
- **Join**: tinted ice at rest (ice-soft fill, ice-line border, ice text). Becomes solid ice when its row is hovered or selected, or when it is focused. Shows "Opening" for 2.5s after a press. Full servers show a disabled "Full" button instead.
- **Secondary**: surface-2 with line-strong border and raised shadow; Refresh and Load more. Shows a spinner and a verb ("Refreshing", "Loading") while busy, or "Retry in m:ss" during a cooldown. The countdown appears only here.
- **Ghost**: text-only for Reset and Dismiss. Reset keeps its slot on desktop even when inactive, so the toolbar never shifts.
- **Touch**: every control is 44px tall on coarse pointers.
- **Copy**: square secondary icon button (30px, 44px on touch).

### Inputs / Fields
Inset ground fill, line-strong border, ice border and a 3px ice-soft ring on focus. Min/Max fields carry their label inside the field. Search has a `/` keycap that becomes a clear button once text is entered.

### Segmented sort
Radio group on a ground track; the checked segment lifts to surface-3 with a raised shadow. Arrow keys move and select.

### Slot Strip (signature)
One tick per player slot (capacity up to 50; above that a plain bar). Ticks are 60% of the slot width with a 40% gap, so they stay ticks, never blocks. Filled ticks are slot-filled grey, open ticks are ice, a full server's ticks drop to slot-full. The strip is decorative (`aria-hidden`); the numbers beside it carry the meaning. Its fill animates with `clip-path`, never width.

### Change highlight
After a refresh or Load more, a player count that differs from the previous snapshot of the same instance glows Ice Strong and settles over about 1.6s. Ping and FPS are not flagged: they jitter on almost every refresh, so flagging them would light up the whole list. While a refresh is in flight the rows dim only slightly (82% opacity) and stay readable.

### Notices and states
Inline notices sit above the table when results still exist (warn for rate limits and saved copies, danger for failures, neutral for a vanished instance). Centered states replace the rows when nothing is loaded: an inline icon in the title, one sentence, one recovery action.

### Toast
One at a time, bottom center, surface-4. Used for copy confirmation, Load more results and launch attempts. It never claims a connection.

## Do's and Don'ts

### Do:
- Do keep the table as the first thing on screen at every size.
- Do show missing data as unavailable and label snapshots as snapshots.
- Do use ice only for room, Join, selection and focus.
- Do use tabular Geist for every compared number.
- Do keep every interactive control at least 44px tall on touch.

### Don't:
- Don't add a hero, marketing heading, feature cards or "best server" badges.
- Don't introduce a second accent, gradients, glass, glows or neon.
- Don't fabricate regions, latency from the visitor, server age or trade activity.
- Don't use monospace for numbers, labels or headings.
- Don't put uppercase eyebrows above sections.
