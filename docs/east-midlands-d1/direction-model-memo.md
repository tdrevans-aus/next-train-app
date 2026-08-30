# East Midlands direction model memo (§3)

Context **today (31 Aug 2026)**: two separate direction-model problems in one hub, because
this region has two agencies with two different printed-network shapes.

## NET tram (Nottingham Express Transit)

Two lines, both call Nottingham Station:

| line | termini |
| --- | --- |
| Line 1 | Hucknall — Beeston/Chilwell (via city centre) |
| Line 2 | Phoenix Park — city centre |

No Line 3 passenger service (report line 38). No intermediate-stop ordering is available from
the oracle report — **this table is termini-only**; see hazard-pack H4/H5 for the gap.

### Recommendation — NET: line + terminus

**Line + terminus** (example: `Line 1 + Hucknall`, `Line 1 + Beeston/Chilwell`, `Line 2 +
Phoenix Park`). This matches the pattern used in every reference pack (Rotterdam, Newcastle,
Boston) and is the only model that survives a two-line hub without ambiguity. Do not use
inbound/outbound or compass — Nottingham Station is not the geographic centre of either line's
run and "inbound" reads false for testers standing at either terminus.

**Caveat:** because the report gives no intermediate stop list, this recommendation cannot yet be
validated against a mid-line station (e.g. does Line 1 and Line 2 share track anywhere besides
"city centre"?). Jim should pull the DFT Bus Open Data GTFS (already confirmed live, no key) at
D2 to get the actual ordered stop sequence and confirm line+terminus still reads correctly at
every stop, not just the termini and the hub.

## National Rail (Darwin/OpenLDBWS) at Nottingham Station

National Rail has **no printed route/line map** in the oracle report — Darwin is a per-station
real-time departure-board API, not a fixed-route product. Real-world National Rail departure
boards label services by **destination (headsign), calling pattern, and operator**, not by a
line name — there is no "Line 1"-equivalent to key off.

### Recommendation — National Rail: destination + operator, not line + terminus

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, matching how National Rail boards actually
present themselves, **not** forced into the line+terminus shape used for NET. This is a
different model from NET's, in the same hub — that's expected, not a bug, because they're
different products (fixed-route light rail vs a real-time heavy-rail board), and doNotGroup
already keeps their platforms separate (see hazard-pack H1/H6).

**This is a recommendation only** — National Rail is blocked at the account level (see
hazard-pack H2) and no destination strings can be verified against a live Darwin response until
Tim's RDM re-registration completes. Do not build the National Rail direction logic against
guessed destination strings; confirm against a real Darwin payload first.

## Options considered (NET)

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Line 1 + Hucknall | Matches reference-pack convention; unambiguous at a two-line hub | Cannot yet be verified past the termini/hub (no intermediate stop list) |
| **B. Terminus only** | Hucknall; Phoenix Park | Shorter | At Nottingham Station, four termini across two lines share the board with no line token — ambiguous |
| **C. Inbound/outbound vs Nottingham Station** | To Nottingham Station / from Nottingham Station | Simple at the hub | False everywhere else on each line; also collides with the "hub is not the geographic middle" problem |

## §3 examples (illustrative, NET only — National Rail cannot be illustrated without a live Darwin payload)

Assume model A. Locked hub **Nottingham Station**.

### Nottingham Station (both NET lines + National Rail, doNotGroup)

NET tram platforms: `Line 1 + Hucknall` / `Line 1 + Beeston/Chilwell`; `Line 2 + Phoenix Park`
(Line 2's other end is "city centre" per the report — not a confirmed terminus name distinct
from Nottingham Station itself; flag for Jim to confirm against GTFS before using it as a §3
label). National Rail platforms: out of this illustration — destination + operator model, no
verified strings yet.

### Hucknall (Line 1 terminus)

`Line 1 + Beeston/Chilwell`. No Line 2. No National Rail (not a through-running or hub station
per the report).

### Phoenix Park (Line 2 terminus)

`Line 2 + city centre` — **placeholder wording**; confirm the actual printed opposite-end label
against NET's own site or the GTFS `trip_headsign` before shipping this as a §3 string. The
report only says "Phoenix Park — city centre," which is not obviously the same string a rider
would see on a physical tram display.
