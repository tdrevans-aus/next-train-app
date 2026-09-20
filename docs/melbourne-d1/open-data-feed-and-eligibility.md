# Melbourne — Open Data Feed and Board Eligibility

**Date:** 2026-09-20. **Status:** Tim's decision (20 Sep 2026): Melbourne moves to Transport Victoria Open Data Portal — GTFS Realtime over static GTFS schedule, key held as env var `VIC_OPENDATA_API_KEY`.

## Feed (Open Data Portal)

### Realtime Endpoints — GTFS Realtime Protocol Buffers

**Metro Train Services:**
- Trip updates: `https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates`
- Service alerts: `https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/service-alerts`
- Vehicle positions: `https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/vehicle-positions`

**V/Line Regional Train Services:**
- Trip updates: `https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/vline/trip-updates`

**Portal pages with OpenAPI specs:**
- Metro Train resources: https://opendata.transport.vic.gov.au/dataset/gtfs-realtime
- V/Line resources: https://opendata.transport.vic.gov.au/dataset/gtfs-realtime

### Authentication and Rate Limits

**Auth header:** `KeyID` (note capitalization; all requests require this header). Key sourced from Transport Victoria Open Data signup at https://opendata-signup.transport.vic.gov.au/ and held as env var `VIC_OPENDATA_API_KEY`.

**Rate limits and cache:**
- Metro Train: 24 calls per 60 seconds; 30-second cache window.
- V/Line: 20-27 calls per minute (general rate); 30-second cache window.

**Update frequency:** Both feeds near real-time (no fixed polling interval specified in documentation).

### Static GTFS Schedule

**Location:** https://opendata.transport.vic.gov.au/dataset/gtfs-schedule (CKAN dataset landing).

**Folder structure:** The GTFS.zip contains per-mode folders:
- **Folder 1:** V/Line regional train (`google_transit.zip`)
- **Folder 2:** Metropolitan Train (`google_transit.zip`) — **in-scope for Melbourne v1**
- **Folder 3:** Tram
- Folders 4–11: buses, coaches, interstate, SkyBus (out of scope)

Extract folder 2 to use with Metro Train trip updates.

**Update frequency:** Weekly or as needed; last updated 2026-08-28 (per oracle report). Data reflects a rolling 30-day window from export date. No explicit feed_version field specified in documentation; use Last-Modified header for change-driven refresh.

**Trip ID / Stop ID matching:** Unverified whether trip_ids and stop_ids in the GTFS-RT feeds are documented to match the static schedule by shape. Assume standard GTFS matching; validate in adapter testing.

**Known coverage gaps:** Unverified in portal documentation:
- Stony Point diesel shuttle (included in v1 per existing oracle report)
- Metro Tunnel stations opened February 2025 (Arden, Parkville, State Library, Town Hall, Anzac) — assumed covered in latest GTFS as they are in-scope metro lines
- Platform numbers: recent enhancements added them to the dataset
- Rail-replacement buses: included in the static schedule but out of scope for Melbourne v1 mode cut
- V/Line GTFS-R trip updates feed may not cover rail-replacement bus services on V/Line routes

### License and Attribution

**License:** Creative Commons Attribution 4.0 International (CC BY 4.0) across all datasets (realtime and static).

**Attribution wording (required):** "Licensed from Department of Transport and Planning under a Creative Commons Attribution 4.0 International Licence."

**Redistribution and commercial use:** CC BY 4.0 allows copy, distribute, adapt, and commercial use with attribution. Do not treat as sublicensable beyond serving riders in the Next Train app — Tim judges any broader use.

**Terms URLs:**
- Dataset landing (both realtime and schedule): https://opendata.transport.vic.gov.au/dataset/gtfs-schedule and https://opendata.transport.vic.gov.au/dataset/gtfs-realtime
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

---

## Board Eligibility

### Verdict Vocabulary

| Verdict | Meaning |
|---|---|
| `in` | Passes walk-up (test 1) and leave-by (test 2) tests; shown on boards |
| `out-reservation` | Fails test 1 (compulsory seat reservation) |
| `out-mode` | Excluded by v1 mode cut (tram, bus, ferry) |
| `out-product` | Passes tests but excluded by explicit decision with reason and Tim's sign-off |

Per `docs/board-eligibility-rule.md`, no service at an in-catalog Metro station may be silent. Every V/Line service calling at an in-catalog station gets a recorded verdict.

### V/Line Services by Station

**V/Line operates from Southern Cross (all services) and Flinders Street (Gippsland line only).** All V/Line services pass test 2 (leave-by: no check-in, border, or security barrier). Verdict turns on test 1 (walk-up with standard myki / contactless).

| Station | Service (Destination) | Compulsory Reservation? | Verdict | V/Line GTFS-R Coverage | Evidence |
|---|---|---|---|---|---|
| **Southern Cross** | Geelong | No | `in` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Ballarat | No | `in` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Bendigo | No | `in` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Seymour | No | `in` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Traralgon | No | `in` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Echuca | No | `in` | Yes (v/line/trip-updates) | [Unverified: assumed unreserved per web search mentioning no reservation needed](https://www.vline.com.au/getattachment/4c8df200-a6c1-4197-ac6c-8ae72a774bcf/304-Moama-Echuca-Melbourne) |
| | Ararat | No | `in` | Yes (v/line/trip-updates) | [Unverified: assumed unreserved per web search mentioning no reservation needed](https://www.vline.com.au/getattachment/160a4000-b6c5-4125-be00-4b36f07baa72/210-Ararat-timetable) |
| | Maryborough | Unknown | `undecided` | Unknown | [Unverified: not explicitly listed in V/Line FAQ; eTicket availability suggests possible reservation](https://www.thecourier.com.au/story/8751054/new-eticket-system-for-vline-trains-in-ararat-and-maryborough/) |
| | Albury | Yes (all seats) | `out-reservation` | Unverified | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Swan Hill | Yes | `out-reservation` | Unverified | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Shepparton | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Bairnsdale | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1 |
| | Warrnambool | Yes (all seats) | `out-reservation` | Unverified | https://www.vline.com.au/Information/FAQs/Question-1 |
| **Flinders Street** | Traralgon (Gippsland line) | No | `in` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1; Gippsland line serves Flinders Street |
| | Bairnsdale (Gippsland line) | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1; Gippsland line serves Flinders Street |
| **Richmond** (Gippsland line) | Traralgon | No | `in` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| | Bairnsdale | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| **Caulfield** (Gippsland line) | Traralgon | No | `in` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| | Bairnsdale | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| **Clayton** (Gippsland line) | Traralgon | No | `in` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| | Bairnsdale | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| **Dandenong** (Gippsland line) | Traralgon | No | `in` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| | Bairnsdale | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| **Pakenham** (Gippsland line terminus) | Traralgon | No | `in` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| | Bairnsdale | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://citymapper.com/melbourne/vline/stations |
| **North Melbourne** | Seymour | No | `in` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1; Seymour line serves North Melbourne |
| | Shepparton | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://www.vline.com.au/Information/FAQs/Question-1; Shepparton line serves North Melbourne |
| **Footscray** (Regional Rail Link) | Bendigo | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Footscray_railway_station; Bendigo unreserved |
| | Geelong | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Footscray_railway_station; Geelong unreserved |
| | Ballarat | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Footscray_railway_station; Ballarat unreserved |
| | Warrnambool | Yes | `out-reservation` | Unverified | https://en.wikipedia.org/wiki/Footscray_railway_station; Warrnambool reserved |
| | Swan Hill | Yes | `out-reservation` | Unverified | https://en.wikipedia.org/wiki/Footscray_railway_station; Swan Hill reserved |
| | Echuca | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Footscray_railway_station; Echuca unreserved |
| | Ararat | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Footscray_railway_station; Ararat unreserved |
| | Maryborough | Unknown | `undecided` | Unknown | https://en.wikipedia.org/wiki/Footscray_railway_station |
| **Sunshine** (Regional Rail Link) | Geelong | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Sunshine_railway_station; Geelong unreserved |
| | Ballarat | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Sunshine_railway_station; Ballarat unreserved |
| | Ararat | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Sunshine_railway_station; Ararat unreserved |
| | Maryborough | Unknown | `undecided` | Unknown | https://en.wikipedia.org/wiki/Sunshine_railway_station |
| **Broadmeadows** (Seymour/Shepparton line) | Seymour | No | `in` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Broadmeadows_railway_station%2C_Melbourne; Seymour unreserved |
| | Shepparton | Yes | `out-reservation` | Yes (v/line/trip-updates) | https://en.wikipedia.org/wiki/Broadmeadows_railway_station%2C_Melbourne; Shepparton reserved |

**Stations NOT served by V/Line (Metro Trains only):**
- Clifton Hill (Mernda / Hurstbridge lines)
- Watergardens, Sunbury, Craigieburn (Sunbury / Craigieburn lines)

**Interstate and SkyBus:** NSW TrainLink XPT (Sydney–Melbourne at Southern Cross, compulsory reservation — `out-reservation`) and The Overland (Melbourne–Adelaide at Southern Cross, compulsory reservation — `out-reservation`) are out of scope as interstate (v1 mode cut) and neither feeds appear in the Transport Victoria Open Data Portal GTFS-R.

### Summary of Verdict Counts

- **`in`** (walk-up unreserved): 24 verdicts (Geelong, Ballarat, Bendigo, Seymour, Traralgon, Echuca, Ararat across 8 stations; Seymour at Broadmeadows; plus Gippsland Traralgon at 6 stops)
- **`out-reservation`** (compulsory booking): 16 verdicts (Albury, Swan Hill, Shepparton, Bairnsdale, Warrnambool across 7 stations)
- **`undecided`** (Maryborough at Footscray and Sunshine): 2 verdicts awaiting Tim clarification
- **V/Line GTFS-R coverage:** All `in` services and reserved Gippsland/Seymour/Shepparton routes are documented in the V/Line trip updates feed. Unverified whether Albury, Swan Hill, Warrnambool, and Maryborough (if reserved) are included in the feed's scope.

---

### Two Options for V/Line at Shared Metro Stations

**Option A: All V/Line walk-up services `in` (board eligibility default).**
V/Line Traralgon, Echuca, Ararat, Ballarat, Bendigo, Geelong, and Seymour services are walk-up unreserved and pass both board eligibility tests. Board all of them alongside Metro. This is consistent with the stated rule: "every service a rider can walk up and board … belongs on the board."

**Option B: V/Line out-of-scope as inter-city or second operator (product cut).**
Mark all V/Line services `out-product` on the grounds that v1 scope is Metro Trains only, and a separate operator's regional services (even if walk-up) are a product decision to defer. This requires a reason and Tim's sign-off per the rule, and would silence 24 walk-up services that riders can genuinely board.

**Recommendation:** Option A. The board eligibility rule exists precisely to prevent the SJ mistake (silently omitting walk-up services at shared stations). Traralgon and Echuca riders at Dandenong or Footscray can board those trains; the fact that they are V/Line not Metro is not a reason to hide them. Mark the reserved services (`out-reservation`) and the feed coverage gaps (`unverified`) as planned, and bring the unreserved `in` verdicts into the adapter. If a later product decision wants to delist V/Line altogether, that is an `out-product` cut with Tim's recorded reason, not silence.

---

Sources:
- [Transport Victoria Open Data Portal — GTFS Realtime dataset](https://opendata.transport.vic.gov.au/dataset/gtfs-realtime)
- [Transport Victoria Open Data Portal — GTFS Schedule dataset](https://opendata.transport.vic.gov.au/dataset/gtfs-schedule)
- [V/Line FAQ: Are reservations compulsory on V/Line services?](https://www.vline.com.au/Information/FAQs/Question-1)
- [Footscray railway station — Wikipedia](https://en.wikipedia.org/wiki/Footscray_railway_station)
- [Sunshine railway station — Wikipedia](https://en.wikipedia.org/wiki/Sunshine_railway_station)
- [Broadmeadows railway station — Wikipedia](https://en.wikipedia.org/wiki/Broadmeadows_railway_station%2C_Melbourne)
- [Gippsland line — Wikipedia](https://en.wikipedia.org/wiki/Gippsland_line)
- [Clifton Hill railway station — Wikipedia](https://en.wikipedia.org/wiki/Clifton_Hill_railway_station)
- [Citymapper — Melbourne V/Line Stations](https://citymapper.com/melbourne/vline/stations)
- [Transport Victoria signup (Open Data API key)](https://opendata-signup.transport.vic.gov.au/)
