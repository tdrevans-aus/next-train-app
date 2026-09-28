# Jim brief — bespoke adapters: a failed direction must surface as "temporarily unavailable", never a silent drop

**Lane:** bug-fix / product mode (multi-city, shared error path). **Date:** 28 Sep 2026. **tim-review:** no (uses the existing 503 rider copy). **Locks:** run `node qa/lane-lock.mjs check` for each country whose adapter you edit (czechia, austria, united-states, hong-kong, …) and acquire each before touching its lib/providers/<city>.js; stop and report if any is held.

## Finding (Mark, Prague flip QA pass 3, PR #498 "Decisions for Tim")
`api/board.js` fans out one fetch per direction; if a direction's fetch throws a plain `Error` (Prague's `fetchDepartureBoardsJson` on a Golemio 429/5xx; same shape in lib/providers/vienna.js, washington.js, hong-kong.js, boston.js's non-GTFS paths, chicago.js, bart.js), that direction is dropped from the board and the rider sees a partial board with no explanation. Only `FeedUnavailableError` (lib/providers/gtfs/errors.js, added by #480) triggers the 503 `PROVIDER_UNAVAILABLE` path with the "Live times are temporarily unavailable" copy.

## Fix
1. Each bespoke adapter throws `FeedUnavailableError` (with `status`/`retryAfterMs`/`cause`) for non-2xx responses, network errors, rate limits and unparseable bodies — never a bare Error, never an empty/synthetic board. Keep provider-specific typed errors (e.g. MtrScheduleError NT-301/NT-205, MissingGolemioApiKeyError) but make them extend or wrap FeedUnavailableError where they mean "feed unavailable right now".
2. `api/board.js`: when SOME directions fail with FeedUnavailableError and others succeed, return the successful directions AND a top-level `partial: true` + `unavailableDirections: [...]` (additive fields), so the UI can show the honest "some directions unavailable" state; when ALL fail → 503 as today. Extend `public/nearby-mode.js` minimally: a direction listed in `unavailableDirections` renders the existing "temporarily unavailable" copy when focused (reuse #500's per-direction pattern).
3. Golemio-specific: Prague's per-direction fan-out should reuse one departure-boards request per station (the API accepts many ids) — cache per station for the 20 s window so N directions = 1 upstream call.
4. qa: extend `qa/static-feed-429-gate.mjs` (or a new `qa/bespoke-feed-unavailable-gate.mjs`) with stubbed 429/500 for one bespoke adapter per pattern (Prague, Vienna, Washington, Hong Kong) asserting typed errors, partial-board fields, and the all-fail 503; UI fixture for a partial board.

## Acceptance
- Gates green; `node qa/run-all.mjs --smoke` PLAIN green; live spot-check on a dev server for Prague/Vienna/Washington/Hong Kong boards unchanged in the happy path (counts within live noise vs master).
- PR title: "Bespoke adapters: typed FeedUnavailableError + honest partial boards (no silent direction drops)". Link this brief, #480, #498.
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline; pace Golemio ≤ 15 req/8 s, WMATA ≥ 3 s, MTR ≥ 2 s.
