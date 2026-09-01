# Rest of Scotland direction model memo (§3)

Context **today (1 Sep 2026)**: one agency family in scope (National Rail, with ScotRail as
primary regional TOC and Caledonian Sleeper / CrossCountry / LNER through-running), but **four**
tier-1 hub stations rather than the single hub every prior UK region pack has modelled at. This
memo covers all four (Perth, Inverness, Aberdeen, Dundee) with one shared model — the multi-hub
structure does not change the direction model itself, only which stations it applies at.

## National Rail (Darwin/OpenLDBWS) at Perth, Inverness, Aberdeen, Dundee

Same structural fact as every National Rail-only region packed so far (East Midlands, North East,
West of England, South Wales, West Yorkshire, South Yorkshire): Darwin has **no printed route/line
map** — it is a per-station real-time departure-board API, not a fixed-route product. Real-world
National Rail boards label services by **destination (headsign) and operator**, not by a line name.

### Recommendation — National Rail: destination + operator

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, e.g. `Inverness (ScotRail)`,
`London Euston (Caledonian Sleeper)` (if ever surfaced — see exclusion note below),
`Edinburgh (CrossCountry)`, `London King's Cross (LNER)` — matching how National Rail boards
actually present, and identical in shape to every other UK National Rail region's recommendation
(see `docs/west-yorkshire-d1/direction-model-memo.md` for the parallel case).

**This is a recommendation only** — National Rail is blocked at the account level (hazard-pack H2)
and no destination strings can be verified against a live Darwin response until Tim's RDM
re-registration completes. Do not build direction logic against guessed destination strings;
confirm against a real Darwin payload first.

### §3 examples (illustrative — cannot be confirmed without a live Darwin payload)

Assume model A (destination + operator). Four locked hubs: **Perth (PTH)**, **Inverness (INV)**,
**Aberdeen (ABD)**, **Dundee (DDE)**.

Illustrative destination+operator strings only (not verified against Darwin), drawn from the
report's named corridors (report lines 19–22, C2/C3 point 2): `Inverness (ScotRail)`,
`Aberdeen (ScotRail)`, `Glasgow Queen Street (ScotRail)` (Perth cross-country direction),
`Edinburgh (CrossCountry)`, `London King's Cross (LNER)` (Inverness Highland Chieftain direction).
**Placeholder — confirm every string against a real Darwin response before shipping**; the report
does not enumerate actual destination strings, only the operator/corridor facts.

Because this catalog has four hubs rather than one, the same destination string can plausibly
appear at more than one hub board (e.g. an Aberdeen-bound service passing through both Dundee and
Perth on different legs) — this is expected of a corridor network and is not, by itself, a
doNotGroup signal; each hub's board shows its own local departures, not a merged network view.

### Caledonian Sleeper: excluded from direction modelling, not just from boards

Caledonian Sleeper carries a verdict of `out-reservation` (hazard-pack.md, Board eligibility) at
every station it calls within this catalog (Aberdeen, Inverness, Fort William, Mallaig). Per
board-eligibility-rule.md, an `out-reservation` service is excluded from the board entirely — it is
therefore also excluded from the direction model built here. No destination+operator string is
proposed for Caledonian Sleeper; nothing to model for a service that never appears on a board.

## Why not line + terminus (National Rail)

Same reasoning as every prior UK National Rail region: ScotRail/CrossCountry/LNER services at
Perth, Inverness, Aberdeen, Dundee run named corridors (Highland Main Line, Aberdeen–Inverness
line, Far North Line, etc.) but are not branded on rider-facing boards as a small enumerable set of
"line names" the way, say, a metro system is. Forcing a line+terminus model would require inventing
names the report does not give as board-facing labels — the report's line names (Highland Main
Line, Tayside line, Kyle of Lochalsh line, Far North Line, West Highland Line) are corridor/route
names used for station-graph description, not confirmed as Darwin headsign or board vocabulary.

## Four hubs, one shared model — no per-hub variation proposed

Unlike South Wales (National Rail vs. unmodelled Valley Lines) or East Midlands (rail vs. tram),
there is no second product type here requiring a different direction model at a subset of hubs —
all four locked hubs (Perth, Inverness, Aberdeen, Dundee) carry the same agency mix (ScotRail +
some combination of CrossCountry / LNER / Caledonian Sleeper) and the same destination+operator
recommendation applies uniformly. See `published-network.json`'s `nationalRailStations.hubs` array
for which through-running operators call at which hub.

## Branch termini: same model, narrower operator set

Kyle of Lochalsh, Thurso, Wick (ScotRail only) and Mallaig, Fort William (ScotRail + Caledonian
Sleeper, Sleeper excluded per above) use the identical destination+operator model — there is no
structural reason to model branch termini differently from hubs; the difference is only in how
many operators appear per station, not the model shape.
