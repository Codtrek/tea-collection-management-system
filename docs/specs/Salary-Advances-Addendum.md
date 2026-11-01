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

---

## 9. Never a negative net payable; the shortfall is carried forward (2026-11-02)

**What went wrong.** On Process Payroll for August 2026, S. Fernando had Rs. 0 gross and a Rs. 15,000 advance deduction. Her net was Rs. −15,000, and the total showed in green.
- **Cause:** Part B deducted the whole advance with no check against gross.
- **Why the gross was 0:** **no attendance is marked for August**. The only attendance on record is July 2026, so every month generated afterwards (August to November) has Rs. 0 gross for everyone.

**The rule.** A month's advance deduction, per advance with the oldest first, is the **smallest** of:
1. the planned installment (§10; until then, the whole balance);
2. what is still free of the balance (minus what other Pending months have reserved);
3. what the gross allows: **`advanceDeductionCapPct`% of gross**, and never more than gross − other deductions.

Whatever couldn't be deducted stays in the remaining balance and is deducted in later months, until the balance is Rs. 0. **Net payable can never go below Rs. 0.**

**Cap setting.** `system_settings.payroll.advanceDeductionCapPct`, default **50**.
- **No existing rule:** nothing in the code or specs sets this figure.
- **Legal limit:** Sri Lankan wage law does restrict deductions from wages, but **the figure must be confirmed by HR / legal**. 50% is a placeholder, not a legal value.
- **Second setting:** `maxInstallmentMonths` (default 6) lives in the same place.

**Data.** New table `advance_recoveries` (migration `2026-11-02-advance-recoveries.sql`), with one row per advance per payroll month:
- **When it changes:** the row is `reserved` at Generate and `recovered` at Process.
- **Amounts:** `planned_amount` is what the month meant to deduct; `amount` is what it deducted.
- **Remaining balance** = approved amount − Σ recovered.
- **Shared code:** `advance-balance.ts` computes all of this (`planMonthDeductions`, `remainingOf`, `recoveryOf`, `payslipAdvanceLines`). The Salary Advances pages, payroll and the employee page all use it.
- **Part B still holds:** a month never plans money another Pending month has reserved.
- **Migration:** turns Part B's single reservations into recovery rows.
- **When an advance closes:** it is marked `deducted` only once its balance reaches Rs. 0.

**What users see.**
- **Payslip:** per advance, *planned installment / deducted this month / carried forward / remaining balance*.
- **Payroll list:** a **"Deduction carried forward"** chip. It is also an Issues filter.
- **Process page:**
  - **Rs. 0 gross:** a **"N employees with Rs. 0 gross"** warning that **doesn't block** the run.
  - **Carried forward:** a line naming the employees whose deductions roll over.
  - **Totals:** shown in green only when positive.
- **Settlement process page:** the same money-colour rule.

**Validation.** Process refuses a row whose net is below Rs. 0, naming the employees and asking to recalculate first. These are rows generated before this rule, such as August 2026 on the local data. Recalculating August deducts Rs. 0 from S. Fernando and carries Rs. 15,000 forward.

## 10. Repayment in installments (2026-11-02)

### Request
The New Advance Request form has a **repayment plan**:
- **One deduction in the next payroll:** the earlier behaviour.
- **Monthly installments:** typed either as an amount per month or as a number of months; entering one fills in the other. When months are typed, the installment is rounded up to a whole rupee.
- **Start month:** defaults to the **next calendar month**, so a request made in November starts in December.

**Validation** runs both in the form and on the server:
- **Installment** ≤ advance.
- **Months** ≤ `system_settings.payroll.maxInstallmentMonths` (default 6).
- **Last installment:** takes the remainder. Rs. 20,000 at Rs. 6,000 is 6,000 / 6,000 / 6,000 / 2,000.

**Preview:** the form shows the schedule as you type, e.g. "Dec 2026: Rs. 5,000 · … · cleared Mar 2027".

**Endpoint:** `GET /employees/advances/settings` serves the cap and the maximum number of months.

### Approval
- **The approver's choice:** approve the requested plan, or change the installment / months / start month first. **A change requires a note**; the note is stored (`plan_change_note`) and recorded in the audit log.
- **Nobody approves their own advance.** It is blocked **on the server** (403), and the Approve button is disabled with the reason shown, when either of these is true:
  - the approver **requested** it (`requested_by_user_id`, now stored on every request);
  - the approver's login NIC (`factory_employees.nic`) is the employee's NIC (`employees.nic`).
- **NIC comparison:** both NICs are first converted to the **12-digit form**. The old format `YYDDDSSSC+V/X` becomes `19YY DDD 0SSS C`, so `853202937V` = `198532002937`.
- **Missing NIC:** if either NIC is missing, the requester rule still applies. The detail page then notes that the identity check couldn't run.
- **Seed data:** the Officer login "S. Fernando" (NIC 199012345602) and HR employee "S. Fernando" (198834567890) are different people. So EMP-ADV-0231 is not blocked by the NIC rule.

### Data
- **The plan on the advance:** `installment_amount`, `installment_months` and `start_period`.
  - Existing advances become one deduction of the whole amount.
  - They start in the month that already reserved them.
- **Each month's recovery is its own row** in `advance_recoveries` (§9), so each month row reserves at most one installment.
- **Remaining balance** = approved amount − Σ recovered, from the shared `advance-balance.ts`.
- **Generate:**
  - deducts nothing before `start_period`, then one installment a month;
  - each month's deduction is still capped by §9;
  - a short month **extends** the schedule; a later installment is never doubled.
- **Migration:** `2026-11-02-advance-installments.sql`.

### Changes after approval
- **Reschedule** (a new installment and/or start month for the remaining balance):
  - a request (`advance_reschedules`) with a required reason;
  - approved by **someone other than the requester or the employee** (the same server check);
  - audited when requested, approved and rejected;
  - it must start after the last processed month. **Processed months are never changed**, because they are recovery rows.
- **Early repayment in cash:**
  - an officer records the amount, the date and a reference; it is audited;
  - stored as a `cash` recovery row, so it reduces the balance and **shortens the schedule**;
  - it can't exceed what isn't already reserved by a Pending payroll month.
- **Leavers:**
  - deactivating an employee stores `deactivated_on`;
  - Generate for that month includes them once, as their **final payroll** (`payroll_runs.is_final`);
  - their whole remaining balance is due, deducted **only up to the cap**; installments and start months don't apply;
  - whatever is left is reported. The payroll row shows a "Final payroll · Rs X unrecovered" chip, and the payslip explains it.

### Screens
- **Salary Advances list:**
  - Plan ("Rs. 5,000 × 4", from <month>);
  - recovered so far, remaining;
  - next deduction month (with any amount carried forward).
- **Detail page:**
  - the plan and its cleared month;
  - the full schedule (Planned / Deducted / Carried forward / status Deducted · Reserved · Planned);
  - reschedules (approve or reject, each with a reason), cash repayments, and recovered / remaining / next deduction.

### Tests
- **Backend `advance-schedule.spec.ts`:**
  - schedule with the last-installment remainder;
  - amount ↔ months;
  - validation;
  - a partial month extends the schedule;
  - a reschedule keeps processed months;
  - cash shortens the schedule;
  - NIC normalisation.
- **Backend `employees.service.spec.ts`:**
  - the request stores the plan;
  - the plan is validated;
  - **self-approval blocked on the server** (as requester, and by NIC in the old vs new format);
  - a changed plan needs a note;
  - an installment from the start month;
  - a leaver's final payroll.
- **Backend `advance-plan.service.spec.ts`:**
  - reschedule approval by someone else;
  - processed months unchanged;
  - no start in a processed month;
  - cash repayment shortens the schedule;
  - the repayment limit.
- **Portal `advance-plan.test.ts`:** remainder, amount ↔ months, the preview text, validation, the default start month.

## 11. Searchable employee / estate picker (2026-11-02)

`components/ui/Combobox` is the **one** searchable picker for long lists of people or estates. It follows the ARIA 1.2 combobox pattern.

**Behaviour:**
- **On focus:** lists every option in alphabetical order; the caller does the sorting.
- **Long lists:** 50 rows at a time, with "Showing 50 of N — keep typing, or show more".
- **Typing:** filters case-insensitively, matching anywhere in the name or ID ("pere" finds K. Perera and N. Perera).
- **Each option:** shows the name plus a second line, e.g. "EMP-0042 · Tea Collecting Agent", so similar names can be told apart.
- **Keyboard:** ↑ ↓ move (and wrap), Enter selects, Esc closes.
- **No match:** shows "No employees match '…'".
- **Clearing:** a clear button resets a filter to "All".
- **Tests:** the filtering and the keyboard live in `combobox-logic.ts` and are unit-tested (`combobox-logic.test.ts`). The portal has no DOM test setup (jsdom / Testing Library), so the component itself isn't tested in a browser.

**Where it's used:**

| Page | Picker |
|---|---|
| New Advance Request | Employee (active employees). After a pick it shows the **outstanding advance balance**, and warns if the employee already has an open advance (Pending, or approved with a balance left). |
| COL-02 exception entry | Estate (`EstatePicker`, now built on it, still with the route filter) |
| Log Fertilizer Request | Estate owner |
| Issue Estate Advance | Estate owner |
| Estate Analytics | Estate |
| Collection and Revenue reports | Estate filter |

**Not changed:** Payroll and Settlements keep their free-text search, which already matches anywhere (decided 2026-11-02).
