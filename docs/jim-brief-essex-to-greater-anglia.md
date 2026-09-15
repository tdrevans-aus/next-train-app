# Jim brief — assign the nine Essex stations to greater-anglia

**Lane:** bug-fix / product mode, data. `tim-review: no` (controller decision, Mark concurs).
**Lane lock:** UK — check, then `acquire united-kingdom essex-assignment jim <branch>` before
touching `lib/cities/`. Foreground smoke with explicit 600000 ms timeout; tail output in the
foreground if backgrounded; leave nothing running.

## Decision

PR #399 (merged 15 Sep 2026) left nine Essex stations in `rest-of-england` because both
`greater-anglia` and `london-se-national-rail` claim Essex in their coverage prose: Beaulieu Park,
Burnham-on-Crouch, Chelmsford, Clacton-on-Sea, Harlow Mill, Harlow Town, Hatfield Peverel,
Roydon, Southminster. Decision: **greater-anglia**. Greater Anglia operates every one of them
(Great Eastern main line, Sunshine Coast and Crouch Valley branches, West Anglia line) and that
pack already owns Colchester, Braintree and Witham on the same lines; London & South East
National Rail's Essex claim is only its Liverpool Street terminus group.

## Changes

1. Move the nine entries to `lib/cities/greater-anglia/stations.json` (flat, no hub change;
   note "reassigned from rest-of-england, Essex dual-claim resolved 15 Sep 2026"); update both
   regions' `coverage.json` sentences.
2. Record the resolution in `docs/uk-station-fill/assignment.md` and add one line to
   `docs/united-kingdom-ledger.md` section 2: Essex stations outside London belong to
   greater-anglia; london-se-national-rail's Essex scope is the Liverpool Street group only.
3. Widen `greater-anglia`'s `CITY_BOUNDS` if any of the nine fall outside it; re-run
   `qa/uk-city-bounds-overlap-gate.mjs` and drop the Essex-conflict allow-list entries #399 added.
4. Regenerate `public/city-directions/greater-anglia.json` and `rest-of-england.json`; update
   both dogfood gate counts and `qa/uk-region-catalog-conformance.mjs`.

## Acceptance criteria

1. All nine in greater-anglia, none in rest-of-england; `qa/uk-station-fill-audit.mjs` passes.
2. Touched gates and `node qa/run-all.mjs --smoke` green; a Chelmsford board resolves under
   `city=greater-anglia` on the PR's Vercel preview.

## Process

Worktree from current master; copy this brief in; commit, push; PR "UK stations: Essex nine to
Greater Anglia (resolves #399 dual claim)".
