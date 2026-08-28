Rotterdam D1 + research pack (Luke Expansion brief). Jim owns D2–D6 tester-live in the same product drop. Perth/Sydney/Brisbane/Adelaide/Amsterdam live-gates untouched. Melbourne stays planned. No generator, no issues. City id **rotterdam** is separate from **amsterdam**. Do not invent city=nl or the-hague. Do not edit Perth.

Drop later (Jim D2): qa/fixtures/rotterdam/published-network.json. Pack files: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

D1 = official RET Metrolijnenkaart (https://www.ret.nl/home/reizen/kaarten-plattegronden.html) plus RET metro A/B timetables for stop order. Modes v1: TRAIN-like **RET metro A–E only**. No tram, bus, waterbus, NS. Stations hand-transcribed. Not generated from GTFS.

Five lines: **A** Binnenhof–Schiedam Centrum (20; A does not go to Nesselande). **B** Nesselande–Hoek van Holland Strand (32; Strand is in). **C** De Terp–De Akkers (26). **D** Rotterdam Centraal–De Akkers (17). **E** Den Haag Centraal–Slinge (23). 71 unique stops.

Hub lock **Beurs** (all five). Not Rotterdam, not CS, not Centraal Station. Rotterdam Centraal is D terminus / E through-stop — doNotGroup metro vs NS. Den Haag Centraal stays on rotterdam. Locked map forms **Meijersplein/Airport** and **Hoek van Holland Strand**.

§3 rec: line + terminus (`Metro A + Binnenhof`). Oracle JSON status may stay planned; product is tester-live when Jim wires. Testers pick city id **rotterdam**. Not a public store listing.
