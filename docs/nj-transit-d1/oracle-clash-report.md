# New Jersey (NJ Transit) — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** scoped, D1 pack not written. **city id:** `nj-transit` (commuter rail).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | New Jersey Transit (NJ Transit), a public transportation agency operating rail, bus, and light rail services in New Jersey. Transitland operator **o-dr5-nj~transit**. |
| Official map | System map — https://www.njtransit.com/accessibility/System-Map. Light rail and rail system maps are integrated into one overview; no separate map sections by mode. |
| Static GTFS | Rail GTFS zip https://www.njtransit.com/rail_data.zip — no key; empty-key **200** 2026-09-05 (Transitland Onestop **f-dr5-nj~transit~rail**, last fetch 2026-09-05, 11 hours before oracle date). Rail feed contains 2 agencies, 17 routes, 229 stops. Mobility Database references this same feed: https://mobilitydatabase.org/feeds/gtfs/mdb-508 (bus feed; separate entry from rail). Historic bus feed separately available at https://www.njtransit.com/bus_data.zip (263 routes; out of scope for v1). |
| GTFS-RT / live | NJ Transit developer portal at https://developer.njtransit.com publishes all APIs, RSS feeds, and GTFS-RT data (as of Aug 1, 2024, moved from legacy www.njtransit.com/developer-tools). Portal describes GTFS-RT availability, but specific real-time feed endpoint URLs and authentication method are not publicly documented — registration and login required. Transitland feed record **f-dr5-nj~transit~rail** makes no mention of a verified GTFS-RT feed; status unconfirmed. Portal T&Cs reference "Rail/Bus APIs, GTFS & GTFS-RT" as available data categories, but without endpoint verification, GTFS-RT cannot be assumed stable or accessibly keyed for this report. |
| Auth | Static GTFS: none. GTFS-RT (if available): Requires registration at https://developer.njtransit.com. Registration flow not publicly documented; key agreement terms live at https://developer.njtransit.com/terms/ (see License section). Token refresh / rotation policy: **not publicly documented**. |
| Timezone | America/New_York (HAS DST) |

## v1 mode cut

**NJ Transit commuter rail only (light rail separate mode):**

### Commuter Rail (in v1)
- **Northeast Corridor Line:** Operates local and regional service between Trenton Transit Center and New York Penn Station on Amtrak infrastructure. Owned/operated by NJ Transit.
- **North Jersey Coast Line:** Serves coastal communities between New York Penn and Point Pleasant (Bay Head branch).
- **Raritan Valley Line:** Connects New Brunswick to Newark Penn and New York Penn via Raritan River Valley.
- **Morris & Essex Line:** Serves Morris County, High Bridge, and Gladstone Branch; connects to Newark and New York Penn.
- **Montclair-Boonton Line:** Serves Upper Montclair, Bloomfield, and Boonton; connects to New York Penn.
- **Main/Bergen County Lines:** Includes multiple branches (Main Line, Bergen County Branch) connecting to New York Penn and Hoboken Terminal.
- **Pascack Valley Line:** Serves Bergen County communities (Nanuet, Spring Valley, etc.); connects to Hoboken Terminal.
- **Port Jervis Line:** Extends northwest to Port Jervis, NY; connects to New York Penn.
- **Atlantic City Line:** Rail service to Atlantic City; strategically important regional connection.

### Light Rail (out of v1 — separate mode)
Walk-up boardable, no compulsory reservation or check-in barrier, but operated as distinct mode with separate fare structure:
- **Hudson-Bergen Light Rail (HBLR):** 14 stations, Bayonne to Hoboken Terminal (includes Jersey City Exchange Place, Newport, and Hoboken).
- **Newark Light Rail (NCS):** Connects suburban communities to downtown Newark.
- **River Line:** Trenton to Camden service connecting communities along the Delaware River.

### Out
Buses (separate scope), tram/streetcar, ferry, AirTrain JFK, PATH (tracker Later city New York PATH).

### Amtrak Northeast Corridor (out of v1)
Amtrak Northeast Corridor (Acela and Northeast Regional) passes through Newark Penn Station and New York Penn Station but operates under Amtrak, not NJ Transit. Services are a separate operator and out of v1 per NJ Transit scope; see Board eligibility section for verdicts.

Hub lock: **Secaucus Junction** — the only station where the Main/Bergen/Pascack/Port Jervis group meets the Northeast Corridor group, located on the Northeast Corridor ca. 5 miles from both Newark Penn and New York Penn Station. **Secondary:** Newark Penn (NJ Transit-owned, serves all commuter rail lines). **doNotGroup:** Secaucus Junction (NJ Transit) vs other transfer stations on the corridor; Newark Penn (NJ Transit) vs Penn Station LIRR/NJT/Amtrak (NYC); Newark Penn (NJ Transit) vs Newark Airport Station (Amtrak only).

## Skip risk

- **GTFS-RT unverified:** no public feed endpoint documented; developer portal registration required; stable endpoint and key rotation policy unknown. If GTFS-RT becomes a requirement before D1, registration and endpoint testing at developer portal is mandatory — do not assume Transitland feed status without direct verification.
- **Direction-model hazard — two boarding groups:** Hoboken Terminal-bound services (Main Line, Bergen County, Pascack Valley) vs New York Penn-bound/Midtown Direct services (Northeast Corridor, North Jersey Coast, Morris & Essex, Montclair-Boonton, Port Jervis, Atlantic City). Trains for the same line split at or before Secaucus Junction; direction vectors differ by destination group. Adapter must disambiguate via stop_headsign or route_id fragment; direction model must account for this two-group split.
- **Light rail data completeness:** Hudson-Bergen, Newark, and River Line GTFS routes are in **f-dr5-nj~transit~rail**, but route_id and stop coverage for each line should be verified during D1 pack to confirm all three are individually queryable and not collapsed into a single "light rail" route.
- **Amtrak boarding model unclear:** Amtrak at Newark Penn and NY Penn are separate operator services (see Board eligibility). If Amtrak is later added to any city, check-in and reservation policy will need re-verification.

## Board eligibility

Every service calling at in-catalog stations must have a recorded verdict (see `docs/board-eligibility-rule.md`). For NJ Transit v1 scope (commuter rail only):

| Service | Called-at station(s) | Verdict | Evidence / Notes |
|---|---|---|---|
| **NJ Transit Northeast Corridor Line** | Trenton, Newark Penn, intermediate stops, NY Penn | `in` | Walk-up boardable; daily tickets available; no hard check-in barrier (random security ops, not mandatory screening like Eurostar). Part of in-scope v1 commuter-rail network. |
| **NJ Transit North Jersey Coast Line** | All NJCL stations (New York Penn to Point Pleasant/Bay Head) | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier. Part of in-scope v1 network. |
| **NJ Transit Raritan Valley Line** | All Raritan Valley stations (New Brunswick to Newark/New York Penn) | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier. Part of in-scope v1 network. |
| **NJ Transit Morris & Essex Line** | All Morris & Essex stations (including Gladstone Branch) | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier. Part of in-scope v1 network. |
| **NJ Transit Montclair-Boonton Line** | All Montclair-Boonton stations | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier. Part of in-scope v1 network. |
| **NJ Transit Main/Bergen County Lines** | All Main Line and Bergen County Branch stations | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier. Part of in-scope v1 network. |
| **NJ Transit Pascack Valley Line** | All Pascack Valley stations | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier. Part of in-scope v1 network. |
| **NJ Transit Port Jervis Line** | All Port Jervis Line stations | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier. Part of in-scope v1 network. |
| **NJ Transit Atlantic City Line** | All Atlantic City Line stations | `in` | Walk-up boardable; no compulsory reservation; no check-in barrier. Part of in-scope v1 network. |
| **NJ Transit Hudson-Bergen Light Rail (HBLR)** | All HBLR stations (Bayonne to Hoboken) | `out-product` | Walk-up boardable; no compulsory reservation; no check-in barrier. Separate mode (light rail, distinct fare structure) — excluded from v1 commuter-rail scope. |
| **NJ Transit Newark Light Rail (NCS)** | All NCS stations (suburban to Newark downtown) | `out-product` | Walk-up boardable; no compulsory reservation; no check-in barrier. Separate mode (light rail, distinct fare structure) — excluded from v1 commuter-rail scope. |
| **NJ Transit River Line** | All River Line stations (Trenton to Camden) | `out-product` | Walk-up boardable; no compulsory reservation; no check-in barrier. Separate mode (light rail, distinct fare structure) — excluded from v1 commuter-rail scope. |
| **Amtrak Northeast Regional** | Newark Penn, NY Penn, Philadelphia, Washington | `out-product` | Walk-up tickets purchasable but ticket/reservation is compulsory (cannot board with pass or contactless tap alone). No airport security screening, but government-issued ID + purchased ticket required. Fails board-eligibility test 1 (boarding contract requires ticket, not walk-up pass). Separate operator (Amtrak), out of v1 NJ Transit scope. |
| **Amtrak Acela** | Newark Penn, NY Penn, Philadelphia, Washington | `out-product` | Same rationale as Northeast Regional: compulsory ticket/reservation + ID check (no airport-style security, but still a gating contract). Separate operator, not NJ Transit. |

**Note:** The light rail `out-product` verdicts are recorded because all three lines call at in-catalog stations (e.g., Hoboken Terminal is a commuter-rail hub) but are excluded via product boundary (mode, fare structure), not via boarding model — they are walk-up boardable but not part of v1 commuter-rail scope. Amtrak verdicts are explicit because they fail the board-eligibility boarding-contract test. These verdicts prevent silent omission and clarify the product boundary.

## License

- **License name:** NJ Transit Data Feeds License / Developer Terms and Conditions.
- **Redistribution / rehosting:** Developer Terms (https://developer.njtransit.com/terms/) explicitly state: "NJT prohibits the development of an app that would make the Data available to others directly from NJT's server(s)." Developers must "download and host data on their own or third-party servers." Rehosting is required — apps must not proxy NJT endpoints. This is stricter than MTA's terms (MTA permits rehosting; rehosting is not mandated). **Do not interpret developer-portal login as a blanket data-redistribution grant.** Hosting on your own server is mandatory; sublicensing to arbitrary third parties is not addressed (Tim makes judgment calls).
- **Commercial use:** Terms state data is a "public service" made available "not to be relied on for any commercial purposes" and may be "discontinued at any time at the sole discretion of NJT." This is explicitly **non-commercial**. Data feeds are "provided without charge." No commercial-use allowance documented.
- **Attribution:** Terms require that you "may indicate the data originated from NJT but is stored on your own server" (similar to MTA). Cannot claim "NJT licensing" without explicit permission. Must disclose when "data latency exceeds 1 minute" that it "may not be real time data." Cannot claim the data is "accurate, complete, or timely."
- **Usage restrictions:** Data must be used "as-is" — no modification or deletion. Cannot use in "inaccurate, misleading, false, or unlawful" manner. Max 100,000 requests per day without written consent. Users bear all risk; NJT provides no warranties. Violation of terms results in API key deactivation and access denial.
- **Terms URL:** https://developer.njtransit.com/terms/ (primary). Historic reference: https://www.njtransit.com/developer-tools (deprecated as of Aug 1, 2024).
- **Confidence:** `clear` that static GTFS is publicly available without key and that redistribution/rehosting is mandatory (more restrictive than MTA). `unclear` whether a NJ Transit "non-commercial" designation affects a real-time passenger app in a revenue-sharing or freemium model (Tim to clarify). `unclear` whether GTFS-RT, once verified, will carry the same terms or if keyed-feed account terms differ — do not assume parity with static GTFS terms. GTFS-RT endpoint, key rotation policy, and token expiration are **not publicly documented** — endpoint verification must happen at developer portal during D1.
- **Keyed feeds:** If GTFS-RT becomes available, registration and key agreement at https://developer.njtransit.com will govern access. Account terms (not data license) will likely restrict redistribution — confirm during D1 registration and endpoint testing.

## C2 for a later D1 pack (not this file's job)

1. city = `nj-transit`. displayName = New Jersey (NJ Transit) or New Jersey Transit (pending Tim/product decision on branding).
2. Hub-lock station: **Secaucus Junction** (the only station where Main/Bergen/Pascack/Port Jervis group meets Northeast Corridor group). Secondary: Newark Penn. doNotGroup against NY Penn Station (MTA/Amtrak), Newark Airport Station, and other regional hubs.
3. v1 modes: **Commuter rail only** — Northeast Corridor, North Jersey Coast, Raritan Valley, Morris & Essex, Montclair-Boonton, Main/Bergen County, Pascack Valley, Port Jervis, Atlantic City.
4. Light rail (Hudson-Bergen, Newark, River Line) is `out-product` — walk-up boardable, separate mode with distinct fare structure.
5. Board eligibility: All nine commuter-rail lines are `in`. Light rail lines are `out-product` (mode boundary). Amtrak services `out-product` (boarding-contract test fails; recorded, not silent).
6. Direction model hazard: two-group split (Hoboken-bound vs New York Penn-bound/Midtown Direct); trains split at or before Secaucus Junction. Adapter must handle via stop_headsign or route_id.
7. GTFS-RT: Must be verified at developer portal before D1 pack release — endpoint URL, authentication type, and key rotation policy are prerequisites for any real-time boarding feature.
8. assertCityLive("nj-transit") must fail until wired.

## Corrections (6 Sep 2026)

Scope realigned from light rail + pending commuter rail to commuter rail only, per tracker's commuter-rail row. All nine NJ Transit commuter rail lines now in-scope (Northeast Corridor, North Jersey Coast, Raritan Valley, Morris & Essex, Montclair-Boonton, Main/Bergen County, Pascack Valley, Port Jervis, Atlantic City). Light rail lines (Hudson-Bergen, Newark, River Line) recorded as `out-product` verdicts (walk-up boardable, separate mode). Hub lock changed to Secaucus Junction as primary. Direction-model hazard (two-group split, Hoboken-bound vs New York Penn-bound) added to skip risk.
