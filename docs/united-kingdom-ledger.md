# United Kingdom country ledger

**Written by:** Nico, country-lane retrofit · **Date:** 5 Sep 2026
**Spec:** `docs/country-lane.md` · **Brief:** `docs/nico-brief-uk-country-lane.md`
**Trigger:** both — Darwin is a national feed (trigger 1) and UK regions physically/operationally
overlap (trigger 2). Full pass, not a light pass.
**Status:** Northern Ireland out of scope entirely (see §1). Twenty GB regions registered in
`lib/providers/registry.js` as of this write (5 live, 14 planned, `uk-london-tfl` live and
out-of-Darwin as its own network). `leftover-england` was researched and explicitly rejected as
a buildable region (`docs/leftover-england-d1/oracle-clash-report.md`) — no registry entry, no
D1 pack, not carried in this ledger's stop-ownership table except where its research surfaced a
boundary fact also confirmed elsewhere.

---

## 1. Provider decision

**One shared Darwin provider for all National Rail regions.** `lib/providers/uk-darwin.js` is the
single adapter (SOAP was tried and abandoned 30 Aug–1 Sep 2026 as unusable against RDM-issued
keys; the production path, rewritten 2 Sep 2026, is a REST/JSON wrapper on Rail Data Marketplace's
own gateway — `https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120`,
auth via `x-apikey` header, not a SOAP element). Every National Rail region — currently 18 of the
20 registered GB regions, all sharing `lib/providers/uk/catalog.js`'s allow-list-and-region-config
pattern — is a config over this one adapter (CRS allow-list + direction model + optional
`excludeOperators`/`includeOperators`), never a fork. This has held without exception across every
region packed so far (confirmed explicitly in each region's registry `notes`: east-midlands,
south-yorkshire, north-east, west-of-england, southwest, cumbria, south-wales, west-yorkshire,
rest-of-wales, rest-of-scotland, london-se-national-rail, glasgow, edinburgh, solent, thames-valley,
greater-manchester, liverpool-city-region, greater-anglia, plus uk-west-midlands's National Rail
half). Darwin covers **all TOCs, including concessions** — this was gotten wrong once (Liverpool
City Region's original pack treated Merseyrail as a metro system with "no feed"; corrected 4 Sep
2026, `docs/jim-brief-liverpool-merseyrail-via-darwin.md` — Merseyrail is a National Rail
concession and its stations return live Darwin boards like any other TOC's). Any future region
build should assume Darwin covers a TOC/concession until proven otherwise, not the reverse.

`uk-london-tfl` is **not** part of this Darwin pattern and stays its own provider/city: TfL Unified
API, `TFL_APP_KEY`, rail modes only (Tube, Elizabeth line, DLR, Overground, Trams). No Darwin call
happens for London TfL; Darwin does separately carry National Rail services that also call at
London termini (handled inside `london-se-national-rail`, a different region id).

**Auth and licensing.** `DARWIN_LDB_TOKEN` (Rail Data Marketplace Consumer key, "LDB Webservice"
product) has been live since 2 Sep 2026 — this closes the "account-level blocker" language that
still appears verbatim in the `integration` string of every region that hasn't had a follow-up
pass since (south-yorkshire, north-east, southwest, cumbria, south-wales, west-yorkshire,
rest-of-wales, rest-of-scotland, london-se-national-rail, glasgow, edinburgh, greater-manchester —
12 of 20 regions). **This is a stale-text problem, not a live blocker** — flagged once here per
`docs/uk-build-out-recommendation.md` item 4, not re-flagged per region. **Standing open item,
recorded once here as the single source (region packs should cite this ledger, not repeat the
question):** whether OpenLDBWS/RDM redistribution terms to third-party riders are confirmed
against the signed Rail Data Marketplace Data Sharing Agreement is **unknown** — every region pack
that reached D1 after 2 Sep 2026 repeats "do not relay Darwin data to end users until Tim confirms"
as an open item; no pack or registry note records that confirmation having happened. Do not treat
silence on this item as resolution.

**A second, separate cost/architecture gap, not a licensing question:** the 15–30s server-side
`(crs, filterCrs)` cache specified in `docs/uk-architecture.md` and `docs/uk-provider-design.md`
**has never been built** — `lib/providers/uk-darwin.js` issues a live Darwin call on every board
request. Five regions are already live on this basis (uk-west-midlands, uk-london-tfl [not
Darwin], east-midlands, west-of-england, liverpool-city-region). Per
`docs/uk-build-out-recommendation.md`: add the cache before the flip sweep passes ~10 live Darwin
regions and before any UK store-listing push. Recorded here since it's a cross-region fact, not
a per-region one.

**Secondary/non-Darwin providers per region — cited from each region's own pack/registry note,
not re-researched:**

| Region | Secondary mode | Feed | Status |
|---|---|---|---|
| West Midlands (`uk-west-midlands`) | Metro | TfWM GTFS-RT | Credentials gap — `TFWM_API_APP_ID`/`TFWM_API_APP_KEY` unset (FB-48 open); board surfaces explicit error |
| East Midlands | NET tram | DFT BODS static GTFS | Confirmed static, no confirmed real-time — `out-product`, board surfaces `NetFeedUnconfirmedError` |
| South Yorkshire | Supertram (SYFTL) | none confirmed | Operator transition (Stagecoach→SYFTL, Mar 2024) — no public GTFS/GTFS-RT found at all |
| North East | Tyne and Wear Metro | DFT BODS static GTFS (confirmed, Jim's D2 pull) | Static data genuinely exists but is unparseable — ~5.4GB uncompressed exceeds the shared static-cache.js decoder's string-length limit (`MetroGtfsTooLargeError`); needs a streaming parser, not a feed problem. No public real-time feed exists either |
| Greater Manchester | Metrolink | none confirmed | TfGM developer portal deprecated, no new keys issued, no GTFS-RT confirmed anywhere — `MetrolinkFeedUnconfirmedError` |
| Liverpool City Region | Merseyrail | **Darwin** (corrected 4 Sep 2026) | Live — see Provider decision above; not a second feed at all |
| Glasgow | Subway (SPT) | TravelWhiz community static aggregation | Unverified stop order, no confirmed GTFS-RT — `GlasgowSubwayFeedUnverifiedError` |
| Edinburgh | Trams (T50) | DFT BODS static GTFS (confirmed reachable, OGL 3.0) | Not fetched/parsed by this pack; no confirmed real-time (TfE Open Data API inactive) — `EdinburghTramsFeedUnverifiedError` |

**Northern Ireland: out of UK v1.** NIR (Translink) is not on Darwin and is not planned — separate
railway, separate ticketing, `docs/uk-architecture.md` §1 locks GB-only. Buses are out UK-wide
(`docs/uk-architecture.md` §1, and the tracker's Northern Ireland row: "Not doing — Northern
Ireland out of UK v1. Buses out.").

---

## 2. Stop ownership

Basis abbreviations: **reg** = that region's own `registry.js` notes field; **pack** = that
region's `oracle-clash-report.md`/D1 pack directly. "First home region wins" per
`docs/uk-architecture.md` §1 — the region whose merged pack first catalogued the station as more
than through-running-only.

| Station | CRS | Home region | Other regions that touch it | Basis | Status |
|---|---|---|---|---|---|
| Denby Dale | DBD (was catalogued as DDL, corrected 5 Sep) | West Yorkshire | South Yorkshire (CRS left null there) | reg: west-yorkshire, south-yorkshire | **contested — Tim** (both packs carry it; South Yorkshire's own entry has no CRS, suggesting it never confirmed the station independently, but this ledger does not pick for Tim) |
| Tamworth | — (no CRS confirmed by any pack) | none | West Midlands (unbuilt catalog boundary), East Midlands (deliberately excludes it) | reg: east-midlands ("Tamworth deliberately excluded — genuine shared platform with West Midlands, D2 de-dup boundary for a future West Midlands pack, not built here") | **unclaimed — contested — Tim** |
| Darlington | DRL | none | North East, East Midlands | reg: north-east ("Darlington deliberately excluded — confirmed unclaimed by both this pack and East Midlands' own already-merged pack") | **unclaimed — contested — Tim** |
| Walsden | WDN (West Yorkshire's own pack) / WAD (Greater Manchester's own pack — same physical station, CRS mismatch) | West Yorkshire (through-running-only entry exists there) | Greater Manchester (no built counterpart catalog yet) | reg: west-yorkshire, greater-manchester | **contested — Tim** — this is a CRS-value conflict as well as an ownership one; neither pack resolved which CRS is correct against a live Darwin call |
| Chepstow | CPW | West of England (through-running-only) | South Wales (which instead names Severn Tunnel Junction, a *different physical station*, as its own side's Wales–England corridor boundary) | reg: west-of-england, south-wales | **decided as two distinct stations, not a shared-station contest** — flagged because the two regions independently named different stations as "the" Wales–England boundary; South Wales's own registry note calls this a known open item versus West of England's Chepstow naming. Neither station is claimed as a *home* station by either region — both are through-running-only in their own catalogs |
| Berwick-upon-Tweed | BWK | none | North East (through-running-only, "Scotland boundary open/unresolved"), Rest of Scotland (its own pack does not mention Berwick at all) | reg: north-east | **unclaimed — contested — Tim** |
| Taunton | TAU | none (through-running-only on both sides) | West of England (through-running-only, "toward Southwest/Devon region"), Southwest (through-running-only, "West of England boundary — not a merge, matches West of England's own Taunton flag from the other side") | reg: west-of-england, southwest | **contested — Tim** — both regions agree it's a boundary and neither claims it as a home/hub station; "first home region wins" does not resolve a station neither side actually owns |
| Chester | CTR/CHE | Liverpool City Region | Rest of Wales (excludes it explicitly, "Chester, England") | reg: liverpool-city-region (genuine Wirral Line Merseyrail terminus, in the 97-station catalog), reg: rest-of-wales ("Boundary/pass-through stations NOT in catalog: Chester (CTR, England)") | **decided** — Liverpool City Region catalogues it as a real terminus; Rest of Wales explicitly stays out |
| Peterborough | PBO | Greater Anglia (flat catalog entry, not a hub) | East Midlands (implied but not directly confirmed — Greater Anglia's own note flags "a future East Midlands/LNER Peterborough entry" as an unresolved cross-region shared-platform de-dup question), London & South East NR (boundary reference only, not built there) | reg: greater-anglia | **contested — Tim** — Greater Anglia is the only region that actually catalogues it today, but the possibility of an East Midlands entry is explicitly flagged as unresolved by Greater Anglia's own pack, not by this ledger inventing it |
| Fareham | FRM (was catalogued as FAR, corrected 5 Sep) | Solent | London & South East NR (not claimed there) | reg: solent (hub-anchor station, "Portsmouth Harbour" direction hub wired at Fareham) | **decided** |
| Westbury | WSB | none (through-running-only on all three sides) | West of England, Solent, Thames Valley — each lists Westbury as a through-running-only boundary station "reciprocally consistent" with the others' own already-merged packs | reg: west-of-england, solent, thames-valley | **contested — Tim** — three-way symmetric agreement that it's a boundary, no region claims it as a home/hub station |
| Gloucester | GCR | none | West of England (through-running-only, "West Midlands boundary") | reg: west-of-england; no West Midlands catalog exists yet to confirm or deny (uk-west-midlands's 75-station National Rail list was not re-read station-by-station for this ledger) | **unknown — contested — Tim** |
| Preston / Wigan / Lockerbie / Settle | — | Settle (SLF) only — Cumbria (regional boundary, in-catalog) | Preston, Wigan, Lockerbie: none | reg: cumbria ("Regional boundaries checked against already-merged adjacent packs (Rest of Scotland, Greater Manchester) — no live overlap found... remains an open D2 coordination point") | Settle: **decided** (Cumbria). Preston/Wigan/Lockerbie: **unclaimed — not contested (no second claimant either) — flagged for whoever builds the adjacent region** |

**doNotGroup two-layer stations (ownership-adjacent, not ownership contests):**

| Station | Layers | Status |
|---|---|---|
| Nottingham Station | NET tram viaduct vs National Rail main platforms | doNotGroup, both East Midlands' own catalog — no cross-region conflict |
| Sheffield Station (SHF) | Supertram viaduct vs National Rail main platforms | doNotGroup, both South Yorkshire's own catalog |
| Newcastle Central (NCL) | Tyne and Wear Metro (deep-tube box, different printed name "Central Station") vs National Rail | doNotGroup, both North East's own catalog — no name-collapse risk since printed names differ |
| Cardiff Central (CDF) | shares physical building with Valley Lines (footbridge-connect) | doNotGroup **proposed but not built** — South Wales's pack has no Valley Lines board to group against (TfW Valley Lines has no confirmed feed at all) |
| Bradford Interchange (BDI) / Bradford Forster Square (BDQ) | walk-link only, both carry National Rail service | doNotGroup, both West Yorkshire's own catalog |
| Liverpool Lime Street | **CLOSED AS MOOT, 4 Sep 2026** — Tim's Option B collapsed the former train/metro doNotGroup split into one Darwin CRS (LIV), one catalog entry, one board | Not a live two-layer case any more; the brief's list (written before this closure) still names it — flagged here so it isn't re-opened by mistake |
| Manchester Piccadilly / Piccadilly Gardens | ~100m/5–10 min walk-link pair, National Rail vs Metrolink, not a shared building | doNotGroup, both Greater Manchester's own catalog |

---

## 3. National-service verdicts

Vocabulary per `docs/board-eligibility-rule.md` §3. Cited from the pack/registry note where one
exists; verified independently where noted.

| Service | Verdict | Ticketing fact | Stations affected | Basis |
|---|---|---|---|---|
| Eurostar | `out-checkin` | Border control + check-in cutoff | St Pancras International | reg: london-se-national-rail |
| Caledonian Sleeper | `out-reservation` | Compulsory berth booking | Glasgow Central, Edinburgh Waverley, Aberdeen, Inverness, Fort William, Mallaig, Carlisle | reg: rest-of-scotland, glasgow, edinburgh, cumbria — enforced via shared `uk-darwin.js` `excludeOperators` in each |
| Night Riviera Sleeper | `out-reservation` | Compulsory sleeping-car cabin reservation | Paddington (london-se-national-rail), Exeter St Davids, Plymouth, Truro, St Austell, St Erth, Penzance (southwest) | reg: london-se-national-rail, southwest |
| LNER (long-distance, unreserved-carriage policy) | `in` | Unreserved coach always available; walk-up permitted | West Yorkshire (Leeds), Greater Anglia (Peterborough, resolved 5 Sep 2026 — "unreserved coach always available, same evidence shape as West Yorkshire's LNER row at Leeds") | reg: west-yorkshire, greater-anglia. **See contradiction flagged below: `london-se-national-rail`'s own registry note still records LNER at King's Cross as `undecided`, not `in`.** |
| Avanti West Coast | `in` | No compulsory reservation | Cumbria, Rest of Scotland, and elsewhere it calls | reg: cumbria, rest-of-scotland |
| CrossCountry | `in` | No compulsory reservation | Discovered live at Oxford (thames-valley, 5 Sep 2026, not in the original D1 report) and at Peterborough/Ely (greater-anglia) | reg: thames-valley, greater-anglia |
| TransPennine Express | `in` | No compulsory reservation | West Yorkshire, Cumbria, elsewhere | reg: west-yorkshire, cumbria |
| GWR | `in` | No compulsory reservation | West of England, Thames Valley, Solent, Southwest, South Wales | reg: multiple |
| EMR (East Midlands Railway) | `in` | No compulsory reservation | East Midlands hub; discovered as the operator-split partner at Greater Anglia's Norwich hub (Thetford/Ely) | reg: east-midlands, greater-anglia |
| Northern (Trains) | `in` | No compulsory reservation | West Yorkshire, South Yorkshire, North East, Greater Manchester, Liverpool City Region, Cumbria | reg: multiple |
| ScotRail | `in` | No compulsory reservation | Glasgow, Edinburgh, Rest of Scotland | reg: multiple |
| Transport for Wales | `in` | No compulsory reservation (real-time feed status via Darwin itself is a separate, **unconfirmed** question — see Coverage boundaries §4) | South Wales, Rest of Wales | reg: south-wales, rest-of-wales |
| Greater Anglia (operator) | `in` | No compulsory reservation | Own region, plus Liverpool Street (documented `in` in london-se-national-rail's built pack, not duplicated in greater-anglia's own) | reg: greater-anglia, london-se-national-rail |
| Southeastern / Southern / Thameslink | `in` | No compulsory reservation | London & South East NR (London Bridge — three-operator `includeOperators` split), Solent (Southern at Fareham) | reg: london-se-national-rail, solent |
| South Western Railway | `in` | No compulsory reservation | Waterloo hub (london-se-national-rail), Solent (both hubs), Thames Valley (Reading) | reg: multiple |
| c2c | `in` | No compulsory reservation | Liverpool Street (shared `includeOperators` split with Greater Anglia) | reg: london-se-national-rail |
| Chiltern Railways | `in` | No compulsory reservation. **Skip-risk timing note:** moves from Arriva to DfT Operator on 20 Sep 2026 — verify Darwin operator attribution after that date | Oxford's Marylebone-branch board, Banbury | reg: thames-valley |
| Elizabeth line | `in` (TfL Unified API — TfL ownership, not National Rail) | No compulsory reservation | Built entirely inside `uk-london-tfl`, not Darwin | reg: uk-london-tfl. **Ownership note:** infrastructure is a TfL/NR hybrid nationally, but this app's catalog treats every Elizabeth line stop as TfL's, consistent with `uk-london-tfl`'s "TfL rail only" scope — no Darwin-side Elizabeth line entries exist in any region pack read for this ledger |
| London Overground | `in` (TfL Unified API) | No compulsory reservation | Built entirely inside `uk-london-tfl` | reg: uk-london-tfl. Same ownership note as Elizabeth line |
| Merseyrail | `in` | No compulsory reservation — corrected 4 Sep 2026 to run via Darwin, not a metro system with no feed | Liverpool City Region (all 68 Merseyrail stations + Lime Street) | reg: liverpool-city-region |
| Heathrow Express | `in` | Any valid ticket boards any train; no compulsory seat reservation (standard turn-up-and-go airport shuttle operating model) | Not built in any region pack read for this ledger — Heathrow Airport stations are not yet in any UK catalog | Verified via web research (operator's own turn-up-and-go convention), not pack-cited — **no region currently catalogues Heathrow, so this verdict has no station to attach to yet; recorded for whichever region eventually claims it (likely london-se-national-rail or a future west-london region)** |
| Gatwick Express | `in` | Same turn-up-and-go convention; no compulsory reservation | Not built in any region pack read | Verified via web research — same caveat as Heathrow Express |
| Stansted Express | `in` | Same turn-up-and-go convention; no compulsory reservation | Not built in any region pack read (Stansted Airport station is named once in greater-anglia's discovery of CrossCountry, but the Stansted Express operator itself is not catalogued) | Verified via web research — same caveat |
| Lumo (open-access) | `in` | Boardable without a reservation; some seats unreserved (green-light marked), reservation "highly recommended," not compulsory | Not built in any region pack read for this ledger | Verified via web research, [RailUK Forums](https://www.railforums.co.uk/threads/lumo-reservation-only.271303/), [Lumo's own ticket page](https://www.lumo.co.uk/tickets/our-tickets) |
| Hull Trains (open-access) | `in`, with a caveat | Unreserved carriage (Carriage A) exists; reservation "strongly recommended and may be compulsory" during busy periods/engineering works | Not built in any region pack read | Verified via web research, [Hull Trains seating plan](https://www.hulltrains.co.uk/travel-information/seating-plan) — **flagged for Tim: this is the one open-access operator whose walk-up guarantee is not absolute ("may be compulsory" at peak), closer to a soft edge case than LNER/Avanti's clean `in`** |
| Grand Central (open-access) | `in` | Reservations complimentary, not guaranteed, not included by default on off-peak/anytime tickets | Not built in any region pack read | Verified via web research, [Grand Central seating info](https://uk.trip.com/trains/guide/grand-central-seating-plan) |

**Consistency check requested by the brief:** where existing region packs already gave a verdict,
this ledger cites the pack rather than re-deriving. **One pack-to-pack contradiction found, not
silently resolved:**

> **LNER at King's Cross vs. LNER at Leeds/Peterborough.** `london-se-national-rail`'s registry
> note records LNER's board-eligibility verdict at King's Cross as `undecided` — "curl fetches of
> lner.co.uk/Wikipedia/Google/DuckDuckGo all failed to return verifiable operator-policy text;
> excluded per the walk-up rule, not defaulted to in; flagged back to Nico/Tim for a proper
> search-capable pass." That flag was never actioned for London & South East NR specifically. Two
> other regions — `west-yorkshire` (Leeds) and `greater-anglia` (Peterborough, resolved 5 Sep
> 2026) — independently reached `in` for the *same operator* on the same "unreserved coach always
> available" evidence. This ledger does not resolve King's Cross's `undecided` row for
> `london-se-national-rail` on that region's behalf (that pack is immutable per the propagation
> rule); it records the contradiction and recommends whoever next touches
> `london-se-national-rail`'s pack apply the same resolution already reached twice elsewhere,
> subject to Tim's sign-off.

---

## 4. Coverage boundaries

Where Darwin's stop-level data ends, and which secondary feeds are confirmed/unconfirmed/blocked
(cited from each region's own pack/registry note per the brief — not re-researched):

- **Northern Ireland** — not on Darwin at all, out of UK v1 entirely (see §1).
- **Eurostar-only platforms** (St Pancras International's Eurostar side) — outside the walk-up
  rule (`out-checkin`), not a data gap; Darwin does carry St Pancras's domestic Thameslink side.
- **No static GTFS fallback anywhere for National Rail.** Confirmed explicitly, region by region:
  West of England ("there is no static GTFS fallback at all — National Rail Enquiries does not
  publish static GTFS anywhere"), South Wales, Solent, Thames Valley, Rest of Wales's own
  itemisation, London & South East NR — all Darwin-or-nothing. Greater Anglia is the one partial
  exception: a reference static GTFS *does* exist (Transitland `f-gc-rail~delivery~group~planar~
  gtfs`, CC-BY-2.0 UK, no key, verified 2026-09-01) but is used only as a verification source, not
  pulled for board data — Darwin remains the only real-time path there too. **No region may scope
  past Darwin's live coverage** — this is the standing rule the brief asked to be recorded once.
- **NET (Nottingham Express Transit)** — East Midlands: static GTFS confirmed (DFT BODS,
  no key), no confirmed real-time feed — `out-product`, board surfaces `NetFeedUnconfirmedError`.
- **Sheffield Supertram / SYFTL** — South Yorkshire: no public feed confirmed at all
  (post-transition operator gap, not an account block).
- **Tyne and Wear Metro** — North East: static GTFS genuinely confirmed and pulled (D2, Jim,
  31 Aug 2026) but unparseable by the shared `static-cache.js` helper (~5.4GB uncompressed exceeds
  its whole-zip `TextDecoder.decode()` string-length limit — `MetroGtfsTooLargeError`, a shared-code
  gap affecting ~10 other live cities' helper, not this region alone). No public real-time feed
  either (`metro-rti.nexus.org.uk` is undocumented/app-only).
- **TfW Valley Lines** — South Wales: no confirmed public GTFS static or GTFS-RT feed of any kind
  ("not found" throughout the region's own oracle report). Genuinely no feed, not a skip risk to
  chase further without a TfW reply.
- **Edinburgh Trams** — static GTFS confirmed reachable (DFT BODS, OGL 3.0) but not fetched/parsed;
  no confirmed real-time successor (TfE Open Data API inactive).
- **Glasgow Subway** — schedule-only at best: static candidate (TravelWhiz community aggregation)
  reachable but unverified stop order and unclear license; no confirmed GTFS-RT.
- **West Midlands Metro (TfWM)** — credentials gap (`TFWM_API_APP_ID`/`TFWM_API_APP_KEY` unset,
  ticket FB-48 open), not a feed-existence gap — the feed itself (GTFS-RT) is otherwise expected
  to work once keys are issued.
- **Metrolink (Greater Manchester)** — TfGM's developer portal is deprecated and issues no new
  keys; existing keys continue on an unconfirmed timeline; no public GTFS-RT confirmed anywhere.
- **Merseyrail** — **not** a coverage gap; corrected 4 Sep 2026 to run through Darwin like any
  other TOC (see §1). Recorded here only to close the door on re-treating it as one.
- **Transport for Wales's real-time status specifically through Darwin** — genuinely unconfirmed
  (narrower than South Wales's Valley Lines "no feed at all"): static GTFS via Transitland is
  live, but whether Darwin/OpenLDBWS actually carries live TfW departure data has not been
  confirmed (`data@tfw.wales` not yet contacted, per Rest of Wales's own pack). Do not assume it
  works once regions using TfW flip live — verify against a real Darwin payload first.
- **traini.ac** — a no-auth, CORS-open third-party aggregator over Network Rail TRUST/TD/VSTP and
  Darwin Push Port, evaluated and explicitly **rejected** for the request path 4 Sep 2026
  (`docs/uk-build-out-recommendation.md` §3): rate limit too low for production (120 units/min per
  IP ÷ 3 per departures call ≈ 40 boards/min for the whole app), licensing chain is an
  unaccountable downstream redistributor, and it produced a different answer from Darwin for the
  same station/minute during evaluation (Ellesmere Port's 07:18, "→ Liverpool Central" on Darwin
  vs "→ Chester" on traini.ac). Recorded here as a coverage-boundary decision, not a feed gap —
  Darwin already covers what it was proposed for.

---

## Open items for Tim

1. **OpenLDBWS/RDM redistribution terms to third-party riders** — unconfirmed against the signed
   Data Sharing Agreement, carried as an open item on every UK region since 2 Sep 2026. Needs a
   single yes/no from Tim, once, closing it everywhere rather than per region.
2. **Contested stop-ownership rows** (§2): Denby Dale, Tamworth, Darlington, Walsden (also a CRS
   value conflict — WDN vs WAD for the same physical station), Berwick-upon-Tweed, Taunton,
   Peterborough (possible future East Midlands entry), Westbury, Gloucester. Chepstow vs Severn
   Tunnel Junction is not a shared-station contest but is a naming inconsistency between two
   regions about which physical station is "the" Wales–England boundary — worth a decision even
   though no ownership conflict exists.
3. **Pack contradiction** (§3): LNER's board-eligibility verdict is `in` at Leeds and Peterborough
   but still `undecided` at King's Cross in `london-se-national-rail`'s own registry note. Same
   operator, same evidence shape reached twice elsewhere — recommend applying the same resolution,
   subject to sign-off, next time that pack is touched.
4. **Falkirk High / Glasgow–Edinburgh boundary** — both packs independently exclude the station
   from their own catalogs (no functional contradiction — neither builds it), but their prose
   disagrees about *whose* boundary station it is: Edinburgh's pack calls it "Glasgow's boundary
   station"; Glasgow's pack instead says it's "owned by the Edinburgh region." Genuine prose
   disagreement, not resolved here.
5. **Hull Trains' soft edge case** (§3) — the one open-access operator whose walk-up guarantee is
   qualified ("may be compulsory" at peak/engineering-work periods) rather than clean `in`. Worth
   a product call on whether that's still `in` unconditionally or needs a caveat surfaced to riders.
6. **Stale "DARWIN_LDB_TOKEN not set" blocker text** on 12 planned regions' registry `integration`
   strings — the token has existed since 2 Sep 2026; this is cosmetic but misdescribes why those
   regions aren't live (per `docs/uk-build-out-recommendation.md` item 4).
7. **The 15–30s Darwin server-side cache has never been built** despite being specified in both
   `docs/uk-architecture.md` and `docs/uk-provider-design.md`. Five regions are already live
   without it. Recommend building it before the flip sweep passes ~10 live Darwin regions.
8. **Heathrow Express / Gatwick Express / Stansted Express** have verdicts recorded in §3 but no
   station to attach them to — none of the three airports is in any built UK catalog yet. Not
   actionable until a region claims one of them; recorded so the verdict work isn't repeated then.

---

## Propagation log

Later regions append new cross-region findings here (per `docs/country-lane.md`'s propagation
rule — the discovery goes into this ledger, never back into an earlier region's pack).

| Date | Region | Finding | Effect |
|---|---|---|---|
| | | | |
