Newcastle D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Melbourne stays planned. assertCityLive("newcastle") must still fail until Jim wires. No generator, no PR, no issues, no product edit. Tim copies files to **docs/newcastle-d1/**; Jim owns D2–D6. Do not merge newcastle into Sydney. Do not edit Perth. Do not touch Melbourne.

Drop later (Jim D2): qa/fixtures/newcastle/published-network.json. Research pack is /workspace/newcastle-pack/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, sources/.

D1 = official Newcastle Transport light rail map https://www.newcastletransport.info/wp-content/uploads/2019/11/MAP-SIMPLE-Newcastle-Light-Rail.pdf plus NLR timetable PDF still linked 27 Aug 2026. Index https://www.newcastletransport.info/plan-your-trip/light-rail/. Modes v1: TRAIN-like **Newcastle Light Rail only**. No buses, no ferry, no NSW TrainLink. Stations hand-transcribed. Not generated from GTFS.

One line: **NLR**. Termini **Newcastle Interchange** and **Newcastle Beach**. Six open stops. No Broadmeadow extension on the official map.

Hub lock **Newcastle Interchange** (map). Beach lock **Newcastle Beach**. Civic is intermediate.

C2/C3: (1) Separate city newcastle, same TFNSW_API_KEY as Sydney. (2) Interchange vs Light Rail child vs Hunter trains. (3) Wickham / Newcastle East are suburbs. (4) Civic ≠ Canberra hub.

H2: Keyed GTFS `https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/newcastle` (zip 24 Aug 2026; NLR / NT_NLR). RT `.../gtfs/realtime/lightrail/newcastle`. Same key as Sydney.

H7: Australia/Sydney **HAS DST**. Do not copy Brisbane no-DST.

§3 rec: line + terminus (NLR + Newcastle Beach). Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **newcastle**. Do not flip from this pack.


7 Sep 2026 (docs/jim-brief-gtfs-snapshot-freshness.md): static snapshot refresh is now change-driven (manifest-probed, not daily-regardless) and the shared board join refuses a stale snapshot at request time (GtfsSnapshotStaleError) instead of silently serving a scheduled-times-as-live board.
