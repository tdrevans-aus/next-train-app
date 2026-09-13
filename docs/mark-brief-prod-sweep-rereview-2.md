# Mark brief — second re-review of PR #355 (prod sweep, after the rate-limit fix)

**Lane: QA (flag only).** Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/355, branch
  `prod-sweep-scheduled-check`, now at commit `1f23ddb`.
- `docs/mark-note-prod-sweep.md` — your two previous notes on this PR (FAIL, then PASS).
- `docs/jim-brief-prod-sweep-ratelimit.md` — the fix-up brief this answers.

## Why there is a third round

You passed this PR. Before merging, I ran the sweep once myself and saw `error=8` — the same eight
UK regions, failing identically, on two consecutive runs. They were not independent flakes: the
sweep was firing 100+ requests in a burst and tripping our own limiter in
`lib/api-rate-limit.js` (60 requests / 60 seconds / IP), so everything past request 61 was rejected.
At `N = 3` that would have paged on eight healthy cities every hour.

You had read them as single-run 429s below threshold. Your review was otherwise thorough — the
transferable lesson, which applies directly below, is that when the same items fail the same way
twice it is a pattern rather than noise.

## What changed

`qa/prod-sweep.mjs` now paces requests (`REQUEST_INTERVAL_MS`, default 1100ms), so a run takes
around five minutes; introduces a distinct `throttled` outcome that never moves a city's
`consecutiveError` / `consecutiveEmptyInHours` counters; and honours `Retry-After` on one retry. A
throttled-only run prints a `SWEEP PACING DEFECT` line rather than contaminating the per-city
summary.

## Verify

1. **Zero 429s, twice.** Run `node qa/prod-sweep.mjs` yourself at least twice and confirm no 429 in
   either run and that the eight previously-failing UK regions report `ok`. Two clean runs, not one.
2. **A throttled result cannot increment any counter.** Check by construction, not by reading —
   force a throttled outcome and confirm the counters are untouched.
3. Everything from the previous rounds still holds: three-chip empty check, hub-preferred sampling,
   `actions/cache` state with `permissions: contents: read`, no push/pull_request triggers, excluded
   from `qa/run-all.mjs` at every tier, service-hours and DST logic, live-city list derived from
   `registry.js`.

## The new judgement call — London will alert forever

In my own run just now, London reported `empty` on **Abbey Road → DLR Bank**, and has done
repeatedly (`empty x3`). That chip is FB-61: Abbey Road sits on the Stratford International –
Woolwich Arsenal branch and no service from it ever runs to Bank, so the chip can never return a
trip. It is a real catalog defect, not an outage — and the sweep cannot tell the difference.

So on today's sampling, **London alerts continuously until FB-61 is fixed.** That is the same
cry-wolf failure as Brisbane and as the 429s, arriving a third way. Give me your view, not just
conformance:

- Does this PR ship as-is, with London expected to alert until FB-61 lands?
- Or does the sweep need to skip a chip with a recorded known-defect verdict, or sample London
  differently, before it goes live?

Consider that Tim is away 27 Sep – 9 Oct and this monitor's whole purpose is to be trustworthy while
nobody is watching it closely. A monitor with one permanently-red city is one nobody reads.

## Also note

The Vercel Blob store was suspended earlier today (Hobby data-transfer cap) and is now Active again.
Seven cities were returning 500s during that window. If you see stale red CI on this branch, that is
why — I have re-triggered it. Judge the PR on its own runs, not on checks from the outage window.

## Deliverable

Post a single pass/fail note as a PR comment on #355 via `gh pr comment 355`, with a clear verdict
line and your answer on the London question. Update `docs/mark-note-prod-sweep.md`. If it passes,
say so unambiguously — this is the monitoring that must be in place before Tim's absence. Do not
merge.
