# Dashboard — Addendum

**Decided:** 2026-11-17
**Status:** built on `feat/dashboard` (from `merge/pr4-reports-admin`), local only.
**Amends:** the Global Dashboard screen (FND-01 / Global) and the portal's primary colour token.

## 1. Why

The dashboard was entirely mock. Nothing on it called the API.

| What it showed | Why it was wrong |
|---|---|
| 17/07/2026, "45,780 kg today", "27 / 31 employees" | Hardcoded. The system has 11 employees. The date also used DD/MM format, which the portal forbids. |
| Hill Crest, Maple Ridge, Sunfield, Rosewood; "Route 1–5, 4–8 agents" | Those estates don't exist, and there are 5 agents |
| Today's Revenue, Monthly Revenue, Net profit | The factory sells no tea in this system |
| Recent activity, pending tasks, notifications | Invented |
| "Static route + agent-proximity view — not live GPS" | Contradicted the live-GPS decision |
| Greeting "Welcome back, {surname}" in a gradient banner | Took the last word of the name; raw hex in the gradient |

**Rule now:** every figure is another page's own number, and it links to that page. Nothing on the dashboard is a constant.

## 2. The endpoint

`GET /dashboard/summary` lives in `backend/src/dashboard/`. The pure rules are in `dashboard-rules.ts` (with a spec). The service is `dashboard.service.ts` (with a spec).

- **Built only from existing services.** Each is called with the same inputs its page uses. No report figure is calculated here.
- **The role comes from the JWT.** `?role=` is ignored, so it can't widen the response.
- **`role_permissions` decides everything**, read through `DispatchAccessService.levelFor`:
  - a section shows only to the roles in §3;
  - each figure needs `view` on its module;
  - each action item needs the permission its page checks.
- **Nothing is computed for a role that can't see it.**
- **"Today"** is the factory date in Asia/Colombo (`localDate`).

### 2.1 Where each number comes from

| Figure | Source (existing) | Link |
|---|---|---|
| Leaf received so far: kg and deliveries | `CollectionReportService.report({from: today, to: today})` → `cards.factoryKg`, `cards.deliveries` | `/reports/collection?from=…&to=…` |
| … against the same weekday last week (whole day) | The same report for today − 7 | — |
| Waiting for grading | `CollectionsService.findAll()`: status Collected, no grade lines, dated today | `/collections?grade=Ungraded&status=Collected&date=…` |
| Weight mismatches today | Today's report → `cards.weightDiff.overTolerance` (tolerance from `CollectionSettingsService`) | the report's weight differences |
| Agents: on route / not started / absent / covering / completed | `DispatchService.board(now, today)` → `agents[].status` | `/collections/dispatch` |
| Fertilizer deliveries today: done / failed / pending | `FertilizerViewService.list()` after `reconcile()` (the queue's own read path). Counts latest attempts scheduled today and not cancelled; done = delivered or partial. | `/fertilizer/requests?tab=all&scope=today` |
| Leaf intake this month, vs last month and vs last year; Super share | `CollectionReportService.report({thisMonth})` → `factoryKg` (compared like for like) and `superShare` | `/reports/collection?thisMonth=1` |
| Leaf purchase value, average Rs./kg | `LeafPurchaseService.report({thisMonth})` → `leafValue`, `pricePerKg` | `/reports/leaf-purchases?thisMonth=1` |
| Expenses to date | `FinanceService.expenseReport({thisMonth})` → `cards.total` | `/reports/expenses?thisMonth=1` |
| Payroll | `PayrollViewService.month()` → `readiness.status`, for last month and this month | `/employees/payroll?month=` |
| Daily intake chart (last month faint) | This month's report `trend.points`, with last month's report aligned by day of the month | the report |
| Intake by route chart | This month's report `byRoute` | the report |
| Recent activity | `AuditService.list()`: the newest 10 from modules the role can `view` (`AUDIT_MODULE_PERMISSION`). Modules not in that map are Administrator only. | each entry's `recordHref`; Administrators also get "Audit log" |

### 2.2 Needs your action

Each item is a count, a label and a link. An item **shows only when the count is above 0**, and only to a role holding the action's permission. Items are sorted by urgency:

1. money that is due or blocked;
2. decisions people are waiting on;
3. stock;
4. data fixes.

| Item | Count from | Permission to act | Link (the same list) |
|---|---|---|---|
| Payroll due | Last month's `readiness`. When it is Ready / Issues, the count is pending employees. When it is No payroll, the count is 1 month ("payroll month not generated"). | `payroll: edit` | `/employees/payroll?month=…&status=Pending`, or the month itself |
| Settlements to process | `SettlementViewService.list({month: 'all', status: 'Pending'}).total` | `estateOwners: edit` | `/estates/settlements?month=all&status=Pending` |
| Salary advances to decide | `AdvanceViewService.list({tab: 'decide'}).tabCounts.decide` | `advances: approve` | `/employees/advances` |
| Fertilizer requests to decide | The queue: status Requested | `fertilizerApproval: approve` | `/fertilizer/requests?status=Requested` |
| Awaiting manager approval | The queue: status "Awaiting manager approval" | `fertilizerManagerApproval: approve` | `?status=Awaiting manager approval` |
| Grading corrections to approve | `GradingService.pendingCorrections()` (new; a status filter) | `gradingApproval: approve` | `/collections?corrections=pending` |
| Pay changes awaiting approval | `PayAdjustmentService.list()`: pending and `canDecide` | `payRates: approve` | `/employees/pay-rates?changes=decide` |
| Holiday requests | `HolidayService.year().pending` | `holidayCalendar: approve` | `/holidays` (the pending panel) |
| Requests holding expired stock | The queue: `staleCommittedKg > 0` | `fertilizer: edit` | `/fertilizer/requests?tab=all&scope=stale` |
| Expired stock to write off | `FertilizerService.expiryAlerts().summary.expired.count` | `fertilizer: edit` | `/fertilizer/alerts#expired` |
| Deliveries ungraded for more than 7 days | `findAll()`: Collected, no grade lines, dated today − 7 or earlier | `grading: edit` | `/collections?grade=Ungraded&status=Collected&olderThan=7` |
| Employees missing bank details | `PayrollViewService.month({month: last, issues: ['noBank']}).total` | `employees: approve` | `/employees/payroll?month=…&issues=noBank` |
| Estates missing bank details | Pending settlements with `missingBank` (`?noBank`, new) | `estateOwners: edit` | `/estates/settlements?month=all&status=Pending&bank=missing` |

**Not shown:**

- **Leave requests:** no leave-request entity or route exists yet; only the Phase 2 placeholder column does.
- **Estate advances:** they have no approval step. "Pending deduction" means not yet recovered.
- **Advance reschedules:** there is no list of all of them.
- **Settlements once PR5 lands:** "to prepare / to process" will read `SettlementGeneratorService.run()`. That code exists only on `feat/settlement-generator`.

### 2.3 Reads that write

The dispatch board expires stale cover requests, and the fertilizer queue reconciles delivery dates before listing. The dashboard calls the same methods its linked pages call, so the counts match. Both writes are idempotent housekeeping.

## 3. The page by role

| Section | Who | What |
|---|---|---|
| Header | All | <ul><li>"Good morning, {name}": the first word that isn't an initial, so "A. Bandara" → Bandara</li><li>Weekday and date (Colombo), "Updated HH:MM", Refresh</li><li>Up to 3 quick actions</li></ul> |
| Needs your action | All | The items in §2.2, or "Nothing is waiting for you" |
| Today | Officer, Manager | Leaf so far; waiting for grading; agents; fertilizer deliveries; weight mismatches (only when there are any) |
| This month | Manager, Administrator | Leaf intake (with Super share), leaf purchase value, expenses to date, payroll |
| Charts | Anyone with `reports: view` | Daily intake (linear, the day in progress drawn dashed, last month as the faint compare line); intake by route (horizontal bars) |
| Recent activity | All | The newest 10 audit events from modules the role can view |

**Quick actions** are chosen in `dashboard-rules.ts`. Each also needs its page's permission:

- **Officer:** Log collection exception, Log phoned-in fertilizer request, Mark attendance.
- **Manager and Administrator:** Review approvals (only while there is something to review), Prepare settlements.
  - By default a Manager has `estateOwners: view`, and the server refuses Managers on prepare/process.
  - So "Prepare settlements" shows for a Manager only if the matrix grants `estateOwners: edit`.

**Quiet states** say why there is no figure, for example "No graded deliveries yet today" or "No routes scheduled today". A zero is a real figure. A value is never coloured just because it fell; only problems are coloured (failed deliveries, weight mismatches).

**Removed:**

- the welcome banner and its gradient
- Today's / Monthly Revenue, Net profit
- the top-estates chart with invented estates
- the route and agent box with the GPS note
- the invented activity and notifications

The Notifications box is gone rather than linked, because the Notifications page and header bell are still mock: there is no backend read API.

## 4. Linked lists: filters added so counts match

- **Collections (COL-01):**
  - The filters live in the URL: `q`, `route`, `grade`, `status`, plus link-only `date`, `olderThan` and `corrections=pending`.
  - The link-only filters show as a removable chip with "N shown".
  - The logic is pure, in `collection-filters.ts`. `GET /collections` now marks `pendingCorrectionId`.
- **Fertilizer queue:** the `stale` and `today` scopes.
- **Expiry Alerts:** each section has an id (`#expired`), and the page scrolls to it once loaded.
- **Settlements:** `bank=missing`, with a "No bank details" checkbox; the backend takes `noBank`.
- **Pay changes:** `changes=decide`, with "Awaiting your approval · N shown · Show all".

## 5. Primary colour

`--color-primary` is now **`#1D6839`**.

| Colour | White text on it | As text on the soft / hover surfaces |
|---|---|---|
| `#1B8B4E` (old) | 4.33:1, fails AA for body text | about 4.0:1 |
| `#1D6839` (new) | 6.8:1 | 6.3:1 |

Hover is `#185A31` and active is `#134A28`. Chart series colours are unchanged.

## 6. Tests

- **Backend** (`dashboard-rules.spec.ts`, `dashboard.service.spec.ts`):
  - sections and figures by role and permission; a narrowed role loses the figure and never loads it
  - action items by permission, zeros omitted, urgency order
  - every count is the source service's own number, with the right link
  - Colombo "today" at 00:30 local (still the previous day in UTC)
  - activity filtered by module
  - quick actions
- **Portal** (`DashboardPage.test.tsx`, `dashboard-view.test.ts`, `collection-filters.test.ts`, `settlement-filters.test.ts`):
  - before the API answers, the only digits on the page are today's date
  - every figure comes from the response; quiet states
  - sections the server left out are not rendered
  - Colombo date and greeting
- **Playwright** (`e2e/dashboard.spec.ts`, local DB):
  - per role, every count equals its linked list, read through the same API the page reads
  - `?role=` is ignored
  - sections by role; none of the old mock text remains
- **Layout:** the Dashboard joins `PAGES` in `layout.spec.ts` (1920 to 768 px, 90% and 110% zoom): the title stays on one line and the page never scrolls sideways.

## 7. Follow-ups

- **Notifications:** a backend read API, then the header bell and the Notifications page off mock data.
- **Leave requests:** an item once leave requests exist.
- **After PR5:** the settlement items switch to `SettlementGeneratorService.run()` ("to prepare" and "to process").
- **Reschedules:** advance reschedules need a list-all before they can be an item.
