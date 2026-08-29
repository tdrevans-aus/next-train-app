# Stockholm (SL) station catalog

Adapter catalog for `lib/providers/stockholm.js`. **Not** wired to product UI. City stays **planned**.

- Inner-city lock: **T-Centralen** (metro, site 9001) ≠ **Stockholm City** (pendeltåg, site 1080) ≠ **Stockholms central** (SJ — not a v1 board hub).
- **Odenplan** (metro) ≠ **Stockholm Odenplan** (pendeltåg).
- v1 TRAIN-like: Tunnelbana 10/11/13/14/17/18/19 and Pendeltåg 40/41/43/48 (43X nested). No buses. Trams / Roslagsbanan / Saltsjöbanan / Tvärbanan later.
- Line 48 does not through-run Citybanan. Do not invent Göteborg.
- Time zone: `Europe/Stockholm` (DST).
- Live boards: SL Transport JSON, no API key. Trafiklab GTFS Sweden is optional later (needs a key).
- Direction: line + terminus (`Röda linjen + Norsborg`). Not inbound/outbound.

D1 pack: `docs/stockholm-d1/`. D2 fixture: `qa/fixtures/stockholm/published-network.json` (verbatim copy). Do not generate it from GTFS.
