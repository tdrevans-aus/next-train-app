# Newcastle (Light Rail)

Live for testers. **Not** a public store listing. Separate city `newcastle` — **not** part of Sydney.

- Hub: **Newcastle Interchange**. Beach terminus: **Newcastle Beach**. Civic is intermediate.
- v1: Newcastle Light Rail **NLR** only. Six stops: Interchange, Honeysuckle, Civic, Crown Street, Queens Wharf, Newcastle Beach.
- No Central Coast & Newcastle Line trains. No Stockton ferry. No Broadmeadow extension.
- Direction: line + terminus (`NLR + Newcastle Beach`).
- Time zone: `Australia/Sydney` (DST).
- Same `TFNSW_API_KEY` as Sydney. Static `…/v1/gtfs/schedule/lightrail/newcastle`. RT `…/v1/gtfs/realtime/lightrail/newcastle` (NLR proto), **not** the Sydney trains feed.
- D1 oracle: `qa/fixtures/newcastle/published-network.json` (copied from `docs/newcastle-d1/`). Do not generate that file from GTFS.
- **Same-name note (14 Sep 2026, docs/jim-brief-sydney-intercity-fill.md):** Sydney's catalog
  now also has a station called "Newcastle Interchange" — the CCN/HUN heavy-rail hub, added by
  the NSW TrainLink intercity fill. That is a *different* stop_id on a *different* feed
  (`nswtrains`/`sydneytrains`, not `lightrail/newcastle`) from this city's own light-rail
  Interchange stop above. The two cities stay separate (this file's line 3 still holds); the
  country-wide picker must tag each by region so a rider isn't offered the wrong one. This city
  was otherwise untouched by that fill.
