# Collection — Grading Corrections & Estate Owner Notification (Addendum)

Status: implemented · 2026-10-16 · Branch `feature/grading-corrections` (from `feature/agent-dispatch`; `origin/dev` not merged)

This is an **addendum** to the Collection specs (COL-01..04) and to
`Collection-Agent-Dispatch-Addendum.md` §7/§8. Only the delta is described. Reused components:
`LightConfirmModal` (review step, approve/reject), `HighStakesConfirmFlow` (money-moving approval),
`StatusBadge`. Colors come only from the central tokens.

Unchanged and not reopened: grading is **factory-side only**; one grade line per grade per delivery;
the delivery total is the **sum of its lines** (single server mapper `weightSummary`, single portal
selector); the **estate (collected) weight stays a separate field** and is never overwritten; permissions
are data-driven; every mutation is audited; **no SMS / OTP** — owners are told through the in-app
notification mechanism.

## 1. Principles

1. **No silent edits.** Every change to a graded delivery is a new, append-only *revision* (who, when,
   why, who approved). `delivery_grade_lines` stays the *current* projection so existing readers work.
2. **The lock moment is a snapshot.** `locked_at = graded_at + correction window *as it was when graded*`.
   Changing the setting later never re-opens or re-locks an already-graded delivery.
3. **Money never moves backwards.** A correction on a paid delivery becomes a signed *settlement
   adjustment* carried into the next settlement; the paid settlement row is not touched.
4. **Separation of duties.** The person who grades is not the person who approves, and the
   Administrator audits.
5. **Held, then sent once.** The owner is told only after the grading can no longer change cheaply.

## 2. Delivery states (derived on read — no cron flips a flag)

| State | When | Who can change grades | How |
|---|---|---|---|
| *(ungraded)* | status `Collected`, no lines | `grading` edit | **Grade Delivery** (first save confirms the record) |
| **OPEN** | graded, `now < locked_at`, not settled | any user with `grading` edit — not only the original grader | edit directly, **reason required**, new revision (`open_edit`) |
| **LOCKED** | `now ≥ locked_at` (window ended) **or** the officer clicked **Finalize** | nobody directly | **correction request** → Manager approves |
| **SETTLED** | `settlement_id` set (paid by a processed settlement) | nobody directly | correction request → Manager approves → **settlement adjustment** |

- `status` stays `confirmed` from the first grading on (reports, lists and the status chain are unchanged).
- A `confirmed` row with no `locked_at` (graded before this feature) is **LOCKED**.
- Finalize sets `finalized_at = now` and pulls `locked_at` forward to now.
- Open edits do **not** extend `locked_at`.
- Delivery detail shows a state badge (`Open · locks 10:30` / `Locked` / `Settled · SET-…`) and
  "Revised N times".

## 3. Prevention (before anything is saved)

Grade Delivery / Edit grading / Request correction share one two-step dialog:

1. **Enter** Super and/or Normal kg (blank = no line). Zero, negative and non-numeric values and more than
   2 decimals **block** the Review button (with an inline error) — they are not silently dropped.
2. **Review** (`LightConfirmModal`, button "Back" returns): estate weight, each grade line, factory total,
   difference (kg and %), the reason (when required), and — for edits — the current values.
   *Warnings that do not block:*
   - factory total differs from the estate weight by more than the **tolerance** (also what raises the
     weight-mismatch complaint);
   - total is far outside the estate's usual delivery size (outside `median × usualRangeLow..High` of its
     last up-to-10 graded deliveries; needs ≥ 3 prior deliveries, otherwise no warning).

Both thresholds, and the window length, come from `system_settings.collection` (read by
`CollectionSettingsService`, defaults in code), exposed to the dialog by `GET /collections/:id/grading-context`:

```json
{ "correctionWindowMin": 30, "mismatchTolerancePct": 5, "usualRangeLow": 0.5, "usualRangeHigh": 2 }
```

The weight-mismatch complaint now follows the *current* grading: refreshed by an open edit/correction,
and marked `resolved` when a fix brings the total back within tolerance.

## 4. Corrections after locking

1. An Officer (`grading` edit) submits a **correction request**: the new lines + a required reason
   (≥ 3 characters). Allowed only while LOCKED or SETTLED; one pending request per delivery; identical
   values are refused. Nothing changes yet.
2. A Manager (`gradingApproval` approve) **approves or rejects** (a rejection needs a note).
3. **Approve (LOCKED):** the lines are updated and a new revision (`correction`) records old → new,
   the requester, the reason and the approver. The earlier revisions are untouched.
4. **Approve (SETTLED):** as above, **plus** a pending `settlement_adjustment` (§5). The portal uses
   `HighStakesConfirmFlow` (re-type the amount) because it affects money.
5. The previous "Flag for Correction" is replaced by this flow.

Delivery detail shows the pending request (with the money impact for a settled delivery) and the full
**grading history** — each revision with a diff against the one before.

### Permissions (data-driven, ADM-02 — two new module keys)

The `approve` tier implies `edit`, so approval is its own module; otherwise a Manager able to approve
could also grade.

| Action | Module · level | Default |
|---|---|---|
| See grading, revisions, requests | `grading` view | Administrator, Officer, Manager |
| Grade, edit while OPEN, Finalize, request a correction, resend a failed notice | `grading` edit | **Officer** |
| Approve / reject a correction (incl. settled) | `gradingApproval` approve | **Manager** |
| View audit | `administration` (unchanged) | Administrator |

The Administrator row is pinned to full access on every module **except** `grading` and
`gradingApproval` (server: `ADMIN_EDITABLE_MODULES`; ADM-02 enables those two cells). This supersedes
Dispatch Addendum §7/§8 ("Administrator, Officer" may grade) — an Administrator can no longer grade by
default.

## 5. Settlement — what existed, and what changed

**What existed.** A settlement row is one estate × one period (free text, e.g. `July 2026`) holding
snapshot totals — `super_kg`, `normal_kg`, `super_rate`, `normal_rate`, deductions. It referenced **no
delivery and no grade line**, and nothing in the app generates settlements (`computeGross` is unused;
rows come from the seed). Rates are the ADM-01 version effective on the date and are copied onto the row.
Net was computed in several places from those numbers.

**What changed.**
- `tea_collection_records.settlement_id` — set when a settlement is **processed**, for that estate's
  confirmed, unpaid deliveries whose month matches the settlement period (`labelToKey(period)`).
- **OPEN deliveries are skipped** by that linking (single gate: `payableDeliveries` → `isPayable`,
  i.e. LOCKED or SETTLED only). A skipped delivery stays unlinked; the audit entry for the run counts
  how many were not included.
- `settlements.adjustment_amount` (signed) and `settlement_adjustments`: an approved correction on a
  SETTLED delivery stores `Δ Super kg`, `Δ Normal kg`, the **paying settlement's rates** and
  `amount_rs = ΔSuper × superRate + ΔNormal × normalRate`. At the next processed run for that estate,
  pending adjustments are summed into `adjustment_amount` and marked applied.
- Net payable = gross − transport − fertilizer − advance **+ adjustment** (one backend helper
  `settlementNet`, and the portal's `netPayable`). Pending settlements preview the adjustment they will carry.

**Cases where a correction would change an already-paid amount — flagged, and how each is handled**

| Case | Handling |
|---|---|
| Delivery paid in a processed settlement | Never rewritten. Signed adjustment carried forward; settlement row byte-identical (tested). |
| The delivery's paying settlement row cannot be found | Approval refused (409) — no half-applied correction. |
| Seeded settlements whose kg totals are not derived from deliveries | The adjustment is a **delta** priced at the settlement's own rates, so it stays correct regardless. |
| Estate has no later settlement to receive the adjustment | Stays `pending` and shows on the pending-settlement preview until one is processed. |
| A delivery graded just before a run, still OPEN | Not linked / not paid in that run. **Gap:** because there is no settlement generator and settlement `period` is free text, it is not automatically picked up by a later run for the same month — it stays unlinked until a generator or a manual settlement covers it. |
| Reports (RPT-02 revenue = Σ gross of processed settlements) | Unchanged — adjustments are not added to "revenue"; only to estate net payable. |

Volume figures (estate directory / lifetime kg, quality trend, RPT-01 collection report) count every
confirmed delivery including OPEN ones; they are not payment calculations.

## 6. Estate owner notification

**Content** (neutral, no accusation):

> The factory received 150 kg from Green Valley Estate on 2026-08-10: 100 kg Super, 50 kg Normal.
> Delivery GV-2026-0001; estate weight 150 kg.

If the factory total differs from the estate weight by more than the tolerance, one more neutral sentence
names both numbers ("The estate recorded 120 kg and the factory recorded 100 kg; both figures are on
file."). It is rendered from the **current** values when sent.

**Timing — held, not instant.**
- Queued in the **same transaction** as the first grading (`grading_notifications`, `send_after = locked_at`).
- Released when the window ends, **or at Finalize**, whichever is first. An edit during the window changes
  nothing in the queue — the notice simply uses the latest values.
- A correction approved **after it was sent** queues a separate notice labelled **Correction**
  (`Before: … — Now: …`); the original is never edited or deleted. A correction approved *before* the
  original left needs no second notice.
- A voided delivery cancels a queued notice (`cancelQueued`; there is no delivery-cancel flow in the
  product yet, so nothing calls it today beyond a graded-to-nothing record).

**Reliability.**
- Stored in Postgres, so it **survives a restart**; a `sending` claim older than 5 minutes is released.
- **Idempotent:** `grading_notifications.dedupe_key` (`graded:<delivery>`, `correction:<request>`) is
  UNIQUE, and the in-app row carries the same key (`notifications.dedupe_key`, UNIQUE) — a retry after a
  crash between "stored" and "marked sent" does not create a second notice.
- **Safe on several instances:** a minute cron claims rows with a compare-and-swap `queued → sending`.
- Never releases a graded notice while the delivery is still OPEN, even if `send_after` has passed.
- Mechanism: no queue library exists (no BullMQ, Redis is optional locally), so this is a small Postgres
  outbox swept by `@nestjs/schedule`, the same facility the dispatch jobs use.

**Status on the delivery detail:** Queued · Sent · Correction sent · Failed · Cancelled. A Factory Officer
(`grading` edit) can **Resend** a failed notice.

**Delivery channel — report of what exists.** Notifications are the existing `notifications` table plus a
best-effort Expo push to registered `device_push_tokens`. Estate owners have `users` rows
(`tea_estate_owners.user_id`) but **no login, no push-token registration and no per-owner
preference/channel setting**; the global `defaultChannel: in-app` setting is not read by the backend.
So today "Sent" means *stored for the owner's account (and pushed if a token exists)*; the owner sees it
once the mobile owner app exists. There is no SMS/OTP, by decision. A missing owner account marks the
notice **Failed** with the reason.

## 7. API (all JWT-guarded; permissions checked from the matrix)

| Method & path | Needs |
|---|---|
| `PUT /collections/:id/grade-lines` `{lines, reason?}` — first grading, or an edit while OPEN (reason required) | `grading` edit |
| `POST /collections/:id/finalize` | `grading` edit |
| `GET /collections/:id/grading-context` · `/revisions` · `/corrections` | any signed-in factory user |
| `POST /collections/:id/corrections` `{lines, reason}` | `grading` edit |
| `POST /collections/corrections/:requestId/approve` `{note?}` / `/reject` `{note}` | `gradingApproval` approve |
| `POST /collections/:id/notification/resend` | `grading` edit |
| `GET /collections/:id` now also returns `gradingState`, `lockedAt`, `settlementId`, `revisionCount`, `pendingCorrectionId`, `notificationStatus` | — |

`POST /collections/:id/flag` is removed.

## 8. Data

Migration `database/migrations/2026-10-16-grading-corrections.sql` (idempotent, mirrored into `init.sql`):
`tea_collection_records` + `graded_at`, `locked_at`, `finalized_at`, `settlement_id`;
`settlements.adjustment_amount`; tables `delivery_grade_revisions`, `grade_correction_requests`,
`settlement_adjustments`, `grading_notifications`; `notifications.dedupe_key` and two new types
(`delivery_graded`, `grade_correction`); permission rows for `grading` / `gradingApproval`; the
`collection` settings row. Timestamps on the new columns are `TIMESTAMPTZ`.

## 9. Out of scope / known limits

- A settlement generator (and a structured settlement period) — see §5 gap.
- Owner login, device registration, notification preferences and an owner-facing inbox.
- A resolve/close workflow for weight-mismatch complaints (a fix inside the window or an approved
  correction auto-resolves the complaint; nothing else closes one).
- Per-factory settings: `system_settings` is global (the system is single-factory today).
