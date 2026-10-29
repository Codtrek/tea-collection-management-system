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
