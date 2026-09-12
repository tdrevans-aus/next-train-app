# Jim brief — stop QA and CI burning Blob Data Transfer

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `qa/`,
`.github/workflows/`, `.github/scripts/`, `package.json`, `.gitignore`,
`lib/providers/gtfs/static-cache.js`, and `docs/go-live-ops.md`.

tim-review: no — Tim approved this work on 10 Sep 2026 after reviewing the Vercel usage figures.

Lane lock: not required — this touches no city's `lib/providers/<city>.js` adapter.

## Why this is urgent

The Vercel Blob store `next-train-gtfs` is **suspended right now**, and seven live cities
(sydney, brisbane, canberra, gold-coast, newcastle, malmo, uppsala) are returning HTTP 500 in
production because their GTFS static snapshots 403.

The cause is not billing failure and not a Vercel incident. We exhausted the Hobby plan's
**10 GB/month Blob Data Transfer** allowance — 10.46 GB, of which 100% is `next-train-gtfs`.
Essentially all of it was burned between 29 Aug and 10 Sep, with a 4.3 GB spike on 6 Sep and
~2.1 GB today. Those are the days of heaviest agent/CI activity.

Tim is upgrading to Pro (100 GB/month included, then $0.05/GB), which restores service. This brief
is about not doing it again — at current development intensity we would run at 45–60 GB/month
**before a single public user**, and production cold starts are still to come.

## Where the transfer actually goes

`lib/providers/gtfs/static-cache.js` caches in a per-process `Map`, so **every fresh Node process
re-downloads every zip it needs**. A full `qa/run-all.mjs --smoke` pulls roughly 100 MB — Malmö
alone is 28 MB and Uppsala 19 MB, plus Sydney, Brisbane, Canberra, Gold Coast and Newcastle. That
happens on every CI run on every PR push, and on every local smoke run an agent does. At ~100 MB a
run, 10.46 GB is about a hundred runs. That matches the observed pattern exactly.

**This is our own test traffic, not users.**

## Item 1 — QA and CI must stop pulling production blobs on every run

Make the dogfood gates read from a local source instead of the live blob store.
`qa/goteborg-dogfood-gate.mjs` already establishes the pattern with
`loadGtfsStaticFromDirectory`, so follow it rather than inventing a new mechanism.

Constraints:

- **Do not commit large binaries to git.** A 28 MB zip in the repo is not the answer.
- **The suite must pass with the blob store unavailable** — as it is right now. That is the test of
  whether you have actually fixed this. A gitignored local cache directory populated once and
  reused, plus an Actions cache in CI keyed on snapshot version, is the shape I would expect; if
  you find something better, take it and justify it.
- Where a gate needs only a fraction of a feed, prefer a small trimmed fixture over the whole zip.

**Last-known-good copies are preserved** at
`<scratchpad>/gtfs-snapshots-2026-09-10/` — `malmo.zip` (28 MB, real Samtrafiken, feed_version
2026-09-06), `uppsala.zip` (19 MB, same), and `newcastle-synthetic.zip` (the 2 KB dogfood fixture
that caused the Newcastle outage, useful as a negative test). The scratchpad path is in this
session's environment; ask if you cannot resolve it. These were pulled before the suspension and
are the only copies available while the store is down.

## Item 2 — the new integrity gate is itself a heavy consumer

`qa/gtfs-live-blob-snapshot-integrity.mjs` (added in PR #356, branch `newcastle-stale-snapshot`)
does a plain `await fetch(url)` of the **full zip for every live blob-backed city**, and it is
registered in the **smoke tier**. That adds ~100 MB of blob transfer to every CI run and every
local smoke run — it would materially worsen the exact problem this brief exists to fix.

That gate must still do its job: it is the thing that would have caught Newcastle's synthetic data.
But it does not need to run on every smoke. Move it to a scheduled cadence (the nightly workflow is
the obvious home) or make it fetch cheaply — an HTTP Range request for the zip's central directory
plus `feed_info.txt` would be a fraction of a full download. Choose one and justify it.

Coordinate with #356 rather than conflicting with it: that PR is Mark-approved and waiting only on
Tim's Newcastle republish. If your change touches the same file, say so clearly in your PR so the
merge order is obvious.

## Item 3 — measure the cache behaviour (do this only if the store is back)

Vercel charges Blob Data Transfer on a cache **miss**; cache HITs are free, and every one of our
blobs is under the 512 MB cache-eligibility limit. If our fetches consistently miss — plausible,
since `loadGtfsStatic` issues conditional requests and CI runners hit fresh edges worldwide — we are
paying full transfer on requests that should be nearly free.

Measure it: check the response headers on a real fetch for cache status, and report what fraction of
our requests are HITs. If they are mostly misses, say what would change that. **Do not guess** — if
the store is still suspended when you reach this item, skip it, say so in the PR, and leave it for a
follow-up. A measured answer later is worth more than a plausible story now.

## What must NOT change

- The FB-64 production sweep (`qa/prod-sweep.mjs`, PR #355) keeps hitting **real production** — that
  is the point of it. This brief is about test traffic, not monitoring.
- Do not weaken any gate's ability to detect a real problem. The separation to hold is: **CI tests
  our logic against local data; the prod sweep and the integrity gate test reality on a schedule.**
  Say explicitly in your PR how each gate you touch still fails when it should.
- `lib/api-rate-limit.js` stays as-is.

## Acceptance criteria

1. `node qa/run-all.mjs --smoke` completes without downloading GTFS zips from the blob store.
   Demonstrate it — the store is suspended, so a passing smoke run is itself the proof.
2. No large binary is committed to git. State what you added and its size.
3. The integrity gate no longer runs a full-zip fetch per smoke run; its real-world checking is
   preserved on a schedule or by a cheaper fetch.
4. An estimate, with your reasoning, of blob transfer per CI run before and after.
5. Item 3 either measured and reported, or explicitly deferred with the reason.
6. Every gate you touch still fails when the underlying condition is genuinely broken — show this by
   construction for at least one gate, not by assertion.
7. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite.

## Handoff

Branch from master: `blob-transfer-reduction`. Commit, push, and open a normal (non-flip) PR linking
this brief, with the before/after transfer estimate in the description. Copy this brief into your
branch — it is untracked on master by design. Do not merge.
