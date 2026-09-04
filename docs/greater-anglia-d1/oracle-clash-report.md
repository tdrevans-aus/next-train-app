# Greater Anglia oracle clash report

**D1 status (2026-09-01):** National Rail region covering East Anglia and Essex (Norwich, Cambridge, Peterborough, Ipswich, Colchester, and 150+ additional stations). **Identified from Leftover England analysis** as a distinct, unbuilt region (see `docs/leftover-england-d1/oracle-clash-report.md`, line 25–29). Operator: **Greater Anglia** (East Anglia franchise, Stagecoach subsidiary, transferred to public sector 31 Aug 2024). Feed: National Rail GTFS via [Transitland](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/) (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`; verified 2026-09-01). Real-time: Darwin/OpenLDBWS via [Rail Data Marketplace](https://raildata.org.uk/) (subscription token `DARWIN_LDB_TOKEN`; **account-level blocker** — EvansAppStudio AU-registered, Tim re-registering with UK address, same pattern as every other UK region this wave).

## V1 scoping — National Rail only; Darwin account unblock required

**Greater Anglia scope assumption:** All walk-up National Rail regional/InterCity services (no compulsory reservation) at Greater Anglia's core network (Norwich, Cambridge, Peterborough, Ipswich, Colchester, and 150+ regional stations per franchise area). Greater Anglia offers no compulsory seat reservations; all services are walk-up boardable (optional reservation only; Electrostar trains have no reservation system at all). **Account-level blocker (not a feed problem):** DARWIN_LDB_TOKEN blocked at Tim's end — EvansAppStudio AU registration rejected by RDM geography gate. Tim re-registering with UK address (same unblock path as East Midlands, South Wales, other UK regions). Unblock required before wiring real-time departures.

**Through-running operators at Greater Anglia stations (boundary & shared-platform context):**
- **Thameslink** at Cambridge (CBG) and Peterborough (PBO): no compulsory reservations, open seating — `in`
- **LNER** at Peterborough: reserved-by-default policy (skip risk flagged; same policy question as London & South East oracle, line 128–129) — `in` pending operator confirmation
- **CrossCountry** at Peterborough/Ely corridor (Hereward Line): optional reservations only, walk-up boardable — `in`
- **East Midlands** at Peterborough (EMR services to Norwich/Liverpool direction): optional reservation policy, walk-up available — `in`
- **Liverpool Street (London & South East National Rail boundary):** Greater Anglia services calling at Liverpool Street are already documented in London & South East oracle (line 23 explicitly names Greater Anglia as separate region, line 152 marks Greater Anglia Liverpool Street services as `in`). Do not re-document Liverpool Street group; reference as boundary/through-running point only.

**V1 scope decision:** National Rail only (no buses, no feeder services, no tram). Exclude compulsory-reservation services (e.g., Caledonian Sleeper if any call at northern Greater Anglia stations — verify). **LNER at Peterborough flagged as skip risk** (same reserved-policy question as London & South East; requires operator confirmation whether one unreserved carriage = walk-up boardable or compulsory-default = out-reservation).

## Hub-lock & station-graph architecture

**Primary hub-lock: Norwich (NRW, CRS code)** — terminus for Greater Anglia's main East Anglia service corridor. Norwich is the geographic and operational terminus of the Great Eastern Main Line (London Liverpool Street–Norwich). Major interchange for regional services (Norwich–Cambridge, Norwich–Peterborough, Norwich–Great Yarmouth/Lowestoft branches).

**Secondary hubs (verified high-frequency stations):**
- **Cambridge (CBG):** Major interchange. Thameslink cross-London services call Cambridge; Greater Anglia regional services (Norwich–Cambridge, Cambridge–Ipswich, Cambridge–Peterborough). Second-tier hub status.
- **Ipswich (IPS):** Major station on Great Eastern Main Line (Liverpool Street–Norwich corridor). Services to London, Cambridge, Norwich, Peterborough. Second-tier hub status.
- **Peterborough (PBO):** East Anglia boundary station. Greater Anglia (Ely–Peterborough–Ipswich Hereward Line) meets LNER (East Coast Main Line to King's Cross), East Midlands (to Nottingham/Leicester), Thameslink (cross-London). **Through-running point, not merge** — services continue across boundary; no dedicated group required within this region (LNER and East Midlands are handled by their own regions' boundary/through-running rules).

**Single hub-lock model works here** (unlike London & South East multi-terminus problem). Norwich is a single terminus with one operator (Greater Anglia); all regional branches radiate from it. Secondary hubs (Cambridge, Ipswich, Peterborough) are through-routing stations on the main east-west/north-south corridors, not independent termini requiring separate boarding logic.

## Station name table (locks + known clashes)

| Published (D1) | Typical GTFS | Role | Class |
| --- | --- | --- | --- |
| **Norwich** | Norwich | Greater Anglia terminus; major hub for East Anglia corridor | **hub-lock** — interchange for Norwich–Cambridge, Norwich–Great Yarmouth, Norwich–Lowestoft branches |
| **Cambridge** | Cambridge | Great Eastern Main Line (Liverpool–Norwich); Thameslink cross-London; major regional interchange | **secondary hub** — Thameslink through-running point; no compulsory-reservation barrier |
| **Ipswich** | Ipswich | Great Eastern Main Line (Liverpool–Norwich); major East Anglia city station | **secondary hub** — through-running station on main corridor; no dedicated boundary handling needed |
| **Peterborough** | Peterborough | East Anglia/Midlands boundary. Greater Anglia Hereward Line (Ely–Peterborough–Ipswich); LNER (East Coast Main Line); East Midlands (to Nottingham); Thameslink (cross-London); CrossCountry (via Hereward Line) | **through-running point, not merge** — boundary station with East Midlands, LNER, Thameslink; services continue across regional boundary (handled by downstream regions' rules, not this region's responsibility) |
| **Colchester** | Colchester | Great Eastern Main Line (Liverpool–Norwich); East Anglia city station | Regional hub (third tier); no through-running to adjacent regions except Liverpool Street direction (London & South East boundary already documented) |
| **Ely** | Ely | Junction of Great Eastern Main Line (via Hereward Line) and Thameslink Cambridge branch; regional interchange | Regional junction station; Thameslink through-running point (no compulsory reservation) |
| **King's Lynn** | King's Lynn | West Anglia Main Line terminus (Cambridge–King's Lynn branch) | Branch terminus; regional services only |
| **Thetford, Diss, Wymondham, Great Yarmouth, Lowestoft** | Published name | Branch-line termini and junctions (Norwich–Great Yarmouth line, Norwich–Lowestoft line, Norwich–Cambridge line); regional services | Branch endpoints; no through-running to adjacent regions |
| **Stansted Airport, Bishops Stortford** | Stansted Airport, Bishops Stortford | West Anglia Main Line branch services (Liverpool Street–Stansted, Liverpool Street–Bishops Stortford); commuter/airport services | Secondary services; airport and regional stations; no dedicated cross-region boundary handling |

**~170 total stations** across Greater Anglia franchise area (per [Greater Anglia Wikipedia](https://en.wikipedia.org/wiki/Greater_Anglia)). D1 scope likely **30–50 major stations** including hub, secondary hubs, junctions, and branch termini (not all 170); confirm final selection with Luke at D1 pack stage.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (Greater Anglia primary operator + through-running operators at in-catalog stations):**

**Greater Anglia regional/InterCity services (all stations):** `in` (no compulsory reservations; walk-up boardable on all services; Electrostar trains have no reservation system; optional reservation only on InterCity stock)

**Through-running services at secondary hubs / boundary stations:**
- **Thameslink at Cambridge and Peterborough:** `in` (no reservations available; open seating; walk-up boardable)
- **CrossCountry at Peterborough/Ely (Hereward Line):** `in` (optional reservations only; walk-up boardable)
- **East Midlands at Peterborough:** `in` (optional reservations; walk-up boardable)
- **LNER at Peterborough:** `in` (reserved-by-default company policy; maintains one unreserved carriage per service but policy is compulsory-default; **skip risk flagged** — requires operator confirmation whether one unreserved carriage constitutes walk-up boardable [in] or compulsory-default [out-reservation] before D1 lock)

**No check-in barriers:** Platform access at all in-catalog Greater Anglia stations is unrestricted. Ticket checking is on-board by conductors or low-level gating (not airport-style). Walk-up boarding is unobstructed for all `in` services listed above.

**Liverpool Street (London & South East boundary, already documented):** Greater Anglia services at Liverpool Street calling from London & South East National Rail oracle (line 152, board eligibility table) are marked `in`. Do not re-document within this region's scope; reference as boundary point only.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Greater Anglia regional/InterCity (all services)** | Norwich, Cambridge, Ipswich, Colchester, Peterborough, Ely, King's Lynn, Thetford, Great Yarmouth, Lowestoft, Stansted Airport, Bishops Stortford, and 150+ regional stations | No (no compulsory reservations; Electrostar has no reservation system; optional only on InterCity stock) | No | `in` | [Greater Anglia travel information](https://www.greateranglia.co.uk/travel-information); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/) — Greater Anglia does not enforce seat reservations; walk-up available on all services |
| **Thameslink (Cambridge, Peterborough)** | Cambridge, Peterborough (Thameslink cross-London route via Ely/Cambridge branch) | No (no reservations available; open seating mandatory) | No | `in` | [Thameslink station information: Cambridge](https://www.thameslinkrailway.com/travel-information/station-information/CBG/cambridge); [RailUK Forums: Thameslink reservations](https://www.railforums.co.uk/threads/thameslink-seat-reservations.222628/) — no seat reservations offered; walk-up, first-come-first-served |
| **CrossCountry (Peterborough, Ely, via Hereward Line)** | Peterborough, Ely, intermediate stations on Hereward Line (Ely–Peterborough regional service) | No (optional only; walk-up available) | No | `in` | [CrossCountry seat reservations policy](https://www.crosscountrytrains.co.uk/); walk-up boardable; compulsory only on Birmingham–Wolverhampton service (not relevant to this region) |
| **East Midlands Railway (Peterborough)** | Peterborough (East Coast Main Line, Norwich–Liverpool direction; shared platform with Thameslink/LNER) | No (optional only; walk-up available) | No | `in` | [East Midlands Trains travel information](https://www.eastmidlandstrains.co.uk/); walk-up boarding available on regional services |
| **LNER (Peterborough only)** | Peterborough (East Coast Main Line, King's Cross direction; shared platform with Greater Anglia/Thameslink/East Midlands) | No (reserved-by-default, but an unreserved coach is always available and walk-up boarding is permitted — resolved 5 Sep 2026) | No | `in` | [LNER reservations policy](https://www.lner.co.uk/); [RailUK Forum: LNER mandatory reservations](https://www.railforums.co.uk/); **Verify whether one unreserved carriage = walk-up boardable (in) or compulsory-default = out-reservation before D1. Same skip risk as London & South East oracle (line 128–129).** |

**Board eligibility summary:** All Greater Anglia regional/InterCity services (no compulsory reservation) and through-running services at secondary hubs (Thameslink, CrossCountry, East Midlands) pass both boarding-contract tests at their respective in-catalog stations. LNER verdict **undecided** pending operator confirmation on unreserved-carriage walk-up policy (same issue as London & South East). **All verdicts recorded; no silent omissions.** Peterborough's through-running services (LNER, East Midlands) are marked undecided (LNER) or in (East Midlands, CrossCountry, Thameslink); the platform is shared but services are cross-regional — each service's verdict applies regardless of platform location.

## H2 / Adapter clash surface

**Static GTFS:** National Rail GTFS (Transitland `f-gc-rail~delivery~group~planar~gtfs`, CC-BY-2.0 UK) is production-ready. No key required. Updated ~14 days. All UK operators included; adapter filters to Greater Anglia agency ID and East Anglia region geography (Norwich, Cambridge, Peterborough, Ipswich, Colchester, and 150+ franchise stations).

**Real-time Darwin (OpenLDBWS):** Via Rail Data Marketplace. **Account-level blocker:** EvansAppStudio AU registration rejected by RDM geography gate. Tim re-registering with UK address (same process as other UK regions this wave). Once DARWIN_LDB_TOKEN provisioned, LDB Webservice JSON API is stable, covers all in-catalog Greater Anglia stations and through-running points, with ~1-minute latency.

**Adapter clash:**
1. **Hub-lock works:** Norwich is a clean single terminus with one operator (Greater Anglia). No multi-terminus complexity like London & South East.
2. **Secondary hubs as through-routing stations:** Cambridge, Ipswich, Peterborough are on main corridors, not independent termini. Boards at these stations must show all services passing through (Greater Anglia, Thameslink, CrossCountry, East Midlands, LNER if verdict resolved).
3. **Boundary/through-running handling:** Peterborough is an East Anglia/East Midlands/LNER boundary station. Services cross region boundaries; greater region's adapter must not filter out East Midlands or LNER services at Peterborough (those are handled by downstream regions' rules). **Flag for multi-region ledger at D2** (cross-regional services at shared platforms).
4. **Board eligibility filtering:** LNER at Peterborough: verdict resolved `in` on 5 Sep 2026 (see Verdict resolution below); the earlier exclusion rested only on the open verdict. East Midlands, CrossCountry, Thameslink pass both tests — include on boards.
5. **Real-time filtering complexity:** Darwin API returns all UK services; adapter must filter by:
   - **Greater Anglia agency** (primary filter)
   - **Station code (CRS)** — Norwich (NRW), Cambridge (CBG), Ipswich (IPS), Colchester (COL), Peterborough (PBO), Ely, King's Lynn, Thetford, etc.
   - **Exclude compulsory-reservation services** — none within Greater Anglia proper; LNER at Peterborough pending policy confirmation

**TOC agency filtering required:**
- **Greater Anglia:** agency "Greater Anglia" or equivalent GTFS agency_id
- **Thameslink / Great Northern / Southern / Gatwick Express (Greater Thameslink Railway as of 31 May 2026):** separate agencies; filter by station (Cambridge, Peterborough for Thameslink overlap)
- **CrossCountry, East Midlands, LNER:** through-running; filter by station code at boundary points (Peterborough for LNER/EMR, Ely/Peterborough for CrossCountry/Hereward Line)

**V1 scope decision (in vs. out):**
- **In:** Greater Anglia (all services), Thameslink (Cambridge, Peterborough), CrossCountry (Hereward Line), East Midlands (Peterborough shared platform)
- **Out:** LNER (reserved-default policy; skip risk pending operator confirmation) — may shift to `in` if operator confirms one unreserved carriage satisfies walk-up test
- **Undecided:** LNER until operator confirmation received

**Real-time endpoint (Darwin):**
- **LDB Webservice (JSON API):** `https://api.darwin.nationalrail.co.uk/api/v3/ldb/{crs}` (requires DARWIN_LDB_TOKEN, registered on RDM)
- **Covers:** All in-catalog Greater Anglia stations (OpenLDBWS covers entire GB network; adapter filters by station code: NRW, CBG, IPS, COL, PBO, etc.)
- **Latency:** ~1 minute (confirmed per South Wales oracle)
- **Station codes required:** NRW (Norwich), CBG (Cambridge), IPS (Ipswich), COL (Colchester), PBO (Peterborough), ELY, KLN (King's Lynn), TTF (Thetford), GYM (Great Yarmouth), LST (Lowestoft), SSD (Stansted Airport), BIS (Bishops Stortford), and others per final D1 scope selection

**TimeZone:** Europe/London (UTC±0, DST last Sunday March / October per UK rules)

## License

| field | value |
| --- | --- |
| **Static GTFS License name** | Creative Commons Attribution 2.0 England and Wales (CC-BY-2.0 UK) |
| **Redistribution / rehosting** | CC-BY-2.0 permits redistribution with attribution. Transitland feed is derived from Rail Delivery Group ATOC-CIF format and republished as GTFS. May be served to our users and passed to third parties with attribution statement. |
| **Commercial use** | Allowed under CC-BY-2.0. |
| **Attribution** | Data from Rail Delivery Group, Network Rail, National Rail Enquiries. Transitland feed attribution: "Data from [Transitland feed URL](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/)" or "National Rail GTFS via Transitland". |
| **Terms URL** | [Creative Commons CC-BY-2.0 UK Deed](https://creativecommons.org/licenses/by/2.0/uk/); [Transitland feed page: f-gc-rail~delivery~group~planar~gtfs](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/); [National Rail CIF/GTFS data source](https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/). |
| **Static GTFS Confidence** | **Clear** for license and redistribution (CC-BY-2.0 explicit, Transitland verified 2026-09-01). Feed is live and fetched regularly by Transitland. No key required for download. |
| **Real-time (Darwin) License name** | Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE) |
| **Real-time Redistribution / rehosting** | **Ambiguity flagged:** OGL 2.0 baseline permits redistribution with attribution. National Rail Enquiries amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in Tim's signed RDM Data Sharing Agreement. **Unclear whether we can relay Darwin departures to our own users via Next Train API.** |
| **Real-time Commercial use** | Allowed under OGL 2.0 baseline; RDM terms unclear. |
| **Real-time Attribution** | National Rail Enquiries (NRE), Darwin data source. Greater Anglia for train service operator branding. |
| **Real-time Terms URL** | [National Rail Developers: Darwin Data Feeds](https://www.nationalrail.co.uk/developers/darwin-data-feeds/); [Rail Data Marketplace](https://raildata.org.uk/); [OGL v2.0 Deed](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/); [RDM Platform Agreement template](https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer). |
| **Real-time Confidence** | **Unclear** on third-party rider redistribution (same ambiguity as London & South East, South Wales, East Midlands). Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers with UK address and receives DARWIN_LDB_TOKEN. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch. |
| **Keyed feeds** | DARWIN_LDB_TOKEN is a subscription token (OAuth2), not a secret API key; no HMAC or signature. Free tier: 100,000 calls/4-week railway period (public sector avoids overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration on Rail Data Marketplace before DARWIN_LDB_TOKEN can be provisioned. Do not wire this region's real-time path until token is live. |

## C2/C3 notes for Luke / Jim

1. **City identifier:** `city=greater-anglia` (kebab-case, matching London & South East regional naming convention — not `uk-greater-anglia`; this is a National Rail regional franchise, not country-level scope).

2. **Hub-lock:** Norwich (NRW, CRS code). Single-terminus model works here; no multi-hub complexity.

3. **Secondary hubs:** Cambridge (CBG), Ipswich (IPS) — through-routing stations on main corridors, not independent termini. Peterborough (PBO) is a boundary/through-running point (East Midlands, LNER, Thameslink also call; handled by downstream regions).

4. **Static GTFS:** Transitland `f-gc-rail~delivery~group~planar~gtfs` covers all GB National Rail. Adapter filters by:
   - **Greater Anglia agency_id** (primary)
   - **Geography:** Norwich, Cambridge, Ipswich, Colchester, Peterborough, Ely, King's Lynn, and 150+ franchise stations (confirm final D1 selection with Luke)
   - **Board eligibility:** Include Greater Anglia, Thameslink (Cambridge, Peterborough), CrossCountry (Hereward Line), East Midlands (Peterborough). LNER at Peterborough resolved `in` on 5 Sep 2026 (see Verdict resolution).

5. **Real-time (Darwin):** Account-level blocker must be unblocked first (Tim re-registering EvansAppStudio on RDM with UK address). Once DARWIN_LDB_TOKEN provisioned, use LDB Webservice JSON API for live departures. Filter by station code (CRS; NRW, CBG, IPS, COL, PBO, etc.). Latency ~1 minute. Note: Peterborough is shared with LNER/East Midlands; don't filter out through-running services.

6. **Board eligibility:** All Greater Anglia services pass both tests (no compulsory reservation). Thameslink, CrossCountry, East Midlands at shared platforms also pass. LNER at Peterborough is `in` — requires operator confirmation on unreserved-carriage walk-up policy before D1 lock (same skip risk as London & South East oracle, line 128–129).

7. **Through-running boundary handling:**
   - **Liverpool Street (London & South East boundary):** Already documented in London & South East oracle (line 23 names Greater Anglia as separate region, line 152 marks Greater Anglia at Liverpool Street as `in`). Do not re-document. Greater Anglia services from Liverpool Street are the London & South East region's responsibility; they don't re-enter this region's scope.
   - **Peterborough (East Midlands / LNER boundary):** East Midlands and LNER services call Peterborough; this region only includes Greater Anglia's Hereward Line (Ely–Peterborough–Ipswich) services at Peterborough. Flag for multi-region ledger at D2 (cross-regional shared platform deduplication).
   - **Cambridge (Thameslink cross-London boundary):** Thameslink passes through Cambridge on cross-London route; include on Cambridge boards (Thameslink services pass both tests). No deduplication needed within this region; Thameslink's cross-region path is handled at D2 ledger.

8. **Expected published-network.json scope:**
   - **Hub-lock:** Norwich (primary station group, all radiating services)
   - **Secondary stations:** Cambridge, Ipswich, Colchester, Peterborough (shared with East Midlands/LNER, marked as through-running point)
   - **Branch termini:** Great Yarmouth, Lowestoft, King's Lynn, Stansted Airport, Bishops Stortford, Thetford, etc.
   - **Station count:** Likely **30–50 major stations** in D1 scope (not all ~170 franchise stations). Confirm final selection with Luke at D1 pack stage.

9. **No real-time ambiguity for Greater Anglia proper,** but **Darwin license ambiguity applies** — same as other UK regions. Tim must review RDM Data Sharing Agreement once account is unblocked.

10. **Skip risk summary:**
    - **Darwin account-level blocker** (Tim re-registering, not a feed problem; same pattern as all other UK regions).
    - **LNER reserved-policy at Peterborough** (same skip risk as London & South East; requires operator confirmation before verdict locked).
    - **No other major skip risks identified.** Greater Anglia has no compulsory reservations; no gaps in real-time coverage (Darwin covers full network); static GTFS is live and updated regularly.

11. **Timezone:** Europe/London (UTC+0, DST last Sunday March / October per UK rules). Confirm Darwin timestamps are handled correctly.

12. **No live product flip until QA full pass.** Status stays **planned** until Mark's QA gate includes board-eligibility verdicts and adapter filtering matches them.

## What this region does not include

- **Buses, feeder services, tram, metro** — out of v1 scope (National Rail only)
- **Caledonian Sleeper, Night Riviera, other sleeper services** — if any call at northern Greater Anglia stations (King's Lynn, Norwich branches), they would be out-reservation (compulsory sleeping-car reservation); verify and exclude
- **Services with compulsory check-in barriers** — none identified within Greater Anglia scope
- **Liverpool Street–London direction services** — already documented in London & South East National Rail oracle; do not duplicate; reference as boundary point only

## References

- **Leftover England analysis:** docs/leftover-england-d1/oracle-clash-report.md (lines 25–29, identifies Greater Anglia as separate unbuilt region)
- **London & South East oracle:** docs/london-se-national-rail-d1/oracle-clash-report.md (line 23 names Greater Anglia as separate region; line 152 documents Greater Anglia at Liverpool Street as `in`)
- **South Wales oracle:** docs/south-wales-d1/oracle-clash-report.md (board eligibility section format example; Darwin license / RDM ambiguity parallel)
- **East Midlands oracle:** docs/east-midlands-d1/oracle-clash-report.md (Peterborough boundary context; through-running stations pattern)
- **Board eligibility rule:** docs/board-eligibility-rule.md (adopted 30 Aug 2026; verdict vocabulary and decision framework)
- **Transitland National Rail feed:** https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/ (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`; verified 2026-09-01)
- **Greater Anglia official:** https://www.greateranglia.co.uk/ (network map, station information, travel policy)
- **National Rail Darwin API:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/ (LDB Webservice documentation)
- **Rail Data Marketplace:** https://raildata.org.uk/ (DARWIN_LDB_TOKEN provisioning; platform agreement terms)

---

**Nico's final note on skip risks:** No major blockers identified beyond the account-level Darwin unblock (same pattern across all UK regions this wave) and the LNER reserved-policy question (same skip risk as London & South East; requires operator confirmation, not a feed problem). Static GTFS is live and verified. Regional scope is coherent (single operator, single terminus hub, clear boundaries with East Midlands/LNER at Peterborough and London & South East at Liverpool Street). This region is buildable once Darwin account is unblocked and LNER policy is confirmed.

### Verdict resolution — LNER at Peterborough (5 Sep 2026, Fable, top-level session)

The rows above previously marked undecided are resolved to **`in`**. LNER's own guidance: reservations are free and
recommended, but "unreserved seating is available in Coach C for standard class and Coach M for First
Class" on a first-come, first-served basis, and passengers without a reservation may board and stand —
there is no compulsory reservation and no check-in barrier. Evidence:
[LNER — Make a seat reservation](https://www.lner.co.uk/travel-information/make-a-reservation/) and
LNER's public reply on X (unreserved Coach C / Coach M). This matches the `in` verdict already recorded
for LNER at Leeds in `docs/west-yorkshire-d1/oracle-clash-report.md`, so the two regions are consistent
(a UK ledger item once one exists). Whether LNER services appear on Peterborough's board is therefore
governed only by this pack's `excludeOperators` boundary rule, not by eligibility.
