Stockholm D1 + research pack. City stays **planned**. Perth/Sydney/Brisbane live-gates untouched. **assertCityLive("stockholm") must still fail.** No generator, no PR, no issues, no city flip. Tim copies files; Jim owns D2–D6.

Drop later (Jim D2): qa/fixtures/stockholm/published-network.json. Research pack is /workspace/stockholm-pack/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

D1 = official SL Spårtrafikkarta PNG 250414 https://images.ctfassets.net/9t2ujbulz1j7/KPuTvfWiEovOdFcO8q2kQ/b37312b61e82f24a52502a05b425ec4c/SL_Spartrafikkarta_250414.png linked from https://sl.se/reseplanering/kartor/spartrafikkartor (All spårtrafik). **Hand-transcribed. Not generated from GTFS.** sl.se 2026 does not ship a separate tunnelbana/pendeltåg PDF on that index.

Modes v1: Tunnelbana **7** T-numbers (10, 11, 13, 14, 17, 18, 19) on **3** colour families + Pendeltåg **4** lines (40, 41, 43, 48) with 43X as a nested skip-stop. No buses. Roslagsbanan / Saltsjöbanan / Tvärbanan / Nockebybanan / Lidingöbanan / Spårväg City are on the same PNG — later, see hazard-pack.

C2/C3: (1) Lock **T-Centralen** ≠ **Stockholm City** ≠ **Stockholms central**. (2) Odenplan (metro) vs Stockholm Odenplan (pendeltåg). (3) GTFS `T-bana`/`station` suffixes vs map. (4) 48 does not through-run City. (5) 42/44 leftover in SL Transport /lines. (6) Preserve Swedish characters (T-Centralen, Södertälje, Hässelby, Mörby, Åkeshov). **Göteborg is not in this city.**

H2: SL Transport **no key** https://www.trafiklab.se/api/our-apis/sl/transport (`transport.integration.sl.se/v1/{lines,sites,departures,stop-points}`). **Trafiklab GTFS Sweden needs a key** (403 empty key) — clash incomplete for that product. Public ResRobot `https://api.resrobot.se/gtfs/sweden.zip` (Samtrafiken, 2026-08-23) used names-only. ADELAIDE-style optional key later if Jim wants Trafiklab GTFS; do not invent one.

H7: **Europe/Stockholm HAS DST.** Do not copy Brisbane no-DST.

§3 rec: **line + terminus** (Röda linjen + Norsborg). Official product is already that; not inbound/outbound. Hold D5. Jim owns D2–D6. Do not flip stockholm live.
