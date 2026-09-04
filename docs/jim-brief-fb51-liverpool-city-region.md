# Jim brief: FB-51 — Liverpool City Region on the shared hub helper

**For:** Jim
**From:** Tim (product), scoped by Fable 4 Sep 2026. Third and last FB-51 invocation; the shared helper landed in #210, East Midlands in #210, West of England in #212.
**Read first:** `docs/jim-brief-fb51-uk-hub-rollout.md` (pattern, helper API, guardrails), then `lib/cities/west-of-england/dogfood-next-train.js` and `qa/west-of-england-dogfood-gate.mjs` as the most recent worked example. Liverpool has a **mode split** (National Rail + Merseyrail both via Darwin, see `lib/cities/liverpool-city-region/dogfood-next-train.js` header and `docs/liverpool-city-region-d1/`) — read that header before touching the file; hubs are rail-only and must not disturb the Merseyrail resolution order.
**Scope:** `liverpool-city-region` only. Branch from master.

## Region facts (live Darwin chips, 4 Sep 2026 ~13:30 UTC)

- Liverpool Lime Street: Birmingham New Street (LNR & WMR), Blackpool North (Northern), Chester (Merseyrail), Cleethorpes (TPE), Ellesmere Port (Merseyrail), Manchester Oxford Road (Northern), New Brighton (Merseyrail), … (fan-out — exact-chip path, no hub chip)
- Runcorn: Birmingham New Street (LNR & WMR), **Liverpool Lime Street (Avanti West Coast)**, **Liverpool Lime Street (LNR & WMR)**, **Liverpool Lime Street (Transport for Wales)**, Llandudno (TfW), London Euston (Avanti), …
- Runcorn East: Holyhead (TfW), Manchester Airport (TfW)
- St Helens Central: Blackpool North (Northern), **Liverpool Lime Street (Northern)**, **Liverpool Lime Street (TPE)**, Wigan North Western (Northern)
- St Helens Junction: Liverpool Lime Street (Northern), Manchester Airport (Northern), Wigan North Western (Northern)

The Liverpool case is the **operator-split** shape: the same terminus prints as three chips because `directionChip()` carries the operator suffix. A hub whose label *is* the terminus, fetched via `filterCrs=LIV`, collapses them into one chip that shows every operator's train, with `printedDestination` still "Liverpool Lime Street" (so the render suffix stays hidden — it only shows when the printed terminus differs).

## Work

1. **Wire the region through the shared helper** as West of England is: `getLiverpoolCityRegionDogfoodDirections` post-processes rail chips with `applyDirectionHubs` (metro/Merseyrail mode untouched); `getLiverpoolCityRegionDogfoodNextTrain` plans with `planUkNextTrainFetch` and calls `fetchRegionalDepartureBoard()` for hub and exact, carrying `printedDestination`. Export a `planLiverpoolCityRegionNextTrainFetch` wrapper for the gate.

2. **Hub table — `lib/cities/liverpool-city-region/direction-hubs.json`.** Proposed v1, every row verified live with `scripts/probe-uk-board.mjs "<station>" --region=liverpool-city-region --filter-crs=LIV`; Tim approves `absorbs` in the PR:

| label | filterCrs | appliesFrom | absorbs | why |
|---|---|---|---|---|
| Liverpool Lime Street | LIV | RUN (Runcorn), SNH (St Helens Central), SHJ (St Helens Junction) — plus any other in-catalog rail station whose live board prints Liverpool Lime Street under two or more operators; probe the whole rail catalog (29 stations) and list what you find | Liverpool Lime Street | Collapses the operator split into one chip; nothing else is absorbed — every other terminus keeps its own chip. |

Check the CRS codes against the catalog and Darwin (St Helens Central is SNH, not SHC — verify). If a station's filtered LIV board shows an intermediate-terminus service (e.g. a train terminating at Liverpool South Parkway), that is a *different* printed destination and stays as its own chip — do not absorb it.

3. **Expected effect at Liverpool Lime Street** (before/after in the PR): choosing "Manchester Oxford Road (Northern)" fetches `filterCrs=MCO` via the national index and returns a full board instead of the diluted undirected 15. Confirm the index resolves the printed names of every Lime Street chip; list any that don't (they fall through to undirected, unchanged from today).

## Guardrails

Same as the rollout brief: no edit to `lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`, `lib/cities/uk/*` (shared — stop and report if it needs a change), or any other region. Merseyrail/metro behaviour must be byte-for-byte unchanged (the existing gate asserts it). Board-eligibility statement in the PR. Never fabricate. Stage by explicit path. No status flips.

Lane lock: #212's merge carried a `west-of-england (adapter)` lock record into master. That PR is merged, so the post-merge release is due: run `node qa/lane-lock.mjs release united-kingdom` first, then `acquire united-kingdom liverpool-city-region adapter`, and commit `docs/expansion-tracker/lane-locks.json` with your work. Release of *your* lock is post-merge, not yours.

## QA

- Extend `qa/liverpool-city-region-dogfood-gate.mjs` (token-tolerant): hub file loads/validates; `applyDirectionHubs` on the Runcorn chip set above at RUN returns `["Birmingham New Street (LNR & WMR)", "Liverpool Lime Street", "Llandudno (Transport for Wales)", "London Euston (Avanti West Coast)", …]` (one Lime Street chip, no operator suffix, others untouched, `localeCompare` order); same set at LIV unchanged; planner routes "Liverpool Lime Street" at RUN → hub LIV, "Manchester Oxford Road (Northern)" at LIV → exact MCO, nonsense → undirected, metro mode → undirected; end-to-end with token returns trips whose `printedDestination` equals "Liverpool Lime Street".
- West Midlands, East Midlands and West of England gates unchanged and green.
- `node qa/run-all.mjs --smoke`, then push and open the PR against master with: before/after chip tables for RUN, SNH, SHJ and LIV; a RUN→LIV filtered sample showing all three operators on one board; a LIV→MCO row count before vs after; the absorbs table for Tim; the eligibility statement; the lane-lock release command.
