# Mark brief — London: full-network destination reconciliation audit

**Lane: QA (flag only).** Investigate and report. Do not fix, do not open a fix PR. Findings become
a single Jim brief that the top-level session writes.

tim-review: no — Tim approved this audit directly on 7 Sep 2026.

**Sequencing: start only once PR #346 (`jim/london-station-name-prefix`) has merged to master.**
Running before that would rediscover the leading-`"London "` defect it fixes and waste the pass.

## Why this exists

One rider report ("Barking Riverside towards Suffragette shows no trains") has so far produced
**three** distinct live defects, all the same underlying failure — TfL's destination string and the
direction string the picker offers failed to reconcile, and nothing detected it:

| Defect | Status |
|---|---|
| Trailing `" (London)"` suffix never stripped (`"Stratford (London)"`) | fixed, `26eccfb` |
| `/Arrivals` publishes placeholder timings at 910G termini | fixed, `26eccfb` (ArrivalDepartures) |
| Leading `"London "` prefix never stripped (`"London Liverpool Street"`) | fixed, PR #346 |

Each was found because a person hit it. This audit's job is to find the remainder **as data**,
in one pass, instead of one complaint at a time. Right now nobody can answer "which London
directions are unreachable?" without writing a probe — that is the gap to close.

This is deliberately broader than `docs/mark-brief-london-terminus-sweep.md`, which covered 47
terminus candidates against three signatures. This covers **all ~434 catalog stations** against one
question: does every offered direction reconcile with something the feed actually produces?

## Method

For every station in `public/city-directions/uk-london-tfl.json`:

1. Fetch its raw TfL rows **through the same endpoint the adapter would choose** — mirror
   `usesArrivalDepartures` rather than assuming, so the audit reflects shipped behaviour. Include
   each entry's `alsoNaptanIds`, as `fetchStopBoard` does.
2. Record per row: `modeName`, `lineName`, `towards`, `destinationName`, the timing fields, and the
   naptan prefix.
3. Compute the parsed destination through the adapter's own parse path, then
   `normalizeDestination`, then whether it matches any direction offered for that station.

Pace at 450-600ms; the previous sweep hit **zero** 429s at that rate across ~130 requests. A 429
must never be reported as an empty board — retry with backoff and say in the report how many you
saw. Run during a normal service window and state the window; a quiet late-night board is not a
finding.

## Deliverables

`docs/london-destination-reconciliation-audit.md`, plus a machine-readable
`docs/london-destination-gaps.json` that a Jim can work from directly — the point is that the fix
PR is driven by the data, not by re-reading prose.

The report needs three tables:

- **A — normalisation gaps.** Every distinct raw `destinationName` in the region, its normalised
  form, and whether it matched. This is the complete list of strings TfL emits that we mishandle.
- **B — unreachable directions.** Per station, offered directions with zero matching trips.
- **C — placeholder timings.** Per station and direction, rows sharing a near-identical
  `timeToStation` (the signature behind the original bug).

Classify **every** gap into exactly one of:

1. **Normalisation defect** — adapter or `applyDestinationAliases` fix. Goes in the Jim PR.
2. **Catalog/direction data problem** — the picker offers a service that does not exist at that
   stop (e.g. the known generic Tramlink lists, Weaver cross-branch cross-listing). Luke's lane;
   record a verdict per `docs/board-eligibility-rule.md`, do not fix.
3. **Genuine absence of service** — record the verdict and move on.

## Specific things to confirm or avoid

- **Confirm the three fixed classes are actually closed** network-wide, not just at the stations we
  happened to test. If any station still shows them, that is the highest-priority finding.
- **Do not re-litigate the tube-terminus sparsity defect.** Walthamstow Central and the
  `"Check Front of Train"` / `dest="undefined"` rows are recorded in the addendum to
  `docs/london-terminus-sweep-findings.md` and are awaiting a separate product decision from Tim,
  because TfL may publish no forward departures at 940G termini at all. Note affected stations for
  completeness; do not propose a fix.
- **Recommend the gate shape.** `qa/uk-london-tfl-direction-match.mjs` already exists, is
  fixture-backed and runs in the smoke tier. Say whether extending it covers the reconciled set, or
  what it structurally cannot cover — that limitation is more valuable than a list of passing
  assertions.
- **Say whether this generalises.** Other UK regions share `lib/train-times-core.js`'s
  normalisation. Note cheaply whether the same reconciliation question applies elsewhere
  (`uk-darwin`, the NR regions) — a one-line judgement is enough; do not audit them here.

## Constraints

`TFL_APP_KEY` is in `C:\Users\tdrev\Projects\next-train-app\.env.local`. A throwaway probe script is
fine; if you commit anything, keep it to the probe and the two deliverables. Run any QA in the
FOREGROUND; do not run the full suite. If port 3000 is held by another session, report the
contention rather than killing a process you did not start. Leave no background sleep, poll, or
watch loops running.
