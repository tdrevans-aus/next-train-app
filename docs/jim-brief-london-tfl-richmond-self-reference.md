# Jim brief — London TfL marketing directions: self-reference guard misses "Richmond (London)"

**Lane:** bug-fix / product mode. `tim-review: no`. **Lane lock:** UK (touches
`lib/cities/uk-london-tfl/`): `node qa/lane-lock.mjs check united-kingdom` then
`acquire united-kingdom uk-london-tfl jim <branch>`. Leave no background loops or servers.

## Symptom (found by PR #393, 14 Sep 2026)

Regenerating `public/city-directions/uk-london-tfl.json` with `scripts/write-city-directions.mjs`
produces chips that fail `qa/bundled-city-directions.mjs`, because
`lib/cities/uk-london-tfl/marketing-directions.js` guards against a station being offered a
chip "towards itself" by exact string equality between terminus and station name, and the
catalog's disambiguated stop `"Richmond (London)"` never equals the terminus string
`"Richmond"`. So Richmond gets a "towards Richmond" chip. The committed bundle predates the
disambiguation and hides the bug; #393 reverted the regenerated file to keep the bundle green.

## Fix

1. Make the self-reference guard compare canonical station identity (stop id / naptan id, or
   the same name-normalising helper the catalog lookup uses) rather than raw display strings.
   Check the other UK region `marketing-directions.js` files for the same exact-string guard
   and fix any that share it, listing each in the PR.
2. Regenerate `public/city-directions/uk-london-tfl.json` (and any other region touched in 1)
   with the writer and commit the result.
3. Add a case to `qa/bundled-city-directions.mjs` (or the TfL dogfood gate) asserting no
   station's chip set contains its own name, using the normalised comparison.

## Acceptance criteria

1. `node qa/bundled-city-directions.mjs` passes with a freshly regenerated TfL file (prove by
   deleting the file, regenerating, and running the gate).
2. `node qa/uk-london-tfl-dogfood-gate.mjs` (or the equivalent) passes; `--smoke` green
   (foreground, 600000 ms timeout).
3. Richmond (London)'s board shows no "towards Richmond" chip on the PR's Vercel preview.

## Process

Worktree from master after #393 merges; copy this brief in; commit, push; PR "London TfL:
canonical self-reference guard in marketing directions (regenerated bundle)".
