# Jim brief — Near me: the nearest station decides the region, not the first box

**Lane:** bug-fix / product mode. `tim-review: no` — Tim chose this option on 16 Sep 2026
("go with option 1, build it, QA it, merge it"). **Lane lock:** none (`public/`, `api/`
if needed, `qa/`). Foreground smoke with explicit `timeout: 600000`; tail the output file in the
foreground if backgrounded; never park; leave nothing running.

## Problem

`hintCityFromCoords(lat, lng)` in `public/city-session.js` (~line 336) returns the **first**
`CITY_BOUNDS` entry whose box contains the rider. Where regions overlap, first-match wins
regardless of what is actually nearby:

- Central London: `uk-london-tfl` is listed before `london-se-national-rail`, so a rider
  standing at King's Cross, Waterloo or Victoria is hinted to the Tube region and has to switch
  by hand to see National Rail departures (open since 7 Sep 2026;
  `docs/jim-brief-city-bounds-order-after-geocode.md` allow-listed the termini instead of
  fixing it).
- Cheshunt-type overlaps: any station inside another region's box but catalogued elsewhere.
  Yesterday's fix (#402) worked around one instance with a second box; this brief fixes the
  class.

Since the country-wide picker (#383) the region split is invisible when searching by name, so
this is now purely a Near me problem.

## Design (decided)

When a location fix is available, resolve the region from the **nearest station that has a live
feed**, across every live region in the rider's country, and hint that station's region. Fall
back to the current first-box behaviour only when no station is within a sensible radius
(use the radius Near me already uses for "no station nearby"; if none exists, 15 km) or when
the country list is unavailable (offline/cold start).

Implementation notes:

1. Near me already computes a nearest station somewhere (`getNearbySession` / the
   `/api/board?lat&lng` path and `NearbyPinHelper` on Android). Reuse whatever the web path
   already fetches; do not add a new geolocation prompt or a new server round-trip on the hot
   path if the country list (`/api/country-stations`, cached since #383/#390) is already in
   memory — a haversine over that list is cheap. If the web currently resolves nearest-station
   server-side, prefer extending that response with the station's `region` (it already carries
   one per row in `country-stations`) over duplicating logic client-side. Say which you chose.
2. `hintCityFromCoords` keeps its signature for callers that have no station data (the GPS
   region-follow on boot, `qa/` scripts) but gains a companion, e.g.
   `hintCityFromNearestStation(lat, lng, stations)`, and the Near me path uses the companion.
   Do not change how a rider's explicit region pick (`regionExplicit`) is respected: an explicit
   pick still wins over any hint.
3. `CITY_BOUNDS` stays as the fallback and for the boot-time follow; do not remove boxes. The
   `london-se-national-rail`-inside-TfL allow-list entries in `qa/uk-city-bounds-overlap-gate.mjs`
   stay, since the gate tests boxes, not the new resolver.
4. Android: the native Near me (`NearbyPinHelper`) has its own resolution. Check whether it
   suffers the same first-box issue; if it does, fix it the same way using the journey/pin's
   station region, and note it rides into the next Android release. If it doesn't, say why.

## Acceptance criteria

1. New QA script `qa/near-me-nearest-station-region.mjs` in the smoke tier: seeds a location at
   King's Cross (51.5308, -0.1238) → region `london-se-national-rail`, board for King's Cross;
   at Bank (51.5133, -0.0886) → `uk-london-tfl`; at Cheshunt (51.7027, -0.0243) →
   `rest-of-england`; at Burnham-on-Crouch → `greater-anglia`; a coordinate 40 km from any
   station → falls back to the first-box hint; an explicit region pick is not overridden by the
   hint. Use the existing fixture/seeding helpers (`qa/helpers/country-stations-fixture.mjs`,
   the geolocation stub from `qa/country-wide-picker.mjs`); no live geolocation.
2. `qa/nearby-location-hint-keeps-cache.mjs`, `qa/nearby-cache-last-station.mjs`,
   `qa/country-wide-picker.mjs` and `qa/region-selection.mjs` still pass.
3. `node qa/run-all.mjs --smoke` green; if Android changed, `:app:testDebugUnitTest` green.
4. Help copy for Near me (`public/index.html`) still accurate; change it only if it describes
   the region hint, and put any new wording in the PR body.

## Process

Worktree from current master; copy this brief in; commit, push; PR "Near me: hint the region
of the nearest live station, not the first bounding box".

## Round 2 (16 Sep 2026) — Mark FAIL on PR #403

Mark's note: https://github.com/tdrevans-aus/next-train-app/pull/403#issuecomment-5690208145

Everything passed except the headline case: at King's Cross (51.5308, -0.1238) the real UI
still lands on `uk-london-tfl`, because the Tube stop "King's Cross St. Pancras" is 44.6 m away
and National Rail's "London King's Cross" is 61.2 m away. "Nearest wins" is correct as coded and
still gives the wrong answer at every major interchange, where the Tube entrance is usually the
closer coordinate. The QA fixture seeded only the National Rail station, so it could not catch
this. Continue on the same PR branch:

1. **Tie rule (decided by the controller).** Treat stations within **250 m** of the nearest one
   as co-located candidates. Among co-located candidates, prefer a National Rail (Darwin-fed)
   station over a metro/tram/TfL one; otherwise keep nearest. Rationale: at an interchange the
   National Rail board is the one a rider cannot get elsewhere (the Tube is one region-filter tap
   away and its trains run every few minutes), and Tim's stated expectation for this option was
   "a rider at King's Cross gets National Rail, a rider at Bank gets the Tube". Bank has no
   National Rail station within 250 m, so it still resolves to TfL. Implement it as data-driven
   (feed type from the region, `isDarwinCityId` already exists), not a London special case, so
   Glasgow Queen Street/Buchanan Street and Newcastle Interchange behave the same way.
2. **Fix the fixture.** `qa/near-me-nearest-station-region.mjs` must seed the competing stops:
   King's Cross with both the Tube stop (closer) and the NR station, asserting NR wins; Bank with
   only Tube stops within 250 m, asserting TfL; add Waterloo (Tube vs NR) and Glasgow Queen
   Street vs Buchanan Street (Subway, liveFeed false so it must not even be a candidate). Also
   add a case where two Darwin stations are co-located (e.g. a doNotGroup pair) asserting
   nearest wins among equals.
3. Re-run the named scripts and `node qa/run-all.mjs --smoke` (foreground, explicit 600000 ms
   timeout, tail in the foreground if backgrounded), push to the same branch, and comment on
   the PR that round 2 is ready, including the real-UI check Mark did (geolocation seeded at
   King's Cross with `fixture=normal`, no `test=1`) and its result.
