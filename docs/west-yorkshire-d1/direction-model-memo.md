# West Yorkshire direction model memo (§3)

Context **today (1 Sep 2026)**: one agency in scope — **National Rail** (Darwin/OpenLDBWS). Bus is
deferred (no v1 real-time source, report §"V1 scoping") and West Yorkshire Metro light rail is
planning-only, not built (report C2/C3 point 8) — neither is modelled below.

## National Rail (Darwin/OpenLDBWS) at Leeds Station / Bradford Forster Square

Same structural fact as every National Rail-only region packed so far (East Midlands, North East,
West of England, South Wales, South Yorkshire): Darwin has **no printed route/line map** — it is a
per-station real-time departure-board API, not a fixed-route product. Real-world National Rail
boards label services by **destination (headsign) and operator**, not by a line name.

### Recommendation — National Rail: destination + operator

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, e.g. `Manchester Piccadilly (TransPennine
Express)`, `Sheffield (Northern)`, `London King's Cross (LNER)` — matching how National Rail
boards actually present, and identical in shape to the East Midlands, North East, West of England,
South Wales, and South Yorkshire recommendations (see
`docs/south-yorkshire-d1/direction-model-memo.md` for the parallel case).

**This is a recommendation only** — National Rail is blocked at the account level (hazard-pack H2)
and no destination strings can be verified against a live Darwin response until Tim's RDM
re-registration completes. Do not build direction logic against guessed destination strings;
confirm against a real Darwin payload first.

### §3 examples (illustrative — cannot be confirmed without a live Darwin payload)

Assume model A. Locked hub **Leeds Station (LDS)**. Secondary hub **Bradford Forster Square
(BDQ)**.

Illustrative destination+operator strings only (not verified against Darwin), drawn from the
report's named operators and corridors (report lines 22–26, 32, 43): `Manchester Piccadilly
(TransPennine Express)` (Calder Valley Line direction, via Halifax/Todmorden/Walsden), `Sheffield
(Northern)` (Penistone Line direction, via Huddersfield/Denby Dale), `Skipton (Northern)` (Airedale
Line direction, via Keighley), `London King's Cross (LNER)`. **Placeholder — confirm every string
against a real Darwin response before shipping**; the report does not enumerate actual destination
strings, only the operator/corridor facts (report C2/C3 points 4, 5).

Denby Dale (South Yorkshire boundary) and Walsden (Greater Manchester boundary) are
through-running-only points, not hubs — no §3 illustration given for either, same treatment as
South Wales' and South Yorkshire's boundary stations.

## Why not line + terminus (National Rail)

Same reasoning as every other UK National Rail pack: West Yorkshire's National Rail corridors
(Calder Valley Line, Airedale Line, Penistone Line) are named informally in the report as
geographic corridor labels, not as a small enumerable set of branded "line names" a rider would
see on a departure board — Northern Trains and TransPennine Express both run services across these
corridors under destination-labelled boards, not line-branded ones (report lines 22–26 name the
corridors descriptively, e.g. "Calder Valley Line" as a geographic descriptor in the station
table's `class` column, not as a boardable product name). Forcing a line+terminus model would
require inventing names the report does not give as printed board labels.

## Buses and West Yorkshire Metro: NOT MODELLED

**No direction model is proposed for buses or WY Metro light rail in this pack.**

- **Buses** (First West Yorkshire, Arriva Yorkshire, Transdev): report §"V1 scoping" and C2/C3
  point 6 explicitly defer bus to a later wave — static GTFS only via the DFT aggregator, no
  confirmed real-time source. Building a direction model against a static-only, fragmented
  multi-operator feed with no confirmed real-time path is out of this pack's v1 scope by the
  report's own instruction, not a gap this pack is silently leaving.
- **West Yorkshire Metro light rail:** report C2/C3 point 8 — "Mass-transit project is in planning
  (published Strategic Outline Case March 2024); no passenger rail lines open yet." There is no
  network to model a direction scheme against; nothing to build.

If bus real-time ever emerges (report C2/C3 point 6 asks Nico/Viv to confirm with the operators)
or WY Metro opens, each needs its own follow-up oracle-clash pass and Luke pack, not a retrofit of
this file.
