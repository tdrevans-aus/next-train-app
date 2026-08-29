Washington D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Rotterdam is cut #1 and **untouched**. Melbourne stays planned. **assertCityLive("washington") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no PR, no issues, no product edit. Tim copies files; Jim owns D2–D6. Do not flip washington live from this pack. Do not edit Perth. Do not invent city=dc, city=washington-dc, city=wmata, or city=us.

Drop later (Jim D2): qa/fixtures/washington/published-network.json. Research pack is /workspace/washington-pack/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, sources/.

D1 = official WMATA **Metro Rail System Map** https://www.wmata.com/content/dam/wmata-com/maps/system-map-rail.pdf (PDF title Metro Rail System Map; subject Metrorail System Map - Jan 2026; HTTP Last-Modified **Sat, 18 Apr 2026 13:04:09 GMT** = Sat 18 Apr 2026 21:04 PT) plus rider-tools line pages as support only. Index https://www.wmata.com/ride/maps.html (`/schedules/maps/` 301s here). Modes v1: **WMATA Metrorail only**. No Metrobus, Streetcar, MARC, VRE, Amtrak. Stations hand-transcribed from map images (`metro-map-1.png` + `crop-*.png`). Not generated from GTFS. Not generated from developer.wmata.com.

Six lines: **Red** Shady Grove–Glenmont (27), **Orange** Vienna/Fairfax-GMU–New Carrollton (26), **Blue** Franconia-Springfield–Downtown Largo (28), **Silver** Ashburn–Downtown Largo (34) with second east end New Carrollton, **Green** Greenbelt–Branch Av (21), **Yellow** Huntington–Mt Vernon Sq & Greenbelt (22). **98** unique open Metrorail stops. **Potomac Yard-VT is on the map.** **Silver far end is Ashburn.** **Downtown Largo** (not Largo Town Center).

Hub lock **Metro Center**. Not Gallery Place, not Union Station, not L'Enfant Plaza. **Farragut North ≠ Farragut West.** **Metro Center ≠ Gallery Place-Chinatown.**

C2/C3: (1) Separate city washington, agency WMATA Metro. Do not invent city=dc. (2) Lock Metro Center. (3) Metrorail only. (4) Downtown Largo / Ashburn / Potomac Yard-VT / North Bethesda / Hyattsville Crossing / Tysons as printed. (5) Yellow dashed to Greenbelt; Yellow skips Arlington Cemetery and Rosslyn. (6) Silver two east ends (Downtown Largo & New Carrollton).

H2: no product washington stations.json. Map-vs-board (Downtown Largo vs Largo; Gallery Place vs Gallery Pl) plus historic renames (White Flint, Prince George's Plaza, Tysons Corner, Largo Town Center).

**Live boards: developer.wmata.com key later — not a D1 blocker.** Portal https://developer.wmata.com/ (signup https://developer.wmata.com/signup/). Default Next Train is Station Prediction `GET https://api.wmata.com/StationPrediction.svc/json/GetPrediction/{StationCodes|All}` header `api_key`. Empty-key **401** on 29 Aug 2026. Auckland pattern: Tim signs up later. This pack has **no key** and did not call the API with a real key. D1 stays planned. assertCityLive("washington") must fail.

H7: America/New_York **HAS DST**. Do not copy Perth / Brisbane no-DST.

§3 rec: line + terminus (`Red Line + Glenmont`, `Silver Line + Ashburn`). Flag: inbound/outbound dies at Metro Center. **Metro Center is a hub stop string, not a direction token.** Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **washington**. Do not flip from this pack. Testers live is Jim’s job, not this pack’s flip.
