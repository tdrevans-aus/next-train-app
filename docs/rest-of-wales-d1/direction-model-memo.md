# Rest of Wales direction model memo (§3)

Context **today (1 Sep 2026)**: single agency in this report — National Rail
(Darwin/OpenLDBWS), operated in-franchise by Transport for Wales — across three geographic
corridors. Unlike South Wales, there is no second agency to leave unmodelled; the only open
question is whether real-time data can be confirmed at all (hazard-pack.md H2), not whether a
second network exists.

## National Rail (Darwin/OpenLDBWS) at Wrexham General

Same structural fact as every National Rail-only region packed so far (South Wales, East
Midlands, North East, West of England): Darwin has **no printed route/line map** — it is a
per-station real-time departure-board API, not a fixed-route product. Real-world National Rail
boards label services by **destination (headsign) and operator**, not by a line name.

### Recommendation — National Rail: destination + operator

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, e.g. `Holyhead (TfW)`, `Manchester Piccadilly
(TfW)`, `Birmingham International (CrossCountry)` — matching how National Rail boards actually
present, and identical in shape to the South Wales, East Midlands, North East, and West of England
recommendations (see `docs/south-wales-d1/direction-model-memo.md` for the parallel case).

**This is a recommendation only** — National Rail is blocked at the account level (hazard-pack H2)
and no destination strings can be verified against a live Darwin response until Tim's RDM
re-registration completes. Do not build direction logic against guessed destination strings;
confirm against a real Darwin payload first. This applies with extra force here: even once the
account unblocks, whether TfW's real-time data is actually present in Darwin's OpenLDBWS response
for these specific services is itself unconfirmed (hazard-pack H2, point 2) — a further reason no
destination string below can be treated as anything but illustrative.

### §3 examples (illustrative — cannot be confirmed without a live Darwin payload)

Assume model A. Locked hub **Wrexham General (WRX)**.

Illustrative destination+operator strings only (not verified against Darwin), drawn from the
report's named corridors and route directions (report lines 17, 81):
- North Wales Coast Line direction: `Holyhead (TfW)`, `Bangor (TfW)`.
- North Wales Main Line / Borderlands direction: `Manchester Piccadilly (TfW)`, `Liverpool Lime
  Street (TfW)` (via Bidston/Borderlands Line, report line 17).
- Cross-border through-running: `Birmingham International (CrossCountry)` (report lines 17, 42,
  58, "CrossCountry ... may call Wrexham").

**Placeholder — confirm every string against a real Darwin response before shipping**; the report
does not enumerate actual destination strings, only the operator/corridor facts.

Aberystwyth (AYW) and Carmarthen (CMN) are named as corridor-significant stations but not
hub-locked (hazard-pack H6); no §3 illustration is given for them beyond noting they would follow
the same destination+operator model once built — e.g. an illustrative Cambrian Line string such as
`Aberystwyth (TfW)` observed *from* Machynlleth or Welshpool, not a confirmed value.

Chester (CTR) and Shrewsbury (England pass-through points, report lines 30–31, 92–93) are
through-running-only, not catalog stations for Rest of Wales — no §3 illustration given for them,
same treatment as South Wales' Severn Tunnel Junction boundary point.

## Why not line + terminus (National Rail)

Same reasoning as South Wales and West of England: National Rail through-running across the three
Rest of Wales corridors is served by a mix of TfW regional services and (potentially)
CrossCountry/GWR through services, not a small enumerable set of branded "line names" a rider
would recognise on a board. The report's route names (North Wales Coast Line, Cambrian Line, West
Wales lines) describe corridors for scoping purposes, not passenger-facing board line names —
forcing a line+terminus model would require inventing labels the report does not give as
board-displayed text.

## No second agency to leave unmodelled

Unlike South Wales (Valley Lines) or East Midlands-style two-layer cases, this report names only
one agency across all three corridors — Transport for Wales operating National Rail services under
Darwin (report line 3). There is no separate closed commuter network requiring a different
line+terminus treatment here. If the TfW real-time-feed-status question (hazard-pack H2, point 2)
resolves to "TfW publishes its own GTFS-RT distinct from Darwin," that would be a *feed-source*
question, not a *direction-model* question — the destination+operator recommendation above would
still apply, since the report gives no evidence TfW brands these services differently from how
National Rail boards elsewhere present.
