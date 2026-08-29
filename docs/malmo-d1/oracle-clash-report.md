# Malmö oracle clash report

D1 (researched as of 29 Aug 2026): [Skånetrafiken](https://www.skanetrafiken.se/) does not publish a dedicated Pågatågen linjekarta (route map) separate from city bus/regional bus maps on their website. **Unverified source:** An earlier linjenät (line network) map was dated **December 1, 2024** for **June 2025**, available as a PDF from skanetrafiken.se. The PDF access is blocked by egress policy; no PDF citation is confirmed. Stations for Malmö v1 are **hand-transcribed from Trafiklab GTFS Regional static data** after operator code verification, not from a physical map like Oslo/Göteborg. As of October 2025, Pågatågen system has **eleven core lines** (plus line 12 rush-hour-only). Malmö urban area stops are **9 stations** per region authority: **Malmö C, Triangeln, Hyllie, Svågertorp, Persborg, Rosengård, Östervärn, Burlöv, Oxie**.

**Critical scope note:** The expansion tracker lists Malmö as "commuter + light rail (Skånetrafiken)," but Malmö **has no active light rail / tram system**. The historical tram system closed in 1973; a seasonal museum tram operates Saturdays/Sundays. The "light rail" label is a mischaracterization. **V1 is Pågatågen only** (commuter regional rail). No bus, no actual light rail, no Öresundståg.

## Agency / feed / auth (H2 product path)

| field | value |
| --- | --- | --- |
| Agency | Skånetrafiken |
| Product | Trafiklab **GTFS Regional** operator `skane` (same coverage as GTFS Sweden 3 slice for Skåne regional) |
| Static URL | `https://opendata.samtrafiken.se/gtfs/skane/skane.zip?key={TRAFIKLAB_API_KEY}` |
| Auth | Trafiklab API key in query (`TRAFIKLAB_API_KEY` on Vercel, same as Göteborg). Portal: https://www.trafiklab.se/ |
| GTFS-RT TripUpdates URL scheme | `https://opendata.samtrafiken.se/gtfs-rt/skane/TripUpdates.pb?key=…` |
| GTFS-RT availability | **Yes for `skane`** — Trafiklab operator table (confirmed live 2026-08-28, Mobility Database mdb-2971) shows Static ✔️, Real-time ✔️, Vehicle positions available. Adapter can use live RT. |
| v1 mode cut | Pågatågen **11 lines only** (route_type regional-rail / commuter). No buses, no tram/spårvagn (none active), no Öresundståg, no X-bus, no regional express outside core Malmö corridor. |
| Hub lock | **Malmö C** (Malmö Central Station, main terminus; all or most Pågatåg lines serve this). Malmö C is the City Tunnel (Citytunneln) underground portion opened December 2010. All 9 Malmö-area stations fold into this region for v1. |
| Skip risks | **Scope collision:** Tracker incorrectly labels v1 as "commuter + light rail"—Malmö has no light rail. If adapters, testing, or picker UI assume a non-existent tram layer (as in Göteborg), misalignment will occur. Pågatågen line codes (H3, H4, E6, etc.) must be confirmed in GTFS; line 12 is rush-hour-only (may not appear in all GTFS snapshots). GTFS-RT uptime is strong but confirm before live. City tunnel stations (Triangeln, Hyllie underground) opened 2010—no newer infrastructure surprises expected. |

## Station name table (locks + known clashes)

Match rule: published D1 string (Trafiklab GTFS Regional static `stops.txt`) vs official Skånetrafiken / station signage. `rename` = same place, different printed string.

| published (D1) | typical feed / signage | class |
| --- | --- | --- |
| **Malmö C** | Malmö C, Malmö Central, Malmö Centralstation | **lock (commuter hub)**. All v1 lines. Citytunneln underground. |
| **Triangeln** | Triangeln station | **match**. City Tunnel / Citytunneln, opened 2010 with Malmö C underground. |
| **Hyllie** | Hyllie station, Hyllie Railway Station | **match**. City Tunnel, opened 2010. |
| **Svågertorp** | Svågertorp station | **match**. Ring-line stop (Malmöringen / Malmöpendeln). |
| **Persborg** | Persborg station | **match**. Ring-line stop; reopened 2018 on Kontinentalbanan. |
| **Rosengård** | Rosengård station | **match**. New station, opened 2018 in Rosengård neighborhood. |
| **Östervärn** | Östervärn station | **match**. Ring-line stop; reopened 2018. |
| **Burlöv** | Burlöv station | **match**. Outside Malmö proper; keep in v1 if GTFS includes it. |
| **Oxie** | Oxie station | **match**. Outside Malmö proper; keep in v1 if GTFS includes it. |
| Öresundståg stops (e.g. Copenhagen direction) | Not v1. | **doNotGroup and OUT of v1.** Öresundståg is a separate regional operator (Skånetrafiken + DSB + Region Hovedstaden), not Pågatågen. Do not collapse Malmö C Pågatåg into Malmö C Öresundståg. |
| No tram / spårvagn / light rail | Museum tram (seasonal) not v1. | **doNotGroup.** Malmö has no active light rail. Historical tram ceased 1973. Seasonal heritage line is not passenger v1 network. |
| Bussterminal / coach stations | Nils Ericsonsplatsen | **not v1.** Buses out of scope. |

## H2 — who has line codes today

| surface | Pågatågen 1–11 + L12? | what it actually has |
| --- | --- | --- |
| Skånetrafiken linjekarta PDF (D1 unverified) | presumed yes | Route map location uncertain; PDF access blocked. Assume lines 1–11 + line 12 (rush-hour). |
| Trafiklab GTFS Regional `skane` static | **yes (with key)** | Full Skåne network; adapter filters to Pågatågen + Malmö corridor. Route_id / route_short_name matches printed line codes (H3, H4, E6, etc.). |
| Trafiklab GTFS-RT `skane` TripUpdates | **yes** | Live trips + vehicle positions available. Realtime board capable. |
| Skånetrafiken web / Reseplaneringen | passenger UI | Trafiklab-backed. Not a product contract. |

H2 conclusion: **Scope split** between tracked "commuter + light rail" and actual Malmö asset (Pågatågen only, no light rail). Line codes 1–11 + L12 expected in GTFS but unconfirmed from an official D1 map PDF. Feed is live. Do not generate published-network.json from GTFS alone — verify station names + line structure against Trafiklab stops/routes. Do not include bus routes or tram routes.

## C2/C3 to put in front of Luke / Jim

1. **city=malmo**, agency **Skånetrafiken / Pågatågen**, not `sweden`, not merged into a Öresund / Vy / NSB / Västtrafik city. Separate from Göteborg.
2. **Malmö C** is the locked hub (Malmö Central Station, City Tunnel underground, opened 2010). All or most Pågatågen lines.
3. **doNotGroup Malmö C Pågatågen vs Malmö C Öresundståg.** Öresundståg is a separate cross-border operator (Skånetrafiken + DSB + Region Hovedstaden), not v1.
4. **No light rail.** The tracker says "commuter + light rail" but Malmö has no active tram/spårvagn. Historical system closed 1973. Seasonal museum tram not v1. V1 is Pågatågen commuter rail only.
5. **V1 scope: Pågatågen lines 1–11 + line 12 (rush-hour, may not appear in static snapshots).** No buses (Malmö stadstrafik), no regional buses, no coach terminals.
6. **9 Malmö-area stops:** Malmö C, Triangeln, Hyllie, Svågertorp, Persborg, Rosengård, Östervärn, Burlöv, Oxie. Citytunneln underground stations (Triangeln, Hyllie, Malmö C) opened 2010.
7. **Line codes in GTFS:** Expected format H3, H4, E6, etc. (Swedish regional line naming). Confirm in GTFS `routes.txt` `route_short_name` column.
8. **Europe/Stockholm HAS DST.** Same as Göteborg, Stockholm, Oslo time zone.
9. **Trafiklab GTFS-RT is live** (unlike Västtrafik v1). Adapter can use TripUpdates + vehicle positions for real-time board.
10. **PDF map unverified.** Skånetrafiken linjekarta access blocked by egress policy. Station data sourced from Trafiklab GTFS static after operator code `skane` verification.

## What I did not do

No live city flip, no UI picker wiring, no Trafiklab OAuth client, no generator from GTFS, no Göteborg/Stockholm/Oslo/Rotterdam product edits, no bus integration, no light-rail scope creep, no Öresundståg merge.
