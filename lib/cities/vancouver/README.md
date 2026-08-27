# Vancouver (SkyTrain)

Live for testers. **Not** a public store listing. Separate city `vancouver` — not `city=canada`.

- Hub: **Waterfront** (Expo Line / Canada Line city end). Millennium does not serve Waterfront; west end is **VCC–Clark**.
- v1: SkyTrain only — Expo, Millennium, Canada Line. No bus, SeaBus, or West Coast Express.
- Broadway Subway is not passenger-open (fall 2027). Do not invent those stations. Broadway–City Hall stays Canada Line.
- Direction: line + terminus (`Expo Line King George`).
- Time zone: `America/Vancouver` (DST).
- Static GTFS (no key): trimmed TransLink `google_transit.zip` SkyTrain fixture. Live trip updates: GTFS-RT v3 with `TRANSLINK_API_KEY` (~1000 requests/day; cache ~20s). RTTI is dead.
- Required on-screen disclaimer (Vancouver only, no TransLink logo/mark/domain): “Some of the data used in this product or service is provided by permission of TransLink. TransLink assumes no responsibility for the accuracy or currency of the Data used in this product or service.”
- Do not generate `published-network.json` from GTFS. Official map lock is `line-map.json`. Luke D1 can follow.
