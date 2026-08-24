# Brisbane (SEQ) rail station catalog

Dogfood catalog for `lib/providers/brisbane.js`. **Not** wired to product UI.

- `stopIds` are populated from the rail-only GTFS fixture (all child platform stops per parent station).
- Canonical names: **Central** (alias Brisbane Central), **Boggo Road** (alias Park Road).
- Regenerate with `npm run build:line-map` after updating `qa/fixtures/brisbane/gtfs/`.
- Direction overlay: `shortTurnGroups` empty; Exhibition suppressed. **D5 labels locked (Luke):** Central = 12 marketing chips (T1 Caboolture/Ipswich, not Gympie North/Rosewood; T5 Brisbane Airport).
- Live sweep (D6, not CI): `npm run sweep:brisbane` → `qa/reports/brisbane-sweep-*.json`.
- **Jim before commit:** `npm run sweep:brisbane -- --time=am-peak --day=weekday` on a real weekday morning (Doomben / through-run / S3). Same S5 “one RT past the board” pattern is OK. City stays `planned`; Perth static-directions must stay green.

Sources:

- Static GTFS fixture: `qa/fixtures/brisbane/gtfs/` (trimmed from https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip)
- Published map oracle: `qa/fixtures/brisbane/published-network.json`
- GTFS-RT rail: https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates/Rail
