Brussels D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Rotterdam is cut #1 and **untouched**. Melbourne stays planned. Sweden / Stockholm / Göteborg / Malmö / Uppsala stay planned and **untouched**. Washington / Helsinki / Berlin / Munich / Hamburg / Oslo stay planned and **untouched**. **assertCityLive("brussels") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip brussels live from this pack. Do not edit Perth. Do not invent city=bru, city=bruxelles, city=stib, or city=belgium. Sweden out.

Drop later (Jim D2): qa/fixtures/brussels/published-network.json. Research pack is docs/brussels-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

## Flip follow-through (20 Sep 2026)

Dogfood wiring landed ahead of the flip, status stays `planned`:
`lib/cities/brussels/dogfood-next-train.js` (single agency — STIB/MIVB
metro 1/2/5/6, directions from the printed line map, board from the
existing schedule-only `fetchStationBoard()`), dispatch switch-cases in
`lib/cities/live-city-api.js` (`directionsFor`/`getMultiCityNextTrain`),
and `qa/brussels-dogfood-gate.mjs` (replacing the retired
`qa/brussels-planned-gate.mjs`, registered in `qa/run-all.mjs`'s smoke
tier).

**SNCB/NMBS — NOT wired, holds the flip.** The Board eligibility section
below rules SNCB domestic rail `in` at Gare Centrale / Gare du Midi / Gare
de l'Ouest (walk-up, no compulsory reservation) and it has a confirmed
free real-time source (iRail liveboard API, no key required — verified
live 19 Sep 2026 against `https://api.irail.be/liveboard/?station=Brussels-Central`,
returned real departures with live delay minutes). It is deliberately left
out of this pass rather than faked: implementing it cleanly needs (1) a
second provider surface for iRail, (2) a station-name map between iRail's
English names (Brussels-Central / Brussels-South/Brussels-Midi /
Brussels-West) and this catalog's locked FR/NL names, and (3) a
doNotGroup-by-mode catalog split at all three stations (SNCB is a separate
building/platform section from the metro, same shape as South Yorkshire's
Sheffield Station rail-vs-Supertram split) — genuine follow-up scope, not
a missing key or a broken call. Recorded in the registry `notes` so Mark's
QA correctly holds the flip on this gap rather than passing it silently.

**Note for Mark — bundle these three one-line additions into the actual
flip commit, not before** (per CLAUDE.md's flip-follow-through split; adding
them early breaks `qa/live-city-lists-sync.mjs` for every city, not just
this one):

1. Add `"brussels"` to `MULTI_CITY_IDS` (and the `MultiCityId` typedef) in
   `lib/cities/live-city-api.js`.
2. Add brussels to `brisbane-dogfood.js`'s mount/available map.
3. Add brussels to `journey-model.js`'s persisted-city/country lists.

D1 = official STIB/MIVB **Map for metro, CHRONO lines and SNCB-NMBS** https://www.stib-mivb.be/files/live/sites/STIBMIVB/files/Travel/Plans%20r%C3%A9seau/Plan_Metro_Train.pdf (PDF title Plan_Metro_Train_240923; HTTP Last-Modified **Thu, 03 Oct 2024 15:13:01 GMT**) plus official district-map texts as support. Index https://www.stib-mivb.be/travel/network-and-district-maps. Mixed plate — v1 is the **metro legend only**. Stations hand-transcribed from the rendered map. **Not generated from GTFS.** Static NAP zip may 200 empty-key — do not use it to build JSON.

Four lines: **1** Gare de l'Ouest / Weststation – Stockel / Stokkel (21), **2** Simonis – Elisabeth (19), **5** Erasme / Erasmus – Herrmann-Debroux (28), **6** Roi Baudouin / Koning Boudewijn – Elisabeth (26). **60** unique open metro stops. **94** line ticks. **No passenger metro 3 or 4.** Tracker M1–M6 overstates.

Hub lock **Arts-Loi / Kunst-Wet** (metro **1 × 2 × 5 × 6**; official district text: metro 1, 2, 5, 6; no tram). Not Gare du Midi / Zuidstation, not Gare Centrale, not De Brouckère, not Rogier, not Simonis, not Elisabeth. **Simonis ≠ Elisabeth.** Bilingual FR/NL names.

C2/C3: (1) Separate city brussels, agency STIB/MIVB. Do not invent city=bru. (2) Lock Arts-Loi / Kunst-Wet. (3) Metro 1/2/5/6 only. Tram, premetro, CHRONO, SNCB, De Lijn, TEC out. (4) Metro 3 Albert–Bordet frozen — out. (5) doNotGroup Simonis vs Elisabeth; Midi SNCB vs metro; Gare du Nord (no metro). (6) FR/NL slash pairs as locked.

H2: no product brussels stations.json. Clash is **map-stack order vs FR/NL lock** plus **metro vs premetro / SNCB name family**.

**Live boards: BMC Waiting Time + Vehicle Positions keyed later — not a D1 blocker.** Portal https://api-management-opendata-production.developer.azure-api.net/apis. Header `Ocp-Apim-Subscription-Key`. No STIB GTFS-RT (NAP). Empty-key WaitingTimes.json **404** on 29 Aug 2026. This pack has **no key** and did not call the API with a real key. Never paste a key. D1 stays planned. assertCityLive("brussels") must fail.

H7: Europe/Brussels **HAS DST**. Do not copy Perth / Brisbane no-DST.

§3 rec: line + terminus (`1 + Stockel / Stokkel`, `6 + Roi Baudouin / Koning Boudewijn`). Flag: inbound/outbound dies at Arts-Loi / Kunst-Wet. **Arts-Loi / Kunst-Wet is a hub stop string, not a direction token.** Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **brussels**. Do not flip from this pack. Testers live is Jim’s job, not this pack’s flip.
