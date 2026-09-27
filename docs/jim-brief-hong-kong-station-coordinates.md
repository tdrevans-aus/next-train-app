# Jim brief — Hong Kong: station coordinates + CITY_BOUNDS so the flip can clear

**Lane:** expansion follow-up, bug-fix / product mode. **City:** hong-kong, country hong-kong (acquire the lane lock). **Date:** 27 Sep 2026. **tim-review:** no.

## Symptom
Mark's flip QA (docs/hong-kong-d1/mark-qa-note.md, untracked in the main checkout — copy it into your PR unchanged) is green on every item except one: `qa/live-city-lists-sync.mjs` hard-requires a `CITY_BOUNDS` entry in public/city-session.js for every live city, and lib/cities/hong-kong/stations.json carries no lat/lng for any of its 95 stations. Jim's D2 pass found no coordinate dataset on data.gov.hk / opendata.mtr.com.hk (docs/hong-kong-d1/jim-handoff.md lists what was tried).

## Fix (what to build)
1. Source real coordinates for all 95 catalog stations. Try in this order and record which one worked in jim-handoff.md (appended, dated):
   a. Hong Kong CSDI / GeoData Store (https://portal.csdi.gov.hk , https://geodata.gov.hk) — the Lands Department / Transport Department publish MTR station and station-exit layers (search "MTR station", "railway station", "Mass Transit Railway"), usually GeoJSON/CSV/KML with WGS84 or HK1980 grid coordinates (convert HK1980 → WGS84 correctly if that is what you get; sanity-check Admiralty ≈ 22.2790, 114.1646).
   b. opendata.mtr.com.hk station list CSV (`mtr_lines_and_stations.csv`) for station codes/names, joined to a coordinate source.
   c. OpenStreetMap via the Overpass API (`railway=station` + `network=MTR` / `station=subway`) as a fallback — ODbL, so add "© OpenStreetMap contributors" to lib/cities/hong-kong/coverage.json attribution if you use it.
   Never invent or eyeball a coordinate. A station you cannot match gets recorded by name in jim-handoff.md, and the PR says so; do not ship a partially-coordinated catalog silently.
2. Add `hong-kong` to `CITY_BOUNDS` in public/city-session.js, derived from the catalog's lat/lng extent plus a small margin, with the same comment style as the Dublin entry (PR #468). Check it does not overlap another region's box; if it does, note containment order.
3. Do NOT flip status; do NOT add the picker/country entry or MULTI_CITY_IDS — Mark does those in the flip commit (his note lists the exact set he validated). Keep status "planned".
4. If "Near me" / findNearestStation in public/app.js needs anything beyond lat/lng on stations (check how Dublin/Copenhagen stations.json feed it), match that shape.

## Acceptance
1. Every station in lib/cities/hong-kong/stations.json has numeric lat/lng inside the new CITY_BOUNDS box; Admiralty, Hong Kong, Kowloon, Tsing Yi, Sunny Bay, Lo Wu, Tuen Mun each within 300 m of their known positions (state the reference you used).
2. With status/lists temporarily set to live ONLY in your local working copy (revert before committing), `node qa/live-city-lists-sync.mjs` no longer reports a CITY_BOUNDS failure for hong-kong.
3. `node qa/hong-kong-dogfood-gate.mjs`, `node qa/hong-kong-line-map-conformance.mjs`, `node qa/country-regions-sync-gate.mjs`, `node qa/run-all.mjs --smoke` green (the Greater Manchester `no-live-feed-stops-gate.mjs` "Near me" assertion is a known local time-of-day flake — if it is the only failure, re-run it alone and report).
4. PR title: "Hong Kong: station coordinates + CITY_BOUNDS (flip prerequisite) — still planned". Link this brief and Mark's note.
