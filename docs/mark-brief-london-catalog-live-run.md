# Mark brief — PR #353 live verification (London catalog coverage, criterion 2)

**Lane: QA (flag only).** Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/353, branch
  `london-catalog-coverage`, at commit `51772dc`.
- `docs/mark-note-london-catalog-coverage.md` — your own earlier FAIL note and its findings.
- `docs/jim-brief-london-catalog-coverage.md` — the original brief and its six acceptance criteria.
- `docs/jim-brief-london-catalog-coverage-fixups.md` — the fix-up brief Jim worked to.

## Why this is the last item

This PR adds 357 directions across 80 London stations. You verified the derivation programmatically,
confirmed no removals, no long tail, folds correct, and `train-times-core.js` confined to
`LINE_DESTINATION_GROUPS`. Everything structural passed.

**Acceptance criterion 2 has never been proven.** It requires that each added direction returns
trips at a time that line is running. Three attempts have all landed outside service hours — Jim's
original dispatch at 01:20 London, your QA (which recorded `Service Closed`, 00:17:43Z–04:03:08Z),
and Jim's fix-up pass at 01:12. All three returned zero trips everywhere, which was the closure, not
a defect.

**It is now around 12:54 London — mid-service.** This is the window. Take the live run.

## The live run

Cover all nine stations from the PR's table: Acton Town, Liverpool Street, Embankment, Farringdon,
Tottenham Court Road, Bond Street, Paddington, Canary Wharf, Gloucester Road.

For each added direction at those stations, report whether live trips matched. Where a direction
legitimately returns nothing because that particular line or branch is not running right now, say so
explicitly and distinguish it from a match failure — positive evidence only, and nothing here may be
used to remove a direction.

Criterion 1 is Acton Town specifically: it must offer Piccadilly directions and they must populate
with live trips. That was the defect that started the whole workstream.

## Also confirm the fix-ups landed

- **The Hammersmith fix.** `Hammersmith and City Hammersmith` is gone from `Hammersmith (H&C Line)`,
  and the fix is in the derivation rule rather than the single row.
- **The whole-catalog self-reference assertion** in `qa/uk-london-tfl-direction-match.mjs` — 434
  stations, using `stationBaseName` to strip `(...)` disambiguators. Confirm it would catch a new
  instance under any disambiguator form.
- **A tension you need to resolve explicitly.** The original brief's criterion 5 says "No direction
  is removed." The fix-up removed two: `Hammersmith and City Hammersmith` and `Mildmay Richmond` (a
  pre-existing instance Jim found with the new rule, outside the original PR's diff). I judged both
  correct — they are self-referential nonsense, not evidence-based removals, and the fix-up brief's
  criterion 1 required them. Confirm that reading, and confirm no *other* direction was removed.
  Jim flagged the `Richmond (London)` one as an out-of-original-scope call that could be reverted if
  disagreed with; say whether you would keep it.
- The PR description no longer carries the refuted `bundle-freshness` claim.

## Also verify

- `node qa/uk-london-tfl-direction-match.mjs`, `node qa/uk-region-catalog-conformance.mjs`,
  `node qa/london-catalog-no-duplicate-stops.mjs`, `node qa/london-picker-no-duplicate-stops.mjs`.
- `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
  suite.
- Criterion 6: no regression to the merged fixes (`26eccfb`, `d91e122`, `e987d9e`, `a511c69`) —
  spot-check Barking Riverside, Gospel Oak, Cheshunt, Abbey Road, Tottenham Court Road.

## One thing you will probably see

Abbey Road offers `DLR Bank`, which can never return a trip — Abbey Road is on the Stratford
International – Woolwich Arsenal branch. That is FB-61, a known separate defect, **not** something
this PR introduced or should fix. Note it if you see it and move on.

## Deliverable

Post a single pass/fail note as a PR comment on #353 via `gh pr comment 353`, with criterion 2's
per-station live results in full, your verdict on the two removals, and a clear verdict line. Update
`docs/mark-note-london-catalog-coverage.md`. If it passes, say so unambiguously — this PR is
otherwise ready and has been waiting on this single check all session. Do not merge.
