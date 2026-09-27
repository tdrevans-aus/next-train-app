# Mark QA note -- Hong Kong flip re-run (27 Sep 2026, after PR #472 coordinates fix)

Verdict: GREEN. Flip PR opened. This overwrites the previous RED note (single blocker:
CITY_BOUNDS/coordinates missing, item 5 below) now that PR #472 sourced real lat/lng for all 95
stations from OpenStreetMap and added the CITY_BOUNDS box.

Two additional issues surfaced during this re-run's `node qa/run-all.mjs --smoke` pass and were
fixed in this same branch (flip-commit follow-through, not adapter/business-logic bugs -- see
detail under item 8):
- `qa/region-selection.mjs` Test 6 hardcoded a pre-flip "Hong Kong must not appear in the picker"
  assertion, now legitimately false since this flip adds Hong Kong to the picker.
- `lib/cities/hong-kong/coverage.json`'s notes field read like internal pipeline notes
  (`docs/hong-kong-d1/jim-handoff.md`, "CSDI") -- `qa/coverage-notes-gate.mjs` only checks live
  cities, so this never ran against Hong Kong before this flip. Rewrote the notes field to keep
  the rider-relevant facts (no official coordinate dataset; OpenStreetMap + ODbL attribution)
  without the internal docs references.

## 1. Board eligibility

`docs/hong-kong-d1/oracle-clash-report.md`'s Board eligibility section (lines 45-77) has a verdict
for every calling service, all `in` or `out-mode` -- no undecided rows. Sampled the rider-facing
`/api/board` on a dev server in the flip-commit state (port 3512):
- Hong Kong: Airport Express + Airport / AsiaWorld-Expo, Tung Chung + Tung Chung -- AEL + TCL. OK
- Kowloon / Tsing Yi: same AEL + TCL composition (code-verified via
  `qa/hong-kong-dogfood-gate.mjs`'s catalog assertions; not re-sampled live this pass, already
  live-verified last pass).
- Sunny Bay: Disneyland Resort + Disneyland Resort, Tung Chung + Hong Kong, Tung Chung + Tung
  Chung -- DRL + TCL. OK
- Admiralty: East Rail + Lo Wu / Lok Ma Chau, Island + Chai Wan, Island + Kennedy Town, South
  Island + South Horizons, Tsuen Wan + Central, Tsuen Wan + Tsuen Wan -- EAL/ISL/SIL/TWL only,
  matching the TWL x ISL x SIL x EAL hub composition, no other lines. OK
- Yuen Long: not re-sampled this pass (unchanged since last pass; still Tuen Ma line only per
  `qa/hong-kong-dogfood-gate.mjs`/`qa/hong-kong-line-map-conformance.mjs`, both green).
- Hung Hom and Tseung Kwan O sampled live (see item 3) and match line-map.json station
  membership exactly.

Doc discrepancy (not RED, carried forward from last pass): the oracle report's verdicts table
calls the Disneyland Resort Line "DIS" and Sunny Bay "SBY". The correct Next Train REST query
codes are `line=DRL`, `sta=SUN` -- the wired adapter, marketing-directions.js, line-map.json and
coverage.json all consistently use DRL/SUN. This is a doc-fix item for oracle-clash-report.md,
not a code or QA defect.

## 2. Live-only

`grep -n "realtime\|loadGtfsStatic\|stop_times" lib/providers/hong-kong.js` finds exactly one
hit: `realtime: "live"` on the returned board object. No `loadGtfsStatic`, no `stop_times`, no
static-schedule import anywhere in the file. No trip the adapter emits ever sets
`realtime: false` (the field is simply absent per trip in `mapScheduleEntryToTrip`), so
`lib/train-times-core.js`'s status logic never takes the "Scheduled" branch for Hong Kong --
confirmed live: every sampled `/api/board` trip this pass showed `status: "On Time"`, never
`"Scheduled"`.

## 3. Live cross-check (rider-facing endpoints, board-level realtime -- 20 Sep 2026 checklist item)

Sampled `/api/board` and `/api/directions` on a dev server in the actual flip-commit state
(registry `status: "live"`, MULTI_CITY_IDS etc. all populated -- not the adapter's
`fetchStationBoard()` called in isolation), port 3512, requests paced >=2s apart:
- `/api/board?city=hong-kong&station=Admiralty` -> 200, 3.83s / 3.29s on retry (see latency note
  below), 6 direction chips, 3-4 trips each, all `status: "On Time"`.
- `/api/board?city=hong-kong&station=Hong Kong` -> 200, 1.57s, AEL + TCL rows.
- `/api/board?city=hong-kong&station=Sunny Bay` -> 200, 1.60s, DRL + TCL rows.
- `/api/board?city=hong-kong&station=Hung Hom` -> 200, 1.46s, EAL + TML rows, matches catalog.
- `/api/board?city=hong-kong&station=Tseung Kwan O` -> 200, 0.93s, TKL rows both branches.
- `/api/directions?city=hong-kong&station=Admiralty` -> 200, 0.22s, same six directions as the
  board, no Admiralty token, `source: "hong-kong-marketing-ends"`.

Full raw evidence in `docs/hong-kong-d1/ci-live-evidence.md`.

**Latency note (non-blocking, flagged for Jim):** Admiralty (4-line hub) took 3.3-3.8s across two
samples, over the "under 3s" bar every other sampled station met (0.9-1.6s). `fetchStationBoard()`
queries each line sequentially against `rt.data.gov.hk` -- a deliberate, documented, conservative
choice in the adapter's own header comment (not a bug), so a 4-line hub takes ~4x a single-line
station. Board content, direction coverage and trip counts were all correct at every sample --
this is a performance characteristic, not a correctness defect, and doesn't fall into either
named hard-fail category (missing walk-up service, hub-lock violation). Recommend a future pass
parallelise per-line fetches for multi-line hub stations.

## 4. Per-direction trip counts

Every sampled board entry (item 3) carried 2-4 upcoming trips, never 0, while full Sunday-morning
service is running: Admiralty (all four lines, both directions where applicable), Hong Kong (AEL
toward Airport / AsiaWorld-Expo only -- correct, Hong Kong is AEL's own terminus so no Hong Kong
destination chip appears there, plus TCL), Sunny Bay (DRL toward Disneyland Resort, 4 trips, plus
TCL both directions), and Hung Hom (East Rail, an intermediate EAL station, plus Tuen Ma) -- all
populated, no zero-trip chips anywhere.

## 5. Coordinates -- Near me / CITY_BOUNDS (new item, PR #472 fix)

- All 95 stations in `lib/cities/hong-kong/stations.json` carry real `lat`/`lng` sourced from
  OpenStreetMap -- verified programmatically (zero missing).
- All 95 fall inside the CITY_BOUNDS box in `public/city-session.js`
  (`minLat: 22.21, maxLat: 22.56, minLng: 113.91, maxLng: 114.30`) -- verified programmatically
  (zero out-of-box).
- Admiralty (22.278628, 114.165524) and Sunny Bay (22.331984, 114.028915) both resolve inside the
  Hong Kong box; no other region's CITY_BOUNDS box is anywhere near Hong Kong (nearest are
  Dublin/Brussels/UK/Scandinavia -- a different part of the world), so containment order and
  overlap are non-issues here.
- Ran `qa/uk-city-bounds-overlap-gate.mjs` and confirmed it is UK-scoped (imports
  `UK_REGION_IDS`/`listCatalogStations` from `lib/providers/uk/catalog.js`) -- it does not, and
  is not meant to, cover Hong Kong. No equivalent non-UK bounds-overlap gate exists in this repo,
  so the manual programmatic checks above (all-in-box, no-nearby-box) are the substitute
  evidence for this checklist item.

## 6. Hub lock / doNotGroup, DST, terminus mapping, error propagation

Unchanged since the last pass (all still green, re-confirmed by `qa/hong-kong-dogfood-gate.mjs`
and `qa/hong-kong-line-map-conformance.mjs`, both rewritten this pass to assert live state -- see
item 8): `lib/cities/hong-kong/line-map.json` doNotGroup list covers Admiralty vs
Central/Tsim-Sha-Tsui/East-Tsim-Sha-Tsui/Hung-Hom/Hong-Kong/Kowloon/Hong-Kong-West-Kowloon, Tsim
Sha Tsui vs East Tsim Sha Tsui, Mong Kok vs Mong Kok East, Hong Kong vs Hong Kong West Kowloon,
Kowloon vs Hung Hom, Tsuen Wan vs Tsuen Wan West -- all asserted by the conformance gate.
Live-sampled directions this pass confirm Admiralty never appears as a chip on its own board or
in `/api/directions`. `Asia/Hong_Kong` is hard-coded, no DST anywhere. `DEST_CODE_TO_TERMINUS`
never leaks a raw code (falls back to line family name); every live-sampled board row this pass
showed a printed terminus. `parseScheduleResponse` propagates NT-301/NT-205/isdelay:"Y" as thrown
`MtrScheduleError`s, unit-tested in `qa/hong-kong-dogfood-gate.mjs` without any network call.

## 7. coverage.json

`lib/cities/hong-kong/coverage.json` covered/notCovered lists are correct (eight urban lines plus
AEL at Hong Kong/Kowloon/Tsing Yi and DRL at Sunny Bay; Light Rail/HSR/Bus/Peak Tram/Star
Ferry/Ngong Ping 360/the three out-of-catalog Airport-family stations all out). data.gov.hk / MTR
Corporation Limited / DATA.GOV.HK attribution present, plus OpenStreetMap ODbL attribution for
the new coordinates. **Fixed this pass:** the notes field previously named
`docs/jim-brief-hong-kong-station-coordinates.md`, `docs/hong-kong-d1/jim-handoff.md` and "CSDI"
-- internal pipeline artifacts that read like research notes, not rider prose, per
`qa/coverage-notes-gate.mjs` (which only checks live cities, so never ran against this file
before this flip). Rewrote to keep the rider-relevant facts (no official MTR coordinate dataset
existed as of 27 Sep 2026; OpenStreetMap + ODbL attribution) without the internal references.

## 8. Gates

- `node qa/hong-kong-dogfood-gate.mjs` -- rewritten this pass from pre-flip to post-flip
  assertions (assertCityLive succeeds, `isMultiCity("hong-kong") === true`, registry status
  live, picker must now list Hong Kong), mirroring `qa/copenhagen-dogfood-gate.mjs`'s /
  `qa/washington-dogfood-gate.mjs`'s post-flip shape. Removed the Hong-Kong-only pre-flip
  `api/next-train.js`/`api/board.js` 501-probe block (no other flipped city's dogfood gate
  carries this pattern) along with its now-unused `nextTrain`/`board`/`mockRes` imports. PASS.
- `node qa/hong-kong-line-map-conformance.mjs` -- same rewrite (C0 block: assertCityLive must
  succeed, status live, adapterReady true, `isMultiCity` true). PASS.
- `node qa/live-city-lists-sync.mjs` -- PASS (40 live cities consistent across registry,
  live-city-api, app.js, city-session, brisbane-dogfood, journey-model).
- `node qa/country-regions-sync-gate.mjs` -- PASS (43 country-regions.js entries match the
  picker's 43 regions) after adding `hong-kong: "hk"` to `CITY_COUNTRY` and `hk: "Hong Kong"` to
  `COUNTRY_NAMES`, plus a non-comingSoon Hong Kong picker entry under a new country `hk` in
  `public/city-session.js`.
- `node scripts/write-city-directions.mjs --only=hong-kong` -- generated
  `public/city-directions/hong-kong.json`, 95/95 stations with chips.
- `node qa/run-all.mjs --smoke` (timeout 600000ms) -- first run: 2 genuine failures
  (`qa/region-selection.mjs` Test 6's stale pre-flip `hasHongKong` assertion;
  `qa/coverage-notes-gate.mjs` on the coverage.json copy issue above). Both fixed in this branch
  (flip-commit follow-through: updating a QA script's hardcoded pre-flip assertion and a
  rider-facing copy defect surfaced for the first time by this flip, not an adapter/business-logic
  bug). Re-run: **156 PASS, 0 FAIL, 599s.** No known-flaky item needed a standalone re-run this
  pass (Greater Manchester's `no-live-feed-stops-gate.mjs` passed clean both times).

## Branch / working-tree state

- `mark/hong-kong-flip` cut from `origin/master` at d31c7c3 (PR #472 merged).
- Dev server for rider-API sampling started on port 3512, stopped via `taskkill` before
  finishing. The smoke suite's own dev server (a different port, picked at runtime) was found
  still listening after the run completed and was also killed before finishing this session --
  confirmed via `netstat`/`tasklist` that nothing started by this session is still listening.
- Full flip-commit diff: `lib/providers/registry.js` (`status: "planned"` -> `"live"`, only
  status-line change), `lib/cities/live-city-api.js` (MULTI_CITY_IDS + typedef),
  `public/app.js` (NEARBY_MULTI_CITY_IDS + LIVE_CITY_IDS), `public/city-session.js`
  (MULTI_CITY_IDS + new "hk" country/Hong Kong region picker entry -- CITY_BOUNDS box already
  existed from PR #472), `public/brisbane-dogfood.js` (MULTI_CITY_IDS + available map),
  `public/journey-model.js` (PERSISTED_CITY_IDS + PERSISTED_COUNTRY_IDS),
  `lib/cities/country-regions.js` (CITY_COUNTRY + COUNTRY_NAMES), `public/city-directions/hong-kong.json`
  (generated), `qa/hong-kong-dogfood-gate.mjs` + `qa/hong-kong-line-map-conformance.mjs`
  (pre-flip -> post-flip assertions), `qa/region-selection.mjs` (removed stale pre-flip
  assertion), `lib/cities/hong-kong/coverage.json` (notes copy fix), this note, and
  `docs/hong-kong-d1/ci-live-evidence.md`.

## Decisions for Tim (see the flip PR description)

(a) Airport Express `in` at Hong Kong/Kowloon/Tsing Yi -- Tim's decision 27 Sep 2026 (carried
forward, unchanged this pass). (b) Disneyland Resort Line `in` at Sunny Bay -- applied under the
walk-up rule by the controller; Tim can veto with the `hold` label. (c) OpenStreetMap as the
coordinate source (ODbL attribution) -- PR #472's fix, re-verified this pass.
