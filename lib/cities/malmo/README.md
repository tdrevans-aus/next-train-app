# Malmö (Skånetrafiken / Pågatågen) city pack

Status: **planned** (adapterReady). Do not flip live — see `docs/malmo-d1/jim-handoff.md`.

- `stations.json` — 84 stations, printed map strings (docs/malmo-d1/published-network.json's
  `lines[].stations`), coordinates from the Swedish national GTFS feed (Samtrafiken), Europe/Stockholm
  with DST. Hub lock: **Malmö C**.
- `line-map.json` — the 10 Pågatågen corridors (no passenger-facing line codes; see
  direction-model-memo.md), `doNotGroup` for Öresundståg overlap at Malmö C / Triangeln / Hyllie /
  Burlöv plus the self-referential "Malmö central" ring headsign. `shortTurnGroups` stays empty —
  short-turn sets are observed-indicative only (D5 concern), never a fixed chip list.
- `marketing-directions.js` — product + terminus chips ("Pågatågen mot `<far end>`"), with the
  Malmöringen (ring, line 11) special case: the outbound-through direction is "Malmöringen mot
  Kävlinge" (official `towards`), the self-referential terminating direction is the Tim-approved
  abbreviated via-chip ("Malmöring. v Triangeln" at Malmö C, "Malmöring. v Östervärn" everywhere
  else on that direction). Never inbound/outbound, never "to City", never a raw "Malmö central"
  headsign.

v1 scope is Pågatågen (regional rail, route_type 106 under agency "Pågatåg") only — no bus, no
Öresundståg, no Krösatågen, no light rail (closed 1973; seasonal museum tram only).

Source: `docs/malmo-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, `jim-handoff.md`.
