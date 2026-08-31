# South Yorkshire hazard pack (H1–H7)

Evidence: `docs/south-yorkshire-d1/oracle-clash-report.md` (Nico) only. No UK-country ledger
exists yet (`docs/*-ledger.md` glob has only `denmark-ledger.md`) — this pack proceeds without
one, per the country-lane doc's "region lanes read the ledger where one exists" rule, same as
East Midlands. No hand-transcribed passenger map beyond the report's station table and line
list is available.

## H1 — parent + child

**Sheffield Station** is a single hub name shared by two separate physical layers: Supertram
tram platforms sit on a viaduct above the National Rail main-line platforms, connected by a
footbridge (report §D1 summary, line 3; station table, line 15). **doNotGroup: Supertram tram
platforms at Sheffield Station vs National Rail platforms at Sheffield Station (SHF CRS)** —
different infrastructure, different operators (South Yorkshire Future Tram Limited vs National
Rail TOCs — EMR/Northern/TPE/CrossCountry), different boarding areas, only a footbridge
connecting them. This is the same pattern as East Midlands' Nottingham Station two-layer hub
(`docs/east-midlands-d1/hazard-pack.md` H1) and Rotterdam Beurs/Centraal, Brussels
Arts-Loi/Kunst-Wet.

**Meadowhall Interchange (MHS CRS)** is a second, distinct case: Supertram Tram-Train switches
onto National Rail infrastructure at Meadowhall South/Tinsley to continue toward Rotherham
Central and Parkgate. Report line 16 explicitly calls this a **through-running point, not a
merge** — Supertram and National Rail "share same platform area but separate
operators/infrastructure." Do not model Meadowhall as a second hub lock; it is a
through-running/infrastructure-switch point, distinct from the Sheffield Station hub lock.

## H2 — clash surface

Restated from the report (lines 27–32): no product `lib/cities/south-yorkshire/` exists. Two
distinct hazards, of different kinds:

1. **Supertram operator-transition gap (genuine skip risk, not the usual account block).**
   Sheffield Supertram changed operators on 22 March 2024 — Stagecoach (which previously
   published TransXChange/NetEx open data) handed over to **South Yorkshire Future Tram Limited
   (SYFTL)**, an arm's-length public-authority subsidiary of South Yorkshire Mayoral Combined
   Authority. **No public GTFS feed has been confirmed under the new operator**, and whether the
   old Stagecoach data-sharing terms carry over to SYFTL is unconfirmed (report §License,
   lines 49–55: license confidence `unclear`). This is a distinct hazard class from the National
   Rail account block below — it is not "Tim needs to re-register," it is "no confirmed feed
   exists at all, under any account." Flagged clearly, not guessed around: Supertram ships v1
   as **schedule-only, source TBD**, pending confirmation from SYFTL/SYMCA. A live departures
   board exists (livetrams.azurewebsites.net) but has no documented API and no GTFS-RT — it is
   not a usable machine-readable source for this pack.
2. **National Rail account-level blocker (same as the rest of the UK wave).** Darwin/OpenLDBWS
   is documented and technically live, but blocked at the account level — EvansAppStudio's Rail
   Data Marketplace registration is Australian; RDM's geography check rejects AU registrations
   for GB services. Tim is re-registering with a UK address. Same blocker as West Midlands /
   Greater Manchester / Liverpool City Region / East Midlands — **not a feed problem**. Build the
   catalog normally; the region stays "Coming Soon" (`status: "planned"`) until
   `DARWIN_LDB_TOKEN` exists. This part is already-accepted per the task brief — not re-flagged
   as a blocker here beyond noting it alongside hazard 1 for completeness.

## H3 — thin / event / overlay

**Gap, not resolved:** the oracle report gives no information on short turns, peak extras,
event-only stops (e.g. Sheffield Arena event workings), or overlay services for either Supertram
or National Rail in this region. Nothing to report here beyond: do not invent any.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Sheffield Station | Supertram tram (viaduct) vs National Rail (main platforms) | Report line 3, line 15 — footbridge connects, separate infrastructure |
| Meadowhall Interchange | Supertram Tram-Train (switches to NR infrastructure) vs National Rail | Report line 16 — through-running point, not a merge; shared platform area but separate operators/infrastructure |

Purple line has a documented branch to Gleadless Townend (report line 39: "Purple
(Sheffield Station—Herdings Park via city centre/Manor Top; branches to Gleadless Townend)").
Blue line also calls at Gleadless Townend en route Malin Bridge—Halfway (line 39). The report
does not give the exact junction point or track-sharing detail beyond naming both lines as
serving Gleadless Townend — treat this as a shared-stop, not a modelled junction, absent further
detail. Do not assume a shared-track junction beyond what's named.

## H5 — nested short turns

**Not documented in the report.** No nested/short-turn codes given for Supertram or National
Rail. Flag only — nothing to encode.

## H6 — inner city (where §3 lives)

Locked hub: **Sheffield Station** (report line 37: "Sheffield Station (SHF CRS) is the hub lock
(tram + rail, separate platforms, viaduct/footbridge connect)"). Two-layer hub — Supertram tram
and National Rail rail are separately-locked printed names sharing one station complex.
doNotGroup applies here, same pattern as East Midlands' Nottingham Station
(`docs/east-midlands-d1/hazard-pack.md` H6).

**Meadowhall Interchange** is a locked name too (it appears in both Supertram and National Rail
station lists, report line 16, line 43) but is explicitly **not** a hub-lock parent/child case —
it's a through-running/infrastructure-switch point. Keep it as its own catalog entry, separate
from the Sheffield Station hub-lock logic.

## H7 — DST

Sheffield / South Yorkshire is in the UK, timezone **Europe/London**, which **observes DST**
(BST in summer, GMT in winter). UK-wide fact, stated here so Jim doesn't have to re-derive it —
consistent with East Midlands H7.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Supertram tram (Sheffield Station) vs National Rail (Sheffield Station) | Viaduct vs main platforms, footbridge connects, different operators |
| Supertram Tram-Train (Meadowhall) vs National Rail (Meadowhall) | Through-running/infrastructure-switch point, shared platform area but separate operators/infrastructure — not a merge |
| south-yorkshire vs west-yorkshire | Separate regions; Denby Dale / Darton / South Elmsall / Moorthorpe are National Rail boundary stations that may appear in both regions' feeds — D2 de-dup concern, not a D1 merge (report line 42) |
| south-yorkshire vs east-midlands | Chesterfield is East Midlands' station, not South Yorkshire's — already flagged from the East Midlands side (`docs/east-midlands-d1/hazard-pack.md` H4/doNotGroup table lists Chesterfield as a through-running-only station in that pack's own catalog). South Yorkshire's `published-network.json` does not include Chesterfield as a catalog stop — see H1/coverage note below, to avoid contradicting the East Midlands pack. |

**Chesterfield consistency check:** `docs/east-midlands-d1/published-network.json` already lists
Chesterfield (CHD) under East Midlands' `nationalRailStations.throughRunningOnly`. The South
Yorkshire oracle report (line 42) notes Chesterfield "is not in South Yorkshire proper but may be
served by through-running services" — consistent with East Midlands' framing, not a duplicate
claim. This pack does **not** add Chesterfield to South Yorkshire's station list, to avoid two
regions independently owning the same catalog entry. If a future de-dup pass is needed, it
belongs to whichever region actually verifies stop-level data for Chesterfield (East Midlands
already has), not South Yorkshire.

## What I did not do

No generator, no invented Supertram GTFS feed or route_id (none confirmed under SYFTL — a real
gap, flagged not filled), no invented intermediate stop order beyond what the report's line
descriptions name, no de-dup logic for the West Yorkshire boundary stations (Denby Dale/
Darton/South Elmsall/Moorthorpe — D2 concern), no Chesterfield entry in South Yorkshire's
catalog (owned by East Midlands' pack instead, per the consistency check above), no wiring of
`DARWIN_LDB_TOKEN`, no product edit, no `lib/providers/` edit, no `registry.js` edit.
