# Jim brief — production regression: 30 s maxDuration on board/next-train turns slow cold hubs into 504s (Sydney Central, Copenhagen København H)

**Lane:** bug-fix / product mode, URGENT (live riders). **Date:** 8 Oct 2026. **tim-review:** no. **Locks:** denmark for lib/providers/copenhagen.js; australia if lib/providers/sydney.js changes.

## Evidence (controller, 8 Oct 2026 15:40–16:10 AWST)
- `GET /api/board?city=sydney&station=Central` → 504 after 34.4 s on a fresh instance (earlier today: FUNCTION_INVOCATION_FAILED, then 200 in 14 s, then 0.2 s warm).
- `GET /api/board?city=copenhagen&station=K%C3%B8benhavn%20H` → 504 at 30.5 s and a 40 s client timeout, even on what should be warm instances; Nørreport board 16.2 s; Lufthavnen 0.5 s. København H has 32 directions.
- PR #504 (28 Sep) added `"maxDuration": 30` for api/board.js, api/next-train.js, api/directions.js, api/destinations.js in vercel.json. Before that these functions ran with the platform default (Fluid Compute default is far higher — confirm the actual default for this project and cite). #504's own measurements only covered `/api/directions`, never `/api/board` at a large hub.

## Fix
1. **Immediate:** restore headroom for api/board.js and api/next-train.js (remove the 30 s entries or set a higher bounded value, e.g. 120 s — justify with measurements); keep directions/destinations bounded only if measurements show they are always well under it. Do not touch api/health.js (300 s, refresh cron).
2. **Copenhagen København H board performance:** profile `/api/board` for København H locally — 32 directions fan out in api/board.js; find why it takes > 30 s warm (per-direction re-filtering of the full trip list? per-direction static/RT reload? serial awaits?). Fix so the board computes the station's trips ONCE and slices per direction (Prague #502 did one-request-per-board for Golemio — same idea in the shared fan-out if possible, otherwise in the Copenhagen adapter). Target: København H board < 3 s warm, < 10 s cold.
3. **Sydney Central:** measure cold board time; if the cold path is the TfNSW static load, record it and make sure it completes within the restored limit; note any further optimisation as a follow-up rather than expanding scope.
4. qa: extend qa/cold-start-directions-gate.mjs (or add qa/cold-start-board-gate.mjs) with a cold `/api/board` case for the largest hub per keyed city available in CI (keyless cases must still run in CI), and a warm `/api/board` København H case with a bound.

## Acceptance
- Local fresh server: Sydney Central and København H boards return 200 cold within the new limit, København H warm < 3 s; trip counts and direction sets unchanged vs master within live noise (København H's 32 directions).
- `node qa/run-all.mjs --smoke` PLAIN green. PR title: "Board: restore function headroom (30 s cap from #504 caused 504s) + Copenhagen hub board computes trips once".
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline; pace TfNSW/Rejseplanen politely.
