# Brussels — oracle clash report

**Lane:** Nico research + Luke D1 pack. **Date:** 2026-08-29. **Status:** D1 pack written, **planned**. **city id:** `brussels` (do not invent `bru`, `bruxelles`, `stib`, or merge into another Belgian city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | STIB/MIVB — Société des Transports Intercommunaux de Bruxelles / Maatschappij voor het Intercommunaal Vervoer te Brussel |
| Official map | Network and district maps — https://www.stib-mivb.be/travel/network-and-district-maps (NL: https://www.stib-mivb.be/reizen/netplannen-en-wijkplannen). Oracle PDF on that page: **Map for metro, CHRONO lines and SNCB-NMBS** — https://www.stib-mivb.be/files/live/sites/STIBMIVB/files/Travel/Plans%20r%C3%A9seau/Plan_Metro_Train.pdf (mixed plate — v1 is the metro legend only). Hub lock from the official Arts-Loi / Kunst-Wet district-map text — https://www.stib-mivb.be/files/live/sites/STIBMIVB/files/Travel/Plans%20Quartiers/Plans%20Quartiers%20Verbales/EN/Station-Arts-Loi-Kunst-Wet_Textual-description-of-the-district-map.pdf |
| Static GTFS | Current NAP discovery URL **200 application/zip** (23 MB) empty-key 2026-08-29: https://opendata-discovery-gtfs-static.api.production.belgianmobility.io/api/gtfs/feed/stibmivb/static — no key on this host today. Transitland Onestop **f-u151-stib** (operator **o-u151-stib**) still points at https://api-management-opendata-production.azure-api.net/api/gtfs/feed/stibmivb/static — empty-key **403 Quota Exceeded** 2026-08-29; last successful Transitland fetch 2026-03-31. Historic iRail URL on that page: http://gtfs.irail.be/mivb/mivb-gtfs.zip. Mobility Database **mdb-1088** (official; Europe/Brussels; subway + tram + bus; last download 2026-03-17). Producer URL on that page (`stibmivb.opendatasoft.com/.../gtfszip`) is **404**. Unofficial **mdb-1857** is the same zip plus an empty translations file — STIB told MobilityData to keep the official feed only. |
| GTFS-RT / live | **No STIB GTFS-RT.** Belgian NAP catalog (https://data.belgianmobility.io/en/data.html) lists GTFS-RT for De Lijn, LETEC, NMBS-SNCB only — STIB is absent. Knowledge base: “Note: STIB-MIVB does not produce GTFS-RT feeds” (agency IDs `nmbssncb`, `tec`, `delijn` only) — https://data.belgianmobility.io/en/knowledge-base.html. Live path is proprietary JSON: BMC **Waiting Time** + **Vehicle Positions** (STIB-MIVB Specific Datasets on that catalog). Tracker dataset ids `waiting-time-rt-production` + `vehicle-position-rt-production` are the old OpenDataSoft names; `data.stib-mivb.be` / `data.stib-mivb.brussels` / `opendata.stib-mivb.be` **302 to** https://data.belgianmobility.io/ as of 2026-08-29. Transitland **f-u151-stib~rt** labels https://api-management-opendata-production.azure-api.net/api/datasets/stibmivb/rt/VehiclePositions as GTFS-RT — last fetch Unknown / 403; that disagrees with the NAP. Do not treat it as GTFS-RT. Knowledge-base sample `.../api/datasets/WaitingTimes.json` is **404** empty-key 2026-08-29 — use the developer portal, not that curl. Historic OAuth host `opendata-api.stib-mivb.be` does not resolve. |
| Auth | Static discovery zip: none today (anonymous 200). Azure APIM + live JSON: subscription key from https://api-management-opendata-production.developer.azure-api.net/apis (`Ocp-Apim-Subscription-Key`; Transitland auth info URL https://data.belgianmobility.io). Key is personal / non-transferable under BMC ToU §5. Never paste a key. |
| Timezone | Europe/Brussels (HAS DST) |

Do not generate a published-network.json from GTFS. D1 is the official metro map, hand-transcribed (this pack).

## v1 mode cut

**Metro only:** official heavy metro **1, 2, 5, 6** (printed as metro; bilingual FR/NL station names). Tracker “M1–M6” overstates — there is no passenger metro 3 or 4 on the official map. **Out:** tram; **premetro** (North–South Axis underground tram that looks like metro — official Gare du Midi / Zuidstation district-map text prints tram **4, 10, 51, 81, 82** next to metro 2/6); CHRONO; bus; Noctis; SNCB/NMBS heavy rail and S-lines on the mixed metro+train PDF; De Lijn; TEC. Metro 3 (Albert–Bordet conversion) is a frozen project, not a printed metro line — out until the official metro map says open.

Hub lock: **Arts-Loi / Kunst-Wet** (metro **1 × 2 × 5 × 6**). Official district-map text at every exit: “Metro lines 1, 2, 5, 6 available in the station. Tram: No tram lines available.” Not Gare du Midi / Zuidstation (metro 2/6 + tram + SNCB), not Gare Centrale / Centraal Station, not De Brouckère, not Rogier, not Gare du Nord / Noordstation, not Simonis, not Elisabeth, not Downtown / Centre / Centrum. There is no station on a metro 3 or 4 because those are not metro. doNotGroup Arts-Loi / Kunst-Wet vs Gare du Midi / Zuidstation SNCB vs Gare Centrale / Centraal Station vs De Brouckère vs Rogier vs Simonis vs Elisabeth (Simonis ≠ Elisabeth — line 2 loop ends, two names).

## Skip risk

Premetro / tram 3–4 / 4+10 leaking into metro (the trap); tracker “M1–M6” read as six metro lines; Gare du Midi SNCB + premetro name-family folded into metro; inventing city=`bru` / `bruxelles` / `stib`. Live JSON is keyed (Azure 403 without a usable key) — tracker friction, not a missing feed. Static zip itself is verified. No STIB GTFS-RT — tracker claim holds; Transitland `f-u151-stib~rt` is the documentation trap. Not a skip.

## Map transcription notes (D1 pack, 29 Aug 2026)

D1 (published, as of 29 Aug 2026): [Network and district maps](https://www.stib-mivb.be/travel/network-and-district-maps) **Map for metro, CHRONO lines and SNCB-NMBS** [Plan_Metro_Train.pdf](https://www.stib-mivb.be/files/live/sites/STIBMIVB/files/Travel/Plans%20r%C3%A9seau/Plan_Metro_Train.pdf) (PDF title **Plan_Metro_Train_240923**, Adobe Illustrator 28.1, created Thu 20 Jun 2024 09:10:17 UTC, HTTP Last-Modified **Thu, 03 Oct 2024 15:13:01 GMT**). Mixed plate — v1 is the **metro legend only** (M **1 2 5 6**). Stations arrays **hand-transcribed from the rendered map**. `pdftotext` is layout-scrambled and was **not** used to build stations[]. **Not generated from GTFS.** Static NAP zip 200 empty-key 29 Aug 2026 — not opened for station order. Not generated from `lines.json`. Not generated from Wikipedia.

Official metro folders (legend + terminus boxes on the 240923 plate):

- **1:** Gare de l'Ouest / Weststation – Stockel / Stokkel. **21** ticks. Shared trunk with 5 from Gare de l'Ouest to Merode; east-only Montgomery – Joséphine-Charlotte – Gribaumont – Tomberg – Roodebeek – Vandervelde – Alma – Crainhem / Kraainem – Stockel / Stokkel.
- **2:** Simonis – Elisabeth. **19** ticks. Inner-ring path Simonis – Osseghem / Ossegem – Beekkant – Gare de l'Ouest / Weststation – Delacroix – Clemenceau – Gare du Midi / Zuidstation – Porte de Hal / Hallepoort – Hôtel des Monnaies / Munthof – Louise / Louiza – Porte de Namur / Naamsepoort – Trône / Troon – Arts-Loi / Kunst-Wet – Madou – Botanique / Kruidtuin – Rogier – Yser / IJzer – Ribaucourt – Elisabeth.
- **5:** Erasme / Erasmus – Herrmann-Debroux. **28** ticks. West-only Erasme – Eddy Merckx – CERIA / COOVI – La Roue / Het Rad – Bizet – Veeweyde / Veeweide – Saint-Guidon / Sint-Guido – Aumale – Jacques Brel; then the 1/5 trunk; then Thieffry – Pétillon – Hankar – Delta – Beaulieu – Demey – Herrmann-Debroux.
- **6:** Roi Baudouin / Koning Boudewijn – Elisabeth. **26** ticks. North-only Roi Baudouin / Koning Boudewijn – Heysel / Heizel – Houba-Brugmann – Stuyvenbergh – Bockstael – Pannenhuis – Belgica; then the same 2/6 loop as line 2 from Simonis to Elisabeth.

**60** unique passenger-open metro stop strings after dedupe. **94** line ticks. **Simonis ≠ Elisabeth** (two printed terminus boxes; no Elisabeth district-map row on the official index). Louise / Louiza is on the map between Hôtel des Monnaies / Munthof and Porte de Namur / Naamsepoort.

Hub lock verified on the official map: **Arts-Loi / Kunst-Wet** is the only inner-city 1 × 2 × 5 × 6 cross (1/5 E–W; 2/6 turn N–S). Official [Arts-Loi district-map text](https://www.stib-mivb.be/files/live/sites/STIBMIVB/files/Travel/Plans%20Quartiers/Plans%20Quartiers%20Verbales/EN/Station-Arts-Loi-Kunst-Wet_Textual-description-of-the-district-map.pdf) at every exit: “Metro lines 1, 2, 5, 6 available in the station. Tram: No tram lines available.” Beekkant and Gare de l'Ouest / Weststation are also 1×2×5×6 — western junction / line-1 end, **not** the inner-city lock.

Verified **out** on official district texts (same day):

- Gare du Nord / Noordstation: “Metro: No metro lines available. Tram lines 4, 10, 25, 55.”
- Albert: “Metro: No metro lines available at this station.” Metro 3 Albert–Bordet stays out.
- Gare du Midi / Zuidstation: metro **2, 6** + tram **4, 10, 51, 81, 82** + SNCB on the mixed plate. Not the lock.
- Gare Centrale / Centraal Station: metro **1, 5** only. Not the lock.

Bilingual lock: **FR / NL** with a slash, same form as this report’s hub string (`Arts-Loi / Kunst-Wet`). The map often stacks both languages (sometimes NL above FR). One D1 string per station — see hazard-pack. Map hyphen **Houba-Brugmann**; map accent **Joséphine-Charlotte**.

H2 clash surface (after transcription): **no** product `lib/cities/brussels/`. Clash is **map-stack order vs FR/NL lock** plus **metro vs premetro / SNCB name family** at Midi, Centrale, Rogier, De Brouckère, Gare du Nord. Not GTFS. `assertCityLive("brussels")` is Unknown city / 400.

Empty-key live probe 29 Aug 2026: `…/api/datasets/WaitingTimes.json` **404**. Static NAP zip still **200**. Neither used as a D1 generator. Never paste a key.

## Station name table

Match rule: published D1 string (official metro map, FR / NL slash) vs map stack / district-map title / SNCB print of the same place. `rename` = same place, different printed string. Map metro tick + clash-report FR/NL form win.

| published (D1) | other print | class |
| --- | --- | --- |
| Arts-Loi / Kunst-Wet | district title Arts-Loi (Kunst-Wet); every exit metro 1, 2, 5, 6; no tram | **match (lock)**. Do not use Midi / Centrale / De Brouckère / Rogier / Simonis / Elisabeth / Centre. |
| Gare du Midi / Zuidstation | map often stacks Zuidstation above; district metro 2, 6 + tram 4/10/51/81/82 | **match FR/NL**. **Not the lock.** doNotGroup vs SNCB. |
| Gare Centrale / Centraal Station | district metro 1, 5 | **match**. **Not the lock.** |
| Gare de l'Ouest / Weststation | map often stacks Weststation above; line 1 west box | **match FR/NL**. Line 1 end; line 5 through. Not the lock. |
| Gare du Nord / Noordstation | district **no metro**; tram 4, 10, 25, 55 | **premetro**. Not a D1 row. |
| Albert | district **no metro**; tram 4, 10, 18 | **premetro**. Metro 3 frozen. Not a D1 row. |
| Simonis | district title Simonis; metro 2, 6; map line-2 terminus box | **match**. **≠ Elisabeth.** |
| Elisabeth | map grey terminus box; no district-map row | **match map**. **≠ Simonis.** |
| De Brouckère | map + district; metro 1/5 + North–South Axis tram | **match**. Not the lock. doNotGroup vs premetro. |
| Rogier | map + district; metro 2/6 + North–South Axis tram | **match**. Not the lock. |
| Louise / Louiza | district Louise (Louiza); metro 2, 6 | **match**. On the map between Munthof and Naamsepoort. |
| Étangs Noirs / Zwarte Vijvers | map stacks NL/FR; index Etangs (no accent) | **rename (stack / accent)**. Locked FR + accent. |
| Osseghem / Ossegem | map stacks Ossegem / Osseghem | **rename (stack)**. Locked FR/NL. |
| Crainhem / Kraainem | map stacks Kraainem / Crainhem; district Crainhem / Kraainem | **rename (stack)**. Locked FR/NL. |
| La Roue / Het Rad | map stacks Het Rad / La Roue | **rename (stack)**. Locked FR/NL. |
| Veeweyde / Veeweide | map stacks Veeweide / Veeweyde | **rename (stack)**. Locked FR/NL. |
| Hôtel des Monnaies / Munthof | map stacks Munthof / Hôtel; index Hotel | **rename (stack / accent)**. Locked map Hôtel. |
| Porte de Namur / Naamsepoort | map stacks Naamsepoort / Porte de Namur | **rename (stack)**. Locked FR/NL. |
| Roi Baudouin / Koning Boudewijn | map terminus box stacks NL/FR | **rename (stack)**. Locked FR/NL. Line 6 north end. |
| Houba-Brugmann | district index Houba Brugmann (space) | **lock map hyphen**. |
| Joséphine-Charlotte | district index Josephine-Charlotte | **lock map accent**. |
| Heysel / Heizel | map grey box both names; tram 7 also calls here | **match pair**. doNotGroup vs tram 7 / De Wand. |
| Stockel / Stokkel | map line-1 east box | **match**. Line 1 east end. |
| Erasme / Erasmus | map line-5 west box | **match**. Line 5 west end. |
| Herrmann-Debroux | map line-5 east box | **match**. Line 5 east end. |
| Beekkant | district metro 1, 2, 5, 6; no tram | **match**. Western junction. Not the lock. |
| All other D1 names in published-network.json | same official map / district-map title | match |

**60** unique D1 names. Product `lib/cities/brussels/` **absent**. `assertCityLive("brussels")` is Unknown city / 400.

## H2 — who has line codes today

| surface | 1/2/5/6? | what it actually has |
| --- | --- | --- |
| Plan_Metro_Train.pdf (D1) | **yes** | Legend M 1 2 5 6. Termini boxes as above. T 4 7 8 9 10 and S-lines on the same plate — out. No metro 3 or 4. |
| Network and district maps index | **yes** | Bilingual district-map titles. Also lists premetro stations (Albert, Gare du Nord, …). |
| Arts-Loi / Midi / Nord / Albert district texts | **yes / no** | Arts-Loi metro 1 2 5 6; Midi metro 2 6; Nord **no metro**; Albert **no metro**. |
| Product `lib/cities/brussels/` | **absent** | No brussels stations.json / line-map.json. `assertCityLive("brussels")` is Unknown city |
| BMC Waiting Time / Vehicle Positions | live (key from developer portal) | Proprietary JSON. Not GTFS-RT. Not D1. Empty-key WaitingTimes.json 404 29 Aug 2026. |
| Static NAP GTFS | not used as D1 | Empty-key 200 zip. Not this H2 stop-order surface. |
| Transitland `f-u151-stib~rt` | documentation trap | Labels VehiclePositions as GTFS-RT. NAP disagrees. Do not treat as GTFS-RT. |

H2 conclusion: passenger numbers on the map already agree (**1 / 2 / 5 / 6**). Clash is **bilingual stack order**, **Simonis vs Elisabeth**, **metro vs premetro at Nord / Albert / Midi**, and **no product brussels file**. Do not generate published-network.json from GTFS. Do not merge tram, premetro, or SNCB into this city.

## C2/C3 to put in front of Jim

1. **city=brussels**, displayName **Brussels**. Not `bru`, not `bruxelles`, not `stib`. Do not merge into another Belgian city. Sweden out.
2. **Arts-Loi / Kunst-Wet** is the locked inner-city hub (metro 1 × 2 × 5 × 6). Not Gare du Midi, not Gare Centrale, not De Brouckère, not Rogier, not Simonis, not Elisabeth.
3. **doNotGroup Simonis ≠ Elisabeth.**
4. **doNotGroup Gare du Midi / Zuidstation metro vs SNCB vs premetro.**
5. **doNotGroup Gare du Nord / Noordstation and Albert** (no metro).
6. **Modes v1 metro 1/2/5/6 only.** No tram, no premetro, no CHRONO, no SNCB, no De Lijn, no TEC. No passenger metro 3 or 4.
7. **Europe/Brussels HAS DST.** Live path is keyed BMC JSON. D1 stays **planned**. `assertCityLive("brussels")` must fail.
8. Product child stopIds stay out of this file.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no product edit, no Perth edit, no GTFS-derived station arrays, no invent city=bru, no API key, no Sweden reopen, no edit of `lib/` / registry / `LIVE_CITY_IDS`.

## License

- **License name:** Current portal: Belgian Mobility Open Data Portal Terms of Use (BMC; effective 1 Jan 2026) — **CC BY 4.0** unless a dataset says otherwise. Historic STIB/MIVB Open Data Licence (Gebruiksvoorwaarden, last modified 29/12/2017) was published at `data.stib-mivb.brussels/terms/terms-and-conditions` — that host **302s to BMC** as of 2026-08-29. Transitland still indexes **CC-BY-4.0** + the BMC terms URL.
- **Redistribution / rehosting:** BMC ToU §3: CC BY 4.0 “allows free reuse — including commercial — provided that attribution is given.” It does not add a “do not make the feed available to third parties” clause. Historic STIB 2017 art. 3: personal, non-transferable, non-exclusive, free right to reproduce / publish / distribute the Information via the reuser’s own products; **no sublicence**; reuser “is not allowed to sell the Information itself and/or make it available to third parties for consideration.” Do not treat either text as sublicensable to arbitrary third parties beyond serving riders in our app — Tim judges that. The two texts disagree on selling / passing the data itself.
- **Commercial use:** BMC ToU §3 and FAQ: allowed with attribution. Historic STIB 2017 art. 3(a): commercial reuse in the reuser’s product is allowed; selling the Information itself is not.
- **Attribution:** BMC ToU §4 required wording: `Source: [PTO Name] – Open Data – [Date of dataset update]`. FAQ additionally says credit “Belgian Mobility Company” — that disagrees with §4’s `[PTO Name]`. Historic STIB 2017 required: “Dit product/deze dienst/toepassing gebruikt gegevens verstrekt door de MIVB. Deze gegevens werden voor het laatst op [datum] geüpdatet.” (FR/NL are the official licence versions; EN is a translation.) Transitland: “Any Reuse Of Data Must Include, At A Minimum, The Following Attribution: Source: [pto Name] - Open Data - [date Of Dataset Update].”
- **Terms URL:** https://data.belgianmobility.io/en/terms.html (current; also linked from https://data.belgianmobility.io/en/data.html). Catalog / developer index: https://data.belgianmobility.io/ . Developer key signup: https://api-management-opendata-production.developer.azure-api.net/apis . Historic STIB licence (host now 302s): https://data.stib-mivb.brussels/terms/terms-and-conditions/?flg=nl . Transitland feed: https://www.transit.land/feeds/f-u151-stib . Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-1088 .
- **Confidence:** `clear` that current BMC portal terms are CC BY 4.0 with required attribution and that live JSON is keyed; `unclear` which attribution string (PTO vs “Belgian Mobility Company”) and whether the 2017 no-sublicence / no-sell-the-Information clauses still bind now that the STIB portal 302s to BMC. Do not interpret that as allowed.
- **Keyed feeds:** BMC ToU §5: API key is personal and non-transferable; “not to share, disclose, or transfer their API key to any third party.” The key agreement governs access to the live JSON more tightly than CC BY 4.0 governs a static dump. Never paste a key.

## C2 (Nico locks — still hold; D1 pack now written, still planned)

1. city=`brussels`. displayName Brussels.
2. Arts-Loi / Kunst-Wet hub. doNotGroup Gare du Midi / Zuidstation SNCB / Gare Centrale / De Brouckère / Rogier / Simonis / Elisabeth.
3. Modes v1 metro 1/2/5/6 only. Tram, premetro, SNCB out.
4. assertCityLive("brussels") must fail until wired.
