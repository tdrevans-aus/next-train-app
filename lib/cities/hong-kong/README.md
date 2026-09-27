# Hong Kong (MTR) station catalog

Official-map catalog for city id `hong-kong`. Wired to a live board (`lib/providers/hong-kong.js`,
`adapterReady: true`) since 27 Sep 2026, but the city **stays planned** — Mark/Tim's flip call,
not this pass's. No Coming Soon picker entry (Tim's 30 Aug 2026 call: no picker entry for a bare
new planned city). Do not flip `status` to `live`.

- City id: **hong-kong**. Display **Hong Kong**. Not hk. Not mtr. Not kowloon. Not city=china. Not a second Light Rail city.
- Inner-city lock: **Admiralty** (TWL × ISL × SIL × EAL, spec **ADM**).
- Do not lock **Central**, **Tsim Sha Tsui**, **East Tsim Sha Tsui**, **Hung Hom**, **Kowloon**, **Hong Kong** station, **Hong Kong West Kowloon**, or Downtown.
- v1: eight urban heavy-rail lines (Island, Tsuen Wan, Kwun Tong, Tseung Kwan O, Tung Chung, Tuen Ma, East Rail, South Island), **95** unique official EN names, **plus two board-eligibility-approved product lines added 27 Sep 2026** (Tim's decision, `docs/hong-kong-d1/oracle-clash-report.md`'s "Board eligibility" section — supersedes the D1 hazard pack's "no Airport Express / no Disneyland Resort" line): **Airport Express (AEL)** at Hong Kong / Kowloon / Tsing Yi only, and **Disneyland Resort Line (DRL)** at Sunny Bay only. Light Rail / High Speed Rail stay fully out. Airport, AsiaWorld-Expo and Disneyland Resort stations themselves are **not** in the catalog — AEL/DRL trains toward them show as text destinations from their in-catalog boarding stations, never as a pickable board.
- Time zone: `Asia/Hong_Kong` (no DST).
- Feed: **MTR Next Train REST** (empty-key GET `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php`, one call per (line, station) pair) — **wired** via `lib/providers/hong-kong.js`. No MTR-only official GTFS; no static-schedule fallback exists or is used — live boards only. Do not generate this catalog from the Transport Department all-modes zip. No env key.
- Direction: line + terminus (`Island + Chai Wan`, `Airport Express + Hong Kong`). Chips live in `marketing-directions.js` (`DEST_CODE_TO_TERMINUS` maps the feed's raw `dest` station codes to the printed terminus). Not inbound/outbound. Never "to City".
- Spec three-letter codes (ADM, CEN, …) are `siteId` / `codes` where Next Train spec v1.7 lists them. Note: Disneyland Resort *Line*'s query param is **DRL** — `DIS` is only the Disneyland Resort *station* code (not in-catalog); an earlier controller brief mistakenly said `line=DIS`, corrected in `docs/hong-kong-d1/jim-handoff.md`.
- Known gap: no lat/lng on any station — no official data.gov.hk/MTR open-data coordinate dataset could be located this session (only the keyless `mtr_lines_and_stations.csv` station-code reference exists, no coordinates). Not invented; flagged in `docs/hong-kong-d1/jim-handoff.md` for a future pass.
- Adapter: `lib/providers/hong-kong.js`. Dogfood: `lib/cities/hong-kong/dogfood-next-train.js`. Coverage: `lib/cities/hong-kong/coverage.json`. Still no `public/city-catalogs/hong-kong.json`, no D6 sweep, no picker entry, no `MULTI_CITY_IDS` membership (all three deferred to Mark's flip commit).

D1 pack: `docs/hong-kong-d1/`. D2 fixture: `qa/fixtures/hong-kong/published-network.json` is a verbatim copy of that JSON (unchanged by the 27 Sep board-eligibility addition, which lives in the oracle report prose). Do not generate it from GTFS.
