# London & South East National Rail hazard pack (H1–H7)

Evidence: `docs/london-se-national-rail-d1/oracle-clash-report.md` (Nico) only, plus the
architecture decision Tim made on top of it (Option A — per-terminus station groups, no forced
single hub-lock; see report's "Hub-lock & station-graph architecture" section for the three
options Tim chose between). No UK-country ledger exists yet (`docs/*-ledger.md` glob still returns
only `docs/denmark-ledger.md`) — `docs/country-lane.md`'s "Standing retrofits" section names the
UK ledger as required **before the next NR region**, and this is that next NR region. That retrofit
has not run. This pack proceeds anyway per the dispatching instruction (read only this report; no
other city's in-progress pack), but the absence is flagged again in jim-handoff.md as a real gap,
not silently worked around — a future ledger pass may find boundary facts here (GWR/SWR/CrossCountry
through-running especially) that would otherwise need to be discovered by accident, exactly the
failure mode `docs/country-lane.md` exists to prevent.

## H1 — parent + child

**Not a parent/child hub.** This is the structural break from every other UK region packed so far
(South Wales's Cardiff Central, East Midlands, North East, West of England — all single hub-lock).
Report line 56: "No single station connects all (or even most) TOCs." Tim's Option A decision
(per the dispatch brief, matching the report's own recommendation at line 81) is **eight
independent station groups**, one per terminus, each with its own operator set and doNotGroup
logic. There is no parent hub and no child stations here — see H6 for the group list.

## H2 — clash surface

Three distinct blockers, different in kind:

1. **Darwin/OpenLDBWS: same account-level block as every other UK region.** EvansAppStudio's
   Rail Data Marketplace registration is Australian; RDM's geography check rejects AU
   registrations for GB services (report line 35). Not a feed problem — build the catalog
   normally, region stays `status: "planned"` until `DARWIN_LDB_TOKEN` exists.

2. **Real-time redistribution terms unclear.** OGL 2.0 baseline permits redistribution with
   attribution, but the RDM Platform Agreement's language on downstream redistribution to
   third-party rider clients is not confirmed in public sources (report License section,
   "Real-time Confidence: Unclear"). Same open item as every other UK NR region — for Tim, not
   resolved here.

3. **LNER board-eligibility verdict was `undecided` in the report — resolved in this pack to
   exclude LNER.** The report flagged LNER's "one unreserved carriage per service" policy against
   its "compulsory reservations" company-policy language and could not settle whether that counts
   as walk-up boardable (report lines 128–129, 156). This pack attempted further research (curl
   fetches of lner.co.uk's reservations page, the LNER Wikipedia article, Google, and DuckDuckGo
   HTML search) — every source either served client-side-rendered JS with no server-side text to
   read, or returned an anti-bot challenge page (DuckDuckGo's "select all squares containing a
   duck" captcha). No verifiable operator-policy text was obtainable with the tools available to
   this lane. Per the dispatch instruction ("if genuinely ambiguous after real research, keep it
   undecided and exclude LNER from the catalog rather than guessing"), **LNER stays `undecided`
   and is excluded from this pack's catalog entirely.** This is a tooling gap, not a closed
   research question — flag for Tim/Nico to resolve with a proper operator-confirmation channel
   (see jim-handoff.md), not something this pack fabricates a verdict for.

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no detail on short turns, peak extras, or event-only
calling patterns for any of the ten in-scope TOCs. Nothing to report beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| **London Bridge** | Southeastern / Southern / Thameslink | Report line 48, 136, C2/C3 point 5: "requires doNotGroup: three operator sections, separate platform logic." Three TOCs at one physical station, separate platform groups. |
| **Liverpool Street** | Greater Anglia / c2c | Report line 49, 137: two operators, dual. |
| **King's Cross / St Pancras complex** | Great Northern (King's Cross, above-ground) / Thameslink (St Pancras Thameslink, below-ground) / Eurostar (St Pancras International, above-ground, **excluded — out-checkin**) | Report line 50, 138, C2/C3 point 5: "Multiple operators, multiple physical stations. Separate platform groups required." Eurostar is excluded by board eligibility (H2 above / report line 124), so this is a **proposed** doNotGroup between Great Northern and Thameslink only — not built against Eurostar since there's no Eurostar board in this catalog to group against, same pattern as South Wales's Cardiff Central/Valley Lines treatment. |
| **Paddington** | GWR / Night Riviera Sleeper (**excluded — out-reservation**) | Report line 51, 139: two services, one in-scope. Proposed doNotGroup only — no sleeper board exists in this catalog to group against. |
| **Euston** | Regional services (**TOC not named in report — gap, not built**) / Caledonian Sleeper (**excluded — out-reservation**) | Report line 52, C2/C3 point 5 names "Regional services, Caledonian Sleeper" at Euston but never names which TOC operates Euston's regional walk-up service (Avanti West Coast and London Northwestern Railway both plausibly serve Euston in reality, but neither appears anywhere in this report's TOC list at line 9/31/38). Building a doNotGroup — or a station group at all — for an unnamed operator would be inventing a station graph the report doesn't support. **Euston is not built as a catalog entry in this pack; see H6 and jim-handoff.md.** |

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for any operator. Flag only —
nothing to encode.

## H6 — inner city (where §3 lives) — eight station groups, Option A

No single hub-lock. Per Tim's Option A decision, each terminus is its own station group with its
own doNotGroup logic (report C2/C3 point 5 gives this exact list; this pack builds the seven
groups the report supports with a named in-scope TOC, and records Euston as a flagged gap rather
than an eighth built group):

| Group | Primary TOC(s) in this catalog | CRS (unverified — see caveat) | doNotGroup? |
| --- | --- | --- | --- |
| **Waterloo** | South Western Railway | WAT | No — single operator |
| **Victoria** | Southern, Gatwick Express | VIC | No — same agency family (Greater Thameslink Railway), single board |
| **London Bridge** | Southeastern, Southern, Thameslink | LBG | **Yes — three operators (H4)** |
| **Liverpool Street** | Greater Anglia, c2c | LST | **Yes — two operators (H4)** |
| **King's Cross** | Great Northern | KGX | No within this group (single operator); proposed doNotGroup against St Pancras Thameslink and against excluded Eurostar, see H4 |
| **St Pancras International** | Thameslink (St Pancras Thameslink, below-ground) | STP | Proposed doNotGroup against King's Cross Great Northern and against excluded Eurostar, see H4 |
| **Paddington** | Great Western Railway | PAD | Proposed doNotGroup against excluded Night Riviera Sleeper, see H4 |
| **Euston** | **Not built — no named in-scope TOC (H4/H5 gap)** | EUS | N/A — no group built |

**CRS caveat:** the report explicitly marks its CRS-code list as "(examples)" (report line 256) and
its station names as "subject to GTFS stop_name exact match at D1 pack time" (report line 103) —
not verified against a live GTFS dump. These codes are carried into `published-network.json` with
that caveat attached; confirm against the Transitland National Rail GTFS feed or a live Darwin
response before Jim wires an adapter against them.

**Secondary termini (Blackfriars, Cannon Street, Charing Cross, Farringdon, Fenchurch Street,
Marylebone, Moorgate) are NOT built as station groups.** The report itself marks these "TBD...may
be out-of-scope D1" (report line 53/101) — this pack does not promote any of them to a catalog
entry on the strength of a "TBD" table row. Two of them (Farringdon, Blackfriars) appear again in
the board-eligibility Thameslink row as calling points (report line 147), which is suggestive but
not the same as the report actually deciding they're in-catalog stations for this pack's purposes —
recorded as an open item, not resolved either way. See jim-handoff.md.

**Regional-boundary through-running (not station-group concerns, corridor concerns — flag only,
do not resolve):** GWR continues west from Paddington past this catalog's edge (West of England
region already exists, Bristol Temple Meads hub); SWR continues southwest from Waterloo; LNER
would continue north from King's Cross were it in scope (it is not — H2/H4); CrossCountry
through-runs nationally. None of these are de-duplicated here — per the report (lines 21–23,
239–244) and per the country-lane rule, that's a D2/ledger concern, not a D1 pack concern. No
West of England, East Midlands, or Greater Anglia station appears in this catalog.

## H7 — DST

London & South East National Rail is in the UK, timezone **Europe/London**, which observes DST
(BST in summer, GMT in winter). Same UK-wide fact as every other UK region packed so far.

## doNotGroup proposals — summary

| candidate | status | reason |
| --- | --- | --- |
| London Bridge: Southeastern / Southern / Thameslink | **Built** | Three named operators, one physical station, report explicitly calls for this (line 231). |
| Liverpool Street: Greater Anglia / c2c | **Built** | Two named operators, report line 232. |
| King's Cross (Great Northern) vs. St Pancras Thameslink vs. Eurostar (excluded) | **Proposed, partially built** | Great Northern/Thameslink are two named operators at two physical buildings of one complex; Eurostar is excluded by board eligibility so nothing to group against it yet. |
| Paddington (GWR) vs. Night Riviera Sleeper (excluded) | **Proposed, not built against sleeper** | Sleeper excluded by board eligibility; no board to group against. |
| Euston (unnamed regional TOC) vs. Caledonian Sleeper (excluded) | **Not built at all** | No named in-scope TOC for Euston's regional service — see H4/H6. |

## What I did not do

No generator, no invented station graph beyond what the report names, no CRS-code verification
against a live GTFS dump or Darwin response (report itself marks these unverified), no Euston
station group (no named TOC to build one from), no secondary-terminus (Blackfriars/Farringdon/
Cannon Street/Charing Cross/Fenchurch Street/Marylebone/Moorgate) catalog entries (report marks
these TBD), no resolution of the OpenLDBWS redistribution-terms ambiguity (open item for Tim, same
as other UK regions), no wiring of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit,
no reading of any other city's in-progress pack, no fabrication of a UK country ledger (that's
Nico's country-lane job, not this pack's — flagged as a real gap above and in jim-handoff.md).
