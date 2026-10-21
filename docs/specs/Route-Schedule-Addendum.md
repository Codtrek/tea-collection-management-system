# Collection — Route Schedule (Addendum)

Status: draft for implementation · 2026-10-22 · Branch `feature/fertilizer-delivery`

This is an **addendum** to `Collection-Agent-Dispatch-Addendum.md`. It adds a schedule to routes
and describes only the changes it causes in dispatch. It does not rewrite the dispatch spec;
everything not mentioned here stays as specified there.

---

## 1. Why

Routes do **not** collect every day. Estate owners pluck every 5–12 days, so each route runs on
set weekdays, and one agent usually holds several routes and works a different one on different
days. The dispatch build assumed one route per agent, collected daily. Fertilizer delivery
(`Fertilizer-Delivery-Addendum.md`) also needs "the route's next collection day".

## 2. Principles

1. **One source.** Whether a route runs on a date, and its next collection day, are answered only by
   `RouteScheduleService` (`isScheduled`, `nextCollectionDay`, `scheduledRoutesOn`). Nothing else
   reads the schedule tables.
2. **Who and when are separate.** The schedule answers *when* a route runs; `getAgentForRoute(route,
   date)` still answers *who* (cover > permanent > nobody), unchanged. Callers ask both.
3. **Overrides beat the pattern.** A date override always wins over the weekly pattern.
4. **Every change is audited** (module `Dispatch`) and needs a reason when it touches one date.

## 3. Data model

| Table | Purpose |
|---|---|
| `route_schedule_weekdays` | The fixed weekly pattern. One row per (route, weekday). `weekday` 0 = Sunday … 6 = Saturday. PK `(route_id, weekday)`. A route with no rows is never scheduled (except by an ADD override). |
| `route_schedule_overrides` | One-date exceptions. `kind` `ADD` (runs on a date the pattern skips) \| `CANCEL` (doesn't run on a pattern date). `reason` required, `created_by`, `created_at`. **UNIQUE(route_id, date)** — one override per route per date. A **move** is a CANCEL on the old date plus an ADD on the new date that share a `move_group` (uuid); removing either removes both. |

Migration `2026-10-22-route-schedule.sql` backfills **all seven weekdays** for every existing route,
so behaviour is unchanged until an officer sets a real pattern.

## 4. Rules

`nextCollectionDay(route, fromDate)` = the first scheduled date **strictly after** `fromDate`
(overrides applied), looking up to 366 days ahead; `null` when there is none. Strictly-after is
deliberate: by the time an officer acts on a scheduled day, that day's run has usually left the
factory. An officer can still move a specific date.

Editing:

| Action | Permission (data-driven, `dispatch` module) |
|---|---|
| View a route's schedule | `view` |
| Add / cancel / move a single date; remove an override | `edit` (Officer) |
| Change the weekly pattern | `approve` (Manager; Administrator) |

Validation:
- Dates in the past can't be added, cancelled or moved.
- ADD only on a date that isn't already scheduled; CANCEL only on a date that is. A date that already
  has an override must have it removed first.
- **One scheduled route per agent per date.** A change that would make the agent who permanently
  holds this route scheduled on two of his routes on the same date is refused (checked over the next
  366 days, overrides included). The same check applies to a permanent reassignment.
- Un-scheduling **today** (cancel, move away, or pattern change) is refused once the route has
  started collecting today.
- Cancelling a date cancels any cover held for that route on that date, and the cover agent is
  notified.

## 5. Dispatch changes (amends Collection-Agent-Dispatch-Addendum §3–§6)

- **One agent, several permanent routes.** The "already owns another route permanently" block on a
  permanent reassignment is removed; the one-route-per-agent-per-date rule (§4) replaces it.
- **Board (COL-05)** gets a date picker (default today). Each agent shows the route(s) scheduled for
  him on that date. A route that isn't scheduled that date shows **Not scheduled today**, with no agent
  and no stops. Missed check-in alerts only count agents with a scheduled route that day.
- **Cover rule.** On a date an agent may cover **at most one** absent route in addition to the route he
  is scheduled on. Covers and absence stay **today-only**; a cover request (or a "today only"
  reassignment) is refused when the absent agent's route isn't scheduled today.
- **Cover candidates.** Agents with **no scheduled route** that date rank highest (after the
  already-asked rule); then neighbouring-route proximity, then fewest remaining stops, then lowest
  own load, as before.
- **Exception entry (COL-02).** When the estate's route isn't scheduled on the chosen date, the form
  shows the route's next scheduled date and the agent for that date.
- **Agent stops (mobile API).** `GET /dispatch/me/stops` lists only routes scheduled today.

## 6. API

- `GET /dispatch/routes/:id/schedule` — the pattern, upcoming overrides, the next 28 days marked
  scheduled or not, and `nextCollectionDay` from today.
- `PUT /dispatch/routes/:id/schedule/weekdays` `{ weekdays: number[] }`
- `POST /dispatch/routes/:id/schedule/overrides` `{ date, kind: 'ADD' | 'CANCEL', reason }`
- `POST /dispatch/routes/:id/schedule/move` `{ fromDate, toDate, reason }`
- `DELETE /dispatch/routes/:id/schedule/overrides/:overrideId`

## 7. Out of scope

- Per-estate frequencies (an estate inside a route visited only every other run).
- Planned (future-date) absence and covers.
- History of past patterns: the pattern is forward-looking. A past date is judged by today's pattern,
  which is fine because history lives in the collection records themselves.
