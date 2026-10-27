# Fertilizer — Request, Approval and Delivery on the Route Stop (Addendum)

Status: implemented on `feature/fertilizer-delivery` · 2026-10-22 · origin/dev NOT merged

This is an **addendum**. It extends the Fertilizer screens FERT-01 (stock position), FERT-02
(stock movement), FERT-05 (request queue), FERT-06 (request detail) and FERT-07 (log a
phoned-in request) with an end-to-end delivery flow. It depends on
`Route-Schedule-Addendum.md` (`nextCollectionDay`) and `Collection-Agent-Dispatch-Addendum.md`
(`getAgentForRoute`). Where this file amends a screen, only the delta is described.

> **Reconcile note.** The FERT-01..08 source documents were not in `docs/specs/` when this was
> written, so it was reconciled against the shipped FERT code and `Claude.md`. When those files
> are added, diff them against §10 and record any differences here.

Reused components: `StatusBadge`, `DataTable`, `LightConfirmModal`, `AlertList`. Colours come
only from the token config; no new badge tones.

---

## 1. Principles (already decided — not reopened here)

1. **Fertilizer delivery is a flag on the agent's normal route stop.** It is not a separate
   trip or workflow.
2. **Requests go to the estate's route.** `getAgentForRoute(route, date)` picks the agent,
   active cover included. Each estate belongs to exactly one route.
3. **No OTP/SMS.** Proof of delivery is a photo plus the owner's name and confirm tap on the
   agent's phone.
4. **Owners have no login or app yet.** Owner notices go through an outbox. Without a
   registered device, a notice is stored for the owner and shown as "Stored, not delivered".
5. **Permissions are data-driven, and every mutation is audited** (module `Fertilizer`).
6. **One source per figure:**

   | Figure | Only source |
   |---|---|
   | Stock (On Hand / Committed / Available) | `FertilizerService.listPositions` |
   | Status changes | `fertilizer-flow.ts` + `moveTo()` |
   | Fertilizer balance | `fertilizer-balance.ts` (`fertilizerOutstanding`) |

## 2. Data model

| Table | Purpose |
|---|---|
| `fertilizer_requests` (extended) | New columns: `order_ref`, `route_id`, `payment_method` (`deduct` \| `cash` \| `bank`), `decision_reason`, `rate_per_kg` + `price_id` (approval-time snapshot), `delivered_qty_kg`, `cycle_failures`, `manager_decided_by`/`_on`, `updated_at`. `status` widened to `VARCHAR(30)` with the §3 values. |
| `fertilizer_item_prices` | Effective-dated Rs./kg per item, set by the Administrator. `UNIQUE(item, effective_date)`. Past versions are never edited. |
| `fertilizer_allocations` | FEFO commitment: `request_id`, `batch_id`, `qty_kg`, `state` (`active` \| `picked` \| `released`). **Committed = Σ active.** |
| `fertilizer_deliveries` | One row per delivery attempt, i.e. the stop flag: `attempt_no`, `estate_id`, `route_id`, `scheduled_date`. Pickup fields: handover qty/by/at, agent-confirm qty/at, `pickup_mismatch`. Then out-for-delivery time and outcome (`delivered` \| `partial` \| `failed`). Delivery fields: delivered qty, shortfall reason, owner name + device confirm time, `photos` JSONB, fail reason + note, device `recorded_at`. Finally check-in qty/by/at and `cancelled_at`. `outcome_sync_key` and `pickup_sync_key` are UNIQUE. |
| `fertilizer_request_events` | The timeline: who, role, what, from → to, why, server time and device time. Append-only. |
| `fertilizer_charges` (extended) | `stock_movement_id` is now nullable. New `delivery_id` (UNIQUE) and `payment_method`. One charge per delivery = delivered qty × snapshot rate. |
| `fertilizer_payments` | Cash and bank payments: amount, date, method, reference (required for bank), recorded_by. |
| `fertilizer_notifications` | Owner-notice outbox, same claim/sweep/dedupe design as `grading_notifications`, plus `device_delivered`. |

Other changes:
- `notifications.type` gains `fertilizer_update`.
- `system_settings.fertilizer = {managerApprovalAboveKg: 500, maxDeliveryAttempts: 3}`.

Migration: `database/migrations/2026-10-22-fertilizer-delivery.sql`. It is idempotent, runs in
one transaction, is mirrored in `init.sql`, and must be applied **after** the route-schedule
migration.

### 2.1 Legacy rows (migration)

Row counts at the time of writing: Submitted 4, Approved 5, Dispatched 1, Rejected 1.

| Old status | New |
|---|---|
| Submitted | Requested |
| Dispatched, Deducted | Delivered (`delivered_qty_kg` = `dispatched_qty_kg`) |
| Partially Dispatched | Delivered for the dispatched qty; the remaining commitment is released (never Picked up, which would mean phantom stock in transit) |
| Approved | FEFO-allocated from live stock. Whatever can't be allocated → **Needs review** with "No live stock at migration". Committed counts only what was allocated. No owner notice. |
| Rejected / Cancelled | unchanged |

Legacy approvals have no price snapshot because prices didn't exist yet. They are priced the
first time they are dispatched (Mark ready / Retry), and that is logged in the timeline.

## 3. Statuses

```
Requested ─▶ Approved | Partially approved | Rejected                       (Factory Officer)
          └▶ Awaiting manager approval ─▶ Approved | Partially approved | Rejected  (Factory Manager)
Approved / Partially approved ─▶ Ready for dispatch ─▶ Picked up ─▶ Out for delivery
   ─▶ Delivered | Partially delivered | Failed
Failed / Partially delivered ─▶ Returned to factory ─▶ Rescheduled (─▶ Picked up …)
                                                   └▶ Needs review ─▶ Rescheduled (retry) | Cancelled
Rescheduled / Needs review ─▶ Delivered   (officer releases an undelivered remainder the owner refused)
Requested … Rescheduled / Needs review ─▶ Cancelled   (anything not with an agent)
```

- **Partially delivered** is the one status beyond the original list. The owner took part of
  the load and the agent still holds the rest until it is checked in. It is not a failed
  attempt.
- Every change goes through `moveTo()`. It validates against `TRANSITIONS`, saves the request
  and writes the timeline row, so no status changes without a trail.
- **Attempt label:** "Attempt n of N". n = failures in the current cycle + 1; N is
  `maxDeliveryAttempts`. A retry from Needs review starts a new cycle.

## 4. Request and review (FERT-07, FERT-06)

- **Request.**
  - FERT-07 posts one order. The server creates **one request per item**, all sharing an
    `order_ref` (`FO-0001`).
  - The route is filled in from the estate; the client never sends it.
  - Each request carries the owner's payment method.
  - The same service method (`createRequests(input, origin)`) is the future owner app's
    entry point. **There is no owner endpoint until owner sign-in exists.**
- **Officer decision** needs `fertilizerApproval: approve`:
  - Approve in full; partial approval needs a reason (shown to the owner); rejection needs a
    reason.
  - Approval is capped at **Available**. The old over-commitment toggle is removed.
  - Approval snapshots the price in force that day and refuses if the item has no price.
- **Manager step** needs `fertilizerManagerApproval: approve`:
  - If the *approved* quantity is above `managerApprovalAboveKg`, the request goes to
    **Awaiting manager approval**. The stock is already committed at the Officer's approval.
  - Manager approval leads to Approved / Partially approved.
  - Manager rejection needs a reason and releases the stock.
- **Stock commitment:**
  - FEFO: earliest expiry first, then lowest id, live batches only, never more than a batch's
    uncommitted stock.
  - It runs inside a transaction that locks the item's batch rows (`pessimistic_write`), so
    two approvals can't promise the same stock.

## 5. Stock rules (FERT-01, FERT-02)

| Event | On Hand | Committed | Available |
|---|---|---|---|
| Approval (FEFO allocation) | — | ↑ | ↓ |
| Officer's handover to the agent | ↓ | ↓ | — |
| Check-in of what came back (stays this owner's) | ↑ | ↑ | — |
| Cancel / reject / owner refused remainder | — | ↓ | ↑ |

- Handover and check-in write `stock_movements` rows (Outgoing / Incoming, linked to the
  request), so FERT-03's batch ledger stays complete.
- A commitment on a batch that has since expired shows as a shortfall (negative Available).
  Mark ready and Retry move it to live stock (FEFO) or refuse.
- **FERT-02 amended:** Outgoing movements are **ad-hoc only**. A request's fertilizer leaves
  through its handover. An ad-hoc movement can't take a batch's committed stock.

## 6. Dispatch, pickup and delivery

- **Mark ready** (`fertilizer: edit`):
  - Creates attempt 1 on the estate's stop on `nextCollectionDay(route, today)`, strictly
    after today.
  - Self-delivering estates are refused (no agent visits them; see §11).
  - The owner gets a "dispatched" notice with the date.
- **Agent:** nobody is stored as the agent before pickup. Whoever `getAgentForRoute` returns
  for that date sees the task, so a cover or reassignment that day moves it with the route.
- **Change date:** an officer may move the delivery to any **scheduled** date ≥ today
  (including today). If the route schedule drops the date, the attempt moves to the first
  scheduled date on or after it. A day that passes without a handover carries over the same
  way. Both moves are logged, and the owner gets the new date.
- **Handover** (officer, `fertilizer: edit`):
  - Recorded first, on the scheduled day, to the agent running the route that day.
  - The quantity must equal what's committed.
  - It moves the stock and **pins the task to that agent**. A later cover change doesn't move it.
  - If his shift has already started, the request goes straight to Out for delivery.
- **Agent pickup confirmation** (app) is evidence only. A different quantity sets
  `pickup_mismatch`, which is flagged on FERT-05/06 and audited.
- **Out for delivery** is set when the agent starts his route (`POST /dispatch/me/shift/start`).
- **Delivered:**
  - Needs a photo, the owner's name, and the owner's confirm tap on the agent's phone.
  - Device time is kept. A re-sent sync key is applied once, so an offline phone can sync
    later.
  - Delivering less than he carries → **Partially delivered** (reason required).
  - A charge is written at that moment for the delivered quantity.
- **Failed:** the reason comes from a list (owner not available, road not passable, owner
  refused, wrong address/estate, other + note), with an optional photo.

## 7. Returns and redelivery

- **Check-in** (`fertilizer: edit`; Factory Officer, since the Receiving Officer has no portal
  login):
  - The quantity must **exactly** equal what the agent holds.
  - The stock returns to its batches and stays committed to this owner.
  - The request then becomes **Rescheduled** on the route's next collection day. On the Nth
    failure in the cycle it becomes **Needs review** instead.
- **Failed notice:** sent at check-in, so the new date in it is real. On the Nth failure it
  gives the reason and says the factory will follow up.
- **Needs review:** the officer either **retries** (a new attempt on the next or a chosen
  scheduled date, cycle reset) or **cancels** (stock released, owner notified).
- **Release remainder:** after a partial delivery the officer may release the rest (owner
  refused). The request ends **Delivered** for what was delivered.

## 8. Payment

- **Payment method** (deduct from tea payment / cash / bank transfer) is recorded on the request
  and can change until it is Delivered.
- **Amount owed** = Σ charges = delivered qty × the approval-time rate. Partial approval and
  partial delivery follow automatically.
- **Deduct from tea payment:** the charge (`settlement_id` null) *is* the pending deduction
  record a future settlement generator consumes (owner via estate, amount, `delivery_id`).
  No settlement logic is built.
- **Cash / bank:** an officer records payments (bank needs a reference), never more than is
  outstanding.
- **One balance rule**, `fertilizerOutstanding`: outstanding = Σ charges − Σ charges recovered
  by a processed settlement − Σ cash/bank payments. EST-10's Outstanding, the EST-01
  directory and FERT-06 all use it.
- **Payment status** (FERT-05/06): Not due · Pending deduction · Deducted · Unpaid · Part paid · Paid.

## 9. Owner notices

Sent on:
- approved
- partially approved (with reason)
- rejected (with reason)
- dispatched (with expected date, and again whenever the date changes)
- delivered (with quantity and amount owed)
- failed (with reason and new date)
- cancelled (with reason)

How they're sent:
- Queued in the same transaction as the change, deduplicated per event.
- Sent by a minute cron through `DispatchNotifier.deliverToUser`, which stores an in-app row
  and pushes if a token exists.
- FERT-06 shows Queued / Sent / **Stored, not delivered** / Failed / Cancelled.

## 10. Screens and API

**Screens:**

| Screen | What's new |
|---|---|
| FERT-05 (queue) | Order ref, attempt, delivery date + agent, payment method + status, mismatch flag, status filter |
| FERT-06 (detail) | Officer decision (no override), Manager decision, action bar by status (Mark ready · Record handover · Check in · Change date · Retry · Release remainder · Cancel), attempt label, allocations, attempts, full timeline, payment panel (method, charges, payments, outstanding, Record payment), notices |
| FERT-07 (log request) | Item lines + payment method; one order → one request per item |
| FERT-02 (movement) | Linked-request dispatch removed |
| ADM-03 (system settings) | New Fertilizer prices section |

**Portal API** (`/fertilizer`):
- `GET requests`, `POST requests`, `GET requests/:id`
- `PATCH requests/:id/decide`, `PATCH requests/:id/manager-decide`
- `POST requests/:id/{ready,handover,check-in,retry,release-shortfall,cancel,payments}`
- `PATCH requests/:id/{delivery-date,payment-method}`
- `GET prices`, `POST prices`

**Agent API** (`/dispatch/me/fertilizer`, agent token, own tasks only):
- `GET` (today's tasks + what he carries)
- `POST :deliveryId/pickup`
- `POST :deliveryId/delivered`
- `POST :deliveryId/failed`

**Agent history** (`GET /employees/:id/fertilizer-deliveries`, needs `employees` view and
`fertilizer` view): the agent's finished attempts, meaning delivered, part delivered or
failed. It is shown on the Employee page's "Fertilizer deliveries" tab next to Collections,
with the same paging (last 90 days, 25 per page) and the same "Covering Route X" rule.

`GET /dispatch/me/stops` merges fertilizer onto stops by estate + date. Each stop carries
`fertilizer[]` and `hasTeaPickup`, and a fertilizer-only stop appears when the estate has no
tea pickup that day.

**Permissions** (data-driven defaults):

| Key | Administrator | Officer | Manager |
|---|---|---|---|
| `fertilizer` | approve | edit | view |
| `fertilizerApproval` | view | approve | view |
| `fertilizerManagerApproval` | view | view | approve |

Both approval keys are editable for the Administrator in ADM-02. Prices need
`administration: approve`. Agent actions are guarded by the agent token and ownership.

## 11. Out of scope / future

- **Loss or damage at check-in.** Today the quantity must match exactly.
- **Self-delivering estates.** No agent visits them; a factory-collection flow is needed.
- **Planned absence/cover for a future scheduled date.** Covers stay today-only.
- **The owner app.** It will call `createRequests(…, 'mobile')` once owner sign-in exists.
- **Mobile UI for the agent flow.** Only the API is built. Do it after origin/dev is merged.
- **Photo upload (Cloudinary).** Photos are metadata plus an optional `photoUrl`, like
  Collections.
- **Settlement generator.** It will consume deduct-method charges.
- **Release notice.** No owner notice goes out when an undelivered remainder is released.
- **Settings UI.** No admin screen edits `system_settings.fertilizer` yet (SQL/seed only).
