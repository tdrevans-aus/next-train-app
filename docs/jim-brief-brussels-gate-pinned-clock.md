# Jim brief — Brussels planned gate expired: pinned clock + live fetch (blocks every merge)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `qa/`, `qa/fixtures/`,
`.github/workflows/qa-nightly.yml` if needed. **Not** `lib/providers/gtfs/board.js` — the
staleness check is doing its job correctly.

tim-review: no. Lane lock: not required — QA only.

**Priority: master is red on `web-qa`. Nothing can merge until this lands.** #356, #362 and #357
are all queued behind it.

## Symptom

`qa/brussels-planned-gate.mjs` fails on master and on every PR:

```
GtfsSnapshotStaleError: GTFS static snapshot is stale for "unknown city":
  calendar coverage 20260914..20261011 does not include today (20260901)
→ brussels-planned-gate.mjs (limit 180s) … FAIL (exit 1)
```

It passed on 11 Sep at 12:54 UTC and failed at 00:08 UTC on 12 Sep. Nothing in the repo changed in
between that touches Brussels.

## Root cause (confirmed on master)

Line ~163 of the gate:

```js
// Live schedule board (GTFS static, real network fetch) …
const now = new Date("2026-09-01T08:00:00+02:00");
const hubBoard = await fetchStationBoard(BRUSSELS_HUB, { now });
```

A **frozen clock** combined with a **real network fetch** of STIB/MIVB's GTFS. STIB rolled its feed
over in the last ~11 hours to a calendar covering 20260914..20261011; the runtime staleness check
(`lib/providers/gtfs/board.js:323`, added in `b827fbb`) compares that calendar to the board's `now`
— 1 Sep — and correctly refuses. The gate had a built-in expiry date and hit it.

This is the same class as `docs/jim-brief-blob-transfer-reduction.md` (PR #357): **a smoke-tier
gate that depends on live upstream data is a gate that fails for reasons unrelated to the code.**
It also contradicts the separation that PR established: CI tests our logic against local data; live
reality is checked on a schedule (the nightly suite and the production sweep).

## Fix

**1. Brussels — make the smoke gate offline.** Give the schedule-board assertions a local GTFS
fixture (a small calendar-only or trimmed snapshot under `qa/fixtures/brussels/`, following the
pattern #357 used for the seven dogfood gates via `loadGtfsStaticFromDirectory`) and a `now` that
falls inside that fixture's calendar. The self-referential-arrival and overlay-filtering assertions
are about *our* logic, so a fixture proves them just as well. If the pinned date and the fixture
must agree, derive one from the other rather than hardcoding both.

Keep the **live** STIB fetch if it has value — but move it to the nightly tier, and give it a real
`new Date()` rather than a frozen one, so it checks reality rather than a moment that has passed.

**2. `qa/gtfs-overnight-lookahead.mjs` — same shape, not yet expired.** It pins
`new Date("2026-08-27…")`. It passed in today's run, so either it does not fetch live or its data
still covers 27 Aug. Establish which. If it fetches live data against a frozen clock, it will fail
the same way on some future morning — fix it now in the same pass, the same way.

**3. Scan the rest of the smoke tier for the pattern.** Any gate that both pins a calendar date
(`new Date("20…")`, a hardcoded YMD) *and* reaches the network is a time bomb. Check at least the
other six `*-planned-gate.mjs` files registered in `SMOKE_SCRIPTS` (uk, nz, osaka, hong-kong,
copenhagen, boston). Fix what matches; list what you checked and found clean.

## Acceptance criteria

1. `node qa/brussels-planned-gate.mjs` passes on master with **no network access** — prove it by
   running with `fetch` stubbed to throw, as #357 did.
2. Whatever live STIB check survives runs on the nightly tier only, with a live clock.
3. `gtfs-overnight-lookahead.mjs` either shown not to fetch live, or fixed the same way.
4. The other planned gates are enumerated with a finding each.
5. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000` — clean, and this branch's own
   `web-qa` must go green, which is the proof the blocker is cleared.

## Handoff

Branch from master (`daf6699` or later): `brussels-gate-pinned-clock`. Commit, push, open a normal
PR linking this brief. Copy the brief into the branch. Do not merge — I will merge it first, then
#356, then #362 and #357 behind it.
