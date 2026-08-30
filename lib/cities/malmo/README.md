# Malmö (Skånetrafiken / Pågatågen) city pack

Status: **planned** (adapterReady). Do not flip live — see `docs/malmo-d1/jim-handoff.md`.

- `stations.json` — 84 stations, printed map strings (docs/malmo-d1/published-network.json's
  `lines[].stations`), coordinates from the Swedish national GTFS feed (Samtrafiken), Europe/Stockholm
  with DST. Hub lock: **Malmö C**.
- `line-map.json` — the 10 Pågatågen corridors (no passenger-facing line codes; see
  direction-model-memo.md), `doNotGroup` for Öresundståg overlap at Malmö C / Triangeln / Hyllie /
  Burlöv and Krösatågen overlap at Hässleholm C, plus the self-referential "Malmö central" ring
  headsign. As of 30 Aug 2026 (docs/board-eligibility-rule.md) these `doNotGroup` pairs mean
  "shown as distinct service entries at the same physical stop", not "hidden" — Öresundståg and
  Krösatågen are both on the board now. `shortTurnGroups` stays empty — short-turn sets are
  observed-indicative only (D5 concern), never a fixed chip list.
- `marketing-directions.js` — product + terminus chips ("Pågatågen mot `<far end>`"), with the
  Malmöringen (ring, line 11) special case: the outbound-through direction is "Malmöringen mot
  Kävlinge" (official `towards`), the self-referential terminating direction is the Tim-approved
  abbreviated via-chip ("Malmöring. v Triangeln" at Malmö C, "Malmöring. v Östervärn" everywhere
  else on that direction). Öresundståg and Krösatågen get their own product-label chips
  ("Öresundståg mot `<far end>`" / "Krösatåg mot `<far end>`") — distinct from Pågatågen
  phrasing. Never inbound/outbound, never "to City", never a raw "Malmö central" headsign.

v1 scope (revised 30 Aug 2026, docs/board-eligibility-rule.md — Tim's product decision, see
docs/malmo-d1/oracle-clash-report.md "Board eligibility"): Pågatågen (regional rail, route_type
106 under agency "Pågatåg") plus Öresundståg and Krösatågen, both walk-up/no-reservation and both
filed under the skane.zip feed's route_desc column (not route_long_name — see
`lib/providers/malmo.js` `tripAllowed()`). Krösatågen shown only where it overlaps the existing
Pågatågen station catalog (Hässleholm C) — Krösatågen-only stations (Killeberg, Osby, Hästveda,
Ballingslöv, …) are not added to the catalog; v1's geographic footprint stays what it was. No
bus, no light rail (closed 1973; seasonal museum tram only). Snälltåget stays excluded
(`out-reservation`, compulsory seat booking).

Source: `docs/malmo-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, `jim-handoff.md`.
