# Agent Dispatch — Explained in Plain English

This page explains, without technical language, what the **Collection Agent Dispatch** feature does and why.
The detailed technical version is [Collection-Agent-Dispatch-Addendum.md](Collection-Agent-Dispatch-Addendum.md).
That document adds to the existing Collection screens; it does not replace them.

---

## The problem it solves

Every day at the tea factory, **collection agents** drive to estates, weigh the tea leaves, and bring them in.
Before this feature, the system had no good answer to these everyday questions:

- Who is responsible for collecting from this estate **today**?
- What happens when an agent is **sick or absent**?
- How do we know whether an agent has **started work**?
- A delivery can contain **more than one quality of tea**. How do we record that?

Dispatch answers all of these.

---

## 1. Requests go to a route, not a person

A **route** is a fixed set of estates visited in one trip (for example "Route 7").

Instead of tying every request to one named agent, the system ties it to the **route**.
Then it works out who is covering that route right now, using three simple rules in this order:

1. **A cover agent**, if someone is temporarily covering the route today.
2. Otherwise the **permanent agent** who normally owns the route.
3. Otherwise **nobody**. The route shows as "Unassigned".

**Why this matters:** if an agent is absent and someone covers, the requests simply follow the cover.
When the cover ends, the requests go back to the original agent. Nobody has to re-enter anything.

---

## 2. The Agent Dispatch Board

This is a new page for factory staff, at *Tea Leaf Collection → Agent Dispatch*.

**Left side, a table of agents.** For each agent it shows:

| Column | What it tells you |
|---|---|
| Agent | Their name |
| Route | Which route they handle (or "Covering Route X") |
| Status | Not started, On route, Completed, Absent, or Covering |
| Progress | How many kg they have collected so far today |
| Last seen | How recently their phone reported a location |

**Right side, a map** showing where agents are and the path of each route. Click an agent to highlight their route.

**"Last seen" never says "live" or "real-time".** A phone's location can be a few minutes old, and the board is honest about that:

- Under 5 minutes old: green, shown as "3 min ago"
- 5 to 30 minutes old: amber
- Older than that: grey, shown as "Last seen 08:14"

**Missed check-in alert.** If an agent hasn't started their shift by the factory's cut-off time (6:00 am by default), a warning banner appears.
It is only a warning for the officer. The system **never marks someone absent on its own**.

---

## 3. Location tracking, with limits

The agent's phone sends its position, but only under strict rules:

- **Only during a shift.** Nothing is recorded before they start or after they finish.
- **Works with a poor signal.** If the phone is offline, it saves the positions and uploads them later. Each one keeps the time it was really taken.
- **Off-shift positions are refused.** So are positions with a time in the future (a wrong phone clock, for example).
- **Kept for 30 days, then deleted** automatically every night.
- **Phone screen stays on during a shift this round.** Tracking in the background is planned for later.

---

## 4. Changing who owns a route

When an officer reassigns a route, they choose one of two options:

| Option | What it means | Who can do it |
|---|---|---|
| **Today only** | A one-day swap. Takes effect immediately. Tomorrow the route goes back to its owner. | Officers |
| **From now on** | The current owner's assignment ends and the new agent becomes the permanent owner. | Managers (needs approval permission) |

Safety rules:

- If the current agent has **already collected** on that route today, the system refuses the change and warns the officer.
- A permanent owner can only have **one route** at a time.
- Every change is **recorded in an audit history**.

---

## 5. When an agent is absent

An agent can be absent in three ways: they mark themselves unavailable on their phone, an officer marks them absent, or the missed check-in alert prompts an officer to check.

Then the system **suggests who could cover**, best first. It never picks anyone automatically. It ranks candidates by:

1. **Closeness.** Agents on neighbouring routes come first.
2. **Workload.** Agents with fewer stops left today come next.
3. **A soft daily limit.** Each agent has a "best day" in the last 30 days. If the extra route would push them past it, they get a **warning, not a ban**.

Agents who are absent, who have finished their shift, or who are already covering another route today are left out. Each agent covers **one route per day**.

**The conversation:**
1. The officer picks a candidate and sends a request, such as "Route 7, 14 stops, about 380 kg expected".
2. The candidate taps **Accept** or **Decline** on their phone.
3. If they don't answer within **15 minutes**, the request lapses and the next candidate is suggested.
4. A cover lasts for one day. It ends early if the original agent is marked available again.

---

## 6. Logging an exception: pick the estate first

Sometimes an officer logs a delivery by hand, because a pickup happened outside the normal flow.

**Before:** the officer chose an estate, a route and an agent separately. They could easily disagree.

**Now:** the officer picks **only the estate** (search by estate name, owner name or registration number). The system fills in the rest:

- The **route** comes from the estate.
- **Today's agent** comes from the route, shown with a "covering" badge if a cover is active.

The entry stays **provisional** until that agent confirms the real weight on their phone.

---

## 7. Deliveries with more than one grade

Tea comes in different quality grades (currently **Super** and **Normal**). One delivery can contain both.

- **Agents and estate owners only record the estate weight**, which is what was weighed at the estate. They never choose a grade.
- **Grading happens at the factory**, by authorised staff. They split the received tea into grades, for example "Super 32 kg + Normal 12.5 kg".
- Each grade is one **grade line**, and a delivery has **at most one line per grade**.
- **The total is always the sum of its lines.** It is never typed in or stored separately, so it can never drift out of step.
- Until graded, a delivery shows **"Ungraded"**, which is a normal waiting state.
- The original estate weight is **kept**. If the factory's total differs from it by more than **5%**, the system raises a complaint automatically.
- **Payment** is each grade's weight times that grade's rate. It uses the rate that applied on the collection date, so a later price change never alters old deliveries.

---

## 8. Who can do what (permissions)

A new permission area called **dispatch** has three levels:

| Level | Lets you | Default roles |
|---|---|---|
| View | See the board | Administrator, Officer, Manager |
| Edit | Mark agents absent, send cover requests, do "today only" swaps | Officer (and Administrator) |
| Approve | Make permanent route changes | Manager (and Administrator) |

Other rules:

- Agents report **their own** absence from their phone.
- Creating or editing grade lines needs edit access to Collection. By default that is Administrator and Officer. **Managers can look but not change.**
- A "Receiving Officer" role exists in the data but is **switched off** for now.
- These settings are changeable by the administrator and are not hard-coded.

---

## 9. Separate login for agents

Agents sign in on the mobile app with their **phone number and password**. Their login only works on the agent part of the system, and staff logins only work on the staff portal.
An agent can never open the staff portal, and a staff member's login can never pretend to be an agent.

---

## 10. What this round does not include

- Tracking location in the background while the phone is locked
- Splitting one route between two agents
- A portal view for the Receiving Officer
- Working out closeness from the actual roads (for now, officers define which routes are "neighbours")
- The mobile app screens themselves. Only the server side exists, and it is tested but not yet connected to the app
- Push notifications on a real phone

---

## 11. The ground rules the team agreed

These were also added to the project notes (`Claude.md`) so every future change follows them:

1. **Grading is factory-only.** Agents and owners record only the estate weight.
2. **A delivery's total is the sum of its grade lines**, never a stored number.
3. **One place for each shared number.** Route load, an agent's daily limit, kg collected and graded totals are each calculated in one spot and reused everywhere.
4. **Everything an officer changes is recorded** in the audit history.
5. **A web-entered exception stays provisional** until the agent confirms it on mobile.

---

## Quick glossary

| Word | Meaning |
|---|---|
| **Route** | A fixed set of estates visited in one trip |
| **Agent** | The person who drives the route and collects the tea |
| **Permanent agent** | The route's regular owner |
| **Cover** | A temporary stand-in for one day |
| **Shift** | The period an agent is actively working; tracking happens only then |
| **Ping** | One location report from the agent's phone |
| **Estate weight** | The weight measured at the estate by the agent |
| **Grade line** | The weight of one quality grade within a delivery |
| **Ungraded** | A delivery the factory has not graded yet |
| **Provisional** | Entered but not yet confirmed by the agent |
