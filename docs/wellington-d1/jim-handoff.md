Wellington D1 research pack (documents the already-shipped planned adapter). City stays **planned**. Perth/Auckland live-gates untouched. **assertCityLive("wellington") must still fail.** No UI flip. Do not merge into auckland.

Drop later (copied as D2): qa/fixtures/wellington/published-network.json. Pack: docs/wellington-d1/ published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, qa-note.md.

D1 = official Metlink **Regional Rail Network** PDF https://www.metlink.org.nz/assets/Network-maps/RegionalRailNetwork.pdf plus line timetables. **Hand-transcribed. Not generated from GTFS.**

Modes v1: TRAIN only — **KPL, HVL, MEL, JVL, WRL**. 47 unique stations. Hub **Wellington Station**. No bus/ferry/cable car. **Melling Station closed**; MEL live terminus **Western Hutt Station**.

H2: Static GTFS public zip (no key). RT needs **METLINK_API_KEY** (`x-api-key`). Adapter already at `lib/providers/wellington.js`.

H7: **Pacific/Auckland HAS DST.**

§3 rec: **line + terminus**. See qa-note.md for adapter verification (flags only — no silent fixes). Do not flip wellington live.
