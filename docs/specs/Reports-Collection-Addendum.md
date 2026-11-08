# Reports: Collection Report RPT-01 (Addendum)

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
