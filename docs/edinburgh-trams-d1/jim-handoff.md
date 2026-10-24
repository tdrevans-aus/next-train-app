# Edinburgh Trams - Jim handoff

Pack: `docs/edinburgh-trams-d1/{hazard-pack.md, direction-model-memo.md, published-network.json}`. Input was
`oracle-clash-report.md` (Option A, approved by Tim 24 Oct 2026), `docs/united-kingdom-ledger.md` and
`docs/edinburgh-d1/`. This pack flips nothing. Luke touched no `lib/`, `qa/`, ledger or tracker file.

## Decision: trams join the existing `edinburgh` city as a second mode

Not a new city. Same pattern as Dublin Luas / Copenhagen Metro. Tram stops are `mode: "metro"` with
`catalogId: "tram:<slug>"`, which is the shape already in `lib/cities/edinburgh/stations.json`. Existing National
Rail entries (EDB, HYM, SLA, EGY, EDP and the rest of the 37) are unchanged. No tram hub-lock.

## What is in the pack

- 23 stops, Airport to Newhaven, in `published-network.json` `stops` (sequence 1-23) and `lines[0].stations`.
- 22 of them match entries already in the live catalog (coordinates reused). **One is new: Edinburgh Park Station**
  (tram stop 7), with `lat/lng: null`; geocode from NaPTAN (StopType MET, "(Edinburgh Trams)" suffix) before wiring.
- `doNotGroup`: Haymarket, Edinburgh Gateway, Edinburgh Park (tram vs rail), plus Park Central vs Park Station.
- York Place closed (Feb 2022) and absent; recorded only under `excludedStations`.
- `displayPolicy`: live times only; never render `sched`; drop events without live values; empty state wording
  "No live predictions for this stop right now"; `pred == sched` not shown as live until G2.

## Work for you (not done by Luke)

1. **Fix `lib/cities/edinburgh/tram-directions.js`**: remove the stale `Edinburgh Waverley` metro/train
   `DO_NOT_GROUP_PAIRS` entry (no Waverley tram stop exists); add the Edinburgh Park pairs; reverse or re-key
   `TRAM_STATIONS` to the official 23 (it has 22, missing Edinburgh Park Station); `TRAM_STATION_ORDER_VERIFIED`
   stays false until G5.
2. **Add the 23rd stop** to `stations.json` and fix the catalog note that records the "22 vs 23" discrepancy.
3. **Replace `EdinburghTramsFeedUnverifiedError`** with a real tram board in `lib/providers/edinburgh.js` using the
   Trapeze API (`POST /stops/GetFilteredStops`, `GET /stops/StopEvents`, try v1.2). Resolve NaPTAN ids (platform
   suffix 1/2) at wire time and store them as `stopIds`. Key header `Ocp-Apim-Subscription-Key`, env
   `EDINBURGH_BUSTRACKER_KEY` (already set; never log, commit or echo it). `StopEvents` returns one object, not an
   array.
4. **Time handling**: parse `sched`/`pred` as UTC and convert to Europe/London (see hazard-pack H7). The DST change
   is Sun 25 Oct 2026, so the probe cannot be re-used to discriminate UTC from local until March 2027 unless you
   sample before the change. Handle midnight rollover (bare `HH:MM`).
5. **Query cap**: `maxEvents=4` / 60 min looks sparse at 7-10 minute headways. Test a larger cap.
6. **Cache and rate limits**: unknown. Do not exceed whatever G6 settles; follow the Darwin 20 s server-cache
   pattern if production use is permitted. Respect the 30 s ceiling rule; keep cold boards fast.
7. At the flip commit only: set tram `liveFeed: true`, add trams to the picker (no Coming Soon), update the ledger
   (Edinburgh row, section 4 coverage bullet, parked-modes table), and clear the "DFT BODS T50 confirmed" claim.

## Flip gates (Mark's, listed fully in hazard-pack.md)

G1 Tim confirms the Trapeze/Journeo terms in writing (paid app plus onward relay). G2 realtime sampling test
(null semantics, `pred == sched` echo, zone, countdown behaviour). G3 provenance (same data as the Edinburgh Trams
and Lothian apps). G4 Stop Services check at all 23 stops for other operators. G5 stop order and full-length running.
G6 all-stations live sweep, rate limits, production key use.

## Board eligibility

T50: `in` (contactless tap-on, no reservation, no barrier), conditional on the live-only display rule. ScotRail at
EGY and EDP: `in`, carried. "No other services call at any in-catalog tram stop - verified" is **not yet writable**
(G4).

## Open questions for Jim

1. Can the key be used from the hosted production server, and what are the per-second/day limits? (Viv questions 5, 6.)
2. Does null `departuretime` mean "no prediction" or "scheduled only"? Is `pred` UTC or local? (Viv question 4.)
3. Platform-to-direction mapping at each stop and the Newhaven 1 / Newhaven 2 behaviour; which platform is the
   departing one at each terminus.
4. Is v1.2 the supported version and what is the retirement notice for v1.1?
5. Coordinates for Edinburgh Park Station.
6. Whether a static GTFS with EDT/T50 exists at all (the earlier DFT BODS claim could not be reproduced); not needed
   for a live-only board, but it would help verify the stop order.
7. Does the ledger edit belong in your flip PR or the controller's? Luke did not touch it.

---

# Wiring result (Jim, 24 Oct 2026) - wired, switched OFF

Brief: `docs/jim-brief-edinburgh-trams-wire.md`. Tim closed G1 the same day (recorded in `hazard-pack.md`, G1 row).
Edinburgh stays live for National Rail; riders see no change until Mark's flip PR sets one registry field.

## The switch

`tramsLive: false` on the `edinburgh` entry in `lib/providers/registry.js`, read through
`lib/cities/edinburgh/trams-switch.js` (`isEdinburghTramsLive()`). Scoped to the tram mode only; the city `status`
stays `live`. A registry field (a reviewed, revertable one-line PR), not an env var. With it off:

- `fetchTramStopBoard()` throws `EdinburghTramsFeedUnverifiedError` exactly as before;
- `lib/cities/edinburgh/stations.json` is untouched (22 tram rows, `liveFeed:false`). The tram overlay
  (`trams-api.json`: platform ids, the 23rd stop) is applied by `trams-catalog.js` only when the switch is on, from the
  two catalog loaders (`lib/providers/uk/catalog.js`, `lib/cities/live-city-api.js`); off, they return the same array;
- the dogfood directions path falls through to its old behaviour.

Byte-identity is proved by `qa/edinburgh-trams-planned-gate.mjs`: 72 rider surfaces hashed against
`qa/fixtures/edinburgh-trams-switch-off.golden.json`, which was captured from unmodified master (commit 9f091db1)
before any tram edit, by `qa/lib/edinburgh-trams-surface.mjs`: `/api/city-stations`, `/api/country-stations`
(Edinburgh rows), `/api/cities` (Edinburgh entry), `/api/board` and `/api/directions` for every tram-only stop, Near me
around all 22 tram stops, the UK region catalog, the dogfood list, `public/city-directions/edinburgh.json`.
The switch-ON half runs offline in a child process (`qa/lib/edinburgh-trams-on-state.mjs`, 42 checks, stubbed fetch).

## What was built

- `lib/providers/edinburgh-trams.js`: StopEvents adapter. Typed `MissingEdinburghTramsKeyError` (a
  `FeedUnavailableError`); `FeedUnavailableError` on network failure, non-2xx, unparseable or wrong-shaped body (#502
  path); single-object body; 20 s per-platform server cache with in-flight de-duplication; 8 s timeout.
- `lib/cities/edinburgh/trams-time.js`: bare `HH:MM` read as UTC, anchored to the response `time`, converted
  explicitly to Europe/London; midnight rollover within +/-12 h of the response time.
- `lib/cities/edinburgh/trams-api.json`: the 23 stops with Trapeze platform ids; Edinburgh Park Station coordinates.
- `tram-directions.js`: official 23-stop list (west to east), Waverley pair removed, Edinburgh Park pairs added,
  one chip per terminus, `waverley tram stop` / `york place` forbidden names.
- Ledger rows (3) updated to "API found 24 Oct 2026; wired, not live".

## Live probe (24 Oct 2026, 09:47 UTC = 10:47 BST, four stops through the real adapter, about 20 requests, 0.8-1.5 s apart)

| Stop | Raw events (both platforms) | No live value | Countdown | Clock != sched | Clock == sched (dropped) | Live trips on board |
|---|---|---|---|---|---|---|
| Haymarket | 32 | 23 | 3 | 5 | 1 | 8 |
| Edinburgh Park Station | 32 | 26 | 0 | 5 | 1 | 5 |
| Edinburgh Airport | 16 (platform 1 only) | 11 | 2 | 2 | 1 | 4 |
| Newhaven | 16 (platform 2 only) | 12 | 1 | 1 | 2 | 2 |

Most rows carry no live value (trips not yet running), as expected from a tracked-vehicle feed. The board shows only
the live ones. Next-train through the dogfood module for Haymarket towards Newhaven returned London-local times.

## Findings that change the D1 notes

- Field names are `scheduledeparturetime`, `schedulearrivaltime`, `departuretime`, `arrivaltime` (the report's
  `sched`/`pred` are shorthand). `departuretime` is a number (countdown seconds from the response `time`), a bare
  `HH:MM` string, or null. A `status: "delayed"` flag accompanies some string predictions.
- **Zone resolved for the BST period (H7):** the response carries `time` as ISO-Z and each event a
  `journey.start` ISO-Z. At 09:37:24Z a Haymarket event scheduled "09:40" belongs to a journey that started
  09:15Z, i.e. 3 minutes away; so bare clocks are **UTC**. Countdowns agree: 608 s from 09:37:24Z is 09:47:32Z, within
  32 s of the 09:47 schedule. A winter sample cannot repeat this; this is the BST sample G2 asked for.
- Platform 1 departs towards Newhaven, platform 2 towards Edinburgh Airport at all 10 platforms probed (Haymarket,
  Edinburgh Park Station, Newhaven, Edinburgh Airport, Picardy Place), including both termini. Newhaven 1 and Airport 2
  return rows with no destination (arrivals), which the adapter drops. `GetFilteredStops` returns a national list
  (2,559 PLT/MET stops); the 75 in the Edinburgh box include the depot (not a passenger stop, excluded) and York Place
  (excluded).
- `maxEvents` is honoured: asking for 40 at Haymarket 1 returned 16, so the lookahead is about 2 hours. The adapter
  asks for 16 per platform. Unknown query parameters (`maxLookahead`) return 400; `lookahead` is ignored.
- Edinburgh Park Station coordinates: 55.92746860761, -3.30694115169, the NaPTAN record `9400ZZEDPKS` returned by
  `POST stops/GetFilteredStops` (same NaPTAN source and parent-record convention as the other 22 stops).

## For Mark's flip PR (the flip commit, in addition to `tramsLive: true`)

1. `lib/cities/edinburgh/coverage.json`: the "Edinburgh Trams ... no confirmed live-times feed" `partial` entry, the
   "59 stations" string and the Waverley note are now wrong with the switch on. Rider copy, so left for the flip.
2. Fix the "22 vs 23" and `liveFeed:false`/"Schedule-only v1" notes in `stations.json` (deliberately untouched so
   the off state is byte-identical), or fold the overlay into `stations.json`.
3. `public/station-combobox.js` already labels Edinburgh metro entries "Trams"; no change expected. Regenerate
   `public/city-directions/edinburgh.json` only if tram chips should be precomputed (it is rail-only today).
4. `scripts/list-no-live-feed-stops.mjs` and `qa/lib/no-live-feed-gate-helper.mjs` assert every Edinburgh metro stop is
   `liveFeed:false`; the flip must drop Edinburgh from them (and `qa/edinburgh-dogfood-gate.mjs`'s 22-stop/59-station
   assertions and `qa/feed-unconfirmed-rider-copy.mjs`'s Newhaven case), then keep this gate's switch-ON checks as
   the dogfood coverage (its switch-off half becomes obsolete once `tramsLive` is true).
5. Vercel env: `EDINBURGH_BUSTRACKER_KEY` must exist in Production before the flip (it is in `.env.local` only).

## Answers to "Open questions for Jim"

1. Production use and rate limits: still unknown (G6). Mitigation in place: 20 s per-platform cache, 2 calls per
   stop per 20 s, no polling loops. The probe saw no throttling at about 1 request/s.
2. Null `departuretime` = no live value (a scheduled, not-yet-tracked trip). Clock strings are UTC. Equal-to-schedule
   strings are dropped until G2 shows they are real.
3. Platform mapping: see above; Newhaven 2 and Airport 1 are the departing platforms.
4. v1.2 is what answers; a v1.1 retirement notice was not found (unchanged).
5. Edinburgh Park Station coordinates: found (above).
6. Static GTFS: not needed and not pursued.
7. The ledger edit was made in this PR (three rows).

## Open for G2-G6

- G2: whether `pred == sched` strings are ever real, and whether countdown numbers can echo the schedule (a
  countdown exactly matching sched cannot be told from an echo; none observed). Two trams predicted a minute apart at
  Edinburgh Airport (10:59 and 11:00 BST) look like bunching or a stale prediction - worth a person at the stop.
- G4: Stop Services check at all 23 stops not done (only operator `EDT` / service `T50` seen in the probe).
- G5: stop order and full-length running not verified; direction chips do not depend on them.
- G6: the all-stations sweep has not been run; and the shared-name stops (Haymarket, Edinburgh Gateway) cannot be
  addressed as trams by `/api/board?station=<name>` because the API has no `mode` parameter and resolves rail
  first (next section).

## Known limit to decide before the flip

`/api/board`, `/api/directions` and `/api/next-train` take a station *name* only. For Haymarket and Edinburgh Gateway
a tram request resolves to the National Rail station first, as for the existing Metrolink/Supertram/NET regions with
shared names. The picker already disambiguates visually ("Trams"), but the request carries the bare name. Edinburgh
Park Station is safe (the rail name is "Edinburgh Park"). Making the tram stop addressable needs a client or API `mode`
change, which is outside this brief (shared product UI / API shape); flagged, not done.

---

# Flip prep (Jim, 24 Oct 2026) - switch still OFF

Brief: `docs/jim-brief-edinburgh-trams-flip-prep.md`. Mark's PASS note on #523:
https://github.com/tdrevans-aus/next-train-app/pull/523#issuecomment-6382867176. `tramsLive` is still `false`;
switch-off output is unchanged (the 72-surface golden still matches with 0 diffs, and `/api/coverage-notes?city=edinburgh`
is asserted byte-identical to `coverage.json`).

## Decision (Tim, 24 Oct 2026): first flip withholds the tram Haymarket and tram Edinburgh Gateway

`/api/board`, `/api/directions` and `/api/next-train` take a bare name and resolve rail first, so a rider tapping the
tram Haymarket would get the rail board. With the switch ON, `applyEdinburghTramsToStops()`
(`lib/cities/edinburgh/trams-catalog.js`, ids in `TRAM_SHARED_NAME_HIDDEN_CATALOG_IDS`) drops `tram:haymarket` and
`tram:edinburgh-gateway`, so they are absent from the picker, Near me, the station lists, the UK region catalog and
directions (every catalog consumer goes through that one function). Result: 21 tram stops (58 Edinburgh entries).
HYM and EGY (rail) are untouched; Edinburgh Park Station and Edinburgh Park Central are unaffected. The coverage note
("Trams at Haymarket and Edinburgh Gateway aren't shown yet; their rail departures are.") is in
`lib/cities/edinburgh/coverage-trams.json`, served by `api/coverage-notes.js` in place of `coverage.json` only while
the switch is on (`applyEdinburghTramsCoverage`).

**Follow-up, not built:** give the API and client a `mode` (or stop-id) parameter so these two stops can return.
Removing the two ids from `TRAM_SHARED_NAME_HIDDEN_CATALOG_IDS` and editing the coverage note is then the whole catalog
change. `trams-api.json` still carries both stops' platform ids.

## Bundling

`trams-api.json` (and `coverage-trams.json`) are now static `import ... with { type: "json" }` (the repo's existing
pattern, e.g. `lib/cities/sydney/marketing-directions.js`), not a computed-path `readFileSync`. Proven with
`@vercel/nft` run on `api/board.js`, `api/directions.js`, `api/next-train.js` and `api/coverage-notes.js`: all four
trace `lib/cities/edinburgh/trams-api.json`, `coverage-trams.json`, `trams-catalog.js`, `trams-switch.js`,
`trams-time.js`. No `vercel.json` change.

## HTTP error propagation

`qa/lib/edinburgh-trams-on-state.mjs` now serves a 429 with `Retry-After: 120` and a valid JSON body, and a 503 with
a valid JSON body; both must give `FeedUnavailableError` with the same `status` and (429) `retryAfterMs === 120000`.
Mutation: `if (!response.ok)` -> `if (false)` turns the gate red on those three checks (before, it stayed green).

## Flip to-do list: done vs left

Done now (safe with the switch off): `coverage.json` copy (as `coverage-trams.json`, switch-selected); the
no-live-feed script/gate exemption (`scripts/list-no-live-feed-stops.mjs` and `qa/no-live-feed-stops-gate.mjs` skip
Edinburgh once the switch is on; `qa/edinburgh-dogfood-gate.mjs` skips its helper call and uses switch-aware
counts 22/59 -> 21/58); the Newhaven case in `qa/feed-unconfirmed-rider-copy.mjs` (omitted once the switch is on).

Left for the flip PR: set `tramsLive: true`; the picker entry (no Coming Soon); the stale `stations.json` notes
("22 vs 23", `liveFeed:false`/"Schedule-only v1") - left because `stations.json` feeds the golden; the rest of
`qa/edinburgh-dogfood-gate.mjs`, whose remaining assertions are still switch-off-only (e.g. "Haymarket must resolve as
a Trams entry", the `EdinburghTramsFeedUnverifiedError` expectations) and should be dropped in favour of the planned
gate's switch-ON checks; `qa/edinburgh-trams-planned-gate.mjs`' switch-off half becomes obsolete; Vercel Production
env `EDINBURGH_BUSTRACKER_KEY`; ledger rows; G2-G6.
