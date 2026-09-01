# Southwest hazard pack (H1–H7)

Evidence: `docs/southwest-d1/oracle-clash-report.md` (Nico) only — no UK-country ledger exists yet
for this lane (`docs/*-ledger.md` glob has no `united-kingdom-ledger.md`), and no other city's
in-progress pack was read as a source of station-graph fact. Two already-merged UK packs are
referenced below strictly for the two consistency checks the dispatch instruction named:
`docs/west-of-england-d1/` (Taunton boundary flag) and `docs/london-se-national-rail-d1/`
(Night Riviera Sleeper board-eligibility verdict) — not as additional sources of new fact for this
region's own station graph.

## H1 — parent + child

Single agency (National Rail, Darwin/OpenLDBWS) — **no two-layer hub problem** in this region
(unlike East Midlands' Nottingham Station tram-over-rail case). Exeter St Davids (EXD) and
Plymouth (PLY) are each single-layer National Rail stations. No parent/child station relationship
is documented in the report.

## H2 — clash surface

Restated from the report (lines 46–52): National Rail (Darwin/OpenLDBWS) is documented and
technically live but **blocked at the account level** — EvansAppStudio's Rail Data Marketplace
registration is Australian and RDM's geography check rejects AU registrations for GB services;
Tim is re-registering with a UK address. Same blocker as West Midlands / Greater Manchester /
Liverpool City Region / East Midlands / South Wales. Build the catalog normally; the region stays
"Coming Soon" (`status: "planned"`) until `DARWIN_LDB_TOKEN` exists.

**No static GTFS at all** (same structural gap as West of England, East Midlands, London & South
East National Rail): Darwin is realtime-only (SOAP API, per-station departure board). The report
raises this as an open question for Jim/Tim (C2/C3 point 7) — same open item carried forward, not
resolved in this pack (see `coverageGaps` below).

**Two operators sharing single infrastructure.** GWR (primary) and CrossCountry (through-running)
both call at Exeter St Davids and Plymouth on distinct platforms, but on the same Network Rail
infrastructure — the report explicitly distinguishes this from East Midlands' Nottingham
tram/rail split (line 63): "no separate operator sections at in-scope hubs." Report line 52 also
raises doNotGroup as a question ("doNotGroup by operator or line code at hub stations — separate
boards per platform standard") but C2/C3 point 6 resolves it: **not required in v1** — see H4/H6
below.

## H3 — thin / event / overlay

**Gap, not resolved:** the oracle report gives no information on short turns, peak extras,
event-only stops, or overlay services. Nothing to report here beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| (none) | — | Report explicitly states (C2/C3 point 6): "doNotGroup not required at hub stations in v1." Exeter St Davids and Plymouth are GWR-operated single-platform groups for most services (distinct platforms for different routes, but same operator); CrossCountry through-running calls on distinct platforms. Separate boards per platform standard applies — not a doNotGroup case. |

No branch/junction detail is given for the London–Bristol–Exeter–Plymouth–Penzance main line
beyond the through-running/branch points named in the station table (Newton Abbot, Totnes, Truro,
St Austell, St Erth). Do not invent a route topology — Darwin has no printed route map to
transcribe (same structural gap as every National Rail-only region in this pipeline).

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given. Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

Locked hub: **Exeter St Davids (EXD)** — report line 15: "hub lock — principal rail terminus for
Exeter city; all GWR InterCity and regional services call here. Main interchange between London
Paddington services and Southwest corridor (Plymouth–Penzance direction). Through-running point
for CrossCountry services via Midlands/Bristol." Secondary hub: **Plymouth (PLY)** — report line
16: "hub secondary — Plymouth city station; frequent service to Exeter St Davids (30–60 min),
direct service to Penzance via Riviera Line." Terminus: **Penzance (PNZ)** — report line 17:
"terminus — westernmost and southernmost station on National Rail network." This is the same
hub + secondary hub + terminus shape already used for West of England (Bristol Temple
Meads/Bath Spa), Solent, and Thames Valley — single-layer, single-agency, no doNotGroup needed
between or within EXD/PLY/PNZ (GWR-dominated, platforms distinguished by route not operator; see
H1/H4).

## H7 — DST

Southwest is in the UK, timezone **Europe/London**, which **observes DST** (BST in summer, GMT in
winter). Not to be treated as a no-DST region. UK-wide fact, stated here so Jim doesn't have to
re-derive it (same as every other UK region packed so far).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| (none proposed) | Report explicitly rules out doNotGroup at hub stations for v1 (C2/C3 point 6) — GWR-dominated single-operator termini at EXD, PLY, and PNZ; CrossCountry through-running is on distinct platforms but the report does not ask for a doNotGroup split. |
| Taunton (TAU) vs West of England | Not a doNotGroup case — a through-running boundary station, already documented in `docs/west-of-england-d1/published-network.json` (`throughRunningOnly[3]`, name "Taunton", crs "TAU", "toward Southwest/Devon region — not a merge. GWR continues west to Exeter and beyond."). This pack's own station table (report line 18) independently reaches the same conclusion for the same station: "through-running point, boundary to West of England region. Not a merge." No contradiction between the two packs; both mark Taunton as a boundary through-running point, neither merges it. Flagged for D2 de-dup only, per both packs. |

## Night Riviera Sleeper — consistency check against London & South East National Rail

Report (lines 34, 42, 64) verdicts Night Riviera Sleeper `out-reservation` at Exeter St Davids,
Plymouth, and Penzance (compulsory sleeping-car cabin reservation, cannot walk up and board).
`docs/london-se-national-rail-d1/published-network.json` (`excludedOperators` at the Paddington
station group, and `excludedServices`) already records Night Riviera Sleeper as `out-reservation`
at Paddington, for the same reason (compulsory reservation for sleeping cars). This pack applies
the identical verdict at the Devon/Cornwall end of the same physical service — one train, two
regions' catalogs, same exclusion reason, no contradiction. See `published-network.json`
`excludedServices` below.

## What I did not do

No generator, no invented route/line topology for the London–Bristol–Exeter–Plymouth–Penzance main
line (Darwin has no printed route map — same structural gap as every National Rail-only region in
this pipeline), no resolution of the Darwin-only-vs-GTFS-supplement product question (open item
for Jim/Tim, see jim-handoff.md), no resolution of the OpenLDBWS redistribution-terms ambiguity
(open item for Tim), no reading of any other city's oracle report or in-progress pack beyond the
two named consistency checks (West of England Taunton flag, London & South East Night Riviera
verdict), no wiring of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit.
