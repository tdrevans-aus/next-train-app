# Cumbria hazard pack (H1–H7)

Evidence: `docs/cumbria-d1/oracle-clash-report.md` (Nico) only. No `docs/united-kingdom-ledger.md`
exists yet (`docs/*-ledger.md` glob has only `docs/denmark-ledger.md`) — this pack proceeds without
one, same basis as every other UK region packed so far. Per the "files, not chat" rule, no other
city's in-progress pack was read; two named adjacent regions' **already-merged** packs (Rest of
Scotland, Liverpool City Region, Greater Manchester) were read only for boundary/verdict
consistency, per the dispatch instruction, not for general context.

## H1 — parent + child

One agency family in scope: **National Rail** (Darwin/OpenLDBWS). Northern Trains is the primary
regional franchise holder for Cumbria; Avanti West Coast (long-distance WCML) and TransPennine
Express (regional/intercity WCML) are through-running TOCs; Caledonian Sleeper calls Carlisle for a
crew/supply change. All are TOCs *within* National Rail, not separately-fed agencies (report line
17: "No separate Cumbrian operator GTFS"). No parent/child pairing like South Wales' Valley Lines or
South Yorkshire's Supertram — same shape as Rest of Scotland's H1.

## H2 — clash surface

Restated from the report (lines 3, 72, 82):

1. **National Rail account-level blocker**, same EvansAppStudio AU-registration issue as every
   other UK region packed this wave (East Midlands, West Midlands, Greater Manchester, Liverpool
   City Region, South Wales, Rest of Scotland, and others). Not a feed problem — build the catalog
   normally; region stays `status: "planned"` until `DARWIN_LDB_TOKEN` exists with UK registration.
2. **Five railway lines radiate from one hub (Carlisle)** — West Coast Main Line, Settle-Carlisle
   Line, Tyne Valley Line, Cumbrian Coast Line, and (via Oxenholme) the Lakes Line branch. Unlike
   Rest of Scotland's four co-equal hubs, this report gives Carlisle a clear, unambiguous
   station-graph basis for sole tier-1 hub-lock status (8 platforms, ~1.97M passengers, junction of
   four lines directly plus a fifth via Oxenholme) — no ranking ambiguity to resolve here.
3. **Caledonian Sleeper board-eligibility verdict required** — resolved by the report itself
   (`out-reservation`), consistent with Rest of Scotland and Liverpool City Region's verdicts for
   the same service (see H2 cross-check below).
4. **Cross-region through-running at the Lockerbie (Scotland) and Settle/Preston (Lancashire)
   boundaries** — the report explicitly declines to de-dup and flags this for Luke/Mark at D2. This
   pack does not attempt de-dup either; see H6.
5. **48 total stations, only 7 individually detailed in the report** (Carlisle, Penrith, Oxenholme,
   Windermere, Kendal, Barrow-in-Furness, Settle). The remaining 41 are named only as an aggregate
   count ("all other stations (38 total)" at report line 32, but the report's own running total
   later says "41 smaller branch/regional/terminus stations" at line 102 — **a count mismatch within
   the report itself, not resolved here**). This pack catalogs only the 7 stations the report gives
   individual detail for and records the rest as a D2 gap — see H3 and coverageGaps.

**Cross-check against already-merged adjacent packs (per dispatch instruction):**

- **Rest of Scotland** (`docs/rest-of-scotland-d1/published-network.json`) does not name Lockerbie
  or any station south of its four hubs (Perth/Inverness/Aberdeen/Dundee) — it does not claim
  Lockerbie. Cumbria's own scope stops at Carlisle (English side). No overlap, no contradiction:
  neither pack claims the other's station. The Lockerbie through-running flag in Cumbria's oracle
  report (line 80) remains open for whichever pack eventually catalogs Rest of Scotland's southern
  extension (Dumfries & Galloway is not in Rest of Scotland's current four-hub scope either) — this
  is a genuine future gap, not something this pack or Rest of Scotland's finished pack resolves.
- **Liverpool City Region** (`docs/liverpool-city-region-d1/published-network.json`) verdicts
  Caledonian Sleeper `out-reservation` with reason "Compulsory sleeping-car reservation... does not
  regularly call Liverpool Lime Street." Cumbria's own verdict (`out-reservation`, Carlisle calls
  confirmed) is consistent in kind (same service, same compulsory-reservation reasoning) even though
  the underlying station-calling fact differs (Sleeper *does* call Carlisle, for crew/supply change).
- **Greater Manchester** (`docs/greater-manchester-d1/published-network.json`) does not name Preston,
  Wigan, or any station this pack could collide with — its own southern/eastern boundary flags are
  Stockport and Walsden (toward West Yorkshire), unrelated to Cumbria's Settle/Preston boundary. No
  overlap found. Confirms the oracle report's own assessment (line 79: "no overlap identified;
  Cumbria southern boundary is clear at Settle/Hellifield and Preston area").

## H3 — thin / event / overlay

**Gap, not resolved — station-count shortfall is the primary H3 item for this pack.** The report
names only 7 of 48 Cumbrian stations individually (Carlisle, Penrith, Oxenholme, Windermere, Kendal,
Barrow-in-Furness, Settle); the other 41 are referenced only as an aggregate count with an internal
mismatch (38 vs. 41, see H2 point 5). This pack does not invent station names, CRS codes, or
line-order for the un-named 41 — cataloging them accurately requires either a corrected station list
from Nico or a verified GTFS/Darwin pull, neither of which this pack performs (per the
read-only-the-report rule). No short-turn, peak-extra, or event-only service detail is given for any
operator either — nothing to report beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| **Carlisle (CAR)** | WCML (north to Scotland, south to Preston/Manchester), Settle-Carlisle Line (east to Leeds), Tyne Valley Line (east to Newcastle), Cumbrian Coast Line (south/west to Barrow-in-Furness/Workington) | Report line 25: "Junction of four major lines," 8 platforms, single physical station. No doNotGroup basis — the report never describes separate infrastructure or a walk-link at Carlisle, only a four/five-line junction within one station building. |
| **Oxenholme Lake District (OXO)** | WCML (through-station) vs. Lakes Line branch (Kendal, Windermere) | Report line 27: "branch point to Lakes Line," one station, no separate-infrastructure language. No doNotGroup basis. |
| **Barrow-in-Furness (BIF)** | Furness Line (north to Ulverston/Lancaster) vs. Cumbrian Coast Line (north to Workington/Carlisle) | Report line 30: "Junction of Furness Line and Cumbrian Coast Line," single station, 3 platforms. No doNotGroup basis. |

**No doNotGroup rule is built for this pack.** Unlike Liverpool City Region (Lime Street vs.
Merseyrail, contradictory separate-infrastructure language) or Greater Manchester (Piccadilly vs.
Piccadilly Gardens, ~100m walk-link), the Cumbria report gives no multi-agency, multi-building, or
walk-link station anywhere in its scope — every junction described (Carlisle, Oxenholme,
Barrow-in-Furness) is explicitly a single physical station serving multiple lines, which is a
station-graph branch fact, not an infrastructure-split fact. Consistent with Rest of Scotland's H4
reasoning (four-way branching at one physical station is not, by itself, evidence for splitting a
board).

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for any Cumbrian line or
operator. Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

**Single tier-1 hub lock (Carlisle) with two tier-2 secondary hubs (Oxenholme, Barrow-in-Furness)**
— this is the hub + multiple-secondary-hub shape, closer to Greater Manchester's
hub-plus-secondary-hub pattern than to Rest of Scotland's four co-equal hubs, except Cumbria has
**one** clear primary rather than two co-equal agency-specific hubs. Carlisle is unambiguously
primary: it is the only station where all major operators (Northern, Avanti, TransPennine,
Caledonian Sleeper) converge, and the only four/five-line junction in scope. Oxenholme and
Barrow-in-Furness are named "hub lock — tier 2" by the report itself (lines 27, 30) with a clear
station-graph basis (each is a genuine two-line junction), unlike Perth-vs-Inverness where the
report's own hub-ranking language was not backed by graph facts.

**Penrith** is a major WCML station (all three operators call) but is not described as a junction
of more than one line — it is built as a **regional major station**, not a tier-2 hub, matching the
report's own framing (line 26: "Secondary hub" is used loosely in report prose, but Penrith has no
branch point unlike Oxenholme/Barrow — this pack does not promote it to tier-2 hub status without a
junction fact).

**Cross-region boundary at Carlisle/Lockerbie and Settle/Preston — explicitly flagged, not
resolved here**, per the oracle report (lines 78–80, 113) and confirmed against Rest of Scotland's
and Greater Manchester's already-merged packs (see H2 cross-check above): neither pack currently
claims the boundary stations Cumbria's report worries about (Lockerbie, Preston, Wigan), so there is
no live de-dup conflict today, but the report's own flag for D2 coordination stands — a future Rest
of Scotland expansion into Dumfries & Galloway, or a future Lancashire/Central England region
claiming Preston, would need to reconcile against this catalog's Carlisle/Settle boundary.

## H7 — DST

Cumbria is in the UK, timezone **Europe/London**, which **observes DST** (BST in summer, GMT in
winter). UK-wide fact, stated here so Jim doesn't have to re-derive it — same as every other UK
region packed so far.

## Board eligibility (docs/board-eligibility-rule.md)

Report §"Board eligibility" already supplies full verdicts with evidence URLs (report lines 36–68)
— this pack transcribes them, it does not derive new ones.

| Service | Verdict | Basis |
| --- | --- | --- |
| Northern Trains (regional, commuter, branch-line) | `in` | No compulsory reservation, open/assigned seating, walk-up standard, no check-in barrier. |
| TransPennine Express | `in` | Optional reservations only; walk-up boardable. |
| Avanti West Coast | `in` | Optional reservations for Advance fares; walk-up booking valid. |
| CrossCountry (through-running, if calling Cumbrian stations) | `in` | Optional reservation only; walk-up boardable. Report flags Cumbrian calls as "to be verified at D1 pack stage" — this pack does not add CrossCountry to any station's operator list without a confirmed calling pattern; see coverageGaps. |
| **Caledonian Sleeper** | **`out-reservation`** | Compulsory berth/cabin reservation; platform staff check-in 60–90 min before departure is a reservation-verification step (test 1 failure), not an airport-style document barrier (test 2). Calls at Carlisle only within this catalog, for crew/supply change (report line 45–47, 66). |

Caledonian Sleeper is excluded from board filtering at Carlisle — the only station it calls within
this catalog — recorded, not silently dropped, per the report's own verdict table and evidence URLs
(report lines 60–68). Consistent with Rest of Scotland (excluded at Aberdeen, Inverness, Fort
William, Mallaig) and Liverpool City Region (excluded, does not call Lime Street) — same service,
same `out-reservation` reasoning, applied per-station per the actual calling pattern at each region.

## doNotGroup proposals

| candidate | status | reason |
| --- | --- | --- |
| Carlisle (CAR): four/five-line junction | **Not a doNotGroup case** | Report describes one physical 8-platform station, no separate infrastructure or walk-link language anywhere. |
| Oxenholme (OXO): WCML through-station vs. Lakes Line branch point | **Not a doNotGroup case** | Single station, branch point only — same reasoning as Perth's east-side "wing" in Rest of Scotland's H4. |
| Barrow-in-Furness (BIF): Furness Line vs. Cumbrian Coast Line junction | **Not a doNotGroup case** | Single 3-platform station. |
| Carlisle/Lockerbie boundary (Cumbria vs. future Rest-of-Scotland southern extension) | **Flagged, not resolved** | Rest of Scotland's current four-hub scope does not reach Lockerbie/Dumfries & Galloway; no live conflict, but report flags for D2 if that changes. |
| Settle/Preston boundary (Cumbria vs. Greater Manchester / Liverpool City Region) | **Checked against both already-merged packs, no conflict found** | Neither pack claims Preston, Wigan, or Settle; report's own "no overlap identified" assessment (line 79) confirmed, not just assumed. |

## What I did not do

No generator, no invented station graph beyond the report's own 7 individually-detailed stations, no
invented CRS codes or station names for the 41 un-detailed Cumbrian stations, no resolution of the
report's own internal station-count mismatch (38 vs. 41, H2 point 5 — flagged, not guessed at), no
resolution of the Lockerbie or Settle/Preston cross-region boundary flags (checked against
already-merged adjacent packs per the dispatch instruction, confirmed no live conflict, but not
resolved as a permanent boundary), no resolution of the OpenLDBWS redistribution-terms ambiguity
(open item for Tim, same as every other UK NR region), no wiring of `DARWIN_LDB_TOKEN`, no product
edit, no `lib/providers/` edit, no reading of any other city's in-progress (unfinished) pack.
