# Estate Owner Advances: Addendum (EST-05 / EST-06)

**Decided:** 2026-11-01
**Status:** §1–3 built (branch `fix/dispatch-fert-payroll`); §4 reported, awaiting approval
**Amends:** EST-05 (the advances list) and EST-06 (Issue Advance Payment), and the sidebar's active-link rule.

## 1. Sidebar and permission

- **Finance order:** Estate Owner Payments → **Estate Owner Advances** (`/estates/advances`) → Payroll → Salary Advances. The URL is unchanged, so existing links still work.
- **Data-driven module `estateAdvances`:** it shows in Users & Roles as "Estate Owner Advances", and the link shows only to roles with `view` on it.
  - **Starting levels:** migration `2026-11-03-estate-advances.sql` seeds each role at its Estate Owner level: Administrator approve, Officer edit, Manager view. Nobody's access changed.
  - **Issue buttons:** every "Issue Advance" button needs `estateAdvances` `edit`. That covers the advances list, the `/estates` primary action and row action, and EST-03.
  - **Server:** it still keeps Managers read-only, as before.
- **Active link = the most specific match** (`components/layout/nav-match.ts` `activeNavTo`). The item that lights is the longest sidebar path the URL equals or sits under. So:
  - `/estates/advances/new` lights Estate Owner Advances, not Estate Owners;
  - `/estates/settlements/:id` lights Estate Owner Payments;
  - record pages (`/employees/EMP-…`, `/fertilizer/<batch>`) light their list's item.

  This replaced the old `end` list and the Agent Dispatch special case.
- **Breadcrumbs:** Home > Estate Owner Advances, then > New on the form.

## 2. Issue Advance flow

- **Where it starts:** "Issue Advance Payment" stays on `/estates` and on `/estates/advances`.
- **From an estate:** the row action on `/estates` and the EST-03 button pre-fill that estate (`?estate=EST-…`) in the shared searchable Combobox. If the pre-filled owner isn't Active, the field says so instead of showing a blank.
- **After submit:** the form goes to `/estates/advances?highlight=EADV-…`, and the new row is tinted.
- **Cancel:** goes back to wherever the form was opened from. A direct link with no in-app history falls back to the list.

## 3. List and detail pages

### Which settlement recovered what
- **Table:** `estate_advance_recoveries` (`advance_id`, `settlement_id`, `amount`, `recovered_at`), the same model as salary advances' `advance_recoveries`. One advance can be recovered across several settlements.
- **Migration:** `2026-11-03-estate-advance-recoveries.sql` backfills the one known link: EADV-2026-0022 → SET-2026-06-003, Rs 40,000.
  - **Seed gap:** Mount Rest's April 2026 settlement deducts Rs 25,000, but no advance row exists for it, so it isn't backfilled.
- **One shared selector** (`backend/src/estates/estate-advance-balance.ts`):
  - **Remaining** = amount − Σ recoveries, never below 0.
  - **Status:** Pending deduction, Partly deducted or Deducted.
  - **Per-estate outstanding:** the sum of remaining balances.

  The list, the detail page and their totals all use it.
- **Process:** where it already marks an estate's pending advances "deducted", it now also records a recovery for the **whole remaining balance** against that settlement. That is exactly what the old code already assumed. Which advances get marked, and every settlement amount, are unchanged. The real fix is §4.

### List (`/estates/advances`)
- **Filters (in the URL, run on the server):**
  - search (estate, owner, `EADV-` reference);
  - date issued: This month (default), Last month, Last 3 months, Custom;
  - route, status, issued by.
- **Pending deductions always show,** whatever the dates, the same as "Needs decision" on Salary Advances.
- **Summary:**

  | Tile | What it counts |
  |---|---|
  | Total issued | Advances issued in the range |
  | Pending deduction | Every remaining balance, any date. Clicking it filters to Pending deduction |
  | Total deducted | Recoveries by settlements processed in the range, by factory date |

  The search, route, status and issuer filters never change the totals.
- **Columns:** estate (owner · route), reference, amount, issued, issued by, status, deducted, remaining.
- **Rows:** clicking a row opens the detail page.

### Detail (`/estates/advances/:id`)
- **Facts:** estate (linked), owner, reason, amount, deducted, remaining. There is also a link to the owner's EST-10 timeline.
- **Deduction schedule:**
  - each processed settlement that recovered part of the advance, linked to the settlement page, with its period, date and amount;
  - then, while a balance remains, the estate's **pending** settlement that carries an advance deduction, shown as **Planned**.

## 4. Reported, not fixed (awaiting approval)

### 4.1 Outstanding on /estates doesn't include estate advances
- **/estates and EST-10:** the Outstanding column on /estates and EST-10's Outstanding panel both come from `fertilizerOutstanding()`, which counts **fertilizer only**. Green Valley's Rs 8,100 is unpaid fertilizer; its Rs 50,000 advance (EADV-2026-0031) isn't in that figure.
- **Settlements:** use each row's stored `advance_deduction`, which is a seeded number.
- **Advances page:** used only the status flag; it now uses the selector in §3.
- **Proposal:**
  - /estates, EST-10 and Settlements all read `estate-advance-balance.ts`;
  - /estates and EST-10 show **Owed to factory = fertilizer + advances**, with the two parts shown separately.

### 4.2 An advance larger than the month's net
- **Nothing calculates it.** No settlement generator exists; every settlement row, including its `advance_deduction`, comes from the seed. So no "net never below Rs 0" rule exists for estate owners.
  - **Example:** Green Valley's pending July row deducts Rs 50,000 and leaves Rs 10,905. A larger stored figure would make net negative.
- **Same bug as salary advances had:** Process marks **every** pending advance of the estate "deducted", whatever the settlement actually took.
  - **Example:** Mount Rest's July row deducts Rs 0. An advance issued today would still be marked deducted, in full, when July is processed.
- **Proposed fix (same rule as salary advances):**
  - this settlement's deduction = min(remaining, the net before advances);
  - record exactly that amount as a recovery;
  - the rest stays Pending deduction and carries forward to the next settlement;
  - net is never below Rs 0.
- **Open question:** does a cap (a % of gross, as with payroll's 50%) apply to estate owners too?

### 4.3 Installments
- **None today.** An advance is meant to come off the next settlement in one go.
- **Proposal:** reuse the salary-advance model:
  - `installment_amount` / `installment_months` / `start_period` on `estate_advances`;
  - the same plan validation and max-months setting;
  - `RepaymentPlanFields` on the Issue form;
  - optionally, a reschedule and a cash repayment recorded in the same recoveries table.
- **Depends on §4.2:** Process must calculate the deduction first. Not built.
