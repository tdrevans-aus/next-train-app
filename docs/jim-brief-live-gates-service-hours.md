# Jim brief — live dogfood gates must not fail outside service hours (Copenhagen/Melbourne/Adelaide night flakes block every PR)

**Lane:** bug-fix / product mode (qa/ only). **Date:** 28 Sep 2026. **tim-review:** no.

## Symptom
`web-qa` on PR #487 failed at 01:50 Copenhagen time on `qa/copenhagen-dogfood-gate.mjs` ("København H must surface at least one Regionaltog chip"); the same gate passes in daytime and on master's 18:41 CEST run. Overnight on 27–28 Sep, `melbourne-dogfood-gate.mjs` (Eaglemont→Flinders Street after the Hurstbridge line closes) and `adelaide-dogfood-gate.mjs` failed the same way in every local smoke run, and `no-live-feed-stops-gate.mjs` (Greater Manchester "Near me") fails at some hours. Because `web-qa` is the required check, European-night CI (= Perth mornings) can block every PR, and agents waste re-runs.

## Fix
1. Audit every `qa/*-dogfood-gate.mjs` (and no-live-feed-stops-gate) for assertions that require a NON-EMPTY live board/chip ("must surface at least one …", "must return a non-null next train"). For each, make the live assertion service-hours aware: derive "service expected now" from the city's own data (static timetable if the adapter has one; otherwise a documented per-city service window in the gate) in the city's IANA zone. Outside the window: assert the well-formed empty/next-service shape instead (and, for cities with the honest empty state, that `emptyReason` semantics hold), and print `SKIP-LIVE (outside service hours, <city> local <HH:MM>)`. Inside the window: unchanged strict assertions. Never weaken offline/synthetic assertions.
2. Add a shared helper `qa/helpers/service-hours.mjs` used by all of them; unit-test it with fixed clocks.
3. Copenhagen specifically: check whether Regionaltog absence at København H at night is real (DSB night regional trains are sparse) — the gate should assert the chip only when the static timetable says a Regionaltog departs within the board horizon.
4. Report the list of gates changed and the per-city windows in the PR.

## Acceptance
- With a fixed clock at 02:00 local for Copenhagen, Melbourne, Adelaide and Manchester, each gate passes with SKIP-LIVE lines; with a fixed daytime clock, the strict path runs (prove both via the helper's test, and by running each gate once live now and stating the local hour).
- `node qa/run-all.mjs --smoke` PLAIN green at the hour you run it. PR title: "qa: live dogfood gates are service-hours aware (no European-night / Australian-midnight flakes)".

## Also in scope — dev-server port discipline (root cause of the 28 Sep "kill on port 3000" prompts)
`dev-server.js` binds `$PORT` (default 3000). `QA_BASE` only tells a gate where to look; it does not move the server. A Mark agent started the server without `PORT` (bound 3000) while its gate polled 3411, then tried to kill the "stray" on 3000 — its own server. Fix: (a) `dev-server.js` prints a loud warning when `QA_BASE` is set to a port it is not bound to, and honours `QA_PORT`/`PORT` consistently; (b) `qa/helpers/dev-server.mjs` (or whatever helper standalone gates use to attach) refuses to attach when `QA_BASE`'s port has no listener and says exactly how to start one (`PORT=<n> node dev-server.js`); (c) every standalone gate that hardcodes `http://localhost:3000` reads `QA_BASE` instead (grep and list them); (d) document in TESTING.md. Never add any code that kills processes.
