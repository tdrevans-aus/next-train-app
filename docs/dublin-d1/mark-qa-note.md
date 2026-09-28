# Dublin (Luas Red + Green) — pre-flip QA note (pass 9)

**Verdict: GREEN. Flip PR opened.**

Run by Mark on `mark/dublin-flip-9`, cut from `origin/master` @ `0a94b404` (2026-09-28, ~08:40
Dublin, Monday full service). Env: `.env.local` copied in with `NTA_API_KEY` present; dev server
run explicitly on `PORT=3411` (never 3000/3400 — 3400 confirmed to be Tim's other project
throughout), stopped before the smoke run (confirmed no listener remained). No background
sleep/poll loops left running; `node qa/run-all.mjs --smoke` was run PLAIN in the foreground with
an explicit `timeout: 600000` and the real 594s summary was read, not a partial one.

## What changed since pass 8

Pass 8 was RED on exactly one finding: Belgard (the Red Line's Tallaght/Saggart fork) silently
dropping its `Red + Saggart` direction across 15+ live polls, with no `emptyReason` to explain
the gap. Since then:

- **PR #499** (`docs/jim-brief-dublin-belgard-saggart-direction-gap.md`) ruled out a missing
  third stop_id (Belgard genuinely has only two, both correctly resolved — confirmed by a new
  station-id completeness audit added to `qa/verify-dublin-gtfs-snapshot.mjs` this pass, which
  passed for all 65 catalog stations including Belgard) and recorded the gap as **H9**: a fourth,
  direction-specific intermittent NTA feed dropout shape at a shared-trunk fork station. Verdict:
  no catalog action, all three of Belgard's directions stay in-catalog.
- **PR #500** extended the honest empty-state UI from "every direction on the board is empty" to
  "the direction the rider is actually looking at is empty", via `focusedDirectionEmptyReason` in
  `public/nearby-mode.js`, so a future recurrence of the Belgard gap would render the honest copy
  for that one direction instead of a blank/plain "No upcoming trams" — closing the actual product
  gap pass 8 found, not just documenting it.

This pass's own live sampling found Belgard's `Red + Saggart` direction present and correct (see
item 4 below) — consistent with H9's "intermittent, not permanent" classification.

## Checklist results

**1. Board eligibility — GREEN.** `docs/dublin-d1/oracle-clash-report.md`'s Board eligibility
section has no `undecided` rows: Luas Red + Green `in`; DART `out-product` (v2 scope); Dublin
Bus/Bus Éireann/Go-Ahead Ireland `out-mode`; Connolly `out-feed` (27 Sep correction); Saggart
`out-feed`, Rialto confirmed `in` (27 Sep correction); Belgard's H9 direction-specific
intermittency recorded as a 28 Sep update with no verdict change (still `in`, all three
directions). Boards are Luas-only end to end.

**2. Live-only grep on `lib/providers/dublin.js` — GREEN.** No `stop_times` read as a rider-facing
time; `realtime: true` set unconditionally on every classified trip, backed by
`tripHasRealtimeConfirmation()` which drops any trip the RT feed didn't actually confirm before
that flag is set. Static GTFS is stop_id/trip_id resolution only. `emptyReason:
"no-live-predictions"` covers the honest-empty case instead of a schedule fallback.

**3. Static/RT/sweep scripts — GREEN, all exit ok.**
- `node --env-file=.env.local qa/verify-dublin-gtfs-snapshot.mjs`: ok — published snapshot real
  (465,806 bytes, Red/Green routes, LUAS agency), and the new station-id completeness audit passed
  for all 65 catalog stations (every exact-name-matched stop_id resolves, Belgard's two included).
- `node --env-file=.env.local qa/dublin-rt-join-check.mjs`: ok — 154/154 (100%) Luas-classified
  TripUpdates resolved against the published static snapshot.
- `node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs`: ok, exit 0 — 65 catalog
  stations, 18 polls over ~9 minutes (one mid-run NTA feed timeout/error burst around polls 9-10,
  handled by the stale-cache fallback, no station affected). **Every station had 18/18 non-empty
  polls, `emptyRunSeconds: 0` throughout — no intermittent-long or uncertain stations this run.**
  Evidence appended to `docs/dublin-d1/live-sweep-log.jsonl` (`runId
  sweep-2026-09-28T07:20:44.770Z`).

**4. Rider-facing `/api/board` + `/api/directions`, sampled at the flip-commit state — GREEN.**
Abbey Street, Belgard, Tallaght, The Point, Brides Glen, Broombridge, Sandyford, Marlborough,
Rialto, Red Cow all sampled against a dev server running the full flip file set (registry
`status: "live"`, `country-regions.js`, `live-city-api.js` `MULTI_CITY_IDS`, regenerated
`city-directions`/`city-manifest`). All returned correct, fast (55ms-220ms warm, ~3.5s one-time
cold cache) responses with `realtime: true` on every trip in every entry (nested per-trip, per
Boston-lesson posture — no schedule-only mode reachable through the rider path), correct
direction sets, no self chips (Abbey Street never shows itself; Marlborough only shows `Green +
Brides Glen`, Broombridge only `Green + Brides Glen` — southbound/northbound-only correctly
enforced), and Green city-centre loop exclusivity held throughout. **Belgard showed all three
directions correctly** (`Red`, `Red + Saggart`, `Red + Tallaght`, `Red + The Point`) — full raw
response inspected, `Red + Saggart` carrying 7 genuinely live, realtime:true upcoming trips with
real delay values, consistent with H9's "intermittent, not permanent" classification and this
session's non-empty observation. Per-direction honest-empty-state UI path independently confirmed
via `node qa/honest-empty-state.mjs` (fixture-proved, exit 0 — offline additive-field check plus
the browser Playwright suite's three-way per-direction case: gapped direction shows the honest
copy, a direction with a train shows the train, a plainly-empty direction shows plain copy and
never borrows another direction's honest state).

**5. Hub lock / doNotGroup / timezone — GREEN.** `Europe/Dublin` is the literal IANA zone string
(`DUBLIN_TIME_ZONE`) — no hand-rolled offset (hazard-pack.md H7). Hub lock `Abbey Street`
confirmed never a direction token in any of the ten sampled boards. doNotGroup pairs (Abbey Street
vs Marlborough/O'Connell - GPO/O'Connell Upper; O'Connell - GPO vs O'Connell Upper; Tallaght vs
Saggart; Red Cow vs Kingswood vs Belgard) all present in `lib/cities/dublin/marketing-directions.js`
and exercised by `qa/dublin-dogfood-gate.mjs`. Green Line direction-exclusivity
(`isDirectionAllowedAtStop`/`GREEN_LOOP_DIRECTION_ONLY`) matches `direction-model-memo.md`'s
Parnell↔Trinity loop model exactly and was independently confirmed live in item 4's sampling.

**6. Registry-driven flip mechanics — GREEN.** With the flip file set applied: `/api/cities`
listed dublin live with country Ireland (`ie`), correct bounds (already present in
`lib/cities/city-bounds.js` from earlier flip-readiness scaffolding), `directionsVersion`, modes
`light_rail`. `node scripts/write-city-directions.mjs --only=dublin` produced 65/65 stations with
chips (Belgard correctly carrying all three). `node scripts/write-city-manifest.mjs` wrote 43
cities / 14 countries (Ireland newly present, in the correct hk-to-ie-to-no COUNTRY_ORDER slot).
No edits needed to `public/app.js`, `city-session.js`, `brisbane-dogfood.js`, or
`journey-model.js` — confirmed by `qa/registry-driven-client.mjs` passing unmodified and by
grep-confirming `public/city-session.js` carries no hardcoded country table any more.
`lib/cities/dublin/coverage.json`'s rider-facing prose (Connolly/Saggart callouts, the honest
partial-gap note) is unchanged and correct.

**7. Gates at flip state — all GREEN.**
- `node qa/dublin-dogfood-gate.mjs`: ok (status=live, dispatch switch-cases wired, all four
  tracking lists consistent, 65 stations, hub Abbey Street, doNotGroup enforced, Green loop guard,
  self-terminus guard, coverage.json correct).
- `node qa/live-city-lists-sync.mjs`: ok, 43 live cities consistent.
- `node qa/country-regions-sync-gate.mjs`: ok, 43 entries consistent.
- `node qa/registry-driven-client.mjs`: ok, all 5 Playwright sub-checks pass.
- `node qa/honest-empty-state.mjs`: ok, offline + browser (all-directions and per-direction cases).
- `node qa/coverage-notes-gate.mjs`: PASS, 43 live cities all have valid coverage.json.
- `node qa/run-all.mjs --smoke` (PLAIN, foreground, timeout 600000, full 594s run observed to
  completion): **165 PASS - 0 FAIL**, including `dublin-dogfood-gate.mjs`, `honest-empty-state.mjs`,
  `live-city-lists-sync.mjs`, `country-regions-sync-gate.mjs`, `registry-driven-client.mjs`,
  `coverage-notes-gate.mjs`, `bundled-city-directions.mjs`, `region-selection.mjs`.

## Not covered

DART/Iarnród Éireann (commuter rail, `out-product`, v2 scope), Dublin Bus/Bus Éireann/Go-Ahead
Ireland (`out-mode`), Connolly and Saggart Luas stops (`out-feed`, no NTA real-time coverage —
riders are told to use Busáras/Fortunestown instead).

## Feed behaviour — three whole-station dropout shapes plus one direction-level shape

The NTA GTFS-RT v2 feed exhibits three documented whole-station dropout shapes (hazard-pack.md H8)
— permanent (Connolly, Saggart: filtered from the catalog with a coverage-note exclusion),
transient (Red Cow, Kylemore, Rialto: a few minutes at a time, resolves within the same session),
and long intermittent (Broombridge, Marlborough: 10+ minutes, but observed working at another
point the same day, classified via the append-only evidence log rather than a single run) — plus a
fourth, direction-level shape (H9) at Belgard's Red/Saggart fork, discovered by pass 8 and
documented/ruled-safe by PR #499 this cycle. None of the three honest-copy-covered shapes get a
schedule-only fallback; the rider is told the truth (`emptyReason: "no-live-predictions"`, now
rendered per-direction since PR #500) rather than shown a blank or stale board.

## First registry-driven flip

This is the first flip carried out fully under `docs/jim-brief-registry-driven-client.md`'s
one-commit shape: no edits to `public/app.js`, `city-session.js`, `brisbane-dogfood.js`, or
`journey-model.js` at all — the flip commit touches only `lib/providers/registry.js` (status),
`lib/cities/country-regions.js` (Ireland's first region), `lib/cities/live-city-api.js`
(MULTI_CITY_IDS/typedef — the dispatch switch-cases were already wired from Jim's earlier
flip-follow-through, so no code change was needed there this pass), the regenerated
`public/city-directions/dublin.json` and `public/city-manifest.seed.{json,js}`, plus this note and
the sweep-log append. `lib/cities/city-bounds.js`'s Dublin box already existed from earlier
flip-readiness scaffolding and needed no change.

## What I did not do

Did not touch `lib/providers/dublin.js`, `lib/cities/dublin/*`, or the D1 pack beyond the registry
notes-field addendum. Did not merge anything. No background process left running (dev server on
`:3411` confirmed killed before the smoke run; smoke run's own spawned processes exited cleanly
with the suite; `netstat` confirms no listener on 3000/3411 at the end of this run; port 3400
belongs to Tim's other project and was never touched).

## Post-rebase update (same day, after PR #502/#503 merged)

After this PR opened, two prerequisites merged: **#502** (typed `FeedUnavailableError` + honest
partial boards for bespoke adapters) and **#503** (Dublin: name every terminus chip — Red +
Connolly, Green + Parnell/Sandyford short-turns — no bare "Red"/"Green" chip for any confirmed
`LINE_TERMINI` entry). #503 fixed exactly the bare-chip finding from the controller's pre-flip
check (Abbey Street, Belgard, Sandyford, Broombridge).

Rebased this branch onto `origin/master` @ `f3f26b58` (resolved one conflict in the append-only
`docs/dublin-d1/live-sweep-log.jsonl`, keeping both sweep entries), then:

- Regenerated `public/city-directions/dublin.json` (`node --env-file=.env.local
  scripts/write-city-directions.mjs --only=dublin`, 65/65 stations with chips) and
  `public/city-manifest.seed.{json,js}` (`node scripts/write-city-manifest.mjs`, 43 cities / 14
  countries, unchanged counts — only Dublin's `directionsVersion` hash moved).
- Sampled `/api/directions?city=dublin` and `/api/board?city=dublin` (dev server, explicit
  `PORT=3412`, killed before the smoke run) at Abbey Street, Belgard, Sandyford, Broombridge —
  **no bare "Red"/"Green" chip at any of the four**, and `Red + Connolly` / `Green + Sandyford`
  both appear where trams run (e.g. Abbey Street: `Red + Connolly, Red + Saggart, Red +
  Tallaght, Red + The Point`; Broombridge: `Green + Brides Glen, Green + Sandyford`).
- Reran `node qa/dublin-dogfood-gate.mjs`, `node qa/live-city-lists-sync.mjs`, `node
  qa/registry-driven-client.mjs` — all GREEN at the rebased flip state.
- Reran `node qa/run-all.mjs --smoke` PLAIN, foreground, explicit `timeout: 600000`, full run
  observed to completion: **166 PASS - 0 FAIL** (one more than the pre-rebase run —
  `bespoke-feed-unavailable-gate.mjs`, new from #502 — plus `dublin-dogfood-gate.mjs` still
  green with the new terminus-chip assertions #503 added).

No new RED findings. Verdict unchanged: GREEN. Force-pushed the rebased branch; did not merge.
