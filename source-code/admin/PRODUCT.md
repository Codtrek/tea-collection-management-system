# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Staff of one tea factory, working in the Harboost web portal. What each role sees and does is set by the permission matrix (`role_permissions`), not by hard-coded roles. The defaults are:

- **Officer** runs the floor:
  - tea leaf collections and grading;
  - Agent Dispatch;
  - fertilizer requests and stock;
  - daily expense entries;
  - attendance entry, and leave requests made on an employee's behalf;
  - preparing payroll and estate owner settlements.
- **Manager** approves and watches the month:
  - fertilizer, grading corrections, expenses and leave;
  - prepares pay changes, sets leave limits, declares closures and keeps the holiday calendar;
  - can prepare payroll and settlements.
- **Administrator**:
  - approves payroll, settlements and pay changes by default;
  - manages users, the permission matrix, factory setup and rates, and the audit log.

People outside the portal:
- **Collection agents** use a separate mobile app.
- **Estate owners** don't use the portal. A mobile app for owners is planned.

## Product Purpose
Harboost TCMS runs a tea factory's leaf-to-payment cycle in one place:
1. Agents collect green leaf from estates on scheduled routes.
2. The factory weighs and grades it.
3. Estate owners are settled at the grade rate in force on each delivery date, less transport and recoveries.
4. Alongside that run fertilizer supply and stock, employees' attendance, payroll and advances, and reports.

Success means every rupee and kilogram the factory pays or records can be traced back to the records behind it.

## Positioning
Every figure the portal shows is another record's own number, and it opens that record. Nothing is invented, estimated or shown as a placeholder. If there's no data, the screen says why. Money rates are effective-dated: they're never edited in place, so an old settlement can always be explained by the rate in force at the time.

## Operating Context
- **Devices:** both desk and phone. Office desktops and laptops, and Officers checking from a phone on the floor or at the weighing point. Both must work equally well.
- **Rhythm:** a daily cycle of routes, intake, grading and dispatch, and a monthly cycle of payroll, settlements, advance recoveries and reports.
- **Time and money:** the factory's calendar is Asia/Colombo time; money is Sri Lankan rupees (`Rs. 1,245,600`).
- **Trust:** money actions are approved by a second role, and every change writes an audit log row.

## Capabilities and Constraints
- **The rules the code already enforces:**
  - graded collection records lock after a short window, and later changes need a Manager-approved correction;
  - reports count Confirmed records only;
  - the ~Rs. 3 bank charge is never deducted from owners or employees;
  - no tea sales are recorded, so the portal never shows revenue or profit;
  - fertilizer stock arithmetic is computed server-side only.
- **Formats:** `10 Jul 2026`, never DD/MM/YYYY; `45,780 kg`; tabular figures.
- **Languages:** English only today. **Sinhala and Tamil are planned**, so layouts must leave room for longer labels and other scripts: no fixed-width labels or buttons, and text wraps. i18n itself is not built yet.
- **Not built (follow-ups):** sidebar badges, Ctrl K, a dark theme.

## Brand Commitments
- The name and logo are Harboost (`src/assets`).
- The voice is plain, specific English: say what a figure counts and why a screen is empty, with no marketing tone.
- Status is never shown by colour alone.

## Evidence on Hand
- **Real data:** the seed and demo seed data (`npm run seed`, `seed:demo`).
- **Specs and screenshots:** the per-module addenda in `docs/specs/` and screenshots in `docs/screenshots/`.
- **Not to be fabricated:** customer counts, testimonials, revenue and sales figures.

## Product Principles
1. **Every number opens its records**, and the count equals that list.
2. **Nothing irreversible from a summary.** Dashboards and lists navigate; money is decided on its own page, with its own confirmation.
3. **Say why.** Empty, blocked and quiet states name the reason ("No deliveries yet today", "Blocked: transport amount not set").
4. **History is never rewritten.** Rates are effective-dated, and corrections are new revisions.
5. **Permissions are data.** Show what the role can act on; hide what it can't, rather than greying it out.

## Accessibility & Inclusion
- WCAG 2.1 AA: text contrast ≥ 4.5:1, chart marks ≥ 3:1, focus visible on every control, and `prefers-reduced-motion` respected.
- Staff vary in computer experience, so labels are written out rather than abbreviated.
