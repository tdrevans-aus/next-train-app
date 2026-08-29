Chicago D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Rotterdam stays planned and **untouched** (cut #1 is Rotterdam only). Washington stays planned and **untouched**. Melbourne stays planned. **assertCityLive("chicago") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no PR, no issues, no product edit. Tim copies files; Jim owns D2–D6. Do not flip chicago live from this pack. Do not edit Perth. Do not merge chicago into washington or any other city. Do not invent city=chi, city=cta, city=chicago-l, or city=dc.

Drop later (Jim D2): qa/fixtures/chicago/published-network.json. Research pack is /workspace/chicago-pack/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, sources/.

D1 = official CTA **‘L’ (rail) system diagram** https://www.transitchicago.com/assets/1/6/ctamap_Lsystem.pdf (PDF title [FE-7861-R31] P19 L (rail) system diagram WEB; Last-Modified 11 Aug 2026 19:34:54 GMT) plus official line pages as supporting ordered stops (map still wins). Index https://www.transitchicago.com/maps/. Modes v1: TRAIN-like **CTA ‘L’ only** (Red Blue Brown Green Orange Pink Purple Yellow). No Metra, no Pace, no South Shore Line, no CTA bus. Stations hand-transcribed. Not generated from GTFS.

Eight lines: **Red** Howard–95th/Dan Ryan (33), **Blue** O'Hare–Forest Park (33), **Brown** Kimball + Loop circulation (27), **Green** Harlem/Lake–Ashland/63rd & Cottage Grove (31), **Orange** Midway + Loop circulation (16), **Pink** 54th/Cermak + Loop circulation (22), **Purple** Linden–Howard local & Loop Express (26), **Yellow** Dempster-Skokie–Howard (3). **143** unique passenger ‘L’ stops. **State/Lake** is on the map (temporarily closed into 2029). **Green Damen** is on the map. Red extension 103rd/111th/Michigan/130th is under construction — not inserted. Washington is not a Red stop.

Hub lock **Clark/Lake**. Loop is the structure, not a hub token. Not State/Lake, not Washington/Wabash, not Lake, not Downtown, not The Loop as a station. **doNotCollapse** Clark/Lake vs State/Lake vs Washington/Wabash vs Clark/Division vs Lake vs Howard vs Roosevelt vs the several Ashland / Pulaski / Western / Cicero / Harlem.

C2/C3: (1) Separate city chicago, agency CTA. (2) Lock Clark/Lake; Loop is structure. (3) Same-name different-line stations stay split. (4) Purple local Linden–Howard; Express weekday Loop clockwise. (5) Green two south branches. (6) Yellow Skokie only. (7) Brown/Orange/Pink/Purple circulate the Loop — line + suburban terminus. (8) ‘L’ only.

H2: no product chicago stations.json. Map-vs-page rename (Library vs Harold Washington Library-State/Van Buren; Blue Harlem/Western branch suffixes; Red Washington absent) plus **zero** mix-in with washington / rotterdam.

**Live boards: CTA Train Tracker API exists.** Portal https://www.transitchicago.com/developers/ docs https://www.transitchicago.com/developers/traintracker/ GTFS https://www.transitchicago.com/developers/gtfs/ . Tim signs up later (Auckland pattern). **Not wired.** The key is **not a D1 blocker**. This pack does not contain a key and did not call the API with a real key. D1 stays planned. assertCityLive("chicago") must fail.

H7: America/Chicago **HAS DST** (CDT/CST). Do not copy Perth / Brisbane no-DST.

§3 rec: line + terminus (`Red + Howard`, `Brown + Kimball`). Flag: inbound/outbound dies in the Loop. Clark/Lake is a hub stop string, not a direction token. Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **chicago**. Do not flip from this pack. Testers live is Jim’s job, not this pack’s flip. Not cut #1.
