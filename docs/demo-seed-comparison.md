# Demo seed: Performance API vs expected figures (2026-11-06)

**Setup:** local tea_dev, after `npm run seed:demo`. The expected figures (`docs/demo-seed-expected.md`) come from `src/demo/demo-expected.ts`, which reads the rows directly and is written independently of `PerformanceService`.

**What was compared:** `GET /performance/team` for **October 2026** (`span=1`) and **August – October 2026** (`span=3`), for both collection agents and other staff.

**Values per agent:**
- attendance (value, num, den)
- unplanned absences
- route completion (value, num, den) and route days
- kg total
- kg vs route average (%, actual, expected)
- weight outside tolerance (value, num, den)
- fertilizer first attempt (value, num, den, owner-side, other)
- cover help (num, den)

**Values per other-staff member:** attendance, unplanned absences, leave days.

## Result
**120 values checked, 0 mismatches.**

## The one difference found on the way (seed side, fixed)
The first run showed 3 differences of 0.1 points in "kg vs route average":
- K. Weerasinghe, October: 85.9 vs 86.0
- K. Weerasinghe, Aug–Oct: 93.0 vs 93.1
- N. Perera, Aug–Oct: 105.3 vs 105.4

**Cause:** the expected calculation divided the **rounded** kg, while the service divides the exact kg and shows the counts rounded. The service follows the definition (actual ÷ expected), so the seed's calculation was corrected. No formula in the service was changed.

**Display note:** because the counts are rounded, a reader recomputing "651/757" gets 86.0%, while the cell says 85.9%. This is cosmetic. It can be changed (e.g. show one decimal on the kg) if wanted.

## Also checked (headless Firefox, as Administrator)
- **Performance:** the agents table for October, with "down" marks on K. Weerasinghe's route completion and fact-only notes.
- **Attendance grid**, October.
- **Agent Dispatch board:** the demo Routes 6 and 7 appear.
- **Tea Leaf Collection:** 729 records with Super/Normal grade lines.
- **Fertilizer Requests:** loads; the demo requests are final, under "Closed".

No page errors.
