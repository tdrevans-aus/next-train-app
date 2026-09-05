# Jim brief — Rotterdam/Amsterdam real-time: shared feed cache, measured timeout, visible fallback

**Dispatched:** 5 Sep 2026 (Tim's decision) · **Lane:** `netherlands`, region label
`nl-realtime-cache`, stage `adapter` · **Branch:** continue on `nl-realtime-reenable` (PR #261,
open, do not open a second PR). Copy this file into the repo as
`docs/jim-brief-nl-realtime-cache.md` and commit it with the change.

## Why

PR #261 re-enables the OVapi GTFS-RT join and proves it works, but every board request fetches the
whole 4.4 MB national TripUpdates feed itself, with a 2.5 s timeout, and a timeout silently falls
back to the timetable. Measured from Perth the fetch is 3–5 s (0.8 s DNS, 2.2 s to first byte,
~2.5 s download). Production runs in Vercel `iad1` (Washington DC) where it should be ~1–1.5 s,
but that is an extrapolation. As written, #261 is "real-time most of the time, timetable
sometimes, no indication which". Tim wants it solid: one shared fetch per window, a timeout set
on a measured number, and a visible live/timetable marker.

## What to build (all on branch `nl-realtime-reenable`)

1. **Shared feed cache.** New module `lib/providers/gtfs/ovapi-tripupdates-cache.js` (both NL
   adapters import it; nothing city-specific inside). Same contract as the Darwin cache in
   `lib/providers/uk-darwin.js` (PR #230): module-level cache keyed by feed URL; TTL **20 s**
   exported as a constant; in-flight coalescing so concurrent callers await one fetch; on a failed
   refresh serve the previous copy if younger than **60 s** and log once; a `{ noCache: true }`
   bypass for tests. Cache the **decoded entity list** (post-protobuf), not the raw bytes, so
   both cities share one decode. Rotterdam and Amsterdam's `fetchTripUpdates(...)` calls go
   through it; the per-city `indexTripUpdates` filtering stays where it is.
2. **Timeout.** Raise the fetch timeout to **5000 ms** (only the one caller per window pays it).
   Keep the existing catch: a failed/timed-out fetch never errors the board.
3. **Measure it.** In the cache module, `console.log` one structured line per upstream fetch:
   `ovapi-tripupdates fetch ms=<n> bytes=<n> entities=<n> outcome=ok|timeout|error`. This is
   deliberately left in so a day of Vercel runtime logs gives Tim the real `iad1` number before
   the timeout is tuned again. Note in the PR body how to read it (`get_runtime_logs` /
   Vercel dashboard, filter `ovapi-tripupdates`).
4. **Visible fallback.** The board payload already carries `fetchedAt`. Add a
   `realtime: "live" | "timetable"` field to the Rotterdam/Amsterdam board responses (`"live"`
   when the TripUpdates join was applied from a fetch or a fresh cache entry, `"timetable"` when
   the fetch failed/timed out and no cache entry was usable, or when a stale entry older than the
   TTL was served). Read `api/next-train.js` and the board renderer in `public/` to find where
   Perth/Sydney already show a data-freshness hint, and surface the same small marker for these
   two cities; if no such hint exists anywhere, add only the API field and a one-line note in
   the PR that the UI marker is a follow-up — do not design new UI here.
5. **Gates.** Extend `qa/rotterdam-dogfood-gate.mjs` / `qa/amsterdam-dogfood-gate.mjs` (they
   already stub TripUpdates via `qa/lib/nl-realtime-stub.mjs`): two concurrent board calls
   produce one upstream fetch; a call after the TTL produces a second; a rejected refresh with a
   <60 s entry serves the stale copy (still `realtime: "live"`, since real corrections are
   applied); a rejected refresh with nothing usable falls back to static and reports
   `realtime: "timetable"`. Assert the `realtime` field in the delay, cancel and fallback cases.
   Keep `rotterdam-mark-probes.mjs` and the `*-direction-match` / `*-line-map-conformance` gates
   green and unchanged.
6. Registry `notes` for the two entries: add "shared 20 s TripUpdates cache, 5 s timeout, live /
   timetable marker (PR #261)". No `status` change. No other registry edits.

## Verification (report the output)

- The six NL gates plus the new cache assertions pass.
- One real fetch through the cache module from your machine with the log line pasted (expect
  3–5 s from Perth — that is fine; the production number is what the log is for).
- `netstat -ano | findstr :3000` before `node qa/run-all.mjs --smoke`; if held, skip smoke, say
  so, rely on the named gates.

## Guardrails

- `node qa/lane-lock.mjs check netherlands` first (top level confirmed free); acquire
  `node qa/lane-lock.mjs acquire netherlands nl-realtime-cache adapter`. Self-releases on merge.
- Own worktree; `git fetch origin && git checkout -b nl-realtime-reenable origin/nl-realtime-reenable`
  then `git merge origin/master` if master has moved (it has: resolve, keep both). Push to the
  same branch so #261 updates in place.
- No `status` changes, no `static-cache.js` changes, no UK registry entries (a UK Jim may be
  running concurrently). Do not touch the fixtures or trim scripts beyond what #261 already did.
- Update #261's title to "Rotterdam + Amsterdam: OVapi real-time with shared cache, measured
  timeout, live/timetable marker" and its body with the new verification.
