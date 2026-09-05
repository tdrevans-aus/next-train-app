# Tampere oracle clash report

D1 (to be published): Nysse (Tampereen joukkoliikenne) [tram network map](https://www.tampereenratikka.fi/en/tram-routes/) showing **Line 1 Kaupin kampus – Pyhällönpuisto** (20 stops) and **Line 3 Hervanta – Sorin aukio** (17 stops), both operational since 2021 opening; shared central trunk **Sammonaukio – Koskipuisto** (4 stops common to both lines: Sammonaukio, Tulli, Rautatieasema, Koskipuisto). Line 2 **Santalahti – Lentävänniemi** opened 7 Jan 2025; further extensions to Partola and Ruotila target Aug 2028 — **not yet in service during entire v1 scope, omitted from v1 oracle**. v1 scope: **tram lines 1 and 3 only, no buses, no VR regional rail**.

## Feeds

**Static GTFS:** http://data.itsfactory.fi/journeys/files/gtfs/latest/gtfs_tampere.zip
- No authentication required (open feed)
- Update frequency: regular/continuous (versioned on data.itsfactory.fi)
- Operator: ITS Factory data service; owned by Tampere City and Nysse
- Transitland Onestop: **f-udb-tampereenjoukkoliikenne**
- Mobility Database: **mdb-866**

**GTFS-RT (real-time):** Via Waltti (Fintraffic / ITS Factory)
- Vehicle Positions (Protobuf): `http://data.itsfactory.fi/journeys/api/1/gtfs-rt/vehicle-positions`
- Service Alerts (Protobuf): `http://data.itsfactory.fi/journeys/api/1/gtfs-rt/service-alerts`
- Trip Updates: `https://dev.publictransport.tampere.fi/` (GTFS-RT format)
- No authentication required (open feeds)
- Documentation: https://dev.publictransport.tampere.fi/docs and https://opendata.waltti.fi/

## Hub-lock station

**Rautatieasema** (Central Railway Station) — both tram lines 1 and 3 serve this stop; it is the central transport interchange linking trams to VR regional and long-distance rail and regional bus services. Confirmed as a shared stop on all current official tram route maps (Nysse, Tampereen Ratikka). Serves as the anchor for the published D1 network (first/last tables reference this stop per Helsinki / Oslo / Stockholm precedent).

Alternate candidate Keskustori (central plaza) is served by both lines but is a less formal transfer point; Rautatieasema is the certified transport hub. **doNotGroup** Rautatieasema tram stop vs. Tampere Central railway station platforms (separate entries if VR regional rail services ever move into catalog v1; currently out-of-scope tram-only).

## Tram lines and stop roster

| Line | Route | Stops | Comments |
| --- | --- | --- | --- |
| 1 | Kaupin kampus/TAYS → Pyhällönpuisto | 20 | West end: Kaupin kampus/TAYS hospital campus; central: Rautatieasema (shared with Line 3); east end: Pyhällönpuisto |
| 3 | Hervanta → Sorin aukio | 17 | West end: Hervanta; central: Rautatieasema (shared with Line 1); east end: Sorin aukio |
| 2 | Santalahti – Lentävänniemi | 13 | **Not in v1 scope.** Opened 7 Jan 2025; further extensions under construction (target Aug 2028). Omitted from v1 oracle. |

Service frequency: 7.5 minutes daytime (weekdays/weekends); 6 minutes peak weekday (from 19 Oct 2026 forward). Night services on Line 3 every 30–60 minutes; Line 1 ends ~22:00 daily.

## Recommendation for v1 mode cut

**v1 scope: tram lines 1 and 3 only.** Do not include Line 2 (under construction, not yet serving passengers for the duration of v1 alpha/beta). Do not include buses (Nysse operates regional buses on lines 1–99+; out-of-scope). Do not include VR regional rail (separate operator, separate fare system, separate Tampere Central railway station venue — doNotGroup).

Tram is the sole v1 mode. Published D1 network name: **Tampere Tram** or **Tampere Ratikka** (Finnish official branding). Agency: **Nysse / Tampereen joukkoliikenne**.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verification:** The tram network (lines 1 and 3, 37 total in-catalog stops) comprises only Nysse tram services. No other rail operator or transport mode serves any tram stop; tram stops are physically and operationally separate from VR railway platforms at Tampere Central / Rautatieasema railway station. Tram boarding is walk-up only: no compulsory reservation, no check-in, no security barriers. All tram services pass both walk-up and leave-by tests.

**Stop-place separation evidence:**
- **In-catalog Rautatieasema (tram):** Nysse tram stops on Lines 1 and 3. Official Nysse route maps show tram stops.
- **Out-of-scope Tampere Central / Rautatieasema (railway):** VR operates regional and long-distance trains. Separate platform venue, separate ticketing, separate Nysse product category. Confirmed on official city transport maps (Tampere.fi / City of Tampere).
- **Coverage guarantee:** All v1 stops are tram-only (no multi-operator conflicts); no VR, bus, or other services call at any in-catalog tram stop.

No services other than Nysse tram lines 1 and 3 call at any in-catalog station — verified.

## Station name table (D1 anchor stops)

Match rule: published D1 string (official Nysse route map / Tampereen Ratikka tram-routes page / timetable stop name) vs. Transitland feed vs. ITS Factory GTFS.

| published (D1 candidate) | official print | class |
| --- | --- | --- |
| Rautatieasema | Nysse / Tampereen Ratikka official **Rautatieasema**; Tampere City Central Station (English); shared central stop on both Line 1 and Line 3 | **match (lock)**. Also known as Tampere Central railway station, but tram stop entry is "Rautatieasema". |
| Keskustori | Nysse route maps **Keskustori**; central plaza stop on both lines | **match**. Secondary central point; not the lock. |
| Kaupin kampus | official start terminus Line 1 | **match**. Also labelled TAYS (hospital campus). |
| Pyhällönpuisto | official end terminus Line 1 | **match**. |
| Hervanta | official start terminus Line 3 | **match**. |
| Sorin aukio | official end terminus Line 3; note: service use alternates platforms A/B as of 20 Jul 2026 | **match**. Caution: platform alternation (check Nysse app before boarding). |
| All other stops on Lines 1, 3 | same official Nysse route map / timetable print | match |

**37 unique D1 stop names** (20 Line 1 + 17 Line 3; 4 shared central stops counted once). No product `lib/cities/tampere/` yet.

## What the oracle sees today

| surface | L1/L3? | status |
| --- | --- | --- |
| Nysse tram route map (official) | **yes** | Lines 1 and 3 drawn; Line 2 construction noted (not open). |
| Tampereenratikka.fi tram-routes page | **yes** | Lines 1 and 3 published; Line 2 and future phases listed as under construction. |
| Nysse official timetables | **yes** | Confirmed stops and service times. |
| Transitland feed f-udb-tampereenjoukkoliikenne | live | Routes 1, 3, + 2, + bus routes in same feed. Tram lines verified. |
| Mobility Database mdb-866 | live | GTFS Schedule; 114 routes (tram + bus). |
| ITS Factory static GTFS zip | live | Tampere City Open Data License. |
| Waltti GTFS-RT feeds (Fintraffic) | live | Trip updates, vehicle positions, service alerts (no key). |
| Product `lib/cities/tampere/` | **absent** | No city definition yet. |

**Clash surface:** None currently. Oracle sees Nysse Lines 1–3 (including Line 2 as data, but v1 will omit Line 2). Board eligibility: all tram services walk-up boardable, all in-scope, none excluded. VR railway station is physically separate (doNotGroup).

## C2/C3 to put in front of Jim

1. **city=tampere**, agency **Nysse / Tampereen joukkoliikenne**, not merged into Helsinki or any other city.
2. **Rautatieasema** is the locked inner-city tram hub (both lines; shared central stop).
3. **v1 scope: tram lines 1 and 3 only.** Line 2 omitted (under construction through 2028, not in service during v1 alpha/beta).
4. **No buses, no VR regional rail, no ferries, no airport services.**
5. **doNotGroup Rautatieasema tram stop vs. Tampere Central railway station** (VR operations, separate venue, separate operator).
6. **All 37 tram stops in Lines 1 and 3 are walk-up boardable.** No compulsory reservation, no check-in barriers.
7. **Tram frequency:** 7.5 minutes daytime (increasing to 6 minutes peak from 19 Oct 2026); service times published on Nysse timetables.
8. **Europe/Helsinki timezone. No DST commentary needed** (Finland observes CET/CEST like other Nordic countries).
9. **Official live paths:** Waltti GTFS-RT (no key required); static GTFS from ITS Factory data service (no key).
10. Stop IDs stay out of the published JSON per precedent (Helsinki / Oslo / Stockholm).

## What I did not do

No line-map generator, no stopIds in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no VR regional rail scope expansion, no Line 2 inclusion until it enters passenger service.

## License

- **License name:** Tampere City Open Data License (compatible with Creative Commons Attribution 4.0 International / CC BY 4.0). ITS Factory data service; Waltti open data platform (Fintraffic).
- **Redistribution / rehosting:** Tampere City Open Data License allows free copy, redistribute, and derivative works for any purpose (commercial or non-commercial). ITS Factory GTFS zip and Waltti GTFS-RT feeds may be copied, stored, and served to third parties. Waltti open data terms (https://opendata.waltti.fi/) grant gratuitous, non-exclusive, non-revocable right to use data for any purpose including rehosting.
- **Commercial use:** allowed under Tampere City Open Data License.
- **Attribution:** Cite the licensee and data date, e.g. "© Tampere City / Nysse {year}" or "© ITS Factory {year}". Waltti attribution: "© Waltti {year}" when using Waltti GTFS-RT APIs.
- **Terms URL:** 
  - https://data.tampere.fi/en_gb/ (Tampere open data portal, general terms)
  - https://www.nysse.fi/en/developers.html (Nysse developer portal, feed details)
  - https://opendata.waltti.fi/ (Waltti developer portal, GTFS-RT documentation)
  - https://dev.publictransport.tampere.fi/docs (Tampere public transport API docs)
- **Confidence:** `clear` for static GTFS (Tampere City Open Data License explicitly allows redistribution). `clear` for GTFS-RT (Waltti open data platform grants same rights). No ambiguity on commercial use or rehosting.
- **Keyed feeds:** Static GTFS zip unkeyed. GTFS-RT feeds (Waltti) unkeyed. No API key or OAuth required; free public access.
