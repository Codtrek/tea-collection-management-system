# Payroll Month History – Addendum

Amends EMP-10 (Payroll list) and EMP-12 (Process payroll). Decided 2026-10-29.

**Scope:** this is about **viewing payroll by month** only. How payroll is calculated (attendance hours × the employee's rates, snapshotted onto each row at generation) is unchanged.

## 1. Month in the URL
- The Payroll page opens on the **current month** (factory calendar, Sri Lanka).
- `?month=YYYY-MM` opens any earlier month, so a link opens the same month.
- A missing, malformed or **future** month falls back to the current month. Future months are never shown.
- The backend still keys rows by a period label (`'October 2026'`). The portal converts between the two (`features/employees/payroll-month.ts`).

## 2. Month picker
- **Controls:** ← / → arrows and a dropdown.
- **Range:** the dropdown runs from the current month back to the **earliest payroll on record**, and always covers at least the last 12 months.
- **Arrows:** they stop at both ends (no future months).

## 3. Month status (shown with a `StatusBadge`)

| Status | When |
|---|---|
| In progress | The current month. It can be generated or recalculated, **not processed**, until it ends. |
| Ready to process | A past month with at least one Pending row |
| Processed | A past month whose rows are all Processed. **Read-only.** |
| No payroll | A past month with no rows. Shows "No payroll for September 2026" (an empty state, not an error). |

There is **no "Paid" status**, because nothing records a payment after processing (the Bank File is still a stub). Add it when bank payment is built.

## 4. Rules
- **Generate / Recalculate from Attendance:** allowed for any month that isn't Processed. Processed rows are never changed; this was already the backend rule.
- **Process:** only for a past month that is Ready to process (`/employees/payroll/process?month=YYYY-MM`). It still uses `HighStakesConfirmFlow` (re-type the total).
- **The process page refuses** the month in progress and months with nothing pending.
- **Audit:** both actions are audited ("Generated payroll" and "Processed payroll run", with the period as the record).
- **The current month carries a note:** "Month in progress: figures up to <date>". The figures cover the attendance marked so far, so partial totals aren't mistaken for final ones.

## 5. Comparison
- At the top: **total net payable** and **headcount** for the month, against the previous month.
- A month without payroll shows "—".

---

# Part C: filters, problems and readiness (2026-11-01)

Viewing and the processing gate only. How payroll is calculated is unchanged, apart from the advance double-count fix in `Salary-Advances-Addendum.md`.

## 6. Filters (server-side, in the URL)

- **Endpoint:** `GET /employees/payroll/month?month=YYYY-MM&search&role&routeId&status&issues&method&sort&dir&page&limit`.
- **Filters:**
  - search (name or `EMP-` ID);
  - role;
  - route (collection agents: the routes they're responsible for today);
  - status (Pending / Processed);
  - payment method (bank / cash);
  - **Issues** (any of): `noBank` No bank details, `zeroGross` Rs. 0 gross, `hasDeductions`, `hasAdvance`.
- **Sort:** on Gross, Deductions and Net payable.
- **URL:** the month and every filter are kept there, like the month picker (`q`, `role`, `route`, `status`, `issues`, `method`, `sort`, `dir`, `page`).
- **Summary:**
  - "Net payable" and "Employees" are always the **whole month**, with the previous month for comparison.
  - With filters active, the summary reads "Showing X of Y", so a filtered list is never taken for the real total.
  - The summary wraps below the month picker on narrow screens. Before, it was cut off at the page edge.

## 7. Status vs. problems

- **Status** is only **Pending / Processed**. "Missing bank" no longer replaces it.
- **Problems are shown as chips** under the employee's name. They come from **live** employee data, not the snapshot taken at Generate.

| Chip | Rule | Links to | Effect |
|---|---|---|---|
| No bank details | paid by bank and a bank field is empty (Pending rows only) | `/employees/:id/edit#bank` (the edit page scrolls to the bank card) | **blocks** processing |
| Rs. 0 gross | gross = 0 | the employee's Attendance tab | warning only |

- **Payment method:** a new column, `employees.payment_method` (bank / cash). It is set on the employee forms ("Paid by"). A cash-paid employee needs no bank details and never blocks a run.
- **Migration:** `2026-11-01-payroll-filters.sql`.

## 8. Readiness badge

The server computes it (`payroll-view.ts` → `readiness`):

| Badge | When |
|---|---|
| In progress | the current month |
| No payroll | a past month with no rows |
| **N issues to fix** | a past month with Pending rows, where N bank-paid employees have no bank details and are not excluded. Clicking it applies `?issues=noBank`. |
| Ready to process | a past month with Pending rows and **no blocking issue** |
| Processed (· N excluded) | every row Processed, or Pending but excluded with a reason |

"Rs. 0 gross" never blocks. A note under the picker counts those rows and links to them.

## 9. Processing rule (decided 2026-11-01: exclude with a required reason)

- **Opening the process page:** Process Payroll is offered for a past month that is Ready to process **or** has issues to fix.
- **What the process page shows:** it lists each bank-paid employee with no bank details. Each name links to the bank section of that employee's edit page.
- **To go ahead, the officer either:**
  - adds the bank details; or
  - **gives a reason to exclude them from this run.** The Process button is disabled until there is one.
- **Backend (`processPayroll`):**
  - **No reason given:** a blocked employee is refused with 409, naming them, and **nothing is processed**.
  - **Reason given:** their row **stays Pending**, with `excluded_reason`, `excluded_by` and `excluded_on`. The exclusion is audited as "Excluded N employee(s) from payroll run", with the details listing each name and reason. The rest are processed.
  - **Bank details are checked live.** A cash-paid employee, or one whose details were added after Generate, is processed.
  - **A later run picks up an excluded row** once its details are fixed. Processing clears the exclusion.
- **Before this change:** missing-bank rows were silently skipped, so the month could never become Processed. The "Generates the bank-ready payment file" line on the confirm step was also wrong: there is no bank file. Bank File is now disabled with "Coming soon".

## 10. Check: why the page showed July 2026, the Rs 0 agents, and the Rs 0 deductions

### The month
**Not a bug.** With no `?month=`, the page opens on the current month, November 2026 ("In progress", no payroll yet). July appears only with `?month=2026-07`. The process page's back link, breadcrumb and post-success navigation add it, and so does a bookmark.

### Agent pay is Rs 0
- **This is expected for the data.** Gross = attendance hours × the employee's hourly rates (day / day-OT / night / night-OT). The formula is **the same for every role**: nothing pays by kg collected, and there is no fixed salary.
- **The 5 agents are R. Senanayake, W. Gunaratne, K. Weerasinghe, N. Perera and D. Silva.** They have **pay rates of 0** and **no attendance** on record (seeded that way). Their July rows came from Generate.
- **Fix:** set their rates and mark attendance, then Recalculate. Whether agents should be paid per kg or a fixed salary is a separate decision, not built.

### Deductions are Rs 0
- **They are not 0 for everyone.** K. Perera's July row carries Rs 20,000 (EMP-ADV-0230, approved 09 Jul 2026). Before, it was on page 2 of an unsorted table.
- **The advance is reserved for July** (`payroll_period`). It is recovered when July is processed.

### Live figures for July on the local data
- **Readiness:** "6 issues to fix": T. Rajapaksa and the 5 agents have no bank details.
- **Warnings:** 5 rows have Rs. 0 gross.

## 11. Tests

- **Backend `payroll-view.spec.ts`:**
  - every filter, and sort;
  - **a summary that filters never change**;
  - readiness with and without blocking issues;
  - Rs. 0 gross is a warning, not a block;
  - all-excluded counts as Processed;
  - the no-bank rule (cash never counts).
- **Backend `employees.service.spec.ts`:**
  - the run is blocked, naming the employees;
  - exclusion with a reason keeps the row Pending, stores the reason and audits it;
  - the live check (cash-paid, or fixed since Generate, is processed).
- **Portal:**
  - `payroll-filters.test.ts`: filters and URL state, and that the "issues to fix" link is the `noBank` filter.
  - `payroll-month.test.ts`: the readiness wording, and when Process is offered.
