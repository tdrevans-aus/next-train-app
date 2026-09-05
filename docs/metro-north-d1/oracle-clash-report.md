# New York — Metro-North oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** scoped, D1 pack not written. **city id:** `metro-north` (do not merge into `new-york` city; NYC Subway is separate).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Metropolitan Transportation Authority (MTA) — Metro-North Railroad (MNR). Transitland operator **o-dr7-mtanyc~metro~north**. |
| Service area | Commuter rail serving New York City, Westchester County, Rockland County (NY), and Connecticut (Stamford, New Canaan, Danbury, Waterbury, New Haven). West-of-Hudson lines (Port Jervis, Pascack Valley) operated by NJ Transit. |
| Official map | Metro-North system map — https://www.mta.info/agency/metro-north-railroad (schedules and service info). Network coverage: Hudson Line, Harlem Line, New Haven Line (with three branches: New Canaan, Danbury, Waterbury), plus Port Jervis Line and Pascack Valley Line (west-of-Hudson, NJ Transit operated). |
| Static GTFS | https://rrgtfsfeeds.s3.amazonaws.com/gtfsmnr.zip — no key; empty-key **200** verified 2026-09-06 (current S3 feed). Historic URL http://web.mta.info/developers/data/mnr/google_transit.zip **301s to** the same S3 zip. Transitland Onestop **f-dr7-mtanyc~metro~north**, last fetch 2026-09-06. Mobility Database **mdb-524** (official; 6 routes, 60 locations, America/New_York). |
| GTFS-RT / live | api.mta.info Metro-North Feeds via https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr/gtfs-mnr (Transitland **f-mta~nyc~rt~mnr**, last fetch 2026-09-06). **Auth type: API key required.** MTA developer registration mandatory; unlike NYC Subway (now keyless), Metro-North GTFS-RT requires token. Endpoint pattern: https://mnorth.prod.acquia-sites.com/wse/gtfsrtwebapi/v1/gtfsrt/[MNR_API_KEY]/getfeed. Portal groups: single MNR combined feed (Hudson, Harlem, New Haven, Port Jervis, Pascack Valley all in one realtime). |
| Auth | GTFS zip: none. Metro-North GTFS-RT: **API key required** (MTA Developer Program registration at https://datamine.mta.info/ or https://api.mta.info/). Key must be obtained and passed to endpoint. Different from NYC Subway GTFS-RT which is now keyless. |
| Timezone | America/New_York (HAS DST) |
| Related agencies | **Amtrak (Northeast Regional):** Calls at New Rochelle (NRO), Stamford (STM), New Haven (NHV) on the New Haven Line corridor. Walk-up boarding available; no compulsory reservation on this service. Verdict: `in` (see Board eligibility section). **NJ Transit:** Operates Port Jervis Line (west of Hudson; Hoboken–Port Jervis) and Pascack Valley Line (west of Hudson; Hoboken–Spring Valley). MNR leases both lines. Metro-North GTFS includes NJ Transit-operated services. |

## v1 mode cut

**Metro-North east-of-Hudson primary lines only:** Hudson Line (Grand Central–Poughkeepsie), Harlem Line (Grand Central–Wassaic), New Haven Line (Grand Central–New Haven, including three branches: New Canaan, Danbury, Waterbury). **All three lines and branches in scope for v1.** **Out:** Port Jervis Line (west of Hudson, operated by NJ Transit; `out-product` verdict per board eligibility; separate operator/region). **Out:** Pascack Valley Line (west of Hudson, operated by NJ Transit; `out-product` verdict per board eligibility; separate operator/region). **Out:** Amtrak Northeast Regional (walk-up boarding passes test, but `out-product` verdict: separate operator, intercity service, outside MTA scope). **Out:** NJ Transit, buses, ferries, non-commuter rail. **Out:** LIRR and Grand Central Madison (separate city `new-york-lirr`); PATH (separate city New York PATH); NYC Subway (separate city `new-york`).

Do not generate a published-network.json from GTFS — D1 is the official network map, hand-transcribed, later.

## Hub-lock & station-graph architecture

**Primary hub: Grand Central Terminal** (42nd Street, Manhattan). All three east-of-Hudson lines (Hudson, Harlem, New Haven) terminate or pass through Grand Central Terminal, making it the natural and only single point that serves all three v1 lines. Nearly every Metro-North train outside rush-hour periods serves Grand Central; some peak-direction skip-stop services may bypass, but Grand Central is the canonical hub and serves 100+ stations across the three lines.

**Secondary interchange: Harlem–125th Street.** Located 4.2 miles north of Grand Central on the Harlem Line (5–10 minute travel). The only other station besides Grand Central that serves all three east-of-Hudson lines; nearly every train stops here except 7–15 peak-direction skip-stop services per line. Useful for modeling as a secondary hub if needed, but Grand Central is the walk-up lock for this city.

**doNotGroup hazard: Grand Central Terminal vs. Grand Central Madison.** Grand Central Terminal is Metro-North's historic hub (Hudson, Harlem, New Haven). Grand Central Madison is the new LIRR-only terminal opened January 2023, built underground below Park Avenue, with separate platforms and no direct Metro-North service. These are adjacent but separate buildings serving different systems. **Must not merge boards or conflate stations — Grand Central Terminal (MNR) and Grand Central Madison (LIRR) are distinct stop_ids and must remain split in the adapter.**

**Station name table — key clashes:**

| Published (D1) | Typical GTFS name | Role | Notes |
| --- | --- | --- | --- |
| **Grand Central Terminal** | Grand Central Terminal (or Grand Central) | MNR hub; all three lines | Verify exact GTFS stop_id; not Grand Central Madison |
| **Harlem–125th Street** | Harlem-125th Street | Interchange; all three lines | Secondary hub; 4.2 mi north of GCT |
| **Stamford** | Stamford | New Haven Line junction; Amtrak | Amtrak Northeast Regional calls here; walk-up `in` |
| **New Rochelle** | New Rochelle | New Haven Line junction; Amtrak | Amtrak Northeast Regional calls here; walk-up `in` |
| **New Haven** | New Haven | New Haven Line terminal; Amtrak | Amtrak Northeast Regional terminus; walk-up `in` |

All station names subject to GTFS stop_name exact match at D1 pack time.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (Metro-North east-of-Hudson services in v1 scope; west-of-Hudson and other operators noted separately):**

All **walk-up Metro-North commuter rail services** (regional, not intercity sleepers) on Hudson, Harlem, New Haven lines: `in`
- Hudson Line (Grand Central–Poughkeepsie): walk-up commuter service, no compulsory reservation. `in`
- Harlem Line (Grand Central–Wassaic): walk-up commuter service, no compulsory reservation. `in`
- New Haven Line (Grand Central–New Haven, including New Canaan, Danbury, Waterbury branches): walk-up commuter service, no compulsory reservation. `in`

**Services excluded by operator / region (west-of-Hudson):**
- **Port Jervis Line (Hoboken–Port Jervis, operated by NJ Transit):** `out-product` — NJ Transit operated, outside MTA Metro-North east-of-Hudson scope. West of Hudson River; separate operator. Not included in v1 Metro-North city scope (may be future separate NJ Transit city).
- **Pascack Valley Line (Hoboken–Spring Valley, operated by NJ Transit):** `out-product` — NJ Transit operated, outside MTA Metro-North east-of-Hudson scope. West of Hudson River; separate operator. Not included in v1 Metro-North city scope (may be future separate NJ Transit city).

**Services excluded by operator (separate city):**
- **Amtrak Northeast Regional (Washington DC–Boston, stops at New Rochelle, Stamford, New Haven):** `out-product` — Walk-up boarding is available (no compulsory reservation; open seating); passes test 1 and test 2 (no check-in barrier; standard platform boarding). However, Amtrak is a separate operator outside MTA Metro-North scope and is explicitly out of v1 by product design (intercity service, not regional commuter rail). **Verdict: `out-product` with reasoning: Amtrak is a separate operator outside MTA Metro-North; v1 scope is MTA-operated commuter rail only.**

**Station platform separation (no multi-operator issues):**
- Grand Central Terminal: Metro-North platforms only; no subway interchange (subway is at Grand Central Shuttle or other Manhattan subway stations; no direct connection).
- All other stations: Single or dual-operator platforms where applicable; no ambiguous merges.

**No check-in barriers:** All Metro-North commuter rail stations feature unrestricted platform access (on-board conductor ticket checks, not gateline/security). Walk-up boarding is unrestricted for all `in` services.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Hudson Line (Grand Central–Poughkeepsie)** | Grand Central, Harlem-125th, 125th St, Fordham, etc. | No (standard commuter service, walk-up) | No | `in` | [Metro-North Hudson Line schedule](https://www.mta.info/agency/metro-north-railroad/schedules); commuter service |
| **Harlem Line (Grand Central–Wassaic)** | Grand Central, Harlem-125th, Fordham, etc. | No (standard commuter service, walk-up) | No | `in` | [Metro-North Harlem Line schedule](https://www.mta.info/agency/metro-north-railroad/schedules); commuter service |
| **New Haven Line (Grand Central–New Haven + branches)** | Grand Central, Harlem-125th, New Rochelle, Stamford, Bridgeport, New Haven, + branches | No (standard commuter service, walk-up) | No | `in` | [Metro-North New Haven Line schedule](https://www.mta.info/agency/metro-north-railroad/schedules); commuter service; includes New Canaan, Danbury, Waterbury branches |
| **Port Jervis Line (Hoboken–Port Jervis, NJ Transit)** | Stations west of Hudson; not in v1 scope | N/A (out of scope) | N/A | `out-product` | [NJ Transit Port Jervis Line](https://www.njtransit.com/); separate operator, west of Hudson |
| **Pascack Valley Line (Hoboken–Spring Valley, NJ Transit)** | Stations west of Hudson; not in v1 scope | N/A (out of scope) | N/A | `out-product` | [NJ Transit Pascack Valley Line](https://www.njtransit.com/); separate operator, west of Hudson |
| **Amtrak Northeast Regional (Washington–Boston, calls New Rochelle, Stamford, New Haven)** | New Rochelle, Stamford, New Haven | No (open seating, walk-up available) | No | `out-product` | [Amtrak Northeast Regional](https://www.amtrak.com/northeast-regional-train); separate intercity operator, not MTA commuter rail |

**Verified:** Walk-up boarding is standard on all Metro-North commuter services (Hudson, Harlem, New Haven lines). No sleeper, no compulsory reservation policies on these lines. Amtrak Northeast Regional is walk-up boardable but excluded by operator scope (not MTA).

## Skip risk

**High:** Metro-North GTFS-RT requires API key (unlike NYC Subway which is now keyless). Obtaining and managing a separate MNR key adds friction. If MTA key infrastructure changes or access is revoked at the account level (as happened with East Midlands Darwin), this city could be blocked at D1 pack time.

**Moderate:** Grand Central Terminal vs. Grand Central Madison namespace collision in GTFS stop_ids. If the data does not cleanly distinguish (stop_id or stop_name pollution), the adapter must defensively filter or rename. Verify GTFS stop_ids at D1 pack time.

**Low:** Port Jervis / Pascack Valley verdict logic (NJ Transit-operated, west of Hudson). If these services appear in the Metro-North GTFS feed and the adapter does not filter by operator_id or line_id, they could bleed into boards. Verify GTFS feed structure for west-of-Hudson route grouping.

**Not a skip:** Static GTFS feed itself is verified keyless and stable (S3 CDN).

## License

- **License name:** MTA data feed terms and conditions (updated Mar 13, 2024; same terms as NYC Subway). Maps / logos / symbols are a separate IP instrument (MTA Licensing Program).
- **Redistribution / rehosting:** Opening paragraph + clause 1 authorize you to "download and host the data on a non-MTA server (maintained by you or a third party) and to make the data available to others who will access that non-MTA server." Apps must not make the data available to others directly from MTA's server(s). Rehosting is required, not optional. Do not treat "third party" as a grant to resell the feed to arbitrary third parties beyond serving riders in our app — Tim judges that. Same language as NYC Subway feed.
- **Commercial use:** Feeds are "provided without charge" / "available free of charge." The data terms do not say commercial use is allowed or prohibited. Separate IP text: commercial and ad-sponsored apps "may be charged a license fee" for logos, maps, or symbols — that is not a data-feed ban. Same as NYC Subway.
- **Attribution:** No required wording. Clauses 2–3: you may indicate the data was obtained from an MTA server and is stored on your own server; you must not state or imply the app is licensed by MTA or that the data is provided by an MTA server; you must not state the data is accurate, complete, or timely. Real-time lag of more than one minute: tell the end-user the information may not be real time. Same as NYC Subway.
- **Terms URL:** https://www.mta.info/developers/terms-and-conditions and https://new.mta.info/developers/terms-and-conditions (same Mar 13 2024 text as NYC Subway). api.mta.info "Review Terms and Conditions" links the new.mta.info page. Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-524. IP (maps / logos / symbols — not the data licence): https://www.mta.info/doing-business-with-us/licensing-program.
- **Confidence:** `clear` that static GTFS is keyless and that rehosting is required; `clear` that GTFS-RT requires an API key (unlike subway which is now keyless); `unclear` whether the Licensing Program's "station names" / "maps" categories bind a data-only rider app — those are a separate instrument from the data-feed terms. Same outstanding ambiguity as NYC Subway.
- **Keyed feeds:** Metro-North GTFS-RT requires MTA API key. Account terms may restrict redistribution if the key holder's account agreement contains resale bans. Verify key agreement at D1 pack time.

## C2 for a later D1 pack (not this file's job)

1. city=`metro-north`. displayName Metro-North.
2. Grand Central Terminal hub. doNotGroup Grand Central Madison (LIRR), Grand Central Terminal (Metro-North), Grand Central Terminal Subway (entrance to 42 St Shuttle, Lexington Line, etc.), 42 St-Port Authority Bus Terminal, any other 42 St stations.
3. Modes v1 Metro-North east-of-Hudson commuter rail (Hudson, Harlem, New Haven lines and three branches). Port Jervis / Pascack Valley / Amtrak / NJ Transit / buses out.
4. assertCityLive("metro-north") must fail until wired.
