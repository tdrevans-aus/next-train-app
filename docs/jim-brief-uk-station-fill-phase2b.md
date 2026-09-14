# Jim brief — UK National Rail station fill, phase 2b (new "Rest of England" region)

**Lane:** expansion-style wiring under the bug-fix / product authority of the phase 1 and 2a
briefs (Tim's rule, 13 Sep 2026). `tim-review: no` for the wiring PR; the live flip follows the
normal flip-PR route (Mark opens it, `flip` label).
**Lane lock:** UK. `check united-kingdom`, then `acquire united-kingdom rest-of-england jim
<branch>` before touching `lib/providers/` or `lib/cities/`.
**Prerequisite:** phase 2a has merged. Input is `docs/uk-station-fill/unassigned-england.md`.

## Why a new region

Tim rejected stretching existing regions to absorb stragglers. With the country-wide picker
(`docs/jim-brief-country-wide-station-picker.md`) riders search the whole country and never
choose a region, so "Rest of England" is an internal home, not something a rider has to find.
It is a sibling of `rest-of-wales` and `rest-of-scotland` and follows their shape exactly.

## Build

1. `lib/providers/rest-of-england.js`: region config over the shared `uk-darwin.js` provider,
   copied from `rest-of-wales.js`'s pattern (allow-list + destination+operator direction model,
   no fork, no hub lock). `excludeOperators` only where the ledger already records a verdict for
   a station in this list (Caledonian Sleeper at its English calling points other than those
   already owned, e.g. Crewe/Preston/Watford Junction if they land here; Night Riviera only where
   the Southwest pack didn't already claim the station). Record every such choice in the
   registry note.
2. `lib/cities/rest-of-england/stations.json` from `unassigned-england.md` (UK regions have no `public/city-catalogs` copy — they load `lib/cities` directly), every entry
   `crsVerified: true` (they already were in 2a; keep the `crsSource`). `coverage.json` in the
   same shape as rest-of-wales.
3. `lib/providers/registry.js` entry with `status: "planned"`, displayName **"Rest of England"**,
   country UK, agency National Rail (Darwin). Do **not** set live.
4. `qa/rest-of-england-dogfood-gate.mjs` registered in `qa/run-all.mjs` (smoke tier), modelled
   on `rest-of-wales-dogfood-gate.mjs`: catalog/copy conformance, count assertion, live probe of
   five stations spread across the country.
5. `public/city-session.js` region bounding boxes: add a box only if the existing "first match
   wins" ordering means Near me can't otherwise reach these stations; check how rest-of-wales
   handled it and match. If a box is needed, it goes **last** so every specific region wins.
6. `live-city-api.js` dispatch cases wired as for any planned region; not in the live lists
   (that's the flip commit, enforced by `qa/live-city-lists-sync.mjs`).
7. Update `docs/uk-station-fill/assignment.md` and `docs/united-kingdom-ledger.md` section 2
   with a "Rest of England" row: owns exactly what `unassigned-england.md` listed, claims no
   boundary station from another region.

## Acceptance criteria

1. Every station in `unassigned-england.md` is in the new catalog; `qa/uk-station-fill-audit.mjs`
   (from 2a) still passes with the new region counted, and reports zero unassigned English
   stations.
2. New gate passes; `node qa/run-all.mjs --smoke` passes.
3. Registry status is `planned`; live lists untouched.

## Process

Worktree; copy this brief in; commit, push; PR "Rest of England: planned region for the
remaining Darwin stations" linking this brief. Mark then runs his checklist and, if green, opens
the flip PR. Leave no background sleep/poll loops running.

## Addendum (14 Sep 2026) — nine stations held back in phase 2a

Phase 2a (PR #384) held back nine National Rail stations because a second-mode stop of the
same name is referenced in that region's direction-model file: Altrincham, Eccles, Manchester
Airport, Rochdale (greater-manchester, Metrolink) and Brockley Whins, East Boldon, Heworth,
Manors, Seaburn (north-east, Tyne and Wear Metro). These are real, busy Darwin stations and are
in scope under Tim's rule. They are **not** Rest of England stations; they belong to their own
regions. Add them to `greater-manchester` and `north-east` in this PR as `mode: "train"`
entries with an explicit `doNotGroup` against the same-name Metro/Metrolink stop, following the
Edinburgh Gateway / Partick pattern from phase 1 (`DO_NOT_GROUP_PAIRS` in the region's
directions file). This is the one permitted touch of a second-mode directions file in this
brief; the Metro/Metrolink entries themselves stay unchanged.

## Addendum (14 Sep 2026) — tidy-ups carried from Mark's #384 note

Phase 2a merged as commit 7fed08c. Mark flagged two non-blocking items to fold in here:
(1) several dogfood gates' closing success messages still print stale station counts (the
asserts are right; fix the strings); (2) the 20 name-variant candidates phase 2a "manually
accepted" are not itemised in `docs/uk-station-fill/unverified.md` — list each with the
dataset name, the Darwin name, and the CRS. Both are small; do them in this PR.
`unassigned-england.md` has 461 lines on master; read it from there, not from this brief.
