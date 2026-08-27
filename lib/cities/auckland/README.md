# Auckland (AT) station catalog

Adapter catalog for `lib/providers/auckland.js`. **Not** wired to product UI. City stays **planned**.

- Hub display name is **Waitematā Station** (not Britomart, City Centre, or Waitemata Train Station).
- Macron locks: Ōrākei, Ōtāhuhu, Paerātā, **Rānui**, **Te Pāpapa**.
- Modes v1: **TRAIN** only (Southern, Eastern, Western, Onehunga). No bus, ferry, AirportLink, Te Huia.
- Onehunga Line currently ends at **Newmarket**.
- CRL stations are not inserted. Maungawhau closed. Ngākōroa not open.
- Time zone: `Pacific/Auckland` (DST).
- Live sweep (D6, not CI): `npm run sweep:auckland` (needs `AT_API_KEY`).

Tim copies Luke’s D1 pack later into `qa/fixtures/auckland/` (`published-network.json`, oracle/hazard/memo, `jim-handoff.md`). Do not generate the published network from GTFS.
