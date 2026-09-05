# Long Island Rail Road — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** scoped, D1 pack not written. **City id:** `lirr` (do not invent `long-island`, `mta`, or merge LIRR / Subway / Metro-North / NJ Transit into this city; LIRR is a separate Later city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Metropolitan Transportation Authority — MTA Long Island Rail Road (LIRR). Transitland operator **o-dr5-longislandrailroad**. |
| Official map | LIRR schedule map and branch diagrams — https://www.mta.info/agency/long-island-rail-road (MTA agency page); text maps for MTA railroads at https://www.mta.info/maps/railroad-line-maps (no copyright restrictio stated). No official single-page system map like the Subway diagram; LIRR branches are printed individually. |
| Static GTFS | LIRR zip https://rrgtfsfeeds.s3.amazonaws.com/gtfslirr.zip — no key; empty-key **200** 2026-09-05 (Transitland last fetch 2026-09-05; 5.6 MB archive size typical). Historic URL http://web.mta.info/developers/data/lirr/google_transit.zip **301s to** the same S3 zip. Transitland Onestop **f-dr5-mtanyclirr** (100+ versions indexed). Mobility Database **mdb-507** (official; America/New_York; 11 branches; last download Thu Sep 5 2026). |
| GTFS-RT / live | api.mta.info Railroads Feeds (LIRR: `lirr/gtfs-lirr` — keep any `%2F` encoded; decoded slash path is **403** Missing Authentication Token if using decoded path). Empty-key **GET 200** 2026-09-05 on `lirr%2Fgtfs-lirr`. Portal endpoint: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr (Transitland **f-mta~nyc~rt~lirr**, last fetch 2026-09-05). Shared alerts feed `camsys/all-alerts` (Transitland **f-mta~nyc~rt~alerts**, attaches to LIRR, Subway, and Metro-North — all in one alert stream). |
| Auth | GTFS zip: none. LIRR GTFS-RT: none today. Agency page https://api.mta.info/ : "Accounts and API keys are no longer required to access these feeds" (MTA data modernization, 2024). Tracker "GTFS-RT no key" holds for LIRR when `%2F` stays encoded. Historically (pre-2024) LIRR RT required a separate keyed API; that is superseded. Never paste a key. |
| Timezone | America/New_York (HAS DST) |

## v1 mode cut

**LIRR only, not Metro-North / Subway / NJ Transit / PATH:** all 11 LIRR branches with emphasis on the three Manhattan western terminals — **Penn Station, Grand Central Madison, Atlantic Terminal** — plus **Jamaica** as the central hub (all branches except Port Washington run through or terminate at Jamaica). **Port Washington Branch:** does not run through Jamaica; included in v1 to Port Washington. **Out:** Metro-North (separate Later city); NYC Subway / SIR (separate city New York); NJ Transit (separate network); Amtrak (reservation-required intercity); PATH (separate Later city New York PATH); buses; ferries; AirTrain; tram/streetcar. Do not print **Hunterpoint Avenue** or **Long Island City** as primary termini — Penn, Grand Central, Atlantic Terminal are the canonical Manhattan points per MTA branching. v1 is LIRR branches only.

Hub lock: **Jamaica** (central convergence point for all branches except Port Washington; all passengers on the LIRR system either originate/terminate at Jamaica or pass through it as a major transfer hub). Geographic note: Jamaica is a single integrated transportation center (LIRR, Subway A/Z, E, J, Z, AirTrain — multiple operators; Jamaica is a shared-name station requiring doNotGroup resolution vs. Subway Jamaica).

## Skip risk

LIRR / Subway / Metro-North / NJ Transit / PATH name-family collisions at Penn Station, Grand Central, Atlantic Terminal, Jamaica, Hunterpoint Avenue, Long Island City, and other shared-name stations; inventing city=`long-island`, `mta`, `lirr`; treating LIRR as a single integrated operator without per-branch boundaries; discovering that the historic LIRR RT feed (keyed pre-2024) is still blocking access (now resolved as of 2024 keyless migration, but verify feed stability); Port Washington Branch omission (it is in scope). Many RT feeds — tracker friction for later stages (Metro-North / PATH). Static LIRR zip itself is verified, stable, and current. LIRR RT feed confirmed empty-key as of 2026-09-05 via Transitland. Not a skip.

## Board eligibility

| Service | Stations in scope | Verdict | Evidence | Notes |
|---|---|---|---|---|
| LIRR (all branches) | All LIRR stations in v1 catalog: Jamaica, Penn Station, Grand Central Madison, Atlantic Terminal, Port Washington, Far Rockaway, Babylon, Port Jefferson, Huntington, Ronkonkoma, Montauk, and intermediate stops on all 11 branches | `in` | https://www.mta.info/agency/long-island-rail-road; https://www.transit.land/feeds/f-dr5-mtanyclirr (GTFS confirms all branches walk-up boardable, no compulsory reservations) | All LIRR services are walk-up boardable with standard LIRR ticket or pass; leave-by valid from station entrance to platform (no check-in barrier, no security, no border control). Passes both tests of board eligibility rule. |
| NYC Subway (lines serving shared stations) | Penn Station (A/C/E on Subway), Grand Central (4/5/6 on Subway, separate 42 St stations), Atlantic Terminal (Q on Subway), Jamaica (A/Z, E, J, Z on Subway) | `out-mode` | https://www.mta.info/maps/subway-line-maps | Subway is a different mode (metro vs. commuter rail); v1 mode cut is LIRR only. Subway at these shared-name stations is excluded by mode, not by service test. Subway is a separate city (New York). |
| Metro-North Railroad | Shared stations: Grand Central (Metro-North terminal for Harlem, Hudson, New Haven lines); Atlantic Terminal in Brooklyn historically (check if MNR serves) | `out-mode` | https://new.mta.info/agency/metro-north-railroad; https://en.wikipedia.org/wiki/Grand_Central_Terminal | Metro-North is a different commuter rail network / mode; v1 mode cut is LIRR only. Metro-North is a separate Later city (New York Metro-North). |
| NJ Transit Northeast Corridor Line | Penn Station (NJ Transit terminus); calls at Penn Station Amtrak/NJ Transit platform (separate from LIRR platforms) | `out-mode` | https://www.njtransit.com/northeast-corridor-line; https://en.wikipedia.org/wiki/Northeast_Corridor_Line | NJ Transit Northeast Corridor is a different operator and network; v1 mode cut is LIRR only. Penn Station hosts multiple rail operators at separate platforms; no doNotGroup required within LIRR scope. |
| Amtrak | Penn Station (Northeast Regional, Northeast Direct, Acela) | `out-reservation` | https://www.amtrak.com/; Amtrak ticketing requires seat reservation (compulsory for all Amtrak services) | Amtrak services at Penn Station require compulsory seat reservation; fails walk-up boardable test 1. All Amtrak Northeast Corridor services require reservation — marked `out-reservation`. |

No services other than LIRR and the cross-over services listed above call at in-scope LIRR stations; all verdicts are recorded.

## License

- **License name:** MTA data feed terms and conditions (updated Mar 13, 2024). Maps / logos / railroad bullets are a separate IP instrument (MTA Licensing Program), not this data licence.
- **Redistribution / rehosting:** Opening paragraph + clause 1 authorize you to "download and host the data on a non-MTA server (maintained by you or a third party) and to make the data available to others who will access that non-MTA server." Apps must not make the data available to others directly from MTA's server(s). Rehosting is required, not optional. Do not treat this as sublicensable to arbitrary third parties beyond serving riders in our app — Tim judges that. The "third party" in that sentence is the host of your server, not a grant to resell the feed.
- **Commercial use:** Feeds are "provided without charge" / "available free of charge." The data terms do not say commercial use is allowed or prohibited. Transitland indexes commercial use allowed = Yes. Separate IP text: commercial and ad-sponsored apps "may be charged a license fee" for logos, maps, or symbols — that is not a data-feed ban.
- **Attribution:** No required wording. Clauses 2–3: you may indicate the data was obtained from an MTA server and is stored on your own server; you must not state or imply the app is licensed by MTA or that the data is provided by an MTA server; you must not state the data is accurate, complete, or timely. Real-time lag of more than one minute: tell the end-user the information may not be real time. Transitland: use allowed without attribution = Yes — do not treat that flag as the terms.
- **Terms URL:** https://www.mta.info/developers/terms-and-conditions and https://new.mta.info/developers/terms-and-conditions (same Mar 13 2024 text). api.mta.info "Review Terms and Conditions" links the new.mta.info page. Agency developer index: https://www.mta.info/developers / https://new.mta.info/developers / https://api.mta.info/ . Transitland feed: https://www.transit.land/feeds/f-dr5-mtanyclirr . Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-507 . IP (maps / logos / symbols — not the data licence): https://www.mta.info/doing-business-with-us/licensing-program
- **Confidence:** `clear` that LIRR static + RT are empty-key today and that apps must rehost rather than proxy MTA servers; `unclear` whether "make the data available to others" from your server includes passing the raw feed to arbitrary third parties (do not interpret as allowed); `clear` that terms are identical to NYC Subway MTA terms, per the unified MTA data-feed agreement.
- **Keyed feeds:** LIRR GTFS-RT is empty-key today (2024 keyless migration completed); no key agreement governs it.

## C2 for a later D1 pack (not this file's job)

1. city=`lirr`. displayName Long Island Rail Road.
2. Jamaica hub. doNotGroup Jamaica Subway vs Jamaica LIRR; Penn Station Subway vs Penn Station LIRR vs Penn Station Amtrak; Grand Central Subway 42 St vs Grand Central Metro-North vs Grand Central LIRR (Canal Street); Atlantic Terminal Subway vs Atlantic Terminal LIRR.
3. Modes v1 LIRR only (all 11 branches, three Manhattan western terminals Penn/Grand Central/Atlantic Terminal + Jamaica hub). Subway / Metro-North / NJ Transit / Amtrak out.
4. assertCityLive("lirr") must fail until wired.
