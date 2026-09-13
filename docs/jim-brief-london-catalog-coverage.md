# Jim brief — London: whole lines missing from the direction catalog

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises changes to
`public/city-directions/uk-london-tfl.json`, `lib/train-times-core.js`
(`LINE_DESTINATION_GROUPS` only), and `qa/`.

tim-review: no — Tim approved this approach on 8 Sep 2026, explicitly choosing a full-day sample
and a rule-derived catalog over hand-patching.

## Symptom

Major interchanges do not offer lines they are served by. A rider at Acton Town — a Piccadilly
interchange — is offered four District directions and **no Piccadilly option at all**. Same class as
the report that started this workstream: a train runs through the station and cannot be selected.

Worst affected (missing direction count, from a 16-sample day):

```
Liverpool Street 18 | Embankment 16 | Farringdon 16 | Tottenham Court Road 16
Bond Street 15 | Paddington 15 | Canary Wharf 13 | Gloucester Road 12
```

## Evidence

`docs/london-catalog-gaps.json`, generated from 16 probe samples across 13:55-23:33 London on
8 Sep 2026 (566 requests each, zero 429s). Samples retained in `docs/london-catalog-samples/`.

**Criterion — read this before using the file.** A direction counts as missing only if it was
observed *running live* in at least one sample and is not offered. Positive evidence only: absence
of observation is never treated as evidence of absence. Counts are therefore a **lower bound**.

**Nothing in this data may be used to REMOVE a direction.** The probe's topology derivation
under-produces badly (mean ~1.3 directions/station against ~4.1 actually offered; Oxford Circus
derived as one direction despite serving three lines) and refuted itself on hundreds of rows. The
removal question is out of scope — do not act on it, in either direction.

## Three classes, three different treatments

**Class A — `classA_lineEntirelyAbsent` (457 rows, 80 stations).** The station is served by a line
the catalog does not offer there at all. This is the real coverage gap and the point of this PR.

Do **not** add every observed destination. Add the **canonical direction strings the catalog
already uses for that line at other stations** — e.g. Elizabeth's existing vocabulary as used at
Tottenham Court Road — so the picker stays consistent and short workings like
`Elizabeth Gidea Park` never become options. Derive that vocabulary from the catalog itself, not
from a hand-written list.

Prefer the **328 rows seen in at least half the samples** as the confident set; treat the rest as
supporting evidence and say in the PR which you included and why.

**Class B — `classB_shortWorkingFoldCandidate` (801 rows, 323 stations).** The line is already
offered; an extra destination was observed. These are overwhelmingly short workings and
self-terminating trains (`Circle Hammersmith` at Aldgate, `Metropolitan Amersham` at Amersham).

**Do not add these to the picker.** Nineteen Central line options at Liverpool Street would make the
app worse. Fold them into the canonical direction via `LINE_DESTINATION_GROUPS` in
`lib/train-times-core.js`, which already does exactly this (`District Barking` -> `District
Upminster`). Where a fold target is genuinely ambiguous, leave it and list it in the PR rather than
guessing.

**Class C — `classC_artefact` (217 rows).** Bare line names (`District`, `Metropolitan`),
`Circle Circle Line`, `Piccadilly Heathrow T123 + 5`. **Exclude entirely.** These come from
`parseTflArrival`'s unknown-destination fallback emitting only the line name, and from TfL branch
labels. That fallback is a separate adapter defect — note it in the PR for its own brief; do not fix
it here.

## Acceptance criteria

1. Acton Town offers Piccadilly directions and they populate with live trips.
2. The eight worst stations above each offer every line they are served by, and each added direction
   returns trips at a time that line is running.
3. No station's offered list grows unreasonably — no picker gains a long tail of short workings.
   State the before/after direction count for the eight stations.
4. Class B destinations resolve onto an existing canonical direction rather than appearing
   separately; show a before/after for at least three.
5. No direction is removed. No change to `pickUpcomingTrips`, the adapter, or the `/api/next-train`
   shape. `lib/train-times-core.js` changes are confined to `LINE_DESTINATION_GROUPS`.
6. No regression to the merged fixes (`26eccfb`, `d91e122`, `e987d9e`, `a511c69`): spot-check
   Barking Riverside, Gospel Oak, Cheshunt, Abbey Road, Tottenham Court Road.

## QA

Extend `qa/uk-london-tfl-direction-match.mjs` (not a parallel script) so every direction offered for
the changed stations is matched by a parsed trip from a live-captured fixture, and add a guard that
a station's offered list contains no destination which folds onto another offered direction — that
is the assertion which would catch a future short-working import.

Run that gate, `node qa/bundle-freshness.mjs`, and `node qa/run-all.mjs --smoke` **with an explicit
`timeout: 600000`**, all foreground and to completion. Do not run the full suite.

## Handoff

Commit, push, open a PR linking this brief and `docs/london-catalog-gaps.json`. Do not commit
`docs/expansion-tracker/lane-locks.json` or `qa/.london-catalog-coverage-raw.json`. Do not start
background waits or poll loops — several runs in this workstream stranded finished work that way.
