# Attendance & Leave: Addendum (EMP-05 / EMP-08, holidays, leave)

**Decided:** 2026-11-02
**Status:** Phase 1 built and committed on `feat/attendance-leave`. Holiday permissions + approvals (§4.1–4.2) built 2026-11-05. Phases 2 and 3 are planned, awaiting OK.
**Amends:** EMP-05 Attendance overview, EMP-08 Daily Attendance Entry, the EMP-03 Attendance tab and Agent Dispatch absence. Adds the holiday calendar.

## 1. The three bugs, and why they happened

1. **The grid only showed July 2026.** `AttendanceOverviewPage` hard-coded `PERIOD = 'July 2026'`, always loaded July's records and always drew 31 days. There was no month picker and no `?month=`.
2. **The date picker did nothing.** It was locked to 1–31 July. It only fed the three count cards, which only had July's data. The grid ignored it.
3. **Save "didn't save".** The server did save (one row per employee per date); the local DB has full rolls saved for 18 and 19 October. It looked broken because:
   - after saving, the page went to the overview, which only ever showed July;
   - the entry page never loaded what was already saved, so everyone showed **Present**, and anyone untouched was **sent as Present**;
   - the date defaulted to the hard-coded 17 July, so a quick Save overwrote that day;
   - a Manager got a 403, shown only as a toast.

## 2. Attendance page (`/employees/attendance`)
- **Month:** opens on the **current month**, with the shared `MonthPicker` (‹ › and a dropdown). `?month=YYYY-MM` is in the URL, the same pattern as Payroll.
- **Month tab: a grid of letter codes in coloured cells.**

  | Code | Meaning |
  |---|---|
  | P | Present |
  | A | Absent |
  | L | Leave |
  | H | Half-day (AM/PM in the tooltip) |
  | S | Short leave (times in the tooltip) |
  | W | Worked on holiday |

  - **Not marked:** an empty outlined cell, clearly not Absent.
  - **Non-working days:** shaded and labelled Weekly / Rest / Poya / Public / Closure.
  - **Today and the future:** today is ringed; future days are empty and inert.
  - **Totals per employee:** Present, Absent, Leave, Half-day, Short leaves, and Attendance %.
    - **Attendance %** = present days ÷ working days up to today. A half-day mark counts 0.5, and holidays and rest days are left out.
- **Filters** (in the URL, run on the server):
  - search by name / EMP- ID / role;
  - role;
  - route (agents);
  - "has unmarked days".
- **Day tab:** `?tab=day&date=` (never a future date).
  - Everyone's status for that date, with leave type / AM-PM / times, who marked it and when, and the source (portal / dispatch).
  - Summary cards: Present / Absent / On leave / Not marked.
- **Rows:** clicking a row opens the employee's **Attendance & Leave** tab.
- **Export:** CSV of the filtered month grid.

## 3. Daily Attendance Entry (`/employees/attendance/entry?date=`)
- **No default selection.** It loads what's already saved for the date; everyone else is **Not marked**.
  - Only **Mark All Present** fills them, and it skips leave, locked rows and holidays.
- **Saving:**
  - only changed rows are sent;
  - Save is disabled until something changed and every Half-day / Short leave has its details;
  - if anyone is still unmarked, it asks "N not marked. Save anyway?", and they stay Not marked, never Absent.
- **No future dates:** the picker stops at today, and the server rejects them (400).
- **Edit window** (`system_settings.attendance.editWindowDays`, default 3):
  - `attendance: edit` (Officer) marks today and up to 3 days back;
  - older days need `attendance: approve` (the Factory Manager) and a **reason**, which is stored on the record (`edit_reason`) and in the audit log.
  - The Manager's attendance level was raised from view to approve for this.
- **Payroll lock:** once an employee's payroll row for a month is **Processed**, their attendance for that month is locked (per employee).
- **Approved leave:** days with approved leave are locked. Phase 2 fills them.
- **Non-working days:**
  - weekly / rest / Poya / public / closure days can't be **Absent** or **Leave**;
  - working that day is **Worked on holiday** (`holiday_worked`, for payroll later);
  - it's refused when the day's type doesn't allow work.
- **Half-day** needs AM or PM. **Short leave** needs the time out and the time back.
- **Each record stores** who marked it, when (`marked_at`) and where from (`source`: portal / dispatch / app / leave / holiday).
- **Hours stored for payroll** (decided; pay calculation unchanged):

  | Mark | Hours |
  |---|---|
  | Present / Worked on holiday | 8 |
  | Short leave | 8 |
  | Half-day | 4 |
  | Absent / Leave | 0 |

All rules are pure functions in `backend/src/employees/attendance-rules.ts`, applied by `AttendanceService`.

## 4. Holiday calendar (`/holidays`, under PEOPLE)

### 4.1 Permissions (replaces the earlier "Manager only" rule; decided 2026-11-05)
Two data-driven keys in `role_permissions`:

| Key | Administrator | Manager | Officer |
|---|---|---|---|
| `holidayCalendar` | approve | edit | view |
| `holidayStatutory` (new) | approve | view | view |

`holidayCalendar` left `ADMIN_EDITABLE_MODULES`, so the Administrator row is pinned again. `holidayStatutory` is separate so a factory can later let a Manager enter Poya days without giving them approvals.

| Function | Administrator | Manager | Officer |
|---|---|---|---|
| View calendar | Yes | Yes | Yes |
| Public & Poya holidays (add, edit, delete, import) | Yes | No | No |
| Holiday type settings (Paid / Work allowed) | Yes | No | No |
| Weekly holiday per category | Yes | Propose → Admin approves | No |
| Category holiday (Factory workers or Office staff only) | Yes | Yes | No |
| Per-employee rest days | Yes | Yes | No |
| Factory-wide closure (all employees) | Yes | Request → Admin approves | No |
| Same-day emergency closure | Yes | Yes, in force now; Admin reviews (keep or revert) | No |
| Edit / delete a holiday | Yes | Only their own, only future dates, only if no processed payroll is affected | No |
| Approve holiday changes | Yes | No | No |

- **One rule:** `backend/src/holidays/holiday-permissions.ts` `decide(action, levels, ctx)` returns direct / request / review / deny. `HolidayService` asks it before every write, so the server is the judge.
  - Each holiday in the API carries `canChange`, so the portal shows only the buttons the viewer may use.
  - "Their own" means `holidays.created_by_user_id`. For an approved request, that is the requester.
  - "Processed payroll" means a Processed `payroll_runs` row for an employee the holiday applies to, in that month.
  - A Manager never changes a factory-wide closure (only the Administrator).
- **Officers** see a "View only" label. **Holiday type** checkboxes are read-only text for anyone without `holidayStatutory: edit`.
- Every change goes in the audit log (module "Holidays": who, when, what, reason).

### 4.2 Requests and approvals (`holiday_requests`)
- **A request has no effect until approved.** A Manager's weekly-holiday proposal or factory-wide closure is stored only in `holiday_requests` (kind, payload, dates, requester). Nothing reaches `holidays` / `weekly_holiday_rules`, so `facts()` (attendance, leave, payroll, routes) is unchanged.
  - The calendar shows it as a dashed "Awaiting approval" chip (`year().pending`).
- **The Administrator** gets an in-app notification (`holiday_request`) and the "Pending approvals" panel (`GET /holidays/requests`, `POST /holidays/requests/:id/approve|reject`).
  - Approving or rejecting **always needs a reason**. The requester is notified, and it is audited.
  - **Approving** replays the request through the same write path. A weekly rule whose effective-from date has passed applies from the approval day (the audit log says so). Closure dates that have all passed can only be rejected.
- **An emergency closure** is today only and for all employees. It takes effect immediately: routes are cancelled, deliveries move, agents are told, and attendance is kept or cleared.
  - It is stored with a **snapshot** of the attendance it touched.
  - **Keep:** closes the review.
  - **Revert:** cancels the holiday, gives back the route days still ahead, re-inserts or un-flags the attendance from the snapshot, re-runs the delivery reconcile and tells the agents collection is back on (`holiday_cancelled`).
- **Migration:** `database/migrations/2026-11-06-holiday-approvals.sql` (mirrored in `init.sql` and `seed.ts`).

### 4.3 Calendar data
- **Types** (`holiday_types`), each with paid yes/no and work allowed yes/no, set by the Administrator:

  | Type | Default |
  |---|---|
  | Poya day | paid, work allowed |
  | Public holiday | paid, work allowed |
  | Weekly holiday | unpaid, work allowed |
  | Factory closure | unpaid, no work |

- **Poya and public holidays** (`holidays`): entered per year (date, name, type).
  - "Copy last year's names" fills in the names; the Administrator sets the new dates.
  - In **December** the page warns if next year's holidays aren't entered.
  - Nothing is scraped from external sites.
- **Weekly holiday** per category (`weekly_holiday_rules`): one or more weekdays plus an optional half day.
  - A change takes an **effective-from** date (today or later) and adds a row, so **past weeks never change**.
  - The default is Sunday for both categories.
- **Per-employee rest day** (`employee_rest_days`): overrides the category, for 7-day factories. It also takes an effective-from date.
- **Employee category** (`employees.category`, editable on the form): Factory worker (Wages Board) or Office staff (Shop & Office Act). Backfill: Factory Officer and Factory Manager are office; everyone else is factory.
- **The ONE working-day rule:** `backend/src/holidays/working-days.ts` `dayInfo` / `workingDaysIn`.
  - Order: a dated holiday that applies to the employee's category → their rest day → the category's weekly rule in force that week.
  - Attendance uses it now; leave and payroll will.
- **Declare holiday** (a closure or category holiday; see §4.1 for who):
  - **The form:** date or range (max 31 days), name, reason, paid yes/no, applies to (all / factory / office), and whether **tea collection stops**.
  - **A preview comes first,** listing attendance already marked on those dates and the route days that would be cancelled.
    - If attendance is marked, the Manager chooses **keep as "Worked on holiday"** or **clear**. Absent is always cleared.
  - **If collection stops:**
    - each scheduled route day is cancelled with a route-schedule override; the existing logic cancels covers on those days and notifies the cover agents;
    - fertilizer deliveries move to each route's next collection day (`FertilizerDeliveryService.reconcile`);
    - the route's agent gets an in-app notice (`holiday_declared`).
  - **If collection continues** (e.g. the office is closed): routes stay as they are.
  - **Cancelling:** before the date it reverses the declaration and restores the route days still ahead. After the date it needs a reason (Administrator only; a Manager changes only future holidays).
  - **Phase 2:** approved leave on those dates will be refunded, with a notice to the Officer.

## 5. Agent Dispatch: one record, two views
- **The record:** `employee_attendance` is the record. `agent_day_status` is the board's view of it, plus shift times. Agents link through `collection_agents.hr_employee_id`.
- **Attendance → board:** marking an agent **Absent** or **Leave** in attendance makes him ABSENT on the board for that date (the board shows "On leave" for leave) and excludes him from cover candidates. From today on, he also hands back any cover he holds. Marking him Present again lifts it.
- **Board → attendance:** marking an agent absent on the board **writes his attendance** (Absent, source "dispatch", the reason). "Available again" removes that Absent. The board never overwrites leave.
- **Code:** `dispatch/agent-attendance-link.service.ts` and `DispatchService.syncFromAttendance`.

## 6. Later: auto-mark Present from the mobile app's shift check-in (not built)
- **What exists:** `AgentSelfService` already sets `agent_day_status.shift_started_at` when an agent starts his shift in the app.
- **The hook:** add a call there to the attendance write path: Present, source "app", today, only when the day has no status yet.
- **What it would respect:** leave, holidays (Worked on holiday) and the payroll lock come for free from the same rules.

## 7. Payroll today (no change without approval)
- **The calculation:** "Generate from Attendance" pays **hours × hourly rates**: day, day OT, night, night OT (`employees.service.ts` `generatePayroll`).
- **Hours by mark:** Present stores 8 day-hours, Half-day 4, Absent and Leave 0. So **leave is unpaid today**, and so are holidays unless worked.
- **Agents:** their rates are all 0.
- **Phase 3** will propose paid leave / paid holidays / no-pay / half-day treatment within this model, for approval first.

## 8. Phase 2 and Phase 3 (planned)
- **Phase 2: leave requests and approval.**
  - Leave types, requests and per-day rows.
  - The check before submitting: working days, balance, overlap, short-leave limit, the no-pay split.
  - Manager approval: approve / reject / part-approve, with no self-approval (NIC + requester), and a Manager-requester going to the Administrator.
  - On approval, attendance is filled and locked, and dispatch shows the agent on leave.
  - Cancel / withdraw.
  - A Leave Requests page, plus a live portal notification feed (the header bell is mock data today).
- **Phase 3: leave policies and balances.**
  - Leave policies per category (versioned, `leavePolicy` permission) and balances per calendar year.
  - The Attendance & Leave tab gets balances and history.
  - The payroll proposal.
