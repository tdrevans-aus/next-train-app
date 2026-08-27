# Wellington (Metlink) station catalog

Adapter catalog for `lib/providers/wellington.js`. **Not** wired to product UI. City stays **planned**. Separate from Auckland.

- Hub GTFS name is **Wellington Station** (no guessed aliases; lock from official map when D1 lands).
- Modes v1: **TRAIN** only — Kāpiti (KPL), Hutt Valley (HVL), Melling (MEL), Johnsonville (JVL), Wairarapa (WRL). No bus, ferry, or cable car.
- Time zone: `Pacific/Auckland` (same DST as Auckland).
- Do **not** generate `qa/fixtures/wellington/published-network.json` from GTFS. Wait for Luke D1.
- Live sweep (D6, not CI): `npm run sweep:wellington` (needs `METLINK_API_KEY`).
