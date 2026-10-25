# Jim brief — shared GTFS builder: keep previous-service-day trips after midnight

**Lane:** bug-fix / product mode. **Scope:** shared code, `lib/providers/gtfs/board.js`, which every GTFS
city uses. **Date:** 25 Oct 2026. **tim-review:** no.
**Tim's decision (25 Oct, Option B):** fix this as well as the LA pre-flip items, and run a full
regression.
**Lane lock:** this is shared code, not a city lane. You need a lock only if you edit a city adapter:
editing `lib/providers/melbourne.js` means `check australia`, then `acquire australia melbourne jim
<branch>`. **Another Jim is editing `lib/providers/los-angeles.js` and `qa/los-angeles-planned-gate.mjs`
in parallel (PR to come), so don't touch those files.**

## Symptom

`buildBoardForStops` (board.js ~515) and `collectTodayAndTomorrow` (~372) collect trips only for
**today's and tomorrow's** service days. GTFS files late-night trips on the *previous* service day,
with times past 24:00 (e.g. `25:10:00`). Between midnight and the end of the previous day's overnight
running, those trips are missing from every board.
- **Melbourne:** Friday Night Network, measured on 25 Sep. Flinders Street had 14 live directions at
  23:54 and 0 at 00:00:25. There were 37 departures in that hour, filed on Friday's service.
- **LA:** Mark's #520 probe noted the same gap for Metro Rail after midnight.

`hasScheduledServiceToday` (~339) has the same blind spot. Just after midnight it can tell a served
station it is "not currently served" (the `emptyReason` Prague introduced in #497).

## Prior art (port the idea, don't merge)

Open PR #442 (branch `cursor/melbourne-overnight-board-cb1a`, from a Cursor agent on 25 Sep) adds
yesterday's service day. It's a month stale: board.js has changed since (#509–#511) and its CI is red.
Read it with `gh pr diff 442`, and reuse its test idea, `qa/gtfs-service-day-overnight.mjs`.
**#442 also bundles a second change: "a TripUpdate that names a trip confirms every stop on it". That
is OUT of scope.** It loosens the live-only rule (LA now requires a stop-level prediction or a
trip-level delay), and it's a product decision. List it as a follow-up in your PR description and
don't implement it.

## Fix

1. Also collect the **previous** service day (yesterday's active services), but keep only trips whose
   scheduled departure at these stops is still in the future and inside the horizon. Use the existing
   `scheduledDepartureDate(serviceDateYmd, departureTime)` arithmetic, which already handles
   `HH >= 24`. Do this on **every** call path, the near-horizon path included, not only when the board
   is empty. A trip filed yesterday at 24:40 is a valid next train at 00:20.
2. Deduplicate: the same trip must never appear twice through two service days.
   `sortAndDedupe` keys on departure, destination and platform. Check that a trip_id can't double-count.
3. `hasScheduledServiceToday`: a station served by yesterday's overnight trips that are still running
   counts as served. Avoid false "not currently served" verdicts after midnight.
4. Don't change the live-only rules, `tripHasRealtimeConfirmation`, the horizon constants or any
   `maxDuration`. Performance: the extra service-day scan must not make cold boards slower in any
   measurable way. Tim's rule is under 3 s warm and under 10 s cold at the big hubs, and the 30 s cap
   is a ceiling, never loosened. Measure Sydney Central and Melbourne Flinders Street before and after
   (`BOARD_TIMING=1`, see #511).
5. If Melbourne's adapter (`melbourne.js`) needs a matching change, as #442 did, make it, with the
   australia lock.

## QA

- Add `qa/gtfs-service-day-overnight.mjs`, offline with synthetic static data and an injected `now`:
  - At 00:20, a trip filed yesterday at `24:40:00` appears.
  - At 00:20, a trip filed yesterday at `23:50:00` (already gone) does not appear.
  - No duplicates across yesterday, today and tomorrow.
  - `hasScheduledServiceToday` is true at 00:20 for a stop served only by yesterday's `24:30` trip.
  - At 14:00 the output is unchanged from before (no daytime regression).
  - A DST-change night (Europe/London 25 Oct 2026 and Australia/Melbourne 5 Apr 2026) produces correct
    instants.
  
  Register it in `run-all.mjs` with the other offline gates.
- Mutation check: each assertion fails with the fix reverted.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground). Mark runs
  the full regression afterwards, so you don't need to.
- If it's after midnight local in a running city while you work (e.g. Melbourne or Sydney on a weekend
  night), take a live sample. Otherwise rely on the offline gate.

Open a PR titled "GTFS boards: keep previous-service-day trips after midnight (all GTFS cities)", linking
this brief and #442. Note in the PR that #442 should be closed in its favour, but don't close #442
yourself. Leave no background loops running.
