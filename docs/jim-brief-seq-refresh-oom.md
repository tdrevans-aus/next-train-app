# Jim brief — GTFS refresh still OOMs: the SEQ shared group (Brisbane + Gold Coast)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `lib/gtfs-refresh.js`,
`scripts/trim-brisbane-gtfs.mjs`, `scripts/trim-gold-coast-gtfs.mjs` (or wherever the SEQ trims
live), `lib/providers/gtfs/`, `vercel.json`, `api/health.js`, and `qa/`.

tim-review: no — continuation of the refresh-pipeline fix Tim approved on 11 Sep 2026.

Lane lock: `node qa/lane-lock.mjs check "Australia"` — check and acquire; this touches Brisbane and
Gold Coast's data pipeline.

## Where we are

Two fixes have landed and each moved the failure one step further along:

- **#361** — `@vercel/blob` import crash fixed. First successful step ever: Newcastle published.
- **#356** — retired Vancouver removed; refresh skips non-live registry cities.

Then the production cron was triggered on the #356 build at **14:20:45 UTC, 12 Sep**:

```
gtfs-refresh: newcastle: unchanged (last-modified Wed, 09 Sep 2026 15:00:15 GMT)
Vercel Runtime Error: instance was killed because it ran out of available memory
GET /api/health 500
```

Newcastle's change-detection now works (manifest exists → HEAD probe → skipped). The kill comes
**after** Newcastle. `gtfs/_refresh-status.json` was never written; Canberra, Brisbane and Gold
Coast still have no manifest.

## The suspect, with reasoning

Run order in `runGtfsRefresh()` on master: `STANDALONE` = `[canberra, newcastle]`, then
`SHARED_GROUPS` = `[SEQ_GTFS.zip → brisbane, gold-coast]`.

The SEQ group (`lib/gtfs-refresh.js` ~lines 313–372) downloads `SEQ_GTFS.zip` once into
`sharedBuffer`, then calls `entry.build(sharedBuffer)` **for each city** — two full decompress +
parse + trim passes over a ~32 MB zip (its inflated `stop_times.txt` is far larger), with the
original buffer still held, inside a **2048 MB** function (`vercel.json` `functions.api/health.js`).
The code comment says "confirmed working in production at default memory" — that claim predates the
pipeline ever completing a run and is now falsified.

Canberra is 96 KB (`Content-Length: 96842`) and cannot be the OOM. But **its manifest is absent
even though it runs first** — establish why. Either it logged a non-fatal failure that the log
filter hid, or the loop order differs from what I read. Do not leave that unexplained.

## What to do

**1. Confirm the mechanism locally before changing anything.** This one *can* be reproduced off
Vercel: run the SEQ download + `build()` for both cities under
`node --max-old-space-size=2048` and report peak RSS (`process.memoryUsage()` or `/usr/bin/time`).
If it exceeds ~2 GB, you have the cause; if it does not, say so and look elsewhere (e.g. Canberra's
trim, or an unbounded retry). Do not guess.

**2. Fix the memory shape, not just the ceiling.** Options, roughly in order of preference:

- **Parse once, trim twice.** Decompress and parse `SEQ_GTFS.zip` a single time, derive both cities'
  trimmed outputs from the one parsed structure, and release `sharedBuffer` before publishing.
- **Stream the trim** so `stop_times.txt` is filtered line-by-line rather than materialised.
- **Raise `memory` to 3009** (Pro maximum) in `vercel.json` as a *supplement* if the measured peak
  still exceeds 2 GB after the above — not as the fix on its own. State the measured peak so the
  number is justified.

Do **not** move SEQ back to a GitHub Actions workflow — that is what the deleted
`gtfs-refresh-large-feeds.mjs` was, it needed a `BLOB_READ_WRITE_TOKEN` secret that was missing, and
it costs Actions minutes we are now watching. Fix it in the function.

**3. Make partial progress survive.** Today one city's OOM loses every city's manifest and the
status record, because those are written at the end. Write each city's manifest as soon as that
city publishes (Newcastle's did survive, which suggests this is already partly true — verify), and
write the status record *incrementally* or in a `finally`, so a mid-run kill leaves a record saying
which city it died on. The next person diagnosing this should not need Vercel's runtime logs.

## Verification — honest limits

You cannot run the production cron and must not source `CRON_SECRET`. Prove the fix locally with the
measured peak RSS before/after under `--max-old-space-size=2048`, and by construction that the
status record is written even when a city throws mid-run. After merge I trigger the cron and check
for four manifests plus the status record.

## Acceptance criteria

1. Measured peak memory for the SEQ group, before and after, under a 2048 MB heap cap.
2. The Canberra manifest gap is explained (and fixed if it is a defect).
3. Per-city manifests and the status record survive a mid-run failure — proven by construction.
4. `lib/gtfs-refresh.js`'s `putImpl` threading and the registry-live skip are untouched.
5. All existing gates pass: `lib-bare-import-gate`, `gtfs-refresh-retired-city-skip-gate`,
   `gtfs-live-blob-snapshot-integrity` (nightly tier), and `node qa/run-all.mjs --smoke` with an
   explicit `timeout: 600000`. Do not run the full untiered suite.

## Handoff

Branch from master: `seq-refresh-oom`. Commit, push, open a normal PR linking this brief with the
memory measurements in the description. Copy this brief into the branch. Do not merge.
