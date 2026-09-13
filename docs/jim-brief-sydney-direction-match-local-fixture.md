# Brief: sydney-direction-match reads the Blob store on every smoke run

**Lane:** bug-fix / product (CLAUDE.md "Bug-fix lane"). `tim-review: no` — qa/ and one
script only; no copy, IA, or API change.
**Date:** 13 Sep 2026. Follow-up to PR #357 (`blob-transfer-reduction`).

## Symptom

`qa/sydney-direction-match.mjs` (added in PR #354, FB-62) calls `loadGtfsStatic` against
`gtfsFixtureBlobUrl("sydney")` — the live Vercel Blob URL for Sydney's full static GTFS zip —
and is registered in `SMOKE_SCRIPTS` in `qa/run-all.mjs`. Every CI push and every local
`--smoke` run therefore downloads that zip. PR #357 moved the seven blob-backed dogfood gates
onto small committed fixtures precisely to stop this class of traffic after the Hobby plan's
10 GB/month Blob Data Transfer allowance was exhausted on 10 Sep 2026 and took seven live
cities down. Jim's fetch spy during the #357 rebase found this gate is the one remaining
smoke-tier consumer.

## Reproduction

Before this change, preloading a network spy makes the gate die on its first fetch:

```bash
node --import ./net-spy.mjs qa/sydney-direction-match.mjs
```

(where `net-spy.mjs` replaces `globalThis.fetch` and `net.Socket.prototype.connect` with
functions that exit 97). After the change the same command exits 0.

## Suspected files

- `qa/sydney-direction-match.mjs` — the `loadGtfsStatic({ url: gtfsFixtureBlobUrl("sydney") })` call.
- `qa/lib/local-gtfs-snapshot.mjs` — #357's helper; only exposed a calendar-only loader.
- `qa/fixtures/gtfs-snapshots/sydney/` — calendar-only fixture from #357, header-only trips.
- `scripts/extract-gtfs-calendar-fixture.mjs` — a calendar refresh rewrote the trip tables
  header-only, which would wipe any trip rows added for this gate.

## Acceptance criteria

1. `node qa/sydney-direction-match.mjs` passes with zero network access: `globalThis.fetch`
   stubbed to throw at the top of the gate (as `qa/brussels-planned-gate.mjs` does), and a
   preloaded socket-level spy also stays silent (covers import time, which the in-file stub
   cannot because ESM imports are hoisted above it).
2. Every assertion the gate made against the live zip is preserved unchanged: no unrecorded
   empty direction list; T2/T3/T8 City Circle chips match a scheduled trip network-wide and at
   Macarthur, Campbelltown, Revesby, Leppington, Liverpool; T6/T7 pinned; M1/T1/T4/T5/T9
   spot-checked.
3. Proof by construction that the gate still fails when a chip has no matching trip in the
   fixture: a new smoke-tier script mutates a copy of the fixture and requires a non-zero exit
   with the specific message, for the network-wide check, the per-station check, and the
   T6/T7 pinned check separately.
4. Fixture stays small (well under 100 KB, text only) and its README says what the rows are
   and how a calendar refresh interacts with them; the extract script preserves data rows in
   the non-calendar tables and refreshes only the calendar facts in an existing README.
5. `qa/sydney-dogfood-gate.mjs` and `qa/gtfs-local-snapshot-fixture-freshness.mjs` still
   pass on the extended fixture.

## QA

- Must pass: `node qa/sydney-direction-match.mjs`, `node qa/sydney-direction-match-negative.mjs`
  (new; registered in `SMOKE_SCRIPTS` directly after the gate), `node qa/sydney-dogfood-gate.mjs`,
  `node qa/gtfs-local-snapshot-fixture-freshness.mjs`, `node qa/run-all.mjs --smoke`.
- Do not run the full untiered suite.
