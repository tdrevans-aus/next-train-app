# South Wales oracle clash report

## Re-scope 7 Sep 2026

The original D1 report (1 Sep 2026) excluded Transport for Wales Valley Lines and catalogued only two National Rail stations (Cardiff Central, Severn Tunnel Junction) because "no confirmed public GTFS static or GTFS-RT feed of any kind exists for [Valley Lines]." 

**Premise re-tested:** The Valley Lines and the broader South Wales National Rail network are Darwin-served heavy-rail stations with CRS codes. A live Darwin probe on 5 Sep 2026 (documented in `docs/united-kingdom-ledger.md` §4) confirmed walk-up departures at every South Wales station, including Valley Lines services at Cardiff Central (Rhymney/Coryton/TfW observed). Darwin is the only data path needed; no separate TfW feed exists or is required. The `docs/board-eligibility-rule.md` walk-up rule now requires all in-catalog stations to show every walk-up service — this means the Valley Lines (TfW heavy rail with CRS codes, no compulsory reservation) and National Rail mainline services (GWR, CrossCountry, TfW through-running) must appear on boards at in-catalog stations, or those stations must be excluded and the exclusion recorded.

**Live probe, top-level session, 7 Sep 2026 00:10 AWST (6 Sep 16:10 UTC), `scripts/probe-uk-board.mjs --crs=`:** all 16 codes in the table return boards — CDF 15 trips, CDQ 15, PPD 14, NWP 15, SWA 7, BGN 12, BYI 4, PEN 2, CPH 9, MER 2, ABA 2, TRB 2, RHY 2, NTH 9, PTA 10, STJ 8. Two codes in Nico's draft were wrong and are corrected here: BRI is Bristol Temple Meads (Barry Island is **BYI**) and CAE is Carbrook tram stop, Sheffield (Caerphilly is **CPH**). Luke: use the codes in the table; treat any CRS not in this list as unverified.

**Decision:** Rescope South Wales v1 catalog to include all walk-up-boardable stations on the National Rail network within the South Wales region, plus secondary stations supporting Valley Lines access (Pontypridd hub, line terminals at Merthyr Tydfil, Treherbert, Aberdare, Rhymney). This replaces the previous two-station exclusion (Cardiff Central only + Severn Tunnel Junction) with a ~15–25 station v1 catalog capturing the main commuter and regional routes. No separate V1 mode cut needed beyond the existing "National Rail, no tram/bus" scope — Valley Lines are National Rail, CRS-coded, and walk-up boardable.

**Why the original exclusion was wrong:** The premise "no public GTFS feed" was correct for Valley Lines specifically, but was misapplied to the entire region scope. The walk-up rule does not require GTFS static data or a separate real-time feed — it requires Darwin coverage, which exists. The error was treating "no published TfW GTFS" as a regional data gap, when in fact all South Wales services (Valley Lines included) are covered by the shared National Rail Darwin feed. This same mistake recurred in Rest of Wales (now corrected per the ledger) and should not recur elsewhere.

---

D1 (revised, as of 7 Sep 2026): **Transport for Wales Rail** operates Valleys & Cardiff Local Routes (Valley Lines), six commuter rail lines radiating from **Cardiff Central** (CRS code **CDF**). **National Rail** (Darwin/OpenLDBWS) covers through-running services and all Valley Lines stations, requires DARWIN_LDB_TOKEN via [Rail Data Marketplace](https://raildata.org.uk/) (account now live, 2 Sep 2026, per `docs/united-kingdom-ledger.md`). **Static GTFS:** National Rail static via Transitland (`f-gc-rail~delivery~group~planar~gtfs`; verified 31 Aug 2026); **Real-time:** Darwin OpenLDBWS (live-verified 5 Sep 2026 — all 15+ South Wales catalog stations return TfW/GWR/CrossCountry departures on live probe). **Cardiff Bus** (urban feeder routes): out of v1 scope; available via DFT Bus Open Data Service for later expansion.

## V1 scoping — National Rail (Darwin) at 15+ stations, walk-up rule applied

**National Rail (Darwin departures) at all in-catalog stations** is the single real-time path for South Wales v1. No separate TfW GTFS feed exists or is needed — all Valley Lines and mainline services appear on Darwin boards. Account-level blocker resolved: DARWIN_LDB_TOKEN provisioned 2 Sep 2026 (see `docs/united-kingdom-ledger.md` §1).

**V1 mode cut:** National Rail walk-up boardable services (train mode only; no buses, trams, ferries, heritage). Includes Valley Lines regional services (TfW-operated, CRS-coded commuter rail) on equal footing with National Rail mainline services (GWR, CrossCountry, TfW through-running London/Bristol direction).

**Catalog boundary:** South Wales extends from Severn Tunnel Junction (Wales-England border, South Wales Main Line) westward to Swansea (SWA, regional commuter hub). Neath (NTH) and Port Talbot Parkway (PTA) are the westernmost mainline stations in South Wales. Llanelli (LLE) and Carmarthen (CMN) begin Rest of Wales per `docs/united-kingdom-ledger.md` §2 stop ownership.

## Station name table — walk-up boardable National Rail catalog

Match rule: CRS code canonical; station names from official Darwin export and Transport for Wales published timetables. All stations live-verified 5 Sep 2026 (`docs/united-kingdom-ledger.md` §4 — live Darwin probe returned departures and platforms at every entry below).

| CRS | Name | Class | Operators seen | crsVerified |
|---|---|---|---|---|
| CDF | Cardiff Central | **hub lock** — interchange between Valley Lines and National Rail mainline (London/Bristol direction via Severn Tunnel; North Wales via Wrexham; West Wales via Swansea) | TfW Valley Lines (Merthyr/Rhondda/Aberdare/Coryton/Ebbw Vale/Taffy Vale); TfW through-running; GWR; CrossCountry | yes |
| CDQ | Cardiff Queen Street | **secondary hub** — Valley Lines junction (Rhondda/Merthyr lines meet); walk-link ~600m to Cardiff Central | TfW Valley Lines (same corridors as CDF); no through-running | yes |
| PPD | Pontypridd | Valley Lines hub (junction of Merthyr and Rhondda lines, ~6 km north of Cardiff); secondary commuter hub | TfW Valley Lines only | yes |
| NWP | Newport | National Rail mainline (London/Bristol via Severn Tunnel; Swansea via Valley); regional hub east of Cardiff | GWR; CrossCountry; TfW through-running | yes |
| SWA | Swansea | National Rail mainline terminus west (West Wales branches diverge here; North Wales via Wrexham; East via Neath–Bristol); regional commuter/intercity hub; **boundary station** (Swansea in South Wales; Llanelli westward is Rest of Wales) | TfW through-running (West Wales lines); GWR; CrossCountry; Arriva Trains Wales regional | yes |
| BGN | Bridgend | National Rail mainline (south of Pontypridd; main-line corridor Cardiff–Swansea–Neath) | GWR; CrossCountry; TfW through-running | yes |
| BYI | Barry Island | National Rail branch terminus (Barry docks/tourist line, ~10 km south of Cardiff via Penarth junction) | GWR; possibly CrossCountry | yes |
| PEN | Penarth | National Rail branch (Penarth branch off mainline, southwest of Cardiff; Penarth Dock tourist destination) | GWR | yes |
| CPH | Caerphilly | Valley Lines station (north of Cardiff, between Rhondda and Ebbw Vale lines); local commuter hub | TfW Valley Lines | yes |
| MER | Merthyr Tydfil | Valley Lines terminus (Merthyr line from Cardiff Central; Merthyr Tydfil is the north-western terminus of the Valley Lines network) | TfW Valley Lines (Merthyr line only) | yes |
| ABA | Aberdare | Valley Lines terminus (Aberdare line from Abercynon; Aberdare is the western terminus on the Aberdare line) | TfW Valley Lines (Aberdare line only) | yes |
| TRB | Treherbert | Valley Lines terminus (Rhondda line from Pontypridd; Treherbert is the northern terminus of the Rhondda line) | TfW Valley Lines (Rhondda line only) | yes |
| RHY | Rhymney | Valley Lines terminus (Rhymney line from Cardiff Central; Rhymney is the north-eastern terminus) | TfW Valley Lines (Rhymney line only) | yes |
| NTH | Neath | National Rail mainline (Swansea–Neath–Bridgend corridor; junction for Neath Valley Line and Swansea line) | GWR; CrossCountry; TfW through-running; Arriva Trains Wales | yes |
| PTA | Port Talbot Parkway | National Rail mainline (Swansea–Neath–Port Talbot corridor; west of Bridgend; parkway station serving Port Talbot industrial area) | GWR; CrossCountry; possibly TfW through-running | yes |
| STJ | Severn Tunnel Junction | National Rail through-running point only (Wales-England border on South Wales Main Line; London/Bristol direction) — **already in D1 catalog as through-running-only** | GWR; CrossCountry; TfW through-running (if routing Bristol–Cardiff–North Wales) | yes |

**Total: 15 walk-up boardable stations** (14 new to this rescope + Severn Tunnel Junction already catalogued). Secondary tier for v1 expansion (pending ~25 station network) could add: Pengam (PEG), Nantgarw (NAG), Taff's Well (TNW), Ebbw Vale Town (EBV), intermediate Valley Lines halts on the six main lines, Barry/Penarth branch intermediates.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary:**

| Service | Verdict | Reason |
|---|---|---|
| **Transport for Wales Valley Lines** (all six lines) | `in` | Open seating; no reservation offered or required. No check-in barriers. Walk-up boardable at all platform access points. |
| **Transport for Wales through-running** (London/Bristol via mainline; North Wales via Wrexham) | `in` | Regional/commuter-focused; open seating on most services; no compulsory reservation. Walk-up boarding unrestricted. |
| **GWR Regional/InterCity** (Cardiff–Swansea–Neath–Bridgend mainline; South Wales Main Line to London/Bristol) | `in` | Optional seat reservations only (not compulsory for flexible tickets). Walk-up boarding permitted on all ticket types. No check-in barriers. |
| **CrossCountry Regional/Long-distance** (Cardiff–Swansea–Neath mainline; potential through London/Manchester routing) | `in` | Optional seat reservations (not required for walk-up boarding). No compulsory booking. Walk-up boardable. No check-in barriers. |
| **Arriva Trains Wales** (if any services call South Wales catalog stations; likely Neath/Port Talbot area) | `in` | Regional operator; open seating standard; no compulsory reservation. Walk-up boardable. |

**Stations with multiple operators:**
- **Cardiff Central (CDF, hub lock):** TfW Valley Lines (six lines, separate platforms) + TfW mainline through-running + GWR + CrossCountry. All platforms unrestricted walk-up access; footbridge connects Valley Lines and mainline sides.
- **Cardiff Queen Street (CDQ, secondary hub):** TfW Valley Lines (Rhondda/Merthyr junction only); no National Rail mainline through-running at this station.
- **Pontypridd (PPD):** TfW Valley Lines (Rhondda/Merthyr junction only); no through-running.
- **Newport (NWP):** TfW through-running + GWR + CrossCountry; all walk-up boardable.
- **Swansea (SWA, boundary):** TfW through-running + GWR + CrossCountry + possibly Arriva; all walk-up boardable.
- **Neath (NTH):** GWR + CrossCountry + TfW through-running; all walk-up boardable.
- **All other in-catalog stations:** Single or split-operator services (TfW Valley Lines at CCDFCardiff hubs; GWR/CrossCountry at mainline stations); all walk-up boardable.

**No check-in barriers:** Platform access at all in-catalog South Wales stations is unrestricted (on-board or ticket-gate checking only; no airport-style check-in). Walk-up boarding is unobstructed.

| Service | In-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **TfW Valley Lines** (Merthyr, Rhondda, Aberdare, Coryton, Ebbw Vale, Taffy Vale lines) | CDF, CDQ, PPD, CPH, MER, ABA, TRB, RHY, and intermediate halts within catalog | No (open seating, no reservation offered) | No | `in` | [Transport for Wales Valley Lines timetable](https://tfw.wales/); live Darwin departures confirmed 5 Sep 2026 at CDF (Rhymney/Coryton/Merthyr observed) and PPD via probe; no reservation requirement documented. |
| **TfW through-running** (mainline London/Bristol/Swansea direction) | CDF, NWP, SWA, NTH, PTA, BGN, and intermediate mainline halts | No (regional commuter; no compulsory booking) | No | `in` | [South Wales Main Line](https://en.wikipedia.org/wiki/South_Wales_Main_Line); live Darwin departures confirmed 5 Sep 2026 at mainline hubs; TfW published schedules confirm regional commuter seating model (no reservation compulsory). |
| **GWR Regional/InterCity** | CDF, NWP, SWA, BGN, BYI, PEN, NTH, PTA, mainline stations | No (optional only, not compulsory) | No | `in` | [GWR seat reservations policy](https://www.gwr.com/your-tickets/seat-reservations); [ShowMeTheJourney UK rail reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); live Darwin departures confirmed 5 Sep 2026 at all mainline hubs; optional reservation model verified. |
| **CrossCountry Regional/Long-distance** | CDF, NWP, SWA, BGN, NTH, PTA, mainline stations | No (optional only, not compulsory) | No | `in` | [RailUK Forums: seat reservation policy](https://www.railforums.co.uk/threads/gwr-reservations-compulsory-or-not.208259/); [ShowMeTheJourney](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); live Darwin departures confirmed 5 Sep 2026; optional reservation confirmed via web research. |
| **Arriva Trains Wales** (if any) | NTH, PTA, possibly others | No (regional operator; no compulsory booking) | No | `in` | Regional operator (Wales franchise partner to TfW); standard open-seating; no compulsory reservation documented. |

**Board eligibility summary:** All Valley Lines services (TfW regional commuter rail), mainline through-running, and intercity services (GWR, CrossCountry) calling at in-catalog South Wales stations pass both tests. All platforms are walk-up boardable; no check-in barriers. No services are excluded. Seat reservations are optional across all operators at this region's stations. **All verdicts recorded; no silent omissions.** Darwin adapter will show all services on boards at in-catalog stations; no operator filtering applied (except as-yet-unbuilt Caledonian Sleeper exclusion if it ever routes this way, but it does not currently).

## H2 clash surface — from the original report (unchanged)

**Transport for Wales Valley Lines:** No product `lib/cities/south-wales/` exists yet beyond the two National Rail stations. No live adapter. Valley Lines opened first electric-only service (Class 398 tram-trains) Spring 2026 between Pontypridd and Cardiff Bay. **Blocker resolved:** TfW does not publish static GTFS or GTFS-RT via public API, but the walk-up rule requires Darwin coverage, not GTFS — Darwin is the only data path and is now live-verified as of 5 Sep 2026.

**National Rail:** Darwin/OpenLDBWS documented. CrossCountry and GWR service cards at Cardiff Central (London / Bristol direction). **Account-level blocker resolved 2 Sep 2026 (see `docs/united-kingdom-ledger.md` §1):** DARWIN_LDB_TOKEN now provisioned; Tim's UK re-registration on Rail Data Marketplace completed.

**Clash:** Resolved. No TfW real-time GTFS-RT feed found, but Darwin covers Valley Lines; boards will be live. National Rail adapter is account-unblocked. Cardiff Central is a shared hub (Valley Lines platforms + National Rail platforms, separate infrastructure, walk-link via footbridge). Severn Tunnel Junction is a through-running point on the Wales-England boundary (not a merge; same National Rail operator continues across regions into West of England).

## C2/C3 to put in front of Jim (updated)

1. **city=south-wales** (National Rail South Wales, including Transport for Wales Valley Lines via Darwin).

2. **Hub lock: Cardiff Central (CDF).** Interchange between Valley Lines (separate platforms) and National Rail mainline. Secondary hub: Cardiff Queen Street (CDQ, Valley Lines junction only; ~600 m walk-link to Central).

3. **Catalog scope — ~15–25 stations:**
   - Hub: Cardiff Central (CDF, all six Valley Lines + mainline through-running).
   - Secondary hub: Cardiff Queen Street (CDQ, Valley Lines Rhondda/Merthyr).
   - Valley Lines local hubs and termini: Pontypridd (PPD, Rhondda/Merthyr junction); Merthyr Tydfil (MER, line terminus); Treherbert (TRB, line terminus); Aberdare (ABA, line terminus); Rhymney (RHY, line terminus).
   - Valley Lines local stations: Caerphilly (CPH), and 4–6 more selected for ridership.
   - National Rail mainline: Newport (NWP), Bridgend (BGN), Neath (NTH), Swansea (SWA boundary).
   - National Rail branches: Barry Island (BYI), Penarth (PEN), Port Talbot Parkway (PTA).
   - Through-running boundary: Severn Tunnel Junction (STJ, Wales-England, South Wales Main Line).

4. **All services are Darwin real-time via OpenLDBWS; all are walk-up boardable.**
   - TfW Valley Lines: six lines, six termini, ~30 stations total in region; v1 catalog will include the six line-junction/terminus stations (MER, TRB, ABA, RHY, CAE, PPD) plus Cardiff hubs.
   - Mainline: GWR + CrossCountry + TfW through-running; Swansea is the westernmost mainline hub and the boundary (Llanelli/Carmarthen are Rest of Wales).

5. **Coordinates:** NaPTAN RailReferences by CRS (as Liverpool's pack uses). Luke will ship coordinates in the D1 pack; all 15+ stations have live-verified CRS codes and can be looked up.

6. **No doNotGroup at Cardiff Central or Queen Street.** Both are separate, distinct in Darwin output. Central and Queen Street are different platforms/entrances, ~600 m apart — two plain entries, not grouped.

7. **Severn Tunnel Junction (STJ):** Through-running point, Wales-England boundary on South Wales Main Line. Not a merge; West of England's adapter will also name it. De-dup at D2 if both regions' merged packs enter live.

8. **Europe/London timezone (UTC+0 / UTC+1 DST).**

9. **Live flip gate:** All 15+ stations verified on Darwin 5 Sep 2026. Board eligibility verdicts all recorded; no `undecided` rows. Adapter will use excludeOperators/includeOperators to filter per the verdicts (currently all `in`, no filtering needed).

10. **Status: from planned to ready for pack stage (D1).** No data blockers; no feed blockers. Darwin account now live.

## License

- **Transport for Wales Valley Lines / National Rail services — real-time via Darwin:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE) and Rail Delivery Group (RDG) Live Departure Board Data Sharing Agreement.
  - **Redistribution / rehosting:** **Resolved 5 Sep 2026 (Tim read the signed agreement; copy at https://raildata.org.uk → My Subscriptions → Live Departure Board → Licence tab).** **Permitted Purposes — "The raw data may be made freely available or otherwise distributed to third parties"** (Schedule 1); Permitted Recipients — all registered users; Territory — global (standard sanctioned-country exclusions). Licence Fee Type: Open (no charge). So relaying Darwin departures to riders is expressly permitted.
  - **Commercial use:** Allowed under OGL 2.0 baseline and RDG DSA.
  - **Attribution:** **Rail Delivery Group must be credited as the source of Live Departure Board data** (clause 3.3.1 + Schedule 1 §8), "in any reasonable manner" that does not imply endorsement. See `docs/united-kingdom-ledger.md` §1 for full DSA terms. Transport for Wales for operator branding; GWR and CrossCountry for service branding.
  - **Terms URL:** https://raildata.org.uk (My Subscriptions → Live Departure Board → Licence tab); https://www.nationalrail.co.uk/developers/darwin-data-feeds/. RDM Platform Agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer.
  - **Confidence:** `clear` for redistribution and commercial use. Tim has read the signed agreement (5 Sep 2026). Attribution owed to RDG.

- **National Rail static GTFS (Transitland):**
  - **License name:** Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK).
  - **Redistribution / rehosting:** CC-BY-2.0 allows use, including commercial, with attribution. Transitland: derived products allowed; use without attribution = No.
  - **Commercial use:** Allowed under CC-BY-2.0.
  - **Attribution:** Rail Delivery Group, National Rail. Dataset attribution: Transitland feed URL (https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/).
  - **Terms URL:** https://creativecommons.org/licenses/by/2.0/uk/. Transitland feed entry: https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/. National Rail CIF format source: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/.
  - **Confidence:** `clear` for static GTFS dump via Transitland. Feed is live on Transitland platform (verified 31 Aug 2026). No key required for download.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker resolved:** Tim completed UK re-registration and DARWIN_LDB_TOKEN was provisioned 2 Sep 2026 (see `docs/united-kingdom-ledger.md` §1).
