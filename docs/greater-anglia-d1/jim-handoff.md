Greater Anglia D1 + research pack. City stays **planned** / "Coming Soon" until National Rail
real-time is unblocked AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("greater-anglia") must fail** (city is not in `lib/providers/registry.js` CITIES
today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
greater-anglia live from this pack. Do not invent city=ga, city=norwich, city=east-anglia, or
city=greater-anglia-trains. Do not touch London & South East National Rail, East Midlands, West
of England, West Midlands, Greater Manchester, Liverpool City Region, South Wales, or North East —
same account-level National Rail blocker (or, for Liverpool Street/Peterborough, a shared-boundary
consideration), but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Greater Anglia` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/greater-anglia-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Scope and sole source

D1 input was **only** docs/greater-anglia-d1/oracle-clash-report.md (Nico). No UK-country ledger
exists yet for this lane (`docs/*-ledger.md` glob has no `united-kingdom-ledger.md`) — this pack
proceeds without one, per the country-lane doc's "region lanes read the ledger where one exists"
rule. `docs/london-se-national-rail-d1/published-network.json` (already merged) was checked once
for its Liverpool Street stationGroup entry, per the task instruction, to avoid duplicating it and
to catch a CRS collision (see below) — not otherwise read or used as a station-graph source.

One primary agency: **Greater Anglia** — Darwin/OpenLDBWS, technically documented and live but
**blocked at the account level** (EvansAppStudio's RDM registration is Australian; Tim is
re-registering with a UK address). Same blocker as every other UK region this wave and **not a
feed problem** — the catalog below is built normally per Nico's instruction; only
`DARWIN_LDB_TOKEN` wiring waits. Unlike West of England, Greater Anglia **does** have a live
static GTFS feed (Transitland `f-gc-rail~delivery~group~planar~gtfs`, CC-BY-2.0 UK, no key) as a
reference source — this pack did not pull it (station names/CRS are taken from the oracle
report's own tables), but Jim should use it at D2 to verify CRS codes and expand the station list.

## Hub lock and two secondary hubs

**Norwich (NRW)** is the hub lock — single terminus, single operator, Great Eastern Main Line
terminus, interchange for the Cambridge/Great Yarmouth/Lowestoft branches. **Cambridge (CBG)**
and **Ipswich (IPS)** are both kept as **secondary hubs** — the oracle report gives both identical
"second-tier hub status" language and repeats the pairing in its own C2/C3 notes (report lines
22-24, 131). This is a deliberate departure from West of England's single-secondary-hub shape:
that report only gave hub-level language to one station (Bath Spa); this report gives it to two,
so both are kept. See hazard-pack.md H6 for the full reasoning.

**No doNotGroup needed** at Norwich, Cambridge, or Ipswich — single-building, walk-up stations;
Thameslink at Cambridge passes the board-eligibility test alongside Greater Anglia rather than
requiring a separate boarding-area layer (unlike Nottingham Station's tram/rail split or Liverpool
Street's Greater Anglia/c2c split).

## Peterborough — boundary, explicitly not a hub

**Peterborough (PBO)** is a genuine multi-operator shared platform (Greater Anglia, Thameslink,
CrossCountry, East Midlands, LNER) but the report is explicit it is **not a merge point** at D1:
"Through-running point, not merge... no dedicated group required within this region" (report line
25). Modelled as a flat `throughRunningBoundary` entry in published-network.json, with LNER
carried as an `excludedOperators` entry (undecided verdict — see below), not as a `doNotGroup`
stationGroup. **Flag for a multi-region ledger at D2** — cross-regional shared-platform de-dup
with any future East Midlands National Rail Peterborough entry (the existing East Midlands pack
does not name Peterborough) and any future LNER region. Do not build cross-region merge logic for
Peterborough in this pack's station graph.

## LNER at Peterborough — undecided, excluded, same open question as London & SE

LNER's board-eligibility verdict at Peterborough is **undecided** in the oracle report (reserved-
by-default policy, one unreserved carriage maintained per service; report lines 57, 69, 96-97,
140, 156) — explicitly the **same open question** as London & South East National Rail's own LNER
gap at King's Cross, not a separate one. Per the board-eligibility rule, undecided blocks catalog
inclusion; LNER departures at Peterborough are excluded from this pack, not defaulted to in. Do
not attempt to resolve this here — it needs the same operator confirmation London & South East's
pack is also waiting on.

## Colchester and Ely — kept flat, not promoted to hub

**Colchester (COL)** is the report's own "regional hub (third tier)" (line 37) with no
cross-region interchange role beyond the already-documented Liverpool Street boundary — kept flat
under `regional`, not a secondary hub. **Ely** is a "regional junction station" (line 38) with
Thameslink through-running that passes the board-eligibility test the same way Cambridge's does —
also kept flat, since the report gives it no distinct hub-level justification beyond that
through-running fact.

## Liverpool Street — already built, not duplicated

Greater Anglia services calling at Liverpool Street are already documented as `in` in London &
South East National Rail's built pack (`docs/london-se-national-rail-d1/published-network.json`,
`stationGroups[].id: "liverpool-street"`, operators `["Greater Anglia", "c2c"]`, `doNotGroup:
true`). **Not duplicated here.** Greater Anglia's own catalog in this pack covers the East Anglia
network from Norwich outward; Liverpool Street itself is out of this pack's scope, per the task
instruction and report line 61/143.

## CRS collision found — Lowestoft vs Liverpool Street

**Do not use `LST` for Lowestoft.** The oracle report's own station-code list (report line 103)
assigns `LST` to Lowestoft, but `LST` is Liverpool Street's real-world CRS and is already used as
such in London & South East National Rail's built pack. Shipping `LST` for Lowestoft would create
a station-code collision between two stations 100+ miles apart, which would silently corrupt any
cross-city CRS lookup. This pack leaves Lowestoft's `crs` field `null`/unverified in
published-network.json rather than propagate the report's error. **Jim must confirm Lowestoft's
real CRS (believed `LOW`, not verified against GTFS in this pack) against the Transitland feed
before wiring.** See hazard-pack.md H4 for the full write-up. This is the kind of station-graph
mistake the Luke lane exists to catch — flagged, not guessed around.

## Other unverified CRS codes

King's Lynn (report gives `KLN`), Great Yarmouth (report gives `GYM`), Bishops Stortford (report
gives `BIS`), Stansted Airport (report gives `SSD`), and the hub/secondary-hub/regional codes
(NRW, CBG, IPS, COL, PBO, ELY, TTF) are all carried through as reported but marked
`crsVerified: false` — none were cross-checked against the Transitland GTFS feed or a CRS
authority in this pack. Diss and Wymondham have no CRS given in the report at all and are left
`null` rather than guessed. Jim should verify every code against the GTFS feed at D2 before
wiring the adapter; do not trust any CRS in this pack's `published-network.json` as confirmed.

## Direction model recommendation

**Destination + operator** (e.g. `London Liverpool Street (Greater Anglia)`, `King's Cross
(Thameslink)`), matching how National Rail departure boards actually present and identical in
shape to the East Midlands and West of England National Rail recommendations. No line+terminus
model — Greater Anglia does not brand its East Anglia network with named lines, and inventing them
would be guessing. Applies uniformly at Norwich, both secondary hubs, and Peterborough — there is
no East Midlands-style two-layer-hub direction-model split here. **Illustrative only, not
verified** — no destination strings can be confirmed until `DARWIN_LDB_TOKEN` exists and a real
Darwin payload can be pulled. See direction-model-memo.md for full reasoning and options
considered.

## Station scope — ~13 named stations only, not the full 30-50

The report itself estimates D1 scope at 30-50 of the ~170 franchise stations but only explicitly
names about 13 in its station table (Norwich, Cambridge, Ipswich, Peterborough, Colchester, Ely,
King's Lynn, Thetford, Diss, Wymondham, Great Yarmouth, Lowestoft, Stansted Airport, Bishops
Stortford) and defers final selection to Luke (report line 43, C2/C3 point 8). This pack does
**not** invent the remaining 17-37 station names — only the report's named stations are in
published-network.json. Expanding the catalog to the report's suggested range is a D2 gap for Jim
to close against the Transitland GTFS feed (`f-gc-rail~delivery~group~planar~gtfs`), not something
guessed here.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** OGL 2.0 baseline permits
   redistribution with attribution, but the Rail Data Marketplace Platform Agreement may restrict
   downstream redistribution to third-party rider clients — the operative clause isn't confirmed
   in public sources. Oracle report confidence: `unclear`. Tim needs to review the signed RDM Data
   Sharing Agreement once EvansAppStudio re-registers and receives a token, before this region's
   National Rail slice can be relayed to end users. Same open item as every other UK National
   Rail region packed so far.
2. **LNER at Peterborough** — needs operator confirmation on whether one unreserved carriage
   constitutes walk-up boardable. Same open question as London & South East's own LNER gap at
   King's Cross; resolving one likely resolves both, but this pack does not attempt it.

## H7 / license summary

Europe/London, HAS DST (BIS/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). Static GTFS under CC-BY-2.0 UK (clear,
redistribution permitted, commercial use allowed, attribution to Rail Delivery Group / Network
Rail / National Rail Enquiries / Transitland).

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no invented Greater Anglia route/line topology (Darwin has no printed route map), no pulling of
the Transitland GTFS feed to verify CRS codes (flagged for Jim at D2), no invented destination
strings beyond illustrative placeholders explicitly marked as such, no boundary de-dup logic for
Peterborough (D2 concern for a future multi-region ledger), no resolution of the RDM
redistribution ambiguity or the LNER reserved-policy question (both flagged, same open questions
as other UK packs), no invention of the 17-37 additional stations the report's own D1-scope
estimate implies beyond the ~13 explicitly named, no re-reading of London & South East's chat or
oracle beyond the single Liverpool Street stationGroup cross-check the task instruction asked for,
no touching any other UK region's pack, no wiring of `DARWIN_LDB_TOKEN`.

## 5 Sep 2026 — pre-adapter hygiene (Fable, top-level session)

- **CRS codes verified live against Darwin** with `scripts/fix-uk-region-crs.mjs greater-anglia --write`:
  seven of fourteen were wrong or missing — King's Lynn KLY→**KLN**, Thetford THF→**TTF**, Great Yarmouth
  YRD→**GYM**, Bishops Stortford BST→**BIS**, and Diss/Wymondham/Lowestoft (null) → **DIS/WMD/LWT**. All
  corrected in `stations.json`, `published-network.json`, this pack's prose and the planned gate;
  coordinates filled from NaPTAN. The adapter gate must carry the token-gated catalog sweep.
- **Board eligibility resolved**: LNER at Peterborough was `undecided`; resolved `in` with evidence
  (see the oracle report's "Verdict resolution" subsection). No `undecided` rows remain.
- `DARWIN_LDB_TOKEN` exists (live since 2 Sep 2026); the blocker framing above is resolved.

## 5 Sep 2026 — Adapter wired (Jim)

Adapter is structural and verified live against Darwin: `lib/providers/greater-anglia.js` (region
config over `lib/providers/uk-darwin.js`, allow-list only, not a fork),
`lib/cities/greater-anglia/dogfood-next-train.js` (`getGreaterAngliaDogfoodDirections` /
`getGreaterAngliaDogfoodNextTrain` / `planGreaterAngliaNextTrainFetch`),
`lib/cities/greater-anglia/direction-hubs.json` (one hub — see below),
`qa/greater-anglia-dogfood-gate.mjs` (replaces the retired `greater-anglia-planned-gate.mjs`,
registered in `qa/run-all.mjs`'s smoke tier), `lib/cities/live-city-api.js` dispatch switch-cases
(`directionsFor`/`getMultiCityNextTrain`), and `lib/providers/registry.js` (`adapterReady: true`,
`status` stays `"planned"`). Per CLAUDE.md's flip-follow-through split, `greater-anglia` is
deliberately **NOT** added to `MULTI_CITY_IDS`, `brisbane-dogfood.js`'s mount/available map, or
`journey-model.js`'s persisted-city/country lists — those three list-membership edits are Mark's
flip commit (`qa/live-city-lists-sync.mjs` enforces they equal the registry's live set).

### Peterborough — LNER exclusion removed

The D1 pack's `excludeOperators: ["LNER"]` boundary rested only on LNER's `undecided`
board-eligibility verdict. That verdict is resolved to `in` (see the oracle report's Verdict
resolution subsection, same evidence shape as West Yorkshire's LNER row at Leeds — unreserved
Coach C/Coach M always available, no compulsory reservation, no check-in barrier). No stop-ownership
reason in the pack survives that resolution — the multi-region-ledger flag is about station
*grouping* (whether Peterborough should one day merge with a future East Midlands/LNER Peterborough
entry), not about hiding a walk-up-boardable service from the board. Per the brief's instruction,
the exclusion is **removed**: `lib/cities/greater-anglia/stations.json`'s Peterborough entry no
longer carries `excludeOperators`, and `qa/greater-anglia-dogfood-gate.mjs` asserts both that the
catalog entry carries none and that LNER rows genuinely appear on Peterborough's live board.

Live Peterborough sample (5 Sep 2026, unfiltered board): Birmingham New Street (CrossCountry),
**Edinburgh (LNER)**, Horsham (Thameslink), **Leeds (LNER)**, Lincoln Central (East Midlands
Railway), Lincoln Central (LNER), **London Kings Cross (LNER)**, Norwich (East Midlands Railway),
Nottingham (East Midlands Railway), Stansted Airport (CrossCountry). Three of ten live chips are
LNER — exactly the rows the old `excludeOperators` boundary would have hidden.

### Board eligibility — two live discoveries, both already-recorded operators

Live probing surfaced two operators at stations the D1 station table didn't itemise per station.
Neither is a fresh unverified inclusion — both already carry a recorded `in` verdict elsewhere,
same precedent as Thames Valley's CrossCountry-at-Oxford discovery:

- **Great Northern** at Cambridge, King's Lynn and Ely (prints "Cambridge"/"London Kings Cross" at
  Cambridge and King's Lynn, "Cambridge"/"London Kings Cross" at Ely). Great Northern is part of the
  Greater Thameslink Railway family this pack's own oracle report already groups under "Thameslink"
  with an `in` verdict at Cambridge/Peterborough (report line 91), and London & South East National
  Rail's own oracle records an explicit `in` verdict for Great Northern by name (oracle line 148,
  "no compulsory reservation, open seating").
- **CrossCountry** at Stansted Airport (prints "Birmingham New Street"/"Cambridge"). CrossCountry
  already carries an `in` verdict in this pack's own oracle report for the Peterborough/Ely Hereward
  Line corridor — same operator, same verdict, a newly observed calling point.

Both are included on their respective boards (no operator-level filtering is applied to either) and
documented in `lib/cities/greater-anglia/stations.json`'s per-station `operators` arrays and notes.

### Hub decision: "Norwich" wired at Thetford and Ely

Every one of the 14 catalogued stations' live chip sets was probed
(`node scripts/probe-uk-board.mjs "<name>" --region=greater-anglia`, and `--filter-crs=NRW` /
`--filter-crs=CBG` / `--filter-crs=LST` where relevant) for the three candidates the brief named:

- **Operator split on "Norwich"** (Liverpool shape — label "Norwich", `filterCrs: NRW`, absorbing
  "Norwich"): **found**, at both Thetford (TTF) and Ely (ELY). Both stations' live boards print
  "Norwich" under both East Midlands Railway and Greater Anglia. Filtered-board evidence
  (`--filter-crs=NRW`) confirms every one of those trains genuinely calls at Norwich: 5 trips from
  Thetford (2 East Midlands Railway, 3 Greater Anglia), 3 trips from Ely (1 East Midlands Railway, 2
  Greater Anglia). Wymondham and Diss were probed with the same filter and rejected — both print
  "Norwich" under Greater Anglia only, no split. **Built**: one hub, label "Norwich", `filterCrs:
  NRW`, `appliesFrom: [TTF, ELY]`, `absorbs: [Norwich]` — `lib/cities/greater-anglia/
  direction-hubs.json`.
- **"Cambridge" split** at Ely (Greater Anglia vs Thameslink/CrossCountry/Great Northern): **found**,
  but only Great Northern vs Greater Anglia (13 genuine calls via `--filter-crs=CBG`, Great Northern
  printing "Cambridge" repeatedly, Greater Anglia once). **Not built**: the shared
  `lib/cities/uk/direction-hubs.js` helper's `findHubForStation()` returns only the first configured
  hub whose `appliesFrom` includes a given station CRS, so Ely can carry at most one hub. Norwich is
  the higher-value pick (it also covers Thetford); Ely's Cambridge operator-split stays uncollapsed
  (functionally correct via the exact-chip path, shown as two operator-suffixed chips) — same
  infra-limitation shape as Solent's Southampton Central at Fareham, flagged in
  `direction-hubs.json`'s notes for Tim/Luke, not resolved here (editing `lib/cities/uk/*` is out of
  scope for this pack).
- **"London Liverpool Street" split** at Colchester/Ipswich: **not found**. Both stations'
  `--filter-crs=LST` boards show Greater Anglia only (10 genuine calls at Colchester, 5 at Ipswich) —
  no second operator prints "London Liverpool Street" at either station.

Full per-station chip tables (live, 5 Sep 2026, before hub post-processing):

| station | destinations (operator) |
| --- | --- |
| Norwich (NRW) | Beccles (Greater Anglia), Cambridge (Greater Anglia), Derby (East Midlands Railway), Ely (Greater Anglia), Great Yarmouth (Greater Anglia), London Liverpool Street (Greater Anglia), Lowestoft (Greater Anglia), Sheringham (Greater Anglia) |
| Cambridge (CBG) | Brighton (Thameslink), Cambridge North (Greater Anglia), Ely (Greater Anglia), Ipswich (Greater Anglia), Kings Lynn (Great Northern), London Kings Cross (Great Northern), London Liverpool Street (Greater Anglia), Norwich (Greater Anglia), Stansted Airport (CrossCountry), Stansted Airport (Greater Anglia) |
| Ipswich (IPS) | Cambridge (Greater Anglia), Colchester (Greater Anglia), Felixstowe (Greater Anglia), Harwich International (Greater Anglia), London Liverpool Street (Greater Anglia), Lowestoft (Greater Anglia), Norwich (Greater Anglia) |
| Peterborough (PBO) | Birmingham New Street (CrossCountry), Edinburgh (LNER), Horsham (Thameslink), Leeds (LNER), Lincoln Central (East Midlands Railway), Lincoln Central (LNER), London Kings Cross (LNER), Norwich (East Midlands Railway), Nottingham (East Midlands Railway), Stansted Airport (CrossCountry) |
| Colchester (COL) | Clacton-on-Sea (Greater Anglia), Colchester Town (Greater Anglia), Harwich International (Greater Anglia), Ipswich (Greater Anglia), London Liverpool Street (Greater Anglia), Norwich (Greater Anglia), Walton-on-the-Naze (Greater Anglia) |
| Ely (ELY) | Birmingham New Street (CrossCountry), Cambridge (Great Northern), Colchester (Greater Anglia), Derby (East Midlands Railway), Kings Lynn (Great Northern), London Kings Cross (Great Northern), Norwich (East Midlands Railway), Norwich (Greater Anglia), Peterborough (Greater Anglia), Stansted Airport (CrossCountry), Stansted Airport (Greater Anglia) |
| King's Lynn (KLN) | Cambridge (Great Northern), London Kings Cross (Great Northern) |
| Thetford (TTF) | Cambridge (Greater Anglia), Derby (East Midlands Railway), Ely (Greater Anglia), Lowestoft (Greater Anglia), Norwich (East Midlands Railway), Norwich (Greater Anglia), Stansted Airport (Greater Anglia) |
| Diss (DIS) | London Liverpool Street (Greater Anglia), Norwich (Greater Anglia) |
| Wymondham (WMD) | Cambridge (Greater Anglia), Ely (Greater Anglia), Norwich (Greater Anglia) |
| Great Yarmouth (GYM) | Norwich (Greater Anglia) |
| Lowestoft (LWT) | Ipswich (Greater Anglia), Norwich (Greater Anglia) |
| Stansted Airport (SSD) | Birmingham New Street (CrossCountry), Cambridge (CrossCountry), London Liverpool Street (Greater Anglia), Lowestoft (Greater Anglia) |
| Bishops Stortford (BIS) | Cambridge North (Greater Anglia), London Liverpool Street (Greater Anglia), Stansted Airport (Greater Anglia), Stratford (London) (Greater Anglia) |

After hub post-processing, Thetford's and Ely's "Norwich (East Midlands Railway)"/"Norwich (Greater
Anglia)" chips both collapse into a single bare "Norwich" chip — asserted live by
`qa/greater-anglia-dogfood-gate.mjs`.

If a future live pull shows a new operator split or an obscure through-run, that is a fresh probe
result, not a retrofit of this evidence — re-run the probe script and update this section (or
`lib/cities/greater-anglia/direction-hubs.json`) at that point.

**`public/city-directions/greater-anglia.json`:** not generated. Per `qa/bundled-city-directions.mjs`,
that file is only required for every `MULTI_CITY_IDS` entry, and
`scripts/write-city-directions.mjs`'s `EXTRA_BUNDLED_CITY_IDS` (the pre-flip bundling escape hatch)
is currently empty — no other adapter-ready-but-planned UK region uses it either. Nothing in the
current QA suite requires this file before the flip; if Mark's flip adds `greater-anglia` to
`MULTI_CITY_IDS`, `scripts/write-city-directions.mjs` will pick it up automatically at that point.

**QA:** `node qa/greater-anglia-dogfood-gate.mjs` passes both token-free
(MissingDarwinTokenError-tolerant branches) and with `DARWIN_LDB_TOKEN` loaded via
`loadEnvLocal()` (exercises the live dispatch, live next-train, the 14-station CRS sweep, and the
hub-collapse assertion at Thetford/Ely, all for real). `node qa/uk-region-catalog-conformance.mjs`
green. `node qa/run-all.mjs --smoke` green.

**Not done in this pass:** no `MULTI_CITY_IDS`/typedef/`brisbane-dogfood.js`/`journey-model.js` list
edits (Mark's flip commit), no resolution of the Peterborough multi-region ledger de-dup (still
open, unchanged from the D1 pack — a station-grouping question, separate from the now-resolved
board-eligibility one), no live flip (`status` stays `"planned"`), no shared-helper edit
(`lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`, `lib/cities/uk/*` untouched beyond the
read-only imports above), no resolution of the OpenLDBWS/RDM Platform Agreement redistribution
ambiguity (open item for Tim, unchanged).
