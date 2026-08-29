Göteborg D1 + Trafiklab GTFS Regional adapter. City stays **planned**. Picker shows **Göteborg (Coming Soon)** under Sweden (`se`), beside Stockholm. Perth/Sydney/Brisbane/Amsterdam/Rotterdam live-gates untouched. **assertCityLive("goteborg") must still fail.** No generator. Do not invent city=sweden or gothenburg.

Drop later (already copied as D2): qa/fixtures/goteborg/published-network.json. Research pack is docs/goteborg-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, qa-note.md.

D1 = official Västtrafik **Spårvagns- stombuss- och båttrafik 2026-06-15** plus **Expressbussar och pendeltåg** on https://www.vasttrafik.se/reseplanering/mer-om-reseplanering/linjekartor/. **Hand-transcribed. Not generated from GTFS.**

Modes v1: tram **1–12** + three city-map pendeltåg (**Kungsbacka / Alingsås / Ale**). 132 unique tram + 25 unique train = **157** unique names. No stombuss, båt, express X-bus, regional Västtågen beyond those three. **No metro.** City id is **goteborg**. Display **Göteborg**.

C2/C3: (1) Lock **Brunnsparken** (10 of 12 trams). Lines **8** and **12** miss it — they live at **Korsvägen**. (2) Do not lock **Centralstationen** (renamed **Drottningtorget** 15 Jun 2026). Västtågen hub is **Göteborg Central**. (3) doNotGroup Drottningtorget vs Göteborg Central vs Nils Ericsonsplatsen vs Nils Ericson Terminalen; Liseberg Station tram vs (tåg) vs Liseberg Södra; Gamlestads Torg vs Gamlestaden Station. (4) Line 12 is new Mölndal–Lindholmen. Line 2 is Högsbotorp–Biskopsgården, not Mölndal. (5) Preserve Swedish characters. **Do not merge into Stockholm or Malmö.**

H2: **Trafiklab GTFS Regional `vt`** with `TRAFIKLAB_API_KEY` (static zip). Trafiklab operator table shows **no TripUpdates / vehicle positions for Västtrafik** — adapter uses shared `lib/providers/gtfs/realtime-board.js`, attempts the standard RT URL, and **falls back to schedule-only**. Västtrafik Planera Resa v4 OAuth remains a later option; not wired here. See `qa-note.md` item 11.

H7: **Europe/Stockholm HAS DST.** Do not copy Brisbane no-DST.

§3 rec: **line + terminus** (1 + Tynnered, 12 + Lindholmen, Västtågen + Kungsbacka). Use map legend far end, not first-halt strings. Never “to City”. Do not flip goteborg live.
