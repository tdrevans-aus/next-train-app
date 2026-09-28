# Dublin (Luas Red + Green) - pre-flip QA note (pass 8)

**Verdict: RED. Do not flip. No PR opened.**

Run by Mark on branch mark/dublin-flip-8, cut from origin/master @ fc89c3b0 (2026-09-28, ~06:10 Dublin, weekday service). Env: .env.local copied in with NTA_API_KEY present; dev server run explicitly on PORT=3411 (not 3000/3400), stopped before finishing (confirmed no listener remains).

## Summary

Everything since pass 7 checked out clean EXCEPT one new finding: item 4's rider-facing sample at Belgard shows only 2 of the 3 directions the checklist requires. `Red + Tallaght` and `Red + The Point` appear; `Red + Saggart` never does, on 15+ consecutive live polls over ~7 minutes (30s/15s cadence, both a fixture dev server pass and direct code-path probes). This is exactly the shape the brief calls a hard fail: "a walk-up service silently missing from an in-catalog station's board." Belgard is in-catalog (not excluded like Saggart itself), the schedule says Saggart-branch trains call there roughly every 3-10 minutes at this hour, and the branch is demonstrably running (Fortunestown/Citywest Campus/Cheeverstown all show live `Red + Saggart` departures throughout) - but Belgard's own board and /api/directions never surface that a Saggart-bound train is coming, with no emptyReason to explain the gap (the station isn't empty, it just quietly drops one of its two branches).

## RED — item 4: Belgard is missing its Red + Saggart chip on live boards

**Evidence (all against the flip-commit state — registry.js status temporarily flipped to "live" plus the full flip file set staged locally, then reverted after this finding; a dev server was started with `PORT=3411 node --env-file=.env.local dev-server.js`):**

1. `curl /api/board?city=dublin\&station=Belgard` polled 15 times (5 polls at 30s spacing, then 5 more at 30s, then 5 more at 15s) between 06:21 and 06:33 Dublin time: every single response's `entries` array was `["Red", "Red + Tallaght", "Red + The Point"]` (or `["Red + Tallaght", "Red + The Point"]`) - never `Red + Saggart`.
2. `curl /api/directions?city=dublin\&station=Belgard` at the same time: `{"directions":["Red + Tallaght","Red + The Point"],"source":"dublin-live-board"}` - confirms the gap is not a board-vs-directions inconsistency, both rider-facing paths agree, and agree wrongly.
3. Cross-check at Fortunestown and Citywest Campus (Saggart-branch-only stations downstream of the Belgard fork): both returned a live, realtime:true `Red + Saggart` departure on every check during the same window - the branch is genuinely running.
4. Called `fetchStationBoard('Belgard', { apiKey, horizonMinutes: 90 })` directly: `scheduledCandidates` contains ~9 `Red + Saggart` entries in that 90-minute window (the static schedule expects Saggart trains at Belgard regularly), but `trips` (the realtime-confirmed set) contains zero - every single Saggart-destined candidate fails `tripHasRealtimeConfirmation` for Belgard's two stop_ids (8230GA00347/8230GA00348), while several Tallaght-destined candidates in the same window pass.
5. Direct feed inspection: of 21 statically-scheduled Saggart-bound stop_times at Belgard within +/-90min of now, 0/21 trip_ids appeared anywhere in the live TripUpdates feed at one check; a later check did find one Saggart trip_id (5858_2400) in the feed with a stop_time_update for Belgard's stop_id 8230GA00347, but its departure.time was the literal protobuf zero-value (correctly treated as absent per readStopTimeEventSec/qa/gtfs-rt-zero-time-gate.mjs's documented fallback-to-schedule behaviour) - yet the trip still never appeared as a confirmed board entry across five more polls afterward. In the same window, several Tallaght-bound trip_ids WERE present with real (non-zero) departure times and did show up.
6. This is not the already-documented Connolly/Saggart out-feed pattern (that's a station-level gap on Saggart's OWN board, already correctly filtered with a coverage-note exclusion) - this is a NEW, direction-specific gap at Belgard, an in-catalog, non-excluded station, and the checklist's explicit acceptance criterion ("Belgard shows Red + Tallaght and Red + Saggart") fails on it.

This looks like a real NTA GTFS-RT feed gap specific to the Saggart-direction platform/stop_id or the trips that serve it as they pass through Belgard (not a bug in lib/providers/dublin.js's own filtering - the pipeline correctly recognises the scheduled candidates and correctly requires realtime confirmation before showing anything, per the live-only rule; the RT feed itself just isn't confirming these particular stop_time_updates at this shared trunk station). It needs the same kind of foreground, multi-poll, side-by-side investigation Jim already did for Connolly and Saggart (docs/jim-brief-dublin-connolly-realtime-gap.md, docs/jim-brief-dublin-saggart-rialto-gaps.md) before a verdict can be recorded: is this permanent (needs a Board-eligibility correction + likely a Belgard-Saggart-direction coverage note, similar shape to Connolly/Saggart) or an early-Monday-morning transient (same shape as Red Cow/Kylemore/Rialto's already-documented brief gaps)? Either answer is fine, but it must be recorded with evidence before a flip PR can open - right now it is neither excluded nor honestly empty, it is just silently wrong.

## Everything else checked (green)

**1. Board eligibility (docs/dublin-d1/oracle-clash-report.md).** No `undecided` rows. Luas Red + Green both `in`; DART `out-product` (v2 scope); Dublin Bus/Bus Eireann/Go-Ahead Ireland `out-mode`; Connolly `out-feed` (27 Sep correction); Saggart `out-feed`, Rialto explicitly confirmed `in` (27 Sep correction). All boards Luas-only.

**2. Live-only grep on lib/providers/dublin.js.** Explicit: "NTA_API_KEY ... MissingNtaApiKeyError ... propagates rather than a silent timetable fallback" (file header); `dropUnconfirmedTrips`-equivalent (`classifyAndFilterDublinTrips`'s `confirmed = trips.filter(tripHasRealtimeConfirmation)`) never presents a scheduled-only time as live; `emptyReason: "no-live-predictions"` covers the honest-empty case instead of a schedule fallback.

**3. Static/RT scripts, all exit ok:**
- `node qa/verify-dublin-gtfs-snapshot.mjs`: ok (published snapshot 465806 bytes, agency LUAS, routes Red/Green, 128 distinct stops used by kept trips).
- `node --env-file=.env.local qa/dublin-rt-join-check.mjs`: ok, 50/50 (100%) Luas-classified TripUpdates resolved against the static snapshot.
- `node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs`: ok, exit 0, 65 catalog stations swept over 18 polls/9 min. Only The Point had any empty poll (1/18), with emptyRunSeconds:0 and observedNonEmpty:true - not a real gap, well inside its headway threshold. No station required exclusion beyond the already-excluded Connolly/Saggart. Sweep log appended to docs/dublin-d1/live-sweep-log.jsonl (runId sweep-2026-09-28T05:18:15.221Z).

**4. Rider-facing /api/board + /api/directions, sampled at flip-commit state (registry status temporarily set to "live" + full flip file set applied, then reverted - see below).** Abbey Street, Tallaght, The Point, Brides Glen, Broombridge, Sandyford, Marlborough, Rialto, Red Cow all returned correct, fast (<0.4s after the one-time cold-cache 3.1s first call), realtime:true entries with no self chips and correct direction sets. Green city-centre loop exclusivity held (Brides Glen only showed `Green`, its own terminus never self-referenced; Marlborough only showed `Green + Brides Glen`, matching the northbound/southbound-only rule). **Belgard is the one RED item, detailed above** - it returned entries and both Tallaght and The Point directions correctly, but never Red + Saggart across 15+ polls.

**5. Hub lock / doNotGroup / timezone.** `Europe/Dublin` is the literal IANA zone string (`DUBLIN_TIME_ZONE`, marketing-directions.js) - no hand-rolled offset. Hub lock `Abbey Street` (`DUBLIN_HUB`) confirmed, never used as a direction token. doNotGroup pairs (Abbey Street vs Marlborough/O'Connell - GPO/O'Connell Upper; O'Connell - GPO vs O'Connell Upper; Tallaght vs Saggart; Red Cow vs Kingswood vs Belgard) all present in lib/cities/dublin/marketing-directions.js and exercised by qa/dublin-dogfood-gate.mjs.

**6. Registry-driven flip mechanics.** With the flip file set applied: /api/cities listed dublin live with country Ireland ("ie"), correct bounds, directionsVersion, modes light_rail; `node scripts/write-city-directions.mjs --only=dublin` produced 65/65 stations with chips; `node scripts/write-city-manifest.mjs` wrote 42 cities / 13 countries (Ireland newly present); no edits needed to public/app.js, city-session.js, brisbane-dogfood.js, or journey-model.js (registry-driven client, confirmed by qa/registry-driven-client.mjs passing unmodified).

**7. Gates at flip state, all green:**
- `node qa/dublin-dogfood-gate.mjs` (run plain, no API key - by design): ok, full summary including "missing-key throws surfaced consistently across dogfood/dispatch/directions/next-train".
- `node qa/live-city-lists-sync.mjs`: ok, 42 live cities consistent.
- `node qa/country-regions-sync-gate.mjs`: ok, 42 entries consistent.
- `node qa/registry-driven-client.mjs`: ok, all 5 Playwright sub-checks pass.
- `node qa/honest-empty-state.mjs` (against the dev server on :3411): ok, both the offline and browser checks pass.
- `node qa/coverage-notes-gate.mjs` (against :3411): PASS, 42 live cities all have valid coverage.json.
- `node qa/run-all.mjs --smoke`: **not run** - stopped once item 4's Belgard finding made the overall verdict RED, per the "no fixes, no flip PR" instruction; no point burning a ~8min smoke run against a flip state that's being reverted anyway. Happy to run it on the next pass once Belgard is resolved.

## What changed since pass 7

#487's coverage.json rider-prose rewrite is fine - qa/coverage-notes-gate.mjs and the live sweep both pass, and nothing about Connolly/Saggart's existing exclusions changed. The Belgard finding above is new to this pass; it wasn't caught in pass 7 (which was RED for a different, since-fixed reason per that pass's own note on origin/mark-qa-note history) or apparently in earlier green-looking passes, because it requires watching a specific shared-trunk station's board across multiple live polls rather than a single snapshot - a single `/api/board` call at Belgard looks completely healthy (two of its two branches show fine, it's not empty, there's no error) and only repeated polling over several minutes reveals the third direction never shows.

## What I did NOT do

Did not touch lib/providers/dublin.js, lib/cities/dublin/*, or the D1 pack - flag, don't fix, per role. Applied and then fully reverted the flip file set (lib/providers/registry.js status, lib/cities/country-regions.js, lib/cities/live-city-api.js, lib/cities/city-bounds.js comment, public/city-directions/dublin.json, public/city-manifest.seed.{json,js}) so this branch carries no live-flip changes - only this note plus the live-sweep-log.jsonl append survive. Did not open a flip PR. Did not merge anything. No background process left running (dev server on :3411 confirmed killed; no other listeners started).

## Recommendation

Two options: (a) a fresh Jim brief (docs/jim-brief-dublin-belgard-saggart-direction-gap.md) to do the same foreground multi-poll/side-by-side investigation as the Connolly and Saggart briefs, resulting in either a Board-eligibility correction + coverage note (if permanent) or a documented transient-gap precedent entry (if not, same shape as Rialto); (b) a ninth Mark QA pass at a different time of day/week to rule out an early-Monday-service-start artifact before spending Jim's time. I'd pick (a): the schedule-vs-confirmed mismatch was 0/21 trip_ids across a 90-minute static window, not a borderline case, and Belgard is a shared-trunk, doNotGroup-guarded station that riders hit constantly - it deserves the same rigor Connolly and Saggart got rather than a re-poll-and-hope.
