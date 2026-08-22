# Brisbane (SEQ) rail station catalog

Dogfood catalog for `lib/providers/brisbane.js`. **Not** wired to product UI.

- `stopIds` are populated from the rail-only GTFS fixture (all child platform stops per parent station).
- Canonical names: **Central** (alias Brisbane Central), **Boggo Road** (alias Park Road).
- Regenerate with `npm run build:line-map` after updating `qa/fixtures/brisbane/gtfs/`.
- Direction overlay (D2 review): `shortTurnGroups` stays empty (§3 is line+terminus). Frozen `doNotGroup` + H4 branch pairs live in `line-map.json`; Exhibition is suppressed. D5 label assertions still held.

Sources:

- Static GTFS fixture: `qa/fixtures/brisbane/gtfs/` (trimmed from https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip)
- Published map oracle: `qa/fixtures/brisbane/published-network.json`
- GTFS-RT rail: https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates/Rail
