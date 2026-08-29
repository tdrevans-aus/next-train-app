# Oslo oracle clash report

D1 (published, live as of 29 Aug 2026): [Ruter](https://ruter.no/) — official website for Oslo and Akershus public transport. T-bane linjekart (line map) and current timetables published via ruter.no and integrated into [Ruter app](https://ruter.no/en/billett-og-app/ruter-app). Stations arrays hand-transcribed from published D1 map and timetable sources. **Not generated from GTFS.**

T-bane system overview: five operational lines (1, 2, 3, 4, 5) converging through the city-centre Common Tunnel (Fellestunnelen) from Majorstuen to Tøyen. **Line 6 not D1-live**: Fornebu Line under construction; expected opening 2029. All five current lines serve the central section (Majorstuen – Nationaltheatret – Stortinget – Jernbanetorget – Grønland – Tøyen). Operator: Sporveien T-banen (on contract from transit authority Ruter). Network: 85 km, 101 stations of which 17 are underground/indoor.

Hub lock: [Stortinget station](https://ruter.no) — all five T-bane lines serve; "kilometer zero" for the metro network; located beneath Norway's Parliament. Junction clashes: **doNotGroup Oslo Central Station (Oslo S / Jernbanetorget railway / Vy/NSB)** from Jernbanetorget T-bane stop. Both occupy Jernbanetorget square but are separate transport products (T-bane metro vs long-distance rail). Secondary transfer hub: Tøyen (lines 1, 2, 3, 4, 5 converge; street-level interchange).

GTFS (H2 names only; not D1): 

| surface | no-key? | result 29 Aug 2026 |
| --- | --- | --- |
| **GTFS-RT** `https://api.entur.io/realtime/v1/gtfs-rt/trip-updates?datasource=RUT` | **no: ET-Client-Name** | HTTP **200** (verified 28 Aug 2026 per tracker note). Protobuf GTFS-RT TripUpdates. Entur national real-time feed, datasource filter `RUT` (Ruter Oslo), updated continuously. Header `ET-Client-Name` required; no secret key (NLOD — Norwegian License for Open Data). |
| GraphQL StopPlaces / JourneyPlanner | **no: ET-Client-Name** | `https://api.entur.io/journey-planner/v3/graphql` — Entur journey planner; full timetable and real-time queries. Same header requirement. Later feed for Jim (D2). |
| Entur static GTFS (H2) | **no: ET-Client-Name** | Entur aggregates all Norwegian GTFS; filter `agency=rut` or similar. Not authoritative for line names; Ruter timetable is D1. |

Tram (trikk), bus, Vy/NSB commuter rail, Line 6 (Fornebu), and transfers to non-metro out of v1 oracle.

## Station name table

Match rule: published D1 string (Ruter maps/timetable) vs Entur GTFS `stop_name` (often Norwegian, accented). `rename` = same place, different printed string. T-bane typically appears as a parent in GTFS; watch for separate tram/bus children at shared stops.

| published (D1) | typical GTFS parent | class |
| --- | --- | --- |
| Stortinget | Stortinget, Oslo | **match family (lock)**. Kilometre marker zero. All five lines pass. No tram/bus merge into this stop. |
| Jernbanetorget | Jernbanetorget, Oslo | **match family (T-bane metro only)**. **doNotGroup Oslo Central Station / Oslo S (Vy/NSB) or Jernbanetorget railway station**. Metro stop in the tunnel; rail station above ground at same square. Bus terminals and tram also present on street level. |
| Majorstuen | Majorstuen, Oslo | match family. Western terminus of central tunnel. |
| Tøyen | Tøyen, Oslo | match family. All five lines converge; major transfer hub. |
| Nationaltheatret | Nationaltheatret, Oslo | match family. Central tunnel; tram connections above. |
| Grønland | Grønland, Oslo | match family. Central tunnel; tram/bus nearby. |
| Skøyen | Skøyen, Oslo | match family. Line 1 & 2 west of centre. |
| Frogner | Frogner, Oslo | match family. Line 3 west of centre. |
| Blindern | Blindern, Oslo | match family. Line 6 (not D1-live). Do not insert. |
| All other D1 names in published network (lines 1–5) | `{Name}, Oslo` or `{Name}` | match family (GTFS typically adds city name). Norwegian accents preserved (ø, å, etc.) in GTFS. |

Line 6 stations (Skøyen, Blindern, Majorstuen branch, Fornebu) **not inserted** into D1 published-network.json; line not operational on 29 Aug 2026.

## H2 — who has line codes 1–5 today

| surface | 1–5? | what it actually has |
| --- | --- | --- |
| Ruter linjekart + timetables (D1) | **yes** | Five lines: 1, 2, 3, 4, 5. Published as passenger-facing codes. No line 6. |
| Entur GTFS `route_short_name` | **yes** | RUT datasource: route_short_name `1`, `2`, `3`, `4`, `5`, `route_type=1` (subway). Colours assigned in feed. |
| Entur GTFS-RT TripUpdates | codes in trip IDs | Trip IDs reference GTFS route/stop IDs; no names in protobuf. Header auth needed. |
| Line 6 (Fornebu) | **future** | Not in current Ruter print maps. GTFS may pre-stage stops; do not assume live. Check Ruter official site for construction status. |

H2 conclusion: passenger codes 1–5 align in Ruter and Entur GTFS. Clash is **Oslo S / Jernbanetorget railway vs metro**, **Norwegian accents (ø, å) in station names**, **Line 6 presence in GTFS before passenger opening**, and **tram/bus children at major interchanges**. Do not generate published-network.json from `routes.txt`; hand-transcribe from Ruter D1.

## C2/C3 to put in front of Jim

1. **Stortinget is the locked hub string.** All five lines converge; "kilometer zero" of the network. Do not fragment by line.
2. **Jernbanetorget is T-bane metro only.** Separate the Vy/NSB railway station (Oslo Central / Oslo S) above ground; separate bus/tram terminals on street. `doNotGroup` into one stop.
3. **Lines 1–5 only in D1.** Line 6 (Fornebu) is under construction (opening expected 2029). Do not emit future stations as live; a new D1 flip is required after Fornebu opens.
4. **Norwegian accents in station names.** Ø, Å, ø, å preserved in GTFS. Do not ASCII-convert to O, A.
5. **Five lines through central tunnel:** all pass Majorstuen, Nationaltheatret, Stortinget, Jernbanetorget, Grønland, Tøyen. Check Ruter timetable for line-specific branch routes (e.g. Line 3 branches west).
6. **Tøyen is a major transfer hub** but not the singular lock like Stortinget. Handle as interchange, not fragment point.
7. **ET-Client-Name header required for all Entur APIs** (GTFS-RT, GraphQL). No secret key needed (NLOD).
8. **Timezone: Europe/Oslo (UTC+1 standard, UTC+2 summer DST).**

## What I did not do

No line-map generator from GTFS, no `stopIds` in published JSON, no live city flip, no GitHub PR, no tram/bus/rail rewrite, no construction update monitor.
