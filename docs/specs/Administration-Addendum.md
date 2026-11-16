# Administration: Factory Setup, Item Prices, Pay Rates and pay changes (Addendum)

Status: implemented on `feat/factory-setup-pay-rates` · 2026-11-15

## Why this addendum

Factory Setup (ADM-01) was half stub:
- General Info, Transport Rates and Beneficiary Item Types saved nothing.
- One page-level "Save Changes" was a fake.
- Spec references leaked into the screens.

There was also no single place for what estate owners are charged for items, and pay had no
history: editing an employee's rates overwrote them. This addendum makes every money rate
**effective-dated**, adds **Item Prices** and **Pay Rates**, and adds an approved **pay change** flow.

Related:
- `Grade-Rates-Addendum.md` (grade rates)
- `Finance-Reports-Addendum.md` (wages in the Expense report)
- `Fertilizer-Delivery-Addendum.md` §2 (price snapshot at approval)

## 1. One rule for every money rate

Grade rates, transport rates, item prices and pay rates all follow `backend/src/admin/versioning.ts`:

- **Dated:** a version applies from its effective date until the next one. Versions are inserted, never edited, so a past calculation never changes.
- **Never in the past:** a new version starts today or later.
- **One per date:** only one live version per date.
- **A real change:** never identical to the version it follows ("nothing would change").
- **A reason** is required, and the change is audited old → new.
- **Cancellable before it starts:** a scheduled version (starting after today) can be cancelled with a reason. It is kept, marked cancelled, audited, and ignored from then on. The uniqueness of dates covers live versions only, so a cancelled date can be reused.

## 2. Factory Setup and System Settings

**Every tab saves or publishes on its own.** There is no page-level save. Switching tabs, or leaving
the page, with unsaved changes asks first (react-router `useBlocker` + `beforeunload`).

| Factory Setup (business data) | Contents |
|---|---|
| General Info | Factory name, registration no., address, contact, email; **bank account** (bank, branch, account name, account number). Logo: "Coming soon (file storage)" |
| Grade Rates | Super / Normal Rs per kg, versioned (§3) |
| Transport Rates | One versioned monthly transport charge per estate (§4) |
| Item Prices | Selling prices for items given to estate owners (§5) |
| Pay Rates | Role rates, overrides, history, pay changes (§6–8) |
| Expense Categories | Daily expense categories (Finance-Reports-Addendum §6) |

| System Settings (behaviour) | Contents |
|---|---|
| Notifications | Per-event toggles, default channel |
| Session & security | Session timeout, password policy |
| Payroll rules | **Standard hours per day** (8); **minimum daily pay** for factory and for office (blank = not entered) |
| Daily expense entries | Edit window (days) |

**Settings with no screen yet** (in `system_settings`, changed in the database today):
- `collection`: usual range, correction window, mismatch tolerance
- `attendance.editWindowDays`
- `fertilizer`: manager approval above kg, max delivery attempts
- `estateAdvances`: cap %, months, warn %, deduction order
- `payroll`: advance deduction cap %, max installment months
- `dispatch`: shift start, cover timeout
- `holidays.weekStartsOn`, which is edited on the Holiday Calendar page

**Proposal (not done):** surface these in System Settings, grouped by module, with the same Save.

**The bank account** is stored in `system_settings.factoryProfile`:
- It is read and written only through `GET` / `PUT /admin/factory-profile`, Administrator only.
- It is kept out of the generic settings map.
- The API never returns more than the last 4 digits (`••••1234`), and the audit log shows the masked form too.
- Changing the number means typing it in full; leaving the field empty keeps the number on record.

## 3. Grade rates

- **Which rate applies.** The backend values a delivery at the version whose effective date is on or before the **delivery date** (`rateVersionFor`). Values are worked out when reports and settlements are produced, not stored on the delivery. So a version starting **today** prices every delivery dated today, including ones recorded before publishing.
- **On the page:**
  - The date defaults to **tomorrow**.
  - Choosing today shows that warning.
  - The confirm modal shows the effective date, old → new rates and the reason.
- **Cancelled versions** are ignored by the Leaf Purchase and Expense reports.
- **Schema:** `grade_rates` gains `reason`, `cancelled_at`, `cancelled_by` and `cancel_reason`, with a partial unique index on live dates.

## 4. Transport: a fixed monthly charge per estate

**Decided 2026-11-15:** transport is a **fixed amount per month, the same for every estate**.

**Before:**
- No transport formula existed anywhere; `settlements.transport_cost` held seeded numbers.
- The old tab's "Rs 42 per km, minimum Rs 500" were never saved or charged.
- Until the method was decided, settlement processing refused estates that pay transport ("Transport: not configured").

**The setting (Factory Setup → Transport Rates):**
- One versioned value, **"Monthly transport charge per estate (Rs)"**, with a reason; audited old → new.
- It **charges from a month**. The page picks a month and stores its 1st. In general a version applies from the first month that starts on or after its effective date, so there are no mid-month splits.
- Statuses are the usual Scheduled / Current / past / cancelled. A scheduled version can be cancelled before it starts.
- **Preview before publishing:** "Last month (October 2026) this would have charged N estates, total Rs Y" (`GET /admin/transport-rates/preview?amount=`): estates with at least one confirmed delivery last month, self-delivery left out.
- **The one exception to "never in the past":** while no monthly charge has ever been published, the **first** may start from a past month, no earlier than the earliest month with unprocessed settlements, so the settlements already waiting can be processed. It is labelled "First version, back-dated" in history and in the audit line. Every later version starts next month or later.
- `transport_rates.basis` keeps `per_km` / `per_kg` for the future; the page offers only the monthly charge (`fixed_month`).
- The seeded 42/km row is kept in history, cancelled and marked **Never applied** (`never_applied`).

**The charge (`admin/transport-rules.ts`, `estates/settlement-transport.ts`):**
- An estate is charged **once** for a settlement month in which it has **at least one confirmed delivery**, however many deliveries.
- **No deliveries = no charge.** **Self-delivery estates are exempt** (`estates.self_delivery`).
- The version used is the one covering that month.
- **Due** = the month's charge + whatever was carried out of the estate's last processed settlement.
- **Order:** adjustments, transport, fertilizer, advances. While fertilizer and advance deductions are still stored figures (no settlement generator yet), they can't shrink, so transport is the step that gives way. It takes at most gross + adjustment − those deductions, so net never goes below Rs 0. What isn't taken is **carried forward** to the estate's next settlement.

**Processing (`processSettlements`):**
- Blocked with "Transport: not configured. No monthly transport charge covers <Month>…" until a version covers the month. Self-delivery estates still process.
- **Frozen at processing:** `settlements.transport_status` (charged / exempt / no_deliveries), `transport_charge`, `transport_version_id`, `transport_carried_in`, `transport_carried_out`, and `transport_cost` = what was taken. A later version never changes a processed settlement.
- Settlements processed before this have no transport line (`transport_status` NULL); they show their stored figure and carry nothing.

**What the pages show:**
- Pending settlements work the line out live, on the list, the process page and the detail page:
  - "Transport (fixed monthly) Rs X — version effective <Month>"
  - "exempt (self-delivery)"
  - "no deliveries this month, no charge"
  - "Not configured"
- A carry-forward note is added in or out when there is one (`features/estates/transport-line.ts`).

**Checked on a copy of local `tea_dev` (2026-11-15):**
- Before: not configured. Processing July was refused for the 2 estates that pay transport.
- Back-dating the first version to June was refused, because the earliest unprocessed month is July. Rs 5,000 from July 2026 was accepted.
- A second back-dated version was refused.
- July lines: Green Valley and Hilltop charged Rs 5,000; Mount Rest exempt; Silver Peak no deliveries (missing bank, so not processed).
- After processing, the lines were frozen. A December version (Rs 9,000) left them unchanged.
- The preview for October 2026: 36 estates, Rs 180,000 at Rs 5,000.

**Known gap:** the estate page's Payments tab (EST-03 lifetime) still shows a pending settlement's stored seeded transport figure. The settlement pages show the live line.

## 5. Item Prices

**One price source:** `fertilizer_item_prices`, for fertilizer and other items given to estate owners. It used to show on System Settings.
- **Price per unit:** the price is per kg, or per **bag of N kg** (`unit`, `bag_size_kg`, `price_per_unit`).
- **Snapshot:** `rate_per_kg` is the derived per-kg price. A request snapshots it **when approved**, so approved requests keep their price and a cancelled scheduled price never applies.
- **Purchase cost, for information:** the weighted average Rs per kg of costed stock-ins (`stock_movements.unit_cost`, kg batches) in the last 90 days, with "Selling below cost" when the price is lower. No stock-in has a cost yet, so the page says "No purchase cost recorded yet".
- **Permission `itemPrices`:** Administrator sets prices; Officer and Manager view them (Fertilizer → Item Prices, read-only).
- **API:** `GET /fertilizer/prices`, `GET /fertilizer/prices/costs`, `POST /fertilizer/prices`, `POST /fertilizer/prices/:id/cancel`.

## 6. Pay history

**How payroll got pay before:**
- Each employee had four **hourly** rates (day, day-OT, night, night-OT) on their record.
- Payroll multiplied the month's attendance hours by the *current* rates.
- Registration and edits overwrote them.
- This applied to factory and office staff alike.

That model is kept (your choice); it now has history.

**`pay_rates`:**
- The 4 hourly rates, effective-dated, for a **role** (the default) or one **employee** (an override).
- Inserted, never edited.
- `source`: migration | registration | adjustment.

**Resolution (`pay-resolution.ts`):** an employee's pay on a date is their **override** in force that day, otherwise their **role's** rate in force that day.

**Payroll and the Expense report's wage estimate:**
- Both price **each attendance day** at the rates in force that day (`grossByDay`).
- Processed payroll keeps its snapshot and is never recalculated.
- `employees.*_rate` stays as a cache of today's pay.

**Migration:**
- Each role's most common rate set became its default.
- An employee who differed got an override.
- Everything is effective 2019-01-01.
- On local `tea_dev` the result was 5 role rates and 0 overrides; every employee matched their role.
- All 48 employee-months price exactly as before (opt-in `pay-history.sql.spec`).

**Screens:**
- Registration starts the history: an override from the hire date, unless the rates equal the role rate.
- The edit form shows pay read-only, and the API refuses a silent rate change.
- Pay Rates (Factory Setup tab, and People → Pay Rates): each role with its rate in force, the next change, and who is on the role rate vs their own rate; each role opens its history.
- The employee page has a **Pay** tab.

**Permission `payRates`:** Administrator approve; Manager edit (prepares changes); Officer none.

## 7. Payroll rules (System Settings)

- **Standard hours per day,** default 8. A day's pay = day rate × these hours.
- **Minimum daily pay** per category (factory: Wages Board; office: Shop & Office Act). It is **blank until entered**: pay changes are then not checked against it, and the preview says "No minimum set — not checked". Figures are never guessed.

## 8. Pay changes (prepare → approve)

**Preparing (the Manager, `payRates: edit`)** at `/employees/pay-rates/change`, or "Change pay" on an employee:
1. **Who:** all active employees, a role, or selected employees.
2. **Change:**
   - an increase or decrease, by **%** or a **fixed Rs per hour**, on all 4 rates
   - optional rounding to Rs 10 or Rs 50
   - a rate of Rs 0, meaning not paid by the hour (collection agents), is left alone
3. **Effective date:**
   - today or later
   - **never in or before a month whose payroll is processed** for any of them
4. **Preview** (server-computed, `pay-adjustment-rules.ts`):
   - one row per employee: current → new rates, a day's pay, own rate vs role rate, and the monthly cost change (Δrates × their hours last month)
   - the total at the bottom
   - anyone who would fall **below the minimum** is listed and blocks the change
   - a **decrease** shows "Reducing an employee's pay usually needs their written agreement. Confirm this has been obtained." with a required checkbox
5. **Reason → send for approval.** Nothing applies yet.

**Approval (the Administrator, `payRates: approve`):**
- **Who can decide:** nobody approves a change they prepared, or one that **includes themselves** (the advance rule: requester, or same NIC).
- **Confirming:** approval goes through `HighStakesConfirmFlow`, re-typing the monthly cost change. A rejection needs a reason.
- **Re-checked at approval:** the rules run again on that day's data, so a month processed meanwhile, a minimum entered meanwhile, or a date that has passed refuses it.
- **What gets written:**
  - Approval writes `pay_rates`.
  - A role-wide change moves the role rate once and gives each person on their own rate a new override.
  - A change for selected people gives each of them an override.
- **Audit:** request, approval and rejection are all audited.
- **Schema:** `pay_adjustments` + `pay_adjustment_lines` (old → new rates, hours basis, monthly change).

## 9. Beneficiary Item Types (removed 2026-11-16)

- The tab was a hard-coded list (Rice, Dhal, Flour) that **nothing read**. It has been removed, together with its list.
- Beneficiary items stay where they really live: `fertilizer_batches.category = 'Beneficiary'` (today only **Rice**, 1 batch).
- They are requested through the fertilizer request flow and priced on **Item Prices** (§5).

## 10. Migrations (local `tea_dev` only; mirrored in `init.sql`)

`2026-11-15-factory-setup.sql`, `-item-prices.sql`, `-pay-rates.sql`, `-pay-adjustments.sql`, `-transport-monthly.sql`.
