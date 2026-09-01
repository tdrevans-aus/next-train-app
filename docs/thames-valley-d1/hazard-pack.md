# Thames Valley hazard pack (H1–H7)

Evidence: `docs/thames-valley-d1/oracle-clash-report.md` (Nico) only — no `docs/united-kingdom-
ledger.md` exists yet (`docs/*-ledger.md` glob still has no United Kingdom entry; checked before
starting this pack). Per the dispatch instruction, two named adjacent regions' *finished, merged*
packs were checked strictly for reciprocal boundary-flag consistency (Westbury vs West of
England/Solent; Paddington/Marylebone vs London & South East National Rail) — not read for general
context, and not used as a source of Thames Valley station-graph fact beyond that single check.

## H1 — parent + child

**No two-layer hub problem.** Single agency family (National Rail, Darwin/OpenLDBWS; GWR primary,
CrossCountry/Chiltern/SWR at named stations). Reading (RDG) and Oxford (OXF) are each single-layer
National Rail stations — no tram-over-rail or metro-over-rail parent/child relationship like East
Midlands' Nottingham Station. No parent/child station relationship is documented in the report.

## H2 — clash surface

Restated from the report (lines 6–8, 52–56): National Rail (Darwin/OpenLDBWS) is documented and
technically live but **blocked at the account level** — EvansAppStudio's Rail Data Marketplace
registration is Australian; RDM's geography check rejects AU registrations for GB services. Tim is
re-registering with a UK address. Same blocker as every other UK National Rail region packed so
far (West Midlands / Greater Manchester / Liverpool City Region / East Midlands / West of England /
Solent / London & South East / others) — **not a feed problem**. Build the catalog normally; the
region stays `status: "planned"` until `DARWIN_LDB_TOKEN` exists.

**No static GTFS from NRE directly** (report lines 5, 84): National Rail Enquiries does not publish
static GTFS; Transitland republishes a National Rail GTFS derived from CIF data (Onestop ID
`f-gc-rail~delivery~group~planar~gtfs`, CC-BY-2.0 UK, production-ready, no key required) — same
reference-only status as every prior UK NR pack. This pack does not pull that feed; it is cited by
the report as a schedule-source option for Jim, not used to derive this catalog's station list.

**Second clash, specific to this region: two operators on separate infrastructure at the secondary
hub.** Unlike West of England's Bristol Temple Meads/Bath Spa pair (both GWR-only, no doNotGroup
needed), Oxford hosts GWR (main line, London/Reading/Bristol direction) and Chiltern Railways
(Marylebone branch) on **different platforms and different infrastructure** (report line 16, 37,
C2/C3 point 4 and 6). This is a doNotGroup case at the secondary hub — see H4/H6.

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no detail on short turns, peak extras, event-only stops, or
overlay services for any of the four operators (GWR, CrossCountry, Chiltern, SWR). Nothing to
report here beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| **Oxford (OXF)** | GWR main line (London/Reading/Bristol direction) vs Chiltern Railways (Marylebone branch) | Report line 16, 37, 56, C2/C3 point 4/6: "GWR (main line) + Chiltern (branch line) on different platforms and infrastructure — separate boarding logic required per operator." **Built as doNotGroup: true.** |
| **Reading (RDG)** | GWR + CrossCountry + SWR, same terminus, different platforms | Report line 15, 36, C2/C3 point 4: "no multi-operator platform mixing (unlike London Bridge or Copenhagen)... standard 'separate boards per platform' pattern applies." **Not** a doNotGroup case — single flat board distinguished by destination + operator, same as Southampton Central in Solent's pack. |
| **Banbury (BAN)** | Chiltern Railways (from Marylebone via Oxford) vs GWR (from Paddington via Oxford–Banbury to Birmingham) | Report line 18, 38: "two separate TOC operations on separate infrastructure at same town... Not a merge point." Through-running-only station, not a hub candidate — **proposed doNotGroup only, not built as a station group** (same posture as Euston/Paddington-sleeper proposals in the london-se-national-rail pack: nothing to group against without a built board). |

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for GWR, CrossCountry,
Chiltern, or SWR. Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

**Hub + secondary-hub pattern, same shape West of England and Solent already established —
reused, not invented fresh — but with a doNotGroup twist at the secondary hub.**

- **Reading (RDG)** — hub lock. Report line 15: "principal rail terminus and interchange for
  Thames Valley; 15 platforms, busiest station in Berkshire and third busiest in South East
  England outside London." GWR (Paddington/Bristol/Bath), CrossCountry (long-distance), SWR
  (through-running from Solent). **No doNotGroup within Reading** — three operators at different
  platforms of one terminus, but no evidence of the multi-operator-platform-mixing complexity that
  drives London Bridge/Liverpool Street's doNotGroup:true in london-se-national-rail (report line
  36 explicitly rules this out: "No multi-operator platform mixing... Boards must show all three
  operators per boarding-contract test" — a flat board requirement, not a split-board one).

- **Oxford (OXF)** — hub secondary. Report line 16: "direct service to Reading (22–32 min
  frequency)... Regional through-hub for north-south routing (GWR line) and east-west routing
  (Chiltern line)." **doNotGroup: true** — GWR main line and Chiltern Marylebone branch are on
  separate platforms and separate infrastructure (report line 37, 56, C2/C3 point 4/6: "Two
  separate operators on different infrastructure... Boards must show both" / "separate boarding
  logic required per operator"). This is the dual-boarding-logic case the task brief flagged by
  name, and it is a genuine structural difference from West of England's Bath Spa (single-operator,
  no doNotGroup) — Oxford's secondary-hub board needs two operator sections, not one flat list.

Unlike West of England (single-operator hub pair, no doNotGroup anywhere) and unlike Solent
(doNotGroup absent within any of its three boards), Thames Valley's secondary hub itself needs
internal doNotGroup — closer in shape to london-se-national-rail's London Bridge/Liverpool Street
cases (two-to-three operators, separate platform logic) but occurring at a *secondary* hub rather
than at a primary terminus, and paired with a hub-lock (Reading) that explicitly does *not* need
doNotGroup. Do not collapse Oxford's two operator sections into one flat board — that would silently
misrepresent the branch split a rider sees on a real Oxford departure board.

## H7 — DST

Thames Valley is in the UK, timezone **Europe/London**, which **observes DST** (BST in summer, GMT
in winter). Not a no-DST region. Same UK-wide fact as every other UK region packed so far — stated
here so Jim doesn't have to re-derive it.

## doNotGroup proposals

| candidate | status | reason |
| --- | --- | --- |
| Oxford: GWR (main line) vs Chiltern Railways (Marylebone branch) | **Built (doNotGroup: true)** | Two operators, separate platforms/infrastructure, report explicitly calls for separate boarding logic (line 37, 56, C2/C3 point 4/6). |
| Reading: GWR / CrossCountry / SWR | **Not built (doNotGroup: false)** | Report explicitly rules this out — "no multi-operator platform mixing," standard flat board applies (line 36, C2/C3 point 4). |
| Banbury: Chiltern vs GWR | **Proposed, not built** | Through-running-only station, not a hub candidate at D1 — nothing to build a station group against (same posture as unbuilt proposals in london-se-national-rail's Paddington/Euston rows). |
| Westbury vs Reading/Oxford | **Boundary flag only** | Through-running to West of England/Solent boundary — already flagged reciprocally in both those regions' finished packs (see below). Not a merge, not a Thames Valley stationGroup. |
| Marylebone (Chiltern origin) vs Oxford | **Boundary flag only, not built anywhere yet** | Marylebone is part of London & South East National Rail's catalog scope (report point 10), but london-se-national-rail's *own* finished pack does not build Marylebone either — it sits in that pack's `notBuilt.secondary-termini` list (report there marks it "TBD...may be out-of-scope D1"). No double-build risk exists today; flagged for D2 ledger once/if either region promotes Marylebone to a built entry. |

## Boundary consistency check (Westbury, Paddington/Marylebone)

Per the dispatch instruction, checked (not read for general context — specifically for the named
reciprocal-flag check):

- **Westbury (WSB):** `docs/west-of-england-d1/published-network.json`
  (`nationalRailStations.throughRunningOnly`) already records it as `"through-running only,
  boundary to Solent/Thames Valley regions — not a merge... De-duplicate at D2 if adjacent regions
  enter the app."` `docs/solent-d1/published-network.json` (`boundaryThroughRunning`) independently
  records the same station, boundary to West of England, also not a merge. This pack is
  consistent with both: Westbury is recorded here as a boundary-only flag (GWR continues west
  toward Bristol/Bath through West of England's catalog; SWR branches south into Solent's), not
  built as a Thames Valley stationGroup.
- **Paddington/Marylebone:** `docs/london-se-national-rail-d1/published-network.json` builds a
  `paddington` stationGroup (GWR hub, `boundaryNote`: "GWR continues west past this catalog's edge
  (West of England region, already built...)") — that boundary note names West of England, not
  Thames Valley, because Paddington's GWR trains run to Bristol via Reading/Swindon (through Thames
  Valley's own corridor) before reaching West of England. This pack adds the reciprocal fact:
  Reading and Oxford's GWR services originate from Paddington, which is in London & South East's
  catalog, not Thames Valley's — Paddington itself is **not** a Thames Valley station and is not
  built here. Marylebone (Chiltern's London terminus) is **not built** in london-se-national-rail's
  pack either (it sits in that pack's `notBuilt.secondary-termini` list, report there line 53/101,
  "TBD...may be out-of-scope D1") — so there is no double-build to reconcile today, only a shared
  D2 flag if either region later promotes its terminus to a built stationGroup.

No de-dup action taken. This stays a D2/adapter-time concern per every prior UK region's pack.

## What I did not do

No generator, no invented route/line topology for the GWR main line or the Chiltern Marylebone
branch (Darwin has no printed route map — same structural gap as every National Rail-only region
in this pipeline), no GTFS fetch/parse (Transitland feed cited by the report as reference-only, not
pulled here), no CRS-code verification against a live GTFS dump or Darwin response, no resolution
of the OpenLDBWS redistribution-terms ambiguity (open item for Tim, same as every other UK NR
region), no wiring of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit, no reading of
any other city's in-progress (unfinished) pack — West of England, Solent, and london-se-national-
rail's *finished, merged* `published-network.json` files were read only for the specific
Westbury/Paddington-Marylebone reciprocal-flag consistency checks the dispatch instruction named,
not for general context.
