# Jim brief — London catalog coverage: fix-ups from Mark's QA fail (PR #353)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises changes to
`public/city-directions/uk-london-tfl.json`, `lib/train-times-core.js`
(`LINE_DESTINATION_GROUPS` only), and `qa/` — the same authorisation as the original brief.

tim-review: no — same approval as `docs/jim-brief-london-catalog-coverage.md`, which Tim gave on
8 Sep 2026. This brief only closes out QA findings against that already-approved work.

Lane lock: `node qa/lane-lock.mjs check "United Kingdom"` reported **free** at dispatch (checked by
the top-level session, 10 Sep 2026 01:05 London).

## Context

PR #353 (branch `london-catalog-coverage`, https://github.com/tdrevans-aus/next-train-app/pull/353)
implements `docs/jim-brief-london-catalog-coverage.md`. Mark reviewed it and returned **FAIL**.

**Read both of these before starting:**
- `docs/mark-note-london-catalog-coverage.md` — Mark's full QA note (also posted as a PR comment).
- `docs/jim-brief-london-catalog-coverage.md` — the original brief and its six acceptance criteria.

The bulk of the PR passed: 80 stations / 357 additions with the canonical-vocab derivation verified
programmatically, 0 removals, 24 folds count-verified, no cross-city collisions, all four named
gates green, and `node qa/run-all.mjs --smoke` at 80/80. **Do not rework any of that.** Three
specific items are open.

## Item 1 — self-referential direction at "Hammersmith (H&C Line)" (the blocking defect)

The PR adds `Hammersmith and City Hammersmith` at the station `Hammersmith (H&C Line)` — a
direction pointing back at the station itself. Mark's diagnosis: the derivation's self-match
compares against the plain station name and doesn't strip the `(H&C Line)` parenthetical
disambiguator. The sibling stations `(Dist&Pic Line)`, `(Circle Line)` and `(Bakerloo)` are all
correct, so the suffix-stripping evidently handles those forms and misses this one.

Fix the derivation rule, not just this one row. Then re-derive and confirm no *other* station in the
catalog gained a self-referential direction — a station whose offered list contains a direction
naming itself, under any disambiguator form. That check belongs in the gate (see Item 3), because it
is the same defect class the PR exists to eliminate.

## Item 2 — correct the PR description's `bundle-freshness` claim

The description reports `qa/bundle-freshness.mjs` as a pre-existing, unrelated failure with
`public/train-times-bundle.js` stale against `web-sources/train-times-client.mjs`. Mark refuted
this: the gate passes cleanly on this branch **and** on master. The branch's own two commits show
the staleness was self-introduced (core.js changed, bundle not rebuilt) and fixed by the second
commit; the description text was simply never updated.

Edit the PR description to say that accurately. Do not leave a refuted claim standing in the record
of a merged PR — the next person reading it will chase a failure that does not exist.

## Item 3 — prove acceptance criterion 2 live, during service hours

Criterion 2 ("each added direction returns trips at a time that line is running") is still unproven.
Both attempts landed in the Underground's scheduled overnight closure: the original dispatch at
01:20 London, and Mark's QA, which recorded `TfL /Line/piccadilly/Status` as `Service Closed`
(00:17:43Z–04:03:08Z). Mark's live probe returned 0 trips at all nine changed stations — but also 0
for pre-existing, unrelated directions at the same stations, which is what identifies it as a
closure artefact rather than a defect.

**Do this run inside London service hours (roughly 05:30–23:30 London).** If you start outside that
window, wait for it rather than reporting another closed-network result — a third unproven run is
worse than a late one. Do not use a sleep or poll loop to wait; if the window is far off, say so in
your PR comment and stop, and the top-level session will re-dispatch.

Cover all nine stations in the PR's table (Acton Town, Liverpool Street, Embankment, Farringdon,
Tottenham Court Road, Bond Street, Paddington, Canary Wharf, Gloucester Road). For each added
direction, report whether live trips matched. Add the fold-collision and self-reference assertions
to `qa/uk-london-tfl-direction-match.mjs`, extend it, do not write a parallel script.

Where a direction legitimately returns nothing because that line genuinely is not running at your
sample time, say so explicitly and distinguish it from a match failure. Positive evidence only, as
the original brief requires: absence of observation is never evidence of absence, and nothing here
may be used to remove a direction.

## Acceptance criteria

1. No station in `public/city-directions/uk-london-tfl.json` offers a direction naming itself, under
   any disambiguator form. The derivation rule is fixed, not the single row patched.
2. `qa/uk-london-tfl-direction-match.mjs` asserts the above across the whole catalog and still
   carries the fold-collision guard.
3. A live run inside London service hours reports per-direction results for all nine table stations.
4. The PR description no longer contains the refuted `bundle-freshness` claim.
5. Everything Mark passed stays passing: `node qa/uk-london-tfl-direction-match.mjs`,
   `node qa/uk-region-catalog-conformance.mjs`, `node qa/london-catalog-no-duplicate-stops.mjs`,
   `node qa/london-picker-no-duplicate-stops.mjs`, and `node qa/run-all.mjs --smoke` with an
   explicit `timeout: 600000`. Do not run the full untiered suite.

## Handoff

Work on the existing branch `london-catalog-coverage` and push to it — this updates PR #353 in
place. Do not open a second PR and do not merge. Copy this brief into the branch alongside the
original; both are untracked on master by design. Leave a PR comment summarising what you changed
and your live-run results, so Mark's re-review starts from it.
