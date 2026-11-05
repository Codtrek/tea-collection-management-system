# Performance: Addendum (EMP-14 rebuilt)

**Decided:** 2026-11-05
**Status:** built on branch `feat/performance-overview`, created off `feat/attendance-leave`.
**Replaces:** the old EMP-14 page.

## 1. Purpose
The page helps the Manager see where to act and what to discuss with someone: support, route problems, follow-up.

It is **not** for automatic ranking, rewards or punishment, so:
- there is no overall or combined score, no rank and no "top performer" label;
- every figure comes from real records and shows its counts;
- comparisons are only with the person's own past, or with others in the same role.

The page says under its title: *"Use these figures to start a conversation, not to make decisions on their own."*

## 2. Data report (what was real on the old page)
- **The old page** (`features/employees/PerformancePage.tsx`) was entirely invented, none of it from the database:
  - Attendance 96% "above team avg (91%)", Task Completion 90% and Punctuality 98% were literals in the component;
  - the Feb–Jul trend and the W1–W4 chart were inline arrays;
  - the employee picker read the mock `employees/data.ts`.
- **Removed:** punctuality (no arrival-time data), task completion and the W1–W4 chart (no "tasks" exist), the team-wide "above average" comparison, the seeded charts, the judgement notes and the mock file.
- **Stops have no visited or skipped status.**
  - A "stop" is a collection request on a route for a date, as on the dispatch board (`RouteLoadService.stopCounts`). Visited means `collected` or `confirmed`.
  - No skip reason is recorded, so a missed stop shows "reason not recorded".
- **Estate and factory weight are stored separately:**
  - estate weight = `tea_collection_records.weight_kg`, recorded at pickup;
  - factory weight = the sum of `delivery_grade_lines`.
  - A grade correction replaces the lines only once approved, so the current lines are the latest approved revision.
- **Fertilizer** delivery attempts store `attempt_no`, `outcome` and `fail_reason`.
- **Covers** are `route_assignments` with type COVER and a status.
- **Local data is thin.** 5 agents, 39 collection records (mostly July and October 2026), 2 marked attendance days per agent per month, 2 fertilizer deliveries and no covers. Most cells honestly show **"Not enough data"**.
  - October 2026: R. Senanayake route completion 100% (5/5), 302 kg; W. Gunaratne 80% (4/5), 267 kg, with one missed stop (26 Oct, Hilltop Estate).

## 3. Measures
There is **one** backend service, `backend/src/performance/`:
- `performance-rules.ts` (pure, tested) holds the formulas;
- `PerformanceService` gathers the records.

The team table, the employee tab and any report read it; no screen recalculates.

| # | Measure | Formula | Notes |
|---|---|---|---|
| 1 | Attendance rate | present days (half day = 0.5) ÷ (working days − leave days) | Working days come from `working-days.ts` `dayInfo`, so holidays, weekly holidays and rest days aren't working days. **Unmarked days are left out too** (a data gap is not an absence) and shown as "N not marked". |
| 2 | Unplanned absences | Absent days that aren't leave | |
| 3 | Route completion | stops visited ÷ stops on their route days | A route day is a route that ran that date (not cancelled by a CANCEL override for a holiday or closure) with this agent responsible (`pickResponsible`): their own route or an accepted cover. |
| 4 | Kg collected | total kg; plus kg on each route day ÷ **that route's** average per collection day over the previous 3 months | A cover day uses the covered route's history. Route days with **no stops** are left out (no leaf requested ≠ 0 kg). |
| 5 | Weight accuracy | graded deliveries with \|estate − factory\| ÷ estate **above** the tolerance ÷ graded deliveries | The tolerance is `system_settings.collection.mismatchTolerancePct` (**5%**), one setting shared with grading warnings (decided). It is shown in the (i) panel. |
| 6 | Fertilizer first attempt | first attempts handed over (**delivered or partial**) ÷ first attempts | Failure reasons are broken down; owner-side ones (owner not available, owner refused) are counted apart. |
| 7 | Cover help | covers accepted (ACTIVE) ÷ answered (ACTIVE + DECLINED + EXPIRED) | Information only: grey, never marked. |
| — | Leave taken | days marked Leave | Other staff only; information. |

- **Leave:** leave requests (Phase 2) don't exist yet, so **a day marked Leave counts as approved leave** (decided). Once Phase 2 lands, only leave linked to an approved request counts.
- **Not measured as agent performance:** leaf grade mix and refused leaf. These mainly depend on the estates' plucking and belong on estate reports.

## 4. Fairness rules
- Holidays, rest days, approved leave and cancelled route days are left out of every denominator.
- **Minimum data:** fewer than 5 route days, 5 deliveries (weight, fertilizer) or 5 marked working days shows **"Not enough data"** with the reason, never a percentage.
  - A route also needs **5 collection days of history** before its average is a baseline. This was added after a hand-check showed a "36.8%" against a one-day history.
- **Trend** (▲ / ▼ / =, an icon with text, never colour alone) compares with the person's **own previous 3 months**.
  - Rates within 2 points are "same"; absences are compared with the monthly average of those 3 months.
  - It is neutral: "up" is not "better".
- **Header averages** are over agents, or within each role for other staff.
- **Notes** are facts from rules with counts and no adjectives, e.g. "3 unplanned absences in October 2026 (agent average 1)." A spec asserts the answer contains no score, rank or overall figure.

## 5. Screens
- **Team overview** (`/employees/performance`, `features/performance/`):
  - Tabs: Collection agents (default) / Other staff. Other staff get attendance rate, unplanned absences and leave, with **one table per role**.
  - The month (default: the last complete month) and "This month / Last 3 months" are in the URL (`?tab=&month=&span=`).
  - The table is sortable, with every percentage and its counts. Each header has an **(i)** popover (formula, data, what can affect it, exclusions, minimum) and the average.
  - Measures that can't be computed yet are listed as **Coming soon** with the reason.
  - A row opens the employee's Performance tab.
- **Employee tab** (`/employees/:id?tab=performance`):
  - the same measures for the last 6 complete months: a small trend line from real months only, and each month's figure with counts;
  - **drill-downs**: missed stops (date, estate, route, reason), deliveries outside the tolerance (estate vs factory kg, % apart), fertilizer failures (owner-side tagged), kg per route day vs the route average, cover requests, absent / unmarked / leave days;
  - **notes from conversations** (`performance_notes`): dated, private to Manager and Administrator, audited (module "Performance").
- **"How performance is measured"** (`/employees/performance/how`): every measure, formula, source, exclusions and minimum, plus what isn't measured and what's coming.
  - It reads the same `MEASURE_DEFINITIONS` the (i) buttons use; the live tolerance and minimums come from `GET /performance/definitions`.

## 6. Access
- **`performance`:** Manager **edit** (view plus notes), Administrator approve (pinned), Officer **none** for now (was view).
  - Migration `2026-11-07-performance.sql`.
  - Enforced in `PerformanceService`. A role without access gets a plain "not available" message, and the sidebar hides the entry.
- **Endpoints:** `GET /performance/team`, `GET /performance/employees/:id`, `GET …/drill/:measure`, `POST …/notes`, `GET /performance/definitions`.

## 7. Known difference, not changed
The **Attendance page's** "Attendance %" (Attendance-Leave-Addendum §2) is present ÷ working days, so leave lowers it there. The performance measure leaves leave out, as specified. Tell me if the Attendance page should follow the same rule.

## 8. Future items (not built)
- **Leaf transport time** (first pickup → factory receipt) needs app timestamps. It is the main way an agent affects leaf quality.
- **Punctuality** (shift check-in vs shift start) needs the app to record check-in.
- **Skip reasons for stops**, recorded in the agent app. Route completion's drill-down then shows them.
- **Agents see their own measures** in the mobile app: the same `PerformanceService`, only their own data.
