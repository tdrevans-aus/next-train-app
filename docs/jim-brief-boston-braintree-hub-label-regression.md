# Jim brief — Boston: Braintree Commuter Rail trip missing hub-bound label (master is red)

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). `tim-review: no` — pure bug fix,
no copy/UI/API-shape change beyond correcting an already-shipped label rule.
Written 2026-09-25 by the controller session. Triaged, not fixed — do not paste this triage into
any other agent's prompt as context; this file is the whole handoff.

## Symptom

`node qa/boston-dogfood-gate.mjs` fails on current master (confirmed locally against
`origin/master` HEAD `a61b297`, and reproduces identically on two unrelated PR branches
(`jim-dublin-adapter`, `jim-washington-live-gate`) that never touched Boston code):

```
Error: a live Commuter Rail trip from Braintree must already carry the canonical hub-bound label, got "Kingston"
    at assert (qa/boston-dogfood-gate.mjs:81:11)
    at qa/boston-dogfood-gate.mjs:574:3
```

This is a real regression, not flakiness — this assertion checks the *mechanism* (any live
Commuter Rail trip actually on the Braintree board must resolve through the canonical
hub-bound label path), not a specific train's presence, precisely to avoid being
schedule-flaky (see the comment above it in the gate file). Because `web-qa` is a required
check, this currently blocks every PR from merging, including two unrelated ones
(Dublin adapter #443, Washington DC flip #444) that are otherwise fully green.

## Likely cause

Landed in commit `a103ee4` ("Direction labels: server-side legacy aliases; terminus-only labels
for Boston CR + Metrolink", #440, merged 2026-09-22, never actually CI-verified on master because
the GitHub Actions billing outage started shortly after — see git log). That commit rewrote
`mapCommuterRailDestination()` in `lib/cities/boston/marketing-directions.js` to return the bare
terminus except at the two hubs (South Station/North Station), where it should keep the line name
— e.g. `"South Station (Kingston Line)"` for a Kingston Line trip inbound toward South Station.

The failing trip's destination came back as plain `"Kingston"` — i.e. the *outbound* terminus
label — for a trip appearing on the **Braintree** board, which is itself one of the five stations
board-eligibility added Commuter Rail service to on 2026-09-20 (South
Station/North Station/Forest Hills/Braintree/JFK-UMass, per `cities.csv`'s Boston row). Braintree
sits on the shared Old Colony trackage south of the JFK/UMass junction where the
Kingston/Plymouth, Middleborough/Lakeville, and Greenbush lines diverge — worth checking whether
`directionId` resolution or the hub-terminus check in `mapCommuterRailDestination()` (or wherever
`board()` remaps a raw trip into `braintreeCrTrip.destination`) is keying off the wrong terminus
pair for a station that isn't itself one of the two Commuter Rail hubs, or mishandling a station
on a shared-trackage segment. Investigate from there — this is a description of the symptom and
a plausible starting point, not a diagnosis; verify against real MBTA V3 prediction data before
assuming the cause.

## Task

1. No lane lock needed (bug fix, not adapter/data work touching `lib/providers/` for a *new*
   city) — but this does touch shared Boston product code, so check
   `node qa/lane-lock.mjs check united-states` first anyway since Washington DC's flip PR (#444)
   is mid-merge in that same country lane.
2. Reproduce locally: `node qa/boston-dogfood-gate.mjs`.
3. Find the root cause in `lib/cities/boston/marketing-directions.js`'s
   `mapCommuterRailDestination()` (and/or wherever `board()` computes `directionId` for a
   Braintree-observed trip) and fix it so every live Commuter Rail trip resolves the correct
   hub-bound label when it should carry one.
4. Extend `qa/boston-dogfood-gate.mjs` (or a small new assertion in it) so this exact failure
   mode — a shared-trackage/non-hub station getting the wrong terminus pair — can't silently
   regress again.
5. Run `node qa/boston-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke` (use `timeout 600000`
   and tail the output — smoke takes several minutes). Confirm no new failures beyond
   `melbourne-dogfood-gate.mjs` if it's still separately broken (check `git log` — if it's already
   fixed on master, it should be green now too and any failure there is new and worth flagging).
6. Commit, push, open a PR linking this brief. `tim-review: no`, standing bug-fix-lane merge
   authority applies once Mark confirms green.

## Acceptance criteria

- `qa/boston-dogfood-gate.mjs` passes.
- `node qa/run-all.mjs --smoke` has no failures caused by this change.
- The specific failure mode (wrong terminus pair for a non-hub, shared-trackage station) has a
  regression assertion that would have caught this before merge.

Leave no background sleep/poll loops running when you finish.
