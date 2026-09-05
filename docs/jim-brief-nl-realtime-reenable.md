# Jim brief — Rotterdam and Amsterdam: re-enable OVapi real-time, verify the join, or un-list

**Dispatched:** 5 Sep 2026 (Tim's decision) · **Lane:** `netherlands`, region label
`nl-realtime-reenable`, stage `adapter` · **Regions:** `rotterdam`, `amsterdam` (both live to
testers). Copy this file into the repo as `docs/jim-brief-nl-realtime-reenable.md` and commit it
with the change.

## Why

Both adapters are hard-coded static-only (`ROTTERDAM_STATIC_ONLY = true`,
`AMSTERDAM_STATIC_ONLY = true`, ~line 33) and throw `skip-national-rt` before the real-time fetch.
That was frozen on 29 Aug 2026 during the fixture migration to keep the migration byte-identical
(`docs/jim-brief-gtfs-data-platform-scale.md` §2.5), never as a product decision. Today (5 Sep)
Tim set the rule: **a city with a usable live feed must use it; a city without one gets no
board.** OVapi publishes a free, keyless national GTFS-RT TripUpdates feed
(`https://gtfs.ovapi.nl/nl/tripUpdates.pb`, User-Agent `next-train`) and both adapters already
contain the consumer code. Rotterdam and Amsterdam therefore violate the rule and must be fixed —
or, if the real-time join cannot be made to work, un-listed until it can.

## What to do

1. Read both adapters end to end first. The real-time path joins TripUpdates to the **trimmed
   static fixture** by `trip.realtime_trip_id` → `trip_id`, filtered to `railRouteIds`. The
   fixture was cut *after* real-time was disabled, so this join has never run in production
   against the current fixture. Check the fixture's `trips.txt` actually carries
   `realtime_trip_id` (the column diet in `docs/jim-brief-gtfs-fixture-diet.md` may have dropped
   it — if so, that is the first thing to restore in the trim script and the fixture).
2. Flip both constants to `false` — or better, delete the constant and the `skip-national-rt`
   throw, since the fixture-vs-loader decoupling that motivated them is already done. Keep the
   existing `catch` that makes real-time optional on 429/timeout: a failed fetch must degrade to
   the static board with `fetchedAt` from the static data, never to an error.
3. Prove the join live, in the real time zone: fetch the OVapi TripUpdates feed once (it's
   national; note its size and fetch time — if it's >10 MB or >2 s, say so, because the 2.5 s
   timeout already in the code is then marginal and needs Tim's eyes), and confirm that for at
   least three RET metro trips and three GVB metro trips in the fixture, the TripUpdates entity
   matches by `realtime_trip_id` and produces a delay/cancellation that changes the rendered
   board. Paste the evidence (trip ids, static time, live time) in the PR body. If the match
   rate is zero, stop: do not ship a "real-time on" flag that never matches. Report it, and
   recommend un-listing.
4. Gates: `qa/rotterdam-dogfood-gate.mjs` and `qa/amsterdam-dogfood-gate.mjs` currently pass on
   static output; extend each with a stubbed TripUpdates fixture (a tiny protobuf or a JSON stub
   at whatever layer `indexTripUpdates` accepts) proving that a delay on a known trip moves its
   board row and a cancellation removes it, and that a fetch failure falls back to static. Keep
   `rotterdam-mark-probes.mjs`, `*-direction-match.mjs`, `*-line-map-conformance.mjs` green and
   unchanged.
5. Registry: `notes` prose only for the two entries — replace "static-schedule-only" wording with
   "OVapi GTFS-RT live (re-enabled <date>, PR #<n>); static fixture refreshed manually (see
   codebase-inventory 6.7)". No `status` change.
6. Ledger: there is no Netherlands ledger yet (`docs/country-lane.md` lists NL as a light-pass
   retrofit). Do not create one. Put one line in `docs/board-eligibility-audit-au-se-nl.md`'s NL
   section noting real-time was re-enabled and the rule it satisfies.

## Verification (report the output)

- The six gates above pass; the two dogfood gates' new real-time assertions pass.
- Live evidence per step 3 in the PR body.
- Check `netstat -ano | findstr :3000` before `node qa/run-all.mjs --smoke`; if held by another
  project, don't run smoke, say so, rely on the named gates.

## Guardrails

- `node qa/lane-lock.mjs check netherlands` first (top level confirmed free); acquire
  `node qa/lane-lock.mjs acquire netherlands nl-realtime-reenable adapter`. Self-releases on merge.
- Own worktree from `origin/master`. No `status` changes, no fixture regeneration beyond restoring
  a dropped column, no changes to `static-cache.js`. Do not touch the UK entries in registry.js
  (a North East PR is in flight on the same file — keep your registry edits to the two NL notes
  so they merge cleanly).
- One PR titled "Rotterdam + Amsterdam: re-enable OVapi real-time (join verified live)". If step
  3 fails, open no PR; write the findings to `docs/nl-realtime-findings.md` on a branch, push it,
  and report — un-listing is Tim's call.
