# Canberra light rail station catalog

Dogfood catalog for `lib/providers/canberra.js`. **Not** wired to product UI.

- Product v1: **light rail** only (`route_type` 0); buses deferred.
- `stopIds` may be empty — adapter resolves from GTFS static by stop name.
- Time zone: `Australia/Sydney` (ACT).

Sources:

- Static GTFS: https://transport.api.act.gov.au/gtfs/data/gtfs/v2/google_transit.zip
- GTFS-RT trip updates: https://transport.api.act.gov.au/gtfs/data/gtfs/v2/trip-updates.pb
- Auth: `ACT_GTFS_BASIC` or `ACT_GTFS_CLIENT_ID` + `ACT_GTFS_CLIENT_SECRET` (MuleSoft portal).
