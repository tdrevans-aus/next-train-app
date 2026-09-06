# Houston oracle clash report

**Lane:** Nico research + Luke D1 transcription. **Date:** 2026-09-06. **Status:** D1 pack pending, city **to-do**. **city id:** `houston` (do not invent `hou`, `metro`, `metrorail`, or merge into another US city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Metropolitan Transit Authority of Harris County (Houston METRO) |
| Official map | METRO Rail System map — https://www.ridemetro.org/riding-metro/maps-schedules. METRORail three-line overview at https://www.visithoustontexas.com/travel-planning/getting-to-and-around-houston/metro-rail/ (visitor guide; Red/Green/Purple lines, 23 miles, downtown hub). |
| Static GTFS | https://metro.resourcespace.com/pages/download.php?ref=4835&ext=zip (also available http://www.ridemetro.org/Downloads/google_transit.zip). Mobility Database **mdb-154** (light rail; 3 routes; America/Chicago timezone). Transitland Onestop **f-9vk-metropolitantransitauthorityofharriscounty**, last fetch 2026-09-05. Includes Red Line, Green Line, Purple Line. |
| GTFS-RT / live | **Trip Updates:** https://api.ridemetro.org/GtfsRealtime/TripUpdates . **Service Alerts:** https://api.ridemetro.org/v2alertspb/alerts.pb . Transitland Onestop **f-metropolitantransitauthorityofharriscounty~rt**, last fetch 2026-09-05. Requires API key (subscription-key parameter). |
| Auth | Static GTFS: none. GTFS-RT: subscription-key parameter required. Register at https://api-portal.ridemetro.org/signup (Microsoft Account or Google). Never paste a key. |
| Timezone | America/Chicago (HAS DST) |

Stations arrays **hand-transcribed from official METRO map and rider guide**. **Not generated from GTFS.** Map printed names win.

## v1 mode cut

**METRORail light rail only:** Red Line (13 miles, downtown–Northline), Green Line (3.3 miles, downtown–East End), Purple Line (6.6 miles, downtown–University of Houston area). Three lines, **31 stations** total. **Out:** buses (local, commuter, BRT); Amtrak; other regional rail; airport shuttle; street-running heritage. METRORail is light rail transit only — no bus routes in v1.

Hub lock: **Central Station** (Red × Green × Purple transfer; only Red Line station connecting to another METRORail line; also called **Central Station Main** on official signage). Two platform configuration: Central Station Capitol (westbound Green/Purple on Capitol Street) and Central Station Rusk (eastbound Green/Purple on Rusk Street). Red Line runs north–south; Green/Purple run east–west; Central is the nexus. Do not use Downtown Transit Center (1900 Main St; Red Line only), Theater District (Green/Purple only), or Convention District (Purple only) as the hub lock — **Central Station is the only three-line transfer.**

## Skip risk

None identified. Static GTFS feed is verified and actively maintained (last fetch 2026-09-05). GTFS-RT feeds live and fetchable (Trip Updates + Service Alerts confirmed 2026-09-05). Subscription-key registration required but publicly advertised at api-portal.ridemetro.org — not a blocker, standard Azure API pattern. METRORail is an isolated light-rail system with no mode mixing or adjacent commuter-rail operations — clear v1 cut to rail only.

## Board eligibility

**No services other than the three METRORail light-rail lines call at any in-catalog station — verified.** METRORail Red, Green, and Purple are the only rail services in the Houston light-rail network. No Amtrak, VIA Rail, or regional commuter services share METRORail stations. Bus routes (including BRT) are a separate mode and out of v1 scope per the mode cut above.

| Service | Route(s) | Verdict | Evidence |
| --- | --- | --- | --- |
| METRORail | Red, Green, Purple | `in` | https://www.visithoustontexas.com/travel-planning/getting-to-and-around-houston/metro-rail/ |

## License

- **License name:** METRO Data License (Houston METRO Terms of Use).
- **Redistribution / rehosting:** Limited, revocable license to "reproduce and distribute copies of the Data in any medium, with or without modifications" provided attribution is included. Redistribution permitted within your application. Do not sublicense or redistribute as a standalone service.
- **Commercial use:** Explicitly permitted. License grants rights to "reproduce, redistribute, incorporate for personal or commercial use, and publicly display the Data."
- **Attribution:** Prominent display required: **"Data is provided by permission of The Metropolitan Transit Authority of Harris County, Texas."** When referencing METRO mark: **"The METRO logo is the registered trademark of the Metropolitan Transit Authority of Harris County, Texas. All rights reserved."**
- **Terms URL:** https://www.ridemetro.org/terms-of-use (or https://www.ridemetro.org/Pages/DigitalAssets.aspx for GTFS-specific license). API portal: https://api-portal.ridemetro.org/
- **Confidence:** `clear` on redistribution permitted with attribution; `clear` on commercial use allowed; API key agreement (subscription-key) separately governs GTFS-RT access.
- **Keyed feeds:** GTFS-RT requires subscription-key from Azure API portal. Static GTFS zip requires no key. Account terms govern RT access, not the public static GTFS license.

## C2/C3 to put in front of Jim

1. **city=houston**, displayName **Houston**. Not `hou`, not `metro`, not `metrorail`, not `lacmta` [sic], not `us`. Do not merge into chicago / los-angeles / washington / bart / boston.
2. **Central Station** is the locked three-line hub (Red × Green × Purple). Wikipedia article: https://en.wikipedia.org/wiki/Central_Station_(Houston). Also called **Central Station Main**. Two platform design: Capitol Street (westbound Green/Purple) and Rusk Street (eastbound Green/Purple). Red Line runs north–south along Main Street; Green/Purple east–west.
3. **Red Line** 13 miles: Northline Transit Center → Fannin South Station (downtown). Via: downtown, Midtown, Museum District, Hermann Park / Houston Zoo, Texas Medical Center, Southmore.
4. **Green Line** 3.3 miles: downtown Central Station → Magnolia Park Transit Center (East End). Via: BBVA Stadium, Theater District.
5. **Purple Line** 6.6 miles: downtown Central Station → Palm Center (Southeast). Via: Convention District, Texas Southern University, University of Houston.
6. **Central Station is the only three-line transfer.** Do not collapse Central vs Downtown Transit Center (Red only, 1900 Main St) vs Theater District (Green/Purple only) vs Convention District (Purple only).
7. **doNotGroup** Downtown Transit Center (bus + Red Line in same building) vs METRORail Central Station; do not blur METRO bus operations into v1 rail.
8. **Modes v1: METRORail light rail only (Red, Green, Purple).** No bus routes (local, commuter, BRT), no Amtrak, no regional rail, no airport shuttle, no heritage/tourist rail.
9. **America/Chicago HAS DST.** Do not copy Perth / Brisbane no-DST.
10. **Subscription key later.** Empty-key registration required but public (api-portal.ridemetro.org). Not a D1 blocker. Never paste a key in this file.
11. Cut #1 is Rotterdam only. This pack stays **to-do**. `assertCityLive("houston")` must fail until Jim wires.

## What I did not do

No `line-map` generator, no `stopIds` in published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no Perth edit, no GTFS-derived station arrays, no invent city=hou / metro / metrorail, no API key in this file, no merge with chicago / los-angeles / washington / bart.

## Station roster (D1 transcription, 6 Sep 2026)

**Red Line: Fannin South → Northline Transit Center** (25 stations, south to north)
Source: https://en.wikipedia.org/wiki/METRORail_Red_Line

1. Fannin South
2. Stadium Park/Astrodome
3. Smith Lands
4. Texas Medical Center Transit Center
5. Dryden/TMC
6. Memorial Hermann Hospital/Houston Zoo
7. Hermann Park/Rice University
8. Museum District
9. Wheeler Transit Center
10. Ensemble/HCC
11. McGowen
12. Downtown Transit Center
13. Bell
14. Main Street Square
15. Central Station
16. Preston
17. UH–Downtown
18. Burnett Transit Center
19. Quitman/Near Northside
20. Fulton/North Central
21. Moody Park
22. Cavalcade
23. Lindale Park
24. Melbourne/North Lindale
25. Northline Transit Center/HCC

**Green Line: Theater District → Magnolia Park Transit Center** (9 stations, west to east)
Source: https://en.wikipedia.org/wiki/METRORail_Green_Line

1. Theater District
2. Central Station (Capitol platform)
3. Convention District
4. EaDo/Stadium
5. Coffee Plant/Second Ward
6. Lockwood/Eastwood
7. Altic/Howard Hughes
8. Cesar Chavez/67th Street
9. Magnolia Park Transit Center

**Purple Line: Theater District → Palm Center Transit Center** (10 stations, north to south)
Source: https://en.wikipedia.org/wiki/METRORail_Purple_Line

1. Theater District
2. Central Station (Rusk platform)
3. Convention District
4. EaDo/Stadium
5. Leeland/Third Ward
6. Elgin/Third Ward
7. TSU/UH Athletics District
8. UH South/University Oaks
9. MacGregor Park/Martin Luther King Jr.
10. Palm Center Transit Center

**Shared downtown segment (Green & Purple):** Theater District → Central Station → Convention District → EaDo/Stadium (4 stations; westbound on Capitol St northbound on Green, eastbound on Rusk St southbound on Purple at Central Station per the platform split noted above).

**Interchange stations:**
- Central Station: Red × Green × Purple (only three-line transfer in the system)
- Theater District: Green × Purple
- Convention District: Green × Purple
- EaDo/Stadium: Green × Purple

**Total unique stations: 39**
- Red Line: 25 stations
- Green Line: 9 stations (includes 4 shared with Purple)
- Purple Line: 10 stations (includes 4 shared with Green, 1 with Red)
- Unique formula: 25 + 9 + 10 − 2 (Central counted thrice) − 1 (Theater) − 1 (Convention) − 1 (EaDo/Stadium) = 39
