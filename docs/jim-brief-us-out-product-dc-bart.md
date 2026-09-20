# Jim brief — record Tim's `out-product` rulings for DC and BART

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). `tim-review: no` — this brief *is*
Tim's decision, given in chat on 20 Sep 2026: "out-product for v1 on both DC and BART."
Written by the controller session. Copy this file into your worktree and include it in your PR
(it is untracked in the main checkout on purpose).

## The ruling (board-eligibility-rule.md §3: `out-product` needs the reason and Tim's sign-off recorded)

| City | Service | At | Verdict | Reason (Tim, 20 Sep 2026) |
|---|---|---|---|---|
| washington | MARC (Penn, Brunswick, Camden) | the shared in-catalog stations the oracle report lists | `out-product` | v1 ships on WMATA's own prediction API only; MARC needs a separate agency real-time feed and provider relationship that is not justified before launch. Revisit post-launch. |
| washington | VRE (Fredericksburg, Manassas) | the shared in-catalog stations the oracle report lists | `out-product` | Same reason; VRE is also peak-direction weekday-only. Revisit post-launch. |
| bart | Caltrain | Millbrae | `out-product` | v1 ships on BART's own ETD API only; Caltrain needs a separate feed (511.org). Revisit post-launch. |
| bart | Capitol Corridor (Amtrak) | Richmond, Coliseum | `out-product` | Same reason; needs Amtrak's feed, whose availability and terms the US ledger records as unverified. Revisit post-launch. |

These pass both walk-up tests; they are excluded by an explicit, recorded product decision — not
silently, and not as `out-mode`. Everything else in both packs is unchanged (Amtrak Northeast
Regional/Acela/long-distance `out-reservation`; Muni Metro and VTA light rail `out-mode`).

## Deliver

1. **Docs.** In `docs/washington-d1/oracle-clash-report.md` and `docs/bart-d1/oracle-clash-report.md`
   update the Board eligibility tables: the four rows above become `out-product` with the reason
   and "Tim, 20 Sep 2026". No `undecided` row may remain in either report. Edit those rows and the
   controller notes that referred to the pending decision; leave every other line of the reports
   untouched (do not retype the files). Update both `jim-handoff.md` files (the "holds the flip"
   paragraphs become "resolved — `out-product`, Tim 20 Sep 2026"). Add a "Tim's rulings" section
   to `docs/united-states-ledger.md` with the table above, so the verdicts are recorded once at
   country level.
2. **Registry notes.** `lib/providers/registry.js` — washington and bart `notes`: replace the
   "in, not wired, holds the flip" wording with the `out-product` verdicts and one-line reason
   (rule §4 makes this mandatory for `out-product` cuts).
3. **Adapter comments.** `lib/providers/washington.js` / `lib/providers/bart.js` header comments:
   same correction. No behaviour change — both adapters already only call their own agency API.
4. **Gates.** `qa/washington-dogfood-gate.mjs` currently asserts the pack records MARC/VRE as
   in-but-not-wired; change it to assert `out-product` with Tim's sign-off recorded and no
   `undecided` row. Do the equivalent in `qa/bart-planned-gate.mjs` for Caltrain / Capitol
   Corridor.
5. **Rider-facing coverage notes.** Add `lib/cities/washington/coverage.json` and
   `lib/cities/bart/coverage.json` if they do not exist (Mark had to author these during the
   Boston and Brussels flips because `qa/coverage-notes-gate.mjs` requires them for live cities —
   follow `lib/cities/boston/coverage.json`'s shape). "Not covered" must list MARC and VRE (DC),
   Caltrain and Capitol Corridor (BART) in plain rider language, e.g. "Not shown yet." Keep the
   copy factual and short; it is user-facing.
6. **Tracker.** `docs/expansion-tracker/cities.csv`, touch only these two rows: Washington
   Waiting on → `Mark QA / flip`; BART Waiting on → `BART key (Tim) → live verification → Mark QA`.
7. Both cities stay `status: "planned"`. Do not flip. Add neither to any live list.

## Acceptance
- No `undecided` rows and no "holds the flip pending Tim" text remain for DC or BART anywhere in
  `docs/`, `lib/` or `qa/` (grep-proved in the PR description).
- `node qa/washington-dogfood-gate.mjs`, `node qa/bart-planned-gate.mjs`,
  `node qa/coverage-notes-gate.mjs`, `node qa/live-city-lists-sync.mjs`, and
  `node qa/run-all.mjs --smoke` all pass.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check united-states`, then
  `acquire united-states us-out-product jim <branch>`.
- Branch from up-to-date `origin/master`.
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read. Foreground
  commands with explicit timeouts only — no background processes, sleeps or poll loops.
- Commit, push, open a PR that links this brief. Do not merge.
