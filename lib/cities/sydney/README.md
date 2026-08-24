# Sydney (TfNSW) station catalog

Dogfood catalog for `lib/providers/sydney.js`. **Not** wired to product UI. City stays `planned`.

- `stopIds` are populated from the T1–T9 + M1 GTFS fixture (all served child platforms).
- **C2:** Central, Martin Place, Epping, Chatswood, and Sydenham have separate `* Metro` rows. Trains and Metro must not share `stopIds`.
- Regenerate with `node scripts/build-line-map.mjs --city=sydney` after updating `qa/fixtures/sydney/gtfs/`.
- Direction overlay: `shortTurnGroups` empty. §3 is **line + terminus** (`T1 Emu Plains`). City Circle is not a terminus.
- Live sweep (D6, not CI): `npm run sweep:sydney` → `qa/reports/sydney-sweep-*.json` (needs `TFNSW_API_KEY`).
- Helensburgh is suppressed (SCO on the T4 PDF, out of modes v1).

Sources:

- Static GTFS fixture: `qa/fixtures/sydney/gtfs/` (trimmed from the public Greater Sydney complete zip)
- Published oracle: `qa/fixtures/sydney/published-network.json`
- Gateway (key): `https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains` + `/metro`
