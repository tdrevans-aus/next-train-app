# Auckland (AT) station catalog

Live for testers. **Not** a public store listing. City `auckland` — not `city=nz`.

- Hub: **Waitematā Station** (not Britomart, City Centre, or Waitemata Train Station).
- Macron locks: Ōrākei, Ōtāhuhu, Paerātā, **Rānui**, **Te Pāpapa**. Paerātā and Drury are in.
- Modes v1: **TRAIN** only (Southern, Eastern, Western, Onehunga). No bus, ferry, AirportLink, Te Huia.
- Onehunga Line currently ends at **Newmarket**.
- CRL stations are not inserted. Maungawhau closed. Ngākōroa not open.
- Time zone: `Pacific/Auckland` (DST).
- Live: AT GTFS-R with `AT_API_KEY`. Sweep: `npm run sweep:auckland`.
- D1 oracle: `qa/fixtures/auckland/published-network.json` (copied from `docs/auckland-d1/`). Do not generate that file from GTFS.
