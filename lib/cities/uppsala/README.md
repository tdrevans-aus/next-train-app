# Uppsala (Mälardalstrafik / Mälartåg) city pack

Status: **planned** (adapterReady). Do not flip live — see `docs/uppsala-d1/jim-handoff.md`.

- `stations.json` — 19 stations, the only ones with real coordinates in the Trafiklab GTFS
  Regional `ul` feed (Västerås, Eskilstuna, Stockholm Central, Örebro have zero stop-level data in
  this feed — not invented, see `docs/uppsala-d1/published-network.json`'s `coverageGaps`).
  Europe/Stockholm with DST. Hub lock: **Uppsala C**.
- `line-map.json` — the 4 Mälartåg corridors this feed proves (Gävle; Sala; Arlanda C; Märsta),
  `doNotGroup` for SL-pendeln (SL Line 40, already in `docs/stockholm-d1/`) at **Uppsala C,
  Knivsta, AND Arlanda C** — not just the hub. `shortTurnGroups` stays empty; short-turn sets
  (Tierp, Mehedeby, Morgongåva) are single-snapshot indicative only.
- `marketing-directions.js` — line + confirmed far end ("Mälartåg mot `<far end>`"), resolved
  from `stop_headsign`, never `direction_id` — the Arlanda C and Märsta corridors share one GTFS
  route_id (`9011313099300000`) where `direction_id` does not distinguish the branches.

v1 scope is Mälartåg regional rail only (route_type 100, agency "Mälardalstrafik", agency_id
`33010000167212099`) — no UL buses, no SL-pendeln/SL Line 40.

Source: `docs/uppsala-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, `jim-handoff.md`.
