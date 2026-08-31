# South Wales hazard pack (H1–H7)

Evidence: `docs/south-wales-d1/oracle-clash-report.md` (Nico) only. No UK-country ledger exists
yet for this lane (`docs/*-ledger.md` glob has only `docs/denmark-ledger.md` — no
`united-kingdom-ledger.md`). West of England's finished pack (`docs/west-of-england-d1/`, merged
to master as PR #173) was read once, per the task instruction, only to check its treatment of the
Wales–England boundary so this pack doesn't contradict it — not as a source of South Wales
station-graph fact.

## H1 — parent + child

Two agencies, structurally distinct problem from a two-layer hub (e.g. East Midlands' tram-over-
rail): **Transport for Wales Valley Lines** (six commuter routes, 81 stations) and **National
Rail** (Darwin/OpenLDBWS through-running). At Cardiff Central both agencies call at the same
station on separate platforms with a footbridge connection (report line 19) — this is a shared-hub
case, not a parent/child station relationship. No other parent/child structure is documented.

## H2 — clash surface

**Two distinct blockers, different in kind:**

1. **National Rail (Darwin/OpenLDBWS):** documented and technically live but **blocked at the
   account level** — same EvansAppStudio AU-registration issue as West Midlands / Greater
   Manchester / Liverpool City Region / East Midlands / North East / West of England. Not a feed
   problem. Build the National Rail catalog normally; region stays `status: "planned"` until
   `DARWIN_LDB_TOKEN` exists.

2. **Transport for Wales Valley Lines: no confirmed public feed of any kind exists.** This is not
   the Darwin account-level block and not West of England's "Darwin-only, no static GTFS"
   situation either — TfW does not publish GTFS static, GTFS-RT, *or* any other public API. The
   only documented distribution channel is direct contact (data@tfw.wales) for TransXChange
   timetable files (report lines 9, 33, 66–80). Confidence on all TfW license/feed questions is
   `not found` in the oracle report. An outreach draft already exists
   (`docs/outreach-drafts/south-wales.md`, Viv) asking TfW to confirm GTFS/GTFS-RT availability;
   as of this pack, no reply is recorded. **There is nothing to build a Valley Lines station graph,
   direction model, or catalog entry from — inventing one would mean fabricating a feed that does
   not exist.** See "What I did not do" below and `jim-handoff.md`.

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no information on short turns, peak extras, or event-only
stops for either agency. Nothing to report beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| (none, National Rail) | — | Report gives no doNotGroup basis for National Rail at Cardiff Central beyond the shared-platform-with-TfW fact already captured at H1/H6. No branch/junction detail given for National Rail through-running beyond the single boundary point (Severn Tunnel Junction). |
| (not built, Valley Lines) | — | No station graph exists to derive doNotGroup candidates from — no feed, no timetable, no line topology confirmed beyond the six named route termini in the report's prose (report C2/C3 point 6). Do not invent branch structure for the 81-station network from a route name list alone. |

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for either agency. Flag only —
nothing to encode.

## H6 — inner city (where §3 lives)

Locked hub: **Cardiff Central (CDF)** — report line 19: "hub lock — interchange between Valley
Lines and National Rail through-running services." This is a shared physical hub across two
agencies on **separate infrastructure** (report line 37: "Cardiff Central is a shared hub (Valley
Lines platforms + National Rail platforms, separate infrastructure)") — closer in shape to a
doNotGroup candidate than West of England's single-agency BRI/BTH pair, but the report does not
give enough platform/service detail to define a doNotGroup rule beyond "these are two different
products at one station, do not merge their boards." Recorded as a **proposed doNotGroup**, not a
built one — see below.

Second-tier hub: **Pontypridd** (report line 21) — Valley Lines only, junction of Merthyr and
Rhondda lines, no through-running to adjacent regions. Not a D1 catalog entry given the Valley
Lines feed gap (H2 above); recorded here only because the report names it as structurally
significant.

## H7 — DST

South Wales is in the UK, timezone **Europe/London**, which **observes DST** (BST in summer, GMT
in winter). Same UK-wide fact as every other UK region packed so far (East Midlands H7, North East
H7, West of England H7).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Cardiff Central: Valley Lines platforms vs. National Rail platforms | Same station, separate infrastructure, two different agencies/products (report lines 19, 37). **Proposed, not built** — the report confirms the fact of separate infrastructure but gives no platform numbers or service-list detail to encode a rule against. Flag for Jim: if/when Valley Lines ever gets a feed, do not merge its board with National Rail's board at CDF even though they share a hub lock. |
| Severn Tunnel Junction (STJ) vs. Chepstow (CPW) — Wales–England boundary, **discrepancy flagged, not resolved** | This report (line 20, C2/C3 point 5) names **Severn Tunnel Junction (STJ)** as the through-running boundary point on the South Wales Main Line. West of England's merged pack (`docs/west-of-england-d1/published-network.json`, `throughRunningOnly`) names **Chepstow (CPW)** as the boundary point to South Wales instead — a different station. Both are real stations on the same Wales–England rail corridor near the border; this pack does not attempt to reconcile which one (or both) is the correct D2 de-dup point, since that would require station-graph inference beyond what either report states. **Recorded here as an open discrepancy for Jim/Tim to resolve at D2**, not silently picked one way. Neither station is a merge point at D1 in this pack — both stay through-running-only, consistent with West of England's "not a merge" treatment of its own boundary stations. |
| Pontypridd (Valley Lines second-tier hub) | Not a doNotGroup case — report states no through-running to adjacent regions at this station (report line 21). Recorded only as a structural note; no catalog entry since Valley Lines has no feed (H2). |

## What I did not do

No generator, no invented Valley Lines station graph, route topology, or direction model — TfW
publishes no public GTFS/GTFS-RT and the report's only station list is a Wikipedia-sourced name
count (81) explicitly marked "pending verification against official TfW operator map" (report line
29), which is not a source this pack builds a catalog from. No resolution of the STJ-vs-Chepstow
boundary discrepancy (flagged for Jim/Tim above). No resolution of the OpenLDBWS redistribution-
terms ambiguity (open item for Tim, same as other UK regions). No wiring of `DARWIN_LDB_TOKEN`, no
product edit, no `lib/providers/` edit, no reading of any other city's in-progress pack.
