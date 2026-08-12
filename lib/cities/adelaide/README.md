# Adelaide rail station catalog

Dogfood catalog for `lib/providers/adelaide.js`. **Not** wired to product UI.

- `stopIds` may be empty — adapter resolves platforms from GTFS static by station name on first fetch.
- Time zone: `Australia/Adelaide` (DST).

Sources:

- Static GTFS: https://gtfs.adelaidemetro.com.au/v1/static/latest/google_transit.zip
- GTFS-RT trip updates: https://gtfs.adelaidemetro.com.au/v1/realtime/trip_updates
- Optional: `ADELAIDE_METRO_API_KEY` (`x-api-key`) — public access works without key (verified 2026).
