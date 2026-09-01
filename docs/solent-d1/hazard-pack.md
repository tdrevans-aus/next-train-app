# Solent hazard pack (H1–H7)

Evidence: `docs/solent-d1/oracle-clash-report.md` only (this lane's sole input, per the
read-only-the-report rule). No GTFS was fetched or parsed by this pack — the Transitland National
Rail static feed is cited in the oracle report but not independently pulled here. No
`docs/united-kingdom-ledger.md` exists at time of writing (checked before starting; none found),
so no cross-region ledger constraints apply beyond what the report itself states about Westbury
and Waterloo boundaries.

## H1 — parent + child

**Unknown, not verified.** No GTFS dump was consulted, so parent/child stop relationships (e.g.
whether Southampton Central or Portsmouth Harbour have `location_type=1` parents with
platform-level children in the Transitland National Rail feed) cannot be confirmed here. Flagged
for Jim/D2 to verify against a live GTFS pull before wiring — same posture as every prior UK
National Rail region's D1 pack (Glasgow, london-se-national-rail, West of England, etc.).

doNotGroup (established from the report, not GTFS):
- **Southampton Central (SOU)** vs **Portsmouth Harbour (PMH)** — two independent termini,
  ~20 miles apart, no shared platform, different dominant corridors (South West Main Line
  west/southwest vs Portsmouth Direct Line/West Coastway east/north). Genuinely separate
  destinations, not alternate routes to the same place. Not a merge point — see H6 and
  direction-model-memo.md.
- **Portsmouth Harbour (PMH)** vs **Portsmouth & Southsea (PMS)** — both on the Portsmouth
  waterfront and on the same Portsmouth Direct Line/West Coastway corridor, but physically
  separate stations (report line 22/41: "secondary station to Portsmouth Harbour"). Not a merge
  point; treated the same way West of England treats Bristol Temple Meads/Bath Spa as separate
  hub + secondary-hub boards rather than one combined board.
- **Fareham (FAR)** and **Eastleigh (ESL)** — explicitly flagged by the report as junction
  stations, "not a merge" (report lines 24, 42-43). Through-running only; not hub candidates.
- **Westbury (WSB)** — through-running boundary to West of England region. West of England's own
  D1 pack (`docs/west-of-england-d1/published-network.json` line 74) already lists Westbury as
  "through-running only, boundary to Solent/Thames Valley regions — not a merge." This pack is
  consistent with that: Westbury is recorded here as a boundary flag only, not built as a Solent
  stationGroup, matching the reciprocal flag already present in West of England's pack.
- **Waterloo (WAT)** — through-running boundary to London & South East National Rail region.
  `docs/london-se-national-rail-d1/published-network.json` (stationGroups.waterloo.boundaryNote,
  line 54) already flags "SWR continues southwest past this catalog's edge (West of
  England/Solent region, not yet built)." This pack is the reciprocal: Waterloo is recorded as a
  boundary station only (Solent services are the outlying direction from Waterloo's perspective),
  not duplicated as a Solent stationGroup. De-dup remains a D2 concern for whichever pack wires
  the adapter second.

## H2 — clash surface

Already covered in the oracle report itself (Darwin blocked at account level; multiple operators
— SWR, Southern, GWR, CrossCountry — share single Network Rail infrastructure at Southampton
Central and the Portsmouth stations, report line 84-86). Nothing new found by this pack — no GTFS
was independently pulled to compare against the report's claims.

## H3 — thin / event / overlay

No event-only, seasonal, or overlay services named in the report for Solent. **Gap:** the report
does not give frequency/headway figures beyond "every 15 min" at Fareham (line 24); no stated
hours of operation for any service. Flag back to Nico if needed for a §3 walk-up experience — not
invented here.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Fareham (FAR) | South West Main Line (via Eastleigh, toward Southampton) vs Portsmouth Direct Line (via Havant, toward Portsmouth) | Report line 24, 42 |
| Eastleigh (ESL) | Eastleigh–Fareham Line (toward Portsmouth) vs Eastleigh–Romsey Line (north) vs South West Main Line pass-through | Report line 43 |
| Woking (implied, not in-scope detail beyond naming) | South West Main Line (toward Southampton/Weymouth) vs Portsmouth Direct Line (toward Guildford/Portsmouth) | Report line 118-119 (named as junction on both lines, no further detail given) |

These are corridor branch points on the way to the two locked hubs, not hub candidates
themselves — consistent with the report's own "junction, not a merge" framing (lines 24, 42-43).

## H5 — nested short turns

**No official short-turn or part-route working found in the report.** The report names full
corridors (South West Main Line Waterloo–Weymouth, Portsmouth Direct Line Woking–Portsmouth, West
Coastway Brighton–Southampton) but never states whether every SWR/Southern service runs the full
corridor or whether some short-terminate at an intermediate station (e.g. some SWR services
terminating at Southampton rather than continuing to Weymouth is common on this real-world route,
but the report does not confirm or describe this). Treat "no confirmed short turns" as the D1
working assumption, not a verified fact — flag to Nico for explicit per-service confirmation
before this assumption survives into a live adapter's direction/destination logic.

## H6 — inner city (where §3 lives)

**Two locked hubs, genuinely independent — not a single-hub region.**

- **Southampton Central (SOU)** — west-side hub. South West Main Line primary terminus for the
  city; SWR dominant, GWR and CrossCountry through-running, Southern local. (Report lines 20, 39.)
- **Portsmouth Harbour (PMH)** — east-side hub. Portsmouth Direct Line terminus; SWR primary,
  Southern (West Coastway), GWR through-running, ferry gateway (out-of-scope mode). (Report
  lines 21, 40.)
- **Portsmouth & Southsea (PMS)** — secondary station on the same corridor/waterfront as PMH, not
  a third independent hub. Modeled as a secondary board alongside PMH, the same pattern West of
  England uses for Bristol Temple Meads (hub) + Bath Spa (secondary hub) — see H1 and
  direction-model-memo.md for why this is not full London-SE-style Option A fragmentation.

Unlike London SE NR (6+ mutually unrelated termini necessitating a flat multi-group list with no
hierarchy) and unlike single-hub regions (South Wales, West of England), Solent's §3 has to cover
**two independent hub structures** — west (SOU alone) and east (PMH + secondary PMS) — that do not
merge with each other. This is the same judgment call Glasgow made (two independent NR groups,
"Option A at n=2") but with one side (Portsmouth) carrying an internal hub+secondary shape that
Glasgow's two groups didn't need.

## H7 — DST

**Europe/London observes DST (BST/GMT).** Solent is on UK civil time. Same as every other UK
region packed so far — do not copy any no-DST assumption from an Australian/NZ pack.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Southampton Central vs Portsmouth Harbour | Independent termini, ~20 mi apart, distinct corridors — genuinely separate destinations |
| Portsmouth Harbour vs Portsmouth & Southsea | Separate physical stations on same corridor; secondary board, not a merged board |
| Fareham / Eastleigh vs either hub | Junction/through-running stations, not hub candidates — report explicit "not a merge" |
| Westbury vs Southampton Central | Through-running boundary to West of England; reciprocally flagged in that region's pack already |
| Waterloo vs any Solent group | Through-running boundary to London & South East National Rail; reciprocally flagged in that region's pack already |
| Island Line vs Portsmouth Harbour | Board-eligibility `out-mode` (ferry dependency) vs `in` for National Rail operators at PMH |

## What I did not do

No generator, no assertion tables, no live city flip, no GTFS fetch/parse, no invented stop
order/sequence beyond what the report's tables state, no invented short-turn or frequency facts
beyond the single Fareham 15-min figure the report gives, no `docs/united-kingdom-ledger.md`
creation (none exists; flagged as overdue in every UK NR pack before this one — not this pack's
job to write), no reading of any other city's in-progress pack (West of England and london-se-
national-rail's *finished, merged* published-network.json files were read only to check
reciprocal boundary-flag consistency at Westbury/Waterloo, per the task's explicit instruction to
check those two regions for consistency — not for general context).
