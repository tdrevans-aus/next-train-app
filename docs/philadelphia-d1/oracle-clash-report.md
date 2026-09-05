# Philadelphia oracle clash report

D1 (planned, as of 6 Sep 2026): **SEPTA Metro** rebrand 2024–2025. Three subway/elevated lines (B Broad Street, L Market–Frankford, M Norristown) renamed with color codes (orange, blue, purple respectively); six trolley lines redesignated as T1–T5, G, D with green branding; Regional Rail unchanged in operation.

## Feeds

**Static GTFS:**
- Rail (subway/elevated/commuter): https://github.com/septadev/GTFS/releases/latest/download/gtfs_public.zip#google_rail.zip
- Bus/trolley: https://github.com/septadev/GTFS/releases/latest/download/gtfs_public.zip#google_bus.zip

**GTFS Realtime (no authentication):**
- Vehicle Positions: https://www3.septa.org/gtfsrt/septa-pa-us/Vehicle/rtVehiclePosition.pb
- Trip Updates: https://www3.septa.org/gtfsrt/septa-pa-us/Trip/rtTripUpdates.pb
- Service Alerts: https://www3.septa.org/gtfsrt/septa-pa-us/Service/rtServiceAlerts.pb

All feeds are public; no API key or registration required. GTFS zips hosted on GitHub (septadev/GTFS releases); Transitland confirms successful fetch as of 2026-09-05. Feeds include both old nomenclature (route_long_name: "Broad Street Line", "Market-Frankford Line") and new nomenclature (route_short_name: "B", "L", "M", "G", "D", "T") per SEPTA's rollout schedule; physical signage replacement ongoing through 2026.

## Line inventory (2025 nomenclature)

| Line | Type | Former name | Color | Stations | Notes |
|------|------|-------------|-------|----------|-------|
| **B** | Subway/elevated | Broad Street Line | Orange | ~25 | North–South spine. Includes Fern Rock (north) to Ashton (south) terminals. |
| **L** | Subway/elevated | Market–Frankford Line | Blue | ~38 | East–West downtown/airport line. Includes Frankford (east) to 69th Street (west) terminals. |
| **M** | Elevated | Norristown High Speed Line | Purple | ~28 | West branch from 69th Street to Norriton (Norristown, PA). |
| **T1–T5** | Subway-surface trolley | Subway-Surface Lines | Green | ~70 (combined) | Five routes (Routes 10, 34, 13, 11, 36 legacy names): West Philadelphia and Delaware County surface, Center City underground (Market Street). T1 Market–69th. T2 Spruce–Pine. T3/T4/T5 others. Note: Trolley modernization (130 new low-floor vehicles, Alstom contract) 2024–2030. |
| **G** | Trolley | Route 15 (legacy) | Green | ~20 | City Avenue / Media Line. Delaware County trolley, separate from subway-surface. |
| **D** | Trolley | Routes 101/102 (legacy) | Green | ~25 | 69th Street Transit Center to Media/Chester Pike. Delaware County trolley. |
| **Regional Rail** | Commuter rail | Regional Rail (unchanged) | N/A | ~70 | Six regional lines (Airport, Warminster, West Trenton, Wilmington, Doylestown, Fox Chase / Media). |

## V1 cut recommendation

**v1 SEPTA Metro = B + L + M only** (three heavy-rail subway/elevated lines, 91 combined unique stations minus shared transfers). Do not include trolleys (T1–T5, G, D) or Regional Rail in v1.

Rationale: Chicago v1 precedent excludes bus/Metra/Pace; Philadelphia v1 similarly cuts to the "Metro" proper (heavy rapid transit core), excluding suburban commuter rail and light rail (trolley). The 2024–2025 rebrand explicitly names the three subway/elevated lines as SEPTA Metro; trolleys are branded separately in SEPTA's wayfinding and are light rail (vehicle class differs from heavy rail).

**Board eligibility verdicts (other services calling at in-catalog B/L/M stations):**

| Service | Verdict | Rationale | Reference |
|---------|---------|-----------|-----------|
| T1–T5, G, D (trolley lines) | `out-mode` | Light rail; different vehicle class from heavy rapid transit. Trolley modernization design/construction ongoing 2024–2030 (no impact on board eligibility, only fleet timeline). | https://wwww.septa.org/initiatives/trolley-modernization/faq/ |
| SEPTA Regional Rail | `in` | Walk-up boarding at turnstiles/validators; no compulsory seat reservation; tap-to-pay with SEPTA Key or conductor collects fare onboard. Coach service standard. Calls at 30th Street Station (shared platform with Regional Rail, outside metro stations) and Suburban Station (adjacent to L at 13th Street transfer). | https://wwww.septa.org/fares/ |
| Amtrak Northeast Regional (30th Street) | `in` | Coach seats unassigned, walk-up boarding, no compulsory reservation. Business Class has reserved seating but is optional fare tier; Coach is standard. Long-distance walk-up test (rule §6 edge case) passes: rider on platform with standard ticket can board next departure. | https://www.amtrak.com/northeast-regional-train |
| PATCO Speedline | `out-product` | Separate rail operator (Delaware River Port Authority). While it crosses into Philadelphia (Bridge Line, center-city platforms at 8th/Locust and 12th/13th), it is not SEPTA and not part of v1 scope. No recorded dispute; PATCO is listed separately in transit agency registries. | https://www.transit.land/operators/o-dr4e-portauthoritytransitcorporation |
| Buses | `out-mode` | Out of scope by mode cut. |  |

## Hub-lock station

**City Hall / 15th Street Station complex** (often called "15th Street" or "City Hall" on maps, unified transit complex):

- **B**: Platform at 15th Street Station (south end of Broad Street spine).
- **L**: Platform at 15th Street Station (central downtown hub on Market Line).
- **T**: Platform at City Hall Station (adjacent, part of the same underground concourse; T1/T2/T3 pass through).

This is the primary downtown transfer nexus; all three metro lines converge within a single underground concourse (free transfers). SEPTA's official site calls it "the primary transportation hub for the City of Philadelphia" (Dilworth Plaza, 15th Street Station, and City Hall Station Renovations initiative). Do not use "The Hub" as a station token (not an official name); "City Hall" or "15th Street" are both printed on official maps/signage, but the complex as a whole is what matters for v1.

Alternative or co-hub stations: Suburban Station (junction of B, L, and Regional Rail connection to 30th Street) also carries significant transfer volume; 13th Street (L + Regional Rail + T transfer); 30th Street (Regional Rail hub, outside metro v1). For v1 metro boarding cards, **City Hall / 15th Street** is the natural single lock.

## H2 clash surface

No product `lib/cities/philadelphia/` exists. Clash surface is **map vs GTFS nomenclature**. GTFS includes both old (route_long_name: "Broad Street Line", "Market-Frankford Line") and new (route_short_name: "B", "L", "M") names as of February 2025 rollout. Published static maps (septa.org system map, paper timetables) now display B/L/M. Old nomenclature remains in GTFS long-name field for backward compatibility. Do not invent city=septa-metro / philadelphia-rail / phl; choose city=philadelphia.

D1 station inventory: hand-transcribe from official SEPTA system diagram and regional-rail line maps (pages not yet identified; offline maps exist; digital high-res schematic not found). **Not GTFS-derived.** GTFS stop order will be imported, but stop names must match the printed system diagram, not GTFS or prior system versions.

Potential name collision: "30th Street Station" is shared between Regional Rail (SEPTA) and Amtrak (both use same physical location, William H. Gray III 30th Street Station). For v1 metro (B/L/M only) this is out of scope (no metro stop at 30th Street proper). Suburban Station and 13th Street/15th Street are the metro-to-Regional-Rail transfer points; 30th Street is noted as a contact point but not a v1 metro station.

## C2/C3 to put in front of Jim

1. **city=philadelphia**, not `philly`, not `septa`, not `septa-metro`. Do not invent Philadelphia-region or split into neighborhoods.
2. **SEPTA Metro = B + L + M only** (subway/elevated heavy rail). Trolleys (T, G, D) and Regional Rail are out-product; board verdicts: trolleys `out-mode`, Regional Rail `in`, Amtrak Coach `in`, PATCO `out-product`.
3. **City Hall / 15th Street** is the hub-lock station (all three metro lines + trolley T within one concourse). Do not use "The Hub" as a token name.
4. **Nomenclature**: GTFS includes both old (Broad Street Line / Market–Frankford Line / Norristown) and new (B / L / M) names. Use route_short_name where available (B, L, M); fall back to the color names (orange, blue, purple) if short_name is absent or ambiguous.
5. **Trolley lines**: T1–T5 are labeled by legacy route numbers (10, 34, 13, 11, 36) in current GTFS. The new T1–T5 designations appear in route_short_name as of Feb 2025; verify which take effect in the D1 window. G (Route 15) and D (Routes 101/102) are separate lines, not subway-surface.
6. **Regional Rail**: Not v1 but counted in board verdicts. Six lines (Airport, Warminster, West Trenton, Wilmington, Doylestown, Fox Chase/Media). No reservation requirement; walk-up OK.
7. **PATCO**: Separate operator; not SEPTA. Out-product; do not blend into Philadelphia metro.
8. **30th Street Station** is a Regional Rail/Amtrak hub outside v1 metro boundary (do not add as a metro station).
9. **Trolley modernization 2024–2030** ongoing: 130 low-floor Alstom vehicles. Does not block v1; schedule is fleet replacement, not service cut or rebranding further.
10. **America/Philadelphia timezone includes DST** (US Eastern).
11. **Modes v1**: **SEPTA Metro heavy rail only** (B, L, M). Do not bleed trolleys or bus. Board verdict `in` for Regional Rail coaches and Amtrak coaches at shared platforms (rule §6 / walk-up test). **doNotCollapse** same-name transfers: 13th Street (L + Regional Rail), 15th Street (B, L), Suburban Station (B, L, Regional Rail).
12. **Developer key**: Not required; feeds are public (no auth). SEPTA developer portal at http://www3.septa.org/developer/ documents terms and feed download. Transitland has cached copies.
13. **D1 scope**: B/L/M stops only. Regional Rail verdicts required (board rule). Not a full metro build (no trolley, no bus, no Amtrak as a separate operator entry—Amtrak is a verdict at shared platforms only). Pack stays **planned** until live flip.

## What I did not do

No live city file (`lib/providers/philadelphia.js`), no product edit, no GitHub clone/push, no API key pasted anywhere. No invent city=philly / septa / septa-metro. No GTFS-derived station orders without map comparison. No trolley line merge into metro (out-mode verdict stands). No Regional Rail service cut (walk-up boarding passes rule §2 test 1; included in board verdicts). No PATCO blend (separate operator, out-product verdict). No bus in v1 oracle scope (out-mode, no clip or details).

## License

- **License name:** SEPTA Developer License Agreement and Terms of Use.
- **Redistribution / rehosting:** Non-exclusive, limited, revocable licence to use, reproduce, and redistribute SEPTA data "in GTFS format only, for the sole purpose of assisting mass transportation riders or promoting public transportation." Express permission required for derivative products beyond trip planning.
- **Commercial use:** **Not allowed.** "Licensee may not use SEPTA's trademarks and copyrighted materials for any commercial or profit-making use." The license restricts commercial deployment; SEPTA reserves the right to impose future licensing fees.
- **Attribution:** Not required by the license, but SEPTA trademarks and copyrighted materials (logo, branding) are protected; optional phrasing such as "Data provided by SEPTA" is permitted. Do not lead with SEPTA name/logo in commercial-adjacent contexts.
- **Terms URL:** http://www3.septa.org/developer/ (full license text embedded; also mirrored on Transitland feed pages for SEPTA feeds).
- **Confidence:** `clear`. SEPTA's developer terms are explicit and publicly posted; no ambiguity on redistribution purpose-limit or commercial prohibition.
- **Keyed feeds:** None. SEPTA feeds are public; no API key, token, OAuth, or account registration required. Transitland provides cached copies; direct access via GitHub releases and SEPTA's own endpoints.
- **GTFS-RT feeds:** No separate license posted for GTFS-RT endpoints; they fall under the same SEPTA Developer Agreement and are freely accessible.

## Board eligibility

| Service | In-catalog stations | Verdict | Walk-up | Reservation | Evidence |
|---------|-------------------|---------|----------|------------|----------|
| B (Broad Street Line) | All 25 B stops | `in` | Yes | No | Metro line, v1 in-scope. |
| L (Market–Frankford Line) | All 38 L stops | `in` | Yes | No | Metro line, v1 in-scope. |
| M (Norristown High Speed Line) | All 28 M stops | `in` | Yes | No | Metro line, v1 in-scope. |
| T1–T5 (Subway-Surface Trolley) | Calls at 15th Street, 13th Street (overlap with L) | `out-mode` | Yes | No | Light rail (trolley); different vehicle class. Not in v1 metro cut. |
| G (Route 15 trolley) | No overlap with B/L/M in-catalog stations | `out-mode` | Yes | No | Light rail trolley, Delaware County, separate from metro. |
| D (Routes 101/102 trolley) | No overlap with B/L/M in-catalog stations | `out-mode` | Yes | No | Light rail trolley, Delaware County, separate from metro. |
| SEPTA Regional Rail | Suburban Station (walk-in from L/B), 30th Street (outside metro v1) | `in` | Yes | No | Walk-up boarding, tap at turnstiles/validators, no advance reservation required. Coach service. |
| Amtrak Northeast Regional (Coach) | 30th Street Station (outside metro v1) | `in` | Yes | No | Coach seats unassigned, walk-up boarding, no compulsory reservation. Long-distance but passes rule §6 edge case. |
| PATCO Speedline | 8th/Locust, 12th/13th (no metro overlap, separate operator) | `out-product` | Yes | No | Separate operator (Delaware River Port Authority). Not SEPTA. Out of v1 scope. |

**Note:** Only B, L, M stations are v1 in-catalog. Regional Rail, Amtrak, trolleys, and PATCO are listed for completeness; board verdicts apply only if they call at an in-catalog station. Trolley overlap at 15th Street and 13th Street (T lines + L) are noted; both are out-mode so no conflict. Regional Rail at Suburban Station (adjacent to L at 13th Street) and 30th Street (outside metro v1) are recorded.
