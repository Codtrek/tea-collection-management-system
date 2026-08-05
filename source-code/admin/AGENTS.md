# Harboost Factory Web Portal

React 19 + Vite 8 + **Tailwind CSS v4** admin portal for factory staff (Administrator / Officer / Manager). Built against the design-doc set (`web-portal-ui-design-prompt`, `web-portal-visual-foundations`, per-module screen specs).

## Non-negotiables

- **Tokens only — no raw hex, no `bg-white`.** All colors/radii/shadows/motion are `@theme` custom properties in `src/index.css`, consumed via Tailwind utilities (`bg-primary`, `text-text-muted`, `rounded-[var(--radius-lg)]`, `shadow-[var(--shadow-1)]`). Adding a color = add a token first.
- **Palette is hybrid Harboost:** `--color-brand #53cf81` (logo/accent/nav/charts/focus ring), `--color-primary #1b8b4e` (buttons/links/text, AA-safe). Status badge `-bg`/`-fg` pairs are contrast-verified — don't invent new ones; reuse `StatusBadge` tones.
- **Permissions are data-driven.** Gate UI with `useAuth().can(module, level)` reading `src/context/permissions.ts` — never hardcode `if (role === 'Officer')`. Nav items hide (never grey out) when unpermitted.
- **Reuse the patterns, don't rebuild them:** `components/data/DataTable`, `components/patterns/{MultiStepWizard,DetailPageWithTabs,LightConfirmModal,HighStakesConfirmFlow,AlertList,PhotoEvidenceGallery}`, `components/charts/ChartCard`, `features/reports/ReportViewer` (+`ReportActionsBar`). HighStakesConfirmFlow (re-type-amount gate) is for irreversible money actions and stays **primary green, never red**.
- **Formatting via `src/lib/format.ts`:** `Rs. 1,245,600` · `45,780 kg` · `DD/MM/YYYY` · `tabular-nums` on every figure.
- **Accessibility:** `:focus-visible` rings, `aria-label` on icon-only buttons, honor `prefers-reduced-motion`, status never color-only.

## Layout

`features/` = screens, `components/{ui,data,layout,patterns,charts}` = reusable, `context/` = auth+permissions, `lib/` = cn+format+contrast, `data/` + `features/*/data.ts` = mock fixtures. `@/` → `src/`.

## Status

All six modules UI-complete (2026-07-18): FND-01, Global (Login/Dashboard/Notifications/Search/Profile), Employee EMP-01..14, Fertilizer FERT-01..04, Estate Owner EST-01..09, Collection COL-01..04, Reports RPT-01..04, Administration ADM-01..04 (wrapped in `features/admin/AdminGuard`).
Domain rules baked into the UI — don't regress them: COL-02 is a provisional exception entry (never a weight override; §7.1); Confirmed collection records are locked (Flag for Correction only); grade rates are versioned by effective date (ADM-01); the ~Rs. 3 bank charge is never deducted from estate owners or employees (resolved 2026-07-26 — factory is billed a separate periodic fee); reports aggregate Confirmed records only. Status-tone maps live in `features/{collections,fertilizer}/status.ts` (kept out of page files for fast-refresh lint).
**All six modules are now wired to the real backend via `src/services/`** — Collections, Estates, Employees (all 2026-07-26), Fertilizer (2026-07-27), Reports (2026-07-27), and Administration (2026-07-28). No module remains on `features/*/data.ts` mock fixtures. Employees' roster writes are Administrator-only (Officer is view-only there, unlike Estates); payroll is live-computed from attendance × pay rates via a "Generate from Attendance" step, not a seeded snapshot. Fertilizer's stock arithmetic (on-hand/committed/available/coverage) is computed server-side only (`GET /fertilizer/positions`) — `features/fertilizer/lib.ts` holds pure display helpers (expiry status, FEFO suggestion) that read already-fetched data, never recomputing it; both ad-hoc and request-linked dispatch are allowed. Reports is pure aggregation — RPT-01 filters Confirmed collection records only, RPT-02 counts only processed settlements as realized revenue, RPT-03 unions derived Payroll/Fertilizer/Transport lines with the `expense_entries` table RPT-04 writes to.

**Permissions are now server-driven (Administration slice, ADM-02).** The runtime source of truth is the backend's `role_permissions` table: login/`/auth/me` attach the user's role map onto `User.permissions`, and `AuthContext.level()` reads that first, falling back to `context/permissions.ts` (`DEFAULT_PERMISSIONS`) only when absent. `can()`/`level()` signatures are unchanged, so keep gating UI with `useAuth().can(module, level)` exactly as before — never hardcode role checks. The ADM-02 matrix editor writes the table back; the Administrator row is immutable (server-enforced). Every mutation across the portal now also produces a real `audit_logs` row (ADM-04), and suspending a user in ADM-02 actually blocks their login.

**Estate Owner Directory (2026-08-05) amends EST-01.** `EstateListPage.tsx` is now a **role-aware**
directory — three views (Management/Payments/Oversight) picked by `level('estateOwners')`, never
`user.role`, configured in `features/estates/directory-columns.tsx` (default columns, sort,
filters, primary action, row actions, empty state per view — kept out of the page file for
fast-refresh lint). Fed by `GET /estates/directory` (`estatesService.getDirectory`), a **separate**
call from `list()`/`GET /estates` — that one stays the lightweight id+name lookup four other
screens use; the directory does real roster-wide aggregation and shouldn't slow those down.
`DataTable` gained two **opt-in, additive** props any screen can use: `sortable`/`sortValue` per
column (click-cycles asc → desc → none) and `hideable` + `columnPrefsKey` (a "Columns" popover,
persisted like the existing density toggle) — every other list screen is unaffected unless it opts
in. New `components/charts/Sparkline.tsx` is the Oversight view's quality-trend cell. The sidebar
(`components/layout/nav.ts`) now has a dedicated **Estate Owners** entry under People; Finance's
existing "Estate Owner Payments" entry was repointed to `/estates/settlements` so it no longer
duplicates the roster link.

**Estate Owner Lifetime History (2026-08-05) amends EST-03 and adds EST-10.** `EstateDetailPage`'s Overview tab now opens with a `LifetimeSummary` strip (`features/estates/LifetimeSummary.tsx` + `OutstandingPanel.tsx`) fed by `GET /estates/:id/lifetime` — never sum a table for one of these figures, the backend selector is the only source. New **Timeline** tab (`EstateTimelineTab.tsx`) is the merged Delivery/Fertilizer/Settlement/Advance/Account feed with the **Tenure Ribbon** (`TenureRibbon.tsx`) as its signature visual — the *only* ornamented element on the page (restraint check: if you're tempted to add a second flourish anywhere on EST-03, don't). New **Analytics** tab reuses `EstateAnalyticsBody` (exported from `EstateAnalyticsPage.tsx`) pre-scoped to the current owner — same component the standalone `/estates/analytics` route uses, no duplicate chart logic. Deliveries/Payments/Fertilizer/Advances tabs are server-paginated (25/page, defaults to last 90 days, "View all" widens the range) instead of fetching everything and filtering client-side. Motion rule worth knowing before touching this code: this repo's ESLint config (`react-hooks/refs`, `react-hooks/set-state-in-effect`) forbids reading a ref's `.current` during render and forbids calling `setState` synchronously inside `useEffect` — `TenureRibbon`'s one-time draw and `EstateTimelineTab`'s pagination/accumulation both had to be restructured around this (a `key`-remount for filter resets, "adjust state during render" for data accumulation) rather than the more obvious effect-based approach.

**EST-03's Fertilizer tab (2026-08-05, same day).** The Timeline's Fertilizer entries' `recordHref` used to dead-end on the factory-wide `/fertilizer` inventory list, then briefly on the request/batch pages — still factory-side, and useless when an estate's historical dispatches share one placeholder batch (every row's link landed on the same page). Fixed by giving the owner their own **Fertilizer** tab (fed by `GET /estates/:id/fertilizer`, same paginated shape as Deliveries/Payments/Advances) and pointing `recordHref` at `/estates/:id?tab=fertilizer&record=FC-…` instead. `DataTable` gained `highlightRowKey` (one more additive, opt-in prop) to tint the deep-linked row.

**EST-03's tabs are URL-driven, not `useState`-seeded (2026-08-05).** The first cut above initialized `showAll`/the active tab from `?record=`/`?tab=` inside a `useState` initializer — which only runs on mount, so clicking a same-page View link (query string changes, component stays mounted) never actually moved the tab. Fixed by making `DetailPageWithTabs` support an opt-in **controlled mode** (`activeTab`/`onTabChange`; its other consumers — EMP-03, the fertilizer batch page — pass neither and are unaffected) and having `EstateDetailPage` derive `activeTab`/`highlightRecord`/`fertilizerShowAll` from `searchParams` on every render instead of capturing them once. If you add another same-route deep-link anywhere in this portal, derive-from-render is the pattern — a `useEffect` "sync prop into state" fix isn't available here, this repo's ESLint bans `setState` inside `useEffect` (`react-hooks/set-state-in-effect`).

## Commands

`npm run dev` · `npm run build` (tsc + vite) · `npm run lint`. Keep both build and lint clean.
