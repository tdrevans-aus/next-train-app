# London & South East National Rail oracle clash report

**D1 status (published, as of 2026-09-01):** National Rail region covering Greater London and South East England (Kent, Surrey, Sussex, East Sussex, parts of Essex, East Anglia transitions to Greater Anglia region). Operator density is among the highest in the UK: multiple Train Operating Companies (TOCs) converge on central London, each with distinct termini and service patterns. **Critical design decision pending:** this region does not fit the single-hub-lock model used by previous cities. See "Hub-lock & station-graph architecture" section below.

## Scope: National Rail only (not TfL, not Elizabeth Line, not buses)

**In scope:**
- National Rail services (via Darwin/OpenLDBWS and GTFS static feed) calling at London termini and South East England stations
- TOCs: Southeastern, Greater Thameslink Railway (Thameslink, Great Northern, Southern, Gatwick Express), c2c, Greater Anglia, and through-running services (GWR, SWR, CrossCountry, LNER) that call at London stations
- All walk-up rail services (optional reservations allowed; compulsory reservations excluded per board-eligibility rule)

**Out of scope (already covered separately or excluded):**
- London TfL (Underground, DLR, Elizabeth Line/Crossrail) — already live in London city entry
- Transport for Wales Valley Lines — separate South Wales city entry (Cardiff Central hub)
- Buses, ferries, tram-trams
- Eurostar (check-in barrier barrier, out-checkin verdict)
- Sleeper services (Caledonian Sleeper, Night Riviera — compulsory reservation, out-reservation verdict)
- LNER services with compulsory reservations (LNER maintains one unreserved carriage per service, but policy is compulsory-default; flagged as skip risk pending operator confirmation)

**Regional boundaries & through-running:**
- **West of England / Thames Valley boundary:** GWR from Paddington westbound; SWR from Waterloo to Solent; CrossCountry through-running. Services continue across boundary; do not de-duplicate within this region (flag for D2 multi-region ledger if both regions enter app).
- **East Midlands boundary:** LNER from King's Cross northbound to Peterborough/East Midlands. Through-running operator; same boundary issue.
- **East of England / Greater Anglia boundary:** Greater Anglia services from Liverpool Street to East Anglia (Norwich, Cambridge, Peterborough). Separate region; services don't overlap into SE internally.

## Agency / feed / auth

| field | value |
| --- | --- |
| Region | London & South East National Rail (UK National Rail slice; geographic scope: Greater London, Kent, Surrey, Sussex, East Sussex, Essex margins, East Anglia transitions) |
| Primary agency | Rail Delivery Group (RDG) via National Rail Enquiries (NRE); Darwin data feeds |
| Constituent TOCs | **Primary**: Southeastern (180 stations), Greater Thameslink Railway as of 31 May 2026 (Thameslink, Great Northern, Southern, Gatwick Express — 238 stations), c2c, Greater Anglia. **Through-running**: GWR (Paddington hub), SWR (Waterloo hub), CrossCountry, LNER. |
| Static GTFS | [Transitland Onestop ID `f-gc-rail~delivery~group~planar~gtfs`](https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/) — National Rail GTFS covering all GB operators. No key required. Updated ~every 14 days. |
| Static GTFS URL | `https://www.transit.land/feeds/f-gc-rail~delivery~group~planar~gtfs/` (archived Transitland source); alternative: direct CIF→GTFS conversion via UK2GTFS. License: CC-BY-2.0 England & Wales (see License section). |
| Real-time API | **Darwin LDB Webservice (JSON API)** — live departures, platform numbers, delays, cancellations. Via [Rail Data Marketplace](https://raildata.org.uk/) (subscription-based, OAuth2 token `DARWIN_LDB_TOKEN`). Free tier: 100,000 calls/4-week railway period. Public sector: no overage charges. |
| Auth | **Account-level blocker (known, not a feed problem):** EvansAppStudio registered on Rail Data Marketplace with Australian company address. RDM geography-checks reject AU registrations for GB services. Tim re-registering with UK company address (same pattern as East Midlands, South Wales, other UK regions tonight per tracker notes). Unblock required before wiring adapters. |
| Darwin API docs | [National Rail Developers: Darwin Data Feeds](https://www.nationalrail.co.uk/developers/darwin-data-feeds/). LDB Webservice (public version, JSON API for live departure boards). Push feeds also available. Informal support via [Open Rail Data-Talk forum](https://openraildata-talk.org/). |
| v1 scope | **All walk-up National Rail regional/InterCity services** (no compulsory reservation) at London termini and South East England stations. **Excluded by boarding contract:** Eurostar (check-in barrier), Caledonian Sleeper & Night Riviera (compulsory sleeping-car reservation), LNER services (compulsory-default reservation policy, skip risk flagged below). **Excluded by mode:** buses, ferries. **Excluded by product/geography:** TfL services, Elizabeth Line (separate city). |
| Expected v1 TOC coverage | Southeastern, Thameslink, Great Northern, Southern (via Greater Thameslink Railway), c2c, Greater Anglia (regional services). GWR/SWR/CrossCountry through-running included if at London termini (walk-up test passes). LNER included with reservation-policy skip-risk note. |

## Hub-lock & station-graph architecture — **CRITICAL DESIGN DECISION PENDING**

**Problem:** This region does not fit the single-hub-lock model successfully used by previous cities (Copenhagen Kongens Nytorv, South Wales Cardiff Central, etc.). London has **14 distinct railway terminus stations**, each serving different TOCs and directional flows:

| Terminus | Primary TOC(s) | Direction | In-catalog D1? |
|---|---|---|---|
| **Waterloo** | South Western Railway | Southwest (Solent, West of England) | Likely |
| **Victoria** | Southern, Gatwick Express | South coast, Gatwick Airport | Likely |
| **London Bridge** | Southeastern, Southern, Thameslink | Kent/southeast, south coast, cross-London | Likely |
| **Liverpool Street** | Greater Anglia, c2c | East Anglia, Essex | Likely |
| **King's Cross / St Pancras** | Great Northern, Thameslink, LNER, Eurostar | North, cross-London, Europe | Likely |
| **Paddington** | Great Western Railway, Night Riviera Sleeper | Southwest, Wales | Likely |
| **Euston** | Regional services, Caledonian Sleeper | North (Scotland), Midlands, Wales | Possibly |
| Blackfriars, Cannon Street, Charing Cross, Farringdon, Fenchurch Street, Marylebone, Moorgate | Various (lower frequency) | Connector routes, regional services | TBD |

**Why single-hub doesn't work here:**
1. **No single station connects all (or even most) TOCs.** London Bridge comes closest (Southeastern, Southern, Thameslink), but Great Northern/Northern services run from King's Cross, GWR from Paddington, SWR from Waterloo.
2. **Termini are functionally distinct.** They're not alternate routes to the same place — they're genuinely different transport hubs with different onward connections. A rider at Waterloo can't "just hop on" a Southeastern train at London Bridge; they're separate destinations.
3. **Multi-operator platform separation is complex.** Unlike Copenhagen (where Kongens Nytorv is a physical station on all four Metro lines), London's termini are separate buildings. Thameslink's cross-platform at St Pancras Thameslink (below St Pancras International) is distinct from Great Northern platforms at King's Cross above-ground.
4. **Through-running services complicate regional boundaries.** GWR, SWR, CrossCountry, and LNER operate across multiple regions, not confined to L&SE.

**Recommended architecture (pending Luke/Jim/Tim design review):**

Option A: **Multi-hub approach — explicit station groups per terminus**
- Define each major terminus (Waterloo, Victoria, London Bridge, Liverpool Street, King's Cross, Paddington) as a **station group** or **zone** with its own filtering logic
- Each group gets a separate boarding engine (doNotGroup directives per terminus, similar to Copenhagen's multi-operator platforms)
- Advantages: Natural to how riders navigate London; models reality (you choose a terminus based on your direction)
- Disadvantages: Requires adapter code to handle 6+ station groups, not 1 hub

Option B: **London Bridge as primary hub-lock, others as secondary interchanges**
- Lock on London Bridge (central, connects Southeastern/Southern/Thameslink — three major TOCs)
- Acknowledge that King's Cross, Victoria, Waterloo are secondary hubs with different operator sets
- Advantage: Simpler adapter code (one lock-point); captures central-London commuting spike
- Disadvantage: Ignores that King's Cross and Paddington are equally important for northern/western services; feels incomplete

Option C: **No hub-lock; region as a flat, operator-filtered network**
- Treat the entire L&SE region as a single flat network with no hub-lock
- Adapter filters by TOC and station (no hub-lock funneling)
- Advantage: Most honest to the actual service topology
- Disadvantage: Breaks the hub-lock pattern used elsewhere; may require rethinking how regional boundaries are managed

**My recommendation:** Option A (multi-hub, explicit station groups per terminus) is most honest to the London network and most useful to riders. Option B (London Bridge hub-lock) would work but is incomplete. Option C (flat network) is feasible but diverges from the pattern.

**This section requires Tim/Luke/Jim decision before D1 pack or adapter work proceeds.** Do not force a single hub-lock onto a polyglot region.

## Station name table (locks + known clashes) — *Deferred pending architecture decision*

**Will be populated once hub-lock / station-graph approach is decided.** Expected primary stations:

| Published (D1) | Typical GTFS | Role | Class |
| --- | --- | --- | --- |
| **London Waterloo** | London, Waterloo | SWR terminus (southwest, Solent) | Major hub candidate |
| **London Victoria** | London, Victoria | Southern, Gatwick Express hub (south coast, airport) | Major hub candidate |
| **London Bridge** | London, London Bridge | Southeastern/Southern/Thameslink hub (southeast, cross-London) | **Most central; Option B candidate** |
| **Liverpool Street** | London, Liverpool Street | Greater Anglia, c2c hub (East Anglia, Essex) | Regional hub |
| **London King's Cross** | London, King's Cross | Great Northern hub (north via ECML) | Major hub candidate |
| **St Pancras International** | London, St Pancras International (or King's Cross St Pancras) | Thameslink, LNER, Eurostar (cross-London, north, Europe) | Major hub; Eurostar out-checkin |
| **London Paddington** | London, Paddington | GWR hub (southwest via GWML), Night Riviera Sleeper | Major hub; sleeper out-reservation |
| **London Euston** | London, Euston | Regional services, Caledonian Sleeper (north, Scotland) | Secondary; sleeper out-reservation |
| **Blackfriars** | London, Blackfriars | Thameslink (cross-London, secondary hub) | Secondary |
| **Farringdon** | London, Farringdon | Thameslink, Circle Line interchange (cross-London, secondary hub) | Secondary |
| Other 4 termini (Cannon Street, Charing Cross, Fenchurch Street, Marylebone, Moorgate) | London, [Name] | Connector routes, regional services | Lower frequency; may be out-of-scope D1 |

**All London terminus names subject to GTFS stop_name exact match at D1 pack time.**

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail services only; TfL/buses/sleepers noted separately):**

All **walk-up National Rail regional and InterCity services** (optional reservation only, not compulsory) at London termini and South East England stations: `in`
- Southeastern (South Eastern Main Line, Chatham Main Line, domestic HS1 services)
- Thameslink (cross-London services, regional)
- Great Northern (King's Cross to north, regional)
- Southern (Victoria/London Bridge to south coast, regional)
- Gatwick Express (Victoria to Gatwick Airport)
- c2c (Essex routes)
- Greater Anglia (Liverpool Street to East Anglia, regional)
- Great Western Railway (Paddington westbound, optional reservation only on InterCity)
- South Western Railway (Waterloo southwest, optional reservation only on regional/InterCity)
- CrossCountry (through-running services, optional reservation only)

**Services excluded by boarding contract:**
- **Eurostar (London St Pancras International):** `out-checkin` — Compulsory 45-minute pre-departure check-in at Eurostar Channel Terminal (airport-style border/security/luggage screening). International service, not included in v1 scope by design.
- **Caledonian Sleeper (London Euston to Scotland):** `out-reservation` — Compulsory reservation for sleeping cars (berths, compartments). Seated accommodation available; check source on whether seated cars are unreserved walk-up or also require reservation. High skip risk; verify operator booking policy.
- **Night Riviera Sleeper (London Paddington to Penzance):** `out-reservation` — Compulsory reservation for sleeping cars. Seated accommodation available (check: walk-up boardable or also reserved?). High skip risk; verify with GWR.

**LNER (London North Eastern Railway) — reserved-by-default policy, skip risk:**
- LNER operates King's Cross to north and maintains one unreserved carriage per service (per rail forums), but **company policy is "mandatory reservations"** as stated in reservation policy comparisons. Verdict depends on whether one unreserved carriage = walk-up boardable (`in`) or whether "mandatory default" = `out-reservation` despite availability. **This requires operator confirmation before D1 pack. Flagged as skip risk below.**

**TfL services at London stations (out of scope):**
- Elizabeth Line / Crossrail: separate product (TfL city), out-of-scope for National Rail region
- London Underground services at interchange stations (e.g., at King's Cross St Pancras): TfL product, not National Rail

**Stations with overlapping National Rail services (multi-operator platforms):**
- **London Bridge (Southeastern, Southern, Thameslink):** Three operators, separate platforms (networks). Boards must show all three per boarding-contract test.
- **Liverpool Street (Greater Anglia, c2c):** Two operators.
- **King's Cross / St Pancras (Great Northern, Thameslink, LNER at King's Cross above; Thameslink at St Pancras Thameslink below; Eurostar at St Pancras International):** Multiple operators, multiple physical stations. Separate platform groups required.
- **Paddington (GWR, Night Riviera Sleeper):** Two services (GWR regional/InterCity `in`, sleeper `out-reservation`).
- **Waterloo, Victoria, Euston, and others:** Typically single or dual operator at each.

**No check-in barriers (except Eurostar):** Platform access at all National Rail stations is unrestricted. Ticket checking is on-board by conductors or low-level gating (not airport-style). Walk-up boarding is unobstructed for all `in` services listed above. Eurostar exception: border control + security + luggage screening in dedicated channel before train departure (airport-style).

| Service | Calls at in-catalog London stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **Southeastern (South Eastern Main Line, Chatham Main Line, HS1 domestic)** | London Bridge, Cannon Street, Charing Cross, plus South East England stations | No (optional only, not compulsory) | No | `in` | [Southeastern seat reservations](https://www.southeasternrailway.co.uk/); [ShowMeTheJourney: UK rail seat reservations](https://showmethejourney.com/train-ticket-guides/seat-reservations-when-booking-online/); walk-up boardable on most services |
| **Thameslink (cross-London, regional services via St Pancras, Farringdon, Blackfriars, London Bridge)** | St Pancras Thameslink, Farringdon, Blackfriars, London Bridge, City Thameslink | No (optional, not compulsory; open seating on most services) | No | `in` | [Thameslink live service info](https://www.greaterthameslink.com/); [FIPGuide: Govia Thameslink Railway](https://www.fipguide.org/en/operator/govia-thameslink-railway/); walk-up, no reserved seats typical |
| **Great Northern (King's Cross to north)** | King's Cross, Moorgate, plus north England stations | No (optional only, not compulsory; open seating) | No | `in` | [Great Northern station info](https://www.greaterthameslink.com/); walk-up boarding |
| **Southern (Victoria, London Bridge to south coast)** | Victoria, London Bridge, plus South East England stations | No (optional only, not compulsory) | No | `in` | [Southern seat reservations](https://www.greaterthameslink.com/); optional only on most services |
| **Gatwick Express (Victoria to Gatwick Airport)** | Victoria | No (optional, not compulsory; walk-up available) | No | `in` | [Gatwick Express](https://www.gatwickexpress.com/); walk-up boarding available |
| **c2c (Essex routes from London)** | Liverpool Street, Fenchurch Street, plus Essex stations | No (optional, not compulsory) | No | `in` | [c2c seat reservations](https://www.c2c-online.co.uk/); walk-up available |
| **Greater Anglia (Liverpool Street to East Anglia)** | Liverpool Street, plus East Anglia stations | No (optional only, not compulsory; open seating typical) | No | `in` | [Greater Anglia travel info](https://www.greateranglia.co.uk/); walk-up boarding |
| **Great Western Railway (Paddington to southwest)** | Paddington, plus Southwest/Wales stations | No (optional only on regional/InterCity; not compulsory) | No | `in` | [GWR seat reservations](https://www.gwr.com/your-tickets/seat-reservations); walk-up available on flexible/Anytime tickets |
| **South Western Railway (Waterloo to southwest)** | Waterloo, plus Solent/Southwest stations | No (optional only, not compulsory) | No | `in` | [SWR travel info](https://www.southwesternrailway.com/); walk-up boarding on regional/InterCity |
| **CrossCountry (through-running services)** | London (route-dependent; some call at King's Cross, Liverpool Street, or other termini) | No (optional only, not compulsory) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/); walk-up available |
| **LNER (King's Cross to north)** | King's Cross, plus East Midlands/North England stations | **Yes (compulsory default policy, BUT one unreserved carriage maintained per service; SKIP RISK)** | No | `undecided` | [LNER reservations policy](https://www.lner.co.uk/); [RailUK Forum: LNER mandatory reservations](https://www.railforums.co.uk/); **Verify whether one unreserved carriage = walk-up boardable (in) or compulsory-default = out-reservation before D1.** |
| **Caledonian Sleeper (London Euston to Scotland)** | London Euston, plus Scotland stations | Yes (compulsory for sleeping cars; verify seated accommodation) | No | `out-reservation` | [Caledonian Sleeper booking](https://www.sleeper.scot/); [ShowMeTheJourney: Caledonian Sleeper](https://showmethejourney.com/travel-on/train/155-caledonian-sleeper-uk/); compulsory sleeper reservation, booked 12 weeks ahead. **Verify whether seated cars require reservation or are walk-up unreserved.** |
| **Night Riviera Sleeper (London Paddington to Penzance)** | London Paddington, plus Southwest/Cornwall stations | Yes (compulsory for sleeping cars; verify seated accommodation) | No | `out-reservation` | [Night Riviera (GWR)](https://www.gwr.com/travelling-with-us/night-riviera-sleeper/); [Eurail: Night Riviera Sleeper](https://www.eurail.com/en/plan-your-trip/trip-ideas/trains-europe/night-trains/night-riviera-sleeper); compulsory sleeper reservation, bookable 3 months ahead. **Verify whether seated cars require reservation or are walk-up unreserved.** |
| **Eurostar (London St Pancras International to Paris/Brussels)** | London St Pancras International | N/A (international, check-in barrier applies first) | **Yes (compulsory pre-departure check-in at Eurostar Channel Terminal, 45 min before departure; airport-style border/security/luggage screening)** | `out-checkin` | [Eurostar check-in requirements](https://help.eurostar.com/faq/uk-en/question/What-do-I-need-to-do-at-security-checks-when-travelling-to-from-London/); [London St Pancras Eurostar station](https://www.eurostar.com/uk-en/travel-info/your-trip/stations/london-st-pancras-international); international service, not walk-up boardable by design |

**Board eligibility summary:** All walk-up National Rail regional/InterCity services (Southeastern, Thameslink, Great Northern, Southern, Gatwick Express, c2c, Greater Anglia, GWR, SWR, CrossCountry) pass both boarding-contract tests at their respective in-catalog London termini and South East stations. LNER verdict **undecided** pending operator confirmation on unreserved-carriage walk-up policy. Caledonian Sleeper and Night Riviera fail test 1 (compulsory sleeping-car reservation; seated accommodation policy unclear — **skip risk**). Eurostar fails test 2 (check-in barrier, international check-in requirement). **All verdicts recorded; no silent omissions.** LNER, Caledonian Sleeper, and Night Riviera require operator confirmation before final verdicts can be locked.

## H2 / Adapter clash surface

**Static GTFS:** National Rail GTFS (Transitland `f-gc-rail~delivery~group~planar~gtfs`, CC-BY-2.0 UK) is production-ready. No key required. Updated ~14 days. All UK operators included; adapter filters to L&SE region TOCs.

**Real-time Darwin (OpenLDBWS):** Via Rail Data Marketplace. Account-level blocker: EvansAppStudio AU registration rejected by RDM geography gate. Tim re-registering with UK address (same process as other UK regions). Once DARWIN_LDB_TOKEN provisioned, LDB Webservice JSON API is stable, covers all London termini and South East stations, with ~1-minute latency confirmed.

**Architecture clash:**
1. **Hub-lock decision pending** — single hub-lock doesn't fit London's multi-terminus topology. See "Hub-lock & station-graph architecture" section above. Adapter design contingent on that decision (Option A multi-hub, Option B London Bridge primary, or Option C flat network).
2. **Multi-operator platform separation** — Unlike Copenhagen (one metro system, four lines at one station), London has 6+ independent terminus buildings and operators. Requires explicit station-group definitions and doNotGroup directives per terminus.
3. **Through-running boundary handling** — GWR (Paddington), SWR (Waterloo), CrossCountry, LNER cross regional boundaries. Services are **not** duplicated within L&SE; they're flagged for multi-region ledger deduplication at D2.
4. **Real-time filtering complexity** — Darwin API returns all UK services; adapter must filter by TOC and station (London termini + South East region). No pre-filtering in feed.
5. **Board eligibility filtering — reserved-by-default operators** — LNER (reserved-default but one unreserved carriage), Caledonian Sleeper, Night Riviera must be explicitly excluded or marked undecided pending operator confirmation.

**TOC agency filtering required:**
- Filter GTFS static `routes.txt` by agency_id (each TOC is separate agency)
- Southeastern: agency "Southeastern Railway" or equivalent
- Greater Thameslink Railway (as of 31 May 2026): separate agencies for Thameslink, Great Northern, Southern, Gatwick Express
- c2c: agency "c2c Railway Company"
- Greater Anglia: agency "Greater Anglia"
- Through-running (GWR, SWR, CrossCountry, LNER): filter by route; exclude services marked "out-reservation" or "out-checkin"

**v1 scope decision (in vs. out):**
- **In:** Southeastern, Thameslink, Great Northern, Southern, Gatwick Express, c2c, Greater Anglia, GWR (walk-up regional/InterCity), SWR (walk-up regional/InterCity), CrossCountry (walk-up services)
- **Out:** LNER (reserved-default policy; skip risk), Eurostar (check-in barrier), Caledonian Sleeper (compulsory reservation), Night Riviera (compulsory reservation)
- **Undecided:** LNER pending operator confirmation on unreserved-carriage walk-up eligibility; Caledonian Sleeper and Night Riviera seated accommodation policy pending operator confirmation

**Real-time endpoint (Darwin):**
- **LDB Webservice (JSON API):** `https://api.darwin.nationalrail.co.uk/api/v3/ldb/{crs}` (requires DARWIN_LDB_TOKEN, registered on RDM)
- **Covers:** All London termini and South East stations (OpenLDBWS covers entire GB network; adapter filters by station code or geographic region)
- **Latency:** ~1 minute (confirmed per South Wales oracle report note)
- **Alternative:** Darwin Timetable Push Feed (XML) if latency is critical

**TimeZone:** Europe/London (UTC±0, DST last Sunday March / October)

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
| **Real-time Attribution** | National Rail Enquiries (NRE), Darwin data source. Train Operating Company attribution per service (Southeastern, Greater Thameslink Railway, c2c, Greater Anglia, GWR, SWR, CrossCountry, LNER as applicable). |
| **Real-time Terms URL** | [National Rail Developers: Darwin Data Feeds](https://www.nationalrail.co.uk/developers/darwin-data-feeds/); [Rail Data Marketplace](https://raildata.org.uk/); [OGL v2.0 Deed](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/); [RDM Platform Agreement template](https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer). |
| **Real-time Confidence** | **Unclear** on third-party rider redistribution. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers with UK address and receives DARWIN_LDB_TOKEN. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch. Account-level blocker must be unblocked first. |
| **Keyed feeds** | DARWIN_LDB_TOKEN is a subscription token (OAuth2), not a secret API key; no HMAC or signature. Free tier: 100,000 calls/4-week railway period (public sector avoids overage charges). Subscription terms govern API use, not a separate data license. **Account-level blocker:** Tim must complete UK re-registration on Rail Data Marketplace before DARWIN_LDB_TOKEN can be provisioned. Do not wire this region's real-time path until token is live. |

## C2/C3 notes for Luke / Jim

1. **Hub-lock & station-graph architecture decision required before D1 pack or adapter work.** See "Hub-lock & station-graph architecture" section above. This region does not fit the single-hub model. Recommend Tim review Options A/B/C and confirm approach before Luke / Jim proceed. Expected decision: Option A (multi-hub, explicit station groups per terminus) or Option B (London Bridge as primary hub with secondary interchange notes).

2. **City identifier:** Likely `city=london-se-national-rail` or `city=london-national-rail` (pending naming convention; not `uk-national-rail` as this is a regional slice, not national scope). Or split by TOC/terminus if multi-hub approach taken.

3. **Static GTFS:** Transitland `f-gc-rail~delivery~group~planar~gtfs` covers all GB National Rail. Adapter filters by:
   - **TOC agencies:** Southeastern, Greater Thameslink Railway (Thameslink, Great Northern, Southern, Gatwick Express agencies), c2c, Greater Anglia, GWR, SWR, CrossCountry, LNER (if LNER reserved-policy resolved)
   - **Geography:** London termini (Waterloo, Victoria, London Bridge, Liverpool Street, King's Cross, St Pancras, Paddington, Euston, Blackfriars, Farringdon, and regional South East stations)
   - **Board eligibility:** Exclude Eurostar (out-checkin), Caledonian Sleeper (out-reservation), Night Riviera (out-reservation), LNER (reserved-default, skip risk), other compulsory-reservation services

4. **Real-time (Darwin):** Account-level blocker must be unblocked first (Tim re-registering EvansAppStudio on RDM with UK address). Once DARWIN_LDB_TOKEN provisioned, use LDB Webservice JSON API for live departures. Filter by station code (CRS; London termini: WAT, VIC, LBG, LST, KGX, STP, PAD, EUS, BFK, FRD, etc.). Latency ~1 minute.

5. **Multi-terminus platform separation:** Unlike Copenhagen (one Metro, one station Kongens Nytorv, four lines), each London terminus is a separate building and operator set. **Do not fold different termini into a single hub-lock.** Implement per-terminus boarding logic.
   - **Waterloo:** SWR services
   - **Victoria:** Southern, Gatwick Express
   - **London Bridge:** Southeastern, Southern, Thameslink (requires doNotGroup: three operator sections, separate platform logic)
   - **Liverpool Street:** Greater Anglia, c2c (dual operator)
   - **King's Cross:** Great Northern (above-ground), Moorgate branch
   - **St Pancras International:** Thameslink (below-ground at St Pancras Thameslink), Eurostar (above-ground, out-checkin)
   - **Paddington:** GWR, Night Riviera Sleeper (out-reservation)
   - **Euston:** Regional services, Caledonian Sleeper (out-reservation)
   - Other termini: lower frequency, may be secondary in D1 scope.

6. **Through-running operators (boundary handling):**
   - **GWR (Paddington westbound):** Boundary with West of England region. Services continue across boundary; do not duplicate. Flag for D2 multi-region ledger.
   - **SWR (Waterloo southwest):** Boundary with West of England / Solent region. Same boundary handling.
   - **CrossCountry:** Multiple regions (through-running nationwide). Flag for D2 ledger.
   - **LNER (King's Cross northbound):** Boundary with East Midlands / North region. Same boundary handling.

7. **Skip risks (board eligibility):**
   - **LNER reserved-default policy:** Confirm with operator whether one unreserved carriage = walk-up boardable (in) or compulsory-default = out-reservation (out). Policy sources conflict; operator confirmation required before verdict locked.
   - **Caledonian Sleeper & Night Riviera seated accommodation:** Verify whether seated/non-sleeping cars on these services are walk-up unreserved or also require reservation. If unreserved, separate them from sleeper cars in boarding logic. If all require reservation, entire service is out-reservation.
   - **Darwin real-time coverage:** Confirm LDB Webservice returns live departures for all 6+ London termini without degradation. Verify that filtering by CRS codes (station codes) captures all in-scope stations.
   - **LNER GTFS routing:** LNER operates King's Cross to north (East Coast Main Line). Confirm that GTFS static feed includes LNER routes and that agency filtering in adapter correctly isolates them.

8. **Expected published-network.json scope (pending hub-lock decision):**
   - **If Option A (multi-hub):** Separate station arrays for each terminus + South East England regional stations. No single published-network.json; multiple zone/group definitions.
   - **If Option B (London Bridge hub-lock):** London Bridge primary hub (Southeastern, Southern, Thameslink), plus secondary stations at other termini and South East region.
   - Station counts: Southeastern operates 180 stations (full franchise), Greater Thameslink 238 stations (Thameslink, Great Northern, Southern, Gatwick Express combined). D1 scope likely **50–100 major stations** (London termini + key South East stations), not all 418.

9. **Real-time filtering:** Darwin API requires filtering by CRS code (station code) and TOC. London termini CRS codes: WAT, VIC, LBG, LST, KGX, STP, PAD, EUS, BFK, FRD, CST, CHX, FST, MYB, MGT (examples). Adapter must either:
   - Query Darwin API for each major station separately, or
   - Use Darwin Push Feed (XML) and filter by station/TOC on ingestion

10. **Timezone:** Europe/London (UTC+0, DST last Sunday March / October per UK rules). Confirm all adapters use this TZ, not UTC.

11. **No live product flip until QA full pass.** Status stays **planned** until Mark's QA gate includes board-eligibility verdicts and adapter filtering matches them.

## What I did not do

No line-map generation, no station hand-transcription, no GTFS direct station array population, no live city flip, no adapter code, no Darwin real-time testing, no multi-region ledger creation, no GitHub PR, no account re-registration testing, no DST deep-dive on Darwin timestamps.

**Hub-lock architecture decision is the blocking issue.** This section requires Tim / Luke / Jim review before D1 pack or adapter work can proceed with confidence.
