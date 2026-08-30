# East Midlands hazard pack (H1–H7)

Evidence: `docs/east-midlands-d1/oracle-clash-report.md` (Nico, redone from scratch 31 Aug 2026
after the untracked-file wipe; no other source read). No hand-transcribed passenger map is in
the report — NET line topology is termini-only (two lines, no intermediate stop order); National
Rail has no printed route/line map at all (Darwin is a per-station real-time board product, not a
route map). Both gaps are called out below rather than guessed.

## H1 — parent + child

Nottingham Station is a **single hub name shared by two separate physical layers**: the NET tram
platforms sit on a viaduct above the National Rail main-line platforms, connected by a footbridge
(report §D1 summary, line 3; station table, line 15). **doNotGroup: NET tram platforms at
Nottingham Station vs National Rail platforms at Nottingham Station (NOT CRS)** — different
infrastructure, different operators (Keolis-operated NET tram vs Keolis East Midlands Trains
regional rail), different boarding areas, only a footbridge connecting them.

**Tamworth** is a genuine shared-platform case but it is **not** an East Midlands D1 parent/child
concern — it's a cross-region National Rail platform shared with West Midlands (report line 16,
line 41). Flagging here for the record only: this is a **D2 de-dup boundary**, to be resolved
once/if West Midlands also ships a D1 pack, not something this pack's station graph needs to
model. Do not build any Tamworth merge logic into the East Midlands catalog.

## H2 — clash surface

Restated from the report (lines 27–31): no product `lib/cities/east-midlands/` exists yet. NET
has no confirmed real-time feed (schedule-only v1, static GTFS via DFT Bus Open Data Service, no
key). National Rail (Darwin/OpenLDBWS) is documented and technically live but **blocked at the
account level** — EvansAppStudio's Rail Data Marketplace registration is Australian and RDM's
geography check rejects AU registrations for GB services; Tim is re-registering with a UK
address. This is the same blocker affecting West Midlands / Greater Manchester / Liverpool City
Region and is **not a feed problem** — build the catalog and (later) adapter normally; the region
simply stays "Coming Soon" (`status: "planned"` in `registry.js` terms — there is no separate
"coming soon" status value) until `DARWIN_LDB_TOKEN` exists.

## H3 — thin / event / overlay

**Gap, not resolved:** the oracle report gives no information on short turns, peak extras,
event-only stops, or overlay services for either NET or National Rail in this region. Nothing to
report here beyond: do not invent any. If Nico's report is re-run or extended, this section
should be revisited.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Nottingham Station | NET tram (viaduct) vs National Rail (main platforms) | Report line 3, line 15 — footbridge connect, separate infrastructure |

NET's two lines (Line 1 Hucknall–Beeston/Chilwell, Line 2 Phoenix Park–city centre) both call
Nottingham Station but the report gives no junction/branch detail beyond that — **no other branch
points are documented**. Do not assume a shared-track junction exists between Line 1 and Line 2
beyond the city-centre corridor; the report does not describe one.

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for NET or National Rail.
Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

Locked hub: **Nottingham Station** (report line 36: "Nottingham Station (NOT CRS) is the hub
lock (tram + rail, separate platforms, footbridge connect)"). This is a **two-layer hub** — NET
tram and National Rail rail are separately-locked printed names that happen to share one station
building/complex. Do not collapse them into a single stop entity in the app; doNotGroup applies
here just as it does at hub locks in other cities (cf. Rotterdam Beurs vs Rotterdam Centraal
NS-vs-metro pattern, Brussels Arts-Loi/Kunst-Wet).

## H7 — DST

Nottingham / East Midlands is in the UK, timezone **Europe/London**, which **observes DST**
(BST in summer, GMT in winter). Not to be treated as a no-DST region. This is a UK-wide fact, not
specific to this report, but stated here so Jim doesn't have to re-derive it.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| east-midlands vs west-midlands | Separate cities/regions; Tamworth shared National Rail platform is a D2 concern, not a D1 merge |
| NET tram (Nottingham Station) vs National Rail (Nottingham Station) | Viaduct vs main platforms, footbridge connect, different operators |
| NET Line 1 vs NET Line 2 | Distinct termini, no confirmed shared branch beyond report's city-centre mention |
| National Rail through-running stations (Leicester, Kettering, Wellingborough, Chesterfield, Alfreton) vs adjacent-region feeds | Same operator continuing across boundary — routing/filter concern, not a merge point (report line 41) |

## What I did not do

No generator, no invented station-order for NET Line 1 / Line 2 (report only gives termini — a
real gap, flagged not filled), no invented National Rail line/route topology (Darwin has no
printed route map to transcribe — it's a per-station real-time board product), no de-dup logic
for Tamworth (that's a D2 concern for a future West Midlands pack, not this one), no attempt to
resolve the OpenLDBWS redistribution-terms ambiguity (open item for Tim, see jim-handoff.md), no
wiring of `DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit.
