# North East direction model memo (§3)

Context **today (31 Aug 2026)**: two agencies, and — unlike East Midlands and South Yorkshire —
a third, structurally distinct problem at Sunderland where the two agencies genuinely share a
platform. Same overall shape as East Midlands' Nottingham Station memo and South Yorkshire's
Sheffield Station memo for the Newcastle Central hub; Sunderland needs its own treatment.

## Tyne and Wear Metro

Two lines, per the oracle report (C2/C3 item 6):

| line | termini | via | stations (report count) |
| --- | --- | --- | --- |
| Yellow | St James — South Shields | converges with Green on shared central section South Gosforth–Pelaw | 41 |
| Green | Airport — South Hylton | via Sunderland; converges with Yellow on shared central section South Gosforth–Pelaw; shares track/platforms with National Rail Pelaw–Sunderland | 31 |

The report gives termini and the shared central section by name but **no full intermediate
stop-order list** for either line beyond the named hub/terminus/junction stations in its station
table. This is a real gap, same shape as East Midlands' NET gap and South Yorkshire's Supertram
gap; see hazard-pack.md and coverage notes in published-network.json.

### Recommendation — Metro: line (colour) + terminus

**Line + terminus** (example: `Yellow + South Shields`, `Green + South Hylton`, `Green +
Airport`). This matches the convention used in every reference pack (Rotterdam, Newcastle
[heavy-rail], Boston, East Midlands NET, South Yorkshire Supertram) and is the only model that
survives the two-line convergence at Newcastle Central / the shared South Gosforth–Pelaw section
without ambiguity. Do not use inbound/outbound or compass — both lines run through Newcastle
Central rather than terminating there, so "inbound" is not well-defined at the point riders would
read it.

**Caveat — the South Gosforth–Pelaw shared section:** Yellow and Green both call this corridor.
Line+terminus already disambiguates which physical service a rider is looking at (a `Yellow +
South Shields` board entry is unambiguous even at a station both lines call), so this is a named
corridor fact for the station graph, not a direction-model fork. Do not invent frequency-based
disambiguation beyond what the report names.

**Caveat — Pelaw is a junction, not a direction fork.** South of Pelaw is Green-exclusive track to
South Hylton; north of Pelaw the Green Line's track becomes shared with National Rail toward
Sunderland (report line 20). The direction label (`Green + South Hylton` / `Green + Airport`)
applies unchanged across this junction — it is an infrastructure fact (see hazard-pack.md H1/H4),
not a reason to split the Green Line's direction model.

## Sunderland — do not model as a hub-lock parent/child; do not model as ordinary line+terminus either

This is the one node in this pack that needs a genuinely different treatment from every other
locked hub across the UK wave packs built so far (Newcastle Central here, Sheffield Station in
South Yorkshire, Nottingham Station in East Midlands). Those are all **doNotGroup** cases: two
separate boarding areas under one printed name, kept apart so a board never merges them. Sunderland
is the opposite shape: **one physical platform, two legally distinct service brands** (Metro Green
Line and Northern Trains), per the report (line 16, line 39): "Green Line Metro and Northern
Trains share tracks from Pelaw to Sunderland; same platforms used by both services."

**Recommendation:** model Sunderland as a single **shared-platform through-running station**, not
as two doNotGroup'd catalog entries. A rider standing on the platform can walk up and board either
service — per `docs/board-eligibility-rule.md`'s walk-up rule, both belong on the same board,
tagged by mode/operator, not split into separate tabs the way Newcastle Central's genuinely
separate Metro/rail layers should be split. The §3 direction string for the Metro side stays
`Green + South Hylton` / `Green + Airport` as normal; the National Rail side (once unblocked)
should use destination + operator per the National Rail section below. **Do not merge the two
into one direction label** — they remain two distinct services on one shared platform, which is a
station-graph fact (single platform, single board) not a direction-model merge.

**Why this differs from the Rotherham Central precedent Nico cited:** South Yorkshire's own pack
states Rotherham Central has "no shared platform with National Rail main-line trains" for its
Tram-Train service (`docs/south-yorkshire-d1/published-network.json`, `throughRunningOnly` entry
for Rotherham Central) — i.e. Rotherham Central is a shared-*stop*, not a shared-*platform* case,
despite the North East report describing it as a comparable same-platform precedent. This pack
does not have grounds to resolve that discrepancy (out of scope — see hazard-pack.md H1) and
instead builds Sunderland strictly from what the North East report itself says about Sunderland,
which is unambiguous on the same-platform point independent of whether the Rotherham comparison
holds.

## National Rail (Darwin/OpenLDBWS) at Newcastle Central and Sunderland

Same situation as East Midlands and South Yorkshire: National Rail has **no printed route/line
map** in the oracle report — Darwin is a per-station real-time departure-board API, not a
fixed-route product. Real departure boards label services by **destination (headsign), calling
pattern, and operator** (Northern Trains named as the sole through-running operator in this
report's scope, with cross-boundary continuation onto other TOCs' territory at Berwick/Darlington
per the boundary notes), not by a line name.

### Recommendation — National Rail: destination + operator, not line + terminus

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, matching how National Rail boards actually
present themselves — **not** forced into the line+terminus shape used for Metro. Different model,
same overall reasoning as East Midlands and South Yorkshire's National Rail sections. At
Newcastle Central this coexists with doNotGroup (separate boarding areas, separate boards). At
Sunderland this coexists with the shared-platform board (same boarding area, one board, two
direction models tagged by mode/operator — see Sunderland section above).

**This is a recommendation only** — National Rail is blocked at the account level (hazard-pack
H2) and no destination strings can be verified against a live Darwin response until Tim's RDM
re-registration completes. Do not build National Rail direction logic against guessed destination
strings; confirm against a real Darwin payload first.

## Options considered (Metro)

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line (colour) + terminus** (recommend) | Yellow + South Shields | Matches reference-pack convention; disambiguates the shared South Gosforth–Pelaw section and the Newcastle Central hub without ambiguity | Full intermediate stop order not in the report (real gap, not this model's fault) |
| **B. Terminus only** | South Shields; South Hylton | Shorter | At Newcastle Central and along the shared section, riders would see both lines' termini without a line token — ambiguous |
| **C. Inbound/outbound vs Newcastle Central** | To Newcastle Central / from Newcastle Central | Simple at the hub | Both lines pass through rather than terminate at Newcastle Central — "inbound" is not well-defined; rejected on the same grounds as every reference pack |

## §3 examples (illustrative, Metro only — National Rail cannot be illustrated without a live
## Darwin payload)

Assume model A. Locked hub **Newcastle Central**.

### Newcastle Central (Yellow + Green, doNotGroup vs National Rail)

Metro Central platforms: `Yellow + South Shields` / `Yellow + St James`; `Green + South Hylton` /
`Green + Airport`. National Rail platforms: out of this illustration — destination + operator
model, no verified strings yet, and doNotGroup keeps the two boards apart.

### Sunderland (Green + National Rail, shared platform — not doNotGroup)

Metro: `Green + South Hylton` / `Green + Airport`. National Rail (Northern Trains, once
unblocked): destination + operator model, not illustrated here. Both appear on the **same**
platform/board per the shared-platform modeling note above — see hazard-pack.md H1/H2 for why
this differs from Newcastle Central's doNotGroup treatment.

### South Hylton (Green terminus, Metro-only)

`Green + Airport`. No National Rail service south of Sunderland (report line 17: "Exclusive Metro
track south of Sunderland").

### Pelaw (junction, Metro-only, no separate National Rail station)

`Green + South Hylton` / `Green + Airport`. Pelaw is named as the southern end of the shared
South Gosforth–Pelaw section (report C2/C3 item 6) and as the point where Green Line track
becomes shared with National Rail toward Sunderland (report line 20) — whether Yellow Line
services also call at Pelaw itself (vs. only sharing track up to it) is not stated explicitly in
the report; do not assume either way, flagged as a gap for Jim to confirm against GTFS. No
National Rail station exists at Pelaw itself per the report.
