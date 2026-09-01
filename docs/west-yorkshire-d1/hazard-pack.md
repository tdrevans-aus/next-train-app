# West Yorkshire hazard pack (H1–H7)

Evidence: `docs/west-yorkshire-d1/oracle-clash-report.md` (Nico) only. No UK-country ledger
exists yet for this lane (`docs/*-ledger.md` glob has only `docs/denmark-ledger.md` — no
`united-kingdom-ledger.md`). `docs/south-yorkshire-d1/published-network.json` and
`docs/south-yorkshire-d1/hazard-pack.md` were read once, per the boundary-consistency instruction
in this task, only to check treatment of the shared Denby Dale boundary station so this pack
doesn't contradict it — not as a source of West Yorkshire station-graph fact.

**Caveat on the report header dismissed:** the oracle report's own header line ("Zoe may already
be working this region through Luke, verify before starting") is confirmed stale per this task's
brief — not held on.

## H1 — parent + child

One agency in scope: **National Rail** (Darwin/OpenLDBWS). No parent/child agency structure —
unlike South Wales (Valley Lines + National Rail) or South Yorkshire (Supertram + National Rail),
West Yorkshire's oracle report scopes only National Rail for D1; buses are deferred and WY Metro
light rail is planning-only, not a built network (report §"V1 scoping", C2/C3 point 8). No
parent/child relationship to record.

## H2 — clash surface

**One blocker, same shape as every other UK National Rail region packed so far:** Darwin/
OpenLDBWS is documented and technically live but **blocked at the account level** — EvansAppStudio's
Rail Data Marketplace registration is Australian; RDM's geography check rejects AU registrations
for GB services (report lines 9, 32, 46). Tim's UK re-registration is the unblock path, same as
East Midlands / North East / West of England / South Wales / South Yorkshire / West Midlands /
Greater Manchester / Liverpool City Region. Not a feed problem — build the National Rail catalog
normally; region stays `status: "planned"` until `DARWIN_LDB_TOKEN` exists.

Buses (First West Yorkshire, Arriva Yorkshire, Transdev) have a static-only DFT aggregator feed,
no confirmed real-time — report explicitly defers bus to a later wave (report line 9, C2/C3 point
6). Out of scope for this pack's catalog; not modelled at all here (mode cut, not a per-service
gap).

## H3 — thin / event / overlay

**Gap, not resolved.** The report gives no information on short turns, peak extras, or event-only
stops. Nothing to report beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Leeds Station (LDS) | Airedale Line (toward Keighley/Bradford Forster Square), Calder Valley Line (toward Halifax/Todmorden/Hebden Bridge/Walsden), Penistone Line via Huddersfield (toward Denby Dale) | Report station table (lines 17–26): corridors named by destination, not by branch topology at Leeds itself. No junction-level detail given beyond corridor names — do not invent a branch graph finer than what the report states. |
| Huddersfield (HUD) | "Penistone Line hub" per report line 22 — branch point toward Denby Dale/South Yorkshire | Report names Huddersfield as the Penistone Line hub explicitly; no further junction detail (platform numbers, other branches) given. |

No doNotGroup candidate is built from branch structure alone — see doNotGroup proposals below for
the two candidates the report does support (hub-vs-secondary-hub, rail-vs-bus/coach).

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn service codes given. Flag only — nothing to
encode.

## H6 — inner city (where §3 lives)

Locked hub: **Leeds Station (LDS)** — report line 17: "hub lock — major interchange, 18 platforms
(0–17). Network Rail. Central hub for West Yorkshire Metro transit authority." Report C2/C3 point
1 confirms: "Leeds Station (LDS) is the hub lock (rail only; bus connections at separate
interchange)."

Secondary hub: **Bradford Forster Square (BDQ)** — report line 18: "secondary hub — main Bradford
rail station. Network Rail. Connected to Bradford Interchange (BDI) by walk-link (bus/rail
interchange)." Report C2/C3 point 2 confirms BDQ as secondary hub, explicitly separate from BDI.

**Bradford Interchange (BDI)** is a distinct station, not a merge with BDQ — report line 19:
"through-running point, not merge — serves both bus (city-centre coach station) and rail (Northern
Trains services). Separate from BDQ platform infrastructure." Walk-link only (report line 18).

## H7 — DST

West Yorkshire is in the UK, timezone **Europe/London**, which **observes DST** (BST in summer,
GMT in winter). Same UK-wide fact as every other UK region packed so far (East Midlands, North
East, West of England, South Wales, South Yorkshire H7).

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Leeds Station: National Rail platforms vs. bus/coach interchange | Report C2/C3 point 3: "doNotGroup Leeds Station rail vs bus/coach platforms. Different operators, different boarding areas, different real-time feeds (none for bus yet)." Bus is out of D1 scope entirely, so this is a forward note (nothing to group against yet in this pack) rather than a built rule — recorded so Jim doesn't merge a future bus board into the rail board at Leeds. |
| Bradford Forster Square (BDQ) vs. Bradford Interchange (BDI) | Report C2/C3 point 2: "Bradford Forster Square (BDQ) and Bradford Interchange (BDI) are separate; walk-link only, not shared platform. Do not merge BDQ rail + BDI bus — separate infrastructure." Both are catalog entries in this pack (BDI carries Northern Trains rail service per report line 19, so it is in National Rail scope, not just bus) — doNotGroup applies between them as two distinct stations, not a hub/satellite pair. |

## Boundary de-dup, consistent with South Yorkshire's pack

| candidate | reason |
| --- | --- |
| Denby Dale (DDL) vs. South Yorkshire's own Denby Dale entry | This report (line 20, C2/C3 point 4/5) names Denby Dale as the West Yorkshire side of the Penistone Line boundary, with CRS code DDL. `docs/south-yorkshire-d1/published-network.json` already carries Denby Dale in its own `throughRunningOnly` list (CRS left as `null`, "code not given in the oracle report — do not guess"), flagged there as a D2 de-dup concern with West Yorkshire (south-yorkshire-d1/hazard-pack.md line 104, jim-handoff.md line 136). This pack keeps Denby Dale as **through-running-only, not a merge point**, consistent with South Yorkshire's treatment — same station, two regions' catalogs, D2 reconciliation needed (which region's entry survives, or whether both keep it as through-running-only permanently). **Not resolved here** — flagged for D2/Jim, same open shape as South Wales' STJ-vs-Chepstow discrepancy. |
| Walsden (WAD) — Greater Manchester boundary | Report line 21, C2/C3 point 4/5: Calder Valley Line crosses into Rochdale District (Greater Manchester); Walsden is the last West Yorkshire-side station before Manchester Victoria-bound services continue. No Greater Manchester D1 pack exists yet to cross-check against (Greater Manchester is still account-blocked/unpacked per report line 32) — this pack records Walsden as through-running-only and flags the eventual de-dup need for whenever Greater Manchester is packed, rather than guessing at that pack's contents. |

## What I did not do

No generator, no invented bus station graph or direction model (buses are deferred, no feed to
model against), no West Yorkshire Metro light rail catalog entry (planning-only, not D1-live per
report C2/C3 point 8), no resolution of the Denby Dale or Walsden cross-region de-dup (flagged
above for D2/Jim), no resolution of the OpenLDBWS redistribution-terms ambiguity (open item for
Tim, same as other UK regions), no wiring of `DARWIN_LDB_TOKEN`, no product edit, no
`lib/providers/` edit, no reading of any other city's in-progress pack (South Yorkshire's
**merged, finished** pack was read once for the Denby Dale boundary check only, per the task
brief's explicit instruction to do so).
