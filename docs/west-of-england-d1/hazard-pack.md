# West of England hazard pack (H1–H7)

Evidence: `docs/west-of-england-d1/oracle-clash-report.md` (Nico) only — no UK-country ledger
exists yet for this lane (`docs/*-ledger.md` glob has no `united-kingdom-ledger.md`), and no
other city's in-progress pack was read. South Wales's `docs/south-wales-d1/oracle-clash-report.md`
exists in git history but has not been packed by Luke yet (no `published-network.json` there) —
referenced below only where the report explicitly forward-flags Chepstow as a shared boundary,
per the task instruction, not as an additional source of station-graph fact.

## H1 — parent + child

Single agency (National Rail, Darwin/OpenLDBWS) — **no two-layer hub problem** in this region
(unlike East Midlands' Nottingham Station tram-over-rail case). Bristol Temple Meads (BRI) and
Bath Spa (BTH) are each single-layer National Rail stations. No parent/child station relationship
is documented in the report.

## H2 — clash surface

Restated from the report (lines 26–28): National Rail (Darwin/OpenLDBWS) is documented and
technically live but **blocked at the account level** — EvansAppStudio's Rail Data Marketplace
registration is Australian and RDM's geography check rejects AU registrations for GB services;
Tim is re-registering with a UK address. Same blocker as West Midlands / Greater Manchester /
Liverpool City Region / East Midlands / North East — **not a feed problem**. Build the catalog
normally; the region stays "Coming Soon" (`status: "planned"`) until `DARWIN_LDB_TOKEN` exists.

**Additional clash not present in East Midlands: no static GTFS at all.** National Rail Enquiries
does not publish a static GTFS feed for this or any UK National Rail region — Darwin is
realtime-only (SOAP API, per-station departure board). The report explicitly raises this as an
open question for Jim/Tim (C2/C3 point 5): does Next Train support a Darwin-only next-train model
with no static-schedule supplement, or does the product require a GTFS base layer that Darwin's
realtime then patches? **This pack does not resolve that question** — it is a product-architecture
decision, not a station-graph one, and is carried into `coverageGaps` below for Jim/Tim.

## H3 — thin / event / overlay

**Gap, not resolved:** the oracle report gives no information on short turns, peak extras,
event-only stops, or overlay services. Nothing to report here beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| (none) | — | Report explicitly states (C2/C3 point 4): "no doNotGroup needed at hub stations in v1." Bristol Temple Meads and Bath Spa are GWR-operated with distinct platforms per route but same operator — separate boards per platform is standard, not a doNotGroup case. |

No branch/junction detail is given for the London–Bristol–Bath–Exeter–Penzance main line beyond
the four boundary through-running points (Chepstow, Gloucester, Westbury, Taunton). Do not invent
a route topology — Darwin has no printed route map to transcribe (same structural gap as East
Midlands' National Rail slice; see report line 36, C2/C3 point 5).

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given. Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

Locked hub: **Bristol Temple Meads (BRI)** — report line 15: "hub lock — principal rail terminus
for Bristol city; all regional and inter-city services call here." Secondary hub: **Bath Spa
(BTH)** — report line 16: "hub secondary — Bath city station; direct service to Bristol Temple
Meads (11–19 min frequency)." Unlike East Midlands' Nottingham Station, this is a **single-layer,
single-agency** hub pair — no doNotGroup is needed between BRI and BTH (they are two separate
stations 11–19 minutes apart by rail, not a shared building/platform case) and no doNotGroup is
needed within either station (GWR-only, platforms distinguished by route not operator).

## H7 — DST

West of England is in the UK, timezone **Europe/London**, which **observes DST** (BST in summer,
GMT in winter). Not to be treated as a no-DST region. UK-wide fact, stated here so Jim doesn't
have to re-derive it (same as East Midlands H7, North East H7).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| (none proposed) | Report explicitly rules out doNotGroup at hub stations for v1 (C2/C3 point 4) — GWR-dominated single-operator termini at both BRI and BTH. |
| Boundary through-running stations vs adjacent regions' feeds | Chepstow (South Wales boundary), Gloucester (West Midlands boundary), Westbury (Solent/Thames Valley boundary), Taunton (Southwest boundary) are same-operator-continuing-across-boundary cases — routing/filter concern for whichever regions ship National Rail, not a D1 merge point. Flagged for **D2 de-dup** if/when those adjacent regions ship packs (South Wales report already exists but is unpacked; West Midlands / Solent / Thames Valley / Southwest have no report yet as of this pack). |

## What I did not do

No generator, no invented route/line topology for the London–Bristol–Bath–Exeter–Penzance main
line (Darwin has no printed route map — same structural gap as every National Rail-only region in
this pipeline), no resolution of the Darwin-only-vs-GTFS-supplement product question (open item
for Jim/Tim, see jim-handoff.md), no resolution of the OpenLDBWS redistribution-terms ambiguity
(open item for Tim), no reading of South Wales's oracle report beyond the single Chepstow
cross-reference the task instruction asked for, no wiring of `DARWIN_LDB_TOKEN`, no product edit,
no `lib/providers/` edit.
