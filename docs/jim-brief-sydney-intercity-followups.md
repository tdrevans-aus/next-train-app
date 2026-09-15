# Jim brief — Sydney intercity follow-ups (from Mark's #394 note)

**Lane:** bug-fix / product mode. `tim-review: no`. **Lane lock:** Australia
(`node qa/lane-lock.mjs check australia`, then `acquire australia sydney jim <branch>` — this
touches `lib/cities/sydney/`). Leave no background loops, pollers or dev servers.

PR #394 (merged 15 Sep 2026, commit a337671) added 99 intercity stations to Sydney. Mark's
review (https://github.com/tdrevans-aus/next-train-app/pull/394#issuecomment-5677027342)
passed it with two non-blocking flags and one pre-existing gap. Do all three:

1. **Register `qa/sydney-line-map-conformance.mjs` in the smoke tier** of `qa/run-all.mjs`
   (every other city's line-map gate is there; Sydney's was never registered). Confirm it
   passes inside a full `--smoke` run, not just standalone.
2. **Newcastle Interchange coordinates.** The catalog entry in `lib/cities/sydney/stations.json`
   is about 2.2 km from the GTFS stop's coordinates. Replace lat/lng with the feed's
   parent-station coordinates and check every other station added by #394 the same way
   (script it: compare catalog lat/lng to the nswtrains/sydneytrains stop coordinates by stop
   id, list any more than 300 m apart, fix them all from the feed). Coordinates drive Near me
   and the picker's "Near you" distances, so this is rider-visible.
3. **Direction-model memo.** Add `docs/sydney-d1/direction-model-memo.md` covering the five
   intercity lines (BMT, CCN, SCO, SHL, HUN) and citing the TfNSW network map used for chip
   wording, so Sydney matches every other city's pack shape. Move the inline citation out of
   `published-network.json` only if it duplicates; otherwise leave it and cross-reference.

## Acceptance criteria

1. `node qa/run-all.mjs --smoke` green (foreground, 600000 ms timeout) with the line-map gate
   listed in its PASS output.
2. A coordinate audit table in the PR body: station, catalog vs feed distance before, after.
   No station added by #394 more than 300 m from its feed stop afterwards.
3. `qa/sydney-dogfood-gate.mjs` and `qa/uk-catalog-coords-gate.mjs`'s Sydney equivalent (if
   one exists; otherwise add a coordinate-distance assertion to the Sydney dogfood gate) pass.

## Process

Worktree from current master; copy this brief in; commit, push; PR "Sydney: register line-map
gate, fix intercity coordinates, add direction-model memo".
