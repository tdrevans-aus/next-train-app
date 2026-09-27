# Hong Kong flip — live-network evidence (27 Sep 2026, Mark's re-run)

Unlike Copenhagen's flip (proxy 403 to rejseplanen.info from Mark's sandbox), this session's
sandbox had working outbound access to `rt.data.gov.hk`, so the checklist below is genuine
network evidence gathered directly in this run, not deferred to CI.

## Rider-facing endpoint sampling (dev server, flip-commit state, port 3512)

Requests paced >=2s apart per the MTR REST courtesy limit. All returned HTTP 200 with real
departures (`status: "On Time"`, never `"Scheduled"` — confirms every mode on the board is
live-built, not schedule-only, per docs/jim-brief-boston-subway-live-predictions.md).

| Endpoint | Station | Time | Directions returned |
|---|---|---|---|
| /api/board | Admiralty | 3.83s (first call), 3.29s (retry) | East Rail + Lo Wu / Lok Ma Chau (3 trips), Island + Chai Wan (4), Island + Kennedy Town (4), South Island + South Horizons (4), Tsuen Wan + Central (3), Tsuen Wan + Tsuen Wan (4) |
| /api/board | Hong Kong | 1.57s | Airport Express + Airport / AsiaWorld-Expo (3), Tung Chung + Tung Chung (4) |
| /api/board | Sunny Bay | 1.60s | Disneyland Resort + Disneyland Resort (4), Tung Chung + Hong Kong (4), Tung Chung + Tung Chung (4) |
| /api/board | Hung Hom | 1.46s | East Rail + Admiralty (4), East Rail + Lo Wu / Lok Ma Chau (4), Tuen Ma + Tuen Mun (4), Tuen Ma + Wu Kai Sha (4) |
| /api/board | Tseung Kwan O | 0.93s | Tseung Kwan O + North Point (2), Tseung Kwan O + Po Lam / LOHAS Park (3) |
| /api/directions | Admiralty | 0.22s | East Rail + Lo Wu / Lok Ma Chau, Island + Chai Wan, Island + Kennedy Town, South Island + South Horizons, Tsuen Wan + Central, Tsuen Wan + Tsuen Wan (static chip list, no live fetch — matches the dogfood harness) |

No chip carried zero upcoming trips at any sampled station while Sunday daytime service was
running. Every trip's `status` was `"On Time"` — never `"Scheduled"` — confirming
`lib/providers/hong-kong.js` never sets `realtime: false` on any trip (grep-confirmed: the only
`realtime` occurrence in the file is `realtime: "live"` on the returned board object).

**Latency note (non-blocking):** Admiralty (the four-line hub: TWL x ISL x SIL x EAL) took
3.3-3.8s across two samples — over the "under 3s" bar this checklist otherwise met everywhere
else. `fetchStationBoard()` queries each of a station's lines sequentially against
`rt.data.gov.hk`, one HTTP round-trip per line (a deliberate, documented, conservative choice in
the adapter's own header comment, not a bug); a 4-line hub is therefore ~4x a single-line
station's latency. Every other sampled station (1-2 lines) was well under 2s. This is a
performance characteristic of the sequential-fetch design, not a correctness defect — board
content, direction coverage, and trip counts were all correct at Admiralty on every sample. Flagging
for Jim as a possible follow-up (parallelise the per-line fetches for multi-line hub stations)
rather than treating it as a flip blocker, since it doesn't fall into either of the two named
hard-fail categories (a walk-up service silently missing from a board, or a hub-lock violation).

## Coordinates / CITY_BOUNDS (new checklist item, PR #472 fix)

- All 95 stations in `lib/cities/hong-kong/stations.json` carry real `lat`/`lng` (verified
  programmatically — zero stations missing coordinates).
- All 95 fall inside the CITY_BOUNDS box added to `public/city-session.js`
  (`minLat: 22.21, maxLat: 22.56, minLng: 113.91, maxLng: 114.30`) — verified programmatically,
  zero out-of-box stations.
- No other region's CITY_BOUNDS box is anywhere near Hong Kong's — read the full CITY_BOUNDS
  table in `public/city-session.js`; the nearest other boxes are Dublin/Brussels/UK/Scandinavia,
  all in a completely different part of the world. `qa/uk-city-bounds-overlap-gate.mjs` is
  UK-scoped (imports `UK_REGION_IDS` from `lib/providers/uk/catalog.js`) and does not cover
  Hong Kong; the manual verification above is the equivalent check for a region outside that
  gate's scope.
- Admiralty (22.278628, 114.165524, exact station coordinate) and Sunny Bay (22.331984,
  114.028915) both resolve inside the Hong Kong CITY_BOUNDS box and no other box — "Near me"
  would correctly hint `hong-kong` from either location.

## Smoke suite

`node qa/run-all.mjs --smoke` (timeout 600000ms): 156 PASS, 0 FAIL, 599s, after two fixes made in
this session (see mark-qa-note.md item 8): `qa/region-selection.mjs` Test 6's pre-flip
`hasHongKong` assertion, and `lib/cities/hong-kong/coverage.json`'s notes field (removed
internal `docs/hong-kong-d1/...` / CSDI pipeline references flagged by
`qa/coverage-notes-gate.mjs`, which only checks live cities and so never ran against Hong Kong's
coverage.json before this flip).

No dev server or background process left running at the end of this session (confirmed via
`netstat` and `tasklist` — the smoke suite's own dev server was found still listening on one
port after the run and killed).
