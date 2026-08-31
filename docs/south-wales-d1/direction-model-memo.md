# South Wales direction model memo (§3)

Context **today (1 Sep 2026)**: two agencies in the report, but only **one** can be modelled at
all in this pack — Transport for Wales Valley Lines has no confirmed public feed to derive a
direction model from (see hazard-pack.md H2). This memo covers National Rail only; Valley Lines is
explicitly left unmodelled below rather than guessed at.

## National Rail (Darwin/OpenLDBWS) at Cardiff Central

Same structural fact as every National Rail-only region packed so far (East Midlands, North East,
West of England): Darwin has **no printed route/line map** — it is a per-station real-time
departure-board API, not a fixed-route product. Real-world National Rail boards label services by
**destination (headsign) and operator**, not by a line name.

### Recommendation — National Rail: destination + operator

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, e.g. `London Paddington (GWR)`,
`Manchester Piccadilly (TfW)`, `Nottingham (CrossCountry)` — matching how National Rail boards
actually present, and identical in shape to the East Midlands, North East, and West of England
recommendations (see `docs/west-of-england-d1/direction-model-memo.md` for the parallel case).

**This is a recommendation only** — National Rail is blocked at the account level (hazard-pack H2)
and no destination strings can be verified against a live Darwin response until Tim's RDM
re-registration completes. Do not build direction logic against guessed destination strings;
confirm against a real Darwin payload first.

### §3 examples (illustrative — cannot be confirmed without a live Darwin payload)

Assume model A. Locked hub **Cardiff Central (CDF)**.

Illustrative destination+operator strings only (not verified against Darwin), drawn from the
report's named through-running directions (line 19, C2/C3 points 5 and 7): `London Paddington
(GWR)`, `Bristol Temple Meads (GWR)`, `Manchester Piccadilly (TfW)` (North Wales/Wrexham
direction), `Portsmouth Harbour (CrossCountry)`. **Placeholder — confirm every string against a
real Darwin response before shipping**; the report does not enumerate actual destination strings,
only the operator/corridor facts (report C2/C3 point 7: "North Wales through-running... background
context only, not a D1 scope point").

Severn Tunnel Junction (STJ) is a through-running-only point, not a hub — no §3 illustration given
for it, same treatment as West of England's boundary stations.

## Why not line + terminus (National Rail)

Same reasoning as West of England: National Rail through-running at Cardiff Central runs a
corridor (London / Bristol direction via Severn Tunnel; North Wales direction via Wrexham) served
by multiple operators, not a small enumerable set of branded "line names" a rider would recognise
on a board. Forcing a line+terminus model would require inventing names the report does not give.

## Transport for Wales Valley Lines: NOT MODELLED

**No direction model is proposed for Valley Lines in this pack.** The report names six routes by
terminus (Merthyr, Rhondda, Aberdare, Coryton, Ebbw Vale, Taffy Vale — report C2/C3 point 6), which
might look like ready-made line+terminus material, but:

- There is no confirmed feed (static or real-time) to validate that these six names are what a
  real TfW departure board or timetable actually displays as a "line."
- The 81-station list behind them is sourced from Wikipedia and explicitly marked "pending
  verification against official TfW operator map" (report line 29) — not verified station-level
  data.
- Building a direction model on top of an unverified station list and an unconfirmed feed would be
  exactly the kind of "guess at a station graph" this lane is told not to do.

If TfW confirms a public GTFS/GTFS-RT feed (see `docs/outreach-drafts/south-wales.md`), a follow-up
pack should model Valley Lines as **line + terminus** (six named routes, matching a real
GTFS `route_short_name`/`trip_headsign` pair once one exists) rather than destination+operator —
Valley Lines is a branded, closed six-route commuter network unlike National Rail's operator-mixed
corridor, so line+terminus is the right target shape *once there is a feed to confirm it against*.
This is a forward note for whoever picks up Valley Lines later, not a model built now.
