# Brisbane (SEQ) rail station catalog

Dogfood catalog for `lib/providers/brisbane.js`. **Not** wired to product UI.

- `stopIds` may be empty — adapter resolves platforms from GTFS static by station name on first fetch.
- Add `directionAliases` / line groups when riders need collapsed terminals (see `docs/multi-city-provider-design.md`).

Sources:

- Static GTFS: https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip
- GTFS-RT rail: https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates/Rail
