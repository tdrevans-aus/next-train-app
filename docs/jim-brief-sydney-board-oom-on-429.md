# Jim brief — Sydney: /api/board crashes the server (V8 OOM) when the NSW GTFS static feed returns 429

**Lane:** bug-fix / product mode. **City:** sydney, country australia (acquire the lane lock if lib/providers/sydney.js changes; the likely fix is in shared lib/providers/gtfs/static-cache.js + api/board.js error handling). **Date:** 27 Sep 2026. **tim-review:** no.

## Symptom (Mark, QA of PR #479, 27 Sep)
Two attempts at `/api/board?city=sydney&station=Central` on a dev server crashed the whole node process: first a 429 from Transport for NSW's GTFS static download followed by a V8 out-of-memory abort, then ECONNRESET on retry. Reproducible on master and on the PR branch — pre-existing, unrelated to #479. In production this would be a function crash (500) for every Sydney request while the 429 lasts, and possibly for co-located requests in the same instance.

## Investigate
1. Reproduce with the static feed URL stubbed to return 429 (no need to hammer TfNSW). Find where the 429 body/stream is handled: is the error response being buffered/unzipped as if it were the zip (fflate inflating garbage → unbounded allocation)? Is there a retry loop that re-downloads the ~100 MB zip without backoff?
2. Check the same path for every static-GTFS city (Melbourne, Adelaide, Brisbane, Helsinki, Oslo, Stockholm family, Copenhagen, Boston, LA, Dublin) — the fix belongs in the shared helper.

## Fix
- Treat any non-2xx from a static/RT fetch as a typed error before touching the body; never inflate a non-zip; cap retries with backoff and honour Retry-After; surface a clean `FeedUnavailableError` that api/board.js turns into a fast 503 with the existing rider-facing "live data unavailable" path — never a process crash, never a synthetic board.
- Memory: ensure a failed download frees its buffer; add a process-level guard test that a 429 fixture leaves heap within bounds.
- Offline gate `qa/static-feed-429-gate.mjs`: stubbed 429 → 503 JSON in < 2 s, process alive, second request after the stub returns 200 works.

## Acceptance
- New gate green; `node qa/run-all.mjs --smoke` green (known local flake: no-live-feed-stops-gate — re-run alone if only failure).
- PR title: "GTFS static fetch: 429/non-2xx never crashes the server (Sydney OOM)". Link this brief and Mark's PR #479 comment.
