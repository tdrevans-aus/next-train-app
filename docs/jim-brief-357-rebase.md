# Jim brief — rebase PR #357 onto master after #356 and #364

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises the files PR #357 already
touches plus `qa/run-all.mjs` conflict resolution. Lane lock: not required — QA/fixtures only.

tim-review: no — #357 is Mark-approved (PASS on 10 Sep) and this is a mechanical rebase.

## Context

PR #357 (`blob-transfer-reduction`) stops the dogfood gates and CI pulling GTFS zips from the blob
store. It is Mark-approved but now reports `CONFLICTING` against master (`74f67fb`); GitHub's
update-branch refuses with "merge conflict between base and head".

Three things merged since it was written, all touching the same files:

- **#356** (`74f67fb`) — adds `KNOWN_TRACKED_EXIT_CODES` / `classifyResult` to `qa/run-all.mjs`,
  registers `gtfs-live-blob-snapshot-integrity.mjs` and `gtfs-refresh-retired-city-skip-gate.mjs`,
  and **deletes** `scripts/gtfs-refresh-large-feeds.mjs`.
- **#361** (`9b09833`) — registers `lib-bare-import-gate.mjs` in `qa/run-all.mjs`.
- **#364** (`950e9d0`) — rewires `brussels-planned-gate.mjs` to an offline fixture.

Mark's #357 review explicitly warned: "PR #356 also adds a `KNOWN_TRACKED_EXIT_CODES`/`classifyResult`
mechanism to `qa/run-all.mjs` that #357 doesn't have — the merge-order resolution needs to carry that
over too, not just the `SMOKE_SCRIPTS` placement."

## Resolution rules

- **`qa/run-all.mjs`**: keep **everything** master has (all three new gate registrations, the
  `KNOWN_TRACKED_EXIT_CODES` block, `classifyResult`), and apply #357's change on top: its
  `gtfs-live-blob-snapshot-integrity.mjs` placement in `OFFLINE_EXTRA_SCRIPTS` rather than
  `SMOKE_SCRIPTS`. Note #356 registered that gate in the smoke tier; #357's whole point is that it
  must **not** run per-PR (it fetches ~100 MB of zips). #357's placement wins. Every script name
  must appear exactly once per list — check for duplicates by construction.
- **`qa/gtfs-live-blob-snapshot-integrity.mjs`**: #357 copied an older version from #356's branch.
  Master's version (derived city list, fail-closed synthetic check, exit-2 known-tracked path) is
  newer and correct — **take master's file verbatim**, drop #357's copy.
- **`scripts/gtfs-refresh-large-feeds.mjs`**: deleted on master. Stays deleted.
- Everything else in #357 (the seven dogfood-gate fixture rewires, `qa/lib/local-gtfs-snapshot.mjs`,
  `qa/fixtures/gtfs-snapshots/`, `scripts/extract-gtfs-calendar-fixture.mjs`,
  `qa/gtfs-local-snapshot-fixture-freshness.mjs`, `docs/go-live-ops.md` edits) applies cleanly and
  is unchanged in intent.

## Also do, since the store is Active now

Mark's non-blocking finding on #357: the five Australian fixtures (`sydney`, `brisbane`, `canberra`,
`gold-coast`, `newcastle`) were **hand-authored** because the blob store was suspended when he
reviewed. It is Active again and Newcastle's blob is real (954 trips, `Newcastle Light Rail`). Run
`scripts/extract-gtfs-calendar-fixture.mjs` against the real published snapshots for those five and
replace the hand-authored fixtures, so the gates check against real calendar shapes. This is a
one-off fetch (~5 files), not a CI pattern — do it locally, commit the resulting small fixtures.
If a city's real snapshot is unavailable, keep its hand-authored fixture and say so.

## Acceptance criteria

1. Branch rebases/merges cleanly onto master; `gh pr view 357` reports `MERGEABLE` / `CLEAN`.
2. `qa/run-all.mjs` carries every gate master registers **plus** #357's tier placement for the
   integrity gate, each name exactly once per list; `KNOWN_TRACKED_EXIT_CODES` intact.
3. `qa/gtfs-live-blob-snapshot-integrity.mjs` is byte-identical to master's.
4. The five AU fixtures are regenerated from real snapshots (or explicitly kept with a reason).
5. Criterion 1 of the original brief still holds: `node qa/run-all.mjs --smoke` makes **zero** blob
   fetches — re-prove with a `fetch` spy, since the store being Active means a passing suite no
   longer proves it by itself.
6. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite.

## Handoff

Push to the existing branch `blob-transfer-reduction`, updating PR #357 in place (force-with-lease is
fine after a rebase). Leave a PR comment naming each conflict and its resolution and listing which
fixtures were regenerated. Copy this brief into the branch. Do not merge.
