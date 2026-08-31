South Wales D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is
unblocked AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("south-wales") must fail** (city is not in `lib/providers/registry.js` CITIES
today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
south-wales live from this pack. Do not invent city=southwales, city=cardiff, or
city=valley-lines. Do not touch West Midlands, Greater Manchester, Liverpool City Region, East
Midlands, North East, or West of England — same account-level National Rail blocker, but separate
regions/packs.

Lane lock: acquired `United Kingdom` / `South Wales` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/south-wales-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Scope decision: Transport for Wales Valley Lines is EXCLUDED from this pack

**This is the key thing to know before touching this city.** The oracle report flagged Valley
Lines' feed status as "high skip risk, verify before D1 pack stage." That verification did not
resolve to a yes — TfW does not publish a public GTFS static feed, a GTFS-RT feed, or any other
public API. The only documented channel is direct contact (data@tfw.wales) for TransXChange-format
timetable files, and the report's confidence rating on every TfW license/feed question is
`not found`. An outreach draft already exists (`docs/outreach-drafts/south-wales.md`, written by
Viv) asking TfW to confirm feed availability, but as of this pack no reply is recorded.

Given that, this pack does **not** build a Valley Lines station graph, direction model, or catalog
entry. Building one would mean either fabricating a feed that doesn't exist or importing an
unverified 81-station Wikipedia list (report line 29: "pending verification against official TfW
operator map") as if it were confirmed station-level data — both are exactly what this lane is
told not to do.

**published-network.json therefore covers National Rail only** (Cardiff Central hub, Severn
Tunnel Junction through-running boundary point). It is a legitimate, complete pack for the scope
it covers — not a partial/broken one. Valley Lines is a clean gap, not a silent omission: see
`scopeNote` and `coverageGaps` in published-network.json, and the "NOT MODELLED" section of
direction-model-memo.md.

**If/when TfW replies to the outreach draft and confirms a feed exists:** this needs a fresh Nico
oracle-clash pass scoped to Valley Lines specifically (station-level verification against an
official TfW map, not Wikipedia; actual GTFS route/trip data once available), then a follow-up
Luke pack — not a retrofit of this file. Do not wire a Valley Lines adapter off this pack as it
stands.

## National Rail scope (the part this pack does cover)

One agency in scope: **National Rail** — Darwin/OpenLDBWS, technically documented and live but
**blocked at the account level** (EvansAppStudio's RDM registration is Australian; Tim is
re-registering with a UK address). Same blocker as West Midlands / Greater Manchester / Liverpool
City Region / East Midlands / North East / West of England and **not a feed problem** — the
catalog below is built normally per Nico's instruction; only `DARWIN_LDB_TOKEN` wiring waits.

Unlike West of England, National Rail here does have a reference static GTFS dump (Transitland,
CC-BY-2.0 UK, verified live 31 Aug 2026 per the oracle report) — so the "Darwin-only, no static
base layer at all" open product question raised in West of England's pack does not apply here in
the same form. This pack still does not build a catalog *from* that GTFS dump (station list is
taken directly from the oracle report's station name table, per the read-only-the-report rule) —
flagging its existence only so Jim knows a schedule-only fallback path may be more viable here than
in West of England, if that's ever wanted before Darwin unblocks.

## Hub lock

**Cardiff Central (CDF)** is the locked hub — interchange between Valley Lines and National Rail
through-running services (London/Bristol direction via Severn Tunnel Junction; North Wales
direction via Wrexham/Welsh Marches Line). Explicitly not Cardiff Queen Street, not Cardiff Bay,
not Pontypridd (report C2/C3 point 2). Shared physical station with Valley Lines on separate
infrastructure (footbridge connect) — proposed doNotGroup between the two agencies' boards if
Valley Lines ever gets a feed; not built now since there's no Valley Lines board to group against.
See hazard-pack.md H1/H6.

## Boundary discrepancy: Severn Tunnel Junction vs. Chepstow — NOT resolved, flag for D2

This report names **Severn Tunnel Junction (STJ)** as the Wales-England through-running boundary
point (report line 20, C2/C3 point 5). West of England's already-merged pack
(`docs/west-of-england-d1/published-network.json`) instead names **Chepstow (CPW)** as its
boundary station toward South Wales. These are two different, real stations on the same corridor
near the border. This pack does **not** try to guess which one is "correct" or whether both should
be through-running points — that would be inferring a station graph beyond what either report
states, which this lane is told not to do. Both stations stay **through-running-only, not merge
points**, in their respective packs. **This is an open reconciliation item for D2** (or for a
future Nico pass specifically on this corridor) — flagged here, in hazard-pack.md, and in
published-network.json's coverageGaps, not silently resolved either way.

## Direction model recommendation (National Rail only)

**Destination + operator** (e.g. `London Paddington (GWR)`, `Manchester Piccadilly (TfW)`),
matching how National Rail departure boards actually present and identical in shape to the East
Midlands, North East, and West of England National Rail recommendations. No line+terminus model
for National Rail — GWR/CrossCountry do not brand this corridor with named lines here either.
**Illustrative only, not verified** — no destination strings can be confirmed until
`DARWIN_LDB_TOKEN` exists and a real Darwin payload can be pulled. See direction-model-memo.md.

If Valley Lines ever gets built in a follow-up pack, direction-model-memo.md recommends
**line + terminus** for it instead (six named routes: Merthyr, Rhondda, Aberdare, Coryton, Ebbw
Vale, Taffy Vale) — a different model from National Rail's destination+operator, because Valley
Lines is a branded closed six-route network unlike National Rail's operator-mixed corridor. This is
a forward note only, not built here.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region — OGL 2.0 baseline permits redistribution with attribution, but the RDM
   Platform Agreement's language on downstream redistribution to third-party rider clients isn't
   confirmed in public sources. Confidence: `unclear`. Review the signed RDM Data Sharing Agreement
   once EvansAppStudio re-registers.
2. **TfW Valley Lines feed status** — outreach draft already sent to Viv's queue
   (`docs/outreach-drafts/south-wales.md`); Tim needs to actually send it and follow up. Until a
   reply confirms a public feed, Valley Lines cannot be packed, adapted, or shipped in any form.
3. **STJ vs. Chepstow boundary discrepancy** (above) — needs a human or a future Nico pass to
   reconcile against an actual National Rail route map, not something for Jim to pick between
   during adapter wiring.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). National Rail static GTFS (Transitland) is
CC-BY-2.0 UK, confidence `clear`, reference-only. Transport for Wales Valley Lines: no license to
summarize — no feed exists to license.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no Valley Lines
station graph, direction model, or catalog entry of any kind (see scope decision above), no
resolution of the STJ-vs-Chepstow discrepancy or the RDM redistribution ambiguity (both flagged for
Tim/D2), no reading of any other city's in-progress pack, no wiring of `DARWIN_LDB_TOKEN`.
