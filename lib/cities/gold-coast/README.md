# Gold Coast (G:link)

Live for testers. **Not** a public store listing. Separate city `gold-coast` — **not** part of Brisbane.

- Hub lock: **Helensvale** (tram map). doNotGroup vs QR Helensvale station.
- v1: G:link **L1** only, Helensvale to Burleigh Heads (Stage 3 open 9 Aug 2026). 27 stops. No SEQ trains, buses, or ferries.
- Do not add Stage 4 or Biggera Waters.
- Direction: line + terminus (`L1 Burleigh Heads`).
- Time zone: `Australia/Brisbane` (no DST).
- Same public TransLink SEQ GTFS as Brisbane, filtered to G:link. RT `https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates`.
- D1 oracle: `qa/fixtures/gold-coast/published-network.json` (copied from `docs/gold-coast-d1/`). Do not generate that file from GTFS.
