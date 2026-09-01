# Greater Anglia direction model memo (§3)

Context **today (2026-09-01)**: single primary agency, single direction-model problem at every
in-scope station — no two-agency, two-model hub like East Midlands' Nottingham Station, and no
multi-terminus problem like London & South East. National Rail (Darwin/OpenLDBWS) is the only
mode in scope.

## National Rail (Darwin/OpenLDBWS) at Norwich / Cambridge / Ipswich / Peterborough / etc.

National Rail has **no printed route/line map** in the oracle report — Darwin is a per-station
real-time departure-board API, not a fixed-route product (same structural fact as every National
Rail-only region packed so far: East Midlands, West of England). Real-world Greater Anglia
departure boards label services by **destination (headsign), calling pattern, and operator**, not
by a line name — there is no "Line 1"-equivalent to key off, and Greater Anglia's own printed
network map shows radiating branches from Norwich rather than a set of named branded lines.

### Recommendation — National Rail: destination + operator

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, matching how National Rail boards actually
present themselves — e.g. `London Liverpool Street (Greater Anglia)`, `Cambridge (Greater
Anglia)`, `King's Cross (Thameslink)`, `Birmingham New Street (CrossCountry)`. This mirrors the
East Midlands and West of England National Rail recommendations exactly, because it is the same
underlying product (Darwin) presenting the same way regardless of region.

**This is a recommendation only** — National Rail real-time is blocked at the account level (see
hazard-pack H2) and no destination strings can be verified against a live Darwin response until
Tim's RDM re-registration completes. Do not build the direction logic against guessed destination
strings; confirm against a real Darwin payload first.

## Why not line + terminus

Greater Anglia does not brand its East Anglia services with named lines the way NET (East
Midlands' tram) does. Its network is a hub-and-branches shape radiating from Norwich (Norwich–
Cambridge, Norwich–Great Yarmouth, Norwich–Lowestoft, Great Eastern Main Line to Liverpool
Street via Ipswich/Colchester, West Anglia Main Line to King's Lynn/Stansted/Bishops Stortford)
with multiple calling patterns (fast/semi-fast/stopping) rather than a small enumerable set of
line names a rider would recognise on a board. Forcing a line+terminus model here would require
inventing line names the report does not give and that do not exist on real Greater Anglia
departure boards.

## Two secondary hubs, one direction model — not a special case

Unlike East Midlands (two agencies, two direction models sharing one hub), Cambridge and Ipswich
both use the **same** destination+operator model as Norwich — there is no East Midlands-style
"two-layer hub" problem here, because both secondary hubs are single-agency-primary (Greater
Anglia) stations where through-running operators (Thameslink at Cambridge; none confirmed at
Ipswich beyond Greater Anglia itself) already pass the walk-up board-eligibility test and so
appear on the same destination+operator board rather than requiring a separately-modelled layer.
Peterborough, though multi-operator, is likewise destination+operator throughout — LNER is simply
excluded from the board (undecided verdict), not modelled as a separate layer requiring its own
direction scheme.

## Options considered

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Destination + operator** (recommend) | London Liverpool Street (Greater Anglia) | Matches how Darwin/real departure boards present; consistent with East Midlands and West of England National Rail recommendations | Cannot be verified against a live payload until `DARWIN_LDB_TOKEN` exists |
| **B. Line + terminus** | (no line names exist) | N/A | Greater Anglia does not brand East Anglia services with line names — would require invention, which this pack does not do |
| **C. Inbound/outbound vs Norwich** | To Norwich / from Norwich | Simple at the hub | False at Cambridge, Ipswich, and every branch terminus; also loses operator distinction at Peterborough where multiple operators share track |

## §3 examples (illustrative — cannot be confirmed without a live Darwin payload)

Assume model A. Locked hub **Norwich (NRW)**, secondary hubs **Cambridge (CBG)** and **Ipswich
(IPS)**.

### Norwich (NRW, hub lock)

Illustrative destination+operator strings only (not verified against Darwin):
`London Liverpool Street (Greater Anglia)`, `Cambridge (Greater Anglia)`, `Great Yarmouth
(Greater Anglia)`, `Lowestoft (Greater Anglia)`, `Peterborough (Greater Anglia)`. **Placeholder —
confirm every string against a real Darwin response before shipping**; the report does not
enumerate actual destination strings, only the corridor/branch facts.

### Cambridge (CBG, secondary hub)

`Norwich (Greater Anglia)`, `London Liverpool Street (Greater Anglia)`, `Ipswich (Greater
Anglia)`, `King's Cross (Thameslink)`, `Peterborough (Greater Anglia)`. Thameslink appears on the
same board as Greater Anglia — no separate layer, per the "two secondary hubs, one direction
model" note above.

### Ipswich (IPS, secondary hub)

`Norwich (Greater Anglia)`, `London Liverpool Street (Greater Anglia)`, `Cambridge (Greater
Anglia)`, `Peterborough (Greater Anglia)`. No through-running operator distinct from Greater
Anglia is documented at Ipswich in the report — single-operator destination+operator board.

### Peterborough (PBO, through-running boundary — not a hub)

`Ipswich (Greater Anglia)`, `Ely (Greater Anglia)`, `King's Cross (Thameslink)`, `Birmingham New
Street (CrossCountry)`, `Nottingham (East Midlands)`. LNER destinations are **excluded** from
this illustration — undecided board-eligibility verdict, see hazard-pack H4 and
published-network.json `excludedOperators`.

### Branch termini (King's Lynn, Thetford, Great Yarmouth, Lowestoft, Stansted Airport, Bishops
Stortford, Diss, Wymondham)

Out of scope for a §3 illustration in this pack — these are branch-terminus/regional stations,
not hub/secondary locks (report §station table). Direction model at these stations would still be
destination+operator once built, but no destination strings are given or invented here.
