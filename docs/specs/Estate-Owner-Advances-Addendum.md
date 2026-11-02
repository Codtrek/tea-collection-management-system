# Estate Owner Advances: Addendum (EST-05 / EST-06)

**Decided:** 2026-11-01
**Status:** §1–5 built (branch `fix/dispatch-fert-payroll`). The settlement generator itself is not built (§4.4).
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
  - **Status:** Pending deduction, Recovering or Deducted.
  - **Per-estate outstanding:** the sum of remaining balances.

  The list, the detail page and their totals all use it.
- **Process:** superseded by §4.3. It records what each settlement actually took, and an advance is Deducted only at Rs 0.

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

## 4. Repayment plans (built 2026-11-02)

### 4.1 One installment model for salary and estate advances
- **One module:** `backend/src/advances/installments.ts` holds the schedule, plan validation, last-installment remainder, carry-forward, remaining balance, one period's deductions, and the reschedule and early-repayment rules.
  - Salary advances call it through thin wrappers; their specs didn't change.
  - A parity spec shows the same inputs give the same results either way.
- **Only the source differs:** a payroll month versus a settlement period. Both are keyed by a label like "July 2026".
- **Portal pieces shared in `features/advances/`:** `RepaymentPlanFields`, `ScheduleTable`, `ReschedulesList`.

### 4.2 The plan
- **Issue form choices:**
  - **A:** one deduction from the next settlement (the default);
  - **B:** monthly installments, typed as an amount per period or a number of periods. Typing one fills in the other.
- **Start period:** defaults to the next calendar month; the officer can change it.
- **Validation (repeated on the server):**
  - the installment is at most the advance;
  - the plan runs at most `maxInstallmentMonths` periods (default 6);
  - the last installment takes the remainder.
- **Preview:** the schedule shows as you type ("Dec 2026: Rs. 10,000 · … · cleared Apr 2027").
- **Helper and warning:** once an estate is picked, the form shows its average settlement net over the last 3 processed periods. It warns, but doesn't block, when the installment is above `netWarnPct`% (default 50) of that average.
- **Settings:** `system_settings.estateAdvances` = `{deductionCapPct: 50, maxInstallmentMonths: 6, netWarnPct: 50, deductionOrder: ["transport","fertilizer","advances"]}`. 50% is a placeholder, not a confirmed rule.
- **Existing advances:** backfilled as one-deduction plans, starting at the settlement already set up for them: EADV-2026-0022 June 2026 (still recovered via SET-2026-06-003), EADV-2026-0028 and EADV-2026-0031 July 2026.

### 4.3 Deductions
- **Recovery rows:** every settlement period an advance was due in gets a row in `estate_advance_recoveries` (`kind` 'settlement', `period`, `planned_amount`, `amount`).
  - Planned − amount is carried forward, and the schedule extends.
  - Early repayments are rows with `kind` 'cash' or 'bank' and no period.
- **Status:** an advance is **Deducted only when its remaining balance reaches Rs 0**, Recovering while part-paid, Pending deduction before anything is taken.
- **Process today (no generator):** it splits the settlement's **stored** `advance_deduction` (what the owner actually had taken) across the estate's open advances:
  - due installments first, oldest advance first;
  - any excess pays down the oldest balances;
  - what isn't covered is carried forward;
  - an amount no open advance could take is noted in the audit row.

  Settlement amounts never change. This fixes the old bug where every pending advance was marked deducted.
- **For the generator:** `estates/settlement-deductions.ts` `planSettlementDeductions`. Each step takes what it's due, up to what's left, in the configured order:
  1. transport;
  2. fertilizer the owner chose to deduct from tea payment;
  3. advance installments, further limited to `deductionCapPct`% of gross.

  Signed adjustments are added to gross first. Net is never below Rs 0, and what couldn't be taken is carried forward.

### 4.4 Not built
- **The settlement generator:** settlements are still the seeded rows. When it's built, it calls `planSettlementDeductions` to set each row's advance deduction.

### 4.5 Changes after issue
- **Reschedule:** a new installment and/or start period for the remaining balance.
  - It needs approval by **someone other than the requester**; the server refuses a self-approval. A reason is required to reject.
  - A processed period never changes: a new plan must start after the last processed period.
  - Request and decision are audited (`estate_advance_reschedules`).
- **Early repayment:** cash or bank transfer, recorded by an officer with amount, date and reference.
  - It reduces the balance and so shortens the schedule.
  - It is limited to what no unprocessed period has reserved, and is audited.
- **Approval when issuing:** there is no approval step. Issuing pays out immediately (HighStakesConfirmFlow), so there is no issuer ≠ approver check.

### 4.6 Pages
- **List:** Plan ("Rs. 10,000 × 5" / "One deduction", from …), Recovered, Remaining, Next deduction (with any carried forward), and a status filter that includes Recovering.
- **Detail:** the full schedule (Planned / Deducted / Carried forward per settlement period, each linked to its settlement, or "not generated yet"), early repayments, reschedules (request, approve, reject) and Record repayment.
- **Outstanding on /estates and EST-10:**
  - **What it counts:** **unpaid fertilizer + remaining advances**, from the same selectors (`fertilizerOutstanding`, `estate-advance-balance.ts`).
  - **On screen:** /estates shows each part on hover; EST-10's panel lists Fertilizer and Advances.
  - **Filter:** the Outstanding Yes/No filter counts either part.

### 4.7 Inactive estates
- **Issuing:** refused on the server (409) and in the picker (§5).
- **Existing balances:** an inactive estate with an outstanding advance is flagged **"Outstanding: estate inactive"** in the advances list and on the advance page, and "Outstanding advance: estate inactive" on the estate page. There is no automatic write-off.

## 5. Estate owner picker (Issue Advance Payment)
- **Why some owners were missing:** the form filtered the list to Active estates in the browser. `GET /estates` already returned every estate with no limit, and the Combobox shows 50 at a time with a visible "show more", so nothing was silently capped.
- **List:** every estate owner, A–Z by estate name.
  - **Search:** typing filters by estate name, owner, EST- ID or route, anywhere, ignoring case.
  - **Each option:** estate name, then "owner · EST-ID · Route".
- **Inactive estates:** listed greyed with an "Inactive" badge and the tooltip "Inactive estates can't receive advances". They can't be picked by mouse or keyboard (`Combobox` `getDisabledReason`; `comboboxKey` skips them).
- **After picking:** the outstanding advance balance, a warning if an advance is already open, and the 3-period average net (`GET /estates/:id/advance-context`).
- **Pre-fill:** from an estate row's action (`?estate=EST-…`) still works.

## 6. Deduction order: what it was before
Before §4 there was no order. Net = gross − transport − fertilizer − advance + adjustment, every figure was stored, and nothing was capped. The order agreed for the planner is transport → fertilizer → advances (configurable).
