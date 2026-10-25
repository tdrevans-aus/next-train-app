# Jim brief — Los Angeles: honest empty state (flip prerequisite)

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. Acquire the lane lock:
the controller checked on 25 Oct 2026 and it was free. **Date:** 25 Oct 2026. **tim-review:** no.
The copy reuses the existing approved strings. Tim's rule is in memory "honest empty state",
27 Sep 2026.
**Input:** Mark's #525 PASS note (https://github.com/tdrevans-aus/next-train-app/pull/525#issuecomment-6391740436),
which includes the flip-prep sweep.

## Symptom

Mark's all-110-station live sweep (24 Oct, ~18:00 PDT) found 107 stations live. **Wilshire/La Brea,
Wilshire/Fairfax and Wilshire/La Cienega (D Line) had zero trips on both polls.** The current timetable
(`RJUN26-802-*-31/32`) runs no D trip west of Wilshire/Western. The 294 trips ending at La Cienega
exist only in the `-90` services starting 1–7 Nov. So this is a genuine "not currently served" state,
not a join bug. LA's board returns a silent empty list with no `emptyReason`, so riders would see a
blank board.

## Fix (follow Prague's pattern, `lib/providers/prague.js` ~466–499; Dublin's ~368)

On an empty LA board:
- `emptyReason: "not-currently-served"` when the station has **no scheduled service today**.
  Use the shared `hasScheduledServiceToday({ stopIds, staticData, timeZone, now })` from
  `lib/providers/gtfs/board.js`. **Don't edit board.js**: PR #526 is changing it and is close to
  merging, so call it as it is.
- `emptyReason: "no-live-predictions"` when service is scheduled but no live prediction survived the
  live-only filter.
- If `hasScheduledServiceToday` throws, omit `emptyReason`. Never turn a board into an error.

Make sure `api/board.js` and the client already render both reasons for LA, as they do for Prague and
Dublin. Wire it if a city allowlist gates that. The rider copy is the existing approved copy, so don't
write new strings.

The three D stations stay **in the catalog**. Service returns automatically when the `-90` services
start, as it does for Prague's Line C. Don't hardcode station names or dates. Detection must come from
the static feed.

## QA

- Extend `qa/los-angeles-planned-gate.mjs`, offline with fixtures:
  - a station with no scheduled service today gives `not-currently-served`;
  - a station with scheduled service but no live rows gives `no-live-predictions`;
  - a station with live rows gives no `emptyReason`;
  - a throwing `hasScheduledServiceToday` gives no `emptyReason` and no error.
- Mutation check on each assertion.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground).
- Live check if it's LA service hours: Wilshire/La Brea returns `not-currently-served`, and Union
  Station still has live trips. `SWIFTLY_API_KEY` is in the main checkout's `.env.local`. Never print
  it, and stay under 180 requests per 15 min.

LA stays `planned`. Open a PR that links this brief and leave no background loops running.
