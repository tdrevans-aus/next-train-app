# Dublin (Luas Red + Green) — pre-flip QA note (run 7)

**Verdict: RED. Do not flip. No PR opened.**

Run by Mark on `mark/dublin-flip-7` (cut from `origin/master` @ `a50a153`, PR #486 merged —
live sweep evidence-memory + intermittent-long classification), 2026-09-27, ~16:43–17:09 UTC
(Sunday afternoon, full Luas service, ~300–325 total live network trips per poll — healthy feed).

This is the first pass since #486 landed the evidence-memory fix for run 6's Broombridge
blocker. Items 1–3, 5, 6 and the live rider-path spot-check under item 4 are all clean. The
smoke suite (item 7) surfaced a new, Dublin-specific, genuine blocker that was invisible before
this run because it only fires for `status: "live"` cities: `qa/coverage-notes-gate.mjs` fails
against `lib/cities/dublin/coverage.json`'s top-level `notes` field. This blocks the flip on its
own; everything else is ready.

## 1. Board eligibility (docs/board-eligibility-rule.md)

PASS. docs/dublin-d1/oracle-clash-report.md Board eligibility section has no undecided rows.
Six verdict rows: Luas Red `in`, Luas Green `in`, DART `out-product` (v2), Dublin Bus/Bus Eireann/
Go-Ahead Ireland `out-mode`, Connolly Luas stop `out-feed`, Saggart Luas stop `out-feed`. Boards
are Luas-only in both the catalog and the live rider-facing response (verified below).

## 2. Live-only grep on lib/providers/dublin.js

PASS. `tripHasRealtimeConfirmation()`/`classifyAndFilterDublinTrips()` require every trip shown
to carry a real RT `stopTimeUpdate` or trip-level delay; `scheduledCandidates` (schedule-only,
never shown as live) is kept only to drive the honest-empty-state distinction.
`MissingNtaApiKeyError` propagates rather than falling back to a timetable board when the key is
absent. Same live-only posture cited against `lib/providers/melbourne.js` and
docs/jim-brief-boston-subway-live-predictions.md. One stale comment: the file header still says
"NTA_API_KEY was NOT available this session" — it *was* available this run (`.env.local` has
it) — cosmetic only, does not affect behaviour, flagging rather than fixing.

## 3. GTFS snapshot / RT join / all-stations live sweep — PASS

- `node qa/verify-dublin-gtfs-snapshot.mjs` — PASS. 2 routes (Red/Green), 1 agency (LUAS), 128
  distinct stops used by kept trips, 465,806 bytes, published to blob and fetched 200.
- `node --env-file=.env.local qa/dublin-rt-join-check.mjs` — PASS. 2,330 total TripUpdates in
  the live feed; 57 identified as Luas; 57/57 (100%) resolved against the static snapshot. Zero
  unmatched trip_ids.
- `node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs` — **PASS**, exit 0. Full
  9-minute, 18-poll, headway-aware sweep, ~16:51–17:00 UTC (17:51–18:00 Dublin time), 300–325
  total live trips per poll throughout (healthy feed, not a quiet period):

      dublin-all-stations-live-sweep: ok — every catalog station either had live trips, a long
      intermittent gap backed by evidence-memory, or a properly-flagged honest empty state
      within its own 1.5x-headway threshold

  No station required `intermittent-long`/`uncertain` classification this run — every one of
  the 65 catalog stations cleared its own headway threshold on live trips alone (checked the
  script's stdout directly: no `intermittent-long`/`uncertain`/`permanent` line appears anywhere
  in the run's output). The evidence log (docs/dublin-d1/live-sweep-log.jsonl) gained one more
  clean entry (`sweep-2026-09-27T16:53:06.033Z`) with three stations showing partial (not
  continuous) empty polls this run — Tallaght (6/18 non-empty), The Point (5/18), Marlborough
  (16/18) — all three ended the run with `emptyRunSeconds: 0`, i.e. no ongoing empty streak at
  cutoff, so none tripped the 1.5x-headway failure condition. Per the updated 27 Sep §9 rule
  (permanent only if never once observed non-empty in the 7-day evidence window), and given this
  run's own healthy per-station trip counts throughout, this is unambiguously a clean pass, not
  a borderline one — Broombridge, Cowper and Marlborough (the three the brief called out by
  name) all showed live, real-time-confirmed trips on both the sweep and the item-4 spot-check
  below.

## 4. Rider-facing /api/board + /api/directions, flip-commit state

Made the flip-commit edits (registry status live, dublin added to MULTI_CITY_IDS/typedef,
country-regions.js ie/Ireland entries + COUNTRY_ORDER, regenerated city-directions/dublin.json
via `node --env-file=.env.local scripts/write-city-directions.mjs --only=dublin` [65/65 stations
with chips] and city-manifest.seed.* via `node scripts/write-city-manifest.mjs` [42 cities, 13
countries]) in this worktree to exercise the real rider path on a dev server on an explicit free
port (3011, never 3000 — occupied by another app this session). Reverted all of it once item 7
turned up the coverage-notes-gate blocker below — nothing in this section should be read as
"ready to flip"; it is the evidence that the rider path itself is fine and the only problem is
the coverage.json wording.

All ten sampled stations responded well under 3s in steady state (typically ~2.05–2.15s; two
isolated ~5s outliers — Abbey Street's very first cold call, and one mid-sequence call to The
Point — both explained by the shared 20s in-process TripUpdates cache TTL being crossed by
sequential different-station requests spread over ~20s+; this is the same cache every other
GTFS-RT city here uses, not a new regression, and no call approached a timeout):

| Station | Result |
|---|---|
| Abbey Street | Red / Red + Tallaght / Red + The Point, all realtime true. No Green chip (hub lock holds). (One bare "Red" chip alongside the two terminus chips — an unresolved-terminus trip falling back to the bare line label per `mapLineTerminusDestination`'s designed fallback, not a bug.) |
| Tallaght | Red + The Point, realtime true. |
| The Point | Red + Tallaght, realtime true. |
| Brides Glen | Green + Broombridge, realtime true. |
| Broombridge | Green + Brides Glen, realtime true, live trip present (not empty this pass). |
| Belgard | Red + Saggart, Red + Tallaght, Red + The Point all present, all realtime true — fork confirmed correctly. |
| Sandyford | Green + Brides Glen, realtime true. |
| Marlborough | Green + Brides Glen only, realtime true (no Red chip, no northbound chip — hub lock and Green loop exclusivity both hold). |
| Rialto | Red + Tallaght, Red + The Point, both realtime true. |
| Red Cow | Red + Tallaght, Red + The Point, both realtime true. |

- No station offered a chip naming itself (checked every destination string returned against the
  station being queried; none matched).
- Green loop exclusivity held: Marlborough southbound-only in the actual sample above; code
  inspection of `isDirectionAllowedAtStop()`/`GREEN_LOOP_DIRECTION_ONLY` confirms O'Connell -
  GPO/O'Connell Upper are northbound-only, unchanged from prior passes.
- `/api/directions?city=dublin&station=Belgard` returned `Red + Saggart`, `Red + Tallaght`,
  `Red + The Point` — Belgard fork requirement satisfied.
- Saggart and Connolly both correctly 400 "Unknown station" on `/api/board` (filtered out of the
  catalog, as designed — not silently empty boards).
- `/api/coverage-notes?city=dublin` served the current (unfixed) coverage.json verbatim — see
  item 7, this is the rider-facing surface the gate is protecting.
- `/api/cities` manifest entry for dublin in the flip-commit state: status live, country id ie
  name Ireland, timeZone Europe/Dublin, bounds populated, modes light_rail, directionsVersion
  5054634e — all present and correct.

## 5. Hub lock / timezone / doNotGroup

PASS. `lib/cities/dublin/marketing-directions.js`: `DUBLIN_HUB = "Abbey Street"`,
`DUBLIN_TIME_ZONE = "Europe/Dublin"` (IANA, explicit comment against hand-rolling a
fixed-offset rule). `doNotGroup` pairs enforced via `HUB_PROXY_FORBIDDEN`
(Marlborough/O'Connell - GPO/O'Connell Upper/Connolly/Busáras/O'Connell Bridge never stand in
for the hub) and `FORBIDDEN_STATION_TOKENS` (invented city ids, other cities' hub strings,
generic City/Centre tokens). Confirmed live in the board samples above (Abbey Street never shows
a Green chip; Marlborough never shows a Red chip).

## 6. Registry-driven

PASS (in the flip-commit state, reverted after testing — see item 4 preamble; also confirmed by
the smoke suite's own registry-driven-client.mjs/live-city-lists-sync.mjs/
country-regions-sync-gate.mjs runs below, at the same flip-commit state). `/api/cities`
correctly listed dublin live with Ireland/bounds/directionsVersion/modes as shown above. Editing
only `lib/providers/registry.js`, `lib/cities/country-regions.js`, `lib/cities/live-city-api.js`,
plus regenerating `public/city-directions/dublin.json` and
`public/city-manifest.seed.json/js` was sufficient — no `public/app.js`/`city-session.js`/
`brisbane-dogfood.js`/`journey-model.js` edit needed. `lib/cities/city-bounds.js` already had the
Dublin box from a prior pass, untouched this run.

## 7. Gates at flip state

- `node qa/dublin-dogfood-gate.mjs` — PASS, both standalone (`status=planned`) and inside the
  full smoke run at the flip-commit state (`status=live`), confirming it really is
  status-agnostic per PR #484.
- `node qa/live-city-lists-sync.mjs` — PASS (flip-commit state, 42 live cities consistent).
- `node qa/country-regions-sync-gate.mjs` — PASS (flip-commit state, 42 entries consistent).
- `node qa/registry-driven-client.mjs` — PASS.
- `node qa/honest-empty-state.mjs` — PASS.
- `node qa/run-all.mjs --smoke` (PLAIN, flip-commit state, `timeout: 600000`) — **157 PASS, 3
  FAIL, 160 scripts, 592s.** Three failures:
  1. **`coverage-notes-gate.mjs` — BLOCKING, Dublin-specific, genuinely new (only checked for
     `status: "live"` cities, so this never fired against Dublin before this run):

         FAIL: dublin coverage.json reads like pipeline notes, not rider prose
         (found a D1/oracle/CRS reference)

     The offending text is in `lib/cities/dublin/coverage.json`'s top-level `notes` field, which
     mixes genuinely rider-facing sentences ("Connolly ... use Busaras") with pipeline-internal
     references that should never reach a rider-facing surface — specifically
     `docs/dublin-d1/live-sweep-log.jsonl` (the `\bD1\b` match), plus prose written for Jim/Mark's
     own audit trail ("see docs/dublin-d1/live-sweep-log.jsonl, the evidence log
     qa/dublin-all-stations-live-sweep.mjs uses to tell this apart from a permanent gap like
     Connolly/Saggart above"). This same `notes` field is served verbatim by the rider-facing
     `/api/coverage-notes?city=dublin` endpoint (confirmed in item 4) — so this isn't a
     lint-only nit, a real rider could see internal pipeline jargon in a coverage explainer. The
     per-item `covered`/`partial`/`notCovered` `label`/`detail` strings are all clean rider prose
     already (checked directly); only the top-level free-text `notes` field needs a rewrite.
     **I did not fix this myself (flag, don't fix, no adapter/data edit made this pass).**
     Whoever picks this up should rewrite `notes` in plain rider language (the intermittent-gap
     explanation itself is worth keeping for riders — "some trams don't show live times for a
     few minutes even though they're running" is legitimate and useful copy — it's the
     doc-path/city-jargon references that need to go, not the underlying fact) and re-run
     `node qa/coverage-notes-gate.mjs` to confirm.
  2. `adelaide-dogfood-gate.mjs` — FAIL, unrelated to Dublin (no Dublin change touches Adelaide
     code or data). Live-network/time-of-day dependent: "Goodwood towards ... (Belair line) must
     return a non-null next train ... 1 live Belair-line trip(s) exist ... right now". Re-ran
     standalone twice, failed identically both times against the live Adelaide feed at this exact
     moment — consistent with a real-time production-regression flake (explicitly cites #439,
     the same regression class as the documented Melbourne flake below), not something this
     branch caused or can fix.
  3. `melbourne-dogfood-gate.mjs` — FAIL, the documented known time-of-day flake (Melbourne past
     midnight, Hurstbridge line finished for the night) called out in this run's brief. Re-ran
     standalone, identical failure both times, consistent with the known flake rather than a new
     regression.
  - `no-live-feed-stops-gate.mjs` (the other documented possible flake) did **not** fire this run
    — passed cleanly (13s).
  - Every other Dublin-specific gate in the suite (`dublin-dogfood-gate`, `honest-empty-state`,
    `bundled-city-directions`, `registry-driven-client`, `country-wide-picker`,
    `live-city-lists-sync`, `country-regions-sync-gate`) passed at the flip-commit state.

## Net

Everything the adapter/pack/D1 investigation owns is clean — items 1–6 are all green, and this
is the first pass where the live-sweep item (3) is unconditionally clean rather than needing the
evidence-memory carve-out. The sole blocker is `lib/cities/dublin/coverage.json`'s rider-facing
`notes` field failing `qa/coverage-notes-gate.mjs` because it leaks pipeline-internal doc-path
references (`docs/dublin-d1/...`) into copy the rider-facing `/api/coverage-notes` endpoint
serves verbatim. This gate only runs against `status: "live"` cities, so it was invisible in
every prior planned-status pass — it is a genuinely new finding for this run, not a repeat of
anything from runs 1–6. Once the `notes` field is rewritten in plain rider language (keeping the
useful "trams sometimes don't show live times for a few minutes" fact, dropping the doc-path/
session-log references), re-run `node qa/coverage-notes-gate.mjs` plus this checklist's items 4,
6 and 7 to confirm, then this city is ready to flip.

Adelaide and Melbourne dogfood-gate failures are unrelated, live-time-dependent, pre-existing
flakes (not caused by this branch, no Dublin file touches either city) — noted for visibility,
not blocking.

I did not make any adapter/catalog/coverage fix myself (flag, don't fix). The working tree at the
end of this run contains only this note and the sweep script's own append to
`docs/dublin-d1/live-sweep-log.jsonl` (the evidence log qa/dublin-all-stations-live-sweep.mjs
writes to regardless of pass/fail, per its own design) — every flip-commit edit made to test
item 4/6 (registry.js, country-regions.js, live-city-api.js, city-directions/dublin.json,
city-manifest.seed.*) was reverted (`git checkout --`) once the coverage-notes-gate failure was
found, confirmed via `git status --short`.

No dev server, background loop, or poll left running — port 3011 (the only port used besides the
suite's own auto-picked one) is confirmed free (killed the dev-server process and re-checked
`netstat` before finishing); the worktree is clean at `a50a153` with only this note and the
sweep-log append staged.

