# Stockholm (SL) station catalog

Adapter catalog for `lib/providers/stockholm.js`. **Not** wired to a live board. City stays **planned**. Picker shows **Coming Soon**.

- Inner-city lock: **T-Centralen** (metro) ≠ **Stockholm City** (pendeltåg Citybanan) ≠ **Stockholms central** (SJ).
- **Odenplan** (metro) ≠ **Stockholm Odenplan** (pendeltåg).
- v1 TRAIN-like: Tunnelbana 10/11/13/14/17/18/19 and Pendeltåg 40/41/43/48. No buses. Trams / Roslagsbanan / Saltsjöbanan / Tvärbanan later.
- Line 48 does not through-run Citybanan. Do not show 48 at Stockholm City. Do not invent Göteborg / Malmö / city=sweden.
- Time zone: `Europe/Stockholm` (DST).
- Live boards: SL Transport, no API key. Trafiklab GTFS Sweden is optional later (`TRAFIKLAB_GTFS_SWEDEN_KEY` / `TRAFIKLAB_GTFS_SWEDEN_RT_KEY` — env names only).
- Direction: line + terminus (`Röda linjen + Norsborg`). Not inbound/outbound.

D1 pack: `docs/stockholm-d1/`. D2 fixture: `qa/fixtures/stockholm/published-network.json` is a verbatim copy of that JSON. Do not generate it from GTFS.
