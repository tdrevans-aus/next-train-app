# Southwest direction model memo (§3)

Context **today (1 Sep 2026)**: single agency, single direction-model problem (unlike East
Midlands' two-agency, two-model hub). National Rail (Darwin/OpenLDBWS) is the only mode in scope
— no light rail, no metro, no buses (report line 65, C2/C3 point 10).

## National Rail (Darwin/OpenLDBWS) at Exeter St Davids / Plymouth / Penzance

National Rail has **no printed route/line map** in the oracle report — Darwin is a per-station
real-time departure-board API, not a fixed-route product (same structural fact as every National
Rail-only region packed so far: East Midlands, North East, West of England, London & South East
National Rail). Real-world National Rail departure boards label services by **destination
(headsign), calling pattern, and operator**, not by a line name — there is no "Line 1"-equivalent
to key off, and GWR's own printed network map is a corridor
(London Paddington–Bristol–Exeter–Plymouth–Penzance) rather than a set of named branded lines.

### Recommendation — National Rail: destination + operator

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, matching how National Rail boards actually
present themselves — e.g. `London Paddington (GWR)`, `Nottingham (CrossCountry)`,
`Penzance (GWR)`. This mirrors the West of England / East Midlands / London & South East National
Rail recommendations exactly (see `docs/west-of-england-d1/direction-model-memo.md`), because it
is the same product (Darwin) presenting the same way regardless of region.

**This is a recommendation only** — National Rail is blocked at the account level (see
hazard-pack H2) and no destination strings can be verified against a live Darwin response until
Tim's RDM re-registration completes. Do not build the direction logic against guessed destination
strings; confirm against a real Darwin payload first.

## Why not line + terminus

Unlike NET (East Midlands) or a metro/tram system with a small fixed set of named lines, GWR's
Southwest services run a single corridor (Cornish Main Line / Riviera Line branding exists on
GWR's own network map, per report line 16, 21, but the report does not give these as boardable
"line" identifiers riders would key departures off — they are geographic branch names for the
station table, not a direction-model input) with multiple calling patterns and one through-running
operator (CrossCountry) sharing track at the hub stations. There is no small enumerable set of
"line names" a rider would recognise on a board in the sense a line+terminus model requires;
"destination + operator" is what actually appears. Forcing a line+terminus model here would
require inventing line-as-direction semantics the report does not support.

## Options considered

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Destination + operator** (recommend) | Penzance (GWR) | Matches how Darwin/real departure boards present; consistent with every other UK National Rail region packed so far | Cannot be verified against a live payload until `DARWIN_LDB_TOKEN` exists |
| **B. Line + terminus** | (Riviera Line / Cornish Main Line to Penzance) | N/A | Report uses "Riviera Line" and "Cornish Main Line" only as geographic branch labels in the station table (lines 16, 20-23), not as rider-facing boardable direction identifiers — would require inventing a direction semantics the report doesn't give |
| **C. Inbound/outbound vs hub** | To Exeter St Davids / from Exeter St Davids | Simple at EXD | False at Plymouth (secondary hub, not the single reference point) and Penzance (terminus, one-directional only); also loses operator distinction where CrossCountry shares track with GWR |

## §3 examples (illustrative — cannot be confirmed without a live Darwin payload)

Assume model A. Locked hub **Exeter St Davids (EXD)**, secondary hub **Plymouth (PLY)**,
terminus **Penzance (PNZ)**.

### Exeter St Davids (EXD, hub lock)

Illustrative destination+operator strings only (not verified against Darwin):
`London Paddington (GWR)`, `Plymouth (GWR)`, `Penzance (GWR)`, `Nottingham (CrossCountry)`,
`Bristol Temple Meads (GWR)`. **Placeholder — confirm every string against a real Darwin response
before shipping**; the report does not enumerate actual destination strings, only the
operator/corridor facts.

### Plymouth (PLY, hub secondary)

`Exeter St Davids (GWR)`, `Penzance (GWR)`, `London Paddington (GWR)`,
`Manchester Piccadilly (CrossCountry)`. Report line 16 gives a 30–60 min frequency to Exeter St
Davids and a direct service to Penzance but no other destination strings — do not invent beyond
what's given.

### Penzance (PNZ, terminus)

`London Paddington (GWR)`, `Exeter St Davids (GWR)`. One-directional terminus (report line 17,
67: "no further through-running"); Night Riviera Sleeper also terminates here but is excluded
(`out-reservation`, see hazard-pack.md) and must not appear in any §3 destination list once the
adapter is wired.

### Boundary station (Taunton)

Out of scope for a §3 illustration in this pack — through-running-only station, not a hub/
secondary/terminus lock (report §station table, C2/C3 point 5). Direction model at this station
would still be destination+operator once built, but no destination strings are given or invented
here.
