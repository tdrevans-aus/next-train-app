# Edinburgh Trams - flip gates G2-G6 (Mark, 25 Oct 2026)

Brief: `docs/mark-brief-edinburgh-trams-flip-gates.md`. Code under test: master `2e22bb2c` (includes #523 and #524),
`tramsLive` still `false` and untouched. Every check ran through the real adapter (`lib/providers/edinburgh-trams.js`)
with the switch forced on **in-process** (registry entry mutated by a preload; nothing committed). Rider-facing checks
used a local `dev-server.js` on a private port started by the test harness itself (killed by it at the end of each chunk).
Real Trapeze key from the environment only; never printed or written. Calls were >=1 s apart; the adapter's 20 s
per-platform cache applied. Time of day 09:18-10:58 UTC (= GMT, UK clocks went back today), trams running.

## Verdict: NO-GO (two blockers, both small and both on the adapter/catalog side)

| Gate | Result | Evidence (one line) |
|---|---|---|
| G2 real-time sampling | **PASS** (with observations) | 48 polls x 6 platforms over 61.4 min at 90 s cadence, 0 HTTP errors; countdowns fall, events vanish on departure, delays visible, echoes dropped, UTC==GMT conversion clean, board matches raw 235/235 |
| G3 provenance | **PASS (confirmed)** | The official edinburghtrams.com stop pages poll `/api/stop/<same NaPTAN platform id>` and show the same predicted minutes as this API (6 stops compared side by side) |
| G4 other operators | **PASS** | `GetStopServices` at all 44 platform ids (23 stops): only `EDT T50` (serviceRef `EDT T50 a f`); verdict `in` (walk-up) |
| G5 stop order | **PASS** (with one note) | `visitnumber` on 702 events / 48 journeys gives exact sequence 1..22 in both directions = the 23-stop order Airport to Newhaven; official site list order is identical |
| G6 all-stations sweep | **FAIL** | 20 of 21 stops return live tram trips every round; **Edinburgh Park Station serves the ScotRail board** (blocker 1); **no `emptyReason: "no-live-predictions"` on an empty tram board** (blocker 2) |
| Bundle check | **PASS (indirect)** | Production (`2e22bb2c`) serves `/api/city-stations`, `/api/coverage-notes` 200 and `/api/board` 503 `FEED_UNCONFIRMED` (typed error), so the static-import module graph incl. `trams-api.json` loads in the function |

## Blockers

### B1. "Edinburgh Park Station" (tram) is not addressable: the rider board and directions are the National Rail ones

`GET /api/board?city=edinburgh&station=Edinburgh%20Park%20Station` returns Dunblane/Edinburgh/Helensburgh Central/Stirling
(ScotRail, platform numbers, no `realtime` flag on the rows) and `/api/directions` returns
`["Dunblane (ScotRail)","Edinburgh (ScotRail)","Helensburgh Central (ScotRail)","Stirling (ScotRail)"]`,
`source: "edinburgh-darwin-live"`. Cause: `resolveCatalogEntry("Edinburgh Park Station")` returns the rail entry
`Edinburgh Park` (EDP) because the shared rail resolver tolerates a trailing "Station"; the API takes a bare name, so the tram
stop is shadowed exactly like Haymarket and Edinburgh Gateway. Jim's handoff said "Edinburgh Park Station is safe (the rail
name is 'Edinburgh Park')"; that holds for the catalog but not for the request path. `Edinburgh Park Central` resolves correctly
(T50 board, `realtime: true`). A tram stop that is in the picker but shows a rail board is a missing walk-up service
at an in-catalog station (hard fail under the board-eligibility rule). Per-trip check in the sweep: this was the only station
whose trips were not all `realtime: true` (12/12 rounds).
Two options for the controller: (a) add `tram:edinburgh-park-station` to `TRAM_SHARED_NAME_HIDDEN_CATALOG_IDS` and extend the
coverage note (20 tram stops at first flip, same treatment as Haymarket/Gateway); (b) make the resolver prefer the tram entry
for the exact printed name "Edinburgh Park Station" (touches shared UK resolution, so needs its own QA). Recommendation: (a).

### B2. No honest empty state on tram boards

An empty tram board carries no `emptyReason`. Offline check with the real server and a stub that returns only un-tracked
events (null `departuretime`): `/api/board?station=Newhaven` returns 200 with one direction entry, `trips 0`, and no `emptyReason`
(or message); `/api/next-train` returns `next: null, following: null, upcoming: []`, no `emptyReason`. None of
`lib/providers/edinburgh-trams.js`, `lib/providers/edinburgh.js` or `lib/cities/edinburgh/dogfood-next-train.js` sets it (Dublin's
`dublin.js` and `dogfood-next-train.js` are the precedent). The gap is not hypothetical: in the G2 run Newhaven's board was empty
on 3 consecutive polls (09:43:06-09:46:06Z, 16 raw events, none with a live value). Required by
docs/jim-brief-dublin-honest-empty-state.md for every GTFS-RT-style live-sweep: intermittent gaps get
`emptyReason: "no-live-predictions"` ("No live predictions for this stop right now"), permanent gaps get filtered with a coverage
note. No tram stop was empty on every poll (every in-catalog stop except the Edinburgh Park Station shadow had live trips in
12/12 rounds), so the answer for all of them is the empty-state copy, not a coverage-note exclusion.

## G2. Real-time sampling (details)

Platforms: Haymarket 1 and 2 (raw evidence only; the tram Haymarket is hidden from the catalog), Edinburgh Airport 1, Picardy Place 1 and
2, Newhaven 2. 48 polls, 09:18:30Z to 10:19:54Z (61.4 min), one poll = the adapter fetched all platforms once and the raw
upstream bodies were recorded from the same responses, so board-vs-raw is compared on identical data. Upstream latency 0.3-1.4 s
(Haymarket consistently ~1.3 s, outliers to 3.5 s), HTTP 200 on every call.

- **Countdowns fall between polls:** 340 consecutive-poll pairs with numeric countdowns; 306 (90%) fell by the elapsed time +-45 s.
  The 34 exceptions are prediction revisions on trams that were visibly held/late (e.g. countdown unchanged or growing while 90 s passed),
  never a countdown that froze to a schedule; 0 negative countdowns.
- **Events disappear as trams depart:** 24 journeys with a numeric last countdown vanished; median last-seen countdown 48 s, 21 of 24
  within 120 s. Exception: 3 trips at Newhaven 2 (terminus, journey ids 2349_91, 2349_99, 2349_111) vanished with 5-8 minutes still
  predicted (one of them, 2349_99, before even its scheduled time with a "delayed" +5 min prediction). Cannot say whether the tram left
  early or the trip was dropped without a person at the stop; the failure mode is a missing row, not a ghost row.
- **Predicted times move off schedule when late:** 494 live observations at least 60 s after the scheduled minute; 75 events carried
  `status: "delayed"`. Live-minus-scheduled: median 0.5 min, p90 3.2 min, max 11.0 min. A real disruption ran through the window
  (trip 2349_114 held ~10 min; trip 2349_117 closed to 1 min behind it at Haymarket/Picardy and, at Newhaven, was briefly predicted
  19 s *before* the delayed tram ahead of it, an order inversion in the vendor's predictions).
- **The echo test (`pred == sched`):** 502 bare-clock observations equal to the schedule, all of them >=5 min from departure (none inside
  5 min), i.e. far-out placeholders. 35 journeys showed one; 26 later turned into a real prediction (17 of the 26 differing from the
  schedule by more than 30 s). In 237 platform-polls with an echo present, 161 also had a visibly delayed tram on the same platform, so the
  echoes do persist through delays and are not live: **dropping them (current adapter policy) is right**, and none reaches a board.
  Numeric countdowns that land exactly on the scheduled minute (34 observations, 6 journeys) occurred only on the terminus platforms
  (Airport 1, Newhaven 2) where a tram waits, never alongside a "delayed" sibling; treated as genuine on-time terminus predictions.
  Answers Jim's open question: a countdown that equals the schedule *was* observed (it persisted ~10 min at Newhaven for 2349_111, then
  drifted +7 min), so the adapter cannot tell it from an echo; at a terminus this is plausible, so no change is asked.
- **Zone conversion (UTC==local now):** 717 board trips, 0 where `displayTime` differs from the UTC `HH:MM` of `liveDeparture`;
  `formatLondonClock` checked at 2026-10-25T00:30Z (01:30 BST), 01:30Z (01:30 GMT), 2027-03-28T00:59Z/01:00Z (00:59/02:00): correct
  both sides of both changes. The winter sample cannot discriminate UTC from local (hazard H7); the BST discrimination is Jim's 24 Oct
  sample, unchanged.
- **Board's next tram vs raw countdown:** 235 of 235 platform-polls within 60 s (the board takes the earliest live raw event).
- **Stale/odd values:** two-trams-a-minute-apart at Airport 1 (Jim's observation) did **not** reproduce there (0 board pairs <=90 s).
  The only <=90 s pairs (6, polls 44-45) are the 2349_114/117 disruption above (60 s at Haymarket 2 and Picardy 2, 19-60 s at Newhaven 2).
- **Board density:** with echoes and nulls dropped, boards hold 2-7 (Haymarket), 1-3 (Airport), 3-9 (Picardy), 0-4 (Newhaven) live trips;
  rider-facing Picardy Place showed next 10:30 then following 10:55, i.e. a 25 min visible gap while the vendor had scheduled trams
  in between with no live value. By design ("live times only"), but riders will see sparse boards. A late tram is shown as
  "On Time" with the live time (the adapter deliberately sets scheduled = live, so `isDelayed`/`status` cannot show lateness).
- Not done: a person at a stop or the Lothian app. The official Edinburgh Trams website (G3) was used instead as the independent reference.

## G3. Feed provenance: confirmed

Each stop page on edinburghtrams.com (e.g. `/stop/picardy-place`) loads its departures by polling `https://edinburghtrams.com/api/stop/<atcocode>`
every 10 s with the **same NaPTAN platform ids this adapter uses** (`9400ZZTWWJU1`/`U2` for Picardy Place) and shows `minutes`/`time` per T50 departure.
Side-by-side at 10:22:36-10:22:49Z (site first, this API second), live-valued rows:

| Platform | Official site | Trapeze StopEvents |
|---|---|---|
| Picardy Place 2 | 10:24 (1 min), 10:31 (9), 10:39 (17), 10:48 (25) | 10:31:50, 10:39:50, 10:48 (clock), sched 10:24 (null live) |
| Haymarket 1 | 10:24 (1), 10:32 (9), 10:40 (18), 10:47 (24) | 10:40:45; others null |
| Newhaven 2 | 10:29 (6), 10:36 (13), 10:43, 10:52 | 10:29:13, 10:36:32, sched 10:43, 10:52 (clock) |
| Airport 1 | 10:30 (7), 10:41 (18), 10:45, 10:52 | 10:41:00, 10:52 (clock); null for 10:30/10:45 |

Every live prediction in the API appears on the official board at the same minute; rows with no live value are shown on the site at their
scheduled minute (the site falls back to the schedule, this app deliberately does not). Not confirmed: the Lothian app itself (not
installed/not checkable from here), so the wording is "same data as the official Edinburgh Trams website departures", which is the
operator's own channel. The site's endpoint is the operator's, not ours; we call only Trapeze.

## G4. Other operators: none

`services/GetStopServices?atcocode=<platform>` at every tram platform id in `trams-api.json` (44: Airport has only platform 1, Newhaven
only platform 2): the response was `{"services":[{"publicservicename":"T50","operator":"EDT","serviceRef":"EDT T50 a f"}]}` on all 44.
Board-eligibility verdict for `EDT T50`: **in** (walk-up tram, no reservation, no check-in barrier, serves every in-catalog tram stop).
No other operator or service to record. The sentence "no services other than the in-scope operator call at any in-catalog tram stop -
verified 25 Oct 2026" can now be written. (Endpoint name found by probing: `services/GetStopServices` with `atcocode`; `stops/GetStopDetails` also works.)

## G5. Stop order and end-to-end running

I could not locate the Service Timetable / Stop Timetable operations (well over 100 path and method guesses under `stops/`, `services/`,
`timetables/`, `operators/`, `vehicles/` returned the gateway's 404; `GetStopServices`, `GetStopDetails`, `StopEvents`,
`GetFilteredStops` are the operations that exist at those paths). Evidence used instead: every StopEvents event carries `visitnumber`,
the trip's running position. One snapshot of all 44 platforms (702 events, 48 journeys, 10:2x Z) gives:
- dir 1 (platform 1, to Newhaven): visitnumber equals the stop's sequence 1..22 at every stop, journeys originate at Edinburgh Airport (24 of 24);
- dir 2 (platform 2, to Edinburgh Airport): visitnumber = 24 - sequence (22 at Ingliston Park & Ride, down to 1 at Newhaven),
  journeys originate at Newhaven (24 of 24);
- no trip's origin is inconsistent across the stops it appears at (45 of 48 journeys were seen at more than one stop); every event's destination
  is the far terminus (Newhaven 351, Edinburgh Airport 351); none short of it;
- the order of `trams-api.json` and the official site's stop list (home page select) are the same 23 names in the same order. The API names
  stop 13 "West End - Princes Street"; the catalog uses "West End" (display only, no conflict).
- Over the 61-min G2 sample (57 distinct journeys at the 6 platforms) exactly one trip did not start at a terminus: `2349_556`, started 09:15Z at
  **Gyle Centre** (sequence 5) running to Newhaven (seen at Haymarket 1 with visitnumber 8 and at Picardy Place 1). That is a mid-line start, not a
  short-working at the destination end; riders at Airport...Edinburgh Gateway would not see it, which is correct. Flagged only.
`stationOrderVerified` is still `false` in `trams-api.json`; setting it is the flip PR's decision (the evidence above supports it).

## G6. All-stations sweep and rate limit

Rider-facing path: `GET /api/board?city=edinburgh&station=<name>` on the local server, 21 in-catalog tram stops (all 21 present in
`/api/city-stations`, Haymarket and Edinburgh Gateway tram entries absent as designed; Edinburgh entries 58). 12 rounds 3.3 min apart,
10:28:27Z-10:57:40Z (29.2 min of rounds plus the last round's run time), each stop requested twice back-to-back (first = upstream cache expired, second = warm).

- Live trips with every trip `realtime: true`: 20 of 21 stops in 12/12 rounds. Edinburgh Park Station: the rail board (B1).
  The rider-facing board has no board-level `realtime` field (the shape is `{stationName, lastUpdated, entries[]}`); the flag is per trip.
  `/api/directions` returns the static two-chip T50 pair per stop (no upstream call).
- Latency (local, includes the upstream call): first request of each round p50 340 ms, p95 1.36 s, max 2.30 s (one Edinburgh Park Station rail call;
  the slowest tram stop was Edinburgh Airport at 1.90 s); warm p50 3 ms, p95 5 ms, max 7 ms. Both inside "<3 s warm, <10 s cold".
  Production cold-start adds to this; not measured (no flip, no deployment of the switch).
- Rate limit: 504 rider-facing requests (about 2 upstream calls per cold stop request, plus the G2/G3/G4/G5 work, roughly 1,200 Trapeze calls in
  all, never faster than ~1 per second per caller) with **zero 429s** and zero non-200 responses; no `Retry-After` seen. Vendor limit is still undocumented; observed headroom only.
- Empty-state: no tram stop was empty in the rider sweep, but see B2 for the live empty gap (Newhaven) and the missing `emptyReason`.

## Bundle check

`lib/cities/edinburgh/trams-api.json` and `coverage-trams.json` are static `import ... with { type: "json" }` in `trams-catalog.js`, which
`api/board`, `api/directions`, `api/next-train` and `api/coverage-notes` reach. Production is deployment `dpl_AbFyndxQyzvH7MMkbFgj3CqA2tkU`
(`2e22bb2c`, ready, aliased to next-train-app.vercel.app). On it: `/api/city-stations?city=edinburgh` 200, `/api/coverage-notes?city=edinburgh` 200,
`/api/board?city=edinburgh&station=Newhaven` 503 `FEED_UNCONFIRMED` (the intended switch-off typed error, thrown from code that imports the
overlay), `/api/directions` 500 `feed_unavailable` and `/api/next-train` 500 for the tram stop (also the switch-off behaviour, as on master).
A missing JSON file would fail module load for all of these. This is indirect: the lambda file list is not downloadable with the CLI; `vercel inspect`
shows only function sizes. Not verified: `EDINBURGH_BUSTRACKER_KEY` in Vercel Production (the checkout is not linked to a Vercel project and I did not link it);
the controller should confirm it before any flip.

## Other observations (non-blocking)

- The brief's G2 asks for compare-with-a-person; not possible from here (see above).
- Flip commit to-do (from the handoff) is untouched: `stations.json` notes, coverage, dogfood gate cleanup, picker entry.
- Vendor prediction quality: order inversion at the Newhaven terminus during a disruption and early-vanishing delayed trips (see G2) are vendor-side.

## Recommendation: NO-GO until B1 and B2 are fixed

Both are small. After they land (a fresh Jim call), re-run: the Edinburgh Park Station request path (a board, directions, next-train for the printed name) and an empty
tram board with `emptyReason: "no-live-predictions"`, then the flip can go on G2-G5 as they stand. Nothing here was fixed by Mark.
