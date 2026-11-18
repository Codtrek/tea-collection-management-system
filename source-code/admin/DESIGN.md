---
name: Harboost Factory Web Portal
description: The tea factory's ledger — every figure traceable to its records.
colors:
  brand: "#53cf81"
  brand-strong: "#3bb96b"
  brand-soft: "#eafaf0"
  primary: "#1d6839"
  primary-hover: "#185a31"
  primary-active: "#134a28"
  primary-disabled: "#b7d8c4"
  background: "#f8fbf9"
  surface: "#ffffff"
  surface-sunken: "#fbfcfa"
  surface-hover: "#f2f7f4"
  border: "#e3e9e4"
  border-strong: "#cbd6ce"
  text: "#1a1a1a"
  text-heading: "#08120b"
  text-muted: "#566a5d"
  text-disabled: "#94a3b8"
  success-bg: "#ecfdf5"
  success-fg: "#047857"
  warning-bg: "#fffbeb"
  warning-fg: "#92400e"
  danger-bg: "#fff1f2"
  danger-fg: "#9f1239"
  danger: "#e11d48"
  grade-super-bg: "#faf3e4"
  grade-super-fg: "#8a6420"
  grade-normal-bg: "#ecf3ee"
  grade-normal-fg: "#1f4d36"
  chart-1: "#1b8b4e"
  chart-2: "#53cf81"
  chart-3: "#0f5c33"
  chart-4: "#c89a3d"
  chart-5: "#8fbba1"
  chart-6: "#e0bc72"
  chart-7: "#5b7b8a"
  chart-track: "#e8f4ed"
  chart-compare: "#566a5d"
typography:
  headline:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  figure:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "'tnum'"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
    fontFeature: "'cv05', 'cv11'"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  id:
    fontFamily: "JetBrains Mono, ui-monospace, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    fontFeature: "'tnum'"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
spacing:
  gutter: "24px"
  card: "24px"
  row-x: "20px"
  row-y: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-fg}"
    rounded: "{rounded.xs}"
---

# Design System: Harboost Factory Web Portal

## Overview

**Creative North Star: "The Factory Ledger"**

The portal is the factory's record book. It's calm, exact and trustworthy: a page of white surfaces on a faintly green paper (#f8fbf9). Figures are set in tabular numbers so columns of kilograms and rupees line up. The factory's green is its ink. Nothing on the page is decorative. Each number is another record's own figure and opens that record, and each colour means something.

The pages are dense but quiet, because staff come to work, not to browse. On every screen the work comes first ("what needs me"), then the figures that show how the day and the month are going. Colour is kept for meaning: green for actions and progress, amber for something due, red for something blocked or wrong. Each is paired with a word or an icon, never alone. The look rejects marketing dashboards: no hero banners, no gradients behind content, no "revenue" tiles for figures the factory doesn't record.

**Key Characteristics:**
- White surfaces on a faintly green page; thin warm-grey borders and dividers.
- One solid green primary action per view; everything else is quiet.
- Tabular figures everywhere; record IDs in a mono face.
- Labelled rows over hero numbers; every figure opens its records.
- Flat at rest; shadows lift only on hover, focus and floating layers.

## Colors

A restrained green-led palette with accessible status pairs. Green is the ink, and status colours appear only where something needs attention.

### Primary
- **Ledger Green** (primary): buttons, links, active text, the primary action. Chosen for contrast: white on it is 6.8:1, and as text on the soft and hover surfaces it is 6.3:1 (AA).
- **Harboost Leaf** (brand): the logo, the active nav marker, the focus ring and chart accents. It is too light for text or for white-on-green buttons.
- **Leaf Wash** (brand-soft): selected and highlighted backgrounds, and icon tiles.

### Neutral
- **Ledger Paper** (background): the page behind every card.
- **Sheet White** (surface): cards, panels, inputs, popovers.
- **Pressed Paper** (surface-sunken) and **Row Hover** (surface-hover): table stripes, quiet tiles, and the hover and focus wash on rows.
- **Ruled Line** (border) and **Ruled Line Strong** (border-strong): dividers and control borders.
- **Ink** (text) and **Heading Ink** (text-heading); **Field Note Grey** (text-muted) for labels, notes and axes (5.8:1 on white).

### Status and grade pairs
- The success, warning and danger `-bg`/`-fg` pairs, and the grade Super and Normal pairs, are contrast-verified for AA. They are only ever used as pairs.

### Charts
- A categorical series led by Chart Green (chart-1), then brand, dark leaf and brewed gold.
- A pale green track (chart-track) behind bars.
- The muted Field Note Grey (chart-compare) draws comparison periods. It is the one that passes 3:1 for marks.

### Named Rules
**The Pair Rule.** A status colour never appears alone. It always comes with its pair (bg and fg) and with a word or an icon: "Blocked", "▼ down 69.4%".

**The One Green Button Rule.** One primary action per view, and it is Ledger Green. Destructive and irreversible money actions also stay primary green; red means a destructive delete, never "important".

**The No Raw Hex Rule.** Components use tokens only. A new colour is a new token first.

## Typography

**Body Font:** Inter (with system-ui, Segoe UI, Roboto)
**Label/Mono Font:** JetBrains Mono, for record IDs only (`EADV-2026-0031`, `FB-2291`)

**Character:** a single humane sans, set small and steady. Hierarchy comes from weight and colour, not size jumps.

### Hierarchy
- **Headline** (600, 24px, tight tracking): the page title only, e.g. the greeting or "Agent Dispatch".
- **Figure** (600, 28px, line-height 1, tabular): a summary card's single value.
- **Title** (600, 16px): the heading of a section, card or panel ("Needs your action", "This month").
- **Body** (400, 14px / 22px): rows, descriptions and table cells.
- **Label** (500, 13px, muted): figure labels and chart titles.
- **Caption** (400, 12px, muted): notes, reasons, timestamps and axis ticks.

### Named Rules
**The Tabular Rule.** Every kilogram, rupee, percentage, count and date is `tabular-nums`, so columns align and values don't jitter as they update.

**The Sentence Case Rule.** Headings, nav groups and buttons are sentence case. Uppercase is used only for small form-field labels.

## Layout

- **Shell:** a fixed sidebar (248px, or 72px collapsed), then content up to 1440px wide on the Ledger Paper background, with 24px gutters between blocks.
- **Page order:** breadcrumb, then title, then primary action. Actions wrap below the title rather than squeezing it.
- **Dashboard (≥1280px):** a 12-column grid. The work queue and the intake chart take 8 columns. The figure panels and the route list take 4, spanning both rows so a short queue leaves no gap. Below 1280px everything stacks in reading order, queue first. At 390px there is one column and no horizontal scroll, and row actions wrap under their text.
- **Rows:** 20px horizontal and 12px vertical padding, at least 56px tall for queue rows.
- **Text:** labels and buttons never get fixed widths, because Sinhala and Tamil are planned.

## Elevation & Depth

Flat at rest, lifted on use. Cards sit on the page with the faintest green-tinted shadow (level 1), which reads as paper rather than as floating. Hover and focus raise a card to level 2. Popovers, toasts and menus use level 3, and modals use level 4. The tint comes from the factory green (rgba 27,139,78), never black.

### Named Rules
**The Flat-By-Default Rule.** Depth is a response to use: hover, focus, or something floating above the page. It is never decoration.

## Shapes

Gently rounded and consistent:
- controls and badges: 8px and 4px;
- charts and popovers: 12px;
- cards: 16px.

Dividers are 1px Ruled Line. Bars and progress tracks are fully rounded. There are no clipped corners, angled shapes or decorative silhouettes, with one exception: EST-10's Tenure Ribbon, the portal's only ornamented element.

## Components

Plain and dependable: quiet controls that never compete with the numbers.

### Buttons
- **Shape:** gently rounded (8px).
- **Sizes:** 32px (sm), 40px (md), 44px (lg).
- **Primary:** Ledger Green with white text and the level-1 shadow. Hover darkens it, and active darkens it further.
- **Secondary:** Sheet White with a Ruled Line border and Ink text. Hover goes to Row Hover.
- **Ghost:** transparent and muted, for icon-only tools such as Refresh. Icon-only buttons always carry an `aria-label`.
- **Focus:** a 2px Harboost Leaf outline with a soft 6px halo, on `:focus-visible` only.

### Status badges
- A small 4px-radius pill using a verified bg/fg pair. Badges are reused across modules and never redefined.

### Cards and panels
- Sheet White, 16px radius, level-1 shadow, no border.
- A card header is a Title with a muted note on the right, separated by a 1px rule.
- Figure panels are lists of labelled rows: the label with its (i) rule on the left, the tabular value on the right, and a caption line under it. The whole row opens its records.

### Inputs
- 40px tall, 8px radius, a Ruled Line border, and Sheet White.
- Focus shifts the border to Ledger Green. Placeholders use Field Note Grey (AA).

### Navigation
- A white sidebar with sentence-case group labels and 20px line icons.
- The active item gets Leaf Wash with a 2px Harboost Leaf marker on its left edge.

### Work queue (signature)
- Rows grouped Urgent / Due soon / To decide.
- Each row has a 32px tile tinted by its group (danger, warning or neutral), the count with its label, a muted reason line, and one secondary action that only opens the filtered list.
- The whole row is a link, and the action is a separate focus stop.

## Do's and Don'ts

### Do:
- **Do** link every figure to the list that it counts, and make the count equal that list.
- **Do** say why a block is empty or blocked, in a sentence.
- **Do** pair every status colour with a word or an arrow (▲ up / ▼ down).
- **Do** use `formatDate` (`10 Jul 2026`), `formatCurrency` (`Rs. 1,245,600`) and `formatKg` for every figure.
- **Do** show skeletons the size of the block they replace, and respect `prefers-reduced-motion`.

### Don't:
- **Don't** use raw hex, `bg-white`, or a colour without a token.
- **Don't** add hero banners, gradients behind content, or decorative illustrations to working screens.
- **Don't** show revenue, profit or any figure the factory does not record.
- **Don't** put Approve or Decline buttons on a dashboard or summary; decisions happen on their own page.
- **Don't** grey out what a role can't do; hide it.
- **Don't** use red for irreversible money actions; those are primary green with a re-type confirmation.
