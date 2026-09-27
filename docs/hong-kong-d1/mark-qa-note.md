# Mark QA note -- Hong Kong flip attempt (27 Sep 2026)

Verdict: RED. Flip PR not opened. One hard blocker (missing station coordinates,
see item 9) stops the flip; every other checklist item is green. No adapter or
data code was changed -- this note only. All experimental edits made to prove
the blocker were reverted before finishing (git status --short on
mark/hong-kong-flip shows no diff from master; branch pushed nowhere).

## Blocker (RED)

9. List-sync gates / CITY_BOUNDS. qa/live-city-lists-sync.mjs hard-requires a
CITY_BOUNDS entry in public/city-session.js for every status: "live" registry
city (its own comment: "Missing entries silently fall back to
nearbyCityFromCoords()s perth default, misfiring the region-mismatch prompt for
a live citys own users").
This was proven in isolation.

  $ node qa/live-city-lists-sync.mjs
  FAIL: city-session CITY_BOUNDS missing entries for live cities: [hong-kong]
  live-city-lists-sync: 1 failure(s)

That was the only failure once every other list was populated -- every other
required list-sync item is mechanically satisfiable. CITY_BOUNDS needs a real
lat/lng bounding box. Per the brief for this task: Hong Kong stations
currently carry NO lat/lng (Jim could not find an official open-data
coordinate set) -- if CITY_BOUNDS or Near me needs coordinates, that is a RED
item with the evidence, not something to invent. No box was authored from
general/atlas geography, since the instruction is explicit that this is a RED,
not a judgment call to resolve independently.

Consequence: api/country-stations.js degrades gracefully to lat: null,
lng: null per station (no crash), so a bare live flip would not 500 -- but the
QA gate is a hard, mechanical stop before any commit reaches the list-sync
gate in CI, and Near me would silently fail to hint Hong Kong for any rider
standing in the territory. This needs either (a) a sourced official
coordinate dataset for the 95 stations, or (b) an explicit decision from Tim
or Jim to author a hand-picked CITY_BOUNDS-only box from general geography.
Recommend routing back to Jim to source coordinates (OpenStreetMap or another
public extract), since the official data.gov.hk/MTR portals apparently do not
publish one.

## Everything else checked -- all green

1. Board eligibility. docs/hong-kong-d1/oracle-clash-report.md Board
eligibility section (lines 45-77) has a verdict for every calling service,
all in or out-mode -- no undecided rows. Sampled the rider-facing /api/board
(dev server, registry temporarily flipped to live locally, never committed)
at the required stations:
- Hong Kong: Airport Express + Airport / AsiaWorld-Expo, Tung Chung + Tung
  Chung -- AEL + TCL. OK
- Kowloon: Airport Express + Airport / AsiaWorld-Expo, Airport Express + Hong
  Kong, Tung Chung + Hong Kong, Tung Chung + Tung Chung -- AEL both directions
  plus TCL. OK
- Sunny Bay: Disneyland Resort + Disneyland Resort, Tung Chung + Hong Kong,
  Tung Chung + Tung Chung -- DRL + TCL. OK
- Admiralty: East Rail + Lo Wu / Lok Ma Chau, Island + Chai Wan, Island +
  Kennedy Town, South Island + South Horizons, Tsuen Wan + Central, Tsuen Wan +
  Tsuen Wan -- EAL/ISL/SIL/TWL only, matching the TWL x ISL x SIL x EAL hub
  composition, no other lines. OK
- Yuen Long: Tuen Ma + Tuen Mun, Tuen Ma + Wu Kai Sha only -- Tuen Ma line
  only, no Light Rail rows. OK
- Hung Hom and Tseung Kwan O also sampled (item 3 below) and match
  line-map.json station membership exactly.

One known doc error, not a RED: the oracle report verdicts table calls the
Disneyland Resort Line DIS and Sunny Bay SBY. Jim confirmed live that the
correct Next Train REST query codes are line=DRL, sta=SUN (DIS is only the
out-of-catalog Disneyland Resort station code) -- lib/providers/hong-kong.js,
marketing-directions.js, line-map.json, and coverage.json all consistently use
DRL/SUN. This is a doc-fix item for oracle-clash-report.md, not a code or QA
defect -- the wired adapter already has it right.

2. Live-only. grep -n "realtime:|loadGtfsStatic|stop_times"
lib/providers/hong-kong.js finds one hit only: realtime: "live" on the
returned board object. No loadGtfsStatic, no stop_times, no static-schedule
import anywhere in the file -- confirmed by the file own header comment (LIVE
BOARDS ONLY -- no static-GTFS/schedule fallback, there is no MTR-only official
GTFS to fall back to anyway). No trip the adapter emits ever sets
realtime: false (that field is simply absent per trip), so
lib/train-times-core.js status logic (trip.realtime === false gives
Scheduled, else the normal on-time/delayed diff) never takes the Scheduled
branch for Hong Kong -- confirmed live: every sampled /api/board trip showed
status On Time, never Scheduled.

3. Live cross-check (rider-facing endpoints). With registry flipped to live
locally (reverted after testing, never committed) and a dev server on port
3411:
- /api/board city=hong-kong station=Hong Kong -> 200, under 1s, AEL + TCL
  rows, real departure times.
- /api/board city=hong-kong station=Sunny Bay -> 200, DRL + TCL rows.
- /api/board city=hong-kong station=Admiralty -> 200, EAL/ISL/SIL/TWL rows
  (hub).
- /api/board city=hong-kong station=Hung Hom -> 200, East Rail + Admiralty,
  East Rail + Lo Wu / Lok Ma Chau, Tuen Ma + Tuen Mun, Tuen Ma + Wu Kai Sha --
  EAL + TML, matches catalog.
- /api/board city=hong-kong station=Tseung Kwan O -> 200, Tseung Kwan O +
  North Point, Tseung Kwan O + Po Lam / LOHAS Park.
- /api/directions city=hong-kong station=Admiralty -> 200, same six
  directions as the board, no Admiralty token, source
  hong-kong-marketing-ends.
All requests paced at least 2s apart per the MTR REST courtesy limit; all
returned well under 3s.

4. Per-direction trip counts. Every sampled board entry above carried
upcoming arrays of 2 to 4 trips (never 0) while full Sunday-morning service
is running, confirmed for Admiralty (both EAL directions, both TWL
directions, both ISL directions, SIL), Hong Kong (AEL toward Airport /
AsiaWorld-Expo only -- correct, since Hong Kong is AEL own terminus so no
Hong Kong destination chip appears there), Sunny Bay (single DRL direction
toward Disneyland Resort, 3 upcoming trips), and Hung Hom (East Rail line, an
intermediate EAL station) -- all populated.

5. Hub lock / doNotGroup. lib/cities/hong-kong/line-map.json doNotGroup list
covers Admiralty vs Central, Admiralty vs Tsim Sha Tsui, Admiralty vs East
Tsim Sha Tsui, Admiralty vs Hung Hom, Admiralty vs Hong Kong, Admiralty vs
Kowloon, Admiralty vs Hong Kong West Kowloon (HSR), Tsim Sha Tsui vs East Tsim
Sha Tsui, Mong Kok vs Mong Kok East, Hong Kong vs Hong Kong West Kowloon,
Kowloon vs Hung Hom, Tsuen Wan vs Tsuen Wan West.
qa/hong-kong-line-map-conformance.mjs asserts Admiralty/Central, Tsim Sha
Tsui/East Tsim Sha Tsui, Admiralty/Hung Hom and Hong Kong/Hong Kong West
Kowloon explicitly and passes. Live-sampled directions confirm Admiralty never
appears as a chip on its own board or in /api/directions. Asia/Hong_Kong is
hard-coded, no DST handling anywhere; the fixed +08:00 offset in
mapScheduleEntryToTrip is deliberate, not hand-rolled per-date logic.

6. Terminus mapping. DEST_CODE_TO_TERMINUS in marketing-directions.js maps
every dest code seen live to a printed terminus for all ten line codes (eight
urban plus AEL and DRL), including the EAL Lo Wu/Lok Ma Chau split, TML Tuen
Mun/Wu Kai Sha, and the TKL branch (both codes map to Po Lam / LOHAS Park).
resolveTerminusFromDestCode returns null for an unrecognised code rather than
fabricating one, and mapScheduleEntryToTrip falls back to the line family
name (never a raw code) when that happens. Every live-sampled board row above
showed a printed terminus, never a raw code.

7. Error handling. Read parseScheduleResponse(): any body status not equal
to 1 (covers both the gateway resultCode/error shape for NT-301/NT-205 and
the spec bare status 0 message shape) throws MtrScheduleError; isdelay Y
data-absence also throws explicitly. No code path returns an empty or
synthetic board. Did not force a live NT-205 this session (Disneyland Resort
Line is inside its 06:15-00:45 operating window on a Sunday morning), so this
was verified by code-reading plus Jim prior live capture of NT-205 recorded
in jim-handoff.md (2026-09-27 08:38 HKT, outside park hours) -- not
re-triggered live today, consistent with the brief instruction to trigger
NT-205 only if it occurs naturally.

8. coverage.json. lib/cities/hong-kong/coverage.json covered list has the
eight urban lines (95 stations) plus AEL at Hong Kong/Kowloon/Tsing Yi and DRL
at Sunny Bay, each with the board-eligibility verdict cited; notCovered lists
Light Rail, HSR, MTR Bus/Peak Tram/Star Ferry/Ngong Ping 360, and the
Airport/AsiaWorld-Expo/Disneyland Resort stations themselves (never
in-catalog, text destinations only). data.gov.hk / MTR Corporation Limited /
DATA.GOV.HK attribution present in notes, matching the ToU requirement cited
in the registry.

9. Gates. node qa/hong-kong-dogfood-gate.mjs and
node qa/hong-kong-line-map-conformance.mjs both pass at the current planned
status (asserting planned/501 plus the flip-follow-through wiring -- they
were not re-run at live status separately, since the flip itself is blocked;
both gates are content to run either way per their own text).
node qa/country-regions-sync-gate.mjs passes once Hong Kong is added to
country-regions.js (proven in the scratch experiment above, then reverted).
node qa/live-city-lists-sync.mjs is the one RED (CITY_BOUNDS, see above). Did
not run node qa/run-all.mjs --smoke against a genuinely-flipped commit since
the flip cannot be completed -- running smoke against unflipped master plus
this branch (no diff) would only re-confirm the pre-existing green state
already established by PR 469 own smoke run (155 PASS, 0 FAIL), so it was
skipped as redundant rather than run a second time for no new information.

## Branch / working-tree state

- mark/hong-kong-flip cut from master at e142ef2 (Hong Kong adapter (planned),
  PR 469) -- no commits added, no push. All experimental edits (registry
  status, six list files, country-regions.js) made to prove the CITY_BOUNDS
  blocker were reverted with git checkout before finishing; git status
  --short shows the working tree back to its pre-task state (only the two
  pre-existing untracked docs files left alone, per instruction).
- Dev server started on port 3411 for the live rider-API sampling; killed via
  taskkill before finishing. No background loops or servers left running.

## Recommendation

Send this note back through the pipeline as a blocker on the coordinates, not
the adapter: Jim (or a fresh Nico research pass) should try OpenStreetMap or
another public source for the 95 MTR stations lat/lng, since the
data.gov.hk/MTR official portals apparently do not publish one. Once a sourced
coordinate set exists, this flip is otherwise fully green and should re-run
quickly -- no other item needs rework.
