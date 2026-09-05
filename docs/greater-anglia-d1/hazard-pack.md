# Greater Anglia hazard pack (H1–H7)

Evidence: `docs/greater-anglia-d1/oracle-clash-report.md` (Nico) only. No UK-country ledger
exists yet for this lane (`docs/*-ledger.md` glob has no `united-kingdom-ledger.md`). London &
South East National Rail's built pack (`docs/london-se-national-rail-d1/published-network.json`)
was checked once, per the task instruction, for its Liverpool Street stationGroup entry — to
avoid duplicating it and to catch a CRS collision (see H4) — not otherwise read as a
station-graph source.

## H1 — parent + child

Single primary agency (Greater Anglia, Darwin/OpenLDBWS) — **no two-layer hub problem** in this
region, unlike East Midlands' Nottingham Station (tram-over-rail) or London & South East's
multi-operator termini. Norwich, Cambridge, and Ipswich are each single-building, walk-up
National Rail stations. Peterborough is a genuine multi-operator station but the report is
explicit it is **not** a merge point (report line 25) — see H4.

## H2 — clash surface

Restated from the report (lines 3, 7, 77): National Rail (Darwin/OpenLDBWS) is documented and
technically live but **blocked at the account level** — EvansAppStudio's Rail Data Marketplace
registration is Australian; RDM's geography check rejects AU registrations for GB services; Tim
is re-registering with a UK address. Same blocker as every other UK region packed so far — **not
a feed problem**. Build the catalog normally; the region stays "Coming Soon" (`status:
"planned"`) until `DARWIN_LDB_TOKEN` exists.

Unlike West of England, Greater Anglia **does** have a live static GTFS feed (Transitland
`f-gc-rail~delivery~group~planar~gtfs`, CC-BY-2.0 UK, no key, verified 2026-09-01) — this gives a
schedule-base fallback path that West of England's Darwin-only situation lacks, though this pack
does not pull that feed itself (station names/CRS come from the oracle report's own tables, not
a GTFS dump — see H4/coverageGaps for the resulting unverified-CRS gap).

## H3 — thin / event / overlay

**Gap, not resolved:** the oracle report gives no information on short turns, peak extras,
event-only stops, or overlay services (e.g. Great Yarmouth Race Days, Latitude Festival specials
near Southwold, if any). Nothing to report here beyond: do not invent any.

## H4 — branches (doNotGroup candidates) / CRS collision

| node | issue | evidence |
| --- | --- | --- |
| Peterborough | Multi-operator shared platform (Greater Anglia, Thameslink, CrossCountry, East Midlands, LNER) but the report explicitly rules out treating it as a merge/hub — "Through-running point, not merge... no dedicated group required within this region" (report line 25). Modelled as a flat boundary station with `excludedOperators` for LNER, not a `doNotGroup` stationGroup. Flagged for a **multi-region ledger at D2** (report line 82, C2/C3 point 7) — cross-regional shared-platform de-dup between this pack, a future East Midlands National Rail Peterborough entry (if one is ever added — East Midlands' existing pack does not name Peterborough), and any future LNER region. |
| Lowestoft vs Liverpool Street | **CRS collision found in the report itself, not introduced by this pack.** The report's own station-code list (line 103) assigns `LST` to Lowestoft. `LST` is Liverpool Street's real-world CRS and is already used as such in London & South East National Rail's built pack (`stationGroups[].id: "liverpool-street"`, `crs: "LST"`). If Lowestoft were shipped with `LST`, any cross-city station lookup keyed on CRS would collide two entirely different East-of-England stations 100+ miles apart. **Not propagated here** — Lowestoft's `crs` field is left `null` in `published-network.json`, flagged for Jim to confirm the real code (believed `LOW`, not verified against GTFS in this pack) before wiring. |

No other branch/junction detail beyond the report's own station table (hub, two secondary hubs,
one boundary point, one third-tier regional hub, one regional junction, six branch termini/
commuter stations) is documented. Do not invent a route topology — Darwin has no printed route
map to transcribe (same structural gap as every National Rail-only region packed so far).

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given. Flag only — nothing to
encode.

## H6 — inner city (where §3 lives)

Locked hub: **Norwich (NRW)** — report line 20/33: "terminus for Greater Anglia's main East
Anglia service corridor... geographic and operational terminus of the Great Eastern Main Line."
Two secondary hubs: **Cambridge (CBG)** and **Ipswich (IPS)** — the report gives both identical
"second-tier hub status" language (lines 22-24) and repeats the pairing in its own C2/C3 notes
(line 131: "Secondary hubs: Cambridge (CBG), Ipswich (IPS)"). This pack kept **both** as
secondary hubs rather than flattening one, because the report gives an affirmative, distinct
justification for each (Cambridge: Thameslink cross-London through-running; Ipswich: major
Great Eastern Main Line city station with its own multi-directional connections) — there is no
textual basis in the report to prefer one over the other as "the" secondary hub. This differs
from West of England's single-secondary-hub shape (Bath Spa only) because that report gave only
one secondary station any hub-level language at all; Greater Anglia's report gives two.

Peterborough (PBO) is explicitly **not** a hub (report line 25) — kept out of the
`secondaryHubs` array and modelled as a flat `throughRunningBoundary` entry instead. Colchester
is the report's own "third tier" (line 37) and Ely is called a "regional junction" (line 38) —
both kept flat under `regional`, not promoted to hub status, since the report itself ranks them
below Cambridge/Ipswich and gives them no cross-region interchange role of their own (Colchester's
only cross-region link is the already-documented Liverpool Street boundary; Ely's is Thameslink
through-running, same board-eligibility-pass pattern as Cambridge/Peterborough, not a distinct
hub justification).

No doNotGroup is needed at Norwich, Cambridge, or Ipswich — single-building, walk-up stations,
Thameslink at Cambridge passes the board-eligibility test alongside Greater Anglia rather than
requiring separate boarding-area logic (unlike London & South East's Liverpool Street, which
genuinely has two separately-ticketed operators, Greater Anglia and c2c).

## H7 — DST

Greater Anglia is in the UK, timezone **Europe/London**, which **observes DST** (BIS in summer,
GMT in winter). Not to be treated as a no-DST region. UK-wide fact, stated here so Jim doesn't
have to re-derive it (same as every other UK region packed so far).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| (none within Greater Anglia's own stations) | Norwich, Cambridge, and Ipswich are each single-building, single-fare-zone stations with no genuinely separate boarding areas by operator — Thameslink at Cambridge/Peterborough and CrossCountry/East Midlands at Peterborough all pass the walk-up board-eligibility test, so there is no reservation-barrier or separate-platform-complex reason to doNotGroup them, unlike Nottingham Station's tram/rail split or Liverpool Street's Greater Anglia/c2c split. |
| Peterborough vs a future East Midlands/LNER Peterborough entry | Genuine shared-platform, multi-operator boundary station. Not a D1 merge concern for this pack (report line 25); flagged for a D2 multi-region ledger. |
| Lowestoft vs Liverpool Street (CRS collision) | Report assigns both `LST` — a pack-level data-integrity hazard, not a station-graph merge. Resolved here by leaving Lowestoft's CRS unverified/null rather than shipping the collision. |

## What I did not do

No generator, no invented route/line topology for Greater Anglia's East Anglia network (Darwin
has no printed route map — same structural gap as every National Rail-only region in this
pipeline), no pulling of the Transitland GTFS feed to verify CRS codes (flagged for Jim at D2),
no resolution of the LNER reserved-policy skip risk (same open question as London & South East,
not resolved there either), no resolution of the OpenLDBWS redistribution-terms ambiguity (open
item for Tim), no invention of the 17-37 additional stations the report itself estimates D1 scope
might need beyond the ~13 explicitly named, no re-reading of London & South East's chat/oracle
beyond the single Liverpool Street stationGroup cross-check the task instruction asked for, no
wiring of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit.
