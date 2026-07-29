# Collection — Agent Dispatch, Absence Cover, Estate-First Exception Entry, Multi-Grade Deliveries (Addendum)

Status: draft for implementation · 2026-10-09 · Branch `feature/agent-dispatch`

This is an **addendum**. It adds requirements without rewriting the existing Collection specs
(COL-01..04). Token names, component names and existing screen codes stay unchanged. Where this file
amends an existing screen, only the delta is described.

Reused components (do not reinvent): `DataTable`, `StatusBadge`, `LightConfirmModal`, `AlertList`,
`DetailPageWithTabs`. `HighStakesConfirmFlow` is **not** used — nothing here is an irreversible
financial action. Colors come only from the central token config; no raw hex.

---

## 1. Principles

1. **Requests are addressed to a route, not an agent.** A resolver finds who covers the route today.
2. **Grading is factory-side only.** Agents and owners record only the estate (collected) weight.
3. **One source for every shared metric.** Expected route load, an agent's ceiling, kg collected, and
   graded totals are each computed in exactly one service/selector and reused.
4. **COL-02 precedent holds.** A web-entered exception is provisional until the agent confirms on mobile.
5. **Everything an officer changes is audited** (module `Dispatch`).

## 2. Data model

| Table | Purpose |
|---|---|
| `route_assignments` | Who is responsible for a route, and when. `type` `PERMANENT` \| `COVER`; `status` `PENDING` \| `ACTIVE` \| `DECLINED` \| `EXPIRED` \| `CANCELLED`; `valid_from`, `valid_to` (null = open-ended); `created_by`, `accepted_at`, `responded_at`, `expires_at`, `reason`, `covers_assignment_id`; `stop_scope` (JSONB, null) is the hook for splitting a route later (stop-level overrides). One `ACTIVE` `PERMANENT` per route (partial unique index). |
| `route_neighbours` | Factory-defined "close" route pairs (stored symmetric). Primary proximity signal. |
| `agent_day_status` | Per agent per day: `AVAILABLE` \| `ABSENT`, `source` (`self` \| `officer`), shift start/end, who marked it. |
| `agent_location_pings` | Location history. `recorded_at` = device time, `received_at` = server time, `source` `ping` \| `checkin`. |
| `delivery_grade_lines` | `delivery_id`, `grade` (`super` \| `normal`), `weight_kg > 0`, `graded_by`, `graded_at`. **UNIQUE(delivery_id, grade).** |
| `device_push_tokens` | Expo push tokens per user. |

Notification types added: `cover_request`, `cover_response`, `missed_checkin`, `route_reassigned`, `exception_request`.

Changes to existing tables:
- `estates` gains nullable `lat`, `lng` (map pins and route lines).
- `tea_collection_records.weight_kg` is documented as the **estate weight** (unchanged column). The
  old single `grade` column is migrated into one grade line per graded record, then dropped.
  Ungraded = no lines. **No total is stored**; the graded total is always the sum of lines.
- `notifications.type` gains `cover_request`, `cover_response`, `missed_checkin`, `route_reassigned`.
- `role_permissions` gains a `dispatch` module and a `ReceivingOfficer` role row (see §8).

Migration is targeted SQL applied to the existing schema — never a database reset.

## 3. Route resolver

`getAgentForRoute(routeId, date)`:
1. An `ACTIVE` `COVER` assignment whose range includes `date` wins.
2. Otherwise the `ACTIVE` `PERMANENT` assignment.
3. Otherwise `null`.

`PENDING` rows never resolve. Stale `PENDING` covers (past `expires_at`) are expired lazily whenever covers are listed or acted on, and by a per-minute sweep.

Every request-routing path uses this service. For records not yet collected, the shown agent is
resolved **at read time**; `agent_id` is stamped only when a record is actually collected. Result:
reassigning a route only changes assignment rows; during a cover the route's pending and new requests
go to the cover agent; when the cover ends they return to the original agent automatically.

## 4. COL-05 — Agent Dispatch Board

Own page at `/collections/dispatch` (separate from the Tea Leaf Collection list). Visible to roles with
`dispatch` ≥ view.

**Left panel** — `DataTable` of agents:

| Column | Content |
|---|---|
| Agent | name |
| Route | assigned route; "Covering Route X" when a cover is active |
| Status | `StatusBadge`: Not started / On route / Completed / Absent / Covering |
| Progress | **kg collected so far** (estate weighing exists — see §9) |
| Last seen | freshness indicator |

**Right panel** — map with agent pins and route lines (estate pins joined in route order). Selecting an
agent highlights their route. Map library: Leaflet via `react-leaflet` (small, no API key, OSM tiles).

**Row actions:** Reassign route · Mark absent / Find cover · View today's stops.

**Missed check-in alert:** agents with no shift start by the configured shift-start time appear in an
`AlertList` banner for the Factory Officer. This is an alert, **not** automatic absence.

### 4.1 Freshness (never "real-time")
| Age | Display |
|---|---|
| < 5 min | green indicator |
| 5–30 min | amber indicator |
| older | grey "Last seen HH:MM" |

### 4.2 Location capture rules
- Pings are sent roughly every 1–2 minutes **only while a shift is active**. No tracking off-shift.
- Pings queue on the device (SQLite) while offline and upload in a batch; each keeps its device time.
- The server accepts a fix only if it was recorded **inside one of the agent's shifts** (so a late upload
  of in-shift fixes is fine; off-shift fixes are rejected). Fixes stamped in the future are rejected.
- Completed stop check-ins also count as location signals (`source = checkin`).
- Foreground only this round: the screen is kept awake during an active shift. Background tracking is a
  later round.
- Latest position: Redis (`agent:pos:{agentId}`, 12 h TTL). History: PostgreSQL.
- **Retention:** ping history is deleted after **30 days** (nightly job). Check-ins are retained with
  their stop records.

### 4.3 Route reassignment
Modal asks **Today only** or **From now on**:
- Today only → creates an immediately-`ACTIVE` `COVER` for that day. Unlike an absence cover, an officer's
  reassignment is an instruction, not a request: it takes effect at once and the agent is notified
  (`route_reassigned`).
- From now on → ends the current `PERMANENT` (its `valid_to` is set to yesterday, so history stays
  date-resolvable) and starts a new one (requires `approve`). The new owner must not already own another
  route permanently.
- If the current agent has already collected on that route today, the server refuses (409) and the UI
  shows a strong warning. Every change is written to the dispatch audit history.

## 5. Absence and cover

**Detecting absence:** (a) the agent marks himself unavailable on mobile; (b) a Factory Officer marks
him absent; (c) the missed check-in alert (§4) prompts an officer — it never marks absence by itself.

**Ranking candidates** (the system ranks; it does not auto-assign):
- *Proximity:* neighbouring routes (`route_neighbours`) first. A `proximityProvider` hook is left so
  route-geometry distance can be added later.
- *Workload:* today's remaining stops on the candidate's own route plus the route's **expected load**
  (average daily kg over the last 30 days), from one shared `RouteLoadService`.
- *Practical limit:* the agent's highest daily delivered kg in the last 30 days is a **soft ceiling**.
  Own load + cover load above it shows a warning but does not block.
- *Excluded:* agents who are absent, already holding an active or pending cover today (one-cover rule),
  or who have finished their shift.

**Flow:** officer picks a candidate → `PENDING` `COVER` + push + in-app request ("Route 7, 14 stops,
~380 kg expected") → **Accept** → `ACTIVE`; **Decline** or no answer within the timeout
(`cover_request_timeout_min`, default 15) → `DECLINED` / `EXPIRED` and the board suggests the next candidate.

**Ending a cover:** a cover's window is a single day, so it ends with the day by itself (no sweep needed); it ends early (`CANCELLED`) when the original agent is marked available again. A cover agent who is marked absent hands the route back.

**Out of scope:** splitting one route's stops between two agents (data model leaves `stop_scope`).

## 6. COL-02 amendment — estate-first exception entry
- Searchable estate picker (estate name, owner name, registration number); an optional route selector
  pre-filters the list.
- After picking an estate, read-only: its **route** and **"Today's agent: <name>"** — with "(covering)"
  when a cover is active (from `getAgentForRoute`).
- Submit goes to the route resolver, which notifies today's agent. The record stays **Pending Agent
  Confirmation** (provisional) until the agent confirms on mobile. The client no longer sends route or
  agent; the server derives both from the estate.

## 7. COL-01 / COL-03 amendment — multi-grade deliveries
- **Grading is factory-side only.** Agents and owners record only the estate weight; the mobile app has
  no grade input. Grade-line create/edit is limited to factory roles (Administrator, Officer; Manager is
  read-only).
- A delivery can have several grade lines (Super and/or Normal, one per grade).
- **Total weight = sum of lines** (single server mapper + single frontend selector). Before grading, a
  delivery shows **Ungraded** and its estate weight.
- List columns stay: Estate → Route → Weight (total) → Grade → Status → Date → Actions. The Grade cell
  shows chips such as `Super · 32.0 kg`; more than two grades shows "+N more" and the row expands.
- Grade filter matches deliveries that **contain** the grade and shows that grade's weight.
- The estate weight is kept as its own field; the mismatch complaint compares it with the graded total.
- **Settlement:** payment = Σ (line weight × that grade's rate), priced with the ADM-01 rate version
  effective on the collection date (one pure `computeGross` function). Grade rates are already
  effective-dated and settlements snapshot their rate, so past settlements cannot silently change; grade
  lines do not weaken this.

## 8. Permissions (data-driven, ADM-02)

New module key `dispatch`. Defaults, configurable per factory:

| Action | Level | Default |
|---|---|---|
| View dispatch board | view | Administrator, Officer, Manager |
| Mark agent absent; find & send cover request | edit | Officer (and Administrator) |
| Permanent route reassignment | approve | Manager (and Administrator) |
| Report own absence | — | Collection Agent (mobile, own record only) |
| Flag "agent hasn't arrived" | — | Receiving Officer — **row kept in data, disabled (`none`)** this round |
| Create/edit grade lines | `collection` edit | Administrator, Officer |

## 8a. Agent authentication
Collection agents sign in on mobile via `POST /auth/agent/login` (phone + password) and receive an
**agent-audience** token. The portal API rejects it (401) and the agent API (`/dispatch/me/*`) rejects portal
tokens, so neither audience can call the other's endpoints.

## 9. Estate weighing finding
Estate-level weighing **exists by design**: the collector weighs at the estate and the owner confirms on
the collector's device (Claude.md, Weight verification). The board therefore shows **kg collected so
far**. No mobile flow writes these weights yet, so values come from seed data until the mobile
collection flow is built.

## 10. Out of scope this round
Background GPS tracking · splitting a route between agents · Receiving Officer portal role · geometry-
based proximity · mobile screens (API endpoints only) · push delivery on a real device.
