# Jim brief — FB-61: direction chips offered where the line never calls

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `lib/cities/<city>/`
(marketing-directions and line-map data for the three cities named below), `lib/providers/` where
those cities' adapters require it, `public/city-directions/`, and `qa/`.

tim-review: no — Tim approved fixing FB-61 before launch on 10 Sep 2026.

**Lane locks required.** This touches three countries. Run `node qa/lane-lock.mjs check` for
**"United Kingdom"**, **"Sweden"** and **"Norway"**, and acquire each before touching shared files.
All three reported **free** at dispatch (top-level check, 10 Sep 2026).

## Symptom

`/api/directions` offers a chip that no service at that station ever runs, so `/api/next-train` is
permanently `next: null` there. A rider picks a direction that can never produce a train.

Three confirmed instances, from the 6 Sep 2026 production sweep and re-confirmed today:

- **London — Abbey Road → `DLR Bank`** (and `DLR Lewisham`). Abbey Road is on the Stratford
  International – Woolwich Arsenal branch and no service from it reaches Bank or Lewisham. Mark
  found today that Abbey Road offers three chips of which **only `Beckton` is real** — the station's
  board rests on one working chip out of three.
- **Stockholm — Abrahamsberg → `Gröna linjen + Farsta strand`.** Farsta strand trains branch at
  Alvik, east of Abrahamsberg.
- **Oslo — Ammerud → `4 + Bergkrystallen`.** Line 4 does not serve the Grorud branch.

## Root cause

`marketingLabelsForStation()` returns **every end of the line family**, rather than the ends
reachable from the branch that station actually sits on. Each city has its own implementation under
`lib/cities/<city>/marketing-directions.js`, so this is a shared *shape* of bug rather than one
shared function.

## Scope

Fix the three cities named above. **Do not attempt all 33** — that is a rewrite, not a bug fix, and
this is a week before launch.

Derive each station's chips from the branch or segment it sits on, using each city's existing
line-map/topology data rather than inventing new data files. Where a city's line map does not carry
enough branch structure to make that determination, say so plainly in the PR rather than guessing a
topology — an honest "this city needs richer line-map data first" is a good outcome for a city you
cannot fix safely.

**Leave Sydney alone.** `lib/cities/sydney/marketing-directions.js` was just changed by PR #354
(merged, `fbb5df7`) and is not affected by FB-61.

## The gate

FB-61's backlog entry proposes asserting that every chip at every catalog station appears on a live
board during service hours. **Do not build it that way.** A gate that depends on live service is
flaky, service-hours-dependent, and will fail for reasons unrelated to the defect — exactly the
class of noise we have spent this week removing from the suite.

Build it **offline and deterministic** instead: assert, from each city's own line-map/topology data,
that every chip offered at every catalog station is reachable from that station. That is the real
invariant, it runs in milliseconds, and it cannot flake. Live checking already exists and belongs to
the production sweep (`qa/prod-sweep.mjs`, merged in #355), not to CI.

Register the new gate in `qa/run-all.mjs` at the smoke tier. It must **not** fetch anything over the
network — see `docs/jim-brief-blob-transfer-reduction.md` for why CI gates no longer make network
calls for data.

## Acceptance criteria

1. Abbey Road no longer offers `DLR Bank` or `DLR Lewisham`; it offers only chips reachable from its
   branch. Show before/after.
2. Stockholm Abrahamsberg no longer offers `Gröna linjen + Farsta strand`; Oslo Ammerud no longer
   offers `4 + Bergkrystallen`. Show before/after for each.
3. No station in any of the three cities **loses** a chip that is genuinely reachable. This is the
   risk in this change — over-trimming makes real services unselectable, which is the bug we fixed
   in Sydney last night, in reverse. State how you verified it.
4. A new offline gate asserts chip reachability from line-map topology across all catalog stations
   in the three cities, and fails when a chip is unreachable. Prove it by construction: introduce an
   unreachable chip and show the gate catches it.
5. No network calls in the new gate.
6. Sydney is untouched.
7. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite.

## Why this matters now

Beyond the rider-facing defect, FB-61 keeps the newly-merged production sweep permanently reporting
London as `empty`, because Abbey Road is its first sampled station. Tim is away 27 Sep – 9 Oct and a
monitor with one always-red city is one nobody reads. Fixing this makes the monitor trustworthy for
that window.

## Handoff

Branch from master (now at `fbb5df7`): `fb61-branch-reachable-chips`. Commit, push, and open a
normal (non-flip) PR linking this brief, with before/after chip lists for the three named stations
and your evidence for criterion 3. Copy this brief into your branch — it is untracked on master by
design. Do not merge.
