# Mark brief — re-review of PR #356 after fix-ups (blob snapshot integrity)

**Lane: QA (flag only).** Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/356, branch
  `newcastle-stale-snapshot`, now at commit `359b464`.
- `docs/mark-note-newcastle-stale-snapshot.md` — **your own previous FAIL note**, which this
  answers.
- `docs/jim-brief-newcastle-fixups.md` — the fix-up brief and its eight criteria.

This is a re-review. You already judged the publish guard, the `board.js` message, the workflow
deletion and the Vancouver cron removal sound — confirm they haven't regressed, don't redo them.

## What was changed

Coverage is now **derived**: the gate scans `lib/providers/*.js` for `gtfsFixtureBlobUrl()` calls
and intersects with `status: "live"`, resolving today to canberra, gold-coast, malmo, newcastle,
uppsala. The synthetic-content check fails closed on a missing `feed_info.txt` and adds three
naming-independent signals (zip < 5KB, trip count < 5, calendar span > 400 days). The gate exits **2**
rather than 1 when every failure is the already-diagnosed Newcastle case, and `qa/run-all.mjs` now
renders that as `FAIL (known, tracked — …)`.

## The three things that need your judgement

**1. Can the exit-2 "known, tracked" path mask a real failure?** This is the most dangerous change
in the PR. Check precisely what happens if Newcastle starts failing for a *different* reason — a new
kind of corruption, a 404 on the blob, a different city failing at the same time. The gate must exit
2 only when every failure is specifically the diagnosed Newcastle synthetic-data case, and must fall
back to a plain failure otherwise. Verify by construction, not by reading the intent: force a second
failure and confirm the output degrades correctly. A "known, tracked" label that can swallow an
unknown problem is worse than the bare FAIL it replaced.

**2. Malmö and Uppsala excluded from the refresh pipeline.** My brief said adding them or recording
a good reason were both acceptable, and Jim recorded one: Trafiklab rate-limit risk. Assess whether
that reason holds. Then follow it through: **their calendars expire 2026-12-11.** With no refresh
path, that is a scheduled outage with a known date. Does anything — this gate, the runtime staleness
check, the FB-64 prod sweep — actually catch it when it happens, and is "detected in December" good
enough, or does this need a manual refresh plan recorded now? Say what you think should happen, not
just whether the code matches the brief.

**3. The derived-coverage mechanism itself.** It resolves correctly today, but it works by scanning
source files for a function call. Consider how it fails: a provider that reaches the blob indirectly
via a helper, a renamed function, a city whose provider lives outside `lib/providers/*.js`. Would
the gate silently under-cover again — the exact defect this replaced? If the derivation can fail
open, say so.

## Also verify

- The three new naming-independent signals actually fire on the Newcastle fixture (2KB, 2 trips,
  perpetual calendar) and don't false-positive on the five real snapshots — Malmö and Uppsala are
  28MB and 19MB with calendars to 2026-12-11.
- Criterion 3: Brisbane is no longer content-checked as blob-backed.
- The PR description's corrected calendar claim (Brisbane 2026-11-09, Gold Coast 2026-10-28).
- `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
  suite. Expect the Newcastle gate to fail as known/tracked. `uppsala-dogfood-gate.mjs` flakes in
  batch with Sweden `ECONNRESET` and passes in isolation.
- Nothing echoes, logs or commits a credential.

## Context you should have

Separately, on PR #355, I found something after your PASS that is worth knowing about here: the
prod sweep was tripping our own rate limiter (60 req/60s in `lib/api-rate-limit.js`) and reporting
the resulting 429s as city errors — eight UK regions, identically, on two consecutive runs. You'd
read them as single-run flake below threshold. Not a criticism of that review, which was otherwise
thorough — but a case worth carrying into this one: when the same items fail the same way twice,
treat it as a pattern rather than noise, and prefer forcing the failure over reasoning about whether
it matters.

## Deliverable

Post a single pass/fail note as a PR comment on #356 via `gh pr comment 356`, with a clear verdict
line and your view on the Malmö/Uppsala December expiry. Update
`docs/mark-note-newcastle-stale-snapshot.md` with the re-review outcome. State again, prominently,
what Tim must do himself — republish real Newcastle GTFS and verify `BLOB_READ_WRITE_TOKEN` in both
GitHub Actions and Vercel — since the outage persists until then. Do not merge.
