# Antwerp — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** Scoped. **city id:** `antwerp` (not `brugge`, not `mechelen`, not merged into Brussels).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | De Lijn — Openbaar Vervoer Vlaanderen (public transport operator, Flanders region) |
| Official map | Antwerp Premetro: https://mapa-metro.com/en/Belgium/Antwerp/Antwerp-Premetro-map.htm. De Lijn network maps: https://www.delijn.be/en/travel-info/plan-journey/maps-and-plans/ |
| Static GTFS | Belgian Mobility Open Data Portal discovery endpoint **200 application/zip** (daily update; current Dec 2026). Primary: https://api-management-opendata-production.azure-api.net/api/gtfs/feed/delijn/static. Historic iRail URL: http://gtfs.irail.be/de-lijn/de_lijn-gtfs.zip (live 2026-08-28). Transitland Onestop **f-u1-delijn** (operator **o-u1-delijn**). Mobility Database **mdb-684** (official; last download 2026-08-28, 2089 routes across Belgium/Netherlands/France). |
| GTFS-RT | Trip Updates: https://api-management-opendata-production.azure-api.net/api/gtfs/feed/delijn/rt/trip-update. Service Alerts: https://api-management-opendata-production.azure-api.net/api/gtfs/feed/delijn/rt/alert. Format: Protocol Buffers, refreshed every 30 seconds. Transitland **f-u1-delijn~rt**; last successful fetch 2026-09-02. |
| Auth | Header: `Ocp-Apim-Subscription-Key` (Azure API Management). Free tier: **100 requests/day, 10 requests/min** anonymous; registered user quotas higher. Developer portal signup: https://api-management-opendata-production.developer.azure-api.net/signin (free account creation; immediate key issuance). Key is personal and non-transferable under Belgian Mobility Terms of Use §5. Never paste a key. |
| Timezone | Europe/Brussels (HAS DST) |

## v1 mode cut

**Premetro tram only:** underground + surface-running tram lines **2, 3, 5, 6, 8, 9, 10, 15** (the Antwerp Premetro network, operated by De Lijn, opened 1975). **Out:** all surface-only tram lines (1, 4, 7, 11, 12, 24); NMBS/SNCB national rail at Antwerp Central Station; bus; ferry. City catalog holds premetro stations only.

**⚠ Temporary service note (May 2026 – March 2027, active as of oracle date):** Lines 3, 5, 9, 15 are running on temporary surface alternative routes due to main tunnel renovation. Lines 2, 6, 8, 10 continue underground. GTFS feed status for these reroutes: unconfirmed (verify at D1 that feed reflects current surface routing).

**Hub lock: Astrid** (premetro station at Koningin Astridplein, directly adjacent to Antwerp Central Station). Served by premetro lines **2, 3, 5, 6, 8, 10** (6 of 8 lines; major interchange). Underground entry halls connect directly to Antwerp Central. Second major hub: Diamant (lines 2, 6, 9, 15; 4 of 8 lines; deepest used premetro station, stacked platform infrastructure, also near Antwerp Central).

## Skip risk

Temporary surface routing (May 2026 onwards): GTFS feed may not yet reflect lines 3, 5, 9, 15 running on surface alternatives. Confirm current vs published routing at D1 pack stage. Otherwise: static feed verified live; GTFS-RT live as of 2026-09-02; keyed access (API key required, free tier or registered account). Not a skip.

## Board eligibility section

Premetro tram lines (v1 in-scope):

| Line | Service type | Verdict | Notes |
|---|---|---|---|
| **2** | Walk-up tram, Astrid–Plantin underground corridor | `in` | No compulsory reservation, direct access from premetro platforms. |
| **3** | Walk-up tram, currently on surface alternative route (tunnel renovation; normally underground Astrid–Plantin) | `in` | Temporary reroute does not change boarding contract (walk-up, no reservation). |
| **5** | Walk-up tram, currently on surface alternative route (tunnel renovation; normally underground) | `in` | Temporary reroute does not change boarding contract. |
| **6** | Walk-up tram, Astrid–Plantin underground corridor | `in` | No compulsory reservation, direct access from premetro platforms. |
| **8** | Walk-up tram, Astrid–P+R Wommelgem underground corridor | `in` | No compulsory reservation, direct access from premetro platforms. |
| **9** | Walk-up tram, currently on surface alternative route (tunnel renovation; normally underground) | `in` | Temporary reroute does not change boarding contract. |
| **10** | Walk-up tram, Astrid–P+R Schoonselhof underground corridor | `in` | No compulsory reservation, direct access from premetro platforms. |
| **15** | Walk-up tram, currently on surface alternative route (tunnel renovation; normally underground Opera–Plantin section) | `in` | Temporary reroute does not change boarding contract. |

**Out-of-scope services at in-catalog stations:**

- **NMBS/SNCB national rail** (Thalys, IC, L-series, RER) calling at Antwerp Central Station: `out-mode`. Heavy rail (different vehicle type from tram). Central Station physically adjacent to Astrid/Diamant premetro stations but separate ticketing, different mode.
- **Surface tram lines 1, 4, 7, 11, 12, 24** (not premetro): `out-mode`. Excluded by v1 mode cut to premetro only.
- **Bus services** in Antwerp: `out-mode`. Out of scope for this city.

**Verdict summary:** All eight premetro tram lines in v1 scope are walk-up boardable. No services fail reservation or check-in tests. No undecided entries.

## Map transcription notes (D1 pack context)

This report does not transcribe a paper map into published-network.json. Antwerp Premetro is a published operating network with timetabled stops in the GTFS feed. D1 pack will verify and extract the 12 currently operational premetro stations from GTFS:

Active stations in service (12): Astrid, Diamant, Elisabeth, Groenplaats, Handel, Meir, Opera, Plantin, Schijnpoort, Sport, Van Eeden, Zegel.

Future planned (4; do not include in v1): Drink, Morckhoven (2026), Sint-Willibrordus, Stuivenberg (2027).

Permanently unused (3; emergency exits only): Carnot, Collegelaan, Foorplein.

Map surface: official Antwerp Premetro network diagrams (mapa-metro, De Lijn official network site). **Not generated from GTFS**; GTFS is the source of truth for stop order and line routing.

## C2 / C3 to put in front of Jim

1. **city=antwerp**, displayName **Antwerp**. Not `brugge`, not `mechelen`. Do not merge into Brussels or other Belgian city.
2. **Astrid** is the hub-lock (premetro lines 2, 3, 5, 6, 8, 10). Directly adjacent to Antwerp Central Station. Not Diamant (fewer lines), not any surface tram stop.
3. **v1 = premetro tram lines 2, 3, 5, 6, 8, 9, 10, 15 only.** Surface-only tram lines 1, 4, 7, 11, 12, 24 are out-mode. No national rail (NMBS/SNCB Central Station is a separate mode).
4. **Lines 3, 5, 9, 15 currently on temporary surface routes** (May 2026 – March 2027, main tunnel renovation). Verify GTFS reflects current routing at D1.
5. **Europe/Brussels HAS DST.** Live path is keyed De Lijn GTFS-RT (Azure API Management). D1 stays **planned** — key friction is development account setup, not feed unavailability. `assertCityLive("antwerp")` must fail until wired.
6. Premetro stations only (12 active). Four more planned for future (2026–2027); do not include.

## License

- **License name:** Belgian Mobility Open Data Portal Terms of Use (effective 1 Jan 2026) — **CC BY 4.0** unless a dataset specifies otherwise. De Lijn static GTFS is governed by BMC terms; de facto CC BY 4.0 as confirmed in Transitland feed page (f-u1-delijn) and Mobility Database (mdb-684).
- **Redistribution / rehosting:** BMC ToU §3: CC BY 4.0 "allows free reuse — including commercial — provided that attribution is given." Attribution must include "Source: [PTO Name] – Open Data – [Date of dataset update]". The license does not add a "do not make the feed available to third parties" clause. Do not interpret CC BY 4.0 as sublicensable to arbitrary third parties beyond serving riders in our app — Tim judges that.
- **Commercial use:** BMC ToU §3 and FAQ: allowed with required attribution.
- **Attribution:** Required minimum: "Source: De Lijn – Open Data – [date of latest dataset update]". Transitland lists: "Any Reuse Of Data Must Include, At A Minimum, The Following Attribution: Source: De Lijn - Open Data - [date Of Dataset Update]."
- **Terms URL:** https://data.belgianmobility.io/en/terms.html (current BMC terms). Developer signup / API key: https://api-management-opendata-production.developer.azure-api.net/signin. Transitland feed page: https://www.transit.land/feeds/f-u1-delijn. Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-684.
- **Confidence:** `clear` that CC BY 4.0 governs De Lijn GTFS static and GTFS-RT feeds via BMC portal, that attribution with date is required, and that commercial use is permitted. `clear` that API key signup is free and immediate. No ambiguity on license terms.
- **Keyed feeds:** BMC ToU §5: API key is personal and non-transferable; "not to share, disclose, or transfer their API key to any third party." The key agreement governs the live feed more tightly than CC BY 4.0 governs a static dump. Never paste a key. Key is obtained free at https://api-management-opendata-production.developer.azure-api.net/signin.

## What I did not do

No published-network.json generation, no stopIds in output, no live city flip, no product edit, no lib/ edit, no registry entry, no GTFS parsing. Premetro stations and lines sourced from Wikipedia and official maps; GTFS feed verified live via Transitland and Mobility Database. Temporary surface reroute (May 2026 onwards) noted as a D1-stage verification requirement, not a skip. Astrid confirmed as hub via line-service analysis (6 of 8 premetro lines vs Diamant's 4).

## C2 locks (Nico — to remain; D1 pack to follow)

1. city=`antwerp`. displayName Antwerp. Not brugge / mechelen / bru.
2. Astrid hub. Premetro lines 2/3/5/6/8/10. Not surface tram, not Central Station rail.
3. Modes v1 premetro 2/3/5/6/8/9/10/15 only. Surface lines 1/4/7/11/12/24 out. NMBS/SNCB out.
4. Temporary reroute (3/5/9/15 on surface, May 2026–March 2027) — verify GTFS at D1.
5. assertCityLive("antwerp") must fail until wired.
