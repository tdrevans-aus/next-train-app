# Rhine-Neckar (Mannheim / Heidelberg) oracle clash report

D1 (scoped): RNV (Rhein-Neckar-Verkehr) tram and light rail lines across Mannheim, Ludwigshafen, and Heidelberg; S-Bahn RheinNeckar commuter rail lines serving the region. RNV open data GTFS static via opendata.rnv-online.de (no key); S-Bahn via DELFI national feed. DELFI GTFS-RT fallback for real-time; no dedicated RNV GTFS-RT confirmed. VRN (Verkehrsverbund Rhein-Neckar) is the tariff/transport authority umbrella. Station names and orders to be transcribed from official VRN and RNV network maps and line documentation; not GTFS-derived.

## Transit agency & feed access

**Agencies:**
- **RNV (Rhein-Neckar-Verkehr GmbH)** operates tram and light rail (Stadtbahn/Straßenbahn) services across Mannheim, Ludwigshafen, Heidelberg, and Weinheim. Consolidated on 1 March 2005 from five regional operators.
- **S-Bahn RheinNeckar** (operated by Deutsche Bahn / DB Regio) provides commuter rail services with 13 lines (S1–S5, plus additional S-lines), 120 stations, 603 km system length.
- **VRN (Verkehrsverbund Rhein-Neckar)** is the regional transport authority and tariff association setting fares and coordinating data across the network.

**Static GTFS feed:**
- **RNV GTFS:** https://gtfs-sandbox-dds.rnv-online.de/latest/gtfs.zip (via opendata.rnv-online.de portal). No authentication required. License: dl-de/by-2-0 (Datenlizenz Deutschland 2.0). Attribution: "Rhein-Neckar-Verkehr GmbH" and retrieval date.
- **S-Bahn RheinNeckar GTFS:** Included in **DELFI GTFS dataset** (national German public transport data, https://gtfs.de/en/feeds/). Generated from DELFI NeTEx source. No key required. License: CC BY 4.0 (per GTFS.DE / DELFI sources).
- **VRN Open Data Portal:** https://opendata.vrn.de/ provides regional GTFS covering VRN area (includes RNV tram + bus, but rail data points to DELFI).

**GTFS-Realtime feed:**
- **No dedicated RNV GTFS-RT feed** published. RNV real-time board data not confirmed in public GTFS-RT form.
- **DELFI National GTFS-RT fallback:** https://realtime.gtfs.de/realtime-free.pb (Germany-wide real-time stream, TripUpdates + ServiceAlerts). License: CC BY-SA 4.0. No key required. DELFI RT coverage of S-Bahn RheinNeckar and potentially RNV tram updates (to be verified at D1 — common issue: German regional operators export schedule-only GTFS with RT either absent or limited to long-distance rail).

**Authentication:** RNV GTFS static is unkeyed (public download). DELFI/GTFS.de is unkeyed. Confirm at D1 whether VRN OpenService (if applicable) requires registration for GTFS-RT access.

## Network overview

**Rhine-Neckar region:**
Mannheim, Ludwigshafen (Rheinland-Pfalz), Heidelberg, and surrounding municipalities (Weinheim, etc.) form an integrated transit area under VRN tariff. RNV operates ~700 km of tram/light rail network with >1000 stops. S-Bahn RheinNeckar provides regional rail backbone across 603 km.

**RNV tram and light rail lines (v1 scope — all RNV lines):**

RNV operates approximately 14–16 tram and light rail lines (Straßenbahn, interurban, and Stadtbahn services) across the three cities. Exact line numbers and detailed routes to be confirmed from current 2026 RNV GTFS or official network maps (https://netz.rnv-online.de). Examples include:
- **Mannheim–Ludwigshafen shared lines:** Lines 3, 4, 7, 9, 12 (connecting the two cities across the Rhine via shared platforms and junctions)
- **Heidelberg lines:** Line 5 (OEG interurban Weinheim–Mannheim–Heidelberg), Line 26 (local Heidelberg tram)
- **Local Mannheim lines:** Lines 10, 11, 15, 41, and others (recent network changes 2025–2026 include new line 41, extended line 15)

All RNV lines are walk-up boarding, no compulsory reservations, and operate under VRN unified tariff. **v1 cut: all RNV tram lines without geographic restriction** (Mannheim, Ludwigshafen, Heidelberg, Weinheim all included as part of integrated RNV network).

**S-Bahn RheinNeckar lines (v1 scope — all regional commuter lines):**

S-Bahn RheinNeckar provides commuter rail with 13 lines. Core lines serving the Mannheim–Heidelberg corridor include:
- **S1** Homburg (Saar) Hbf – Osterburken via Kaiserslautern – Neustadt – Schifferstadt – Ludwigshafen Hbf – Mannheim Hbf – Heidelberg Hbf – Neckargemünd – Eberbach – Mosbach (202 km, 54 stations)
- **S2** Kaiserslautern Hbf – Mosbach (Baden) via Schifferstadt – Ludwigshafen Hbf – Mannheim Hbf – Heidelberg Hbf – Neckargemünd – Eberbach (133 km, 39 stations)
- **S3** Karlsruhe Hbf – Bruchsal via Speyer – Ludwigshafen Hbf – Mannheim Hbf – Heidelberg Hbf – Wiesloch-Walldorf (104 km, 29 stations)
- **S5** Heidelberg Hbf – Eppingen via Neckargemünd – Meckesheim – Sinsheim (43 km, 19 stations)
- Plus S4 and other connecting lines (13 total)

All S-Bahn RheinNeckar lines are walk-up boarding (no compulsory seat reservation) and operate under VRN fares. **v1 cut: all S-Bahn RheinNeckar lines** (13 lines, per cities.csv scope "commuter + light rail").

**Out of v1:** DB long-distance rail (Fernverkehr), regional trains outside S-Bahn RheinNeckar, buses, tram-replacement buses.

## Hub-lock station candidates

**Mannheim Hauptbahnhof (recommended primary hub):**
- **Second-largest traffic hub in southwestern Germany** (after Stuttgart Hbf), with 658 trains per day, including 238 long-distance trains
- 100,000 passengers per day embark, disembark, or transfer
- Serves **S-Bahn RheinNeckar** (S1, S2, S3, S4, S5, and others converge here)
- Direct tram connections via RNV lines to city center
- Regional rail gateway (DB long-distance, regional rail, S-Bahn all present)
- Official station name and S-Bahn/tram platform coordination required to prevent multi-modal deduplication

**Paradeplatz (secondary, central city tram hub):**
- **Central Mannheim city location**, 10–15 minute walk from Hauptbahnhof
- **Major tram interchange** (multiple RNV lines converge: lines 1, 3, 4, 5, 7, 9, 12, 13, 15, etc. serve or pass through)
- No S-Bahn presence; tram-only
- High passenger volume within city center
- Useful secondary hub if v1 prioritizes Stadtbahn experience over regional rail integration

**Recommendation for v1:** Lock to **Mannheim Hauptbahnhof** as the primary hub (serves both S-Bahn RheinNeckar and RNV trams, majority of lines converge). **doNotGroup Mannheim Hauptbahnhof (S-Bahn level) vs Mannheim Hauptbahnhof (RNV tram level)** — same building, two separate mode/operator systems, distinct platforms, distinct fares (though under VRN umbrella). Paradeplatz can serve as secondary major city tram hub if product design wants to highlight central Mannheim experience separate from regional rail.

## H2 clash surface

**GTFS source ambiguity:** RNV GTFS contains tram/bus/light rail only; S-Bahn data is in DELFI national feed (separate GTFS file with different operator encoding). v1 must merge two GTFS sources (RNV + DELFI S-Bahn) into unified board display — this introduces:
- Operator/agency deduplication across two feeds
- Line number collision risk (RNV line 3 vs potential S-line 3, unlikely but verify)
- Station name divergence (RNV timetables vs DELFI NeTEx vs official station names)
- Real-time RT coverage mismatch (DELFI RT may include S-Bahn but not RNV tram updates)

**Product `lib/cities/rhine-neckar/` status:** Does not exist; no Rhine-Neckar stations.json / line-map.json yet. `assertCityLive("rhine-neckar")` is Unknown city.

**H2 Conclusion:** Line number collision unlikely (RNV trams use numeric IDs 1–50+; S-Bahn uses S-prefix). Station naming requires reconciliation via official VRN published materials before D1. GTFS merging must preserve operator/agency distinction (RNV vs DB Regio) in adapter logic — do not collapse into single operator. Confirm v1 includes all RNV lines AND all S-Bahn RheinNeckar lines per cities.csv specification.

## Scope summary and product boundary

**v1 network cut:**
- **RNV tram / light rail:** All lines across Mannheim, Ludwigshafen, Heidelberg, Weinheim (approx. 14–16 lines, exact count from GTFS)
- **S-Bahn RheinNeckar:** All 13 commuter rail lines (S1–S5, plus S-lines with other prefixes per DELFI data)
- **Both operators, unified board:** Tram and commuter rail appear together at shared stations (e.g., Mannheim Hauptbahnhof, Ludwigshafen Hbf, Heidelberg Hbf)

**Out of v1:**
- DB Fernverkehr (long-distance rail, outside S-Bahn network)
- Regional trains not part of S-Bahn RheinNeckar
- Buses, tram-replacement buses
- Rhein-Haardt Railway or other interurban rail operators (if outside RNV/S-Bahn scope)

## Board eligibility

**RNV tram and light rail services (v1 in-scope):**

All RNV tram and light rail lines are walk-up, no compulsory seat reservation, and operate under VRN unified tariff. **All in-scope RNV services: `in`.** Boarding open to any traveler with standard VRN ticket, day pass, or contactless RFID card; no seat reservation, no check-in barrier.

| Service | Lines | Verdict | Evidence | Notes |
|---|---|---|---|---|
| RNV Tram / Light Rail (Stadtbahn / Straßenbahn) | 1–50+ (exact list from 2026 GTFS) | `in` | [RNV official network maps](https://www.rnv-online.de/en/travel-info/route-network-maps/download/); walk-up boarding, VRN tariff integration. | All RNV lines included in v1; no geographic or operator restriction within RNV service area (Mannheim, Ludwigshafen, Heidelberg, Weinheim). Interurban lines (e.g., OEG line 5) included. |

**S-Bahn RheinNeckar services (v1 in-scope):**

All S-Bahn RheinNeckar lines are walk-up, no compulsory seat reservation (standard commuter rail ticketing), and operate under VRN regional tariff integration or Deutsche Bahn ticketing (subject to D1 confirmation). **All in-scope S-Bahn services: `in`.** Boarding open to standard VRN/DB tickets; no seat reservation, no check-in barrier.

| Service | Lines | Verdict | Evidence | Notes |
|---|---|---|---|---|
| S-Bahn RheinNeckar (commuter rail) | S1, S2, S3, S4, S5, + other S-lines (13 total per DELFI) | `in` | [Wikipedia: Rhine-Neckar S-Bahn](https://en.wikipedia.org/wiki/Rhine-Neckar_S-Bahn); DB/DELFI GTFS; walk-up commuter rail, no compulsory reservation. | All S-Bahn RheinNeckar lines included in v1 per cities.csv "commuter + light rail" scope. Operates under Deutsche Bahn (DB Regio). |

**Multi-operator shared stations:**

Mannheim Hauptbahnhof, Ludwigshafen Hbf, Heidelberg Hbf serve both RNV tram and S-Bahn RheinNeckar. **doNotGroup the two operators/platforms** — same building, separate fare systems (though unified under VRN), separate physical platforms. Adapter must not silently deduplicate; both should appear on boards at each hub station.

**DB long-distance and other rail services:**

DB Fernverkehr (long-distance, ICE/IC/EC trains) call at Mannheim Hbf, Ludwigshafen Hbf, Heidelberg Hbf but are excluded from v1. Verdict: `out-product` (v1 scope is urban/regional transit, not intercity). Walk-up test passes (no compulsory reservation for many DB trains, though some require it) but product scope cuts them. Record in registry notes.

**Regional trains outside S-Bahn RheinNeckar:**

Lines not listed in S-Bahn RheinNeckar core 13 lines but calling at in-catalog stations receive: `out-product` (regional scope outside Rhine-Neckar S-Bahn network). Confirm exact line list at D1 from DELFI GTFS agency/operator fields.

**Summary:** RNV tram all `in`; S-Bahn RheinNeckar all `in`; DB Fernverkehr `out-product`; regional trains outside S-Bahn RheinNeckar `out-product`; buses `out-mode`.

## Hazards and skip risk

1. **Dual GTFS source merger:** RNV static GTFS and DELFI national GTFS must be combined for v1. Adapter must handle two separate operator/agency IDs, two separate line numbering schemes (numeric for RNV, S-prefix for DB). Risk: station name divergence between feeds, operator deduplication logic errors.

2. **GTFS-RT coverage uncertainty:** DELFI GTFS-RT (realtime.gtfs.de) coverage of RNV tram updates not yet confirmed. Common issue in German metros: many regional operators export schedule-only GTFS with RT absent. S-Bahn RheinNeckar RT via DELFI likely present but scope must be verified. v1 may launch schedule-only for RNV tram; confirm at D1.

3. **VRN open data account requirements:** VRN OpenService may offer additional GTFS-RT or APIs; account registration and key provisioning unclear. If required, confirm terms and rate limits before D2.

4. **Station naming divergence:** RNV official halt lists vs DELFI NeTEx vs printed network maps may differ in spacing, abbreviation, co-located station handling (e.g., "Mannheim Hbf (S-Bahn level)" vs "Mannheim Hauptbahnhof (Tram)"). Hand-transcription from 2026 official VRN/RNV collateral required.

5. **Hub deduplication complexity:** Mannheim Hbf is a major interchange hub serving S-Bahn, RNV tram, DB long-distance, and buses. doNotGroup rules must be strict to prevent silent collapse of distinct service layers into one board. Paradeplatz complexity: high tram throughput, verify all lines in GTFS stops table.

6. **Line 5 (OEG interurban) scope:** OEG (Oberrheinische Eisenbahn-Gesellschaft) line 5 connects Weinheim–Mannheim–Heidelberg as interurban tram. Operator status (RNV subsidiary, third-party, etc.) and v1 inclusion confirmation required. Verify in GTFS agency/operator tables.

7. **S-Bahn line ordering and multi-line stations:** S1–S5 core lines, plus S-lines with additional route names (e.g., S51, S95). DELFI encoding and route_id/route_short_name alignment must be verified. Stations like Mannheim Hbf serve 4+ S-Bahn lines; stop order / boarding logic clarity required.

8. **Feed URL stability:** RNV GTFS sandbox URL (https://gtfs-sandbox-dds.rnv-online.de/latest/gtfs.zip) must remain live (200 OK). Verify before final handoff to Luke. Fallback: https://opendata.rnv-online.de/sites/default/files/ (archive structure).

**Mitigation:** Contact RNV open data (opendata@rnv-online.de) and VRN (opendata@vrn.de) early to confirm GTFS coverage (all tram lines, S-Bahn RheinNeckar presence/import, line 5 OEG operator status), GTFS-RT key availability, and D1 timeline. Request latest GTFS snapshot (September 2026) to inspect stops, routes, and agency tables before adapter build. Confirm official VRN network map (Netzplan) and halt lists (Haltestellen) for hand-transcription baseline.

## License

- **License name (RNV GTFS):** dl-de/by-2-0 (Datenlizenz Deutschland 2.0 / Data License Germany 2.0).
- **License name (DELFI / S-Bahn):** CC BY 4.0 (per GTFS.DE / DELFI sources; some sources cite CC BY-SA 4.0 — confirm exact term at D1).
- **Redistribution / rehosting:** 
  - **RNV (dl-de/by-2-0):** Allows redistribution, derivative works, and commercial use with attribution. Transitland and Mobility Database entries confirm active feed availability and derivative rehosting permissible.
  - **DELFI (CC BY 4.0 / CC BY-SA 4.0):** Allows redistribution, derivative works, and rehosting with attribution; CC BY-SA requires derivative products to carry same license.
- **Commercial use:** Allowed under both dl-de/by-2-0 and CC BY 4.0.
- **Attribution:** 
  - RNV: "Rhein-Neckar-Verkehr GmbH" + retrieval date
  - DELFI/GTFS.DE: "GTFS.DE" and underlying source (DELFI, DB, etc.)
  - OSM attribution if OSM geometry included
- **Terms URL:**
  - https://opendata.rnv-online.de/ (RNV Open Data portal)
  - https://opendata.vrn.de/ (VRN Open Data portal)
  - https://www.opendata-oepnv.de/ (OpenData ÖPNV aggregator, hosts RNV)
  - https://gtfs.de/en/ (GTFS.DE aggregator, hosts DELFI)
  - https://mobilitydatabase.org/feeds/gtfs/mdb-1090 (DELFI feed entry, Mobility Database)
  - https://www.govdata.de/dl-de/by-2-0 (dl-de/by-2-0 deed)
  - https://creativecommons.org/licenses/by/4.0/ (CC BY 4.0 deed)
- **Confidence:** `clear` for RNV GTFS licensing and feed availability (Transitland entry confirms active fetch). DELFI/GTFS.DE licensing is `clear` (CC BY 4.0). dl-de/by-2-0 terms are standard German open data license (well-documented at govdata.de). GTFS-RT coverage and account terms (if VRN OpenService key required): `unclear` — confirm at D1 whether DELFI RT includes RNV tram trips or defaults to timetable board.
- **Keyed feeds:** RNV GTFS static and DELFI GTFS/GTFS-RT are unkeyed (public download). VRN OpenService (if used for additional GTFS-RT) may require registration; key agreement terms must be reviewed for redistribution restrictions.

## What I did not do

No `lib/cities/rhine-neckar/` code directory created. No stopIds or line-map generation. No GitHub branch, commit, or PR. No hub-lock locking confirmation until D1 official VRN Netzplan is in hand. No GTFS merging logic (dual-source adapter work is Jim's domain). No tram line-by-line stop transcription (GTFS-derived stops sufficient for D1 validation; published-network.json will be hand-curated from official maps before D2). No S-Bahn line scope resolution (cities.csv says "commuter + light rail" — all lines included per D1). No DB long-distance filtering strategy (reserved for D1 / Jim adapter decision).

## Sources & references

- [Transitland RNV GTFS feed](https://www.transit.land/feeds/f-u0y1-rhein~neckar~verkehrgmbhrnv)
- [Transitland RNV operator page](https://www.transit.land/operators/o-u0y1-rhein~neckar~verkehrgmbhrnv)
- [Mobility Database — DELFI GTFS Germany feed](https://mobilitydatabase.org/feeds/gtfs/mdb-1090)
- [GTFS.DE public transit data](https://gtfs.de/en/)
- [RNV Open Data Portal](https://opendata.rnv-online.de/)
- [VRN Open Data Portal](https://opendata.vrn.de/)
- [OpenData ÖPNV (RNV hosting)](https://www.opendata-oepnv.de/)
- [RNV official website](https://www.rnv-online.de/)
- [RNV network maps download](https://www.rnv-online.de/en/travel-info/route-network-maps/download/)
- [RNV interactive network planner](https://netz.rnv-online.de/)
- [Wikipedia: Rhine-Neckar S-Bahn](https://en.wikipedia.org/wiki/Rhine-Neckar_S-Bahn)
- [Wikipedia: Rhein-Neckar-Verkehr](https://en.wikipedia.org/wiki/Rhein-Neckar-Verkehr)
- [Wikipedia: Mannheim Hauptbahnhof](https://en.wikipedia.org/wiki/Mannheim_Hauptbahnhof)
- [Wikipedia: Trams in Mannheim / Ludwigshafen](https://en.wikipedia.org/wiki/Trams_in_Mannheim/Ludwigshafen)
- [Wikipedia: Trams in Heidelberg](https://en.wikipedia.org/wiki/Trams_in_Heidelberg)
- [DELFI GTFS-RT real-time data](https://realtime.gtfs.de/)
- [German Data License 2.0 (dl-de/by-2-0)](https://www.govdata.de/dl-de/by-2-0)

## C2/C3 deliverables for Luke

1. **city=rhine-neckar**, agencies **RNV (tram) + DB Regio S-Bahn RheinNeckar (commuter rail)**, not merged into national German feed or another region. VRN is tariff/transport authority; not an operator.
2. **Mannheim Hauptbahnhof** is the locked primary hub (serves S-Bahn RheinNeckar + RNV trams, majority of lines, 658 trains/day, 100k pax/day). **Paradeplatz** is secondary major city tram hub. **doNotGroup Mannheim Hbf S-Bahn level vs Mannheim Hbf RNV tram level vs DB long-distance.** Same building; three separate mode/operator systems.
3. **RNV tram all in-scope** (all ~14–16 lines across Mannheim, Ludwigshafen, Heidelberg, Weinheim). **S-Bahn RheinNeckar all in-scope** (13 lines, S1–S5 core + additional S-lines per DELFI). No operator/geographic split within v1.
4. **Dual GTFS source:** RNV feed (tram/light rail) + DELFI national feed (S-Bahn). Adapter must merge without silent operator collapse. Agency/operator distinction preserved. Route deduplication logic verified.
5. **Line 5 (OEG interurban):** Confirm v1 inclusion and operator status (RNV-operated vs third-party) before D1 finalization.
6. **DB Fernverkehr (long-distance):** `out-product` verdict at Mannheim Hbf, Ludwigshafen Hbf, Heidelberg Hbf. Separate from S-Bahn RheinNeckar. Do not merge into v1.
7. **Board eligibility lock:** All RNV tram `in`; all S-Bahn RheinNeckar `in`; DB Fernverkehr `out-product`; buses/other modes `out-mode`.
8. **GTFS-RT:** DELFI national feed only (realtime.gtfs.de). RNV tram RT coverage unconfirmed — verify at D1; may be schedule-only at launch.
9. **No product rhine-neckar/ directory yet.** `assertCityLive("rhine-neckar")` is Unknown city.
10. **Station transcription baseline:** Obtain official 2026 VRN Netzplan (network diagram) + halt lists for all RNV lines + S-Bahn stations before published-network.json finalization.

## Next steps (D1 → D2 → Luke's data pack)

- Contact RNV (opendata@rnv-online.de) and VRN (opendata@vrn.de) to confirm GTFS scope (all tram lines, S-Bahn RheinNeckar import from DELFI, line 5 OEG status).
- Confirm DELFI GTFS coverage includes all S-Bahn RheinNeckar lines (S1–S5, S51, S95, etc.).
- Request latest GTFS snapshot (September 2026) and inspect stops.txt, routes.txt, agency.txt for line deduplication risk and OEG operator handling.
- Confirm GTFS-RT coverage (DELFI realtime.gtfs.de) includes RNV tram trips or defaults to timetable board; if timetable-only acceptable, confirm scope.
- Download official 2026 VRN Netzplan (network map PDF) and RNV halt lists for hand-transcription of published-network.json.
- Verify all S-Bahn lines (S1–S5, plus any additional S-lines) calling at each major hub (Mannheim Hbf, Ludwigshafen Hbf, Heidelberg Hbf) for adapter filtering and board eligibility.
- Confirm hub-lock and secondary node assignment (Mannheim Hbf primary, Paradeplatz secondary, or variation per product intent).
- Spot-check Transitland feed health and Mobility Database entries for RNV and DELFI feeds (verify URLs, update frequency, license statements).

---

**D1 pack readiness:** Oracle report complete. D1 pack (`published-network.json`, `hazard-pack.md`, `direction-model-memo.md`) ready for handoff to Luke once GTFS scoping confirmed with RNV/VRN and DELFI RT coverage verified. Hub-lock and S-Bahn v1 inclusion scope finalized with Tim/Mark.
