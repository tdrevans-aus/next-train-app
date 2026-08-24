# Next Train UK — coding brief (plan handoff)

**Mode:** implement from this brief. Do not invent stations. Do not clone extra scope.
**Owner:** Zoe (plan). Tim copies / pastes to Jim for code.
**Date:** 23 Aug 2026 (Perth).

---

## What to build first

Two live **regions**, not “the UK”:

1. **West Midlands** — whole Combined Authority + Kidderminster as an extra test station + current West Midlands Metro.
2. **Ellesmere Port corridor** — Merseyrail branch + Chester side from Hooton + Liverpool loop interchanges.

London TfL rail is designed as region 3. Do not build it in this brief.

Northern Ireland is out of the product.

---

## Product rules (do not break these)

- Users search a **stop**, they do not pick a TOC.
- A region is a **station/stop allow-list** plus the modes that serve those stops. Trains may continue to OUT stations; show the destination name, do not add the OUT stop to the region table.
- Stops can belong to one home region. Overlaps later (e.g. Lime Street also in a Liverpool region) are allowed; do not block on that now.
- Do not split data or UI by train company. Parse every operator that calls an in-scope stop.
- Do not use Network Rail’s five regions as product IDs.
- Key National Rail stops by **CRS** (and NLC if you already have it). Key Metro stops by the operator’s stop id, not a fake CRS.

---

## Region 1 — West Midlands

### In

- Every National Rail station whose ORR Combined Authority is **West Midlands** (Table 6329, 31 Mar 2026): **71 stations**.
- Plus Camp Hill, opened **7 Apr 2026** (after that snapshot): **Moseley Village, Kings Heath, Pineapple Road**. Live NR total **74**.
- Plus **Kidderminster** (KID), Worcestershire, extra tester station. Live NR total **75**.
- Plus **all 35 current** West Midlands Metro stops (operator “Current Service” map). Not National Rail.

### ORR 71 by borough

**Birmingham (34):** Acocks Green; Adderley Park; Aston; Birmingham Moor Street; Birmingham New Street; Birmingham Snow Hill; Blake Street; Bordesley; Bournville; Butlers Lane; Chester Road; Duddeston; Erdington; Five Ways; Four Oaks; Gravelly Hill; Hall Green; Hamstead; Jewellery Quarter; Kings Norton; Lea Hall; Longbridge; Northfield; Perry Barr; Selly Oak; Small Heath; Spring Road; Stechford; Sutton Coldfield; Tyseley; University; Witton; Wylde Green; Yardley Wood.

**Solihull (11):** Berkswell; Birmingham International; Dorridge; Earlswood (West Midlands); Hampton-in-Arden; Marston Green; Olton; Shirley; Solihull; Whitlocks End; Widney Manor.

**Sandwell (12):** Bescot Stadium; Cradley Heath; Dudley Port; Langley Green; Old Hill; Rowley Regis; Sandwell & Dudley; Smethwick Galton Bridge; Smethwick Rolfe Street; Tame Bridge Parkway; The Hawthorns; Tipton.

**Walsall (5):** Bloxwich; Bloxwich North; Darlaston; Walsall; Willenhall.

**Dudley (4):** Coseley; Lye; Stourbridge Junction; Stourbridge Town.

**Coventry (4):** Canley; Coventry; Coventry Arena; Tile Hill.

**Wolverhampton (1):** Wolverhampton.

**Post-6329:** Moseley Village; Kings Heath; Pineapple Road.  
**Extra:** Kidderminster.

Look up CRS/NLC from 6329 / Knowledgebase. Do not guess Camp Hill codes.

### Metro (35, current only)

Edgbaston Village; Five Ways; Brindleyplace; Library Centenary Square; Town Hall; Grand Central; Corporation Street; Bull Street; Albert Street; Millennium Point; St Chads; St Paul’s; Jewellery Quarter; Soho Benson Road; Winson Green; Handsworth Booth Street; The Hawthorns; Kenrick Park; Trinity Way; West Bromwich Central; Lodge Road; Dartmouth Street; Dudley Street; Black Lake; Wednesbury Great Western Street; Wednesbury Parkway; Bradley Lane; Loxdale; Bilston Central; The Crescent; Priestfield; The Royal; Pipers Row; Wolverhampton Station; Wolverhampton St George’s.

**Out:** Wednesbury–Brierley Hill / Dudley Metro (not open). Digbeth/Curzon until the operator lists them under Current Service.

### Modes

- National Rail departures at the 75 rail stations (WMR, LNWR, Avanti, CrossCountry, Chiltern, TfW, anything else Darwin returns).
- West Midlands Metro arrivals/departures at the 35 stops.

Buses are out.

### Out (common false friends)

Wythall, Hagley, Blakedown, Worcester, Warwick, Leamington, Stafford, Penkridge, Water Orton, Coleshill Parkway, Shenstone, Lichfield City, Lichfield Trent Valley, Barnt Green, Alvechurch, Redditch, Landywood, Cannock, Hednesford, Rugeley, Lapworth, Bermuda Park, Bedworth, Nuneaton.

A Cross-City train to Redditch is fine. Redditch is not a West Midlands stop.

### Data

- **NR live:** Darwin (Rail Data Marketplace). Prefer push if volume needs it. Free tier: 5k req/h typical token cap; 5m requests / 4-week period then charged. Attribute NRE.
- **Static NR:** CRS, names, lat/lon from 6329 / NaPTAN / Knowledgebase. 6329 ODS: https://dataportal.orr.gov.uk/media/ootlf0cn/table-6329-station-attributes-for-all-mainline-stations.ods (31 Mar 2026).
- **Metro:** TfWM / West Midlands Metro live API (not Darwin). Do not scrape the map.

### Done when

- Every 75 NR stations and 35 Metro stops are searchable and show next departures.
- New Street, Moor Street, Snow Hill, International, Coventry, Wolverhampton, University, Walsall, Stourbridge Junction, Kidderminster all work.
- Camp Hill three + Darlaston + Willenhall all work (they are new; do not drop them as “unknown”).
- Metro Grand Central / Wolverhampton Station interchange does not collide with the NR station id.
- A departure towards Redditch / Lichfield / Worcester still renders, without those stations joining the allow-list.

---

## Region 2 — Ellesmere Port corridor

### In

| Stop | CRS | Role |
|---|---|---|
| Ellesmere Port | ELP | Home terminus |
| Overpool | OVE | Branch |
| Little Sutton | LTT | Branch |
| Hooton | HOO | Junction |
| Capenhurst | CPU | Chester branch |
| Bache | BAC | Chester branch |
| Chester | CTR | Chester end (SFO TfW; Merseyrail calls) |
| Liverpool James Street | LVJ | Loop |
| Moorfields | MRF | Loop / Northern Line |
| Liverpool Lime Street | LIV | Loop + mainline interchange |
| Liverpool Central | LVC | Loop |

**11 stops.** Not “Merseyside”.

### Modes

Merseyrail Wirral Line on this geography. Also show any other Darwin service that calls these stops (TfW/Northern at Chester and Lime Street; sparse Northern at ELP).

### Out

Rest of Wirral (Eastham Rake, Bromborough, Hamilton Square, West Kirby, New Brighton, …) as owned stops. They may appear as calling points on a train already in scope.
Stanlow & Thornton (no calls). Helsby / Ince & Elton are not region stops; if a Northern from ELP appears, show it.

### Data

Same Darwin as region 1. Merseyrail is a National Rail TOC.

### Done when

- ELP shows Merseyrail to Liverpool (typically :30, peak extras) and, if present, the rare Northern.
- Hooton shows both Liverpool and Chester ways.
- Chester and the four Liverpool loop stops resolve.
- West Kirby is not a searchable home stop in this region.

---

## App / model notes (high level)

- `country = GB` (not UK). `region` is the allow-list above.
- One Darwin subscription can feed both regions. Filter by CRS allow-list.
- Metro is a second feed, West Midlands only.
- Do not publish maps from GTFS unless that is already how AU cities work; match existing Next Train patterns (Tim / Jim know this). Do not flip cities live. Do not edit Perth. Do not open PRs unless Tim says so.
- Attribution: National Rail Enquiries / Darwin; TfWM Metro; do not impersonate TfL/TfWM/Merseyrail.

---

## Whole UK — likely regions and why

GB has **2,589** mainline stations (ORR, 31 Mar 2025 snapshot in earlier research; 6329 now dated 31 Mar 2026). One list is unusable. We do **not** divide by TOC (names and contracts move; stations are multi-operator) or by Network Rail’s five regions (ops geography, not how people travel).

We divide the way the AU product already does: **a city-region people can mentally own**, aligned with a transport authority and a live-data story. Residual rail sits in a later GB National Rail layer, not in “misc”.

### Recommended region set (high level)

| # | Region | Why it is a region | First-class extra mode | Live data |
|---|---|---|---|---|
| 1 | **West Midlands** | WMCA + TfWM. First family-test slice. | Metro (35) | Darwin + Metro API |
| 2 | **Ellesmere Port corridor** | Thin family-test sliver. Becomes part of Liverpool City Region when that region ships. | — | Darwin |
| 3 | **London TfL** | Different beast: 272 Tube, 41 Elizabeth, DLR, Overground, trams. Own API, own map language. Tim: TfL rail only, no buses, no NR. | Tube / DLR / tram / Overground / Elizabeth | TfL Unified API |
| 4 | **London & South East NR** | The huge leftover: termini + commuter belt. Too big for one agent forever; split later (Kent / Sussex / Thameslink / Great Eastern / GWML / WCML south) if it hurts. | — | Darwin |
| 5 | **Greater Manchester** | TfGM, Metrolink (~99 stops), Bee Network taking local rail. Second-largest English metro after London. | Metrolink | Darwin + TfGM |
| 6 | **Liverpool City Region** | Merseyrail is its own electric network. Absorbs the EP corridor. | Merseyrail as the local brand | Darwin |
| 7 | **West Yorkshire** | Leeds hub, own CA, heavy NR, no full metro. | — | Darwin |
| 8 | **South Yorkshire** | Sheffield hub, Supertram. | Supertram | Darwin + tram feed |
| 9 | **North East** | Newcastle / Sunderland + **Nexus Metro (~60)**. | Metro | Darwin + Nexus |
| 10 | **East Midlands** | Nottingham / Derby / Leicester. Own CA. NET tram in Nottingham. | NET | Darwin + NET |
| 11 | **West of England** | Bristol / Bath CA. | — | Darwin |
| 12 | **South Wales** | Cardiff + Core Valley Lines, TfW as the home operator culture. | Valley Lines / tram-train if in live data | Darwin |
| 13 | **Rest of Wales** | Same operator, different product density. Keep separate so Cardiff stays shippable. | — | Darwin |
| 14 | **Glasgow** | ScotRail-heavy, subway is extra. | SPT Subway | Darwin + Subway |
| 15 | **Edinburgh** | Second Scottish city, different commute. | Trams | Darwin + Edinburgh Trams |
| 16 | **Rest of Scotland** | One ScotRail residual, not 20 towns. | — | Darwin |
| 17 | **Residual England** | Everything else (East Anglia rural, Devon/Cornwall, Cumbria, Lincs, …) as one or two catch-alls until usage justifies a split. Solent / Thames Valley are the first ones to break out if testers appear. | — | Darwin |

**Not regions:** individual TOCs; NR Eastern / Southern / etc; Northern Ireland (separate stack, ~40 stations, Irish gauge).

**Agent / work split later:** one human or agent can own 1–3 adjacent regions (Luke-style). Do not give one owner all of (4) London & SE NR plus (3) London TfL plus residual.

### Launch order (current)

1. West Midlands (this brief)
2. Ellesmere Port corridor (this brief; later fold into Liverpool)
3. London TfL
4. Greater Manchester
5. Liverpool City Region (absorb EP)
6. Glasgow, West Yorkshire, North East (pick by testers / data pain)
7. The rest as above

---

## Sources

- ORR Table 6329 (31 Mar 2026): https://dataportal.orr.gov.uk/statistics/infrastructure-and-environment/rail-infrastructure-and-assets/table-6329-station-attributes-for-all-mainline-stations/
- TfWM new stations: https://www.tfwm.org.uk/campaigns/meet-your-new-stations/
- Metro current map: https://www.westmidlandsmetro.com/maps/
- Merseyrail map: https://www.merseyrail.org/journey-planning/plan-your-journey/network-map/
- Darwin: https://www.nationalrail.co.uk/developers/darwin-data-feeds/
- TfL API (region 3, not this sprint): https://tfl.gov.uk/info-for/open-data-users/
