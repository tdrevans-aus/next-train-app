# Mark brief — QA review of PR #355 (FB-64 production sweep)

**Lane: QA (flag only).** Investigate and report. Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/355, branch
  `prod-sweep-scheduled-check`. Check it out with `gh pr checkout 355`.
- `docs/jim-brief-prod-sweep.md` — the brief Jim worked to, with the seven acceptance criteria.

## What it does

Adds `qa/prod-sweep.mjs`, which samples every `status: "live"` city in `lib/providers/registry.js`
against production (`/api/directions` then `/api/next-train`), classifying each as ok / empty /
error / skipped-outside-service-hours using the city's `timeZone`. Plus
`.github/workflows/prod-sweep.yml` (hourly cron + `workflow_dispatch`), a committed state file
`qa/prod-sweep-state.json` tracking consecutive failures, a `sweep:prod` npm script, and corrections
to `docs/go-live-ops.md`.

This exists because the app is about to go public with 33 live cities and only Perth monitored, and
Tim is away 27 Sep – 9 Oct. Its first real run already caught a genuine production outage
(Newcastle, HTTP 500), which is being fixed separately under
`docs/jim-brief-newcastle-stale-snapshot.md` — **not** part of this review.

## The design choices that need your judgement

**1. The workflow commits state back to the repo.** `prod-sweep.yml` writes
`qa/prod-sweep-state.json` and commits it with `[skip ci]`. Run hourly, that is up to 24 commits a
day on master forever. Assess honestly: does `[skip ci]` reliably prevent CI churn here; can two
runs race or conflict; what happens when this collides with an in-flight PR merge or the
`flip-automerge` workflow; and is repo-committed state the right mechanism at all versus the
Actions cache or re-deriving from run history? The brief allowed any of the three but required the
choice to be justified — say whether the justification holds. If you think the churn is
unacceptable, say so plainly with your reasoning; this is the item most likely to be regretted
later.

**2. Sampling strategy — the Brisbane artifact.** The sweep samples 1–2 stations per city and takes
each station's first direction chip. For Brisbane that lands on Albion→Doomben and
Alderley→Beenleigh, both low-frequency branches, producing a false `empty` that crossed the alert
threshold on all three runs. Jim documented this rather than hiding it, which was right. Your call:
is a monitor that cries wolf on Brisbane every hour fit to ship? Consider whether sampling should
prefer a city's hub/busiest station (the `direction-hubs.json` data already exists for UK regions,
and most cities have a hub-lock station recorded from their D1 pack). A false positive every hour on
one city trains everyone to ignore the alarm — the exact failure the brief was trying to prevent.

**3. Service-hours logic, including DST.** Verify the windows are evaluated in each city's own
`timeZone` and behave correctly across a DST boundary — several cities are near one (Australia
switches in early October, while Tim is away; Europe in late October). A sweep that thinks a city is
closed for an hour when it is open, or vice versa, is a silent gap. Check specifically that
`skipped` and `ok` cannot collapse into the same reported state.

**4. Alert threshold.** Confirm a single failing run does not fail the workflow and that N
consecutive in-service failures does. State the N Jim chose and whether it is sensible for an
hourly cadence given Tim's nine-day absence.

## Also verify

- Live-city list is derived from `registry.js`, so flipping or retiring a city changes coverage
  with no other edit. Test that claim — do not just read it.
- The workflow does not run on `push` or `pull_request`, is not a required check, and
  `prod-sweep.mjs` is excluded from `qa/run-all.mjs` at **every** tier including the untiered full
  glob (Jim used `RUNNER_EXCLUDE`).
- It needs no agency API keys and does not read `.env.local`; no secret is echoed, logged or
  committed. Check the workflow file and the script for anything that could print a token.
- Load: hourly × 33 cities × 1–2 stations against production and upstream agencies. Is that
  proportionate, and does it risk rate-limiting any agency? Recall that late-suite 429
  contamination has bitten this repo before.
- `docs/go-live-ops.md`'s stale Brisbane/Sydney "do not monitor" note is actually corrected, and the
  new sweep documentation matches what the code does.
- Run `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
  suite. `malmo-dogfood-gate.mjs` and `uppsala-dogfood-gate.mjs` currently flake in batch runs with
  Sweden `ECONNRESET` and pass in isolation — known and unrelated.
- Run `node qa/prod-sweep.mjs` yourself once and confirm its output matches what the PR claims.

## Out of scope

The Newcastle outage itself. FB-61/FB-63. Any change to the alerting destination (email/Slack
routing is Tim's to configure).

## Deliverable

Post a single pass/fail note as a PR comment on #355 via `gh pr comment 355`, with the seven
acceptance criteria checked one by one, your verdict on the four judgement items, and a clear
verdict line. Write the same note to `docs/mark-note-prod-sweep.md` so it can be handed to a
follow-up Jim if you fail it. Do not open a fix PR and do not merge.
