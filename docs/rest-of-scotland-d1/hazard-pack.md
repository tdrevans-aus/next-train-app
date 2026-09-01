# Rest of Scotland hazard pack (H1–H7)

Evidence: `docs/rest-of-scotland-d1/oracle-clash-report.md` (Nico) only. No UK-country ledger
exists yet for this lane (`docs/*-ledger.md` glob has only `docs/denmark-ledger.md` — no
`united-kingdom-ledger.md`), same basis as every other UK region packed so far (East Midlands,
South Wales, West Yorkshire, South Yorkshire). No other city's in-progress pack was read.

## H1 — parent + child

One agency family in scope: **National Rail** (Darwin/OpenLDBWS), with ScotRail as the primary
Train Operating Company (TOC) for regional services and three through-running operators
(Caledonian Sleeper, CrossCountry, LNER) calling at the same hub stations. This is not a
parent/child pairing like South Wales' Valley Lines or South Yorkshire's Supertram — ScotRail is a
TOC *within* National Rail, not a separate agency with its own feed (report line 11: "No ScotRail
static GTFS separate from National Rail"). No parent/child structure to document beyond the
multi-operator hub fact captured at H6.

## H2 — clash surface

**Two distinct hazards, different in kind:**

1. **National Rail (Darwin/OpenLDBWS): blocked at the account level**, same EvansAppStudio
   AU-registration issue as East Midlands / West Midlands / Greater Manchester / Liverpool City
   Region / South Wales / West Yorkshire / South Yorkshire. Not a feed problem — build the
   catalog normally; region stays `status: "planned"` until `DARWIN_LDB_TOKEN` exists with UK
   registration (report line 3, §H2).

2. **No single hub — four verified tier-1 hub candidates** (Perth, Inverness, Aberdeen, Dundee),
   each a genuine junction/terminus in its own right, none subordinate to the others. This is
   structurally different from every prior UK region packed (Cardiff Central, Leeds Station,
   single hub locks) — see H6 for how this pack resolves it (four co-equal hub locks, not one
   primary + secondaries).

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no information on short turns, peak extras, or event-only
stops for ScotRail, CrossCountry, LNER, or Caledonian Sleeper. Nothing to report beyond: do not
invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Perth (PTH) | Highland Main Line (north to Inverness), Tayside line (east to Dundee/Aberdeen), cross-country (south to Glasgow/Edinburgh) | Report line 19: "junction of three major lines." One main station with an east-side "wing" for Dundee-bound trains — a physical branch split within the single station, not a doNotGroup case (report explicitly frames it as "physically one main station"). |
| Inverness (INV) | Highland Main Line (south), Aberdeen–Inverness line (east), Kyle of Lochalsh line (west), Far North Line (north) | Report line 20: terminus of four lines, 7 platforms. Four-way branch point — no doNotGroup basis given (single station, single operator set). |
| Aberdeen (ABD) | Dundee–Aberdeen line (south), Aberdeen–Inverness line (north) | Report line 21: two-line terminus, 6 platforms. |
| Dundee (DDE) | Dundee–Perth line (west), Dundee–Aberdeen line (north), Dundee–Edinburgh line (south, toward Central Belt) | Report line 22: three-line junction; the south branch is also the unresolved regional-boundary direction (see H6/doNotGroup). |

No doNotGroup rule is built from these branch lists — the report gives line-topology facts, not
platform-separation or infrastructure-split facts (contrast West Yorkshire's Bradford
Forster Square vs. Bradford Interchange, which *is* a doNotGroup case because the report states
separate infrastructure). Four-way branching at a single physical station is not, by itself,
evidence for splitting a board.

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for any operator. Flag only —
nothing to encode.

## H6 — inner city (where §3 lives)

**Four co-equal hub locks, not one primary + secondaries** — this is the structural departure from
every prior UK region packed. The report itself declines to rank them beyond noting Perth is "the
primary cross-country interchange" while explicitly calling Inverness, Aberdeen, Dundee "secondary
hubs serving different geographical corridors" (report line 30) — but gives no basis to treat any
of the three as subordinate to Perth in a station-graph sense (each is its own terminus/junction
with no other station standing in for it). This pack locks all four as tier-1 hubs per the report's
own table (report lines 19–22), rather than picking one "primary" and downgrading the rest to
secondary, since the report's junction/terminus facts do not support a hierarchy among them.

**Regional boundary at Dundee (south branch) — explicitly unresolved, do not resolve here.**
Report §V1 scoping (line 7) and C2/C3 point 4: Rest of Scotland's own scope is "outside Central
Belt," but the exact boundary vs. future Glasgow/Edinburgh regions is undocumented at Falkirk High,
and the internal boundary dispute is recorded in Glasgow's and Edinburgh's own draft (not yet
built) oracle reports. Per the task brief, this pack does **not** attempt to resolve it — it is
recorded as an open D2 coordination point (see doNotGroup proposals below and
`published-network.json` coverageGaps), and this pack's own scope stays well north of the Central
Belt (report line 7's own risk assessment: "low collision risk").

**Branch termini (single operator, no through-running to other regions):** Kyle of Lochalsh (KLS),
Thurso (THR), Wick (WCK) — ScotRail only, end-of-line. Mallaig (MLG) and Fort William (FTW) also
carry Caledonian Sleeper (nights only) — see Board eligibility below.

## H7 — DST

Rest of Scotland is in the UK, timezone **Europe/London**, which **observes DST** (BST in summer,
GMT in winter). Same UK-wide fact as every other UK region packed so far.

## Board eligibility (docs/board-eligibility-rule.md)

Report §"Board eligibility" already supplies full verdicts with evidence URLs (report lines 32–60)
— this pack transcribes them, it does not derive new ones.

| Service | Verdict | Basis |
| --- | --- | --- |
| ScotRail regional | `in` | No compulsory reservation, open seating, no check-in barrier. |
| CrossCountry | `in` | Optional reservation only; walk-up boardable. |
| LNER Highland Chieftain (London King's Cross–Inverness) | `in` | Optional reservation only; walk-up boardable. |
| **Caledonian Sleeper** | **`out-reservation`** | Compulsory berth/cabin reservation; staff platform check-in 60–90 min before departure is a reservation-verification step (test 1 failure), not an airport-style document barrier (test 2). Calls at Aberdeen, Inverness, Fort William, Mallaig within this catalog. |

Caledonian Sleeper is excluded from board filtering at every hub/branch station it calls at within
this catalog (Aberdeen, Inverness, Fort William, Mallaig) — recorded, not silently dropped, per the
report's own verdict table and evidence URLs (report lines 53–58).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Perth (PTH) east-side "wing" vs. main station | **Not a doNotGroup case.** Report explicitly frames this as "physically one main station" (report line 19) — a platform-numbering detail, not a separate-infrastructure split. No rule built. |
| Dundee (DDE) south branch (toward Falkirk High / Central Belt) vs. future Glasgow/Edinburgh regions' scope | **Proposed, not resolved.** Report §V1 scoping and C2/C3 point 4 flag Falkirk High as an unresolved internal boundary point between this region and future Glasgow/Edinburgh regions. This pack does not decide which side of that boundary owns Falkirk High or any station between Dundee and the Central Belt — Falkirk High itself is **not** included in this catalog (it is not named in the report's own station table, only referenced as a boundary-dispute point in prose). Flagged for D2/Tim once Glasgow and Edinburgh regions are built. |
| Aberdeen (ABD) / Inverness (INV) / Fort William (FTW) / Mallaig (MLG) — ScotRail board vs. Caledonian Sleeper | **Board-eligibility filter, not a station-graph doNotGroup.** Caledonian Sleeper is excluded from these stations' boards by verdict (`out-reservation`), not grouped separately — there is no Sleeper board to group against once the filter applies. Recorded here for completeness per H6/board-eligibility linkage. |

## What I did not do

No generator, no invented station graph beyond the report's own station-name table, no ranking of
the four hub locks into a single primary + secondaries hierarchy (the report does not support one),
no resolution of the Falkirk High / Central Belt boundary dispute (explicitly out of scope per the
task brief — flagged for D2/Tim), no inclusion of Falkirk High or any Central Belt station in the
catalog, no wiring of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit, no reading of
any other city's in-progress pack.
