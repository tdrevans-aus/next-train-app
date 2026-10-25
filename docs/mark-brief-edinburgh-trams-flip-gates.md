# Mark brief — Edinburgh Trams: flip gates G2–G6 (QA only, no flip PR yet)

**Date:** 25 Oct 2026. **Run during Edinburgh tram service hours** (roughly 05:00–00:00 Europe/London;
UK clocks went back to GMT today).
**Input:** `docs/edinburgh-trams-d1/hazard-pack.md` (the G1–G6 table), `jim-handoff.md` ("For Mark's flip
PR" and "Flip prep"), and the code on master: #523 and #524. `tramsLive` is `false` on master. **G1 is
closed** by Tim's decision of 24 Oct, recorded in hazard-pack. `EDINBURGH_BUSTRACKER_KEY` is in the main
checkout's `.env.local` and in Vercel (production included). Never print it.

Write the results to `docs/edinburgh-trams-d1/mark-flip-gates.md` and commit them on a branch, with a PR
titled "docs: Edinburgh Trams flip gates G2–G6 results". **Don't open the flip PR yet, and don't change
`tramsLive`.** The controller decides the flip from your results.

Run every check through the real adapter with the switch forced on in-process. Use the planned gate's
switch-ON harness pattern (`qa/lib/edinburgh-trams-on-state.mjs`), but with the real fetch. Keep the rate
modest: ≥1 s between calls, and the 20 s per-platform cache helps.

- **G2 — real-time sampling.** Poll Haymarket 1 and 2, Edinburgh Airport 1, Picardy Place 1 and 2, and
  Newhaven 2 every 90 s for at least 60 min. Check that:
  - countdowns fall between polls;
  - events disappear as trams depart;
  - predicted clock times move off schedule when trams run late;
  - `pred == sched` values don't persist through visible delays (the echo test);
  - times convert correctly to Europe/London **now that it's GMT** (UTC == local);
  - the board's next-tram matches the raw countdown within 60 s.

  Haymarket 1 and 2 are filtered out of the catalog for the flip. Poll them raw through the adapter as
  evidence anyway. Note anything that looks stale, like the two Airport trams one minute apart that Jim
  saw.
- **G3 — feed provenance.** Find evidence that this feed is the same one behind the official
  Edinburgh Trams / Lothian app departures or the stop displays: public statements, Transport for
  Edinburgh pages, or matching departures if a public web board exists. Record "confirmed" or
  "plausible, unconfirmed", with sources.
- **G4 — other operators.** `Get Stop Services` (or the equivalent) at all 23 tram stops. Is anything
  other than EDT T50 listed? If so, give a board-eligibility verdict for each one (walk-up rule).
- **G5 — stop order.** Use `Service Timetable` and `Stop Timetable` to confirm the 23-stop order
  Airport→Newhaven and that trams run end to end. Flag any short-workings.
- **G6 — all-stations sweep.** Every one of the **21** in-catalog tram stops returns live trips with
  `realtime` live at least once in a 30-minute window (honest-empty-state rule: intermittent gaps get the
  empty-state copy; a stop never served gets filtered with a coverage note). Measure each board's warm
  and cold latency; **boards must be under 3 s warm and under 10 s cold**. Check the API's rate limit
  under the sweep and record any 429s.

Also confirm on a Vercel preview or production deployment, without flipping, that
`lib/cities/edinburgh/trams-api.json` is present in the function bundle (from #524's static import).

Finish with a table: each gate PASS/FAIL with one line of evidence, plus your flip recommendation (go /
no-go, and any blocker). No background loops. Never kill a process you didn't start.
