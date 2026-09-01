# Cumbria direction model memo (§3)

Context **today (1 Sep 2026)**: one agency family in scope (National Rail — Northern Trains primary,
Avanti West Coast and TransPennine Express through-running, Caledonian Sleeper excluded per board
eligibility), one clear tier-1 hub lock (Carlisle) with two tier-2 secondary hubs (Oxenholme,
Barrow-in-Furness). Unlike Rest of Scotland's four co-equal hubs, Cumbria's single-hub-plus-two-
secondaries shape needs no special multi-hub adapter accommodation — same board-fetch pattern as
every single/dual-hub UK region packed so far (South Wales, West Yorkshire, Greater Manchester).

## National Rail (Darwin/OpenLDBWS) at Carlisle, Oxenholme, Barrow-in-Furness, Penrith, and branch stations

Same structural fact as every National Rail-only region packed so far: Darwin has **no printed
route/line map** — it is a per-station real-time departure-board API, not a fixed-route product.
Real-world National Rail boards label services by **destination (headsign) and operator**, not by a
line name, even though this pack's station graph is organised around five named corridors (WCML,
Settle-Carlisle, Tyne Valley, Cumbrian Coast, Lakes Line) for station-relationship purposes only.

### Recommendation — National Rail: destination + operator

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as **destination
(as returned by Darwin) + operator**, e.g. `Glasgow Central (Avanti West Coast)`,
`Leeds (Northern Trains)`, `Windermere (Northern Trains)` — matching how National Rail boards
actually present, and identical in shape to every other UK National Rail region's recommendation
(see `docs/rest-of-scotland-d1/direction-model-memo.md` and
`docs/greater-manchester-d1/direction-model-memo.md` for parallel cases).

**This is a recommendation only** — National Rail is blocked at the account level (hazard-pack H2)
and no destination strings can be verified against a live Darwin response until Tim's RDM
re-registration completes. Do not build direction logic against guessed destination strings; confirm
against a real Darwin payload first.

### §3 examples (illustrative — cannot be confirmed without a live Darwin payload)

Assume model A (destination + operator). Hub lock: **Carlisle (CAR)**. Secondary hubs:
**Oxenholme Lake District (OXO)**, **Barrow-in-Furness (BIF)**.

Illustrative destination+operator strings only (not verified against Darwin), drawn from the
report's named corridors (report lines 94–100): `Glasgow Central (Avanti West Coast)` or
`Edinburgh (Avanti West Coast)` (WCML north), `London Euston (Avanti West Coast)` (WCML south),
`Leeds (Northern Trains)` (Settle-Carlisle Line east), `Newcastle (Northern Trains)` (Tyne Valley
Line east), `Barrow-in-Furness (Northern Trains)` (Cumbrian Coast Line south/west),
`Windermere (Northern Trains)` (Lakes Line, from Oxenholme). **Placeholder — confirm every string
against a real Darwin response before shipping**; the report does not enumerate actual destination
strings, only the operator/corridor facts.

At Carlisle, all five corridors' departures appear on one board (single physical station, report
line 25) — this is not a multi-hub city the way Rest of Scotland is; one destination+operator model
covers the whole board without needing per-corridor variation.

### Caledonian Sleeper: excluded from direction modelling, not just from boards

Caledonian Sleeper carries a verdict of `out-reservation` (hazard-pack.md, Board eligibility) at
Carlisle, the only Cumbrian station it calls within this catalog. Per board-eligibility-rule.md, an
`out-reservation` service is excluded from the board entirely — it is therefore also excluded from
the direction model built here. No destination+operator string is proposed for Caledonian Sleeper;
nothing to model for a service that never appears on a board.

## Why not line + terminus (National Rail)

Same reasoning as every prior UK National Rail region: Northern/Avanti/TransPennine services at
Carlisle and secondary hubs run named corridors (West Coast Main Line, Settle-Carlisle Line, Tyne
Valley Line, Cumbrian Coast Line, Lakes Line) but are not branded on rider-facing boards as a small
enumerable set of "line names" the way a metro system is. Forcing a line+terminus model would
require inventing names the report does not give as board-facing labels — the report's line names
are corridor/route names used for station-graph description (C2/C3 point 4), not confirmed as
Darwin headsign or board vocabulary. Per the report's own instruction (C2/C3 point 12): "no
line-map generation... one direction model sufficient for all five lines."

## One hub, two secondary hubs, one shared model — no per-hub variation proposed

Unlike Greater Manchester (two agencies, cross-linked at a shared building) or Rest of Scotland
(four co-equal hubs, no clear ranking), Cumbria has one agency family and a station graph with a
clean hierarchy: Carlisle (all four/five corridors, all operators) > Oxenholme and Barrow-in-Furness
(two-line junctions, narrower operator sets) > Penrith and named branch termini (single-corridor,
narrower operator sets still). The same destination+operator model applies uniformly at every tier —
the difference between tiers is only how many operators/destinations appear per station board, not
the model shape. See `published-network.json`'s `stationGroups` for the operator set at each
station.

## Branch termini and un-catalogued stations: same model, but most stations are not built here

Windermere (WND), Kendal (KND), and Settle (SLF) — the three branch/regional stations the report
details individually beyond the hub tier — use the identical destination+operator model, narrower
operator sets (Northern Trains only at each). The **41 Cumbrian stations the report does not name
individually** are not modelled or catalogued at all in this pack (see hazard-pack.md H3) — there is
no station-graph or operator-set fact to build a direction model from for stations this pack does
not know the names or CRS codes of. This is recorded as a D2 gap, not resolved by inventing a
generic model for unnamed stations.
