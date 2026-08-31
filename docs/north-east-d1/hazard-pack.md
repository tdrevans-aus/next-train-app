# North East hazard pack (H1–H7)

Evidence: `docs/north-east-d1/oracle-clash-report.md` (Nico) only. No UK-country ledger exists
(`docs/*-ledger.md` glob has only `denmark-ledger.md`) — this pack proceeds without one, per the
country-lane doc's "region lanes read the ledger where one exists" rule, same basis as East
Midlands and South Yorkshire. No hand-transcribed passenger map beyond the report's station table
and line list is available.

## H1 — parent + child

**Newcastle Central** is a single printed name shared by two separate physical layers: the Tyne
and Wear Metro's Central Station platforms sit in a deep-tube box directly below the National
Rail main-line platforms (report line 3, line 15). **doNotGroup: Metro Central Station platforms
vs National Rail Newcastle Central platforms (NCL CRS)** — different infrastructure, different
operators (DB Regio for Nexus vs Northern Trains and other NR TOCs), different boarding areas, no
walk-through connection named in the report. Same pattern as South Yorkshire's Sheffield Station
and East Midlands' Nottingham Station hub locks (`docs/south-yorkshire-d1/hazard-pack.md` H1,
`docs/east-midlands-d1/hazard-pack.md` H1).

**Sunderland is a materially different case from Newcastle Central — not a second hub lock of the
same shape.** The report is explicit (line 16, line 39) that Metro Green Line and Northern Trains
**use the same platforms on the same track** between Pelaw and Sunderland — this is genuine
shared-infrastructure, same-boarding-area running, not a footbridge-connected two-layer building
like Newcastle Central. Nico's report names Rotherham Central (South Yorkshire) as "a comparable
precedent" for this pattern, but that precedent does not actually hold on inspection: South
Yorkshire's own pack states plainly that "Tram-Train (Supertram) also serves this stop but **no
shared platform** with National Rail main-line trains" (`docs/south-yorkshire-d1/published-
network.json`, `throughRunningOnly` note for Rotherham Central; also hazard-pack.md H2/H6).
Rotherham Central is a shared-*stop*, not a shared-*platform* case — Sunderland is the real
same-platform case, and by the report's own description ("only two stations UK-wide use same
platforms for light + heavy rail: Sunderland and Rotherham Central, South Yorkshire") this
description of Rotherham Central appears to conflict with South Yorkshire's already-built pack.
**Flagged, not resolved here:** either the North East report's characterization of Rotherham
Central is wrong, or South Yorkshire's pack under-described Rotherham's platform arrangement.
This pack does not attempt to reconcile the two — it models Sunderland strictly on what this
report says about Sunderland, and flags the cross-region inconsistency for whoever owns UK
station-graph QA.

**Sunderland modeling consequence:** because this is genuinely one shared boarding area (not two
separate infrastructures under one printed name), **doNotGroup is the wrong instrument here** —
doNotGroup exists to keep two *separate* boarding areas from being merged into one board; Sunderland
is the opposite problem, one physical platform serving two legally distinct service brands (Metro
Green Line, light rail; Northern Trains, heavy rail) that must **not be double-counted as two
arrivals for the same physical train**, and must **not be split onto two separate mode tabs** the
way Newcastle Central's two layers should be. Modeled here as a single **shared-platform
through-running station** entry, distinct in kind from both the Newcastle Central hub lock and
South Yorkshire's Meadowhall through-running/infrastructure-switch point (which is a genuine
switch-of-infrastructure case, not a shared-platform case). See `sunderlandSharedPlatform` in
`published-network.json` and the direction-model-memo caveat.

## H2 — clash surface

Restated from the report (lines 26–33): no product `lib/cities/north-east/` exists. Two distinct
hazards:

1. **Metro real-time: no confirmed public feed (schedule-only skip risk, not an account block).**
   No GTFS-RT or documented public real-time API found for Tyne and Wear Metro. An unofficial API
   exists at metro-rti.nexus.org.uk but is undocumented and appears to serve the Nexus Pop app
   only — not a usable public source (report §V1 scoping, line 7; C2/C3 item 10). Static GTFS is
   confirmed via the DFT Bus Open Data aggregator (`f-bus~dft~gov~uk`, no key, verified 31 Aug
   2026). v1 ships Metro as **schedule-only**, source confirmed for static only.
2. **National Rail account-level blocker (same as the rest of the UK wave).** Darwin/OpenLDBWS is
   documented and technically live, but blocked at the account level — EvansAppStudio's Rail Data
   Marketplace registration is Australian; RDM's geography check rejects AU registrations for GB
   services. Tim is re-registering with a UK address. Same blocker as West Midlands / Greater
   Manchester / Liverpool City Region / East Midlands / South Yorkshire — **not a feed problem**.
   Build the catalog normally; the region stays "Coming Soon" (`status: "planned"`) until
   `DARWIN_LDB_TOKEN` exists.

A third, structurally distinct hazard sits alongside these two: **Sunderland's shared-platform
arrangement (H1 above) means that once National Rail is unblocked, the Sunderland board cannot be
built as "Metro tab + National Rail tab" the way Newcastle Central can — it needs a single mixed
board with per-service mode/operator tagging, or it will silently double-show or mis-split
arrivals for the same physical platform.** This is a v1 scoping note for Jim, not something this
pack resolves (Metro RT doesn't exist yet either, so the mixed-board problem is not live-testable
until both feeds exist).

## H3 — thin / event / overlay

**Gap, not resolved:** the oracle report gives no information on short turns, peak extras, or
event-only stops for Metro or National Rail in this region (e.g. no mention of St James
event-day workings for Newcastle United fixtures, though St James is the Yellow Line terminus
nearest St James' Park). Nothing to report here beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Newcastle Central | Metro Central (deep tube) vs National Rail (main platforms) | Report line 3, line 15 — separate infrastructure, no walk-through named |
| Sunderland | Metro Green Line vs National Rail Northern Trains, **same platform** | Report line 16, line 39 — genuine shared-platform case, see H1; not a doNotGroup case, see modeling note |
| Pelaw | not a branch point in the doNotGroup sense — junction only | Report line 20: "through-running junction only... No separate National Rail station at Pelaw Junction itself." Metro-exclusive south of Pelaw to South Hylton; shared track north of Pelaw to Sunderland. |

Yellow Line and Green Line converge on a shared central section, South Gosforth–Pelaw (report
line 41/C2 item 6). The report does not give the exact interlining detail (how frequently each
line's trains run, or whether they share physical track or just corridor) beyond naming the
shared section — treat this as a named shared corridor, not a modelled junction with frequency
detail, absent further data.

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for Metro or National Rail.
Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

Locked hub: **Newcastle Central** (report C2/C3 item 2: "Newcastle Central (NCL CRS) is the hub
lock (Metro + rail, separate platforms, distinct infrastructure, separate boarding areas)").
doNotGroup applies here, same pattern as South Yorkshire's Sheffield Station and East Midlands'
Nottingham Station.

**Sunderland is a locked name too** (appears in both Metro and National Rail contexts, report
line 16, line 39) but is explicitly **not** a hub-lock parent/child case the way Newcastle Central
is — see H1 for why doNotGroup is the wrong instrument and what to use instead.

**Pelaw** is a Metro-only station and a through-running junction fact for the station graph, not
a second hub or a doNotGroup case — no separate National Rail station exists there per the
report.

## H7 — DST

North East England is in the UK, timezone **Europe/London**, which **observes DST** (BST in
summer, GMT in winter). UK-wide fact, stated here so Jim doesn't have to re-derive it —
consistent with East Midlands and South Yorkshire H7.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Metro Central (Newcastle Central) vs National Rail (Newcastle Central) | Deep-tube Metro platforms directly below main rail platforms, different operators, no walk-through named |
| north-east vs rest-of-scotland (Berwick-upon-Tweed) | Berwick-upon-Tweed is National Rail only, England's northernmost ECML station, Scotland boundary (report line 21, C2/C3 item 8). No Rest-of-Scotland pack exists yet to check against — flag as unresolved boundary, not a merge concern within this pack's own catalog. |
| north-east vs east-midlands (Darlington) | Report flags Darlington (DRL) explicitly as a boundary candidate needing Luke-stage clarification (line 22, C2/C3 item 9) — East Midlands' own oracle report and pack do not mention Darlington at all (checked: no match in `docs/east-midlands-d1/*.md` or `*.json`). **Unresolved — excluded from this pack's catalog rather than guessed into either region.** |

**Darlington resolution check:** searched `docs/east-midlands-d1/oracle-clash-report.md`,
`hazard-pack.md`, `direction-model-memo.md`, and `published-network.json` for "Darlington" —
no match. East Midlands' through-running station list (Tamworth, Leicester, Kettering,
Wellingborough, Chesterfield, Alfreton) does not include Darlington. This means the North East
report's own suggested boundary owner (East Midlands) does not claim Darlington either — the
boundary is genuinely open, not just under-flagged on one side. Per the task brief, this stays
flagged as unresolved rather than assigned by guess. Darlington is **not included** in this
pack's `published-network.json` station list.

## What I did not do

No generator, no invented Metro GTFS-RT feed or route_id (none confirmed — a real gap, flagged
not filled), no invented intermediate stop order beyond what the report's line descriptions name,
no de-dup logic for the Scotland boundary (Berwick-upon-Tweed) or the Darlington/East Midlands
boundary — both flagged unresolved, not guessed, no reconciliation of the Rotherham
Central/Sunderland precedent inconsistency in South Yorkshire's already-merged pack (flagged for
whoever owns UK station-graph QA, not edited here), no wiring of `DARWIN_LDB_TOKEN`, no product
edit, no `lib/providers/` edit, no `registry.js` edit.
