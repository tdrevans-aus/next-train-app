# Adelaide (Adelaide Metro) station catalog

Dogfood catalog for `lib/providers/adelaide.js`. **Not** wired to product UI. City stays `planned`.

- Hub display name is **Adelaide Railway Station** (aliases: Adelaide, Adelaide Station).
- `stopIds` stay empty — adapter resolves rail platforms from public GTFS by name.
- Direction overlay: `shortTurnGroups` empty. §3 is **line + terminus** (`Belair line Belair`).
- Port Dock is a seventh printed TRAIN line. Tonsley is a Flinders station, not a line.
- Live sweep (D6, not CI): `npm run sweep:adelaide` → `qa/reports/adelaide-sweep-*.json`. **No API key.**
- D2 line-map is hand-locked from D1. There is **no** Adelaide generator.

Sources:

- Published oracle: `qa/fixtures/adelaide/published-network.json`
- Official rail PDF edition 26 January 2026 + `/timetables/bel|seafrd|flndrs|gawc|outha|ptdock|grng`
- Public GTFS: https://gtfs.adelaidemetro.com.au/v1/static/latest/google_transit.zip
- Public GTFS-R: https://gtfs.adelaidemetro.com.au/v1/realtime/trip_updates
- Time zone: `Australia/Adelaide` (DST)
