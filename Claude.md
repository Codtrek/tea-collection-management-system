# Tea Collection Management System — Project Context

This file gives an AI coding assistant the working context needed to write code consistent
with the finalized design decisions for this project. It reflects design sessions held after
the original project proposal was written — where this file conflicts with the proposal PDF,
**this file is authoritative** for implementation purposes.

## What this system does

Digitizes Sri Lanka's manual, paper-based tea collection workflow: from leaf plucking at the
estate, through factory pickup and receiving, to monthly payment calculation. Replaces phone
calls and paper records with a coordinated mobile + web system.

## Stack

- **Mobile app**: React Native, offline-first via SQLite, syncs to backend when online
- **Web portal**: React + Vite
- **Desktop app**: planned, not yet architected (added after original proposal — scope/role
  mapping still open)
- **Backend**: NestJS (Node.js), REST API
- **Database**: PostgreSQL (primary), SQLite (mobile offline), Redis (caching)
- **Auth**: JWT, role-based access control
- **Storage**: Cloudinary (photo evidence)
- **Maps**: Google Maps API (static route/proximity display, not live tracking)
- **i18n**: English, Sinhala, Tamil (react-i18next)

## User roles (system logins)

Only roles that create, approve, or consume workflow data get accounts:

- Tea Estate Owner
- Tea Estate Manager
- Tea Collection Agent ("collector")
- Tea Receiving Officer
- Factory Administrator
- Factory Officer
- Factory Manager
- Employee (self-service portal only — salary history, advances, payslips)

All other org-chart roles (Machine Operators, Drivers, Quality Control staff, Store Keepers,
etc.) are **HR records only** — no login, no permissions, exist purely for payroll/attendance.

---

## Core domain model: Route Management vs. Pickup Management

This is the central architectural decision of the system. **Do not conflate these two.**

### Route Management (factory-controlled)

A `Route` represents one truck's plan for one day: which truck, which collector, which driver,
which estates get visited, in what order.

**Route status** (factory sets these, not the collector):
`SCHEDULED → ACTIVE → COMPLETED`, with `DELAYED` and `CANCELLED` as factory-triggered branches
requiring a reason (e.g. "Heavy Rain", "Road Closed", "Vehicle Breakdown").

- Factory creates the route in the morning → `SCHEDULED`
- **Collector** presses "Start Route" → `ACTIVE` (this is the *only* route-status action a
  collector can take — everything else is factory-only)
- Factory can set `DELAYED` or `CANCELLED` at any time before completion; this is **manual only**,
  never system-inferred
- `CANCELLED` blocks all new pickup requests against that route for the day
- All estates on the route get notified on `ACTIVE`, `DELAYED`, and `CANCELLED` transitions

A `RouteStop` belongs to a route and an estate, and can have `has_tea_pickup` and/or
`has_fertilizer_delivery` — fertilizer delivery is **not** a separate workflow, it's a flag on
the same stop.

### Pickup Management (estate-controlled)

A `PickupRequest` is created by an estate owner and is independent of route status — a route
being `ACTIVE` does **not** mean every pickup on it is resolved.

**Pickup status**: `PENDING → ACCEPTED → ON_THE_WAY → PICKED_UP → COMPLETED`, with `EXPIRED` and
`CANCELLED` branching off `PENDING`.

- Owner selects a **factory** (not a specific collector) when creating a request
- **Auto-assignment**: system matches the request to whichever collector is `ACTIVE` on the
  estate's route — the owner never picks a person directly
- **One active pickup request per estate per day.** A new request to a different factory can
  only be submitted after the current one is `EXPIRED` or `CANCELLED` — no parallel requests
- Response deadline: if the collector doesn't accept/decline in time, system auto-expires it
  and notifies the owner, who may then try another factory
- Collector can accept or decline an *individual stop* (not the whole route) with a required
  reason on decline

### Why decoupled

Keeps factory-level logistics (trucks, routes, drivers) cleanly separate from estate-level
interactions (requests, weights, confirmations). Reduces contention and makes each side's state
machine independently reasoned-about.

---

## Weight verification (no OTP/SMS, anywhere)

The proposal originally mixed OTP-based and photo-based verification across different diagrams —
this was resolved: **photo evidence only, everywhere**, because SMS/OTP is unreliable in rural
areas with poor signal. Do not reintroduce OTP/SMS confirmation steps.

Sequence:
1. Collector measures weight, enters it in the app
2. **Estate owner confirms on the collector's device** (taps Confirm on the agent's phone screen)
   — not a text message, not a network round-trip, works fully offline
3. Photo evidence of the scale/weighing is captured (uploads to Cloudinary if online, queues
   locally if offline)
4. At factory receiving, the Receiving Officer re-weighs and the Receiving Officer assigns a
   tea grade (`Super` or `Normal`) at the same step
5. If collected weight vs. factory weight differs beyond a configured threshold → system
   **auto-generates a complaint** (do not just store both numbers silently)

## Offline behavior

Two distinct problems, don't conflate them:

1. **User is offline and can wait** → standard offline-first pattern. Data (collection records,
   photos, pickup requests) is written to local SQLite with a `QUEUED_OFFLINE` status, synced
   automatically when connectivity returns, then promoted to real system status (e.g.
   `QUEUED_OFFLINE` → `PENDING` for a pickup request, which only then enters route-matching).
2. **User is offline and needs a collector *today*** → auto-assignment logic runs server-side
   and cannot function without connectivity. Fallback: cache the estate's usual/assigned
   collector's phone number and the factory dispatch line locally (refreshed opportunistically
   whenever online), and surface a "no connection — call your collector directly" screen. This
   maps to the pre-existing phone-call-based pickup method (see below), not a new mechanism.

GPS note: capturing a coordinate does **not** require internet (device GPS chip works offline).
Only rendering map tiles does. So the pickup location pin should always be captured, online or
not — just skip the visual map preview until connectivity returns.

## Manual / offline collection records (phone-arranged pickups)

Some estate owners have a personal relationship with a specific collector and just call them
directly, bypassing the app entirely. This is legitimate and expected, not an edge case to
eliminate. To keep these estates in the payment calculation pipeline, the collector can create a
**manual collection record** after the fact — same fields as a normal completed pickup (estate,
weight, photo), just created directly with `status = COMPLETED` and no preceding
`Pending/Accepted` history.

---

## Payment calculation

```
Gross Revenue = (Super Tea Weight × Super Rate) + (Normal Tea Weight × Normal Rate)
Net Payable   = Gross Revenue − Transport Cost − Fertilizer Deductions − Advance Payments
```

- Transport cost is **skipped entirely** for estates that self-deliver to the factory
  (`self_delivered` flag on the collection record)
- Fertilizer deductions come from approved fertilizer borrowings (fertilizer is requested/
  approved separately from the tea-pickup flow, but *delivered* via the same route stop)
- Advance payments are owner-requested before month-end, tracked with request date/amount/status
- Output: a payment statement per estate per month, exportable as Excel/CSV/PDF for bank
  submission

Employee payroll follows a parallel but separate calculation: shift-based pay (Day/Day OT/
Night/Night OT, different rates), with employee-requested salary advances deducted at month end,
also exportable as a bank payment file.

**Open question, unresolved**: the ~Rs 3 per-transaction bank charge — is it a transfer fee or a
file-processing fee? This determines whether it needs its own line item in the payment schema.
Do not hardcode an assumption here; check before finalizing the payment API.

---

## Deferred / explicitly out of scope

- **Collector quota/constant-weight penalty system**: if a factory expects a set weight from a
  collector and they under-deliver, some factories dock the collector's own pay. This is a real
  business rule but is **deferred to a future phase** — don't build it into v1's payment schema,
  though the schema should be extensible enough to add it later as another deduction line item.
- **Live GPS/vehicle tracking**: only static route visibility and one-time pickup-location pins
  are in scope. Continuous location tracking is explicitly out of scope.
- **SMS-gateway-based request submission**: raised as a possible offline fallback but would
  require new infrastructure (SMS gateway) — treat as a stretch goal, not core scope.

---

## Key entities (for schema design)

```
Factory, Route, RouteStop, PickupRequest, Estate, Collector, Truck,
CollectionRecord, TeaGrade, Complaint,
Employee, SalaryAdvance, Attendance,
MonthlyPayment, PaymentDeduction, PaymentStatement
```

Notable fields worth preserving in any implementation:
- `Route.status_reason` — required whenever status is `DELAYED` or `CANCELLED`
- `PickupRequest.gps_pin` — captured offline-capable, distinct from live tracking
- `PickupRequest.estimated_weight` vs `CollectionRecord.actual_weight` — both stored, mismatch
  triggers `Complaint` when beyond threshold
- `CollectionRecord.self_delivered` — boolean, skips transport deduction
- `CollectionRecord.owner_confirmed` — on-device confirmation flag, separate from photo evidence

---

## Use case ID map (for cross-referencing the proposal document)

- **Deleted**: UC-036 (old Factory Admin review step — requests no longer go through review,
  they route directly via the active-route collector)
- **Rewritten in place**: UC-009 (Create Pickup Request), UC-010 (Handle Pickup Rejection or
  Expiry), UC-037 (View Route Availability — now Estate Owner–facing, not Factory Admin–facing)
- **New (route/pickup)**: UC-053–UC-057, UC-064–UC-068 — route creation, status updates, Start
  Route, route dashboard, weight-mismatch auto-flagging, auto-assignment, request expiry,
  per-stop accept/decline, route-start/delay/cancel notifications
- **New (factory management)**: UC-058–UC-063 — on-device weight confirmation, manual collection
  entry, tea grading, monthly payment calculation, salary advance requests, bank payment file
  generation

## Implementation status

- **Mobile app**: shared navigation shell is built (role-based login, tab shell, placeholder
  dashboards for all 8 roles) against a local-first SQLite data layer, since the backend has no
  real API yet. See `source-code/mobile/CLAUDE.md` for architecture and gotchas specific to that
  app — keep that file updated whenever mobile work makes an architecturally significant change.
- **Backend**: `source-code/backend/` is still default NestJS scaffolding (a single `GET /`
  "Hello World" route) — no auth, no modules, no ORM wired in.
- **Known conflict**: `source-code/database/init.sql` (the existing Postgres schema) predates the
  design decisions in this file and conflicts with them — it has `collection_otp`/`delivery_otp`
  columns despite the OTP ban above, and its `role` enum doesn't match the role list in this file
  (missing `factory_officer`/`factory_manager`, uses `plucking_employee` instead of `employee`).
  Don't treat `init.sql` as ground truth; this file remains authoritative. The schema needs
  reconciling with these decisions before real backend work begins.

## Diagrams still needing manual redraw

Figures 2, 5, and 6 in the original proposal (Tea Estate Owner, Tea Receiving Officer, Factory
Administrator use case diagrams) still show the old OTP-based flow and pre-route responsibilities.
These need to be redrawn in Draw.io to reflect: photo-evidence-only verification (no OTP ovals),
route-based responsibilities moving from Factory Admin to Estate Owner (route availability check)
and to Collector (Start Route).
