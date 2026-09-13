# Mark brief — QA review of PR #356 (Newcastle production outage / GTFS blob integrity)

**Lane: QA (flag only).** Investigate and report. Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/356, branch
  `newcastle-stale-snapshot`. Check it out with `gh pr checkout 356`.
- `docs/jim-brief-newcastle-stale-snapshot.md` — the brief Jim worked to, with its six acceptance
  criteria.

## What happened

Newcastle — a **live** city — returns HTTP 500 to riders: `GTFS static snapshot is stale for
"newcastle": only 0/31 realtime trip IDs resolved`. Found by the FB-64 production sweep.

Jim established the root cause as an **ID-scheme mismatch, not staleness**: the production blob at
`gtfs/newcastle.zip` — which `loadNewcastleStatic()` actually reads, not the TfNSW URL in the same
file — contains a synthetic dogfood fixture. I verified this independently by fetching the blob:
2041 bytes, `feed_publisher_name: "next-train newcastle dogfood"`, `feed_version: dogfood`, trips
`nlr-beach-0` / `nlr-int-0`, and a `DAILY` calendar spanning 20260101–20271231. That perpetual
calendar is why the existing calendar-based staleness check never fired.

The data fix itself needs Tim (TfNSW credential + blob republish) and is **not** in this PR. This
review is about whether the code changes are right and whether the blast radius has been correctly
established.

## The four things that need your judgement

**1. Blast radius — is Newcastle really the only one?** This is the most important question in the
review. A live city has been serving synthetic test data in production; the possibility that others
are too is what matters most before launch. Jim's new
`qa/gtfs-live-blob-snapshot-integrity.mjs` reports canberra and brisbane healthy, newcastle red,
and **skips** gold-coast (`skipResolvedShareCheck`, shared multi-mode RT feed) and newcastle's own
resolved-share check (credential not assumed present). Verify the gate genuinely covers every live
blob-backed city — enumerate them from `registry.js` yourself and check none is silently omitted.
Pay attention to the two *skipped* cases: a skip is not a pass, and gold-coast being unverifiable by
this gate is itself a finding worth stating plainly.

**2. Does the new gate actually catch the thing that got through?** The failure slipped past
existing checks because the synthetic feed's calendar always covers today. Confirm the gate detects
synthetic content by publisher/version heuristics *and* consider whether those heuristics are
robust — would a differently-named test fixture still be caught? A gate that only catches the exact
string `next-train` is thin protection.

**3. Deleting `.github/workflows/gtfs-refresh.yml` and `scripts/gtfs-refresh-large-feeds.mjs`.**
Jim removed both, on the grounds they failed daily since 8 Sep on a missing `BLOB_READ_WRITE_TOKEN`
and only ever served Amsterdam/Rotterdam, both retired. Verify that reasoning against the registry
and the retirement commit — is any live city left without a refresh path as a result? He also
dropped retired `vancouver` from `lib/gtfs-refresh.js`'s cron list; check nothing live was dropped
with it.

**4. The publish-script guard.** `scripts/publish-gtfs-fixture-to-blob.mjs` now refuses to publish
a QA fixture over a `status: "live"` city unless `--allow-live`. That is a plausible account of how
test data reached production. Check the guard cannot be trivially bypassed by accident, and that
`--allow-live` is hard enough to reach that nobody does it absent-mindedly.

## Also verify

- Criterion 5 of Jim's brief: he reports brisbane and gold-coast calendars both expire
  **2026-10-28**. Confirm that, and check whether any other live city has a calendar expiring
  within the next two months — Tim is away 27 Sep – 9 Oct and a calendar expiry during that window
  would be an outage nobody is watching.
- The new gate is registered in `qa/run-all.mjs` at the smoke tier and is **expected to be red on
  newcastle** until Tim republishes. Confirm it fails for the right reason and would go green on
  real data. A gate that stays red indefinitely gets ignored — say whether shipping a
  known-red smoke gate is acceptable, or whether it should be conditional until the data is fixed.
  This is a genuine judgement call and I want your view, not a waiver.
- The clarified error message in `lib/providers/gtfs/board.js` for the zero-resolved case.
- `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
  suite. Jim reported 114 PASS / 3 FAIL — the new gate (expected) plus `help-coverage-entry.mjs` and
  `london-nearby-chips.mjs` as dev-server connection-refused flakes. Confirm those two are genuinely
  pre-existing flakes and not caused by this branch.
- Nothing in the PR echoes, logs or commits a credential value.

## Deliverable

Post a single pass/fail note as a PR comment on #356 via `gh pr comment 356`, with the six
acceptance criteria checked one by one, your verdict on the four judgement items, and a clear
verdict line. **State explicitly and prominently what Tim must do himself** — republishing real
Newcastle data and verifying `BLOB_READ_WRITE_TOKEN` in both GitHub Actions secrets and Vercel
project env — since the outage stays live until he does. Write the same note to
`docs/mark-note-newcastle-stale-snapshot.md`. Do not attempt any credential or blob operation
yourself. Do not merge.
