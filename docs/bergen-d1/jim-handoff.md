Bergen D1 + research pack (Luke), 28 Sep 2026. City stays **planned**. Existing live/planned
cities untouched. `assertCityLive("bergen")` must still fail (city not in
`lib/providers/registry.js` today). No generator committed, no PR, no product edit, no
`lib/providers/` or `registry.js` edit.

Pack files: `docs/bergen-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=bergen**, single-operator v1: Skyss, Bybanen light rail only (lines 1 and 2). Not
  `city=norway`, not merged with Oslo. Country ledger `docs/norway-ledger.md` confirms Entur as the
  shared national feed but per-city adapters, no merged provider config — same pattern already
  live for Oslo (`lib/providers/oslo.js`).
- **Station graph, 33 unique stations (27 on line 1, 9 on line 2, 3 shared), hand-transcribed from
  the two current official Skyss Rutetabeller PDFs**, re-fetched directly this pass (not taken from
  the oracle report's prose, which under-transcribed them) — full arrays in
  `published-network.json`. Cross-checked against Wikipedia's independent station list, which
  agrees once "Bergen busstasjon" is treated as one name.
- **Station-count and name corrections against the oracle report** (hazard-pack.md H2,
  evidence-backed): line 2 has 9 stations not 10; total unique is 33 not 35; the station the
  oracle report calls "Bystasjonen" is printed "Bergen busstasjon" on both current PDFs; "Danmarks
  plass" is two words, not one. **Use the counts, names, and arrays in `published-network.json`,
  not the oracle report's original figures.**
- **Hub lock: Bergen busstasjon, NOT Byparken** (the oracle report's original pick) — direction-
  model-memo.md has the full correction. Line 2 never calls at Byparken; Bergen busstasjon is the
  station both lines actually share in the city centre, one stop out from each line's own
  terminus. Byparken and Kaigaten remain valid, real, line-specific direction-chip termini.
- **NSR stop-place ids and coordinates for all 33 stations**, resolved via Entur's geocoder this
  pass (`published-network.json`'s `stationRegistry`) — never invented, always the geocoder's own
  returned id/coordinate. A few stations have a `nsrPrintedName` different from the D1/PDF print
  (Sletten → NSR "Sletten senter"; Bergen lufthavn Flesland → NSR "Bergen lufthavn"); this pack
  locks the D1/PDF print as the published/display name and records the NSR form so Jim's live
  Entur queries aren't a surprise.
- **Board eligibility, no `undecided` rows** (`published-network.json`'s `boardEligibility`):
  Bybanen `in` (walk-up, no reservation, no barrier); Skyss regional bus `out-mode` (mode cut, even
  where co-located with a Bybanen stop-place); Vy Bergensbanen and Vy Arna line `out-scope`
  (Bergen Railway Station is a confirmed-distinct NSR stop-place from every Bybanen stop — never
  in-catalog under any name, so no service-level verdict is owed per the board-eligibility rule's
  "filter stations in, never trains off silently").
- **Bergen Railway Station is explicitly NOT an in-catalog Bybanen stop** — confirmed with NSR
  evidence, not just prose: Bergen stasjon = NSR:StopPlace:59983 (`railStation` mode), closest
  Bybanen stop Nonneseter = NSR:StopPlace:30862 (~90m away), Bergen busstasjon =
  NSR:StopPlace:62356 (~350m away). Separate building, separate infrastructure, separate operator
  (Vy).
- **License: NLOD 2.0** per the oracle report and the country ledger. Attribution required (Entur
  + Skyss), commercial reuse permitted, `ET-Client-Name` header is mandatory identification, not a
  secret. Not re-verified in this pass — treated as settled.
- **Europe/Oslo HAS DST** — corrects the oracle report's non-existent "Europe/Bergen" IANA string
  (there is no such zone; Norway has exactly one, `Europe/Oslo`). Same DST transition dates/
  behaviour either way, only the zone identifier string needs fixing before it's used.

## Feed specifics for D2 (Entur — same pattern as `lib/providers/oslo.js`)

- **Live boarding path: Entur Journey Planner v3 GraphQL**, `POST
  https://api.entur.io/journey-planner/v3/graphql`, `stopPlace(id) { estimatedCalls }`. Same
  endpoint Oslo's adapter already uses live.
- **Header: `ET-Client-Name`**, mandatory identifying header (not a secret, no env var needed).
  Oslo's adapter uses the literal string `"next-train-app"` (see
  `lib/providers/oslo.js`'s `ENTUR_CLIENT_NAME` export) — reuse the same convention/value for
  Bergen unless Tim wants a per-city string; either way it must identify the app, never impersonate
  Skyss or Bybanen AS.
- **Authority filter: `SKY:Authority:SKY`** (Skyss) — Entur's Journey Planner v3 distinguishes
  operators by `serviceJourney.line.authority.id`, not by the GTFS `datasetId` query param (same
  distinction Oslo's adapter comment already documents for `RUT:Authority:RUT` /
  `VYG:Authority:VY` / `FLT:Authority:FLT`). Filter to `SKY:Authority:SKY` + `transportMode: tram`
  (Bybanen registers as tram mode in Entur, confirmed by every stop-place category tag pulled this
  pass — never `metro`).
- **Real-time (SIRI ET/SX, GTFS-RT)**: per the country ledger, Entur serves both per operator
  `datasetId=SKY`. Not independently re-verified this pass for Bergen specifically (the ledger's
  live-path confirmation was against Oslo's `RUT` dataset) — Jim's D2 pass should do the same live
  confirmation Oslo's adapter did (docs/oslo-d1/jim-handoff.md's pattern) before assuming SIRI VM /
  vehicle-positions exist for light rail; the ledger notes RUT has no VM/vehicle-positions, and
  Bergen's SKY dataset hasn't been checked either way.
- **Static Entur GTFS is NOT a D1 generator** and is not proposed as a live-feed candidate either
  (same caveat as every other Entur-fed city in this pipeline).
- **No stopIds in this file** — `published-network.json`'s `stationRegistry` carries NSR
  stop-place ids separately from the `lines[].stations` name arrays, matching the pattern Jim will
  need to resolve each D1 name to a `stopPlace.id` for the live query (same station-name-to-id
  resolution problem Jim's Vienna adapter solved via a CSV fold-match — Bergen's case is simpler
  since this pack already carries the NSR id per station, no separate resolution pass needed).

## What is still NOT solid — resolve before/at D2, don't wire around

1. **Hub-lock override (Bergen busstasjon vs the oracle report's Byparken)** — flagged as an open
   question for Tim in direction-model-memo.md. If Tim prefers keeping Byparken for continuity
   with the oracle report's original C2/C3 note, that's a one-line change to this pack, not a
   re-derivation.
2. **Sletten vs "Sletten senter", Bergen lufthavn Flesland vs "Bergen lufthavn"** — this pack locks
   the Skyss/PDF print as the published/display name. Jim's live Entur queries will return the NSR
   form in `destinationDisplay`/`quay`/`stopPlace.name` fields — map back to the D1 print for
   display, don't let the two diverge silently on the board.
3. **SIRI VM / vehicle-positions for the SKY dataset** — not checked this pass (only the country
   ledger's Oslo/RUT confirmation exists). Confirm live before assuming Bergen has (or lacks) the
   same real-time granularity Oslo does.
4. **Nested short-turns / peak-only variants** — neither Skyss PDF's timetable grids show one
   (hazard-pack.md H5), but this was checked against the printed timetables only, not GTFS
   trip-level data or the live Entur feed. If Jim's D2 pass finds a peak-only/partial-route
   Bybanen service, that's new information, not assumed here.
5. **Åsane extension (13 unopened stations)** — all "TBD" per Wikipedia's own Future table, not on
   either current Skyss PDF. Not inserted. If Jim's D2 pass or a later check finds these have
   opened, that's new information this pack didn't have.

## Direction model (full detail: direction-model-memo.md)

- **Both lines**: line + terminus, e.g. `1 + Byparken`, `1 + Bergen lufthavn Flesland`,
  `2 + Kaigaten`, `2 + Fyllingsdalen terminal`. No ring, no branch, no nested short-turn — simpler
  than Oslo's or Vienna's direction model in that respect.
- **Bergen busstasjon (hub lock)**: plain through-station on both lines, four ordinary direction
  chips, no self-referential-hub case (unlike Oslo's Vy R21 at Jernbanetorget) — Bergen busstasjon
  is never itself a printed terminus for either line.
- **Byparken / Kaigaten**: each is a true single-direction terminus for its own line only (same
  shape as Vienna's Karlsplatz-for-U2, not Oslo's through-tunnel case) — only one live outbound
  chip at each (`1 + Bergen lufthavn Flesland` at Byparken; `2 + Fyllingsdalen terminal` at
  Kaigaten). Never synthesize `1 + Byparken` at Byparken itself, or `2 + Kaigaten` at Kaigaten
  itself.

## What I did not do

No live flip, no UI wiring, no D5 assertion tables, no adapter code, no `lib/providers/` or
`registry.js` edit, no GTFS fetch (the oracle report explicitly says D1 is hand-transcribed
timetables, not GTFS-derived — followed here), no station-graph invention for the unopened Åsane
extension, no live confirmation of the SKY dataset's SIRI VM/vehicle-positions availability
(flagged for Jim, not assumed), no edits to any other city's pack, no edits to
`docs/norway-ledger.md` (cross-region facts already recorded there by Nico; this pack only reads
it).

## Lane status

Luke needs no lane-lock check (per CLAUDE.md: "Luke needs no check" — his whole write set is
`docs/bergen-d1/`, which no other lane touches). The pack is complete by the shape of every other
`docs/<city>-d1/` folder (4 files) and every claim in it is sourced. **The adapter build is
intentionally NOT started** — that's Jim's job (D2–D6), not this pack's. Norway's country lane
already ran (`docs/norway-ledger.md`, Nico, 27 Sep 2026) — Bergen is the second of its two scoped
regions (Oslo is live; this pack is Bergen's D1). No country-lane lock applies to Luke's work
regardless (lock is Jim's only, for shared files).
