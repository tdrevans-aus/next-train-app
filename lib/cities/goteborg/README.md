# Göteborg (Västtrafik) station catalog

Adapter catalog for `lib/providers/goteborg.js`. City stays **planned**. Picker shows **Coming Soon**. Do not flip live.

- City id: **goteborg**. Display **Göteborg**. Not gothenburg. Not city=sweden. Not Stockholm. Not Malmö.
- Inner-city lock: **Brunnsparken** (tram; 10 of 12 lines). Lines **8** and **12** miss it — they live at **Korsvägen**.
- Do not lock **Centralstationen** (renamed **Drottningtorget** 15 Jun 2026). Västtågen hub is **Göteborg Central**.
- v1: tram 1–12 + three city-map pendeltåg (Kungsbacka / Alingsås / Ale). 132 unique tram + 25 unique train = 157 unique names. No metro, stombuss, båt, express X-bus, or regional Västtågen beyond those three.
- Line 12 is new Mölndal–Lindholmen. Line 2 is Högsbotorp–Biskopsgården, not Mölndal.
- Time zone: `Europe/Stockholm` (DST).
- Feed: Trafiklab GTFS Regional `vt` via `TRAFIKLAB_API_KEY`. Static yes; TripUpdates not published for `vt` (schedule-only). Shared helper: `lib/providers/gtfs/realtime-board.js`.
- Direction: line + terminus (`1 + Tynnered`, `12 + Lindholmen`, `Västtågen + Kungsbacka`). Map legend far end, not first-halt strings. Never “to City”.

D1 pack: `docs/goteborg-d1/`. D2 fixture: `qa/fixtures/goteborg/published-network.json` is a verbatim copy of that JSON. Do not generate it from GTFS.
