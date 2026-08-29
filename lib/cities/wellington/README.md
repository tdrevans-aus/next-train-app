# Wellington (Metlink) station catalog

Adapter catalog for `lib/providers/wellington.js`. **Not** wired to product UI. City stays **planned**. Separate from Auckland.

- Hub GTFS name is **Wellington Station**.
- Modes v1: **TRAIN** only — Kāpiti (KPL), Hutt Valley (HVL), Melling (MEL), Johnsonville (JVL), Wairarapa (WRL). No bus, ferry, or cable car.
- **Melling Station** is closed (~late 2028); MEL live terminus is **Western Hutt Station**.
- Time zone: `Pacific/Auckland` (same DST as Auckland).
- D1 pack: `docs/wellington-d1/`. D2 fixture: `qa/fixtures/wellington/published-network.json`.
- Live sweep (D6, not CI): `npm run sweep:wellington` (needs `METLINK_API_KEY`).
