# Jim brief — Los Angeles: Swiftly rejects `Bearer` auth (send the raw key)

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. Acquire the lane lock,
because this edits `lib/providers/`. The controller checked on 24 Oct 2026 and `united-states` is free.
**Date:** 24 Oct 2026. **tim-review:** no.

## Symptom

`SWIFTLY_API_KEY` landed on 24 Oct, in `.env.local` and in Vercel production. Swiftly granted access
on 29 Sep: agencyKey `lametro-rail`, TripUpdates + VehiclePositions, **180 requests per 15 min**.
Every LA board would still fail, because the adapter sends the key in the wrong auth format.

## Evidence (controller probe, 24 Oct 2026, ~08:30 UTC)

`GET https://api.goswift.ly/real-time/lametro-rail/gtfs-rt-trip-updates`:

| `Authorization` header | Result |
|---|---|
| `<key>` (raw) | **200**, `application/x-protobuf`, ~3.9 KB (about 01:30 in LA, so a thin feed is expected) |
| `Bearer <key>` | **401** `{"errorCode":401,"errorMessage":"Invalid Credentials"}` |

The `Bearer` scheme in the code was inferred from an empty-key 401's `WWW-Authenticate: Bearer`
header (oracle-clash report, 29 Aug). The file comment says it was never checked against a real key.

## Suspected code

- `lib/providers/gtfs/auth.js:398` `swiftlyAuthHeaders()` returns `{ Authorization: \`Bearer ${trimmed}\` }`.
  Its only caller is `lib/providers/los-angeles.js`, via `authHeaders()` (~line 124).
- `lib/providers/los-angeles.js` header comment (~line 24) and `docs/los-angeles-d1/jim-handoff.md`
  line 15 both document `Bearer`. Correct them.
- `lib/providers/los-angeles.js` ~line 101 says the RT parsing is "UNVERIFIED against a live payload".
  Verify it now that a key exists.

## Fix

1. `swiftlyAuthHeaders()` returns `{ Authorization: trimmed }`. Keep the missing-key error unchanged.
2. Verify against the live feed:
   - Run `fetchStationBoard()` for **Union Station, 7th St/Metro Ctr and Downtown Long Beach**, during
     LA service hours if you can (05:00–24:00 America/Los_Angeles). If you can't, record the hour and
     what came back.
   - Confirm the TripUpdates entities join to the static `gtfs_rail` trips and stop_ids, and that
     times are live, not static.
   - Respect **180 requests / 15 min**. Space the probes out, and don't loop or sweep every station.
3. Correct the comments and the handoff doc. Remove "UNVERIFIED" only if step 2 actually verified it.
4. **Never print, log, commit or paste the key.** Read it from the environment only. A raw-key header
   is easier to leak in logs than a Bearer one, so check that no debug log or error message includes
   request headers.

## QA

- Extend `qa/los-angeles-planned-gate.mjs` (offline, no network) to assert that `swiftlyAuthHeaders("k")`
  returns exactly `{ Authorization: "k" }`, with no `Bearer`. Confirm the assertion fails if you put
  the prefix back (mutation check).
- `node qa/los-angeles-planned-gate.mjs` and `node qa/run-all.mjs --smoke` pass. Run the suite plain:
  it loads `.env.local` itself, and `--env-file` produces phantom failures.
- LA **stays `planned`**. This PR doesn't flip it. The flip is a separate Mark pass, with the
  controller's realtime and rider-API pre-check.

## Acceptance

1. Live boards come back for at least two of the three stations above (or the timing limits are
   documented if run outside service hours), with live times and correct direction chips.
2. The new offline assertion exists and has passed the mutation check.
3. No key material appears anywhere in the diff, the logs or the PR.
4. PR title: "Los Angeles: Swiftly auth sends the raw key (Bearer is rejected)". Link this brief.

Leave no background sleep or poll loops running when you finish.
