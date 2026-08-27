Gold Coast D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Melbourne stays planned. assertCityLive("gold-coast") must still fail until Jim wires. No generator, no PR, no issues, no product edit. Tim copies files to **docs/gold-coast-d1/**; Jim owns D2–D6. Do not merge gold-coast into Brisbane. Do not edit Perth.

Drop later (Jim D2): qa/fixtures/gold-coast/published-network.json. Research pack is /workspace/gold-coast-pack/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, sources/.

D1 = official Translink G:link tram PDF Effective August 2026 https://translink.com.au/sites/default/files/acquiadam-assets/timetables/260809-gold-coast-tram.pdf plus SEQ network map Version 4 GCLR3 10 Aug 2026. Index https://translink.com.au/plan-your-journey/maps. Modes v1: TRAIN-like **G:link light rail only**. No buses, no QR Gold Coast line. Stations hand-transcribed. Not generated from GTFS.

One line: **L1 / G:link**. Termini **Helensvale** and **Burleigh Heads** (Stage 3 in service from 9 Aug 2026). 27 open stops. Broadbeach South is intermediate. Stage 4 / Airport names on the mixed SEQ map are **not** inserted.

Hub lock **Helensvale** (tram map). Shared QR parent — doNotGroup.

C2/C3: (1) Separate city gold-coast, same SEQ agency as Brisbane. (2) Burleigh Heads live. (3) Queen Street (Southport) vs Brisbane Queen Street bus. (4) Griffith University (Southport) vs Nathan busway. (5) Avenue vs Ave.

H2: Public SEQ GTFS+GTFS-RT **no key**. Static https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip (20260822–20261021). RT https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates filter to L1 / route_type=0. Route L1 already matches passenger pages.

H7: Australia/Brisbane **NO DST**. Same as Brisbane. Do not copy Sydney DST.

§3 rec: line + terminus (G:link + Burleigh Heads). Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **gold-coast**. Do not flip from this pack.
