# Dublin (Luas Red + Green) — pre-flip QA note

**Verdict: RED. Do not flip. No PR opened.**

Run by Mark on `mark/dublin-flip` (cut from master @ afc44ce), 2026-09-27.

## Summary

The adapter itself (`lib/providers/dublin.js`), its D1 pack, and the static/RT feed all check
out clean — see the green items below. But the **flip follow-through Jim's guardrails require
before any status-flip PR is opened has not been done**: there is no `qa/dublin-dogfood-gate.mjs`,
no `lib/cities/dublin/dogfood-next-train.js` module, and — critically — **no `dublin` dispatch
case in `lib/cities/live-city-api.js`, and `dublin` is not in `MULTI_CITY_IDS`.**

I verified this is not just a missing-file nitpick — it breaks the actual rider path. `api/board.js`
and `api/directions.js` only know two shapes: `isMultiCity(city)` (dispatches to
`getMultiCityDirections`/`getMultiCityNextTrain`, which have per-city `if (cityId === "...")`
branches) or the hardcoded Perth fallback. Dublin is in neither. Flipping only
`lib/providers/registry.js`'s `status` to `"live"` would make `assertCityLive("dublin")` pass, but
`api/board.js` would then fall through to the **Perth-specific branch** (`resolveAllowedStation`,
which only knows Perth station names) — never touching `lib/providers/dublin.js` at all. I
confirmed this live against a local dev server (registry still `planned`, so this reproduces the
current-state failure mode, not a hypothetical):

```
curl "http://localhost:3411/api/board?city=dublin&station=Abbey Street"
-> {"error":"City not implemented yet (planned)", ...}   # correct today, registry still planned

curl "http://localhost:3411/api/directions?city=dublin&station=Abbey Street"
-> {"error":"Unknown station"}   # wrong even today - proves directions dispatch has no dublin
                                   # case at all, independent of the registry status gate
```

`/api/directions` already proves the gap: it doesn't even go through `assertCityLive`, and it
still can't find Abbey Street, because `isMultiCity("dublin")` is `false` and the Perth-only
`resolveDirectionsForStation` doesn't know Luas stations. This is exactly the Helsinki #164 failure
mode the guardrails call out — a flip PR that ships a status change with no working rider path
behind it. Per my brief: "If that's missing, flag it back rather than opening an incomplete PR."

## What's missing (blocking)

- `lib/cities/live-city-api.js`: no `dublin` entry in `MULTI_CITY_IDS`, no `if (cityId ===
  "dublin")` dispatch case in `getMultiCityDirections`/`getMultiCityNextTrain`.
- No `lib/cities/dublin/dogfood-next-train.js` (the per-city dogfood module every other
  live-flipped multi-city relies on - see `melbourne`/`copenhagen`/`boston` equivalents).
- No `qa/dublin-dogfood-gate.mjs` (the planned gate, `qa/dublin-planned-gate.mjs`, still asserts
  `status === "planned"` and `assertCityLive("dublin").ok === false` - it would need to be
  replaced/complemented, not just left in place, once a flip is real).
- `public/brisbane-dogfood.js`: no `dublin` mount / `available` map entry.
- `public/journey-model.js`: no `dublin` in the persisted-city list (only `melbourne`,
  `copenhagen`, etc. appear).
- No `lib/cities/dublin/coverage.json` (rider-facing coverage copy - "Luas only, DART not
  covered" - doesn't exist anywhere yet).
- No `dublin`/`ireland` entry in `lib/cities/country-regions.js`, and no `Ireland` country /
  `CITY_BOUNDS` box in `public/city-session.js` or `public/app.js`.
- No `public/city-directions/dublin.json` (never generated - `scripts/write-city-directions.mjs
  --only=dublin` hasn't been run).

None of this is something I can fix myself (flag, don't fix). This is a job for a fresh Jim
dispatch in bug-fix/flip-follow-through mode, pointed at this note plus
`docs/dublin-d1/jim-handoff.md`.

## Checklist results (informational - recorded even though the run stops here)

1. **Board eligibility** - GREEN. `docs/dublin-d1/oracle-clash-report.md` has a full Board
   eligibility section, all four verdicts recorded (`in`/`in`/`out-product`/`out-mode`), no
   `undecided` rows. Adapter-level filtering matches: `classifyLuasLineId()` returns `null` (drops
   the trip) for anything that isn't Red/Green by name or hex colour, so a stray DART/bus trip on
   a shared `stop_id` can never reach a rider even before the mode-cut filter is considered. (Full
   end-to-end board sampling blocked by item 2 below - the rider-facing dispatch doesn't reach
   Dublin at all yet, so there is no live board to sample against the real API.)

2. **Live-only, no static-as-live-time** - GREEN. `grep -n "realtime:\|loadGtfsStatic\|stop_times"
   lib/providers/dublin.js`:
   - `loadGtfsStatic` (line 105, via `loadDublinStatic()`) is used only to resolve stop_id/trip_id
     - never a departure-time source.
   - `realtime: true` is set unconditionally on the returned board object (line 214) - and
     backed by `tripHasRealtimeConfirmation()` (lines 132-135), which drops any trip the RT feed
     didn't actually confirm (no `stop_time_update` for that stop, no trip-level delay) *before*
     that flag is ever set. No `stop_times` grep hit at all - this adapter never reads a static
     `stop_times.txt` departure time as a rider-facing time.
   - Stated explicitly: **no departure TIME in this adapter comes from static GTFS; static is
     stop-id/trip-id resolution only**, same posture as Melbourne (the Boston-lesson pattern is
     followed correctly here).

3. **Live cross-check against real NTA feed** - GREEN, with a caveat on sample size, and BLOCKED
   on rider-path sampling.
   - `NTA_API_KEY` is present and valid in `.env.local` (32 chars).
   - `node qa/verify-dublin-gtfs-snapshot.mjs` -> **ok**: published snapshot is real
     (`https://n1sivhxcnzarmc6t.public.blob.vercel-storage.com/gtfs/dublin.zip`, 465,806 bytes),
     2 routes (Red/Green, `route_type 0`), 1 agency (LUAS), 128 distinct stops used by kept trips.
   - `node qa/dublin-rt-join-check.mjs` (run with the real key loaded from `.env.local`) ->
     **5/5 (100%) of tellably-Luas TripUpdates resolved against the published snapshot's
     `trips.txt`** - every Luas trip_id sampled in the live feed joined cleanly. Below the script's
     own `STALE_MIN_JUDGABLE_TRIP_UPDATES` (20) threshold to auto-pass/fail on share alone, so it
     printed "sample too small to judge" rather than "ok" - **not a failure, just an inconclusive
     sample size**. This is a real-clock-time effect, not a feed problem: the check ran at ~00:59
     Europe/Dublin (confirmed via `Intl`/`toLocaleString`), and Luas's last trams are typically
     ~00:30 - the feed is winding down for the night, hence few live Luas TripUpdates versus the
     254 total (mostly other NTA-covered operators). Re-running this during Dublin daytime service
     hours would very likely clear the 20-trip threshold; I did not have a way to wait for that
     window in this session. Recommend Jim/whoever re-runs the flip re-check this at a live-service
     hour, or trust the `.github/workflows/publish-gtfs-snapshot.yml` CI step (which runs
     `dublin-rt-join-check.mjs` with real network+key already, presumably at varied times).
   - **Rider-facing `/api/board` and `/api/directions` sampling could not be done meaningfully** -
     see the Summary above. I sampled both against a local dev server and confirmed the dispatch
     gap directly rather than fabricate a "board looked fine" result from calling
     `fetchStationBoard()` in isolation, which the brief specifically warns against.

4. **Per-direction trip counts (hub + Tallaght + Sandyford), Green loop direction-exclusivity** -
   PARTIAL/GREEN at the unit level, **not verifiable end-to-end** for the same dispatch-gap reason.
   - `qa/dublin-planned-gate.mjs` (PASS) unit-tests the direction guard directly:
     `isDirectionAllowedAtStop("O'Connell - GPO", "green", "Broombridge") === true` (northbound
     allowed), `..."Brides Glen") === false` (southbound correctly rejected), and the mirror image
     for Marlborough (southbound allowed, northbound rejected), plus both directions valid at
     Trinity/Parnell (the loop's merge points). An unresolved terminus at a direction-exclusive
     stop falls open (never silently drops a real trip on a guess) - confirmed by
     `isDirectionAllowedAtStop("O'Connell - GPO", "green", null) === true`.
   - Could not pull live per-direction trip counts at Abbey Street/Tallaght/Sandyford through the
     actual board endpoint for the same reason as item 3 - there is no rider-reachable board for
     Dublin yet. `direction-model-memo.md`'s own open question 5 flags that the Parnell<->Trinity
     direction-exclusivity is unverified against live GTFS-RT trip patterns (map-only evidence so
     far); the 100%-but-small RT join sample in item 3 doesn't cover this specifically. Flag this
     as an item to actually exercise live once the dispatch gap is fixed - the defensive code looks
     right, but "the guard defends correctly against synthetic data" and "a real Green trip's
     classified direction actually matches its stop" are different claims.

5. **Hub lock, DST, doNotGroup** - GREEN.
   - Hub lock: `DUBLIN_HUB = "Abbey Street"`; `mapLineTerminusDestination(DUBLIN_HUB, "red") ===
     "Red"` (never a direction token) - asserted directly in the planned gate.
   - `isForbiddenHubProxy()` rejects Marlborough/O'Connell - GPO/O'Connell Upper/Connolly/Busaras/
     O'Connell Bridge standing in for the hub - asserted in the planned gate.
   - DST: `DUBLIN_TIME_ZONE = "Europe/Dublin"` (IANA identifier), used directly wherever the
     adapter does date/time math - no hand-rolled offset table anywhere in
     `lib/providers/dublin.js` or `lib/cities/dublin/marketing-directions.js`. Matches
     `hazard-pack.md` H7's recommendation exactly (the oracle report's "no DST since 2024" claim is
     correctly *not* carried into product code).
   - doNotGroup pairs from `hazard-pack.md` H1 all hold as distinct catalog entries (asserted in
     the planned gate): Abbey Street vs Marlborough/O'Connell - GPO/O'Connell Upper; O'Connell -
     GPO vs O'Connell Upper; Tallaght vs Saggart; Red Cow vs Kingswood vs Belgard (all four exist
     as separate stations; Marlborough is Green-only, never Red).

6. **Picker: Ireland/CITY_BOUNDS/country-regions/coverage.json** - **RED**, this is part of the
   same follow-through gap as the Summary above:
   - No `Ireland` country, no Dublin `CITY_BOUNDS` box, anywhere in `public/app.js` or
     `public/city-session.js`.
   - No `dublin` entry in `lib/cities/country-regions.js`.
   - No `lib/cities/dublin/coverage.json` at all (rider copy stating "Luas only, DART not
     covered" doesn't exist yet).
   - Station lat/lng: **none of Dublin's 67 catalog stations have `lat`/`lng`** in
     `lib/cities/dublin/stations.json` (checked programmatically - every entry is `{name, lines,
     aliases}` only). This degrades gracefully rather than crashing (`findNearestStation` in
     `lib/cities/live-city-api.js` simply skips a station with no `lat`/`lng`, so "Near me" would
     just never nominate a Dublin station) and matches the **most recent live-flip precedent**:
     Copenhagen (merged #454, currently live on master) shipped with the exact same gap - no
     `lat`/`lng` in `lib/cities/copenhagen/stations.json` either. I'm not treating this alone as a
     blocker given that precedent, but flagging it since the brief listed it explicitly - Jim
     should decide whether to backfill coordinates in the same follow-through pass as the rest of
     item 6, or explicitly accept the same gap Copenhagen shipped with.

7. **Gates / smoke** - GREEN, but the "dogfood gate" half of this item doesn't exist yet
   (see Summary).
   - `node qa/dublin-planned-gate.mjs` -> PASS (`planned`/501, adapterReady, D1 pack files present,
     67 stations, hub lock, doNotGroup, direction model, Green loop guard, missing-key/unknown-
     station both throw pre-network, Perth stays green).
   - `node qa/live-city-lists-sync.mjs` -> PASS (`39 live cities consistent across registry,
     live-city-api, app.js, city-session, brisbane-dogfood, journey-model` - confirms dublin is
     correctly absent from every live list right now, i.e. the *current* state is self-consistent;
     it does not and cannot check the missing dispatch case above, since that's an
     unregistered-city gap, not a list-mismatch).
   - `node qa/run-all.mjs --smoke` -> **PASS, 155/155, 0 FAIL, 621s** (run to completion, not
     stopped early).
   - **No `qa/dublin-dogfood-gate.mjs` exists** - this is the missing piece. Per my brief, a flip
     PR needs this gate (replacing/complementing `dublin-planned-gate.mjs`) passing with the
     adapter registered live, and it doesn't exist because the dispatch wiring it would exercise
     doesn't exist either.

## What needs to happen before I re-run this

A fresh Jim dispatch (flip-follow-through / bug-fix mode, pointed at this note plus
`docs/dublin-d1/jim-handoff.md` and the Copenhagen flip PR #454 as the pattern) needs to add:

1. `dublin` to `MULTI_CITY_IDS` and a real dispatch case in
   `getMultiCityDirections`/`getMultiCityNextTrain` (`lib/cities/live-city-api.js`) that calls
   into `lib/providers/dublin.js`.
2. `lib/cities/dublin/dogfood-next-train.js` (or equivalent) backing that dispatch.
3. `qa/dublin-dogfood-gate.mjs`, registered in `qa/run-all.mjs`.
4. `public/brisbane-dogfood.js` mount + `available` map entry, `public/journey-model.js`
   persisted-city entry, `public/city-directions/dublin.json` (via
   `scripts/write-city-directions.mjs --only=dublin`).
5. `lib/cities/dublin/coverage.json`, `lib/cities/country-regions.js` entry, `Ireland`
   country + `CITY_BOUNDS` box in `public/app.js`/`public/city-session.js`.
6. A decision (Jim/Tim) on whether to backfill station `lat`/`lng` or ship without it as
   Copenhagen did.

Once that's landed, re-run this checklist - items 3 and 4 in particular need a genuine
`/api/board`/`/api/directions` sample against a working dispatch, not just the isolated-adapter
result I could get this time.

No process left running: dev server on port 3411 stopped, smoke suite's own dev server exited
with the suite, `netstat` confirms nothing listening on 3000/3411 at time of writing this note.

