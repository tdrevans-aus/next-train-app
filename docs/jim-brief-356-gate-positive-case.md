# Jim brief — the retired-city gate must also prove a live city is refreshed (PR #356)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `qa/` only.

tim-review: no. Lane lock: not required — this touches only a QA gate, no `lib/providers/` adapter.

## Context

Mark re-reviewed PR #356 (branch `newcastle-stale-snapshot`, at `9c05851`) and returned
**conditional FAIL**. Read his note: `docs/mark-note-newcastle-stale-snapshot.md` (latest section).

**The production code is correct.** Mark verified that independently: all 17 `putImpl` occurrences in
`lib/gtfs-refresh.js` survived the rebase, and he ran an offline probe against the branch code with
synthetic live and retired entries spliced into `STANDALONE` and `SHARED_GROUPS` — live cities were
genuinely attempted, retired ones genuinely skipped, and the skip is per-city inside a mixed shared
group. **Do not change `lib/gtfs-refresh.js`.**

## The one defect

`qa/gtfs-refresh-retired-city-skip-gate.mjs` only ever populates the lists with **retired** synthetic
entries (`vancouver`, `amsterdam`) and asserts they are not fetched or published. It would pass
identically if the skip logic silently ate **every** city, live or not.

That is the exact failure this gate exists to prevent, and it is the worst kind: an over-eager skip
does not error, it just stops a live city refreshing, and nobody finds out until its calendar expires
weeks later. Tim is away 27 Sep – 9 Oct.

## Fix

Make the gate assert **both directions**:

1. A retired city is **not** fetched or published (already there — keep it).
2. A **live** city **is** attempted — its fetch/probe is reached and `putImpl` would be called. Use a
   real live registry id (e.g. `newcastle` or `canberra`), keep `global.fetch` and `putImpl` stubbed
   so nothing touches the network or the blob store, and record the calls rather than letting them
   throw on a live city.
3. **A mixed shared group:** a `SHARED_GROUPS` entry containing one live and one retired city — assert
   the live one is processed and the retired one is skipped. Mark's probe already showed the code
   does this; the gate should lock it in.

Then prove the gate has teeth by construction: temporarily make the skip condition skip everything
(e.g. invert it) and show the gate **fails** on the live-city assertion. Revert that change before
committing — say in the PR that you did this and what the gate printed.

Zero network access, as before. Registered once in `qa/run-all.mjs`'s smoke tier, as it already is.

## Acceptance criteria

1. The gate fails if a live city is skipped — proven by construction with a temporarily broken skip.
2. The gate still fails if a retired city is refreshed.
3. The mixed shared-group case is asserted.
4. No network access; `lib/gtfs-refresh.js` untouched.
5. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite.

## Handoff

Push to the existing branch `newcastle-stale-snapshot`, updating PR #356 in place. Leave a PR comment
saying what the gate now asserts and what it printed when you broke the skip deliberately. Copy this
brief into the branch. Do not merge.
