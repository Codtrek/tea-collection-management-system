# Settlement Generator — Addendum (EST-07 / EST-08)

**Decided:** 2026-11-16
**Status:** built on `feat/settlement-generator` (from `merge/pr4-reports-admin`). Local only; it becomes PR5 after PR1–PR4 are merged.
**Amends:** EST-07 (settlement list), EST-08 (process settlement) and the Settlement Period View Addendum §3 (the summary cards).
**Migration:** `1794400025000-SettlementGenerator` (structure only), mirrored at the end of `init.sql`.

## 1. Why

Settlements were seeded snapshots: kg, rates and deductions were typed into `seed.ts`.

- **They didn't match the deliveries.** Green Valley's July 2026 row had 583 kg against 408 kg delivered. Silver Peak had a settlement and no delivery.
- **They broke the advance cap.** Hilltop's July deductions were Rs. 47,500 of a Rs. 48,515 gross.
- **Most owners had none.** 36 owners delivered in July 2026 with no settlement at all.

Processing only flipped a status and split the stored figures. Settlements are now **calculated from the deliveries**, line by line, and the calculation is frozen when a settlement is processed.

## 2. The calculation

The calculation is the pure `generateSettlement` in `backend/src/estates/settlement-generator.ts`, tested in `settlement-generator.spec.ts`. It covers one estate for one month.

### 2.1 Which deliveries

| Delivery | What happens |
|---|---|
| Confirmed and past the grading OPEN window, dated in the month | **Paid** |
| Confirmed but still OPEN (`locked_at` in the future) | Listed and skipped. It rolls to the next month automatically. |
| Collected or Pending agent confirmation (at the factory, not graded) | Listed, and it **blocks the estate** until it is graded or a Manager excludes it with a reason |
| Excluded by a Manager for this month | Listed with the reason; it rolls to the next month |
| Excluded from an earlier month, now payable | Paid this month ("rolled in"), **at the rate of its own date** |
| Submitted / Approved / Agent assigned (no leaf yet) | Not a delivery; ignored |
| Already linked to a settlement | Never paid again |

### 2.2 Leaf lines

- **Pricing:** each paid delivery is priced at the grade rate **in force on its delivery date**, using `rateVersionFor`, the existing rule.
- **Grouping:** lines are grouped by rate period, e.g. "1–14 Jul: Super Rs. 185 × 320 kg, Normal Rs. 95 × 110 kg".
- **Where periods come from:** the live rate versions, so N rate changes in a month give N+1 periods.
- **Rolled-in deliveries** form their own group.
- **Gross leaf value** = Σ leaf lines. It is stored in `settlements.gross_amount`, because one row can span several rate periods and kg × one rate would be wrong.

### 2.3 Deductions, in order

Approved grading corrections (`settlement_adjustments`, ±) are applied first. Then each step takes **at most what is left**, in the configured order (`estateAdvances.deductionOrder`, default transport → fertilizer → advances).

| Step | Rule | Source shown on the line |
|---|---|---|
| **Transport** | <ul><li>The fixed monthly charge in force for the month, charged **once** if the estate has at least one paid delivery.</li><li>No deliveries means no charge.</li><li>Self-delivery estates are **exempt**.</li><li>Plus anything the estate's last processed settlement left owing.</li><li>**No version covering the month blocks processing**: transport is never deducted as Rs. 0 silently.</li></ul> | The fixed charge, the version's first month, carried in; or "Exempt" / "Not configured" |
| **Fertilizer** | <ul><li>Every outstanding "Deduct from tea payment" charge (legacy rows with no method count as deduct) delivered on or before the month's last day, **oldest first**.</li><li>Each charge is recovered **once and whole**, and the step stops at the first charge that doesn't fit; that charge and every later one carry forward.</li><li>Cash and bank charges in the month are listed for information only.</li></ul> | Charge ref, item, delivery date, kg × snapshot price, amount |
| **Advances** | <ul><li>The installments due (`dueAdvances`), capped at **`deductionCapPct` % of gross** (default 50%) and at what is left.</li><li>The rest is carried forward and the schedule extends.</li></ul> | Advance id, the installment, the cap |

**Flag:** a fertilizer charge delivered before the system's **first real month** shows "Check: possible seed data". The first real month is the month of the earliest live grade-rate version, when the factory first priced leaf in the system.

**Net payable** = gross + adjustments − deductions, **never below Rs. 0**. Every amount not taken is listed as carried forward.

**Why whole charges:** `fertilizer_charges.settlement_id` marks a charge recovered and every fertilizer balance reads it, so recovering a charge "once" means recovering all of it at once. Partial recovery would need a recovery table per charge; it is not built.

### 2.4 Excluded and blocked

| Kind | When | Effect |
|---|---|---|
| **Excluded** | Bank payout (`estates.payment_method = 'bank'`) with no account number | The draft is kept with "Bank payout, but no bank account number is on file", and it is never processed |
| **Blocked** | Ungraded deliveries | Until each one is graded or excluded |
| **Blocked** | No transport version for the month | Unless the estate is exempt |
| **Blocked** | No grade rate on a delivery's date | Until a rate covers it |
| **Blocked** | Corrections larger than the month's gross | Until the corrections are resolved |
| **Blocked** | An earlier month's draft for the estate is still pending | Until that draft is processed; months go in order |

## 3. Drafts, processing, the snapshot

The service is `SettlementGeneratorService`, tested in `settlement-generator.service.spec.ts`.

- **Prepare** (`POST /estates/settlements/prepare {month}`, Officer or Administrator):
  - Makes one draft per estate with payable deliveries, ids `SET-YYYY-MM-NNN`, the next free number.
  - Running it again **recalculates** the drafts.
  - A draft whose estate has nothing payable any more is removed.
  - It is audited.
- **Run** (`GET /estates/settlements/run?month=`, read-only):
  - Every estate's calculation as of now.
  - Why each one can or cannot go.
  - Whether a stored draft has changed since it was prepared.
  - The month's rate periods.
  - **The totals of the rows a Process run would take.**
- **Exclude** (`POST /estates/settlements/deliveries/:id/exclude {month, reason}`, Manager or Administrator; in the portal, `gradingApproval: approve`):
  - Leaves a delivery out of the month with a reason (at least 5 characters).
  - It is audited.
- **Process** (`POST /estates/settlements/process {month, expectedNet}`, Officer or Administrator), in **one transaction**:
  1. Recalculates.
  2. Refuses when `expectedNet` (the total the officer re-typed) no longer equals the run's net.
  3. Then, for every ready draft:
     - freezes the calculation (`settlements.calculation` + `frozenAt`) and the stored totals
     - links the paid deliveries (`settlement_id`)
     - rolls what the month left behind (OPEN or not yet collected) via automatic exclusions
     - applies the corrections
     - marks the fertilizer charges taken (`fertilizer_charges.settlement_id`)
     - writes `estate_advance_recoveries` (planned vs taken) and the advance status
     - freezes transport
     - audits it

**The snapshot:** `settlements.calculation` (JSONB) is the whole `SettlementCalculation`: every leaf line with its rates, the rate periods, each deduction line with its source, carried-forward amounts, not-eligible deliveries and the order used.

- **Frozen once processed.** A later rate version, price or setting never changes a processed settlement.
- **Tests:** this is checked in the calculator spec, the service spec, and live on a scratch database with a rate version back-dated into the month.

## 4. Legacy (seed)

- **Which rows:** the 4 seeded July 2026 settlements (`SET-2026-07-001…004`) are seeded with status **`legacy`** and a `legacy_reason`.
- **How they behave:**
  - They are read-only and never processed.
  - They are listed with a "Legacy (seed)" badge.
  - They are **never counted** in a period's figures.
  - They don't stop July being generated: the one-live-settlement index (`settlements_estate_period_live_key`) skips them.
- **Seeded history:** March–June 2026 and earlier rows stay as processed history.
- **No row is relabelled by a migration.** Whether the hosted database holds these seeded rows is answered by the Azure dump check, and any change there is a separate, explicit decision.

### July 2026, before and after

Local data, with transport set to a **test value** of Rs. 1,500 per estate (no real amount is decided).

| Estate | Seeded (Legacy): gross / deductions / net | Generated: gross → deductions → net | Ready? |
|---|---|---|---|
| Green Valley | 92,105 / 81,200 / 10,905 | 71,880 → transport 1,500 + fertilizer 8,100 (Sep 2025, flagged) + advance 35,940 (cap; 14,060 carried) → **26,340** | Blocked: GV-2026-0718 ungraded |
| Hilltop | 48,515 / 47,500 / 1,015 | 13,775 → transport 1,500 + advance 6,887.50 (cap; 23,112.50 carried) → **5,387.50** | Yes |
| Mount Rest | 50,360 / 15,200 / 35,160 | 15,580 → transport exempt + fertilizer 10,800 → **4,780** | Blocked: MR-2026-0717 not confirmed |
| Silver Peak | 17,760 / 7,600 / 10,160 | No delivery: no draft | — |
| 36 demo estates | none | 618,806 → transport 54,000 → 564,806 | Excluded: bank payout, no account |
| **Total** | **208,740 / 151,500 / 57,240** (4 owners) | **720,041 → 118,727.50 → 601,313.50** (39 drafts), 37,172.50 carried | |

With GV-2026-0718 and MR-2026-0717 excluded, three settlements process: net Rs. 36,507.50.

## 5. Pages

- **Settlements (EST-07):**
  - **Cards:**
    - "Prepared X / Y · Processed Z"
    - Gross leaf value
    - Deductions by type (transport, fertilizer, advances, ± adjustments)
    - Net payable
    - "Not yet prepared: N owners", which opens the list of estates without a draft, or waiting with the reason
  - **Prepare / Recalculate settlements for <month>**, with the number of estates.
  - **Generate Bank Payment File** stays disabled, "Coming soon".
- **Process (EST-08):**
  - **Rows:** one per estate, expanding into the full calculation (`SettlementCalculationView`).
  - **Warnings at the top:** transport not configured, drafts changed since prepared, estates not prepared, estates excluded with reasons, Legacy rows.
  - **A Manager** excludes an ungraded delivery from the expanded row.
  - **Totals row.**
- **Confirm popup** (`HighStakesConfirmFlow`):
  - **Contents:** period, estates included and excluded with reasons, the rate periods ("Super/Normal: Rs. 185/95 (1–14 Jul), Rs. 190/98 (15–31 Jul)"), leaf kg by grade, gross, adjustments, transport, fertilizer, advances recovered, carried forward, total net payable.
  - **Wording:** "Processing freezes these settlements and their calculations. This cannot be undone."
  - **Totals:** the popup and the totals row render the same component from the same totals.
  - **The re-type input** starts **empty** with the placeholder "Type the amount", and Process stays disabled until the amount matches, cents included. This applies to every use of the shared flow.
- **Settlement detail:** a generated settlement shows the **owner statement** and prints it on its own (A4, app chrome hidden).
  - **Contents:** factory letterhead, owner and payout (account masked to the last 4 digits), and the same breakdown from the frozen calculation.
  - **A draft** prints marked "Draft — not final".

## 6. Not built / open

- **Bank payment file:** not built.
- **Fertilizer:** recovered whole charges only (§2.3).
- **Transport amount:** the real figure isn't decided. No real version is published anywhere; specs and scratch databases use test values.
- **Leaf Purchase report:** it still counts "Collected" deliveries that have grade lines (July shows Rs. 754,821 there against the generator's Rs. 720,041). Aligning it with the settlement rule is a follow-up.
- **Settings screen:** the cap, order and first real month aren't editable on screen yet; the settings screen comes after the generator.
