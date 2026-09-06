Glasgow D1 + research pack. City stays **planned** / "Coming Soon" until both (a) National Rail is
unblocked (DARWIN_LDB_TOKEN) and (b) Jim wires testers live — this pack does not flip anything.
**assertCityLive("glasgow") must fail** (city is not in `lib/providers/registry.js` CITIES today —
Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip glasgow live from
this pack. Do not touch Edinburgh, Rest of Scotland, or any other UK region — same account-level
National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Glasgow` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/glasgow-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md,
direction-model-memo.md, jim-handoff.md (this file).

## Does Central/Queen Street need London-SE-style multi-group treatment? Judgment call: LIGHT multi-group, not full Option A

The dispatch brief asked me to use judgment on whether Glasgow's two National Rail termini need
the same multi-group treatment as `london-se-national-rail` (Option A — 7 independent
`stationGroups`, no single hub-lock). My answer: **yes, keep them as two independent
`stationGroups` entries (do not force them under one hub, and do not force them under the Subway's
Buchanan Street hub-lock either) — but no, this doesn't need the FULL London SE NR machinery**,
because the two things that made London SE NR heavy don't apply here:

1. **Scale.** London SE NR has 7 built groups (8th flagged, not built) plus 7 excluded/not-built
   secondary termini. Glasgow has exactly 2 National Rail groups, full stop. There's no
   proliferation problem to manage.
2. **Internal doNotGroup.** London Bridge (3 operators) and Liverpool Street (2 operators) needed
   *internal* doNotGroup — the report gave explicit evidence of separate platform/boarding-section
   logic per operator at the same physical station. Neither Glasgow Central (ScotRail + Avanti
   West Coast) nor Glasgow Queen Street (ScotRail only) has that evidence in the oracle report —
   no separate-boarding-section language anywhere. So `doNotGroup: false` on both Glasgow
   `stationGroups` entries in `published-network.json`; each is a single flat departure board
   distinguished by destination + operator, closer to London Victoria's treatment (Southern +
   Gatwick Express, one board) than London Bridge's.

**What Glasgow does need, and does share with London SE NR:** the core Option A principle that
**not every National Rail terminus in a city collapses into one hub**. Glasgow Central and Glasgow
Queen Street are separate buildings, not rail-connected to each other, serving genuinely different
corridors (Central: cross-border south via Avanti + ScotRail through-running; Queen Street:
Scottish regional north via ScotRail only) — exactly the "genuinely separate destinations, not
alternate routes to the same place" test the London SE NR report used to justify Option A over a
single hub-lock (that report's line 57). So: **two `stationGroups` entries, no forced single NR
hub** — call it "Option A at n=2," not the full 7-group apparatus.

### What this means for adapter/registry design

- `published-network.json`'s `stationGroups` array (2 entries: `glasgow-central`,
  `glasgow-queen-street`) is the unit of NR adapter work — same pattern as
  `docs/uk-architecture.md`'s "one Darwin adapter + region config passing a CRS allow-list," just
  with two CRS allow-lists (`GLC`, `GLQ`) inside one region config rather than one.
- Neither group needs internal doNotGroup logic — a single CRS query per group, filtered by
  destination + operator for display, is sufficient per the evidence available.
- **Buchanan Street (Subway) is a THIRD, separate thing** — not a `stationGroups` entry at all,
  it's the hub-lock for the `lines[0]` (Subway) entry. Do not fold it into `stationGroups`, and do
  not merge it with Glasgow Queen Street despite the travelator connection — see hazard-pack.md H1
  doNotGroup and direction-model-memo.md.

## THE OTHER FIRST: a true circular line with no termini

Separately from the NR-grouping question — Glasgow Subway is the first line in this pipeline with
**no termini at all** (a closed loop, Inner Circle / Outer Circle). This is a bigger open item than
the NR grouping call above. See direction-model-memo.md Part 1 in full. Short version: recommend
printed direction labels ("Outer Circle" / "Inner Circle") rather than any terminus-based label,
since no terminus exists to use. This needs Tim's confirmation on the literal platform-signage
wording before D5 assertion tables, and needs the Subway stop order independently verified before
an adapter can compute which platform is "Outer" vs "Inner" at a given station (see below).

## Subway stop order is UNVERIFIED — do not wire direction logic on it as-is

`published-network.json`'s `lines[0].stations` array is transcribed from the oracle report's
station-name table, which happens to read in a plausible loop order but is never stated by the
report to BE an ordered stop sequence, and was never checked against an official SPT map or the
TravelWhiz GTFS's `stop_times`/`stop_sequence` columns (neither Nico's report nor this pack pulled
that GTFS file). `stationOrderVerified: false` is set explicitly on the line entry. **Confirm this
before using the array to compute next-station or Inner/Outer platform assignment in a live
adapter** — this is exactly the kind of station-graph guess the Luke lane is told to flag rather
than assume, and doing so here (rather than silently trusting a table that happens to look
plausible) is the point of this flag.

## Subway real-time: still unknown, still schedule-only

No GTFS-RT feed found by Nico for SPT (report line 79-83, 111-117). This pack does not resolve it.
Schedule-only v1 remains the working plan; high skip risk carried forward unresolved. Contact
data@spt.co.uk before assuming RT will ever exist for this mode.

## National Rail: still blocked at account level

Same blocker as every other UK region — EvansAppStudio's RDM registration is AU, needs UK
re-registration before DARWIN_LDB_TOKEN can be provisioned. Not a feed problem, don't treat it as
one.

## Falkirk High boundary — recorded, not resolved centrally

Falkirk High (FKK) is the exclusive-territory split point with Edinburgh (Tim's decision, per
report line 11/91) — excluded from Glasgow's catalog entirely, no merged board. This is exactly
the kind of cross-region fact `docs/country-lane.md` says should live in
`docs/united-kingdom-ledger.md`, which still does not exist (same gap already flagged unresolved
in the london-se-national-rail pack on 1 Sep 2026, and in every UK region before it back to East
Midlands). This pack records the Falkirk High fact per the oracle report only, per the
read-only-the-report rule — it does not create the ledger.

## Missing UK country ledger — flagged again

`docs/country-lane.md`'s "Standing retrofits" section names the UK ledger as required **before the
next NR region**. Glasgow is another NR region shipped without it (East Midlands, North East, West
of England, South Wales, Rest of Wales, Rest of Scotland, West Yorkshire, london-se-national-rail,
now Glasgow — none of them have triggered the retrofit). This pack proceeds on the oracle report
alone per the dispatch instruction. This gap keeps compounding and should be raised to Tim/Nico
directly rather than re-flagged silently by every region forever.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
2. **Subway platform-signage wording** — confirm "Outer Circle" / "Inner Circle" (or whatever the
   literal SPT signage says) before D5 assertion tables lock a label string.
3. **Subway stop order** — needs independent verification (SPT map or TravelWhiz GTFS
   stop_sequence) before Inner/Outer direction logic can be wired correctly.
4. **Subway license clarity** — CC BY 4.0 covers TravelWhiz's own curation, but whether the
   underlying SPT timetable data may be redistributed via a public API is unclear (report line
   105/109). Clarify with TravelWhiz/SPT before launch.
5. **SPT feed confirmation** — contact data@spt.co.uk to confirm whether an official static and/or
   real-time GTFS feed will ever be published (report line 79-83).
6. **UK country ledger retrofit** — overdue across nine+ NR regions now; should run before the
   region after this one, not indefinitely deferred.

## Jim's flip follow-through (6 Sep 2026) — note for Mark

Wired ahead of the flip, per CLAUDE.md's "Do now, ahead of the flip" list (code, not list
membership):

- `lib/cities/glasgow/dogfood-next-train.js` — National Rail directions/next-train derived live
  from Darwin (regionId "glasgow"), proven independently at both Glasgow Central (GLC) and Glasgow
  Queen Street (GLQ) with no hub-lock between them ("Option A at n=2"). No
  `lib/cities/glasgow/direction-hubs.json` ships (no intermediate through-station candidate, same
  as South Yorkshire) — `loadDirectionHubs()` degrades to a no-op empty hub list. Glasgow Subway's
  `fetchSubwayStopBoard()` throws `GlasgowSubwayFeedUnverifiedError` unconditionally; this module
  does not catch it or fall back to the static Outer/Inner Circle label list.
- Dispatch switch-cases added in `lib/cities/live-city-api.js`'s `directionsFor()` and
  `getMultiCityNextTrain()` for `cityId === "glasgow"`.
- `qa/glasgow-dogfood-gate.mjs` replaces the retired `qa/glasgow-planned-gate.mjs` (swapped in
  `qa/run-all.mjs`'s registration list too). Live-probes Darwin at both GLC and GLQ with the local
  `DARWIN_LDB_TOKEN` when set; asserts `MissingDarwinTokenError` at both termini when not. Asserts
  `GlasgowSubwayFeedUnverifiedError` surfaces through the dogfood dispatch and `live-city-api.js`
  for the Subway layer regardless of token state.

**Left for Mark's flip commit — exactly three one-line list-membership additions, not done here**
(per CLAUDE.md: these must equal the registry's live set, `qa/live-city-lists-sync.mjs` enforces
it, and adding them early breaks that gate for everyone):
1. Add `"glasgow"` to `MULTI_CITY_IDS` (and the `MultiCityId` typedef) in
   `lib/cities/live-city-api.js`.
2. Add `"glasgow"` to `brisbane-dogfood.js`'s mount/available map.
3. Add `"glasgow"` to `journey-model.js`'s persisted-city/country lists.

**Subway licence question — explicitly carried forward for Tim, not resolved here.** The
TravelWhiz static feed's own curation is CC BY 4.0, but whether the underlying SPT timetable data
may be redistributed via a public API at all is unclear (oracle report line 105/109, and see "Open
items for Tim only" above, item 4). Because of this — and because the feed's stop order was never
verified against an SPT map or the TravelWhiz GTFS's `stop_sequence` — the Subway layer cannot
currently back a live board under any code change short of resolving both the licence and the stop
order; `fetchSubwayStopBoard()` throws `GlasgowSubwayFeedUnverifiedError` and the dogfood gate
asserts that error class rather than a live Subway board. The National Rail layer (Darwin, both
termini) is what `qa/glasgow-dogfood-gate.mjs` proves live-capable; Subway proves only that it
fails safely and legibly. Mark should carry this open question into the flip PR for Tim to `hold`
on if he wants to gate the flip on Subway resolution, or flip on National Rail alone with Subway
staying in its documented-error state.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — same open item as every other UK NR region). Subway (TravelWhiz) is
CC BY 4.0 for the curated feed, confidence `unclear` on underlying source-data redistribution.
National Rail static GTFS (Transitland) is CC-BY-2.0 UK, confidence `clear`, reference-only, not
used to derive this catalog.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
GTFS fetch/parse (TravelWhiz or Transitland), no invented Subway stop order beyond flagging the
report table's order as an unverified candidate, no invented Subway frequency/short-turn facts, no
invented National Rail destination strings, no CRS verification against a live feed, no
`docs/united-kingdom-ledger.md` creation (flagged as overdue, not this pack's job to write), no
wiring of `DARWIN_LDB_TOKEN`, no reading of any other city's in-progress pack.
