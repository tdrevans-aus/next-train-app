# Melbourne — oracle clash report

**Lane:** Nico research. **Date:** 2026-08-29. **Status:** scoped, D1 pack not written. **city id:** `melbourne` (do not invent `mel`, `ptv`, `vic`, or merge V/Line long-distance / trams into a second city id).

## Agency / feed (verified)

Tracker parks Melbourne **Blocked**, owner Tim, Wave 1 last in-scope AU city: “PTV Timetable API key; parked.” **This report still gets written.** Official map, v1 cut, hub, skip risk, and licence are captured below. **Live boards need the PTV Timetable API key. The key is not in this environment. Do not pretend it exists. Never paste a key.**

| field | value |
| --- | --- |
| Agency | **v1:** Public Transport Victoria (PTV) / Transport Victoria, suburban rail operated by **Metro Trains Melbourne**. Transitland operator **o-r1-ptv**. **Out of this city id:** V/Line regional (**f-r1-ptv**, GTFS zip branch **1**), Yarra Trams (**f-r1r0-ptv**, branch **3**), buses (**f-r1r-ptv~4** / **f-r1-ptv~3**), SkyBus (**f-r1r1-ptv~11**, branch **11**), interstate (branch **10**). |
| Official map | Transport Victoria **Metropolitan Melbourne public transport maps** — https://transport.vic.gov.au/plan-a-journey/network-maps/melbourne-public-transport-maps (also linked from ptv.vic.gov.au/more/maps; that host 302s here). Landing prints **Train network map [PDF]** as the popular train plate. Operator line picker (fetched 200, 2026-08-29): https://www.metrotrains.com.au/maps/ — named groups **Alamein, Belgrave, Craigieburn, Cranbourne, Frankston, Glen Waverley, Hurstbridge, Lilydale, Mernda, Pakenham, Racecourse, Sandringham, Stony Point, Sunbury, Upfield, Werribee, Williamstown**. Metro Tunnel passenger pattern from **1 February 2026**: Sunbury + Cranbourne + Pakenham through **Arden, Parkville, State Library, Town Hall, Anzac** (not the City Loop / not Flinders Street) — https://transport.vic.gov.au/news-and-resources/projects/metro-tunnel/more-ways-to-move/sunbury . Direct PDF bytes from that maps index were Cloudflare-challenged from this environment; D1 later transcribes whichever train PDF that page is serving (February 2026 plate vs a September 2026 through-running reprint). Do not invent the network from GTFS. |
| Static GTFS | **No key.** Nested statewide zip (branch folders, each with `google_transit.zip`): https://opendata.transport.vic.gov.au/dataset/3f4e292e-7f8a-4ffe-831f-1953be0fe448/resource/fb152201-859f-4882-9206-b768060b50ad/download/gtfs.zip — empty-key **HEAD 200** `application/zip`, **288 398 506** bytes, Last-Modified **Fri, 28 Aug 2026 14:01:41 GMT**. Dataset landing https://opendata.transport.vic.gov.au/dataset/gtfs-schedule (CKAN last updated **28 August 2026**; branch **2** = Metropolitan Train). Transitland Onestop **f-r1r-ptv** (“operational branch 2 - Metropolitan Train”), last fetch **2026-08-29**, inner path `#2/google_transit.zip`. Mobility Database **mdb-3340** (official; current URL; extracted 2026-07-06). Historic **mdb-657** is the old `http://data.ptv.vic.gov.au/downloads/gtfs.zip`, status **deprecated**, redirect **3340**. **Not this zip’s other branches:** **f-r1-ptv** regional train, **f-r1r0-ptv** tram, **f-r1r1-ptv~11** SkyBus. DataVic mirror: https://discover.data.vic.gov.au/dataset/gtfs-schedule . |
| GTFS-RT / live / PTV API | **Product live path (keyed — the tracker block):** PTV Timetable API **v3** `https://timetableapi.ptv.vic.gov.au` — Swagger UI **GET 200** https://timetableapi.ptv.vic.gov.au/swagger/ui/index ; spec https://timetableapi.ptv.vic.gov.au/swagger/docs/v3 . Departures `GET /v3/departures/route_type/{route_type}/stop/{stop_id}` with **`route_type = 0` metropolitan train** (same lock as existing `lib/providers/melbourne.js` / `lib/providers/ptv/client.js` — fact only, not edited here). Empty-key **GET 403** on `/v3/departures/route_type/0/stop/1071` 2026-08-29. Register: email **APIKeyRequest@ptv.vic.gov.au**, subject **`PTV Timetable API – request for key`** → `devid` + API key; HMAC-SHA1 signature over path+query including `devid`. Official how-to (linked from https://www.vic.gov.au/public-transport-timetable-api , Last-Modified **18 Jun 2025**): https://www.vic.gov.au/sites/default/files/2025-06/PTV-Timetable-API-key-and-signature-document.rtf . FAQs: https://www.vic.gov.au/public-transport-timetable-api-faqs . DataVic: https://discover.data.vic.gov.au/dataset/ptv-timetable-api . **GTFS-RT exists but is a different key, not the v1 product contract:** metro trip-updates / vehicle-positions / service-alerts at `https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/…` — empty-key **401** (`WWW-Authenticate: ApiKey` / `Failed to find key field: KeyId`) 2026-08-29. Transitland **f-r1-ptv~trains~rt**, last fetch **2026-08-29**; header **`KeyId`**; signup https://opendata-signup.transport.vic.gov.au/ . Dataset: https://opendata.transport.vic.gov.au/dataset/gtfs-realtime . Mobility Database **mdb-2656** (TU) / **mdb-2657** (VP) / **mdb-2655** (SA) still point at a **stale** VicRoads Data Exchange `Ocp-Apim-Subscription-Key` — that disagrees with the live 401 + Transitland `KeyId`. Follow the portal + the 401, not the old VicRoads field. Product brief already says no GTFS-R required for Melbourne v1. |
| Auth | GTFS zip: **none** (anonymous 200). PTV Timetable API v3: **`PTV_DEVID` + `PTV_API_KEY`**, HMAC-SHA1 — **key not held; live boards blocked on it**. GTFS-RT: separate **`KeyId`** header (empty-key 401). Never paste a key. |
| Timezone | Australia/Melbourne (**HAS DST**) |

Do not generate a published-network.json from GTFS. D1 is the official train map, hand-transcribed, later.

## v1 mode cut

**Metro Trains Melbourne suburban rail only**, as printed on the official train network map / Metro Trains named groups: Alamein, Belgrave, Craigieburn, Cranbourne, Frankston, Glen Waverley, Hurstbridge, Lilydale, Mernda, Pakenham, Sandringham, Stony Point, Sunbury, Upfield, Werribee, Williamstown — plus the Metro Tunnel spine those Sunbury / Cranbourne / Pakenham services now use (**Arden, Parkville, State Library, Town Hall, Anzac**, passenger from **1 February 2026**). PTV API filter is **`route_type = 0`** (metropolitan train). Night Train on those Metro groups stays in as metro train, not a second mode.

**Stony Point is in.** Official PTV route page https://www.ptv.vic.gov.au/route/13/stony-point/ and the Metro Trains maps picker both name it as a Metro line (Frankston–Stony Point diesel shuttle). It is on the suburban rail map, not V/Line.

**Flemington Racecourse and Showgrounds are in as printed Metro special-events, not a daily spine.** Metro Trains maps picker lists **Racecourse** as a line and both **Flemington Racecourse** and **Showgrounds** as stations. They run for race days / shows, not as a seventeenth regular all-day group. Same rule as a dashed special-events print: keep the names when the official train PDF prints them; do not timetable them as weekday Metro.

**Out:** Yarra Trams; buses (including Night Bus as its own PTV route_type); SkyBus; V/Line long-distance beyond the suburban map (Geelong / Ballarat / Bendigo / Seymour / Gippsland and the rest of branch **1**); coaches; interstate; Melbourne Airport Rail / Suburban Rail Loop until the official train map prints them open (they do not, 2026-08-29). Do not invent city=`mel` / `ptv` / `vic`. Do not split V/Line into a second city id.

Hub lock: **Flinders Street**. There is no station on every Metro group after the Metro Tunnel: Sunbury / Cranbourne / Pakenham skip Flinders Street, North Melbourne, and the City Loop, and transfer **Town Hall ↔ Flinders Street** via the Degraves Street Subway and **State Library ↔ Melbourne Central** via the underground concourse (official Metro Tunnel “more ways to move” pages). **Melbourne Central** is City Loop only (not the tunnel). **Parliament** is City Loop / Frankston — not all groups. **Town Hall** is Metro Tunnel only. **Southern Cross** is Metro + V/Line. Flinders Street remains the inner lock for the City Loop / cross-city surface groups and the named interchange to Town Hall. Existing dogfood catalog and probe already use Flinders Street as the example stop — do not contradict that. doNotGroup Flinders Street vs Federation Square (not a station; Town Hall’s Swanston Street / Young and Jackson walk) vs Town Hall vs State Library vs Melbourne Central vs Parliament vs Flagstaff vs Southern Cross Metro vs Southern Cross V/Line vs North Melbourne vs Arden vs Union (Pakenham/Cranbourne suburban, not Sydney) vs Richmond.

## Skip risk

**Key block: yes — PTV Timetable API (`devid` + HMAC key).** Tracker **Blocked** / “PTV Timetable API key; parked. No follow-up unless Tim says.” is that wait, not a missing map and not a skip of the city. **Missing map: no.** Named Metro groups and the official train-map landing exist. Static GTFS branch 2 is verified empty-key 200. Live next-train in this product still cannot run until Tim has the PTV key in Vercel env (`PTV_DEVID` + `PTV_API_KEY`). Empty-key API is **403**. Do not substitute the no-key GTFS zip, and do not treat the separate GTFS-RT `KeyId` as the PTV Timetable API key.

Other named traps, not skips: tram / V/Line / SkyBus leaking into metro; Southern Cross V/Line vs Metro; Flinders Street vs Town Hall vs Federation Square; Melbourne Central vs State Library; inventing city=`mel` / `ptv` / `vic`; generating D1 from the nested GTFS zip.

## License

**PTV Timetable API (v1 live path — keyed)**

- **License name:** Creative Commons Attribution 4.0 International, as stated on the PTV Timetable API page (clicking Swagger “agrees to the Licence terms of use outlined on this page”).
- **Redistribution / rehosting:** CC BY 4.0 allows copy, distribute, transmit, and adapt, with attribution. The same page: use the data as licensed; do not use PTV IP / trade marks for any other purpose; “Don’t pretend to be us.” Do not treat this as sublicensable to arbitrary third parties beyond serving riders in our app — Tim judges that. Transitland indexes the related GTFS dump as redistribution allowed = Yes.
- **Commercial use:** CC BY 4.0 allows commercial use with attribution. Unclear only that the keyed API is also a registration/HMAC access grant — that grant can be withheld while the data licence is CC BY.
- **Attribution:** Requested wording: `Source: Licensed from Public Transport Victoria under a Creative Commons Attribution 4.0 International Licence.`
- **Terms URL:** https://www.vic.gov.au/public-transport-timetable-api (Licence section; updated 20 June 2025). CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . Swagger: https://timetableapi.ptv.vic.gov.au/swagger/ui/index . Key + signature: https://www.vic.gov.au/sites/default/files/2025-06/PTV-Timetable-API-key-and-signature-document.rtf . DataVic: https://discover.data.vic.gov.au/dataset/ptv-timetable-api .
- **Confidence:** `clear` on CC BY 4.0 + requested attribution + empty-key 403; `unclear` only how far the HMAC key agreement (revocation / “don’t download everything”) sits beside CC BY.
- **Keyed feeds:** **Yes. This is the block.** `devid` + API key, HMAC-SHA1. Key is not in git / this report. Never paste a key.

**GTFS Schedule zip (no key; not the v1 live path)**

- **License name:** Creative Commons Attribution 4.0. CKAN `license_id` **CC-BY-4.0**. Transitland **f-r1r-ptv**: CC-BY-4.0; use without attribution = No; commercial = Yes; redistribution = Yes. Mobility Database **mdb-3340** licence URL is CC BY 4.0. **data.gov.au mirror** of the same dataset still prints **Creative Commons Attribution 3.0 Australia** — that disagrees with CKAN + Transitland + mdb-3340. Follow the Transport Victoria CKAN record, not the data.gov.au field.
- **Redistribution / rehosting:** CC BY 4.0 copy/distribute/adapt with attribution. Do not treat as sublicensable beyond serving riders — Tim judges that.
- **Commercial use:** Allowed (CKAN / Transitland / CC BY 4.0).
- **Attribution:** Required. Transitland: use without attribution = No.
- **Terms URL:** https://opendata.transport.vic.gov.au/dataset/gtfs-schedule . https://creativecommons.org/licenses/by/4.0/ . Transitland: https://www.transit.land/feeds/f-r1r-ptv . Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-3340 (current) and https://mobilitydatabase.org/feeds/gtfs/mdb-657 (deprecated).
- **Confidence:** `clear` on CKAN CC BY 4.0 and no-key 200; `unclear` only the data.gov.au CC BY 3.0 AU leftover.
- **Keyed feeds:** None for the static zip.

**GTFS-RT metro (keyed; out of v1 product contract)**

- **License name:** CKAN CC-BY-4.0 on https://opendata.transport.vic.gov.au/dataset/gtfs-realtime . Transitland **f-r1-ptv~trains~rt** same. Mobility Database still cites VicRoads Data Exchange terms — stale relative to the KeyId 401.
- **Keyed feeds:** Header **`KeyId`** from the Transport Victoria Open Data signup. Empty-key 401 verified. Not a substitute for the PTV Timetable API key. Never paste a key.

## C2 for a later D1 pack (not this file's job)

1. city=`melbourne`. displayName Melbourne. Do not invent `mel` / `ptv` / `vic`.
2. Flinders Street hub. doNotGroup Town Hall / Federation Square / Melbourne Central / State Library / Parliament / Southern Cross V/Line.
3. Modes v1 Metro Trains suburban rail only (`route_type = 0`). Tram, bus, V/Line, SkyBus out. Stony Point in; Racecourse / Showgrounds special-events only.
4. `lib/providers/melbourne.js` already exists as a planned adapter (HMAC client + dogfood catalog) — fact only; do not edit it in this lane. Registry stays `planned`. **assertCityLive("melbourne") must keep failing (501 planned, not live).** Live boards wait on Tim’s PTV Timetable API key. Do not flip live.
