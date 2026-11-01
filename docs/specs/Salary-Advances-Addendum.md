# Salary Advances — Addendum (EMP-09 / EMP-10)

**Decided:** 2026-11-01
**Status:** built (branch `fix/dispatch-fert-payroll`)
**Amends:** EMP-10 (the advances list and the approval), and how payroll records which month recovers an advance.

## 1. List: tabs, dates and filters

- **Tabs:** Needs decision / Approved / Rejected / All. Each tab shows its count.
- **Request-date range:**
  - The presets are This month (the default), Last month, Last 3 months and Custom (from / to).
  - **Needs decision ignores the range.** It lists **every** pending request, oldest first, so an old request can never be hidden.
  - The other tabs list newest first.
- **Filters:**
  - search (employee name, employee ID or `EMP-ADV-` reference);
  - role;
  - route (agents: the routes they are responsible for today, from `RouteResolverService`);
  - amount range.
- **Tabs replace a status filter:** a tab *is* the status.
- **URL:** everything is kept in the URL (`tab`, `range`, `from`, `to`, `q`, `role`, `route`, `min`, `max`, `page`).
- **Server-side:** filtering and paging run on the server, 25 rows per page.

## 2. Summary cards

| Card | Covers |
|---|---|
| Requested | Σ amount of the requests in the date range |
| Approved | Σ amount of the approved requests in the range |
| Pending decision | Every pending request, whatever the date |
| Outstanding balance | Every approved advance still to be recovered through payroll |

## 3. Table

- **Dates:** shown as **"10 Jul 2026"**, the same everywhere in the portal.
  - `lib/format.ts`'s `formatDate` is the one formatter.
  - A bare `YYYY-MM-DD` is read as that calendar day, so a time zone never shifts it.
  - `formatDateTime` gives "10 Jul 2026, 14:30".
- **Columns:**
  - Employee (role, and routes for agents)
  - Reference, Amount, Requested, Status
  - **Recovery:** Not started / Recovering / Recovered
  - **Payroll month:** the month it is, or was, recovered in
  - **Remaining**
- **Opening a request:** on Needs decision, each row has a visible **Review** button; other tabs show **View**. Clicking anywhere on a row also opens the detail.

## 4. Detail page

- **Approve / Reject:** at the top, each confirmed in a `LightConfirmModal`.
  - **Reject needs a reason.** The server returns 400 without one.
  - The reason is stored (`salary_advances.decision_reason`) and recorded in the audit log ("Rejected advance Rs. X", record `EMP-ADV-…`, with the details naming the employee and the reason).
  - Approvals and rejections were already audited.
- **The employee's previous advances**, each with its status and recovery.
- **The employee's outstanding balance.** The approve dialog says when an approval adds to an existing balance.
- **Employee page:** the Overview tab shows "Outstanding advances", which links to that employee's advances.

## 5. Recovery: one shared calculation

`backend/src/employees/advance-balance.ts` is the **only** place recovery status and remaining balance are worked out. Three places use it:
- the Salary Advances list and detail pages;
- payroll Generate and Process;
- the employee page (`GET /employees/:id/advances`).

The portal only displays these figures. An approved advance is recovered **in full** by one payroll month:

| Recovery | When | Remaining |
|---|---|---|
| Not started | approved, not yet in a payroll row | the amount |
| Recovering | reserved by a Pending payroll row (`payroll_period`) | the amount |
| Recovered | that row was processed (`deducted`, `recovered_period`) | 0 |

### Two payroll bugs fixed (decided 2026-11-01)

1. **Counted twice.** Before, Generate summed *every* approved, not-yet-deducted advance into *every* month generated. So the same advance was deducted in two Pending months.
   - **Now:** Generate reserves the advances it counts for that month (`payroll_period`). Another month never counts them again. Recalculating the same month keeps them.
2. **Recovered without being deducted.** Before, Process flipped *every* approved advance to deducted, including one approved after Generate that was never deducted.
   - **Now:** Process recovers only the advances its row reserved, and stamps `recovered_period`. A late approval waits for the next run.

**Effect on amounts:** in a normal month (generate, then process) the amounts are the same as before.

**Migration** (`2026-11-01-salary-advances.sql`): it backfills `payroll_period` from existing Pending rows. Example: K. Perera's EMP-ADV-0230 becomes reserved for July 2026.

## 6. Check: are there rules? There are none.

| Rule | Today |
|---|---|
| Maximum amount (fixed, or % of salary) | **None.** The DTO only requires an amount greater than 0. |
| One open advance at a time | **None.** |
| Employee must be Active | **Not checked** by the API. The form lists Active employees only. |

### Proposed rules (not built; waiting for approval)

1. **Cap:** the lower of **Rs 50,000** or **50% of the employee's last processed gross pay**. With no processed payroll, use the fixed cap only.
2. **One open advance:** refuse a new request while the employee has a Pending request or an approved advance that is not yet Recovered.
3. **Active employees only.**
4. **Rejection message:** each rule rejects the request with a message naming the rule. The limits live in system settings, so they can change without code.

## 7. API

| Endpoint | Purpose |
|---|---|
| `GET /employees/advances?tab&from&to&search&role&routeId&min&max&sort&dir&page&limit` | Returns `{rows, total, page, limit, hasMore, summary, tabCounts, roles, routes}` |
| `GET /employees/advances/:id` | Returns `{advance, previous, outstanding}` |
| `GET /employees/:id/advances` | Returns `{outstanding, advances}` |
| `PATCH /employees/advances/:id/decide` | Body `{decision, reason?}`; a reason is required to reject |

## 8. Tests

- **Backend:**
  - `advance-balance.spec.ts`: the recovery states, remaining, outstanding, and the reserve and recover rules.
  - `advance-view.spec.ts`: pending requests show outside the date range, tab counts, summary, filters and ordering.
  - `employees.service.spec.ts`: an advance is counted in one month; a late approval is not marked recovered; Process stamps the month; reject needs a reason; the reason is audited.
- **Portal:**
  - `lib/format.test.ts`: the date formatter, including the no-shift case in a time zone behind UTC.
  - `advance-filters.test.ts`: date presets (including a year end and a leap year), and filters in the URL.
