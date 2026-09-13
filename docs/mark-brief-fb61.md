# Mark brief — QA review of PR #359 (FB-61 branch-reachable chips)

**Lane: QA (flag only).** Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/359, branch
  `fb61-branch-reachable-chips`.
- `docs/jim-brief-fb61-branch-reachable-chips.md` — the brief Jim worked to, with its seven
  acceptance criteria.
- `docs/feature-backlog.md` FB-61 — the ticket, which named three cities.

## What happened, and why this review is unusual

FB-61 claimed three cities offer chips no service ever runs: London (Abbey Road → `DLR Bank`),
Stockholm (Abrahamsberg → `Gröna linjen + Farsta strand`) and Oslo (Ammerud →
`4 + Bergkrystallen`). All three came from the 6 Sep 2026 production sweep.

Jim fixed London and **could not reproduce Stockholm or Oslo**. He reports live-checking both
against the SL Transport API and Entur JourneyPlanner, plus Oslo's own
`docs/oslo-d1/oracle-clash-report.md`, and concluded the chips are genuine scheduled services —
so he left both cities untouched rather than trim real destinations.

**That contradiction is the review.** Two outcomes, and they need different follow-ups:

- If Jim is right, FB-61's ticket is **wrong about two of its three cities**, the backlog entry needs
  correcting, and the 6 Sep sweep's findings for those two were bad. Say so plainly — a wrong ticket
  left standing sends the next person to trim real services.
- If Jim is wrong, two cities ship with a permanently-`next: null` chip and we have missed the
  larger half of the defect.

**Do not settle this by re-reading his reasoning.** Check the two claims yourself against live or
timetable data. Note the trap: a chip that returns nothing *at the moment you sample* is not proof of
an unreachable chip — that is time-of-day, the same trap that cost this project three failed London
verification attempts. Establish whether a service from that station to that destination exists in
the schedule at all, not whether one is running right now.

## The London fix

`marketingLabelsForStation()` in `lib/cities/uk-london-tfl/marketing-directions.js` now filters a
line's termini through `line.segments` via a new exported `terminiReachableFromStation()`, using DLR
branch data added to `qa/fixtures/uk-london-tfl/published-network.json` and sourced from TfL's
`Line/dlr/Route/Sequence/all`.

Abbey Road goes from **7 chips to 3** (`DLR Beckton`, `DLR Stratford International`,
`DLR Woolwich Arsenal`).

**Criterion 3 is the risk and your main job here.** Over-trimming makes real services unselectable —
the Sydney bug in reverse, and worse, because it silently removes options rather than adding a dud
one. Verify:

- The four chips removed from Abbey Road are genuinely unreachable from it.
- No *other* London station lost a chip it should keep. 507 catalog stations are in scope; sample
  well beyond Abbey Road, and pay particular attention to DLR interchanges and stations near branch
  junctions, where a segment-based filter is most likely to be wrong.
- The DLR branch data added to the fixture is accurate. It was sourced from TfL's own API, so check
  it against that source rather than against the code that consumes it.

## The gate

`qa/branch-reachable-chips-gate.mjs` — offline, no network calls, smoke tier, re-deriving
reachability from raw line-map JSON across 507 London / 153 Stockholm / 101 Oslo stations, with a
synthetic proof-by-construction test.

Verify it makes **no network calls** (CI gates no longer fetch data — see PR #357), that its
proof-by-construction genuinely fails on a deliberately unreachable chip, and that it re-derives
reachability independently rather than calling the same code path it is meant to be testing. A gate
that asserts a function agrees with itself is worthless.

## Also verify

- Sydney untouched (`lib/cities/sydney/marketing-directions.js`).
- Stockholm and Oslo genuinely untouched.
- Lane locks were acquired for United Kingdom, Sweden and Norway.
- `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Jim reports 118 PASS / 0 FAIL.
  Do not run the full untiered suite.

## Why the timing matters

Master is now `3.0.0 / versionCode 24` and the `v3.0.0` tag is being held until the release content
is complete — this PR is part of that content. FB-61 also keeps the production sweep reporting
London as `empty`, because Abbey Road is its first sampled station, and Tim is away 27 Sep – 9 Oct
with that monitor as the main line of sight.

## Deliverable

Post a single pass/fail note as a PR comment on #359 via `gh pr comment 359`, with the seven
acceptance criteria checked one by one, your independent verdict on the Stockholm/Oslo contradiction,
and a clear verdict line. Write the same note to `docs/mark-note-fb61.md`. If you conclude the ticket
was wrong, say exactly what FB-61's backlog entry should now say. Do not merge.
