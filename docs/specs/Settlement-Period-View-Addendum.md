# Settlement Period View — Addendum (EST-07 / EST-08)

**Decided:** 2026-11-01
**Status:** built (branch `fix/dispatch-fert-payroll`)
**Amends:** EST-07 (settlement list) and EST-08 (process settlement)
**Scope:** viewing only — how a settlement is calculated is unchanged.

## 1. Why this was needed

EST-07 listed all 25 settlements across years. There was no period, no filters and no summary.

The backend ordered settlements by the period *label*, so the sort was alphabetical: "September 2025" came before "July 2026". The table showed 8 rows per page, so the first page held only the September rows from 2022–2025, and the July 2026 pending rows sat on page 3.

## 2. Period view

- **Default month:** the page opens on **last month**, because settlements are processed after a month ends.
- **Picking a month:**
  - It is chosen with the shared month picker (`components/patterns/MonthPicker`, the same one Payroll uses): ← / dropdown / →.
  - Any month up to the current one can be picked, but never a future one.
  - **"All periods"** shows the cross-period list.
- **URL:** `?month=YYYY-MM` or `?month=all`. A missing, malformed or future value falls back to last month.
- **Read-only periods:** a period with no pending rows is read-only, and Process is not offered.
- **Empty state:** "No settlements for October 2026". When newer data exists, a **View latest: July 2026** button jumps to the newest period with settlements.
- **Ordering:** settlements always sort by the **real period date**, never the label. Newest period first, then estate name.

## 3. Summary cards

The summary always covers the whole period, whatever filters are applied. When filters are active, the page shows "Showing X of Y".

| Card | Rule |
|---|---|
| Owners settled | Owners with a settlement row in the period, out of all active owners. Split into processed and pending. |
| Gross revenue | Σ (super kg × super rate + normal kg × normal rate) |
| Deductions | Fertilizer + advances + other. "Other" is transport, the only other stored deduction. An expandable breakdown sits under the total. |
| Net payable | Σ `settlementNet`: gross − deductions + the signed grading adjustment |
| Owners not yet settled | Active owners with **confirmed** deliveries in the month and no settlement row. Links to `/estates/settlements/unsettled?month=`. Shows "—" in the All periods view. |

## 4. Filters, sort and export

- **Filters:**
  - Search: estate name, owner name, or `SET-` reference
  - Route (the estate's route)
  - Status: Pending / Processed
  - Payment method: bank / cash
  - Net payable: zero or negative only
- **URL:** every filter, the sort and the page live in the URL (`q`, `route`, `status`, `method`, `net=nonpositive`, `sort`, `dir`, `page`).
- **Where it runs:** filtering, sorting and paging happen on the server, 25 rows per page.
- **Sorting:** available on Estate, Period, Gross, Deductions and Net.
- **Export CSV:** exports every row the current filters return, not just the visible page.

## 5. Payment method (new column)

- **Column:** `estates.payment_method` stores `'bank' | 'cash'` and defaults to `'bank'`. It is added by migration `2026-11-01-settlement-period-view.sql` and mirrored in `init.sql`.
- **Editing:** it is set on EST-02 and EST-04 ("Paid by").
- **Cash owners:** they need no bank details.
- **Why:** this prepares for the bank payment file.

## 6. Settlement detail

`/estates/settlements/:id` (served by `GET /estates/settlements/:id`) shows:
- the month's confirmed deliveries, with super and normal kg;
- fertilizer charges. A processed settlement lists the charges it recovered. A pending one previews the estate's outstanding *deduct* charges.
- owner advances;
- the net-payable calculation, line by line.

**Stored totals are authoritative.** When the listed lines don't add up to them, a note says so. Older records were imported as totals.

The page links to the owner's EST-10 timeline (`/estates/:id?tab=timeline`).

## 7. Checks: what the stub buttons do

### Process Settlement
- **What it does:** it processes **existing pending rows**:
  - stamps the processed fields;
  - carries pending grading adjustments;
  - links the month's locked deliveries as paid;
  - flips the estate's pending advances to deducted;
  - writes an audit record.
- **What it doesn't do:** it does **not generate** settlements. There is no generator; every settlement row comes from the seed. `rateVersionFor` and `computeGross` in `settlement-calc.ts` exist but are unused.
- **What changed:**
  - **Scope:** it now takes the period being viewed (`POST /estates/settlements/process {period}`) and processes only that month. Before, it processed every pending row of every period at once.
  - **Process page:** it shows that period instead of a hardcoded "July 2026".
  - **Button:** it is shown only when the selected month has pending rows.
- **Known gap:** it never sets `fertilizer_charges.settlement_id`. Only the seed does.

### Generate Bank Payment File
- **Before:** it only showed a toast. No file existed anywhere.
- **Now:** it is **disabled** with a "Coming soon" tooltip.

## 8. API

| Endpoint | Purpose |
|---|---|
| `GET /estates/settlements?month&search&routeId&status&method&nonPositive&sort&dir&page&limit` | Returns `{rows, page, limit, total, hasMore, summary, months, routes}`. `limit=0` returns every filtered row. |
| `GET /estates/settlements/unsettled?month=YYYY-MM` | The owners not yet settled for that month |
| `GET /estates/settlements/:id` | One settlement's detail |
| `POST /estates/settlements/process` | Body `{period?}` |

## 9. Tests

- **Backend (`settlement-view.spec.ts`):**
  - deduction split and net;
  - sort by real month;
  - month scope;
  - every filter;
  - a summary that ignores filters;
  - the "not yet settled" rule (confirmed only, active only, that month only);
  - pagination.
- **Backend (`estates.service.spec.ts`):** process with a period leaves other months pending.
- **Portal (`settlement-filters.test.ts`):**
  - month default and fallback;
  - URL round-trip;
  - the API query;
  - CSV quoting.
