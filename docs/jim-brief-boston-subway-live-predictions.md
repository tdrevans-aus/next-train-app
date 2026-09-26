# Jim brief — Boston subway must be live (it is schedule-only in production)

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). `tim-review: no` for the fix itself;
whether Boston stays live while this is fixed is Tim's call, made in chat.
Written 20 Sep 2026 by the controller session. Copy this file into your worktree and include it
in your PR (it is untracked in the main checkout on purpose).

## Symptom

Boston was flipped live on 20 Sep 2026 (#421). In production:

- `lib/providers/boston.js` builds all subway / rapid-transit rows (Red, Orange, Blue, Green
  B/C/D/E, Mattapan) from **static GTFS** (`https://cdn.mbta.com/MBTA_GTFS.zip`); its header says
  "Schedule-only — no GTFS-RT TripUpdates wired for the subway network", `realtimeIndex` is
  `EMPTY_REALTIME_INDEX` and the board returns `realtime: false`. Only the Commuter Rail rows
  (added in #414) come from live MBTA V3 predictions.
- That breaks Tim's standing rule (Göteborg, PR #332; release-1 scope): **no live times, no
  region — a board must never present scheduled times as live, and there is no timetable
  fallback anywhere.** Mark's flip QA recorded "live-only" having verified the Commuter Rail
  path only; the controller also failed to check the `realtime` flag before the flip.
- Performance, same root cause (cold static-GTFS load + per-direction work), measured against
  production 20 Sep 2026 ~11:35 UTC: `/api/board?city=boston&station=Harvard` 30 s;
  `/api/board?city=boston&station=South Station` no response in 60 s; `/api/next-train` Harvard
  9.7 s cold, 0.15 s warm. Baseline `/api/board?city=helsinki&station=Rautatientori` 1.5 s.
  `api/board.js` fans out one `getMultiCityNextTrain()` per direction via `Promise.all`, and
  `lib/cities/boston/dogfood-next-train.js` calls `fetchStationBoard()` inside each — so a
  15-direction station does the whole station fetch 15 times.

## Fix

1. **Subway rows from live MBTA V3 predictions**, the same API the Commuter Rail path already
   uses (`https://api-v3.mbta.com/predictions`, filter by stop / route, `include=trip,route`
   as needed). A subway row is built only from a prediction with a real predicted time; no
   prediction ⇒ no row. Remove the static-GTFS schedule path from the live board entirely (the
   catalog/direction mapping may keep using static reference data that is bundled or cached —
   but never as a source of departure *times*). Board `realtime` must be `true`, and the
   live-marker the UI relies on must be set the way the other API-board cities set it.
   Honour MBTA's prediction semantics: `departure_time` null at a terminus-arrival-only stop,
   `schedule_relationship` CANCELLED/SKIPPED rows dropped or flagged per the contract, `status`
   strings ("Boarding", "Stopped 2 stops away") — follow what the contract allows; do not invent
   times from them. Keep line + terminus directions per `docs/boston-d1/direction-model-memo.md`
   (Green branch handling, Braintree vs Ashmont, short-turns must degrade sensibly, never be
   mislabelled).
2. **One upstream fetch per station per request window.** Fetch predictions for the station's
   stop(s) once, cache server-side for a short TTL (look at how Helsinki / Oslo / WMATA adapters
   do it), and derive every direction from that one payload — for both `/api/board` and
   `/api/next-train`. Unauthenticated MBTA calls are limited to ~20/min; with `MBTA_API_KEY`
   (optional, header `x-api-key`) ~1000/min. The design must stay inside the unauthenticated
   limit for normal use and must degrade to a refusal, not to scheduled times, when rate-limited.
   Tell Tim in the PR whether a free MBTA key is advisable for production (it almost certainly
   is) — do not register one.
3. **Refusal path.** MBTA API down / rate-limited ⇒ the board refuses with the documented error
   shape, like the other live-only cities. Never scheduled times.
4. **Gate.** `qa/boston-dogfood-gate.mjs`: assert `realtime: true`; assert no code path can build
   a departure time from `stop_times.txt`; fixture = a trimmed REAL capture of V3 predictions for
   a subway-only station, a Green Line trunk station, and South Station (subway + Commuter Rail),
   rows marked live-capture vs synthetic as in `qa/fixtures/brussels/irail-liveboard.json`;
   prove the refusal path; prove one upstream fetch serves all directions of a station.
5. **Coverage note + registry notes** updated to say subway is live predictions.
6. Add a line to `.claude/agents/mark.md`'s flip checklist (Mark's definition) — "board-level
   `realtime` is true and every mode on the board is built from live data; sample the
   rider-facing `/api/board` and `/api/directions`, not only `fetchStationBoard()`" — so this
   class of miss is checked, not remembered.

## Acceptance
- Live sample (keyless): Harvard, Park Street, Kenmore (Green trunk), South Station, a Mattapan
  stop — every row traces to a V3 prediction; `realtime: true`; Commuter Rail still present at
  South Station; no Amtrak / Silver Line / ferry rows.
- Local timing against the dev server: `/api/board` for South Station and Park Street under 3 s
  cold, under 1 s warm; upstream MBTA calls per board request ≤ 2.
- `node qa/boston-dogfood-gate.mjs`, `node qa/live-city-lists-sync.mjs`,
  `node qa/run-all.mjs --smoke` pass.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check united-states`, then
  `acquire united-states boston jim <branch>`.
- Branch from up-to-date `origin/master`. Boston may be `live` or back to `planned` on master
  depending on Tim's decision — do not change `status` either way in this PR; make the gate
  pass in whichever state master is in, and say which in the PR.
- lib/ code reached from api/ must not use bare npm imports (breaks in the Vercel bundle).
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read. Foreground
  commands with explicit timeouts only — no background processes, sleeps or poll loops.
- Commit, push, open a PR that links this brief. Do not merge.
