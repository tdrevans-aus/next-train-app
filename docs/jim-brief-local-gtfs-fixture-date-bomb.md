# Jim brief — checked-in GTFS calendar fixtures expire, so required web-qa is red for every PR

tim-review: no (QA fixtures and tooling only; no production or rider-facing change)
Lane: bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Written 21 Nov 2026 by the controller.

## Symptom
The required `web-qa` check fails `--smoke` on every PR, regardless of the diff. PR #541 (a Sydney
fix that Mark confirmed cannot affect these gates) failed with `173 PASS · 3 FAIL`:
- `qa/brisbane-dogfood-gate.mjs` (via `qa/lib/assert-not-stale.mjs:22`)
- `qa/gold-coast-dogfood-gate.mjs` (same)
- `qa/gtfs-local-snapshot-fixture-freshness.mjs`: `brisbane: GTFS snapshot calendar coverage (20260829..20261028) does not include today (20261121)`

Production Brisbane and Gold Coast are fine: Albion → Ferny Grove and Helensvale → Varsity Lakes
both return trips. This is a test-data date bomb, not an outage. Nothing has merged to master since
27 Oct.

## Evidence: calendar end dates in `qa/fixtures/gtfs-snapshots/<city>/calendar.txt`
| city | ends | last commit |
|---|---|---|
| brisbane | 2026-10-28 (expired) | 2026-09-12 |
| gold-coast | 2026-10-28 (expired) | 2026-09-12 |
| sydney | **2026-11-21 (expires tomorrow)** | 2026-09-15 |
| malmo, uppsala | 2026-12-12 | 2026-09-12 |
| newcastle | 2026-12-17 | 2026-09-12 |
| canberra | 2027-07-29 | 2026-09-12 |

These are the calendar-only offline fixtures from `docs/jim-brief-blob-transfer-reduction.md`, item 1.
The extractor is `scripts/extract-gtfs-calendar-fixture.mjs`. Nothing refreshes them on a schedule.

## Required changes
1. Regenerate **all seven** fixtures with `scripts/extract-gtfs-calendar-fixture.mjs` from the
   currently published snapshots or upstream feeds. Do this for all seven, not just the expired
   ones; Sydney expires tomorrow. If a city's upstream needs a key you don't have (malmo/uppsala:
   `TRAFIKLAB_API_KEY`), leave its fixture alone and say so in the PR.
2. Early warning so this can't silently happen again: make
   `qa/gtfs-local-snapshot-fixture-freshness.mjs` print a clearly labelled WARNING (not a failure)
   for any fixture ending within 21 days, naming the city and the command to refresh it. If a
   cheap, non-flaky way exists to make it fail at less than 7 days in a way that names the fix, propose
   it in the PR. Don't implement it without saying so.
3. Do **not** weaken `assertSnapshotNotStaleTodayOrSkip`, skip the gates, or fake calendar dates
   (e.g. editing end dates by hand). Fixtures must come from real data via the extractor.

## Acceptance criteria
- `node qa/gtfs-local-snapshot-fixture-freshness.mjs`, `node qa/brisbane-dogfood-gate.mjs` and
  `node qa/gold-coast-dogfood-gate.mjs` pass, along with the Sydney gate.
- The freshness script prints the 21-day warning for a fixture you temporarily set to end soon
  (show the output in the PR). Mark will mutation-check the warning.
- `node qa/run-all.mjs --smoke` passes, apart from any failure you can show also fails on master for
  an unrelated reason (list it with evidence).
- PR #541 (`fix/sydney-fixture-expired`) is unaffected. Don't touch its files: `scripts/refresh-hand-published-gtfs.mjs`,
  `.github/workflows/refresh-hand-published-gtfs.yml`, `lib/cities/sydney/`,
  `qa/hand-published-snapshot-coverage-gate.mjs`.

## Process
Worktree, branch `fix/local-gtfs-fixture-date-bomb`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-local-gtfs-fixture-date-bomb.md` (untracked in the
main checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it.
Note for `docs/jim-brief-qa-nightly-red-since-sep.md`: once this merges, the dogfood-gate and
fixture-freshness failures in nightly are covered by this brief.
