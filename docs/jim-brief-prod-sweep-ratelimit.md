# Jim brief — prod sweep trips our own rate limiter (PR #355, second fix-up)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Same authorisation as the previous
prod-sweep briefs: `qa/`, `.github/workflows/`, `package.json`, `docs/go-live-ops.md`.

tim-review: no. Lane lock: not required — touches no city's `lib/providers/` adapter.

## Context

PR #355 (branch `prod-sweep-scheduled-check`) passed Mark's re-review, but I found a blocker before
merging. Read `docs/mark-note-prod-sweep.md` for the review history; the Brisbane and
state-mechanism fixes from the previous round are **good and must not be reworked**.

## The defect

The sweep trips **our own API rate limiter** and reports the resulting 429s as city errors.

`lib/api-rate-limit.js` allows **60 requests per 60 seconds per IP** (`WINDOW_MS = 60_000`,
`LIMIT = 60`). The sweep issues roughly 100+ requests in a burst — 33 live cities, each needing a
`/api/directions` call plus up to three `/api/next-train` calls — so everything after request 61 is
rejected. It is always the same tail-end cities.

Two consecutive runs, Mark's and mine, both produced identical results:

```
Summary: ok=24 empty=0 error=8 skipped=1

[error] east-midlands          next-train: HTTP 429: {"error":"Too many requests"}
[error] solent                 next-train: HTTP 429
[error] thames-valley          next-train: HTTP 429
[error] greater-manchester     next-train: HTTP 429
[error] liverpool-city-region  next-train: HTTP 429
[error] greater-anglia         next-train: HTTP 429
   ... 8 in total, all UK regions, all 429
```

Mark's note classified these as single-run 429s below the alert threshold. They are not transient —
they are **structural and perfectly repeatable**, because the sweep's own burst rate causes them. At
`N = 3` consecutive, the third hourly run pages on eight cities simultaneously, none of which is
actually broken.

This is the same cry-wolf failure as the Brisbane false positive, arriving by a different route, and
it is worse: eight cities at once, every run, forever. It would land in Tim's inbox while he is away
27 Sep – 9 Oct, alongside the one genuine Newcastle alert, and would bury it.

## What to fix

**1. Pace the sweep to stay under the limiter.** Keep total request rate comfortably below 60/minute
— a small delay between requests, or an explicit token-bucket, whichever you find cleaner. The sweep
is hourly and has no deadline; taking two or three minutes to complete is entirely fine. Do not
raise `LIMIT` in `lib/api-rate-limit.js` — that limiter protects production from real abuse, and
weakening it to suit a monitor would be fixing the wrong thing.

**2. A 429 is never a city finding.** A rate-limit rejection from our own API says nothing about
whether that city's data is healthy — it is a fact about the sweep, not about the city. Classify it
distinctly (`throttled`, or reuse `skipped` with a clear reason) so it can never contribute to a
city's consecutive-failure count. If a run ends with any throttled city, that is a defect in the
sweep's own pacing and should be visible as such in the output.

**3. Honour `Retry-After`.** The limiter sets it on every 429. If you do retry, back off by that
value rather than guessing.

## Acceptance criteria

1. A full run against production completes with **zero** 429s. Show the summary line in the PR.
2. Two consecutive runs both report the eight previously-failing UK regions as `ok` (or as a genuine
   non-429 state, explained).
3. A 429, if one ever occurs, cannot increment any city's consecutive-failure counter.
4. `lib/api-rate-limit.js` is unchanged.
5. Newcastle still reports `error` — the genuine outage, fixed separately under PR #356.
6. Everything from the previous rounds stays passing: the three-chip empty check, hub-preferred
   sampling, `actions/cache` state with `permissions: contents: read`, no push/pull_request
   triggers, exclusion from `qa/run-all.mjs` at every tier, service-hours and DST logic.
7. `docs/go-live-ops.md`'s sweep section reflects the pacing behaviour and expected runtime.
8. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite.

## A note on how this was found

Mark passed this PR. I ran the sweep once myself before merging and the repeated `error=8` did not
look like flake. Worth remembering on both sides: a clean QA verdict is evidence, not proof, and
"below the alert threshold" is only reassuring when the failures are actually independent. When the
same eight items fail the same way twice, that is a pattern, not noise.

## Handoff

Work on the existing branch `prod-sweep-scheduled-check` and push to it, updating PR #355 in place.
Do not open a second PR and do not merge. Copy this brief into the branch and leave a PR comment
summarising the change so Mark's re-review starts from it.
