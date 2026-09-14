# Jim brief — Sydney: add NSW TrainLink intercity and Hunter line stations

**Lane:** expansion-style adapter and catalog work under Tim's API-in-scope rule (13 Sep 2026:
"if it has an API it is in scope"), dispatched by Tim on 14 Sep 2026 ("Go ahead and do the
Sydney intercity fill"). `tim-review: no` for the wiring; board-eligibility verdicts recorded
per `docs/board-eligibility-rule.md`.
**Lane lock:** Australia. `node qa/lane-lock.mjs check australia` (free at 14:40 UTC 14 Sep),
then `acquire australia sydney jim <branch>` before touching `lib/providers/` or `lib/cities/`.
Leave no background loops, pollers or dev servers running.

## Symptom

`lib/cities/sydney/stations.json` holds 182 stations from the `sydneytrains` feed plus Metro.
None of the intercity network is present: no Katoomba, Lithgow, Springwood (Blue Mountains),
Gosford, Wyong, Newcastle Interchange (Central Coast & Newcastle), Kiama, Wollongong,
Thirroul (South Coast), Moss Vale, Campbelltown-beyond (Southern Highlands), or Maitland,
Telarah, Dungog, Scone (Hunter). These are walk-up Opal services; Transport for NSW publishes
them with real-time under a separate feed pair (`v1/gtfs/schedule/nswtrains` and
`v2/gtfs/realtime/nswtrains`, same API key header as the existing two). A Gosford or
Wollongong commuter opening the app finds nothing, the same complaint Tim raised for Glasgow.

## What exists

- `lib/providers/sydney.js`: `loadGtfsStatic` for trains and metro merged with
  `mergeGtfsStaticData`; `fetchTripUpdates` for both merged with `mergeTripUpdateEntities`;
  `tfnswAuthHeaders`. Static is fetched from TfNSW directly (no Blob snapshot), so no
  `gtfs-refresh` or Blob work is needed — confirm that and note it in the PR.
- `lib/cities/sydney/published-network.json` line 31: "Modes v1: Sydney Trains T1–T9 + Metro
  M1 only. No … NSW TrainLink regional." Line 34 notes Helensburgh marked SCO. That scope line
  was a D1 cut, now superseded by Tim's rule.
- Gates: `qa/sydney-dogfood-gate.mjs`, `qa/sydney-direction-match.mjs`,
  `qa/sydney-direction-match-negative.mjs`, plus the line map in `lib/cities/sydney/`.
- Newcastle Light Rail is its own city (`newcastle`), hub "Newcastle Interchange". The heavy-rail
  Newcastle Interchange belongs in **sydney** (it's on the sydney/nswtrains network), tagged by
  region in the country-wide picker; do not merge the two cities.

## Build

1. **Feed.** Add the `nswtrains` static and real-time URLs as a third source in `sydney.js`,
   loaded and merged exactly like metro. Filter to rail route types. Cache/TTL as the existing
   feeds. Measure the static zip size and load time and put both in the PR; if it pushes the
   cold request path past what `api/board.js` tolerates, say so and propose the trim rather
   than shipping a slow board.
2. **Board eligibility.** The `nswtrains` feed carries both walk-up intercity (Blue Mountains,
   Central Coast & Newcastle, South Coast, Southern Highlands, Hunter) and booked regional
   services (XPT, Xplorer to Dubbo/Armidale/Moree/Casino/Grafton/Melbourne/Brisbane, plus
   NSW TrainLink coaches). Under `docs/board-eligibility-rule.md`: walk-up intercity is `in`;
   services with compulsory reservation are `out-reservation` and excluded in code by
   route/agency, not by station. Record every excluded route with its verdict in
   `docs/sydney-d1/board-eligibility-intercity.md`. Endeavour/Hunter railcar services are
   walk-up: `in`.
3. **Catalog.** Add every rail stop the intercity services call at, with coordinates from the
   feed, as `mode: "train"` entries. Stations already in the catalog (e.g. Central, Strathfield,
   Hornsby, Campbelltown, Sutherland, Waterfall, Emu Plains) gain the intercity lines, not a
   second entry. Southern boundary is the feed's own Opal walk-up extent (Goulburn, Bomaderry,
   Lithgow/Bathurst per the feed's intercity route set, Scone, Dungog). Do not add stations
   only served by excluded booked services.
4. **Direction model.** Extend the Sydney line map and marketing-direction chips for the five
   intercity lines (official codes BMT, CCN, SCO, SHL, HUN) with line + terminus chips
   consistent with the T-line pattern (e.g. "CCN towards Newcastle Interchange", "BMT towards
   Lithgow", "SCO towards Kiama"). Match chip wording to the printed TfNSW network map;
   record the source in the direction-model memo. Update `public/city-directions/sydney.json`
   via `scripts/write-city-directions.mjs`.
5. **Gates.** Update `sydney-dogfood-gate.mjs` counts and add a live probe of Gosford,
   Katoomba, Wollongong and Newcastle Interchange (skip-with-reason without the TfNSW key);
   extend the direction-match gates for the new lines; add the intercity exclusions to the
   negative gate. `qa/sydney-direction-match-local-fixture` may need its fixture refreshed —
   follow `docs/jim-brief-sydney-direction-match-local-fixture.md`'s method.
6. **Coverage and notes.** Update `lib/cities/sydney/coverage.json` and the registry note;
   update `published-network.json` line 31's mode statement rather than leaving it
   contradicting the catalog.

## Acceptance criteria

1. `/api/city-stations?city=sydney` includes Gosford, Wyong, Newcastle Interchange, Katoomba,
   Lithgow, Wollongong, Kiama, Moss Vale, Maitland and Dungog; total count and the per-line
   station lists are in the PR body.
2. A live board at Gosford and at Wollongong returns intercity departures with a line +
   terminus chip; XPT/Xplorer/coach services never appear on any board (negative gate).
3. `docs/sydney-d1/board-eligibility-intercity.md` lists every route in the `nswtrains` feed
   with a verdict.
4. All Sydney gates pass; `node qa/run-all.mjs --smoke` green (foreground, 600000 ms timeout);
   `qa/sydney-direction-match.mjs` passes for the five new lines.
5. Newcastle (light rail city) untouched except a doNotGroup/note if a same-name stop needs it.

## Process

Worktree from current master; copy this brief in; commit in chunks (feed, eligibility,
catalog, directions, gates); push; PR "Sydney: NSW TrainLink intercity and Hunter lines
(API-in-scope fill)" linking this brief.
