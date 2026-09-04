West Yorkshire D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is
unblocked AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("west-yorkshire") must fail** (city is not in `lib/providers/registry.js` CITIES
today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
west-yorkshire live from this pack. Do not invent city=westyorkshire, city=leeds, or
city=bradford. Do not touch West Midlands, Greater Manchester, Liverpool City Region, East
Midlands, North East, West of England, or South Wales/South Yorkshire — same account-level
National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `West Yorkshire` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/west-yorkshire-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## STOP CONDITION FOR MARK: Board eligibility section is missing from the oracle report

**Read this before wiring anything.** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026)
requires every oracle-clash report to carry a **Board eligibility** section — a table of every
rail service calling at in-catalog stations with a verdict (`in` / `out-reservation` /
`out-checkin` / `out-mode` / `out-product` / `undecided`) and evidence URL, or the explicit
sentence "No services other than the in-scope operator call at any in-catalog station — verified"
if trivially empty.

`docs/west-yorkshire-d1/oracle-clash-report.md` has **neither**. It names the operators (Northern
Trains, TransPennine Express) but never tests either against the walk-up boarding contract (§2 of
the rule: compulsory reservation? check-in barrier?). This is a real gap in Nico's report, not
something this pack can quietly fill — per the rule, verdicts are Nico's research output, carried
into the D1 pack by Luke, not invented by Luke. I did not fabricate a Board eligibility table here.

**Action needed before this city can pass Mark's QA gate:** a Nico follow-up pass on
`docs/west-yorkshire-d1/oracle-clash-report.md` specifically adding the Board eligibility section
(verify Northern Trains and TransPennine Express against both tests at Leeds Station, Bradford
Forster Square, Bradford Interchange, and the regional/through-running stations below). Until that
section exists, `coverageGaps` in `published-network.json` carries this as an open item, and per
`docs/board-eligibility-rule.md` §5, Mark's checklist item "(1) the section exists and has no
`undecided` rows" will fail — correctly. Do not let this city reach a flip-PR without it.

This mirrors what the task brief flagged as having "bit us on South Wales tonight" — South Wales'
own oracle report *does* carry a Board eligibility section (line 31, summary at line 54), so if
South Wales still hit a gate issue tonight it was likely a different Board-eligibility failure mode
(e.g. adapter filtering not matching a recorded verdict, per rule §5 item 2) — not a missing
section like this one. West Yorkshire's failure mode is the section not existing at all, which is
a Nico-side gap, not a Jim-side wiring gap. Flagging the distinction so it isn't mis-diagnosed.

## Hub lock

**Leeds Station (LDS)** is the locked hub — major interchange, 18 platforms (0-17), Network Rail,
central hub for West Yorkshire Metro transit authority (report line 17, C2/C3 point 1: "rail only;
bus connections at separate interchange"). **Bradford Forster Square (BDQ)** is a secondary hub —
main Bradford rail station (report line 18). **Bradford Interchange (BDI)** is a separate station,
connected to BDQ only by walk-link, not a shared platform — doNotGroup applies between BDQ and BDI
(report line 19, C2/C3 point 2). See hazard-pack.md H1/H6.

## doNotGroup rules to carry into the adapter

1. **Leeds Station: National Rail platforms vs. bus/coach platforms** (report C2/C3 point 3).
   Forward note only — bus is out of v1 scope, so there is no bus board to group against yet, but
   do not merge one in later without a doNotGroup rule at this station.
2. **Bradford Forster Square (BDQ) vs. Bradford Interchange (BDI)** (report C2/C3 point 2). Both
   are in-catalog National Rail stations (BDI carries Northern Trains rail service, not just bus)
   — they are two distinct catalog entries, walk-link connected, not a merge.

## Boundary de-dup: Denby Dale and Walsden — NOT resolved, flag for D2

**Denby Dale (DBD)** is the South Yorkshire boundary point on the Penistone Line (report line 20).
`docs/south-yorkshire-d1/published-network.json` already carries Denby Dale in its own
`throughRunningOnly` list (CRS left `null` there, flagged as a West Yorkshire de-dup concern in
that pack's hazard-pack.md and jim-handoff.md). This pack supplies the CRS code (DBD) from this
report's own station table but does **not** resolve which region's catalog entry should survive at
D2, or whether both regions keep independent through-running-only entries permanently. Same open
shape as South Wales' Severn Tunnel Junction vs. Chepstow discrepancy — flagged, not guessed at.

**Walsden (WDN)** is the Greater Manchester boundary point on the Calder Valley Line (report line
21). No Greater Manchester D1 pack exists yet (still account-blocked/unpacked per report line 32)
— nothing to reconcile against yet; flagged for whenever that pack is written.

## Direction model recommendation (National Rail only)

**Destination + operator** (e.g. `Manchester Piccadilly (TransPennine Express)`, `Sheffield
(Northern)`), matching how National Rail departure boards actually present and identical in shape
to every other UK National Rail region packed so far. No line+terminus model — Northern Trains and
TransPennine Express do not brand these corridors with named boardable line products here either.
**Illustrative only, not verified** — no destination strings can be confirmed until
`DARWIN_LDB_TOKEN` exists and a real Darwin payload can be pulled. See direction-model-memo.md.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region — OGL 2.0 baseline permits redistribution with attribution, but the RDM
   Platform Agreement's language on downstream redistribution to third-party rider clients isn't
   confirmed in public sources. Confidence: `unclear`. Review the signed RDM Data Sharing Agreement
   once EvansAppStudio re-registers.
2. **Bus real-time availability** — report C2/C3 point 6 asks whether First West Yorkshire /
   Arriva Yorkshire / Transdev will publish real-time; defer v1 bus to a later wave until an answer
   exists. Not a Luke or Jim action.
3. **Denby Dale / Walsden boundary de-dup** (above) — needs a human or a future Nico pass per
   corridor, not something for Jim to pick between during adapter wiring.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). Bus GTFS (DFT aggregator) is OGL 3.0,
confidence `clear`, reference-only since buses are out of v1 scope.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no bus or West
Yorkshire Metro station graph, direction model, or catalog entry of any kind (buses deferred, WY
Metro planning-only — see published-network.json scopeNote), no fabricated Board eligibility
verdicts (flagged above as a Nico-side gap instead), no resolution of the Denby Dale or Walsden
cross-region de-dup or the RDM redistribution ambiguity (all flagged for Tim/Nico/D2), no reading
of any other city's in-progress pack (South Yorkshire's merged, finished pack was read once for
the Denby Dale boundary check only, per this task's explicit instruction), no wiring of
`DARWIN_LDB_TOKEN`.

## 5 Sep 2026 — pre-adapter hygiene (Fable, top-level session)

- **CRS codes verified live against Darwin** with `scripts/fix-uk-region-crs.mjs west-yorkshire --write`:
  four of ten were wrong (Denby Dale DDL→**DBD**, Walsden WAD→**WDN**, Hebden Bridge HBN→**HBD**,
  Keighley KEY→**KEI**; the old codes resolved to a 400, Wadhurst, Hollingbourne and Keyham). Codes are
  corrected in `stations.json`, `published-network.json`, this pack's prose and the planned gate;
  lat/lng (previously null) filled from NaPTAN. Same defect class as West Midlands' 17 wrong codes
  (#208) — the adapter gate must carry the token-gated catalog sweep so it cannot regress.
- **The "STOP CONDITION FOR MARK" above is stale**: `oracle-clash-report.md` now carries a Board
  eligibility section (Northern, LNER, CrossCountry, TransPennine Express — all `in`, no `undecided`
  rows). Mark's checklist item (1) passes.
- `DARWIN_LDB_TOKEN` exists (live since 2 Sep 2026); the account-level blocker described above is
  resolved, so the adapter can be built and verified live now.

## 5 Sep 2026 — Adapter wired (Jim, docs/jim-brief-west-yorkshire-adapter.md)

**What was built:** `lib/cities/west-yorkshire/dogfood-next-train.js`
(`getWestYorkshireDogfoodDirections`, `getWestYorkshireDogfoodNextTrain`,
`planWestYorkshireNextTrainFetch`, `listWestYorkshireDogfoodStations`) over
`fetchStationBoard`/`fetchRegionalDepartureBoard` from
`lib/providers/uk-darwin.js` via the existing `lib/providers/west-yorkshire.js`
region config, wired through the shared hub helper
(`lib/cities/uk/direction-hubs.js`) with the national CRS index
(`lib/cities/uk/rail-crs-index.js`) as the exact-chip fallback — same shape as
West of England, copied structurally, not forked. `lib/cities/live-city-api.js`
gained `west-yorkshire` switch-cases in `directionsFor()` and
`getMultiCityNextTrain()` (dispatch is safe ahead of the flip — production
routes gate on `assertCityLive()` first, not on `MULTI_CITY_IDS` membership).
`qa/west-yorkshire-planned-gate.mjs` retired; replaced by
`qa/west-yorkshire-dogfood-gate.mjs`, registered in `qa/run-all.mjs`'s smoke
tier. `lib/providers/registry.js`'s west-yorkshire `notes` field updated to
record the live-verified adapter and the flip-commit list additions Mark still
owns; **`status` stays `"planned"`** — not flipped by this pass.
`west-yorkshire` was deliberately **not** added to `MULTI_CITY_IDS`, the
`MultiCityId` typedef, `brisbane-dogfood.js`'s mount/available map, or
`journey-model.js`'s persisted-city/country lists — those are Mark's flip
commit (`qa/live-city-lists-sync.mjs` enforces they equal the registry's live
set).

**Live evidence:** all ten CRS codes (LDS, BDQ, BDI, DBD, WDN, HUD, HFX, TOD,
HBD, KEI) resolve at Darwin to their catalogued station name — the CRS sweep
in `qa/west-yorkshire-dogfood-gate.mjs` (10 cheap `numRows=1` calls) passes
with `DARWIN_LDB_TOKEN` set. Sample Leeds Station board (5 Sep 2026, live):
Blackpool North (Northern), Bradford Forster Square (Northern/LNER), Carlisle
(Northern), Chester (Northern), Doncaster (Northern), Glasgow Central
(CrossCountry), Hull (Northern), London Kings Cross (LNER), Manchester
Victoria (Northern/TransPennine Express), Nottingham (Northern), Plymouth
(CrossCountry), Poppleton (Northern), Saltburn (TransPennine Express), Skipton
(Northern), Wigan Wallgate (Northern), York (Northern).

**Hub decision: no `direction-hubs.json` shipped for v1.** Every one of the
ten catalogued stations' live chip sets was probed
(`node scripts/probe-uk-board.mjs "<name>" --region=west-yorkshire`) looking
for the two candidates the brief named:

- **Operator split on "Leeds"** (would take the Liverpool shape: label
  "Leeds", `filterCrs: LDS`, absorbing "Leeds"): not found. Every station that
  prints a "Leeds" chip prints it under exactly one operator — Northern at
  Bradford Forster Square, Bradford Interchange, Denby Dale (via
  Huddersfield/Sheffield direction only, no direct Leeds chip), Walsden,
  Halifax, Todmorden, Hebden Bridge, and Keighley; TransPennine Express at
  Huddersfield. No station shows both.
- **Through-service past Leeds to an unrecognisable terminus** (Kidderminster
  shape): not found. Every non-Leeds chip at every regional station is itself
  a real, board-recognisable terminus (Chester, Blackpool North, Manchester
  Victoria, York, Hull, Sheffield, Carlisle, Skipton, Ilkley, Blackburn,
  Wigan Wallgate, Cottingley), not an obscure through-run a rider would rather
  see collapsed to "Leeds".

Full per-station chip tables (live, 5 Sep 2026):

| station | destinations (operator) |
| --- | --- |
| Leeds Station (LDS) | Blackpool North (Northern), Bradford Forster Square (Northern), Carlisle (Northern), Chester (Northern), Doncaster (Northern), Glasgow Central (CrossCountry), London Kings Cross (LNER), Manchester Victoria (Northern), Manchester Victoria (TransPennine Express), Plymouth (CrossCountry), Saltburn (TransPennine Express), Skipton (Northern), Wigan Wallgate (Northern), York (Northern) |
| Bradford Forster Square (BDQ) | Ilkley (Northern), Leeds (Northern), Skipton (Northern) |
| Bradford Interchange (BDI) | Blackpool North (Northern), Chester (Northern), Cottingley (Northern), Halifax (Northern), Hull (Northern), Leeds (Northern), Manchester Victoria (Northern), York (Northern) |
| Denby Dale (DBD) | Huddersfield (Northern), Sheffield (Northern) |
| Walsden (WDN) | Blackburn (Northern), Leeds (Northern), Wigan Wallgate (Northern) |
| Huddersfield (HUD) | Hull (TransPennine Express), Leeds (TransPennine Express), Liverpool Lime Street (TransPennine Express), Manchester Airport (TransPennine Express), Manchester Piccadilly (TransPennine Express), Manchester Victoria (TransPennine Express), Newcastle (TransPennine Express), Redcar Central (TransPennine Express), Scarborough (TransPennine Express), Sheffield (Northern), York (TransPennine Express) |
| Halifax (HFX) | Blackpool North (Northern), Bradford Interchange (Northern), Chester (Northern), Hull (Northern), Leeds (Northern), Manchester Victoria (Northern), York (Northern) |
| Todmorden (TOD) | Blackburn (Northern), Chester (Northern), Leeds (Northern), Manchester Victoria (Northern), Wigan Wallgate (Northern) |
| Hebden Bridge (HBD) | Blackpool North (Northern), Chester (Northern), Leeds (Northern), Manchester Victoria (Northern), Wigan Wallgate (Northern), York (Northern) |
| Keighley (KEI) | Bradford Forster Square (Northern), Carlisle (Northern), Leeds (Northern), Skipton (Northern) |

If a future live pull shows an operator split or an obscure through-run
appearing at any of these stations, that is a fresh probe result, not a
retrofit of this evidence — re-run the probe script and update this section
(or add `lib/cities/west-yorkshire/direction-hubs.json`) at that point.

**Board eligibility:** unchanged from the "5 Sep 2026 — pre-adapter hygiene"
section above — all four operators (Northern, LNER, CrossCountry,
TransPennine Express) verdict `in`, no `undecided` rows; this adapter applies
no operator-level filtering.

**`public/city-directions/west-yorkshire.json`:** not generated. Per
`qa/bundled-city-directions.mjs`, that file is only required for every
`MULTI_CITY_IDS` entry, and `scripts/write-city-directions.mjs`'s
`EXTRA_BUNDLED_CITY_IDS` (the pre-flip bundling escape hatch) is currently
empty — no other adapter-ready-but-planned UK region uses it either. Nothing
in the current QA suite requires this file before the flip; if Mark's flip
adds `west-yorkshire` to `MULTI_CITY_IDS`, `scripts/write-city-directions.mjs`
will pick it up automatically at that point.

**QA:** `node qa/west-yorkshire-dogfood-gate.mjs` passes both token-free
(MissingDarwinTokenError-tolerant branches) and with `DARWIN_LDB_TOKEN` loaded
via `loadEnvLocal()` (exercises the live dispatch, live next-train, and the
10-station CRS sweep for real). `node qa/run-all.mjs --smoke` green.

**Not done in this pass:** no hub file (see decision above), no
`MULTI_CITY_IDS`/typedef/`brisbane-dogfood.js`/`journey-model.js` list edits
(Mark's flip commit), no resolution of the Denby Dale/Walsden cross-region
de-dup (still open, unchanged from the D1 pack), no live flip
(`status` stays `"planned"`), no shared-helper edit
(`lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`,
`lib/cities/uk/*` untouched beyond the read-only imports above).
