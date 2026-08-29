# Hong Kong (MTR) station catalog

Official-map catalog for city id `hong-kong`. **Not** wired to a live board. City stays **planned**. Picker shows **Coming Soon**. `adapterReady` is **false**. Do not flip live.

- City id: **hong-kong**. Display **Hong Kong**. Not hk. Not mtr. Not kowloon. Not city=china. Not a second Light Rail city.
- Inner-city lock: **Admiralty** (TWL × ISL × SIL × EAL, spec **ADM**).
- Do not lock **Central**, **Tsim Sha Tsui**, **East Tsim Sha Tsui**, **Hung Hom**, **Kowloon**, **Hong Kong** station, **Hong Kong West Kowloon**, or Downtown.
- v1: eight urban heavy-rail lines only (Island, Tsuen Wan, Kwun Tong, Tseung Kwan O, Tung Chung, Tuen Ma, East Rail, South Island). **95** unique official EN names. Airport Express / Disneyland Resort / Light Rail / High Speed Rail out.
- Time zone: `Asia/Hong_Kong` (no DST).
- Feed: **MTR Next Train REST exists** (empty-key GET `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php`) and is **not wired**. AEL is on the same REST — out of v1. No MTR-only official GTFS. Do not generate this catalog from the Transport Department all-modes zip. No env key.
- Direction: line + terminus (`Island + Chai Wan`). Chips live in `marketing-directions.js`. Not inbound/outbound. Never “to City”.
- Spec three-letter codes (ADM, CEN, …) are `siteId` / `codes` where Next Train spec v1.7 lists them.
- No adapter (`lib/providers/hong-kong.js`). No `dogfood-next-train.js`. No `public/city-catalogs/hong-kong.json`. No D6 sweep.

D1 pack: `docs/hong-kong-d1/`. D2 fixture: `qa/fixtures/hong-kong/published-network.json` is a verbatim copy of that JSON. Do not generate it from GTFS.
