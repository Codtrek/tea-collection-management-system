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
Collections, Estates, and Employees (all 2026-07-26) are wired to the real backend via `src/services/`; the rest still read `features/*/data.ts` mock fixtures until each module's backend slice lands. Employees' roster writes are Administrator-only (Officer is view-only there, unlike Estates); payroll is live-computed from attendance × pay rates via a "Generate from Attendance" step, not a seeded snapshot.

## Commands

`npm run dev` · `npm run build` (tsc + vite) · `npm run lint`. Keep both build and lint clean.
