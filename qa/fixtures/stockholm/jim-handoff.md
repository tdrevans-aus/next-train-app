Stockholm D1 research pack (documents the already-shipped planned adapter). City stays **planned**. Perth/Sydney/Brisbane live-gates untouched. **assertCityLive("stockholm") must still fail.** No generator. No live flip. Do not invent Göteborg inside this city.

Drop later (already present as D2): qa/fixtures/stockholm/published-network.json — keep as a **verbatim copy** of docs/stockholm-d1/published-network.json. Pack files: docs/stockholm-d1/ published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, qa-note.md.

D1 = official SL Spårtrafikkarta PNG 250414 https://images.ctfassets.net/9t2ujbulz1j7/KPuTvfWiEovOdFcO8q2kQ/b37312b61e82f24a52502a05b425ec4c/SL_Spartrafikkarta_250414.png linked from https://sl.se/reseplanering/kartor/spartrafikkartor (All spårtrafik). **Hand-transcribed. Not generated from GTFS.**

Modes v1: Tunnelbana **7** T-numbers (10, 11, 13, 14, 17, 18, 19) on **3** colour families + Pendeltåg **4** lines (40, 41, 43, 48) with 43X as a nested skip-stop. No buses. Roslagsbanan / Saltsjöbanan / Tvärbanan / Nockebybanan / Lidingöbanan / Spårväg City are on the same PNG — later, see hazard-pack.

C2/C3: (1) Lock **T-Centralen** ≠ **Stockholm City** ≠ **Stockholms central**. (2) Odenplan (metro) vs Stockholm Odenplan (pendeltåg). (3) GTFS `T-bana`/`station` suffixes vs map. (4) 48 does not through-run City. (5) 42/44 leftover in SL Transport /lines. (6) Preserve Swedish characters. **Göteborg is not in this city.**

H2: SL Transport **no key** https://www.trafiklab.se/api/our-apis/sl/transport (`transport.integration.sl.se/v1/{lines,sites,departures,stop-points}`). Adapter uses this path. **Trafiklab GTFS Sweden needs a key** — optional later, not used by the adapter.

H7: **Europe/Stockholm HAS DST.** Do not copy Brisbane no-DST.

§3 rec: **line + terminus** (Röda linjen + Norsborg). See qa-note.md for adapter verification. Do not flip stockholm live.
