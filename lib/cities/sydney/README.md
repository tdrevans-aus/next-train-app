# Sydney (TfNSW) station catalog

Dogfood catalog for `lib/providers/sydney.js`. **Not** wired to product UI.

- `stopIds` may be empty — adapter resolves parent/child platforms from GTFS static by name.
- Requires server env `TFNSW_API_KEY` (never client / git).

Sources:

- Trains static: https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains
- Metro static: https://api.transport.nsw.gov.au/v1/gtfs/schedule/metro
- Trains RT: https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains
- Metro RT: https://api.transport.nsw.gov.au/v2/gtfs/realtime/metro
