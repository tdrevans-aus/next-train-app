# Göteborg (Västtrafik) station catalog

Adapter catalog for `lib/providers/goteborg.js`. Tester-live (flipped by Tim, 29 Aug 2026).

- City id: **goteborg**. Display **Göteborg**. Not gothenburg. Not city=sweden. Not Stockholm. Not Malmö.
- Inner-city lock: **Brunnsparken** (tram; 10 of 12 lines). Lines **8** and **12** miss it — they live at **Korsvägen**.
- Do not lock **Centralstationen** (renamed **Drottningtorget** 15 Jun 2026). Västtågen hub is **Göteborg Central**.
- v1: tram 1–12 + three city-map pendeltåg (Kungsbacka / Alingsås / Ale). 132 unique tram + 25 unique train = 157 unique names. No metro, stombuss, båt, express X-bus, or regional Västtågen beyond those three.
- Line 12 is new Mölndal–Lindholmen. Line 2 is Högsbotorp–Biskopsgården, not Mölndal.
- Time zone: `Europe/Stockholm` (DST).
- Primary board: Västtrafik Planera Resa v4 (`lib/providers/vasttrafik.js`, `VASTTRAFIK_CLIENT_ID`/`VASTTRAFIK_CLIENT_SECRET`) — live estimated times per stop area, 30s shared cache. Missing credentials throw `MissingVasttrafikCredentialsError` rather than a silent fallback.
- Fallback: Trafiklab GTFS Regional `vt` via `TRAFIKLAB_API_KEY`. Static yes; TripUpdates not published for `vt` (schedule-only). Shared helper: `lib/providers/gtfs/realtime-board.js`. Used for the catalog/stop mapping and whenever the live fetch fails or a stop's live results come back empty (see `docs/jim-brief-goteborg-vasttrafik-live.md`, `docs/goteborg-d1/jim-handoff.md`).
- Direction: line + terminus (`1 + Tynnered`, `12 + Lindholmen`, `Västtågen + Kungsbacka`). Map legend far end, not first-halt strings. Never “to City”.

D1 pack: `docs/goteborg-d1/`. D2 fixture: `qa/fixtures/goteborg/published-network.json` is a verbatim copy of that JSON. Do not generate it from GTFS.
