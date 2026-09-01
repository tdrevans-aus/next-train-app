# London & South East National Rail direction model memo (§3)

Context **today (1 Sep 2026)**: unlike every prior UK region packed (South Wales, East Midlands,
North East, West of England — one hub each), this region has **no single §3 hub**. Tim's Option A
decision means §3 (direction model) is modelled **per station group**, seven times, not once. Same
structural fact underlies all seven: Darwin has no printed route/line map — it is a per-station
real-time departure-board API, not a fixed-route product. Real-world National Rail boards label
services by **destination (headsign) and operator**, not by a line name. This is identical
reasoning to South Wales/East Midlands/North East/West of England; it just now applies to seven
groups instead of one.

## Recommendation — destination + operator, per station group

Once `DARWIN_LDB_TOKEN` exists and each group is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, e.g. `Woking (SWR)` at Waterloo, `Brighton
(Southern)` at Victoria/London Bridge, `Cambridge (Greater Anglia)` at Liverpool Street,
`Peterborough (Great Northern)` at King's Cross, `Bedford (Thameslink)` at St Pancras
International, `Reading (GWR)` at Paddington — matching how National Rail boards actually present.
**This is a recommendation only** — Darwin is blocked at the account level (hazard-pack.md H2) and
no destination strings can be verified against a live payload until Tim's RDM re-registration
completes. Do not build direction logic against guessed destination strings; confirm against a
real Darwin response first, per group, before shipping.

## Per-group §3 notes

### Waterloo — SWR
Single operator, no doNotGroup needed within the group. Destination+operator, e.g. `Woking (SWR)`,
`Southampton Central (SWR)`. Boundary point where SWR continues southwest past this catalog's
edge (West of England / Solent) is out of scope for this memo — flagged as a corridor concern in
hazard-pack.md, not a direction-model concern.

### Victoria — Southern, Gatwick Express
Same agency family (Greater Thameslink Railway); one board is appropriate — no doNotGroup.
Destination+operator distinguishes the two, e.g. `Brighton (Southern)` vs. `Gatwick Airport
(Gatwick Express)`.

### London Bridge — Southeastern / Southern / Thameslink (doNotGroup, three boards)
**Three separate boarding sections**, one per operator, per hazard-pack.md H4/H6. Each section
uses destination+operator within itself, e.g. `Ashford International (Southeastern)`, `Brighton
(Southern)`, `Bedford (Thameslink)`. Do not merge the three into one flat departure list — the
report is explicit that this station requires "separate platform logic" (report line 48).

### Liverpool Street — Greater Anglia / c2c (doNotGroup, two boards)
Two separate boarding sections. Destination+operator, e.g. `Norwich (Greater Anglia)`, `Shoeburyness
(c2c)`.

### King's Cross — Great Northern
Single named operator in this catalog (LNER excluded — hazard-pack.md H2). Destination+operator,
e.g. `Peterborough (Great Northern)`, `Cambridge (Great Northern)`. Proposed (not built)
doNotGroup boundary against St Pancras Thameslink below-ground — the two are physically separate
buildings sharing one complex name; if a future pack ever tries to fold them into one group, this
memo flags that as wrong.

### St Pancras International — Thameslink
Single named operator in this catalog (Eurostar excluded — out-checkin). Destination+operator,
e.g. `Luton Airport Parkway (Thameslink)`, `Gatwick Airport (Thameslink)`.

### Paddington — GWR
Single named operator in this catalog (Night Riviera Sleeper excluded — out-reservation).
Destination+operator, e.g. `Reading (GWR)`, `Bristol Temple Meads (GWR)`. Same corridor caveat as
Waterloo — GWR continues west past this catalog's edge; not a direction-model concern here.

### Euston — NOT MODELLED
**No direction model is proposed for Euston in this pack.** The report names "regional services"
at Euston (C2/C3 point 5) but never names the operator — not Avanti West Coast, not London
Northwestern Railway, not any TOC in the report's scope list (report lines 9, 31, 38). Modelling a
direction scheme (destination+operator or otherwise) for an unnamed operator would mean either
inventing a TOC the report doesn't confirm as in-scope, or guessing that "regional services" means
one specific real-world operator — both are exactly the kind of station-graph guess this lane is
told not to make. See hazard-pack.md H4/H6. If a future oracle pass names Euston's regional
operator and confirms its board-eligibility verdict, that operator should get the same
destination+operator treatment as the other seven groups — this is a forward note, not a model
built now.

## Why not line + terminus

Same reasoning as every prior UK NR region: none of the ten in-scope TOCs brand this corridor with
a small enumerable set of named "lines" a rider would recognise on a board (Thameslink's own
branding is closer to a corridor/route colour scheme than discrete numbered lines, and the report
gives no such names). Forcing a line+terminus model here would require inventing names the report
does not give, seven times over instead of once.

## Cross-group interchange note (not a §3 concern, flagged for Jim)

Several of these groups sit near each other geographically (King's Cross/St Pancras are effectively
one complex split by operator; London Bridge and Cannon Street/Charing Cross serve overlapping
Southeastern/Southern corridors) — but per Option A, each group is a **destination**, not an
alternate route to the same place, matching the report's framing (line 57: "A rider at Waterloo
can't 'just hop on' a Southeastern train at London Bridge; they're separate destinations"). Do not
collapse groups into one board on the strength of walking-distance proximity; that would undo the
Option A decision this whole pack is built around.
