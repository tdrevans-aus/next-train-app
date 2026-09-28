# Jim brief — static-join cities: first `/api/directions` after a cold start fails ("Failed to fetch directions")

**Lane:** bug-fix / product mode (shared api/ + lib/providers/gtfs). **Date:** 28 Sep 2026. **tim-review:** no. **Locks:** none unless a city adapter file is edited (then check/acquire that country).

## Symptom (controller pre-check on Dublin flip PR #501, 28 Sep ~09:45 Dublin)
On a freshly started dev server, the first `GET /api/directions?city=dublin&station=Abbey%20Street` returned `{"error":"Failed to fetch directions"}`; the `/api/board` call 5 s later and every later call succeeded (< 600 ms). Dublin (and Melbourne, Adelaide, Copenhagen, Helsinki, Prague, Tampere…) load a static GTFS snapshot from Blob on first use plus the RT feed; the directions handler's timeout (find it in api/directions.js / lib/cities/live-city-api.js) is shorter than that cold path. On Vercel every cold function start reproduces this for the first rider.

## Fix
1. Measure: time the cold path per static-join city (snapshot download + parse + first RT fetch) and the directions handler's effective timeout; record in the PR.
2. Make the first request succeed: raise the directions timeout to cover the cold path (bounded), and/or warm the static snapshot in the background on function start (`loadGtfsStatic` prefetch for live static-join cities, fire-and-forget, never blocking), and/or return directions from the static schedule's chip list while RT warms (directions are chip labels, not times — allowed) with the board still live-only. Prefer the option that removes the error without any timetable time reaching a rider.
3. Client: if `/api/directions` fails, the app should retry once after 2 s before showing an error (check public/ for existing retry logic; keep it minimal).
4. Gate: `qa/cold-start-directions-gate.mjs` — start a fresh dev server, hit directions for two static-join cities immediately, assert 200 within the timeout; register in smoke.

## Acceptance
- Cold-start directions 200 for Dublin, Melbourne, Prague on a fresh server; warm latency unchanged; `node qa/run-all.mjs --smoke` PLAIN green. PR title: "Cold start: first /api/directions succeeds for static-join cities (prefetch + timeout + one retry)".
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline.
