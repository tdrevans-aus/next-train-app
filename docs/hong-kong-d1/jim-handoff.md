Hong Kong D1 official-map pack + planned-city D2–D6 wiring. City stays **planned**. Picker shows **Hong Kong (Coming Soon)** under Hong Kong (`hk`). Perth/Sydney/Brisbane/Amsterdam/Rotterdam live-gates untouched. Stockholm / Göteborg stay Coming Soon. **assertCityLive("hong-kong") must still fail (501).** adapterReady **false**. Next Train REST exists and is **not wired**. No generator. Do not invent city=hk, mtr, kowloon, or merge Light Rail / Airport Express into a second city. Not China as the country.

Drop later (already copied as D2): qa/fixtures/hong-kong/published-network.json. Research pack is docs/hong-kong-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

D1 = official MTR **system map** https://www.mtr.com.hk/en/customer/services/system_map.html + **routemap.pdf** https://www.mtr.com.hk/archive/en/services/routemap.pdf (Last-Modified 11 Sep 2024) + official EN homepage line lists + corporate Railway Network termini https://www.mtr.com.hk/en/corporate/operations/detail_network.html . Next Train spec v1.7 is **codes only**, not the map oracle. **Hand-transcribed. Not generated from GTFS.** Not generated from the Transport Department all-modes zip.

Modes v1: metro / urban heavy-rail only — eight official lines (**Island, Tsuen Wan, Kwun Tong, Tseung Kwan O, Tung Chung, Tuen Ma, East Rail, South Island**). **95** unique official EN names. **114** line ticks. Airport Express out. Disneyland Resort out. Light Rail out. High Speed Rail out. City id is **hong-kong**. Display **Hong Kong**. Agency **MTR Corporation Limited**.

C2/C3: (1) Lock **Admiralty** (TWL × ISL × SIL × EAL, spec ADM). (2) Do not lock Central / Tsim Sha Tsui / East Tsim Sha Tsui / Hung Hom / Kowloon / Hong Kong station / Hong Kong West Kowloon / Downtown. (3) doNotGroup Admiralty vs Central; Tsim Sha Tsui vs East Tsim Sha Tsui; Hung Hom vs Kowloon vs Hong Kong station vs Hong Kong West Kowloon; Mong Kok vs Mong Kok East; Tsuen Wan vs Tsuen Wan West. (4) Lo Wu / Lok Ma Chau are IN. LOHAS Park is IN as the TKL branch. (5) Preserve official EN spellings (HKU, LOHAS Park, Sung Wong Toi, East Tsim Sha Tsui, Mong Kok East). **Do not merge into China.**

H2: **MTR Next Train REST exists** — empty-key GET https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php (`line` + `sta`). Verified 200 on ISL/TWL/EAL/SIL at ADM, TML at HUH, AEL at HOK. **Not wired.** AEL on the same REST is the trap. Transport Department all-modes GTFS is not an MTR-only subway feed. **envKeys: none. adapterReady: false.** Registry integration must name that REST and say it is not wired.

H7: **Asia/Hong_Kong has NO DST.** Do not copy Europe/Stockholm DST cities.

§3 rec: **line + terminus** (`Island + Chai Wan`, `Tseung Kwan O + Po Lam / LOHAS Park`, `East Rail + Lo Wu / Lok Ma Chau`). Never “to City”. Do not flip hong-kong live. Not a public store listing. Skip D6 as a PR gate.

## Jim — adapter build + live verification (27 Sep 2026)

Wired `lib/providers/hong-kong.js` against the finished D1 pack plus the copied-across
"Board eligibility" section of `docs/hong-kong-d1/oracle-clash-report.md` (appended by the
controller session before this pass; Tim's decision, 27 Sep 2026), which **supersedes** this
pack's own hazard-pack.md/direction-model-memo.md "no Airport Express / no Disneyland Resort in
v1" lines for three (AEL) plus one (DRL) stations only — every other station stays urban-heavy-
rail-only exactly as this pack specified. `lib/providers/registry.js`'s `hong-kong` entry flips
`adapterReady` to `true`; `status` stays `planned` (Mark/Tim's call).

**Correction to the controller brief:** the brief said Disneyland Resort Line is queried as
`line=DIS` at "Sunny Bay (SBY)". Both of those are wrong, caught during a live spec-PDF read and
live API probe:
- The MTR Next Train API Spec v1.7 PDF (fetched live, `https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.7.pdf`,
  200, 273KB) states the Disneyland Resort *Line*'s `line` parameter is **DRL**; `DIS` is only the
  *station* code for Disneyland Resort itself (out-of-catalog).
- Sunny Bay's own official station code is **SUN**, not SBY — matches the catalog's existing
  `stations.json` entry (siteId `SUN`) and the spec's own TCL/DRL station tables. `line=DIS&sta=SBY`
  would have failed for two independent reasons.

**Live verification (genuine network calls this session, not fixtures), rt.data.gov.hk, 2026-09-27
~08:37–08:39 HKT, paced ≥1 request/second:**
- `ISL&sta=ADM` → 200, UP dest `CHW` (Chai Wan), DOWN dest `KET` (Kennedy Town).
- `TWL&sta=ADM` → 200, UP dest `TSW` (Tsuen Wan), DOWN dest `CEN` (Central).
- `EAL&sta=ADM` → 200, UP dest `LOW`/`LMC` (Lo Wu / Lok Ma Chau).
- `SIL&sta=ADM` → 200, UP dest `SOH` (South Horizons).
- `TML&sta=HUH` → 200, UP dest `TUM` (Tuen Mun), DOWN dest `WKS` (Wu Kai Sha).
- `AEL&sta=HOK` → 200, UP dest `AWE` (AsiaWorld-Expo), no DOWN (Hong Kong is AEL's own terminus).
- `AEL&sta=KOW` → 200, UP dest `AWE`, DOWN dest `HOK` (Hong Kong).
- `AEL&sta=TSY` → 200, UP dest `AWE`, DOWN dest `HOK`.
- `DIS&sta=SBY` → **wrong params, as above** — returned `{"status":0,"error":{"errorCode":"NT-205","errorMsg":"DIS line is disabled in CMS."}}`. Re-probed with the corrected params:
- `DIS&sta=SUN` → same NT-205 "DIS line is disabled in CMS" (confirms the error is about the
  *line* code, not the station param — `DIS` was never a valid line code either way).
- `DRL&sta=SUN` → **200**, DOWN dest `DIS` (Disneyland Resort). Confirms DRL is the correct line
  code, and that outside Disneyland park operating hours the line legitimately shows as disabled
  under whatever code is queried — the adapter treats NT-205 as an explicit, propagated failure,
  never a silent empty board.
- `TCL&sta=SUN` → 200 (sanity check that Sunny Bay's TCL service is unaffected by DRL being off).
- Empty `line=&sta=` → `{"status":0,"error":{"errorCode":"NT-301","errorMsg":"Please type the line-station."}}` — confirms Nico's clash report's NT-301 finding still holds.

`fetchStationBoard()` was exercised end-to-end (not just URL construction) via the gate's
synthetic `entries`/`rawBodies` seams (`qa/hong-kong-dogfood-gate.mjs`) shaped exactly from the
above captures, plus one direct un-seamed call is intentionally NOT made from the gate (smoke-tier,
no network) — the four probes above are the genuine network evidence for this adapter's mapping
logic (dest-code → terminus, status-0/isdelay error propagation).

**Known gap — lat/lng.** The brief asked for lat/lng sourced from data.gov.hk / MTR open data,
never invented, with any unmatched station recorded here. A reasonable-effort search this session
found no official coordinate dataset: `https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv`
exists (line/direction/station-code/sequence only, no lat/lng); every other filename tried at that
same host (`mtr_station_exits.csv`, `mtr_barrier_free_facilities.csv`, `station.geojson`,
`mtr_network.geojson`, etc.) 404'd; `static.data.gov.hk`'s `MTR_LINES_AND_STATIONS.geojson` 403'd;
data.gov.hk's own CKAN package-search API returned zero results for "MTR"; the CSDI GIS portal's
`common`/`open` service folders (2243 + 0 services) had no MTR/rail/station-named service. **All
95 stations are therefore unmatched for lat/lng** — not invented, left absent from
`stations.json`, flagged in `lib/providers/registry.js`'s notes and `lib/cities/hong-kong/README.md`
for a future pass (a Lands Department base-map join, or an official MTR barrier-free-facilities
release, would be the next things to try). This does not block the planned adapter: there is no
map-pin UI for a planned-only city, and every dogfood/board flow resolves stations by name, not
coordinate.

**Flip follow-through — done now** (code, not list membership, per the guardrail): the dogfood
module (`lib/cities/hong-kong/dogfood-next-train.js`), the dispatch switch-cases in
`lib/cities/live-city-api.js`'s `directionsFor`/`getMultiCityNextTrain`, and
`qa/hong-kong-dogfood-gate.mjs` replacing `qa/hong-kong-planned-gate.mjs`.

**Deliberately NOT done** — belongs in Mark's actual status-flip commit, same as
Malmö/Uppsala/Göteborg/Vienna: `MULTI_CITY_IDS` / the `MultiCityId` typedef, `brisbane-dogfood.js`'s
mount/available map, `journey-model.js`'s persisted-city/country lists, and any
`public/city-session.js` picker entry / `CITY_BOUNDS` box / `lib/cities/country-regions.js` entry
(Hong Kong isn't part of the country-wide-picker feature — same precedent as Dublin/Ireland,
Los Angeles, and Vienna/Austria).
