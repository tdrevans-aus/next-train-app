# South Wales direction model memo (SS3)

**Rewritten 7 Sep 2026** against the re-scoped `docs/south-wales-d1/oracle-clash-report.md`.
Supersedes the 1 Sep 2026 version, which modelled National Rail only and explicitly left Valley
Lines unmodelled pending a feed confirmation. That confirmation has since landed (Darwin,
live-probed 5 Sep 2026) - this memo now covers both.

## Two direction models, one feed

Both Transport for Wales Valley Lines and National Rail mainline/through-running ride the single
Darwin/OpenLDBWS feed (hazard-pack.md H2), but they are structurally different products on a
departure board and get different direction models, same split West of England and every other
UK region uses between a branded closed network and open-ended mainline through-running.

## Valley Lines: line + terminus (termini-only model)

**Recommendation: line + terminus**, using the six named line termini as the terminus label -
**not a full stop-order model**. The report gives six closed, branded commuter routes radiating
from Cardiff (report D1 summary, line 17: "six commuter rail lines radiating from Cardiff
Central"), each named by its terminus in the station table:

| Line (inferred from terminus) | Terminus station | CRS |
| --- | --- | --- |
| Merthyr line | Merthyr Tydfil | MER |
| Aberdare line | Aberdare | ABA |
| Rhondda line | Treherbert | TRB |
| Rhymney line | Rhymney | RHY |
| Coryton line | (not in this 16-station catalog - not live-probed, no CRS confirmed) | - |
| Ebbw Vale line | (not in this 16-station catalog - not live-probed, no CRS confirmed) | - |

Termini-only, not a full 81-stop model, because: (1) the report's own catalog note (line 50)
recommends a ~15-25 station v1, explicitly deferring "intermediate Valley Lines halts on the six
main lines" and other secondary-tier stations (Pengam, Nantgarw, Taff's Well, Ebbw Vale Town) to a
later expansion; (2) no full stop-order was live-probed or given in the report for any line beyond
its terminus and known junctions (CDF, CDQ, PPD, CPH); (3) inventing an 81-stop order from a route
name list alone is exactly the "guess at a station graph" this lane is told not to do (same
reasoning the 1 Sep 2026 memo already gave for why Valley Lines wasn't modelled at all - the
termini-only model here is the minimum step forward the newly-confirmed feed supports, not a full
retraction of that caution). Coryton and Ebbw Vale termini are **not** in this pack's 16-station
catalog (no CRS in the report's live-probed table) - do not invent CRS codes for them; treat as a
gap for a future catalog-expansion pass, same posture as the report's own secondary-tier note.

Junction/hub stations on the Valley Lines network (Cardiff Central, Cardiff Queen Street,
Pontypridd, Caerphilly) are catalogued as **hub/plain stations in their own right**, not folded
into any single line's terminus label - a rider at CDQ or PPD sees a junction board (multiple line
directions), not a single-line terminus board.

## National Rail mainline/through-running: destination + operator

Same model as every National Rail-only UK region packed so far (East Midlands, North East, West
of England, Solent, etc.) - Darwin has no printed route/line map, it is a per-station real-time
departure-board API. Real-world National Rail boards label services by **destination (headsign)
and operator**, not by a line name.

**Recommendation:** destination (as returned by Darwin) + operator, e.g. `London Paddington
(GWR)`, `Manchester Piccadilly (TfW)`, `Bristol Temple Meads (CrossCountry)` - once wired, verify
every destination string against a live Darwin payload (`scripts/probe-uk-board.mjs`) rather than
the illustrative names below.

### SS3 examples (illustrative only - confirm against a live Darwin payload before shipping)

Assume model A (destination + operator) for mainline stations; model B (line + terminus,
termini-only) for Valley Lines. Locked hub **Cardiff Central (CDF)**; secondary hub **Cardiff
Queen Street (CDQ)**.

Illustrative destination+operator strings drawn from the report's named corridors (D1 summary
line 17, C2/C3 point 4): `London Paddington (GWR)`, `Bristol Temple Meads (GWR)`, `Manchester
Piccadilly (TfW)` (North Wales/Wrexham direction), `Swansea (GWR)`. **Placeholder - confirm every
string against a real Darwin response before shipping**; the report's line 9 live probe confirms
trip *counts* at each CRS (e.g. CDF 15 trips) but does not enumerate destination strings.

Illustrative line+terminus labels for Valley Lines: `Merthyr Tydfil` (Merthyr line), `Rhondda -
Treherbert`, `Rhymney` (Rhymney line), `Aberdare` (Aberdare line). Same placeholder caveat -
confirm against a live Darwin payload's `trip_headsign`/destination field before shipping; the
report's operator column ("TfW Valley Lines (Merthyr line only)" etc.) supports the terminus
label but not a verified on-board display string.

Severn Tunnel Junction (STJ) is a through-running-only point, not a hub - no SS3 illustration
given for it, consistent with the ledger's Chepstow/STJ resolution (hazard-pack.md doNotGroup
proposals) and every other UK region's boundary-station treatment.

## Why not line + terminus for National Rail mainline

Same reasoning as every prior UK National Rail region: mainline through-running at Cardiff Central
and Newport runs corridors (London/Bristol via Severn Tunnel; North Wales via Wrexham; West Wales
via Swansea) served by multiple operators (GWR, CrossCountry, TfW), not a small enumerable set of
branded "line names" a rider would recognise on a board. Forcing a line+terminus model here would
require inventing names the report does not give.

## Why termini-only (not full stop-order) for Valley Lines

Valley Lines *is* a closed, branded, six-route commuter network - the shape that would normally
warrant a full line+terminus model with intermediate stops (per the 1 Sep 2026 memo's own forward
note: "Valley Lines is a branded, closed six-route commuter network unlike National Rail's
operator-mixed corridor, so line+terminus is the right target shape once there is a feed to
confirm it against"). The feed now exists (Darwin), but the report only live-probed and named 16
stations total, four of them Valley Lines junctions (CDF, CDQ, PPD, CPH) and four termini (MER,
ABA, TRB, RHY) - it does not give the ~70 intermediate-halt stop order needed for a full model.
Termini-only is the model this evidence actually supports; a future catalog-expansion pass (report
line 50's secondary tier) is the place to add intermediate stops and complete the full stop-order
model, not this pack.
