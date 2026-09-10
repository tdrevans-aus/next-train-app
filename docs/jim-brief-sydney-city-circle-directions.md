# Jim brief — Sydney: no city-bound direction chip on City-Circle-ended lines (FB-62)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises changes to
`lib/cities/sydney/` (`marketing-directions.js`, `line-map.json`, `published-network.json`),
`public/city-directions/` if a Sydney catalog file is added, and `qa/`.

**tim-review: yes** — this adds a new user-facing chip label, and the label text contradicts a
recorded design note (see "The decision Tim owns" below). Build it; the PR waits for Tim's word on
the wording before merge. Everything else in this brief is settled.

Lane lock: `node qa/lane-lock.mjs check "Australia"` reported **free** at dispatch (checked by the
top-level session, 10 Sep 2026). Run `acquire "Australia" sydney jim <branch>` before touching
shared files if your fix reaches `lib/providers/`.

## Symptom

A rider at **Macarthur cannot pick a direction at all** — the station offers an empty list. At
Campbelltown and Revesby the only option is `T8 Macarthur`, which points *away* from the city; there
is no chip for the direction most riders actually travel.

This is broader than FB-62 records. Every line whose city end is the City Circle is missing its
city-bound chip at every station on it — T2, T3, T6, T7 and T8, not T8 alone.

## Reproduction

From the repo root:

```js
// qa/.sydney-t8-repro.mjs  (scratch; delete or fold into the gate)
import {marketingLabelsForStation} from '../lib/cities/sydney/marketing-directions.js';
for (const s of ['Macarthur','Campbelltown','Revesby','Leppington','Liverpool','Bankstown','Olympic Park']) {
  console.log(s.padEnd(16), JSON.stringify(marketingLabelsForStation(s)));
}
```

Observed 10 Sep 2026:

```
Macarthur        []
Campbelltown     ["T8 Macarthur"]
Revesby          ["T8 Macarthur"]
Leppington       ["T2 Parramatta","T5 Richmond"]        <- no city-bound T2
Liverpool        ["T2 Leppington","T2 Parramatta","T3 Lidcombe","T5 Leppington","T5 Richmond"]
                                                        <- no city-bound T3
Bankstown        ["T6 Lidcombe"]                        <- no city-bound T6
Olympic Park     ["T7 Lidcombe"]                        <- no city-bound T7
Wolli Creek      ["T4 Bondi Junction","T4 Cronulla","T4 Waterfall","T8 Macarthur"]
```

## Root cause

`lib/cities/sydney/marketing-directions.js`:

- `MARKETING_ENDS.T8 = ["Macarthur"]` (line 17) lists **one** end. T8's other end is the City Circle,
  which is not a station name.
- `CITY_CIRCLE_KEYS` (lines 23–31) and the guard at line 131 explicitly drop any terminus that is a
  City Circle key, so a city-bound end can never become a chip on any line.
- The self-exclusion at line 128 (`terminusKey === stationKey`) then removes `Macarthur` at
  Macarthur itself, leaving `[]`.

The headsign vocabulary already exists downstream — `line-map.json` carries
`T8:City Circle Via Town Hall` with `City Circle Via Airport` / `Via Sydenham` / `Via Museum` and
`Macarthur Via Wolli Creek` grouped under it. The data models the city-bound way fine; only the
marketing/chip layer refuses to surface it.

## The decision Tim owns

`lib/cities/sydney/line-map.json:10` records a D5 decision: *"labels: line + terminus (T1 Emu
Plains). City Circle is not a terminus."* FB-62's own scope line proposes `T8 City Circle` as the
inbound label, which reverses that note.

**Build it as `T8 City Circle`** (and `T2 City Circle`, `T3 City Circle`, `T6 City Circle`,
`T7 City Circle`) — that is FB-62's stated intent and it matches how Sydney Trains signage and
announcements name the destination. Put the label in one place so a rename is a one-line change, and
say plainly in the PR description that the D5 note in `line-map.json` needs updating if Tim accepts
the wording. Do **not** hand-edit that note to agree with you without saying so.

## Scope

1. Give every City-Circle-ended line a city-bound marketing end, and stop `CITY_CIRCLE_KEYS` from
   suppressing it. Keep that set doing its real job — folding the many `City Circle Via X` headsign
   variants onto one chip — rather than deleting it.
2. Map the GTFS headsigns onto the new chip via `CHIP_HEADSIGN_GROUPS`, using the groups already in
   `line-map.json`. `T8 Macarthur` must keep absorbing `Revesby` and `Campbelltown` as it does now.
3. Check T2/T3/T6/T7 have the same shape and fix them in the same pass — do not leave four known
   instances of one bug behind for a follow-up.
4. `M1`, `T1`, `T4`, `T5`, `T9` do not end at the City Circle. Leave them alone and confirm in the PR
   that their chip lists are byte-identical before and after.

Out of scope: the `H4 T8 Airport vs Sydenham at Wolli Creek` hazard already recorded in
`line-map.json:22`; any change to the `/api/next-train` or `/api/directions` response *shape* (new
chip values are fine, new fields are not); FB-61 (chips offered where the line never calls) — that
is a separate, cross-city fix and must not be started here.

## Acceptance criteria

1. Macarthur offers at least one direction, and it is the city-bound one.
2. Campbelltown, Revesby, Leppington, Liverpool, Bankstown and Olympic Park each offer a city-bound
   chip alongside their existing outbound chip. Give the before/after list for each.
3. Each new chip returns live trips from `/api/next-train` during that line's service hours — a chip
   that is permanently `next: null` is the FB-61 bug and would make this change a regression, not a
   fix. This is the criterion that matters most; show real output, not a fixture round-trip.
4. No existing chip label changes and none is removed. M1/T1/T4/T5/T9 chip lists are unchanged.
5. The many `City Circle Via X` headsign variants all fold onto the single new chip per line — no
   picker gains a "Via Museum"/"Via Town Hall"/"Via Strathfield" long tail.

## QA

Sydney has no direction-match gate today (`qa/` has `sydney-dogfood-gate.mjs`,
`sydney-banksia-perth-route.mjs`, `sydney-new-journey-not-perth.mjs`, and the ungated live
`sydney-network-sweep.mjs`). Add **`qa/sydney-direction-match.mjs`**, following the shape of
`qa/london-direction-match.mjs` / `qa/goteborg-direction-match.mjs`, asserting that every chip
offered at every catalog station matches at least one parsed trip from a captured fixture, and that
no station offers an empty direction list. Register it in `qa/run-all.mjs` alongside the other
Sydney entries (~line 54).

Run `node qa/sydney-direction-match.mjs`, `node qa/sydney-dogfood-gate.mjs`, and
`node qa/run-all.mjs --smoke` **with an explicit `timeout: 600000`**, all foreground and to
completion. Do not run the full untiered suite. If a Swedish or browser gate flakes, note it and
re-run that script alone rather than the whole suite.

## Handoff

Branch from master: `sydney-city-circle-directions`. Commit, push, and open a normal (non-flip) PR
that links this brief and carries the before/after chip lists and the live `/api/next-train` output
for criterion 3 in the description. Copy this brief file into your worktree as part of the PR — it
is untracked on master by design. Do not merge; the PR is `tim-review: yes`.
