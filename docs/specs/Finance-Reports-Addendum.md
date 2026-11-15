# Finance in reports: expense, recovery, loan (Addendum)

Status: implemented on `feat/collection-report` · 2026-11-15

## Why this addendum

The Expense report (RPT-03) counted things that are not expenses. Transport and fertilizer
deducted from estate owners were listed as factory costs, and wages counted payroll runs that
were never processed. It also missed fertilizer stock bought. This addendum defines **once, for
every report page**, what each kind of money is. The Leaf Purchase Report (RPT-02, Reports
addendum §9) and the Expense report both follow it.

## 1. The definitions

| Kind | What it is | Examples | In the expense total? |
|---|---|---|---|
| **Expense** | Money the factory spends and doesn't get back | Green leaf bought, processed wages, fertilizer stock bought, electricity, firewood | **Yes** |
| **Recovery** | Money estate owners pay back to the factory, deducted from their leaf payments | Transport charges, fertilizer charges, advance installments | No: "Recovered from estate owners" panel |
| **Loan** | Money paid out that is expected back | Estate owner advances, salary advances (when issued) | No: "Loans issued" line |
| **Estimate** | What an expense will probably be, before it is final | Wages from attendance for a month whose payroll isn't processed | No: "Estimated wages (not in total)" |
| **Information** | A loss already paid for | Fertilizer written off (expired / damaged) | No: "Stock lost" panel. Its cost was counted when it was bought |

A recovery is never subtracted from an expense line. Both are shown, side by side. The one
derived figure is **Net leaf cost = leaf purchases − transport charges recovered**, shown in the
recoveries panel with its rule.

## 2. One service

- `backend/src/reports/finance-rules.ts` holds the rules: pure functions, tested in `finance-rules.spec.ts`.
- `FinanceService` (`finance.service.ts`) is the one loader for leaf values, grade rates, settlements, payroll, attendance, stock, daily entries and advances.
- `LeafPurchaseService` reads its rates and settlements through it, so the leaf figure on both pages is the same number.

| Expense | Source | Rule | Dated by |
|---|---|---|---|
| Green leaf purchases | Graded deliveries | Super kg × Super rate + Normal kg × Normal rate, using the version in force on the delivery date (`valueDeliveries`). A delivery with no version in force adds nothing | Delivery date |
| Wages | `payroll_runs` with status **Processed** | Gross | Pay month |
| Fertilizer stock purchases | `stock_movements` of type Incoming | Quantity × `unit_cost` | Movement date |
| Operating costs | `expense_entries` | Amount, under the entry's category | Expense date |

| Not an expense | Source | Rule |
|---|---|---|
| Recovered | **Processed** settlements in the period's months (`settledPayments`), plus `estate_advance_recoveries` paid in cash / bank | Transport + fertilizer + advance deductions. A settlement-kind recovery *is* the settlement's advance deduction, so it is never counted twice |
| Loans | `estate_advances` by `date_issued`; Approved `salary_advances` by decision date | Amount issued |
| Estimated wages | `employee_attendance` × the employee's current rates | Only employee-months with no Processed payroll row. The formula is `grossFromHours` (`employees/payroll-gross.ts`), the same one payroll generation uses |

## 3. Periods

- Same model as RPT-01 (`resolvePeriod`): a month, "this month so far", or a custom range.
- **The default is the last complete month.** "Latest with data" is gone. It picked November because Pending payroll rows at Rs 0 existed for it.
- A month in progress is labelled "so far", compared only with the same days before, and drawn as partial (lighter and dashed) on the trend.
- Wages and recoveries count **by month**. A custom range that touches part of a month takes that month's processed payroll and settlements whole.

## 4. Wages

- Only **Processed** payroll is a wage expense.
- For a month that isn't processed yet, the report shows "Estimated wages (not in total)": each attendance day × the day / OT / night / night-OT rates **in force that day** from pay history (`Administration-Addendum.md` §6: the employee's own rate, else their role's), the same `grossByDay` payroll uses.
- When the month is processed, its gross becomes Wages and the estimate disappears.
- A Pending run's own gross is not used, because it may be stale.

## 5. Fertilizer stock cost

- Until 2026-11-15, stock-in recorded **no cost**. `fertilizer_batches` and `stock_movements` had no cost column. The Administrator's fertilizer prices are what estates are *charged*, not what the factory paid.
- Migration `2026-11-15-stock-unit-cost.sql` adds `stock_movements.unit_cost` (Rs per unit of quantity, nullable).
- The Receive Stock form (FERT-02) and `POST /fertilizer/movements` now **require** it for every Incoming movement. It is shown on the movement and in the audit line.
- Stock received before that has no cost, and neither does a batch registered without an Incoming movement (the seeded October batches). It is never guessed: the report counts it as "N stock-ins have no cost recorded, so they add nothing".

## 6. Daily expense entries (RPT-04)

- **Categories are data:** `expense_categories`, managed in ADM-01 Factory Setup → Expense Categories (Administrator: add, rename, reorder, take out of use). An out-of-use category stays on old entries. Nothing is deleted.
- Seeded list:
  1. Firewood / dryer fuel
  2. Electricity
  3. Water
  4. Vehicle fuel
  5. Vehicle repairs
  6. Machinery maintenance
  7. Packaging
  8. Office & admin
  9. Miscellaneous
- Old entries were mapped as follows:
  - Maintenance → Machinery maintenance
  - Miscellaneous and Other → Miscellaneous
  - Utilities → kept as an out-of-use "Utilities", since it can't be split into electricity and water after the fact
- **An entry has:** date, category, amount, description, paid via (cash / bank) and an optional receipt.
  - Ids come from `expense_entry_seq` (`EXP-YYYY-NNNN`). The old `count()+1` could collide.
- **Receipts:** one per entry, a photo (JPG, PNG, WebP, HEIC) or a PDF, at most 2 MB.
  - Stored in `expense_receipts` (bytea) until file storage (Cloudinary) lands.
  - Uploaded with `POST /reports/expenses/:id/receipt` (multipart `file`), read back with `GET` on the same path.

## 7. Entry rules (`expense-entry-rules.ts`)

- **No future dates**, on the factory calendar (Asia/Colombo), checked in the form and on the server.
- **Permissions are data-driven**, through the `expenses` module in `role_permissions` (ADM-02 → "Daily Expenses"):

| Role | Level | May |
|---|---|---|
| Officer | edit | Log entries; change **their own** entry within the edit window |
| Manager | approve | Change any entry: after the creator's window, or someone else's, **with a reason** |
| Administrator | view | View entries; manage the category list (`administration`) |

- **Edit window:** `system_settings.expenses.editWindowDays`, default **7**. It is edited in ADM-03 System Settings → Daily expense entries and counted from the day the entry was logged.
- **Audit:** every create, change and receipt upload writes an `audit_logs` row with the change (`Amount: Rs. 52,000 → Rs. 51,000 — reason: …`). The latest reason is kept on the entry (`edit_reason`), with `updated_by` / `updated_at`.
- **Month close:** none exists in the system yet. When one is added, a closed month should lock its entries here (a single check in `editError`). Until then nothing is locked by month.

## 8. Checking against the database

The opt-in check compares every category with a direct SQL query. It is read-only:

```
REPORT_SQL_CHECK_URL=postgresql://tea@localhost:5433/tea_dev [REPORT_SQL_CHECK_MONTH=2026-10] npx jest finance.sql
```

Local `tea_dev`, 2026-11-15. Page = SQL in every row:

| | Oct 2026 | Jun 2026 | Jul 2026 |
|---|---|---|---|
| Green leaf purchases (= RPT-02) | 798,201.50 | 896,333.60 | 754,821.00 |
| Wages, processed | 0 | 76,500 | 0 (10 runs Pending) |
| Fertilizer stock purchases | 0 | 0 | 0 |
| Operating costs (entries) | 0 | 198,200 | 313,575 |
| **Total** | **798,201.50** | **1,171,033.60** | **1,068,396.00** |
| Estimated wages (not in total) | 536,400 | 0 | 224,150 |
| Recovered from estate owners (not in total) | 0 | 55,500 | 0 (settlements Pending) |

What each source holds, by month:

| Month | Graded deliveries | Payroll | Stock-ins | Daily entries |
|---|---|---|---|---|
| May 2026 | 98 | Processed (1 run) | 2, no cost | 1 |
| Jun 2026 | 118 | Processed (1 run) | 2, no cost (+2 batches without a movement) | 1 |
| Jul 2026 | 110 | Pending | 1, no cost | 3 |
| Aug 2026 | 114 | Pending, Rs 0 | none | none |
| Sep 2026 | 105 | Pending, Rs 0 | none | none |
| Oct 2026 | 104 | Pending, Rs 0 | 4 batches without a movement, no cost | none |
| Nov 2026 (1–15) | 15 | Pending, Rs 0 | none | none |

## 9. The page (`/reports/expenses`)

- **Filters:** period (month / this month so far / custom) and category. The view lives in the URL (`expense-report-view.ts`).
- **Cards**, each with its rule behind the (i) button:
  1. Total expenses, with change vs the previous period and vs the same period last year.
  2. Largest category, with its %.
  3. Leaf purchases as % of total, linking to the Leaf Purchase Report for the same period.
  4. Recovered from estate owners, which opens the recoveries panel.
- **Charts:**
  - Monthly bars stacked by kind (leaf, wages, fertilizer stock, operating costs) for the 12 months to the period, with the year on the axis when the range crosses years and the month in progress drawn lighter and dashed.
  - Horizontal bars by category.
  - No chart is drawn when the total is 0.
- **"Not expenses" panel:** recovered (with Net leaf cost), loans issued and estimated wages.
- **Hints** say what is missing but not counted, for example wages not yet processed or stock-ins without a cost.
- **Table:** grouped by Category, Month or Entry. It is sortable, with a totals row equal to the Total card, and each row's source (Leaf / Payroll / Stock / Manual) links to its record.
- **Empty period:** the page says why, for example "No processed payroll, no deliveries graded, no fertilizer stock bought with a recorded cost and no manual entries in September 2026."
- **Export Excel:** a CSV with a preamble that also states what is *not* counted. **Print** shows every row and the not-expenses panel. PDF, Schedule and Share say "Coming soon".

## 10. Open items

- No settlement generator exists yet, so recoveries appear only for the seeded processed settlements (Mar–Jun 2026).
- Wages for Aug–Nov 2026 are estimates until those payroll months are processed.
- Month close (§7) does not exist.
