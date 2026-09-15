# Jim brief — move misassigned Rest of England stations back to their real regions

**Lane:** bug-fix / product mode, data. `tim-review: no`. **Lane lock:** UK —
`node qa/lane-lock.mjs check united-kingdom` (free 15 Sep 2026), then
`acquire united-kingdom station-reassignment jim <branch>` before touching `lib/cities/`.
Leave no background loops, pollers or dev servers; run the suite with an explicit
`timeout: 600000` and tail its output file in the foreground if it gets backgrounded.

## Symptom (Tim, 15 Sep 2026, on his phone)

Flixton (Trafford, Greater Manchester) is catalogued in `rest-of-england`, so in any
region-first picker it is only reachable by choosing "Rest of England". The design decision
(14 Sep) was that Rest of England is an internal home for stations no real region owns, never
something a rider must find. Flixton has a real region. So do many others.

## Evidence

Phase 2a (`docs/jim-brief-uk-station-fill-phase2a.md`, PR #384) assigned stations by geographic
boxes. Checking the 436 `rest-of-england` stops against the existing regions' `CITY_BOUNDS` in
`public/city-session.js` (15 Sep): 71 sit inside another region's Near-me box. 39 inside
uk-west-midlands' (Nuneaton, Atherstone, Bedworth, Burton-on-Trent, Alvechurch, Barnt Green),
19 inside rest-of-wales' box (Church Stretton, Craven Arms, Gobowen: English stations the Welsh
box overhangs, so these need a real-region decision, not Wales), 6 in the thames-valley/solent
overlap (Staines, Chertsey, West Byfleet, Iver, Chorleywood), 3 in liverpool-city-region's
(Warrington Bank Quay, Central, West). Flixton itself (53.4437, -2.3839) is 0.03 degrees west of
the greater-manchester box edge (minLng -2.35): the box was too tight; the station is
unambiguously Greater Manchester. Boxes are the wrong tool.

## Rule to apply

A station belongs to an existing region when it is inside that region's named administrative
territory: the metropolitan county or combined authority for the metro regions (Greater
Manchester; Merseyside for liverpool-city-region; West Midlands county; South and West
Yorkshire; Tyne and Wear for north-east), the ceremonial counties each county-based region's pack
claims (thames-valley, solent, southwest, west-of-england, cumbria, greater-anglia,
east-midlands, london-se-national-rail per its pack), and the ledger section 2 for named
boundary stations. Use NaPTAN's ATCO area code prefix (e.g. 180 Greater Manchester, 280
Merseyside, 430 West Midlands) or reverse geocoding, not boxes. Only a station in no named
region's territory stays in rest-of-england. Write the rule and every borderline call to a new
section of `docs/uk-station-fill/assignment.md`, with the final rest-of-england count.

Do not widen any region beyond its administrative territory to absorb stragglers (Tim rejected
that on 14 Sep). Rest of England stays for genuinely unowned stations (Lincolnshire, much of the
rural North and South West).

## Changes

1. Move each reassigned entry from `lib/cities/rest-of-england/stations.json` to the owning
   region's `stations.json` (same shape, `crsVerified` carried over, a note "reassigned from
   rest-of-england 15 Sep 2026"). Update both regions' `coverage.json` station sentences.
2. Update `public/city-session.js` `CITY_BOUNDS` for any region whose box now excludes one of
   its own stations (Greater Manchester must contain Flixton); re-run
   `qa/uk-city-bounds-overlap-gate.mjs`, allow-listing genuine overlaps with reasons.
3. Regenerate `public/city-directions/<region>.json` for every region touched
   (`scripts/write-city-directions.mjs --only=<region>`, Darwin token in `.env.local`).
4. Extend `qa/uk-station-fill-audit.mjs`: no rest-of-england station may sit inside another live
   region's `CITY_BOUNDS` box unless allow-listed with a reason.
5. Update every touched region's dogfood gate count and `qa/rest-of-england-dogfood-gate.mjs`.

## Acceptance criteria

1. Flixton, Urmston, Chassen Road, Humphrey Park, Irlam and every other Greater Manchester
   station are in `greater-manchester`. Warrington's three stations, Nuneaton, Bedworth,
   Atherstone, Staines, Chertsey and West Byfleet are each in the region the rule gives them,
   stated explicitly in the PR.
2. `qa/uk-station-fill-audit.mjs` with the new box check passes; every station in exactly one
   region.
3. All touched dogfood gates pass; `node qa/run-all.mjs --smoke` green.
4. PR body has a table: station, from, to, rule applied, for every move.

## Process

Worktree from current master; copy this brief in; commit, push; PR "UK stations: reassign
Rest of England stations to their administrative regions".
