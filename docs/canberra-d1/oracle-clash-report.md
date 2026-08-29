# Canberra oracle clash report

D1 (published, live as of 27 Aug 2026): [R1 Route Map: Gungahlin - City](https://cmet.com.au/wp-content/uploads/TC-Light-Rail-Map.pdf) (Transport Canberra / ACT Government; linked from [CMET Light Rail Stops](https://cmet.com.au/light-rail-stops/) and from Transport Canberra [Using light rail](https://www.transport.act.gov.au/travel-options/light-rail/using-light-rail) as **Gungahlin to Civic map**). Stations arrays hand-transcribed. **Not generated from GTFS.**

Ordered-stop corroboration: [Welcome aboard](https://cmet.com.au/wp-content/uploads/Welcome-Aboard-Brochure.pdf) columns **Gungahlin Place to Alinga Street** / **Alinga Street to Gungahlin Place**. Interchange maps effective 20 July 2026: [City Interchange](https://www.transport.act.gov.au/__data/assets/pdf_file/0019/3004417/TC_interchange_map_city_20-July-2026.pdf) (R1 to Dickson & Gungahlin; street **Alinga St**; no LR south of Alinga), [Gungahlin Interchange](https://www.transport.act.gov.au/__data/assets/pdf_file/0015/3004422/Gungahlin-interchange-map.pdf) (R1 to City), [Dickson Interchange](https://www.transport.act.gov.au/__data/assets/pdf_file/0013/3004420/Dickson-interchange-map.pdf) (R1 to Gungahlin / R1 to City). Network/region maps from [Find a stop or map](https://www.transport.act.gov.au/getting-around/find-a-stop-or-map) effective **20 July 2026**.

Woden / Stage 2A **not D1-live**: [Light Rail to Woden — Built for CBR](https://www.act.gov.au/builtforcbr/browse-all-projects/transport/light-rail-to-woden) — Stage 2A City to Commonwealth Park construction expected complete early 2027, regular services **2028**; Stage 2B 2028–2033. City Interchange 20 July 2026 shows no light rail platforms south of Alinga St.

GTFS (H2 names only; not D1):

| surface | no-key? | result 27 Aug 2026 |
| --- | --- | --- |
| **GTFS-RT** `http://files.transport.act.gov.au/feeds/lightrail.pb` (also https) | **yes** | HTTP **200**, `application/octet-stream`, 14950 bytes, `Last-Modified` Thu, 27 Aug 2026 14:28:03 GMT. Confirmed live. Spec: [TCCS GTFS-R Implementation Specification](https://www.transport.act.gov.au/__data/assets/pdf_file/0004/1356601/TCCS-GTFSR-Implementation-Specification.pdf). Developer page marks this CMO feed **DEPRECATED** in favour of MyWay+; the URL still serves. |
| Historic static `https://www.transport.act.gov.au/googletransit/google_transit.zip` | **yes** | HTTP **200**, 6.4 MB. **Bus-only**: 130 routes all `route_type=3`, no R1, no `route_type=0`. `agency_timezone` Australia/Sydney. Calendar **ended 2025-07-04**. No light-rail parents. |
| MyWay+ static `https://transport.api.act.gov.au/gtfs/data/gtfs/v2/google_transit.zip` | **no** | HTTP **401** Basic `mule-realm`. Guide: [MyWayPlus GTFS developer access guide v1.2](https://www.transport.act.gov.au/__data/assets/pdf_file/0005/2865398/MyWayPlus-GTFS-developer-access-guide-v1.2.pdf). Same 401 on `/gtfs/data/gtfs/v2/trip-updates.pb`. |

Bus/Rapid/coaches out of v1 oracle.

## Station name table

Match rule: published D1 string (R1 map) vs public no-key static `stop_name`. That zip has **no light-rail parents**, so clash is against **bus** rows at the same interchanges plus the live RT (trip/stop ids, no names). `rename` = same place, different printed string.

| published (D1) | public GTFS name | class |
| --- | --- | --- |
| Alinga Street | no LR parent. Bus: **City West Alinga St** (3042) | **rename (lock)** vs bus. Do not use Civic / City / City Interchange / Alinga St as the stop. CMET list: Alinga Street, City. |
| Gungahlin Place | no LR parent. Bus: **Gungahlin Place Plt 3 / 4 / Arrivals** (1801, 7011, 7012, 7016) | match family (bus platforms at the interchange). Do not merge bus plt numbers into the LR stop. |
| Dickson Interchange | no LR parent. Bus: **Dickson Interchange Plt 1 / 2** (945, 946); **Northbourne Av opp Dickson Interchange** (4552) | match family. doNotGroup opp-side bus. |
| EPIC and Racecourse | no LR parent | missing-in-GTFS (public zip). CMET HTML: EPIC & Racecourse |
| Manning Clark North | no LR parent. Bus on Manning Clark Cr only | missing-in-GTFS as LR |
| Mapleton Avenue, Nullarbor Avenue, Well Station Drive, Sandford Street, Phillip Avenue, Swinden Street, Macarthur Avenue, Ipima Street, Elouera Street | no LR parents. Nearby **bus** rows use St/Av abbreviations (Ipima St, Elouera St, Sandford St, …) | missing-in-GTFS as LR; bus streets are not the stop lock |
| Edinburgh Avenue / City South / Commonwealth Park (not on R1 map) | no LR parent | future; not inserted |
| Woden (not on R1 map) | bus **Woden Temporary Interchange Plt 1–6** | other-product; out of v1 |

## H2 — who has R1 today

| surface | R1? | what it actually has |
| --- | --- | --- |
| R1 route map + interchange maps (D1) | **yes** | Route number R1. Map title Gungahlin - City. Interchanges: R1 to City / R1 to Gungahlin / R1 to Dickson & Gungahlin |
| CMET stop page | **yes (line, not code on every card)** | 14 stops Gungahlin Place–Alinga Street, City |
| Public static GTFS `route_short_name` | **no** | Bus numbers only. Zero `route_type=0`. Zero R1 |
| `lightrail.pb` GTFS-RT | ids only | Live trip ids (`6021…`) and numeric stop ids (`8100` / `8129` families). **No stop names in the protobuf.** Confirms a no-key LR realtime still exists |
| MyWay+ GTFS | unknown here | 401 without a key. Later feed for Jim D2 |

H2 conclusion: passenger code **R1** is on the maps. Public static GTFS has **not** followed (and is stale bus). Clash is **Civic vs Alinga Street vs City Interchange vs Alinga St**, **and vs &**, plus **bus platforms at Gungahlin Place / Dickson Interchange / City West Alinga St that must not become the LR lock**. Do not generate published-network.json from `routes.txt`.

## C2/C3 to put in front of Jim

1. **Alinga Street** is the locked hub string. Civic is a TC page-card word. City is a direction on Gungahlin Interchange. City Interchange is the bus/LR facility title. Alinga St is the street label. GTFS bus is City West Alinga St.
2. **Woden / Stage 2A is not open** on 27 Aug 2026. Do not emit Commonwealth Park / City South / Edinburgh Avenue as live D1. Flip after passenger opening is a **new D1**.
3. **14 stops only.** Sandford Street is open (on the map). Do not invent Mitchell as a stop (suburb label).
4. **EPIC and Racecourse** (map) vs EPIC & Racecourse (CMET HTML).
5. **Public google_transit.zip is the wrong feed for LR names.** Keep using `lightrail.pb` (no key, confirmed 200) for RT later; MyWay+ static needs a key.
6. **Australia/Sydney HAS DST.** Do not copy Brisbane no-DST.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub PR, no product edit, no Perth/Melbourne touch.
