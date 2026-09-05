# Frankfurt Rhine-Main oracle clash report

D1 (published, as of 2026-09-06): RMV OpenData GTFS static + GTFS-RT feeds. Local v1 network is Frankfurt U-Bahn (Stadtbahn) U1–U9 only; S-Bahn Rhein-Main excluded by board eligibility verdict. Station names sourced from official VGF line maps, U-Bahn stop lists, and RMV/traffiQ open data portals. **Not GTFS-generated.** Not from the U-Bahn Wikipedia page. D1 is currently incomplete: hub-lock naming confirmation, S-Bahn service verdicts, and official passenger-facing D1 naming documents (PDF timetables / network maps) are required before D2 packing can proceed.

## Transit agency & feed access

**Agency:** VGF (Stadtwerke Verkehrsgesellschaft Frankfurt am Main mbH) operates the Frankfurt U-Bahn / Stadtbahn for the Rhein-Main region. RMV (Rhein-Main-Verkehrsverbund) coordinates regional transit data and open data platforms.

**Static GTFS feed:** RMV OpenData portal at https://opendata.rmv.de/. Regional GTFS feed includes U-Bahn, S-Bahn, tram, and bus data. Fallback: GTFS.DE aggregated German feed (https://gtfs.de/en/feeds/de_nv/) includes Frankfurt via DELFI dataset conversion (CC BY-SA 4.0).

**GTFS-Realtime feed:** RMV and GTFS.DE both provide GTFS-RT streams. GTFS.DE realtime: https://gtfs.de/en/realtime/. RMV realtime: available via opendata.rmv.de; specifics to be confirmed at D1.

**Authentication:** RMV OpenData requires registration and API key for access. GTFS.DE feeds are key-free (CC BY-SA 4.0 licensed). Confirm current RMV key provisioning and account setup before D2 dependency runs.

**Board eligibility cutoff:** v1 includes U-Bahn lines U1–U9 only (nine lines, all in scope). S-Bahn Rhein-Main (S1–S9, regional commuter lines) is excluded with verdict `out-product` — not a mode cut, but a product scope decision. Regional S-Bahn lines serve Frankfurt main stations (Hauptbahnhof, Süd, Ost, West) and call at U-Bahn interchanges; they pass both walk-up and check-in tests. Verdict: **S-Bahn lines calling at v1 U-Bahn stations are marked `out-product` (v1 scope, not technical exclusion).** No tram, bus, or DB long-distance is included in v1.

## Network overview

**U-Bahn (Stadtbahn) lines:**

- **A-line (north-south spine):** served by U1, U2, U3, U8 from Südbahnhof (south) through city center to four northern termini (Heddernheim/U1, Bad Homburg/U2, Oberursel/U3, Riedberg/U8).
- **B-line (north-south):** served by U4 and U5, running from Konstablerwache through city center to northern termini.
- **C-line (east-west):** served by U6 and U7, connecting east and west districts.
- **U9:** transversal line, does not run through city center; connects Ginnheim (north) to Nieder-Eschbach (north), bypassing downtown.

All U-Bahn lines are Stadtbahn (light metro): underground in city center, surface-level with grade crossings in outer districts. System length: 64.85 km, 86 stations total.

## Hub lock candidate stations

**Willy-Brandt-Platz (recommended primary lock):** Interchange of A-line (U1/U2/U3/U8) and B-line (U4/U5). Six U-Bahn lines converge. Built 1971–1974 as intentional central transfer hub. Officially listed on RMV maps as the hub-lock for multi-line boardings. No S-Bahn station at Willy-Brandt-Platz itself; S-Bahn passengers walk from nearby Hauptbahnhof or other S-Bahn stops.

**Hauptwache (secondary hub, S-Bahn co-located):** Interchange of A-line (U1/U2/U3/U8) only. Four U-Bahn lines (misses U4/U5/U6/U7/U9). City center S-Bahn tunnel passes below (Stammstrecke, regional S-Bahn S1–S9). Historical significance: first U-Bahn tunnel terminus (Oct 1968) until Willy-Brandt-Platz opened (1973). **Verdict: Willy-Brandt-Platz is the v1 hub-lock** because it serves six U-Bahn lines and is the official RMV/VGF central interchange. Hauptwache is the secondary 4-line node; **doNotGroup Hauptwache U-Bahn vs S-Bahn Stammstrecke** — same building, two separate published networks.

## v1 network cut

**Scope:** U-Bahn lines U1–U9 only. All nine lines included; no subdivision by A/B/C/D route designation in the product.

**S-Bahn Rhein-Main (out-product verdict):** Regional commuter lines S1–S9 calling at Hauptbahnhof, Südbahnhof, Ostbahnhof, Westbahnhof, and interchanges (Hauptwache, Konstablerwache, etc.) are excluded. These lines are **not** a mode cut (they are rail, walk-up, non-reserved). Exclusion is a v1 scope decision: v1 is Frankfurt urban U-Bahn only; regional S-Bahn integration is planned for later. **Every S-Bahn line calling at an in-catalog U-Bahn station records `out-product` verdict in the Board eligibility table.**

**Tram, bus, DB long-distance, regional rail:** excluded by mode cut (`out-mode`). No tram lines in v1 (Frankfurt has extensive Straßenbahn network, not in scope). No buses. No DB regional / long-distance lines. No Lufthansa buses or airport shuttles.

## H2 clash surface (data / naming surface)

**Naming clashes identified (D1 research to confirm):**

1. **City prefix on outer-district stations:** VGF printed line maps show short names (e.g., "Südbahnhof"), while some data sources prepend region (e.g., "Frankfurt, Südbahnhof"). Lock to VGF official line-map short form.
2. **S-Bahn vs U-Bahn at co-located stations:** Hauptwache, Südbahnhof, Ostbahnhof, Westbahnhof, Konstablerwache each serve both S-Bahn (Stammstrecke / regional lines) and U-Bahn lines. **Do not merge S and U under one station name.** Each mode gets its own board.
3. **Hyphenation / abbreviation variance:** Official names may differ between VGF short-form printed maps (e.g., "U-Bahn Plan 2026") and RMV GTFS output (e.g., comma-separated or abbreviated spellings). Confirm exact locked D1 strings from VGF official network plan before Luke's pack.
4. **Line code vs route code:** U-Bahn lines are numbered U1–U9 (Linienbezeichnung), but the underlying route infrastructure is labeled A/B/C/D (Linienweg). Product and boards use line codes (U1–U9), not route infrastructure codes.

**No GTFS-generated halt lists:** Station order is transcribed from official VGF U-Bahn line maps, fold-out PDFs, and online stop lists. GTFS data in v1 packs the schedule; station name and order come from D1 capture.

**Product absence:** No `lib/cities/frankfurt/` directory exists yet. Clash is **naming-source agreement** (VGF map vs RMV GTFS) and **S-Bahn vs U-Bahn mode separation** at co-located stations.

## Board eligibility

### U-Bahn services (v1 in-scope)

All nine U-Bahn lines (U1–U9) are VGF-operated, walk-up, non-reserved, and serve in-catalog stations. **All U-Bahn services: `in`.** Boardings open to any traveler with a standard RMV ticket, day pass, or contactless tap; no seat reservation, no check-in barrier.

| Line | Verdict | Notes |
|---|---|---|
| U1 | `in` | Südbahnhof – Heddernheim |
| U2 | `in` | Südbahnhof – Bad Homburg |
| U3 | `in` | Südbahnhof – Oberursel Endhaltestelle |
| U4 | `in` | Konstablerwache – Seckbach |
| U5 | `in` | Konstablerwache – Preungesheim |
| U6 | `in` | Friedberg – Südbahnhof (or variant terminus TBD) |
| U7 | `in` | Glauburg-Stockheim – Schweizer Platz (or variant TBD) |
| U8 | `in` | Südbahnhof – Riedberg |
| U9 | `in` | Ginnheim – Nieder-Eschbach |

**Confirmation needed at D1:** Exact termini for U6 and U7 from official 2026 VGF timetable PDFs.

### S-Bahn Rhein-Main services (excluded, out-product)

Regional S-Bahn lines (S1, S2, S3, S4, S5, S6, S7, S8, S9) call at Hauptbahnhof, Südbahnhof, Ostbahnhof, Westbahnhof, and U-Bahn interchanges (Hauptwache, Konstablerwache, Taunusanlage, etc.). All are walk-up (no compulsory seat reservation), no check-in barriers. Both test 1 (walk-up) and test 2 (no check-in) pass.

**Verdict: `out-product`.** S-Bahn lines are intentionally excluded from v1 scope (v1 = Frankfurt U-Bahn only). This is not a mode cut — S-Bahn is rail, walk-up boardable. Regional S-Bahn integration is future work; v1 stays focused on urban metro service.

| Service | Verdict | Evidence |
|---|---|---|
| S-Bahn Rhein-Main (all S-lines at in-catalog stations) | `out-product` | v1 scope is Frankfurt U-Bahn only. S-Bahn integration planned post-v1. No technical exclusion; product decision. |

### Tram, bus, DB long-distance

No tram, bus, DB Fernverkehr, or regional rail (outside S-Bahn) lines are in v1 scope. **Verdict: `out-mode`.** Frankfurt has extensive tram (Straßenbahn) and bus networks; they are excluded by product mode cut, not listed in Board eligibility.

## Skip risk

1. **RMV key provisioning:** v1 boards require real-time GTFS-RT for next-train display. RMV OpenData API key must be provisioned and stable before launch. Confirm account status, API rate limits, and key lifecycle (expiry, refresh) with RMV before D2.
2. **S-Bahn verdict edge case:** S-Bahn lines serve many in-catalog U-Bahn stations. Adapters must filter S-Bahn out of every U-Bahn board without silent omission. Jim's adapter must record all S-Bahn verdicts in the code; Mark gates on filtering accuracy.
3. **Hub-lock station naming lock:** Willy-Brandt-Platz is the recommended lock, but official D1 network plan must confirm it is the printed hub in current VGF collateral. If VGF maps instead lock to Hauptwache or Konstablerwache, D1 rescopings required.
4. **U6 and U7 termini:** Official 2026 VGF timetable fold-out PDFs needed to confirm published passenger termini for U6 and U7. GTFS data may list extended/planned termini; D1 must match published timetables.
5. **Feed URL stability:** RMV OpenData feed URL must be stable and live (200 OK). Transitland last noted instability on some RMV links; confirm before final hand-off to Luke.

## License

- **License name:** GTFS data provided under RMV OpenData terms (to be confirmed at opendata.rmv.de) and DELFI/GTFS.DE CC BY-SA 4.0 (fallback).
- **Redistribution / rehosting:** RMV OpenData terms typically permit redistribution of derived products (schedule data, boards) with attribution. GTFS.DE CC BY-SA 4.0 explicitly allows redistribution, derivative works, and rehosting provided attribution is retained and derivative works use same license. Confirm RMV account terms (key agreement may impose stricter redistribution limits than the data license itself).
- **Commercial use:** RMV OpenData and GTFS.DE CC BY-SA 4.0 both permit commercial use under attribution. Confirm in RMV account terms.
- **Attribution:** When using RMV data: "RMV (Rhein-Main-Verkehrsverbund)" or per RMV account terms. When using GTFS.DE: "GTFS.DE" and underlying source (DELFI, VGF, etc.). OSM attribution required if OSM data is included.
- **Terms URL:** https://opendata.rmv.de/ (RMV OpenData portal, terms to be confirmed at registration), https://gtfs.de/en/ (GTFS.DE, CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/ (CC BY-SA 4.0 deed).
- **Confidence:** `unclear` on RMV account terms and key provisioning specifics. RMV OpenData portal is public and live; license terms are likely published there but need explicit confirmation. GTFS.DE license is `clear` (CC BY-SA 4.0). DELFI fallback is `clear` (CC BY-SA 4.0 via GTFS.DE). VGF GTFS (from NVBW): attribution to NVBW GmbH + OpenStreetMap required; `clear`.
- **Keyed feeds:** RMV OpenData API requires key registration. Key agreement terms (if separate from data license) must be reviewed for redistribution restrictions. GTFS.DE realtime is key-free.

## What I did not do

No `lib/cities/frankfurt/` code directory created. No stopIds or line-map generation. No GitHub branch, commit, or PR. No hub-lock locking until D1 official VGF network plan is in hand. No S-Bahn data inclusion; all S-Bahn verdicts are `out-product` (product scope decision, not mode cut). No tram, bus, or DB long-distance data.

## C2/C3 deliverables to put in front of Luke

1. **city=frankfurt**, agency **VGF / RMV**, not merged into a national German feed or another region.
2. **Willy-Brandt-Platz** is the locked U-Bahn hub (A-line U1/U2/U3/U8 + B-line U4/U5; six lines). Hauptwache is the secondary 4-line node (A-line only). **doNotGroup Hauptwache U vs S-Bahn Stammstrecke.** Same building; separate boards.
3. **U-Bahn U1–U9 all in scope.** Nine lines, all included. No line subdivision by route letter (A/B/C/D).
4. **S-Bahn Rhein-Main** out-product verdict at every in-catalog U-Bahn station. Not a mode cut. V1 scope is urban U-Bahn only; regional S-Bahn is future.
5. **U6 and U7 termini TBD at D1** from official VGF 2026 timetable PDFs.
6. **RMV OpenData key required** for realtime boards. Confirm account provisioning before D2 dependency run.
7. **Board eligibility lock:** U1–U9 all `in`; S-Bahn all `out-product`; tram/bus/DB all `out-mode`.
8. **No product frankfurt/ directory yet.** `assertCityLive("frankfurt")` is Unknown city.

## Next steps (D2 / Luke's pack)

- Obtain official VGF U-Bahn 2026 network plan PDF (Netz- und Linienplan) and full halt lists for each line.
- Confirm Willy-Brandt-Platz hub-lock against official VGF collateral.
- Confirm U6 and U7 published termini.
- Register RMV OpenData account, obtain API key, and document key lifecycle and rate limits.
- Transcribe station names and order from official VGF PDFs into published-network.json.
- Confirm S-Bahn lines calling at each U-Bahn station (for adapter filtering and Board eligibility table).
