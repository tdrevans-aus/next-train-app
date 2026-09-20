Washington D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Rotterdam is cut #1 and **untouched**. Melbourne stays planned. **assertCityLive("washington") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no PR, no issues, no product edit. Tim copies files; Jim owns D2–D6. Do not flip washington live from this pack. Do not edit Perth. Do not invent city=dc, city=washington-dc, city=wmata, or city=us.

Drop later (Jim D2): qa/fixtures/washington/published-network.json. Research pack is /workspace/washington-pack/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, sources/.

D1 = official WMATA **Metro Rail System Map** https://www.wmata.com/content/dam/wmata-com/maps/system-map-rail.pdf (PDF title Metro Rail System Map; subject Metrorail System Map - Jan 2026; HTTP Last-Modified **Sat, 18 Apr 2026 13:04:09 GMT** = Sat 18 Apr 2026 21:04 PT) plus rider-tools line pages as support only. Index https://www.wmata.com/ride/maps.html (`/schedules/maps/` 301s here). Modes v1: **WMATA Metrorail only**. No Metrobus, Streetcar, MARC, VRE, Amtrak. Stations hand-transcribed from map images (`metro-map-1.png` + `crop-*.png`). Not generated from GTFS. Not generated from developer.wmata.com.

Six lines: **Red** Shady Grove–Glenmont (27), **Orange** Vienna/Fairfax-GMU–New Carrollton (26), **Blue** Franconia-Springfield–Downtown Largo (28), **Silver** Ashburn–Downtown Largo (34) with second east end New Carrollton, **Green** Greenbelt–Branch Av (21), **Yellow** Huntington–Mt Vernon Sq & Greenbelt (22). **98** unique open Metrorail stops. **Potomac Yard-VT is on the map.** **Silver far end is Ashburn.** **Downtown Largo** (not Largo Town Center).

Hub lock **Metro Center**. Not Gallery Place, not Union Station, not L'Enfant Plaza. **Farragut North ≠ Farragut West.** **Metro Center ≠ Gallery Place-Chinatown.**

C2/C3: (1) Separate city washington, agency WMATA Metro. Do not invent city=dc. (2) Lock Metro Center. (3) Metrorail only. (4) Downtown Largo / Ashburn / Potomac Yard-VT / North Bethesda / Hyattsville Crossing / Tysons as printed. (5) Yellow dashed to Greenbelt; Yellow skips Arlington Cemetery and Rosslyn. (6) Silver two east ends (Downtown Largo & New Carrollton).

H2: no product washington stations.json. Map-vs-board (Downtown Largo vs Largo; Gallery Place vs Gallery Pl) plus historic renames (White Flint, Prince George's Plaza, Tysons Corner, Largo Town Center).

**Live boards: developer.wmata.com key later — not a D1 blocker.** Portal https://developer.wmata.com/ (signup https://developer.wmata.com/signup/). Default Next Train is Station Prediction `GET https://api.wmata.com/StationPrediction.svc/json/GetPrediction/{StationCodes|All}` header `api_key`. Empty-key **401** on 29 Aug 2026. Auckland pattern: Tim signs up later. This pack has **no key** and did not call the API with a real key. D1 stays planned. assertCityLive("washington") must fail.

H7: America/New_York **HAS DST**. Do not copy Perth / Brisbane no-DST.

§3 rec: line + terminus (`Red Line + Glenmont`, `Silver Line + Ashburn`). Flag: inbound/outbound dies at Metro Center. **Metro Center is a hub stop string, not a direction token.** Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **washington**. Do not flip from this pack. Testers live is Jim’s job, not this pack’s flip.

## D2 addendum (Jim, 20 Sep 2026)

Wired `lib/providers/washington.js` against WMATA's Station Prediction API
(`StationPrediction.svc/json/GetPrediction`, header `api_key`) plus WMATA's Rail Station
Information endpoint (`Rail.svc/json/jStations`) to resolve StationCodes by name at request time
— never a hardcoded 98-row code table. `WMATA_API_KEY` was NOT available this session (checked
`.env.local`, not present) — this adapter was never called against either live endpoint; the
`jStations`/`GetPrediction` payload shapes are documented-only, UNVERIFIED against a real
response. Confirm both once a key is set (register at https://developer.wmata.com/signup/).

Station catalog (`lib/cities/washington/stations.json`, 98 stations) carries `lat`/`lng` sourced
from DC GIS's public "Metro Stations Regional" ArcGIS FeatureServer layer
(`maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Transportation_Rail_Bus_WebMercator/MapServer/51`,
98 rows, matches all 98 D1 names) — a WMATA-sourced public open dataset, no key required —
matched by name/rename-alias (Rd/Road, Av/Ave/Avenue abbreviation expansions plus the documented
renames: Gallery Place-Chinatown/Gallery Pl-Chinatown, Archives-Navy Mem'l-Penn Quarter/Archives-
Navy Memorial-Penn Quarter, West Falls Church-VT/West Falls Church, Potomac Yard-VT/Potomac Yard,
Virginia Sq-GMU/Virginia Square-GMU), never fuzzy string matching. All 98 D1 stations matched —
none exempted. **This dataset's embedded `TRAININFO_URL` station-code fragments were NOT used as
WMATA StationCodes** — spot-checking found a data bug (Potomac Yard's fragment duplicates
Huntington's real code C15) — so StationCodes are always resolved live from WMATA's own
`jStations`, never from this coordinate source.

**MARC/VRE — NOT implemented, holds the flip.** The oracle report's
Board eligibility section rules MARC (Penn/Brunswick/Camden) and VRE (Fredericksburg/Manassas)
`in` at Union Station, Rockville, Silver Spring, New Carrollton, L'Enfant Plaza, and
Franconia-Springfield — but
both come from feeds other than WMATA's Station Prediction API and are **not yet wired** in
this v1 adapter (no fabricated/faked board). This holds the flip until either a second feed is
wired for those services or Tim records an `out-product` sign-off overriding the walk-up rule's
`in` verdict for this city. All Amtrak services, Northeast Regional included, are `out-reservation`
(controller correction 20 Sep 2026; authoritative verdict to live in docs/united-states-ledger.md),
already excluded correctly by only ever calling WMATA's own API.

**Flip-commit — exact edits.** Per docs/boston-d1/jim-handoff.md's "Flip commit — exact edits"
recipe (qa/live-city-lists-sync.mjs derived, 8-list requirement): once WMATA_API_KEY is set,
`developer.wmata.com`/`Rail.svc`/`StationPrediction.svc` payloads are confirmed live, and the
MARC/VRE question above is resolved one way or the other, Mark's flip PR changes
`registry.js`'s washington `status` to `"live"` plus adds `washington` to the same three lists
Boston's recipe names (`MULTI_CITY_IDS`/`MultiCityId` typedef, `brisbane-dogfood.js`'s mount/
available map, `journey-model.js`'s persisted-city/country lists) — nothing else in this repo
needs a second pass; the dogfood module, dispatch switch-cases, and gate already exist.

Flip readiness (docs/jim-brief-us-flip-readiness.md): United States picker country, CITY_BOUNDS
box, and `lib/cities/country-regions.js` entry added for `washington` alongside BART/Boston/
Chicago (Coming Soon, `status: "planned"`, out of every live-city list).

## Live verification (Jim, 20 Sep 2026)

`WMATA_API_KEY` was available this session. Ran a small, sequential batch (9 calls total: one
`Rail.svc/json/jStations`, six per-station `StationPrediction.svc/json/GetPrediction` calls,
one `GetPrediction/All` call, one repeat during the end-to-end adapter check) — well inside
WMATA's ~10 req/s / 50,000 req/day default tier. City stays `planned`; `assertCityLive("washington")`
still fails. MARC/VRE remain not wired, exactly as this pack's addendum above records — that
still holds the flip pending Tim's decision.

**Stations (`Rail.svc/json/jStations`, 102 rows for 98 unique stations — the 4 documented
two-code transfer stations each have exactly two rows, confirmed via `StationTogether1/2`, no
others exist):**
- All 98 D1/catalog stations matched a live jStations row by name or existing alias, with two
  exceptions fixed this pass: WMATA's live `Name` is "McPherson Square" (catalog printed
  "McPherson Sq") and "Eisenhower Avenue" (catalog printed "Eisenhower Av") — both now carry the
  live full-word form as an added alias in `lib/cities/washington/stations.json` so
  `resolveStationCodesForCatalogEntry` matches them. No live station was missing from the D1
  catalog and no live station outside the catalog's 98 (no stale-pack issue, no new station to
  add).
- The four two-code transfer stations matched `StationTogether1/2` exactly as documented: Metro
  Center A01↔C01, Gallery Pl-Chinatown B01↔F01, L'Enfant Plaza D03↔F03, Fort Totten B06↔E06. No
  other station carries a `StationTogether1/2` value.
- Coordinates: compared every catalog `lat`/`lng` against its live jStations `Lat`/`Lon` (same
  code). 90 of 98 were within ~150m already; 8 were 151–315m out (Court House, Dunn
  Loring-Merrifield, Friendship Heights, Georgia Av-Petworth, Greensboro, Minnesota Av, Morgan
  Blvd, Tysons) — likely street-entrance-vs-platform-centroid differences in the DC GIS source
  dataset used to build the catalog. Fixed by replacing those 8 stations' `lat`/`lng` with
  WMATA's own live values (the more authoritative source for a station a rider is trying to
  reach); the other 90 were left as-is (already accurate).

**Predictions (`StationPrediction.svc/json/GetPrediction`, called for Metro Center A01+C01,
Gallery Pl-Chinatown B01+F01, L'Enfant Plaza D03+F03, Fort Totten B06+E06, terminal Shady Grove
A15, ordinary mid-line Bethesda A09, plus once with `All` — 617 total train rows across all
calls):**
- Field shapes matched the adapter's documented parsing exactly: `Min` values seen included
  numeric strings (1–40), `ARR`, `BRD`, and `---` (only on a `Line: "No"` no-passenger row in
  this capture — a reliable `---` on a passenger line is possible per WMATA's own docs but wasn't
  captured live, kept as a marked-synthetic fixture case). `Line` values seen: `RD`, `BL`, `OR`,
  `SV`, `GR`, `No` — **zero `YL` (Yellow Line) rows appeared in the entire 561-row `All` capture**,
  an off-peak/single-snapshot gap, not evidence Yellow was suspended; kept as a marked-synthetic
  fixture case and flagged here as an open item to re-check on a future capture. `Line: "No"`
  rows (no-passenger trains) were confirmed real and correctly dropped. Both codes of every
  two-code transfer station merged into one board with no duplicates (`GetPrediction/A01,C01`
  etc. returns one combined `Trains[]`, exactly as the adapter's `codes.join(",")` request shape
  assumes).
- **Real bug found and fixed:** WMATA's live `DestinationName` field is NOT reliably the full
  canonical station name. Red Line trains toward Shady Grove came back as `"Shady Grv"` far more
  often than the full `"Shady Grove"` in this capture; New Carrollton (both Orange and Silver)
  came back as `"NewCrlton"`/`"New Crlton"` (two different spacings) rather than
  `"New Carrollton"`. Neither abbreviation is a substring of the canonical terminus name, so the
  existing exact/substring `resolveTerminus()` logic could not bridge them — without a fix, most
  Shady-Grove-bound Red trains would have silently lost their terminus and shown only the bare
  "Red Line" chip, a real rider-facing regression on very common destinations, not an edge case.
  Fixed with a small `WMATA_DESTINATION_ABBREVIATIONS` normalization map in
  `lib/cities/washington/marketing-directions.js`'s `resolveTerminus()`, applied before the
  exact/substring match.
- All-caps forms (`"GLENMONT"`, `"SHADY GROVE"`, `"LARGO"`→"Downtown Largo" via `DestinationName`,
  `"GREENBELT"`, `"ASHBURN"`, `"NEW CARROLLTON"`, `"VIENNA"`) already resolved correctly — folding
  is case-insensitive and "VIENNA" substring-matches "Vienna/Fairfax-GMU".
- **Genuine short-turn confirmed live, handled correctly, no fix needed:** a real Blue Line train
  at L'Enfant Plaza was signed `DestinationName: "Huntington"` — Huntington is not one of Blue's
  two D1 termini (Franconia-Springfield, Downtown Largo). `mapLineTerminusDestination()`'s
  existing fallback to the bare `"Blue Line"` label handles this exactly as intended: not dropped,
  not mislabelled, just less specific than a full terminus chip. No code change needed for this
  case — added as an explicit expectation in the new QA fixture so a future capture can't silently
  regress it either way.
- The full `Destination` (short) field is never used by the adapter — only `DestinationName` — so
  short forms like `"Largo"`, `"Franconia"`, `"Hntingtn"`, `"Vienna"` never reach the direction
  model; confirmed no case where `DestinationName` itself needed the `Destination` field as a
  fallback.
- `Group` values seen: `"1"`, `"2"` only (used as `platform`, unchanged).

**End-to-end adapter check:** called `fetchStationBoard()` directly (not the gate, a live network
call) for Metro Center, Gallery Place-Chinatown, L'Enfant Plaza, Fort Totten, Shady Grove, and
Bethesda. All six returned trips with correctly merged multi-code boards, correct destinations
(including the abbreviation-fix cases above resolving to full terminus chips), and no duplicates.

**QA fixture replaced:** `qa/fixtures/washington/{jstations,predictions}.json` now hold a trimmed
REAL capture (rows tagged `"_source": "live-capture-20260920"`), with a small number of
explicitly `"_source": "synthetic"` rows for shapes the capture didn't happen to produce (a
passenger-line `"---"` Min, an unrecognized Line code, a Yellow Line row). `qa/washington-
dogfood-gate.mjs` replays these fixtures instead of hand-authored documentation-shaped objects,
and now fails loudly (`checkNoSilentlyUnmappedRow`) if any fixture row's Line code or
`(Line, DestinationName)` pair isn't in an explicit allow-list — a new WMATA abbreviation or a
newly-observed short-turn destination must be triaged and added there, never silently absorbed
by the graceful production fallback.

**Open items:**
- Yellow Line had zero live trains in this single capture — re-verify `Line: "YL"` and its
  `DestinationName` values (in particular whether Yellow ever short-turns and signs something
  other than "Greenbelt"/"Huntington"/"Mt Vernon Sq") on a future capture.
- MARC/VRE still not wired — unchanged, still holds the flip pending Tim's decision (see D2
  addendum above).
- Coordinates fixed for 8 stations this pass; the DC GIS source dataset used for the other 90 may
  be worth a full re-check against WMATA's own `Lat`/`Lon` at some point, though none of the other
  90 exceeded the ~150m tolerance.
