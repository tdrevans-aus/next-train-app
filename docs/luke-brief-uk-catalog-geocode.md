# Luke brief — geocode the UK station catalogs that ship `lat: null`

**Date:** 7 Sep 2026 · **Lane:** data pack (Luke), then Jim for the gate · **tim-review:** no.
**Dispatch:** `subagent_type: luke`, `isolation: "worktree"`. Branch `uk-catalog-geocode`. Commit, push, open a PR linking this brief. Luke's write set here is `lib/cities/<city>/stations.json` plus one note line per pack — no provider code, no registry.

## Why
Near me can only auto-pick the nearest station when the catalog has coordinates. `public/app.js` `findNearestStation` and `lib/cities/live-city-api.js` `findNearestStation` both skip stations without lat/lng. Since PR #318 a region with no coordinates shows "You're in <Region> — choose a station below" instead of a board; that is the fallback, not the product.

Coverage on 6 Sep 2026 (`total / withCoords`): cumbria 7/0, east-midlands 10/0, edinburgh 25/0, glasgow 17/0, greater-manchester 19/0, london-se-national-rail 10/0, rest-of-scotland 9/0, rest-of-wales 17/0, south-wales 2/0 (being re-scoped separately — `docs/nico-brief-south-wales-rescope.md`; skip it here), south-yorkshire 18/0, southwest 9/0, west-of-england 6/0, north-east 63/61. Done already: liverpool-city-region 97/97 (NaPTAN-sourced — see `docs/liverpool-city-region-d1/jim-handoff.md` for the method), uk-west-midlands, west-yorkshire, thames-valley, solent, greater-anglia.

## Sources, in order
1. **National Rail stations (have a `crs`)**: NaPTAN RailReferences (`https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv` filtered to StopType RLY, or the RailReferences.csv from the NaPTAN download) — CRS → Easting/Northing or lat/lng. Convert OSGB36 to WGS84 if the source gives grid refs (use a proper transform, not a linear approximation; the Liverpool pack notes which library was used).
2. **Tram / metro / subway stops** (Metrolink, Supertram, NET, Edinburgh Trams, Glasgow Subway): NaPTAN StopType TMU/MET stop points by name, or the operator's static GTFS `stops.txt` where the ledger records a confirmed feed. If neither gives a confident match for a stop, leave it `null` and record that in the pack notes — never guess from a street address.
3. Sanity: every coordinate must fall inside its region's `CITY_BOUNDS` box in `public/city-session.js`, and same-name train/tram pairs (Manchester Victoria, Sheffield Station, Nottingham Station) must sit within 300 m of each other.

## Acceptance
1. Every listed pack (except south-wales) has lat/lng for all `crs` stations; tram stops geocoded where a confirmed source exists, otherwise `null` with a notes line naming the source that was tried.
2. Each pack's `notes` gains one line: `Coordinates: <source> pulled <date>; <n>/<total> stations geocoded; <exceptions>`.
3. New gate `qa/uk-catalog-coords-gate.mjs` (smoke tier in `qa/run-all.mjs`): for every live UK region, ≥ 90% of `mode: "train"` stations have finite lat/lng, no coordinate outside the region's `CITY_BOUNDS`, and no coordinate equal to (0, 0).
4. `node qa/run-all.mjs --smoke` green. Do not touch `public/brisbane-dogfood.js` or `public/nearby-mode.js` — the null handling is already fixed.
