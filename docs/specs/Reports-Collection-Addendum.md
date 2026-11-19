# Reports: Collection (RPT-01), Leaf Purchase (RPT-02) and Expenses (Addendum)

Status: implemented on `feat/collection-report` · 2026-11-08

## Purpose

The Collection Report (`/reports/collection`) shows how much leaf came in, where it came from,
what quality it was, and how that compares with earlier periods. Agent performance is not here: it
stays on the Performance page, and the report links there instead.

## 1. One service

- **`GET /reports/collection`** → `CollectionReportService` (`backend/src/reports/collection-report.service.ts`).
  - It loads three sets of deliveries: the period, the previous period, and the same period last year.
  - `buildCollectionReport` (`collection-report-rules.ts`) applies every rule.
- **The page, its totals row and the CSV export all read this one response.** The portal recalculates
  nothing.

## 2. Which deliveries count

| Bucket | Rule | Shown as |
|---|---|---|
| **Graded** | status `collected` or `confirmed`, with grade lines | **Factory weight** = Σ grade lines; estate weight shown beside it |
| **Ungraded** | status `collected` or `confirmed`, no grade lines | Its own column (count + estate kg); never mixed into factory kg |
| **Provisional** | `provisional` set (an exception entry awaiting the agent) | A separate count; excluded from weights |
| Not delivered | `agent_assigned`, `approved`, `submitted` | Excluded: no leaf has reached the factory yet |

- **No cancelled status.** There is no `cancelled` status in the schema.
- **Corrections.** `delivery_grade_lines` is rewritten every time a revision is applied: the initial
  grade, an edit while the record is open, or an approved correction. The current lines are
  therefore the **latest approved revision**. A pending correction request
  (`grade_correction_requests`) changes nothing until it is approved.
- **Dates.** `collection_date` is a `DATE`: the Colombo calendar day the leaf was collected, as
  entered. It is grouped as it is, with no UTC conversion, so a delivery at 23:30 local time stays on
  its day. "Today" is the Asia/Colombo date (`localDate()`).

## 3. Periods

- **Default:** the last **complete** month. On 8 Nov 2026 that is **October 2026**.
- **This month so far:** allowed, labelled "November 2026 so far (1–8 Nov)". It is never compared as if complete:
  - It is compared with the same days of the previous month and of last year.
  - Its trend point is drawn hollow, with a "Month in progress" note.
- **Custom range** (`from`, `to`):
  - An end after today is clamped to today, and the label says "(so far)".
  - The comparison is the same number of days immediately before, and the same dates a year earlier.
- **A whole month** is compared with the whole previous month.
- **Year on year** uses the same dates a year earlier. When that window has no graded delivery, the
  figure is null and shows "No data last year". Tea is seasonal, so this is the fair comparison.
- **Trend granularity:** daily for ranges up to 62 days, monthly beyond that. When a range crosses a
  year, labels carry the year ("Sep 2025").

## 4. Filters

| Query | Meaning |
|---|---|
| `month=YYYY-MM` · `from`+`to` · `thisMonth=1` | The period (default: the last complete month) |
| `routeId`, `agentId`, `estateId` | Narrow every figure |
| `grade=super\|normal` | Only that grade's kg, and only deliveries that carry it. Estate weight and the weight difference can't be split by grade, so they show "—". |
| `demo=0` | Hide rows created by the local demo seed (its `demo_seed_rows` registry; the table doesn't exist elsewhere) |
| `groupBy=estate\|route\|agent\|day` | The table's grouping |

## 5. Figures

- **Factory weight:** Σ grade lines of graded deliveries. Compared with the previous period and with the same period last year.
- **Deliveries:** the number of graded deliveries; the average is factory kg ÷ that number. Ungraded and provisional counts sit beside them.
- **Supplying estates:** active estates in scope (route, estate and demo filters) that delivered anything, graded or not. The ones that didn't are listed.
- **Super share:** Super kg ÷ factory kg. Its change is in percentage points.
- **Weight difference:**
  - Overall: (Σ estate kg − Σ factory kg) ÷ Σ estate kg, over graded deliveries.
  - "Above tolerance" uses grading's rule: |factory − estate| ÷ estate > `collection.mismatchTolerancePct` (currently 5%).
- **Table totals:** computed by the same function as the cards, so they always agree.

## 7. The page

**URL** (`features/reports/collection-report-view.ts`): the whole view lives in the URL, so a link
reproduces the view. Defaults are left out of the URL.

```
?month=2026-09 | ?from=2026-05-01&to=2026-11-08 | ?thisMonth=1
&route=2 &agent=7 &estate=12 &grade=super|normal &demo=0|1 &group=route|agent|day &lastYear=1
```

"Include demo data" defaults on only in a development build (`import.meta.env.DEV`).

**Cards** (`components/data/SummaryCard`; each has an (i) with its exact rule):

| Card | Value | Below |
|---|---|---|
| Factory weight | Σ factory kg | change vs the previous period (with its kg); vs the same period last year, or "No data last year" |
| Deliveries | graded deliveries | average kg per delivery; ungraded (estate kg) and provisional counts |
| Supplying estates | "X of Y" active estates | opening it lists the estates that did **not** supply, linked to EST-10 |
| Super share | Super kg ÷ factory kg | change in percentage points |
| Weight difference | overall % | deliveries above tolerance; opening it lists them |

For a partial period, each "vs previous" line says "(same days)".

**Charts:**
- **Trend:** daily for a month, monthly over 2 months. A partial point is hollow on a dashed segment.
  "Same period last year" adds a dotted line.
- **By route:** horizontal bars, sorted. Clicking a bar filters to that route.
- **Top 10 estates:** horizontal bars with readable names. "View all" groups the table by estate
  and scrolls to it. This replaces the old 40-bar chart; the "Top-performing estate (YTD)" card is
  removed.
- **Grade split:** the donut. Over 2 months, **Super and Normal by month** (stacked bars) is added;
  the month in progress is labelled "(so far)".

**Table:**
- **Grouping:** "Group by" Estate (default), Route, Agent or Day.
- **Columns:**
  - name (estates also show their route)
  - deliveries, estate kg, factory kg
  - difference (bold red above the tolerance)
  - Super kg, Normal kg, Super share
  - ungraded
  - change vs the previous period ("New" when it had nothing)
- **Interaction:** sortable, 15 rows per page, and a totals row (the same figures as the cards).
- **Clicks:**
  - An estate opens its EST-10 timeline.
  - A route or agent applies that filter.
  - Agent rows link to the Performance page. The report never judges agents, and never calls an estate or agent "top-performing".

**Formatting:** kg always uses one decimal with thousands separators (`formatKg`). Percentages
have one decimal and a sign.

**Header:** `AppShell` scrolls to the top on every new page. Without this, a report opened from the
query cache kept the previous page's scroll position, and its title sat under the sticky top bar.

## 8. Export, print and the action bar

`ReportActionsBar` only offers what works. Every report and EST-03's Timeline use it.

| Action | RPT-01, RPT-02, RPT-03 | Timeline |
|---|---|---|
| **Export Excel** | Works (see below; RPT-02 §9.2, RPT-03 Finance-Reports-Addendum §9) | Disabled · "Coming soon" |
| **Print** | Works (see below) | Disabled · "Coming soon" |
| Export PDF | Disabled · "Coming soon" (no PDF library) | same |
| Schedule Report | Disabled · "Coming soon" (no scheduling or email) | same |
| Share Report | Disabled · "Coming soon" (no sharing; it must keep §13 field masking when built) | same |
| ~~Preview~~ | Removed: Print shows the same page | removed |

- **Export Excel** downloads a CSV (UTF-8 BOM, opens in Excel). It is named
  `collection-report-<period>-<grouping>.csv`.
  - It contains the server's table for the current grouping and filters: **every row**, not just the
    page, then the totals row.
  - A short preamble gives the period, the filters and the weight rule.
  - Numbers are plain, with one decimal and no units, so Excel can sum them.
  - Built by `collectionCsv()`. Nothing is recalculated.
- **Print** uses `window.print()`:
  - The sidebar, top bar, filters, toggles and action bar are `print:hidden`.
  - A print-only line names the period, filters and print date.
  - The table prints every row with its totals.
  - The layout is A4, with flat cards and charts and rows kept whole (`@media print` in `index.css`).

Tests:
- Vitest: `collection-report-view.test.ts` covers the CSV rows and totals, and the URL round trip.
- Playwright: `e2e/collection-report.spec.ts` checks that:
  - the header sits under the bar after navigation
  - the URL reproduces the view
  - print hides the chrome
  - the CSV equals the table and card
  - disabled actions say "Coming soon"

## 6. Checking against the database

`REPORT_SQL_CHECK_URL=postgresql://tea@localhost:5433/tea_dev npx jest collection-report.sql` (backend)
runs this SQL and compares it with the service. `REPORT_SQL_CHECK_MONTH` picks another month.

```sql
WITH lines AS (
  SELECT delivery_id, sum(weight_kg) AS factory_kg,
         coalesce(sum(weight_kg) FILTER (WHERE grade = 'super'), 0) AS super_kg
    FROM delivery_grade_lines GROUP BY delivery_id
), d AS (
  SELECT r.id, r.weight_kg, l.factory_kg, l.super_kg,
         CASE WHEN r.provisional IS NOT NULL THEN 'provisional'
              WHEN r.status NOT IN ('collected', 'confirmed') THEN 'notDelivered'
              WHEN l.factory_kg IS NULL THEN 'ungraded'
              ELSE 'graded' END AS bucket
    FROM tea_collection_records r LEFT JOIN lines l ON l.delivery_id = r.id
   WHERE to_char(r.collection_date, 'YYYY-MM') = '2026-10'
)
SELECT count(*) FILTER (WHERE bucket = 'graded'),
       sum(factory_kg) FILTER (WHERE bucket = 'graded'),
       sum(weight_kg)  FILTER (WHERE bucket = 'graded'),
       count(*) FILTER (WHERE bucket = 'ungraded'),
       sum(weight_kg)  FILTER (WHERE bucket = 'ungraded'),
       count(*) FILTER (WHERE bucket = 'provisional')
  FROM d;
```

Results on the local DB, 2026-11-08:

| Month | SQL | Page |
|---|---|---|
| October 2026 | 104 graded · 5,736.7 kg factory · 5,867 kg estate · 9 ungraded (569 kg) · 0 provisional | identical |
| July 2026 | 110 graded · 5,391 kg · 5,477.5 kg · 0 ungraded · 1 provisional | identical |

**Before this change:**
- The page counted `confirmed` only, so it hid the 9 ungraded October deliveries and a graded-but-unconfirmed July delivery (188 kg).
- Ungraded deliveries fell back to estate weight.
- "YTD" was all-time.
- The trend mixed months from different years without a year label.
- The default was the latest month with data (a partial November).

## 9. Leaf Purchase Report (RPT-02, 2026-11-15)

**Renamed from "Revenue Reports".** The page shows what the factory owes and pays estate owners for
green leaf, which is a **cost**, not revenue.

- **Route:** `/reports/leaf-purchases`. `/reports/revenue` redirects there and keeps its query
  string (`RedirectWithQuery`).
- **Sidebar:** "Leaf Purchase Report".
- **Subtitle:** "What the factory owes and pays estate owners for green leaf."

**Service:** `GET /reports/leaf-purchases` → `LeafPurchaseService`, with every rule in
`leaf-purchase-rules.ts`.
- Deliveries are loaded through the Collection report's loaders and follow its rules (§2):
  - graded only
  - the current grade lines = the latest approved revision
  - provisional and not-delivered entries excluded
  - Colombo calendar days
- Period, filters and comparisons work as in §3–§4. Grouping is `estate | route | month`.

| Figure | Rule |
|---|---|
| **Leaf value (accrued)** | Σ over graded deliveries of Super kg × Super rate + Normal kg × Normal rate, using the version **in force on the delivery date** (`rateVersionFor`; Grade-Rates-Addendum). Each grade amount is rounded to 2 decimals. |
| No rate | A graded delivery dated before the first rate version gets no value. It is counted ("No rate") and never guessed. |
| Average price per kg | Leaf value ÷ factory kg of the valued deliveries; per grade, grade value ÷ grade kg. |
| **Settled** | The value of deliveries linked (`settlement_id`) to a **processed** settlement. |
| **Not yet settled** | Leaf value − settled, so Settled + Not yet settled = Accrued, always. |
| Payments (settled) | Processed settlements whose period falls in the range: gross (the settlement's own snapshot rates, i.e. what was paid), transport, fertilizer, advances, adjustment, net = gross − deductions + adjustment. `linked` is false while those settlements took none of the range's deliveries. |
| Trend | Monthly. A single-month period shows the 12 months ending with it. A month in progress is partial. |

**There is no settlement generator yet.** No delivery has `settlement_id` set, so today everything
reads "not yet settled". The 21 processed settlements are seeded snapshots whose kg and rates don't
match the deliveries. Card 4 shows them as what was paid, marked "not linked to deliveries".

**Checking against the database:** `REPORT_SQL_CHECK_URL=… npx jest leaf-purchase.sql`
(`REPORT_SQL_CHECK_MONTH` for another month).

```sql
WITH lines AS (
  SELECT delivery_id,
         coalesce(sum(weight_kg) FILTER (WHERE grade = 'super'), 0)  AS super_kg,
         coalesce(sum(weight_kg) FILTER (WHERE grade = 'normal'), 0) AS normal_kg
    FROM delivery_grade_lines GROUP BY delivery_id
), graded AS (
  SELECT r.id, l.super_kg, l.normal_kg,
         (SELECT g.id FROM grade_rates g WHERE g.effective_date <= r.collection_date
           ORDER BY g.effective_date DESC LIMIT 1) AS rate_id
    FROM tea_collection_records r JOIN lines l ON l.delivery_id = r.id
   WHERE r.status IN ('collected', 'confirmed') AND r.provisional IS NULL
     AND to_char(r.collection_date, 'YYYY-MM') = '2026-10'
)
SELECT sum(round(d.super_kg * g.super_rate, 2) + round(d.normal_kg * g.normal_rate, 2))
  FROM graded d JOIN grade_rates g ON g.id = d.rate_id;
```

Results on the local DB, 2026-11-15 (the page and the SQL agree exactly):

| Month | Graded | Factory kg | Leaf value |
|---|---|---|---|
| October 2026 | 104 | 5,736.7 | **Rs 798,201.50** (185/95 in force) |
| June 2026 | 118 | 6,668.4 | Rs 896,333.60 (180/92 in force) |
| November 2026 so far | 15 | 876.6 | Rs 121,320.00 |

The old page showed June as Rs 149,504: two seeded settlements, valued at their own snapshot rates.

### 9.1 The page

**URL** (`features/reports/leaf-purchase-view.ts`):
- `?month= | ?from=&to= | ?thisMonth=1`, plus `&route= &estate= &grade= &demo= &group=estate|route|month`.
- Defaults are left out of the URL, as on RPT-01. There is no agent filter: agents don't set what leaf costs.

**Cards** (each has an (i) with its rule):

| Card | Value | Below |
|---|---|---|
| Leaf value (accrued) | Σ value | change vs the previous period (with its base); vs the same period last year, or "No data last year" |
| Average price per kg | Rs/kg overall | Super and Normal Rs/kg; change vs the previous period |
| Settled vs not yet settled | not yet settled | settled; a link to Estate Owner Payments for the period's last month |
| Paid in settlements | net paid | gross − transport − fertilizer − advances (+ adjustments); "Not linked to these deliveries" when that applies |

The old duplicate "Month-over-month change" card is gone. A warning line shows when deliveries have
no grade rate.

**Charts:**
- **Leaf value and average price by month:** `ComboChartCard`, with bars for value (left axis) and a
  straight line for Rs/kg (right axis).
  - A single month shows the 12 months ending with it.
  - The month in progress is a lighter bar with a dashed, hollow line point.
  - Axes are sized to their rounded-up top tick (`axisWidth`), so labels never clip.
- **By route:** horizontal bars. Clicking a bar filters to that route.
- **Top 10 estates by leaf value:** horizontal bars, plus "View all", which groups the table by estate.
- **By grade:** a donut. Over 2 months, **Leaf value by grade and month** (stacked bars) is added;
  the month in progress is labelled "(so far)".

**Table:**
- **Grouping:** Group by Estate / Route / Month.
- **Columns:** factory kg, Super kg, Normal kg, leaf value, Rs/kg, settled, not yet settled, and change vs previous ("New" when the previous period had nothing).
- **Interaction:** sortable, with a totals row equal to the cards.
- **Clicks:**
  - An estate opens EST-10.
  - A route filters.
  - A month opens that month.

### 9.2 Export and print

These follow the same action-bar policy as §8.
- **Export Excel** works. It downloads a CSV named `leaf-purchases-<period>-<grouping>.csv`
  (`leafPurchaseCsv()`).
  - It contains every row of the current grouping plus the totals row.
  - A preamble gives the period, filters and valuation rule.
  - Rs have 2 decimals and kg 1 decimal, with no units, so Excel can sum them.
- **Print** works, using the shared print layout. A print-only line names the period and filters,
  and the table prints unpaged.
- **Export PDF, Schedule Report and Share Report** are disabled with "Coming soon".

**Tests:**
- Vitest: `leaf-purchase-view.test.ts` checks that the CSV equals the table and totals, and covers the URL round trip.
- Playwright: `e2e/leaf-purchase-report.spec.ts` checks that:
  - `/reports/revenue?…` redirects with its query
  - the partial month is labelled
  - print hides the chrome
  - the CSV equals the table and the card
  - the disabled actions say "Coming soon"

## 10. Expenses (RPT-03): see the Finance Reports addendum

What counts as an expense, a recovery from estate owners, a loan or an estimate is defined once in
`docs/specs/Finance-Reports-Addendum.md`. Both this report and the Expense report follow it.

- **Green leaf purchases** on the Expense report is this report's accrued value for the same period:
  the same number from the same loaders (`FinanceService`, 2026-11-15).
- **Transport and fertilizer deducted from estate owners are recoveries, not expenses.** The Expense
  report shows them, with advance installments, in its "Recovered from estate owners" panel (from
  processed settlements only), never in its total.

## 11. Future: Revenue (made-tea sales)

"Revenue" is kept free for a future module that records the factory's actual income: made-tea
sales (auction, private sales). None of that data is in the system yet. When it exists, a Revenue
report can set income against the Leaf Purchase Report's cost.
