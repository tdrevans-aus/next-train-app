# West of England direction model memo (§3)

Context **today (31 Aug 2026)**: single agency, single direction-model problem (unlike East
Midlands' two-agency, two-model hub). National Rail (Darwin/OpenLDBWS) is the only mode in scope
— no light rail, no metro, no buses (report line 22, C2/C3 point 7).

## National Rail (Darwin/OpenLDBWS) at Bristol Temple Meads / Bath Spa

National Rail has **no printed route/line map** in the oracle report — Darwin is a per-station
real-time departure-board API, not a fixed-route product (same structural fact as every National
Rail-only region packed so far: East Midlands, North East). Real-world National Rail departure
boards label services by **destination (headsign), calling pattern, and operator**, not by a line
name — there is no "Line 1"-equivalent to key off, and GWR's own printed network map is a
corridor (London Paddington–Bristol–Bath–Exeter–Penzance) rather than a set of named branded
lines.

### Recommendation — National Rail: destination + operator

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, matching how National Rail boards actually
present themselves — e.g. `London Paddington (GWR)`, `Cardiff Central (TfW)`, `Nottingham
(CrossCountry)`, `Southampton Central (SWR)`. This mirrors the East Midlands National Rail
recommendation exactly (see `docs/east-midlands-d1/direction-model-memo.md`), because it is the
same product (Darwin) presenting the same way regardless of region.

**This is a recommendation only** — National Rail is blocked at the account level (see
hazard-pack H2) and no destination strings can be verified against a live Darwin response until
Tim's RDM re-registration completes. Do not build the direction logic against guessed destination
strings; confirm against a real Darwin payload first.

## Why not line + terminus

Unlike NET (East Midlands) or a metro/tram system with a small fixed set of named lines, GWR's
West of England services run a single corridor with multiple calling patterns (fast/semi-fast/
stopping) and multiple operators sharing track at the boundary stations (Chepstow, Gloucester,
Westbury, Taunton — report §station table). There is no small enumerable set of "line names" a
rider would recognise on a board; "destination + operator" is what actually appears. Forcing a
line+terminus model here would require inventing line names the report does not give and that do
not exist on real GWR departure boards.

## Options considered

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Destination + operator** (recommend) | London Paddington (GWR) | Matches how Darwin/real departure boards present; consistent with East Midlands' National Rail recommendation | Cannot be verified against a live payload until `DARWIN_LDB_TOKEN` exists |
| **B. Line + terminus** | (no line names exist) | N/A | GWR does not brand West of England services with line names on this corridor — would require invention, which this pack does not do |
| **C. Inbound/outbound vs hub** | To Bristol Temple Meads / from Bristol Temple Meads | Simple at BRI | False at Bath Spa and every boundary station; also loses operator distinction at Chepstow/Gloucester/Westbury/Taunton where multiple operators share track |

## §3 examples (illustrative — cannot be confirmed without a live Darwin payload)

Assume model A. Locked hub **Bristol Temple Meads (BRI)**, secondary hub **Bath Spa (BTH)**.

### Bristol Temple Meads (BRI, hub lock)

Illustrative destination+operator strings only (not verified against Darwin):
`London Paddington (GWR)`, `Bath Spa (GWR)`, `Cardiff Central (TfW)`, `Penzance (GWR)`,
`Nottingham (CrossCountry)`, `Southampton Central (SWR)`. **Placeholder — confirm every string
against a real Darwin response before shipping**; the report does not enumerate actual destination
strings, only the operator/corridor facts.

### Bath Spa (BTH, hub secondary)

`Bristol Temple Meads (GWR)`, `London Paddington (GWR)`. Report line 16 gives an 11–19 min
frequency to Bristol Temple Meads but no other destination strings — do not invent beyond what's
given.

### Boundary stations (Chepstow / Gloucester / Westbury / Taunton)

Out of scope for a §3 illustration in this pack — these are through-running-only stations, not
hub/secondary locks (report §station table, C2/C3 point 4). Direction model at these stations
would still be destination+operator once built, but no destination strings are given or invented
here.
