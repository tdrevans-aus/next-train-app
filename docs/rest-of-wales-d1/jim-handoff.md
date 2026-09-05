Rest of Wales D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is
unblocked AND the TfW real-time feed status is confirmed AND Jim wires testers live — this pack
does not flip anything. **assertCityLive("uk-wales") must fail** (city is not in
`lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim
owns D2–D6. Do not flip uk-wales live from this pack. Do not invent city=wales, city=rest-wales-nr,
or city=uk-rest-of-wales. Do not touch South Wales, West Midlands, Greater Manchester, Liverpool
City Region, East Midlands, North East, or West of England — same account-level National Rail
blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Rest of Wales` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/rest-of-wales-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## City id: FLAG — inconsistency with South Wales' merged pack

This pack uses `city: "uk-wales"` per the oracle report's explicit C2/C3 instruction (point 1:
"city=uk-wales ... per docs/uk-architecture.md") and `uk-architecture.md`'s own region-id table
(`uk-wales` = Rest of Wales, `uk-south-wales` = South Wales). **South Wales' already-merged pack
uses `city: "south-wales"`, not `uk-south-wales`** — a real discrepancy between what shipped and
what the architecture doc specifies. This pack does not try to guess which convention is
authoritative or retrofit South Wales' pack (immutable history per the country-lane rule). Flagged
here, in published-network.json's `notes` and `coverageGaps`, for Jim/Tim to reconcile before
`registry.js` gets both entries — if `uk-wales` ships as-is next to `south-wales`, the two region
ids won't share a prefix pattern even though `uk-architecture.md` implies they should.

## Scope: single agency, no second network to exclude

Unlike South Wales (which excludes Transport for Wales Valley Lines entirely — no public feed of
any kind), Rest of Wales has **only one agency documented**: National Rail, operated in-franchise
by Transport for Wales, across three geographic corridors (North Wales/Wrexham, Mid Wales/
Aberystwyth, West Wales/Carmarthen). There is no separate local commuter network here the way
Valley Lines exists in South Wales (oracle report line 3: "no dedicated local rail operator"). This
pack therefore builds one catalog, not a catalog-plus-excluded-second-network like South Wales'.

## The real gap here: TfW real-time feed status is UNCONFIRMED (not the same as South Wales' gap)

**This is the key thing to know before touching this city — it is a different kind of gap from
South Wales', not a repeat of it.** South Wales' Valley Lines gap is "no public feed of any kind
exists, confirmed." Rest of Wales' gap is narrower and still open: static GTFS via Transitland is
confirmed live (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`, same feed South Wales cites), but
**whether Darwin/OpenLDBWS actually carries live real-time data for Transport for Wales National
Rail services specifically has not been confirmed** (oracle report lines 34, 67, 121-127). The
report's explicit instruction (C2/C3 point 5) is to contact Transport for Wales (data@tfw.wales)
and confirm before D1 pack stage — that contact has not happened as of this pack. This pack does
**not** assume Darwin carries TfW real-time data just because Darwin is "live standard" for
National Rail generally; that would be guessing at a feed capability the report explicitly flags as
unconfirmed. See hazard-pack.md H2 point 2 and direction-model-memo.md.

**Practical effect for Jim:** even once `DARWIN_LDB_TOKEN` is provisioned (the account-level block,
same as every other UK region), do not assume real-time boards will work for Rest of Wales stations
without first confirming TfW's data actually flows through that token. If it doesn't, boards stay
schedule-only (Darwin static GTFS via Transitland) or planned-only, same fallback path South Wales'
pack notes is more viable here than in West of England's Darwin-only case.

## Hub lock

**Wrexham General (WRX)** is the locked hub — junction of North Wales Main Line and Borderlands
Line, largest North Wales station by connectivity (oracle report line 78, "Recommended hub lock").
Explicitly not Wrexham Central (southern Borderlands terminus, lower connectivity). Aberystwyth
(AYW, Mid Wales terminus) and Carmarthen (CMN, West Wales junction) are named as corridor-
significant stations but are **not** hub-locked — the report gives Wrexham as the clear primary
pick and marks the other two lower-priority/secondary (report lines 25-26). See hazard-pack.md H6.

## Three corridors, no inter-corridor through-running within Wales

North Wales, Mid Wales, and West Wales are operationally independent within this catalog — North
Wales <-> Mid Wales routes via Shrewsbury (England, not in catalog); Mid Wales <-> West Wales
routes via Swansea/South Wales region (not in catalog). Do not build a single flat station list
that implies inter-corridor connectivity within Wales; use the corridor-grouped structure in
published-network.json's `nationalRailStations.corridors`.

## Boundary / pass-through stations — not catalog points

- **Chester (CTR):** England pass-through, North Wales corridor eastbound. Not in catalog.
- **Shrewsbury:** England pass-through, Mid Wales corridor eastbound (Cambrian Line origin). No
  CRS code given in the oracle report — do not invent one. Not in catalog.
- **Carmarthen eastbound to Swansea:** South Wales region boundary (West Wales corridor). No
  specific boundary station named in the report beyond "continues to Swansea on South Wales Main
  Line." South Wales' own merged pack does not list Carmarthen or a Swansea-direction boundary
  station, so unlike South Wales' STJ-vs-Chepstow discrepancy with West of England, **there is
  nothing to reconcile here yet** — flagged only in case a future South Wales or West of England
  ledger entry introduces a conflicting boundary point.

## doNotGroup proposals — none built, four flagged

See hazard-pack.md doNotGroup proposals and published-network.json's `doNotGroup` block: Wrexham
General's three route directions, Carmarthen's branch-vs-through-running split, Whitland's
three-way branch, and Machynlleth's Aberystwyth/Pwllheli split. All are **proposed only** — the
report gives route/corridor names but no platform or service-pattern detail to encode enforced
rules from. Confirm against a live Darwin payload once unblocked and TfW real-time status is
resolved.

## Direction model recommendation (National Rail only)

**Destination + operator** (e.g. `Holyhead (TfW)`, `Manchester Piccadilly (TfW)`, `Birmingham
International (CrossCountry)`), matching how National Rail departure boards actually present and
identical in shape to the South Wales, East Midlands, North East, and West of England
recommendations. No line+terminus model — the report's corridor names (North Wales Coast Line,
Cambrian Line, West Wales lines) describe scoping corridors, not board-displayed line names.
**Illustrative only, not verified** — no destination strings can be confirmed until
`DARWIN_LDB_TOKEN` exists, a real Darwin payload can be pulled, AND TfW real-time status is
confirmed. See direction-model-memo.md.

## Board eligibility — verified complete before this pack started

The oracle report's Board eligibility section (lines 36-61) is complete: verdict table for TfW
Regional/Commuter, CrossCountry, GWR, and Caledonian Sleeper services, all with evidence URLs and a
summary line confirming no silent omissions. No stop, per the task instruction, would have proceeded
without it — confirmed present before any file in this pack was written.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region — OGL 2.0 baseline permits redistribution with attribution, but the RDM
   Platform Agreement's language on downstream redistribution to third-party rider clients isn't
   confirmed in public sources. Confidence: `unclear`. Review the signed RDM Data Sharing Agreement
   once EvansAppStudio re-registers.
2. **TfW real-time feed status** — must contact data@tfw.wales to confirm whether GTFS-RT is
   available via Darwin/RDM subscription or any other channel, before real-time boards can be built
   for this region even after the account-level block clears. Not yet contacted as of this pack.
3. **City id inconsistency** (`uk-wales` here vs. `south-wales` in the merged South Wales pack,
   against `uk-architecture.md`'s `uk-south-wales`/`uk-wales` table) — needs a human decision on
   which convention `registry.js` should actually use; not something for Jim to pick between during
   adapter wiring.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). National Rail static GTFS (Transitland) is
CC-BY-2.0 UK, confidence `clear`, reference-only. Transport for Wales real-time-feed-specific
license: confidence `not found` — no license to summarize because no confirmed TfW-specific
real-time feed exists as of this pack.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no resolution of
the TfW real-time-feed-status unknown, the RDM redistribution ambiguity, or the city-id
inconsistency (all three flagged for Tim/Jim above), no reading of any other city's in-progress
pack (South Wales' finished/merged pack was read once for the cross-UK-fact check noted in
hazard-pack.md, not for Rest of Wales station-graph fact), no wiring of `DARWIN_LDB_TOKEN`.


## Jim flip follow-through (5 Sep 2026) — note for Mark

Per `docs/jim-brief-rest-of-wales-flip.md`, this pass wired the dogfood module
(`lib/cities/rest-of-wales/dogfood-next-train.js` + `stations.json`), the `directionsFor()` /
`getMultiCityNextTrain()` dispatch switch-cases in `lib/cities/live-city-api.js`, and
`qa/rest-of-wales-dogfood-gate.mjs` (replacing the retired `qa/rest-of-wales-planned-gate.mjs`).
Registry status stays `planned` — this pass does not flip it.

**Deliberately NOT done here — these three one-line additions belong in your flip commit**
(same as Malmö/Uppsala/Göteborg/Greater Anglia/South Wales' flips did it;
`qa/live-city-lists-sync.mjs` enforces that they exactly equal the registry's `status === "live"`
set):

1. Add `"rest-of-wales"` to `MULTI_CITY_IDS` (and the `MultiCityId` typedef) in
   `lib/cities/live-city-api.js`.
2. Add Rest of Wales to `brisbane-dogfood.js`'s mount/available map.
3. Add Rest of Wales to `journey-model.js`'s persisted-city/country lists.

No direction-hubs.json was built — the D1 pack names Wrexham General as the sole hub lock but no
intermediate through-station (like Thetford/Ely anchoring on Norwich for Greater Anglia) that
prints "Wrexham General" as a destination without it being the trip's own terminus.
`loadDirectionHubs("rest-of-wales")` degrades to an empty hub list, a no-op, which
`qa/rest-of-wales-dogfood-gate.mjs` asserts explicitly. The four doNotGroup proposals (Wrexham
General route directions, Carmarthen branch-vs-through-running, Whitland three-way branch,
Machynlleth Aberystwyth/Pwllheli split) remain proposed-only, same as before this pass — no
platform/service-pattern detail to build an enforced rule from.
