# Jim brief — London Overground: picked direction returns "No upcoming trains"

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). This brief authorises changes to
`lib/providers/uk-tfl.js`, `lib/train-times-core.js`, `public/city-directions/uk-london-tfl.json`
and `qa/` that expansion-mode guardrails would otherwise forbid.

tim-review: no

## Symptom

In region `uk-london-tfl`, selecting **Barking Riverside** and the only offered direction
**"Suffragette Gospel Oak"** shows *"No upcoming trains"*, at a time of day when the Suffragette
line is running a train roughly every 15 minutes in both directions.

## Reproduction (confirmed live, 7 Sep 2026 ~12:30 Europe/London)

`fetchStopBoard("Barking Riverside")` followed by
`pickUpcomingTrips(board.trips, "Suffragette Gospel Oak")`:

```
station: Barking Riverside   trips: 8
raw destinations:  [ 'Suffragette Barking Riverside' ]
normalized:        [ 'Suffragette Barking Riverside' ]

DIRECTION "Suffragette Gospel Oak"      -> 0 trips
DIRECTION "Suffragette Barking Riverside" -> 8 trips  (12:34, 12:50, 13:04, 13:19, 13:34, 13:49)
```

The board therefore contains **only the terminating arrivals** (trains finishing at Barking
Riverside), and **none of the departures**, while the direction picker offers only
"Suffragette Gospel Oak" — a direction nothing on the board can ever match.

## Evidence — what TfL actually returns

Raw `GET /StopPoint/910GBARKRIV/Arrivals` at the same moment returned **16 rows, 16 unique `id`s**,
all `modeName: "overground"`, evenly split:

```
overground | Barking Riverside          : 8
overground | Gospel Oak Rail Station    : 8
```

Horizon of the raw feed is ~110 minutes. `resolveTflStops("Barking Riverside","uk-london-tfl")`
correctly resolves to exactly one naptan, `910GBARKRIV`.

So: **8 valid Gospel Oak-bound predictions are fetched from TfL and then lost somewhere between
the HTTP response and `board.trips`.** Every obvious guard in `parseTflArrival` should pass them
(`modeName` is in `TFL_RAIL_MODE_NAMES`; `expectedArrival` is present and parseable; `towards` is
`""` so `compassOrUnknown` is true and `destination` falls back to `destinationName`). Finding the
actual drop point is the first job — do not assume my guesses below are right.

Note also that on the Overground lines TfL returns **`towards: ""` and `direction: ""` for every
row** — unlike the tube, where `towards` is populated (Oxford Circus returns proper
`towards: "Brixton"` etc.). Anything that relies on `towards` or `direction` to separate the two
directions of an Overground line has nothing to work with; `destinationName` is the only signal.

## Suspected files

- `lib/providers/uk-tfl.js:107-146` — `fetchStopBoard`. The `allTripsMap` dedup keyed on `trip.id`
  is the prime suspect for a 16→8 collapse, even though the raw `id`s measured unique; check what
  `id` actually is on the internal trip after `providerTripToInternal`.
- `lib/providers/uk-tfl.js:55-104` — `parseTflArrival`, the null-return paths.
- `lib/train-times-core.js:29-51` — `applyDestinationAliases`. Strips a trailing
  `Rail Station`, so `"Suffragette Gospel Oak Rail Station"` → `"Suffragette Gospel Oak"`, which
  *should* match. Confirm it does.
- `public/city-directions/uk-london-tfl.json` — direction catalogue (see the two data gaps below).

## Two related data gaps in the same feature — fix these too

1. **Gospel Oak is missing the Suffragette line entirely.** Its entry lists only the three Mildmay
   destinations, yet live TfL at `910GGOSPLOK` returns 8 `Suffragette Gospel Oak` + 8
   `Suffragette Barking Riverside` predictions. Gospel Oak is the northern terminus of the
   Suffragette line and must offer it.
2. **`"Stratford (London) Rail Station"` does not normalise onto `"Mildmay Stratford"`.** The
   suffix strip yields `"Stratford (London)"`, and the `(London)` parenthetical survives, so the
   Mildmay Stratford direction at Gospel Oak is likely empty for the same reason. Check the whole
   region for other `(London)`-style National-Rail-flavoured `destinationName`s on 910G naptans and
   handle the class, not just this one string.

Terminus handling is part of the fix: at a terminus, arrivals whose `destinationName` *is* that
station are trains terminating there, not boardable departures in the offered direction. Decide
deliberately (and write down in the QA script) whether they belong on the board at all — the
walk-up rule in `docs/board-eligibility-rule.md` governs.

## Acceptance criteria

1. At Barking Riverside, direction "Suffragette Gospel Oak" returns a non-empty list of upcoming
   departures matching what TfL publishes for that stop.
2. At Gospel Oak, the direction picker offers the Suffragette line, and both
   "Suffragette Barking Riverside" and the Mildmay destinations return non-empty boards.
3. No Overground/DLR/Elizabeth-line/tram destination reaches the board with a raw
   `Rail Station` / `Underground Station` / `(London)` suffix still attached.
4. No regression for tube stations, where `towards` is populated (Oxford Circus, Victoria line etc.
   must still work).
5. Every direction listed in `public/city-directions/uk-london-tfl.json` for a London Overground
   station corresponds to a destination the adapter can actually produce — no direction that is
   unmatchable by construction.

## QA

- **New script: `qa/uk-london-tfl-direction-match.mjs`** — proves the fix. It must assert, from a
  checked-in fixture of the raw TfL arrivals JSON (do not make CI depend on the live API or on
  `TFL_APP_KEY`), that for each of Barking Riverside, Gospel Oak, Woodgrange Park and Barking, every
  direction offered in the direction JSON matches at least one parsed trip, and that no parsed
  destination retains a station-type suffix. Capture the fixture from the live API while you work.
- Register it in `qa/run-all.mjs` in the smoke tier alongside the other UK gates.
- Run that script **and** `node qa/run-all.mjs --smoke`. Both must pass. Do not run the full suite.

## Handoff

Commit, push a branch, open a PR linking this brief, and put the before/after of the Barking
Riverside board in the description. Leave no background sleep or poll loops running when you finish.

---

# CORRECTION — 7 Sep 2026, after reviewing the first attempt

Do not commit the current working tree as-is. One change in it must be reverted, and the core fix
is wrong. Evidence below is from the live API, taken while reviewing.

## Revert: the `UPCOMING_BOARDING_GRACE_MS` grace window

`lib/train-times-core.js` — remove `UPCOMING_BOARDING_GRACE_MS` and restore
`pickUpcomingTrips`'s filter to `trip.liveDeparture > now`.

Two reasons:

1. **The diagnosis is wrong.** These are not departures that slipped a few seconds behind the
   caller's clock. At Barking Riverside every Gospel Oak-bound row carries
   `timeToStation: 2` — *identical across all 8 rows*. At Gospel Oak the mirror image holds:
   Barking-Riverside-bound rows are all `22`–`23`. These are placeholder values, not near-term
   predictions. The real departures are 15 minutes apart across the next two hours.
2. **It would not fix the board even if it shipped.** A 3-minute grace makes all 8 departures
   appear stacked at the same instant, ~40 seconds in the past. "8 trains, all departing now" is a
   worse board than the empty one the user reported, and it would be wrong at every station on the
   line, not just the terminus.

It is also a **global** change: `pickUpcomingTrips` is core and runs for all 33+ live cities. A
London-terminus data gap must not be patched by altering what "upcoming" means everywhere. Any
future change to that function is `tim-review`, not something a city fix carries along.

## The actual root cause

TfL's `/StopPoint/{id}/Arrivals` has no usable timing for services **originating** at a terminus —
it reports them as arriving in ~2 seconds. The adapter's `liveDeparture > now` filter then
correctly discards them, which is why 16 raw rows became 8 trips, all in the terminating direction.
The filter is not the bug; the endpoint is.

## The fix: use `ArrivalDepartures` for National-Rail-backed stops

`GET /StopPoint/{naptanId}/ArrivalDepartures?lineIds=<comma-separated>` returns HTTP 200 for the
910G (National-Rail-backed) Overground stops and carries real departure fields. At Barking
Riverside it yields exactly the right board:

```
dest=Gospel Oak Rail Station  scheduledTimeOfDeparture=12:03Z estimatedTimeOfDeparture=12:03Z  -> 14 min
                                                       12:18Z                          12:18Z  -> 29 min
                                                       12:33Z / 12:48Z / 13:03Z / 13:18Z / 13:33Z / 13:48Z
                                                                                      -> 44, 59, 74, 89, 104, 119 min
```

Entity fields: `platformName, destinationNaptanId, destinationName, naptanId, stationName,
estimatedTimeOfArrival, scheduledTimeOfArrival, minutesAndSecondsToArrival,
minutesAndSecondsToDeparture, departureStatus` — plus `scheduledTimeOfDeparture` /
`estimatedTimeOfDeparture` on departing rows. Use `estimatedTimeOfDeparture ?? scheduledTimeOfDeparture`;
rows terminating at the station carry neither and must be dropped.

Constraints to respect:

- `ArrivalDepartures` requires `lineIds`. Take them from the station's `lines` in
  `lib/cities/uk-london-tfl/stops.json`.
- It is **not** supported for tube/DLR/tram stops — `/StopPoint/910GBARKRIV/Departures` 404s, and
  tube naptans (940G…) are not NR-backed. Keep `/Arrivals` for those; it works correctly there
  because `towards` is populated and timings are real (verified at Oxford Circus, Victoria,
  Stratford). Choose the endpoint per stop and fall back to `/Arrivals` on a non-200.
- The bug is symmetric — verify Gospel Oak's Barking-Riverside-bound board too, not just
  Barking Riverside.

## Keep these from the current attempt

- The parse-time `normalizeDestination` call in `parseTflArrival`.
- The `\s+\(London\)$` strip in `applyDestinationAliases` (fixes `Mildmay Stratford`).
- `"Suffragette Barking Riverside"` added to Gospel Oak in the direction JSON.

## Also

- **Do not commit `docs/expansion-tracker/lane-locks.json`.** It is local, gitignored state and is
  showing as modified in your tree; leave it out of the commit entirely.
- The QA fixture must be recaptured against whichever endpoint the fix uses, and must still run
  without `TFL_APP_KEY` or network.
- Add a QA assertion that no direction on the board is served by placeholder timings — e.g. that a
  station's departures for a given direction are not all within a few seconds of each other. That
  is the check that would have caught this class.

---

# Top-level verification — 7 Sep 2026, ~13:05 Europe/London

Run against the PR branch code (commits `71695d6` + `328c1d9`) with a live key. All directions
populate with correctly-spaced real services:

```
=== Barking Riverside: 8 trips ===
  OK    Suffragette Gospel Oak            8 trips  13:18 13:33 13:48 14:03 14:18
=== Gospel Oak: 41 trips ===
  OK    Mildmay Clapham Junction          8 trips  13:17 13:31 13:46 14:01 14:17
  OK    Mildmay Richmond                  8 trips  13:12 13:26 13:41 13:56 14:13
  OK    Mildmay Stratford                17 trips  13:09 13:12 13:22 13:27 13:37
  OK    Suffragette Barking Riverside     8 trips  13:09 13:24 13:39 13:54 14:09
=== Woodgrange Park: 16 trips ===
  OK    Suffragette Barking Riverside     8 trips  13:09 13:23 13:38 13:53 14:08
  OK    Suffragette Gospel Oak            8 trips  13:12 13:27 13:42 13:57 14:13
```

`UPCOMING_BOARDING_GRACE_MS` is absent from the branch and `pickUpcomingTrips` is back to
`trip.liveDeparture > now` — confirmed by grep across `lib/`.

## Known defect for QA to confirm: commit message of `71695d6`

That commit's message describes at length a 3-minute boarding-grace change to `pickUpcomingTrips`,
including a rationale for changing core behaviour. **The commit does not contain that change** — its
only edit to `lib/train-times-core.js` is the seven-line `(London)` strip. The message is an
artefact of two agents writing the same worktree concurrently. The repo merges PRs rather than
squashing, so this message would land on master as-is and misinform anyone reading the log.
Flag it; the top-level session decides between a reworded amend and a squash-merge.

---

# BLOCKER — 7 Sep 2026, Mark's QA on PR #343. Bundle is stale and inverted.

Independently verified against `origin/fix/london-overground-empty-direction`:

```
committed public/train-times-bundle.js:
   77:  var UPCOMING_BOARDING_GRACE_MS = 3 * 60 * 1e3;
  206:    const cutoff = now.getTime() - UPCOMING_BOARDING_GRACE_MS;
  207:    ... .filter((trip) => trip.liveDeparture.getTime() > cutoff) ...
  occurrences of "ArrivalDepartures": 0

committed lib/train-times-core.js:
  228:    .filter((trip) => trip.liveDeparture > now)
```

The shipped bundle is the exact inverse of the intended change. It **contains the rejected
3-minute grace window** and **does not contain the ArrivalDepartures fix at all**. `71695d6`
rebuilt the bundle from a working tree that still had the grace window; `328c1d9` reverted the
window and added the real fix to `lib/` but never rebuilt.

This matters more than a normal stale artefact: `public/index.html` loads the bundle directly and
`cap:sync` ships it into the Android and iOS apps, and `uk-london-tfl` is already `status: "live"`
in `lib/providers/registry.js`. Merging as-is would ship the rejected global change to
client-side board filtering for **every** live city, and would not fix Barking Riverside. Every QA
gate passes because the gates exercise `lib/` only.

## Required

1. Rebuild the bundle: `npm run build:train-times`.
2. Verify the committed bundle now contains `ArrivalDepartures` and **no** occurrence of
   `UPCOMING_BOARDING_GRACE_MS`, and that its `pickUpcomingTrips` filters `liveDeparture > now`.
   Grep the built file and paste the result in the PR.
3. Re-run `node qa/uk-london-tfl-direction-match.mjs` and `node qa/run-all.mjs --smoke`, both in
   the foreground.
4. Push to the same branch.

## Also add a permanent guard for this class

The gates cannot see bundle staleness, which is why this reached QA. Add a QA script
(`qa/bundle-freshness.mjs` or similar, registered in the smoke tier) that rebuilds each committed
bundle from its `web-sources/` entrypoint into a temp path and fails if the result differs from the
committed file. Cover at minimum `train-times-bundle.js`; extend to the other `build:*` bundles if
that is straightforward. Deterministic-build caveats (esbuild version, path strings) are yours to
handle — if a byte-exact comparison proves unstable, assert instead that no committed bundle
contains an identifier absent from its `lib/` sources, and say so in the PR.

---

# RECONCILIATION — 7 Sep 2026. PR #343 now conflicts with master.

The bundle blocker is resolved (`195a730`): the committed bundle no longer contains
`UPCOMING_BOARDING_GRACE_MS`, filters `liveDeparture > now`, and `qa/bundle-freshness.mjs` is
registered in the smoke tier.

Correction to the previous BLOCKER section: it asked for `ArrivalDepartures` to be present in
`public/train-times-bundle.js`. That was wrong. `web-sources/train-times-client.mjs` imports only
`lib/train-times-core.js`, never `lib/providers/*` — the adapter runs server-side via
`api/board.js` / `lib/cities/live-city-api.js`. Its absence from the bundle is correct.

## The conflict

While this PR was open, **PR #344 merged to master** (`8fd821d`, "London: dedupe platform-level
Tramlink StopPoints out of the picker", see `docs/jim-brief-london-tram-duplicate-stops.md`) and
rewrote the same function, `fetchStopBoard` in `lib/providers/uk-tfl.js`. GitHub now reports
PR #343 as `CONFLICTING` / `DIRTY`.

The two rewrites are incompatible as text and as design:

- **master** flattens all stops into one `naptanIdsToFetch` set (each entry's `naptanId` plus its
  `alsoNaptanIds`) and fetches `/Arrivals` for every id, so a hub row doesn't lose trains that only
  post against a folded-in platform id.
- **this branch** keeps the per-`entry` loop and selects the endpoint per stop —
  `ArrivalDepartures` for 910G National-Rail-backed stops, `/Arrivals` otherwise.

master's flattening **discards the entry association that endpoint selection depends on**. Taking
either side wholesale silently reverts the other fix. This branch currently contains zero
occurrences of `alsoNaptanIds`.

## Required

1. Merge `origin/master` into the branch.
2. Rewrite `fetchStopBoard` so both behaviours hold: iterate `entries`; for each entry build its
   id set (`naptanId` + `alsoNaptanIds`); choose the endpoint **per entry** via
   `usesArrivalDepartures(entry)`; fetch every id in that set using that entry's endpoint, keeping
   the existing per-id failure isolation and the `/Arrivals` fallback on a non-200. Preserve the
   dedupe-by-`trip.id` behaviour across all ids.
3. Verify **both** fixes, and put the output in the PR:
   - Suffragette/Mildmay: Barking Riverside, Gospel Oak and Woodgrange Park — every direction in
     `public/city-directions/uk-london-tfl.json` returns a non-empty, correctly-spaced board.
   - Tramlink: a stop with folded-in `alsoNaptanIds` still returns the trains that post only
     against a platform id. Identify one from the tram brief / catalog rather than guessing.
4. Run `node qa/uk-london-tfl-direction-match.mjs`, `node qa/bundle-freshness.mjs` and
   `node qa/run-all.mjs --smoke`, all in the foreground.
5. If `lib/train-times-core.js` or the bundle changes as a result, rebuild the bundle
   (`npm run build:train-times`) — the freshness gate will now catch it if you forget.

---

# Top-level verification of the reconciliation — 7 Sep 2026, ~15:00 Europe/London

Against branch head `dd77733`. Both fixes coexist in `lib/providers/uk-tfl.js`
(`alsoNaptanIds` ×2, `ArrivalDepartures` ×8); `8fd821d` is an ancestor, so master's Tramlink fix
is genuinely merged in, not resolved away.

```
Barking Riverside  OK  Suffragette Gospel Oak         8   15:03 15:18 15:35 15:48
Gospel Oak         OK  Mildmay Clapham Junction       9   15:06 15:20 15:35 15:50
                   OK  Mildmay Richmond               9   14:56 15:10 15:26 15:44
                   OK  Mildmay Stratford             20   14:54 14:57 15:06 15:10
                   OK  Suffragette Barking Riverside  8   14:55 15:09 15:24 15:39
Woodgrange Park    OK  both Suffragette directions    8 each
```

## Addiscombe empties are pre-existing, not a regression

The reconciled branch shows `Tram New Addington` and `Tram West Croydon` empty at Addiscombe.
Running the identical probe against **master** gives the identical result — 7 trips, the same two
empty directions, distinct destinations `Tram Wimbledon | Tram Elmers End | Tram Beckenham
Junction`. The branch and master agree exactly, so this PR neither causes nor worsens it.

Root cause is separate and already scoped: `public/city-directions/uk-london-tfl.json` gives
*every* Tramlink stop the same five destinations regardless of which the stop is actually served
by, so unreachable directions are offered at many tram stops. This is the "unreachable direction"
signature in `docs/mark-brief-london-terminus-sweep.md`; leave it to that sweep. Do not widen this
PR to cover it.
