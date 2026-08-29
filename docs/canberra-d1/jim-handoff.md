Canberra D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Melbourne stays planned. assertCityLive("canberra") must still fail until Jim wires. No generator, no PR, no issues, no product edit. Tim copies files to **docs/canberra-d1/**; Jim owns D2–D6. Do not flip canberra live from this pack. Do not edit Perth.

Drop later (Jim D2): qa/fixtures/canberra/published-network.json. Research pack is /workspace/canberra-pack/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, sources/.

D1 = official CMET/Transport Canberra R1 Route Map Gungahlin–City https://cmet.com.au/wp-content/uploads/TC-Light-Rail-Map.pdf plus City/Gungahlin/Dickson interchange maps and Welcome aboard columns as of 27 Aug 2026. Index https://www.transport.act.gov.au/getting-around/find-a-stop-or-map. Modes v1: TRAIN-like **light rail only**. No bus/Rapid. Stations hand-transcribed. Not generated from GTFS.

One line: **R1** Gungahlin – City. Termini **Gungahlin Place** and **Alinga Street**. 14 open stops. Woden / Stage 2A **not** passenger-open — not inserted.

Hub lock **Alinga Street** (R1 map). Not Civic, not City, not City Interchange.

C2/C3: (1) Lock Alinga Street. (2) Woden/Stage 2A not open. (3) EPIC and vs &. (4) Public google_transit.zip is stale bus-only — do not clash LR names from it as if they were LR parents.

H2: GTFS-RT **no key still works**: http://files.transport.act.gov.au/feeds/lightrail.pb (200 on 27 Aug 2026). MyWay+ static/RT need a key. Public static zip has no R1.

H7: Australia/Sydney **HAS DST**. Do not copy Brisbane no-DST.

§3 rec: line + terminus (R1 + Gungahlin Place). Flag: official UI is to City / Civic. Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **canberra**. Do not flip from this pack.
