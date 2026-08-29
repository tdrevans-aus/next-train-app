Brussels D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Rotterdam is cut #1 and **untouched**. Melbourne stays planned. Sweden / Stockholm / Göteborg / Malmö / Uppsala stay planned and **untouched**. Washington / Helsinki / Berlin / Munich / Hamburg / Oslo stay planned and **untouched**. **assertCityLive("brussels") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip brussels live from this pack. Do not edit Perth. Do not invent city=bru, city=bruxelles, city=stib, or city=belgium. Sweden out.

Drop later (Jim D2): qa/fixtures/brussels/published-network.json. Research pack is docs/brussels-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

D1 = official STIB/MIVB **Map for metro, CHRONO lines and SNCB-NMBS** https://www.stib-mivb.be/files/live/sites/STIBMIVB/files/Travel/Plans%20r%C3%A9seau/Plan_Metro_Train.pdf (PDF title Plan_Metro_Train_240923; HTTP Last-Modified **Thu, 03 Oct 2024 15:13:01 GMT**) plus official district-map texts as support. Index https://www.stib-mivb.be/travel/network-and-district-maps. Mixed plate — v1 is the **metro legend only**. Stations hand-transcribed from the rendered map. **Not generated from GTFS.** Static NAP zip may 200 empty-key — do not use it to build JSON.

Four lines: **1** Gare de l'Ouest / Weststation – Stockel / Stokkel (21), **2** Simonis – Elisabeth (19), **5** Erasme / Erasmus – Herrmann-Debroux (28), **6** Roi Baudouin / Koning Boudewijn – Elisabeth (26). **60** unique open metro stops. **94** line ticks. **No passenger metro 3 or 4.** Tracker M1–M6 overstates.

Hub lock **Arts-Loi / Kunst-Wet** (metro **1 × 2 × 5 × 6**; official district text: metro 1, 2, 5, 6; no tram). Not Gare du Midi / Zuidstation, not Gare Centrale, not De Brouckère, not Rogier, not Simonis, not Elisabeth. **Simonis ≠ Elisabeth.** Bilingual FR/NL names.

C2/C3: (1) Separate city brussels, agency STIB/MIVB. Do not invent city=bru. (2) Lock Arts-Loi / Kunst-Wet. (3) Metro 1/2/5/6 only. Tram, premetro, CHRONO, SNCB, De Lijn, TEC out. (4) Metro 3 Albert–Bordet frozen — out. (5) doNotGroup Simonis vs Elisabeth; Midi SNCB vs metro; Gare du Nord (no metro). (6) FR/NL slash pairs as locked.

H2: no product brussels stations.json. Clash is **map-stack order vs FR/NL lock** plus **metro vs premetro / SNCB name family**.

**Live boards: BMC Waiting Time + Vehicle Positions keyed later — not a D1 blocker.** Portal https://api-management-opendata-production.developer.azure-api.net/apis. Header `Ocp-Apim-Subscription-Key`. No STIB GTFS-RT (NAP). Empty-key WaitingTimes.json **404** on 29 Aug 2026. This pack has **no key** and did not call the API with a real key. Never paste a key. D1 stays planned. assertCityLive("brussels") must fail.

H7: Europe/Brussels **HAS DST**. Do not copy Perth / Brisbane no-DST.

§3 rec: line + terminus (`1 + Stockel / Stokkel`, `6 + Roi Baudouin / Koning Boudewijn`). Flag: inbound/outbound dies at Arts-Loi / Kunst-Wet. **Arts-Loi / Kunst-Wet is a hub stop string, not a direction token.** Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **brussels**. Do not flip from this pack. Testers live is Jim’s job, not this pack’s flip.
