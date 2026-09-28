# Jim brief — Prague: Flora empty (probable stop-id join bug), sweep must batch/pace Golemio, honest empty state for Prague (flip prerequisites)

**Lane:** bug-fix / product mode. **City:** prague, country czechia (acquire the lane lock). **Date:** 28 Sep 2026. **tim-review:** no (empty-state copy already approved 27 Sep; reused verbatim).

## Findings (Mark, origin/mark/prague-flip → docs/prague-d1/mark-qa-note.md)
A. qa/prague-all-stations-live-sweep.mjs issues one Golemio request per station sequentially with no pacing; Golemio's documented limit is 20 req / 8 s, and `/pid/departureboards` accepts up to 100 `ids[]` per request. 18–29 of 58 stations 429'd per poll; no clean evidence possible.
B. **Flora** (Line A, between Jiřího z Poděbrad and Želivského) empty on every clean poll; Jim's D2 note says the trimmed static GTFS has ZERO stop_times for Flora. A central metro station with no scheduled trips is almost certainly a stop-id mapping error in lib/cities/prague/stations.json / scripts/trim-prague-gtfs.mjs (PID GTFS uses per-platform stop_ids like `U…Z1P`/`U…Z2P` plus parent stations; a name match may have picked a surface/parent id that trips never reference). Investigate FIRST before treating it as a gap.
C. Prague has no `emptyReason` / honest-empty-state support (only Dublin does), so any genuinely empty in-catalog station is a silent blank — a hard fail under the 27 Sep rule.
D. Budějovická, Kačerov, Roztyly also empty on the opening-minutes polls — re-check after A is fixed, during full service.

## Fix
1. **Flora**: dump every PID stop row whose name folds to "Flora" (stop_id, parent_station, platform_code, location_type); find which ids appear in metro trips' stop_times; correct stations.json/the trim so Flora resolves to the platform ids trips actually use. Add a gate case: every catalog station must have ≥ 1 static stop_time in the trimmed snapshot (offline, against the committed fixture) — this would have caught it. Check all 58 stations with the same assertion.
2. **Sweep**: batch stations into Golemio requests of ≤ 50 `ids[]`, pace to ≤ 15 req / 8 s with a token bucket, retry once on 429 honouring Retry-After. Keep the headway-aware, evidence-log, 9-minute-cap semantics. Also check lib/providers/prague.js's per-station request shape is fine for riders (one request per board is OK; do not add cross-station fan-out).
3. **Honest empty state for Prague**: mirror lib/providers/dublin.js — compute `scheduledCandidates` from the trimmed static snapshot for the board horizon; when live is empty but the schedule expects service, set `emptyReason: "no-live-predictions"` through buildNextTrainResponse (lib/train-times-core.js already supports it); the client copy is generic (noun from `modes`: "trains" for metro). Extend qa/prague-dogfood-gate.mjs with the same three cases as qa/honest-empty-state.mjs's Dublin fixtures (all-empty → reason; partial → no reason; outside hours → no reason).
4. Note in docs/prague-d1/jim-handoff.md (appended) whether Findings B/D were mapping bugs or real gaps, with evidence.

## Acceptance
- `node qa/prague-dogfood-gate.mjs` (incl. new static-coverage and empty-state cases) green; `node --env-file=.env.local qa/prague-all-stations-live-sweep.mjs` during Prague daytime completes with 0 rate-limit errors and Flora served (or, if truly unserved after item 1, a Connolly-style coverage-note filter with evidence); `node qa/run-all.mjs --smoke` PLAIN green.
- Status stays "planned". PR title: "Prague: Flora stop-id fix, paced/batched live sweep, honest empty state (flip prerequisites)". Link this brief and Mark's note.
- HARD RULES: never kill a process you did not start; port 3400 is Tim's snap-approvals server; PORT + QA_BASE discipline.
