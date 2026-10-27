# Jim brief — Los Angeles dogfood gate: add the scheduledCandidates-vs-remaining case

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. **Scope:** test only,
`qa/los-angeles-dogfood-gate.mjs`. **No lane lock** is needed, because there are no `lib/providers/`
edits. A Mark flip QA is running in parallel and may edit registry and live lists. Don't touch those.
**Date:** 25 Oct 2026. **tim-review:** no.
**Input:** Mark's PASS note on #532 (https://github.com/tdrevans-aus/next-train-app/pull/532#issuecomment-6392788886),
mutation 4.

## Gap

Mark's mutation, "make the remaining-today branch also honour `scheduledCandidates`", **survived**. It
undoes Jim's deliberate choice in #532, because `scheduledCandidates` can look into tomorrow's timetable.
No fixture case has a chip that's in `scheduledCandidates` but absent from
`scheduledDestinationsRemaining`.

## Fix

Add an offline fixture case: a chip whose only scheduled trips are **tomorrow**, so it's in
`scheduledCandidates` through the builder's tomorrow look-ahead but not in the remaining-today list. At a
time after today's last departure, picking that chip must give `not-currently-served`, not
`no-live-predictions`. Confirm the case is red under Mark's mutation and green on master. No production
code changes.

## QA

`node qa/los-angeles-dogfood-gate.mjs` passes, the mutation check passes, and so does
`node qa/run-all.mjs --smoke` (plain, with a 600000 ms timeout, in the foreground). Open a PR that links
this brief and leave no background loops running.
