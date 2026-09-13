# Jim brief — UK National Rail station fill, phase 2a (fill every remaining existing region)

**Lane:** bug-fix / product mode, same authority as `docs/jim-brief-uk-station-fill-phase1.md`
(Tim's rule, 13 Sep 2026: any station reachable through an API is in scope, UK-wide).
`tim-review: no`.
**Lane lock:** UK. `node qa/lane-lock.mjs check united-kingdom`, then
`acquire united-kingdom station-fill-phase2a jim <branch>` before touching `lib/cities/`.
**Prerequisite:** phase 1 has merged to master. Start from current master, and read
`docs/uk-station-fill/{source,assignment,unverified}.md` that phase 1 wrote — reuse its source,
its probe method and its file conventions rather than inventing new ones.

## Scope

Every UK region **other than** the four phase 1 handled (edinburgh, glasgow, rest-of-scotland,
east-midlands) and other than `uk-london-tfl` (TfL, not Darwin):

uk-west-midlands, south-yorkshire, north-east, west-of-england, southwest, cumbria, south-wales,
west-yorkshire, rest-of-wales, london-se-national-rail, solent, thames-valley,
greater-manchester, liverpool-city-region, greater-anglia.

For each, add every Darwin-verified National Rail station that falls inside the region's
territory. Territory = the region's own pack (`docs/<region>-d1/`) and registry note, then
`docs/united-kingdom-ledger.md` section 2 for named boundary stations, then geography for the
rest (county / combined-authority area the region is named for). Wales: every Welsh station not
in south-wales goes to rest-of-wales, so Wales ends fully assigned. **England will not end fully
assigned** — that is expected. Any English station that no existing region's territory clearly
covers goes on the list for phase 2b, not into a stretched region. Do not widen a region beyond
its name to absorb stragglers (Tim rejected "stretch the regions"; a "Rest of England" region
follows in phase 2b).

Second modes (West Midlands Metro, Metrolink, Supertram, Tyne and Wear Metro, NET) are untouched.

## Deliverables

Same per-region change set as phase 1: `lib/cities/<region>/stations.json` entries with
`crsVerified: true` and `crsSource`, updated
`coverage.json` station sentence, updated `qa/<region>-dogfood-gate.mjs` counts plus a probe of
two or three newly added stations per region. Existing hub, doNotGroup, `includeOperators` /
`excludeOperators` and sleeper entries stay exactly as they are; do not add operator filtering to
new stations.

Append to the phase 1 docs (don't replace): `docs/uk-station-fill/assignment.md` gets a section
per region with the rule applied and borderline calls; `unverified.md` gets every excluded CRS
with the reason. **New file** `docs/uk-station-fill/unassigned-england.md`: every verified
English station left without a region after this phase, one per line as
`CRS | name | lat | lng | nearest existing region | why not there`. Phase 2b reads this file.

## Acceptance criteria

1. Every station in the source dataset with `constituentCountry` wales is in south-wales or
   rest-of-wales, or listed in `unverified.md`.
2. Every English station is in exactly one region's catalog, or in `unassigned-england.md`, or in
   `unverified.md` — no station in two places, no station in none. Add a small script
   `qa/uk-station-fill-audit.mjs` that proves this from the dataset plus the catalogs and the two
   lists, and register it in the smoke tier.
3. All fifteen regions' dogfood gates pass; `node qa/run-all.mjs --smoke` passes.
4. No changes outside those regions' `lib/cities/`, `qa/` gates and the
   `docs/uk-station-fill/` files. `lib/providers/` untouched.

## Process

Worktree; copy this brief in; commit, push; PR "UK station fill phase 2a: fill remaining
regions" linking this brief with a per-region before/after table and the size of
`unassigned-england.md`. If the work is too large for one session, stop at a clean region
boundary, open the PR for what's done, and state exactly which regions remain in the PR body.
Leave no background sleep/poll loops running.
