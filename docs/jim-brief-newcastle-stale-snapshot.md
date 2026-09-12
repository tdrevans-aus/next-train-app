# Jim brief — Newcastle is down in production; GTFS refresh pipeline is failing

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `lib/providers/`
(including `lib/providers/newcastle.js` and `lib/providers/gtfs/`), `lib/gtfs-refresh.js`,
`.github/workflows/gtfs-refresh.yml`, `scripts/`, and `qa/`.

tim-review: no — this is a live-outage fix on a live city, not a product change. If the fix turns
out to require changing the `/api/next-train` response shape or rider-facing copy, stop and say so
in the PR rather than proceeding.

**Priority: this is a production outage on a live city, days before public launch.** It takes
precedence over the other open work.

Lane lock: this touches `lib/providers/` for a live city. Run `node qa/lane-lock.mjs check
"Australia"` first and `acquire "Australia" newcastle jim <branch>` before touching shared files.
It reported **free** at dispatch (top-level check, 10 Sep 2026).

## Symptom 1 — Newcastle returns HTTP 500 to riders

Reproduced against production twice, independently of the sweep that found it:

```
GET https://next-train-app.vercel.app/api/next-train?city=newcastle
    &station=Newcastle%20Interchange&direction=NLR%20%2B%20Newcastle%20Beach
    &destination=Newcastle%20Beach&leaveBefore=0&refresh=30&skipTrains=0

HTTP 500
{"error":"GTFS static snapshot is stale for \"newcastle\": only 0/31 realtime
  trip IDs resolved against the snapshot (< 50%)"}
```

`/api/directions?city=newcastle&station=Newcastle Interchange` returns 200 with
`["NLR + Newcastle Beach"]`, so the rider gets a selectable chip and then a hard error. Found by the
FB-64 production sweep (`docs/jim-brief-prod-sweep.md`, branch `prod-sweep-scheduled-check`), which
saw it error on three consecutive runs.

**`/api/health` and `/api/ready` both return 200** — the existing monitors cannot see this at all.

**0 of 31 is the number to explain.** A genuinely stale-but-valid snapshot would normally resolve
*some* trip IDs. Zero resolved out of thirty-one looks more like an ID-scheme mismatch between the
realtime feed and the static snapshot than simple age — which is the same class of failure Newcastle
had on 6 Sep 2026 (auth header sent to the public blob, PR #314). Establish which it actually is
before fixing: if the snapshot is merely old, the fix is in the refresh path; if the ID schemes have
diverged, the fix is in the adapter and the staleness heuristic is correctly reporting a real
mismatch with a misleading message.

Suspect files: `lib/providers/gtfs/board.js:339` (the heuristic and
`STALE_RESOLVED_SHARE_THRESHOLD`), `lib/providers/gtfs/errors.js:21` (the message),
`lib/providers/newcastle.js` (static + RT URLs and ID handling), and the snapshot publish path in
`lib/gtfs-refresh.js` / `lib/providers/gtfs/snapshot-manifest.js`.

## Symptom 2 — the GTFS large-feed refresh workflow has been failing daily

`.github/workflows/gtfs-refresh.yml` failed on both 8 and 9 Sep 2026 (the only two runs listed):

```
{ "city": "rotterdam", "ok": false,
  "error": "Vercel Blob: No blob credentials found. Pass a `token` option,
            set `BLOB_READ_WRITE_TOKEN`, or use `oidcToken` ..." }
Process completed with exit code 1
```

Two things are wrong here, and they may or may not be related to symptom 1:

1. **The `BLOB_READ_WRITE_TOKEN` secret is missing or no longer valid** in GitHub Actions. If the
   same credential problem affects the Vercel-side cron that refreshes the *other* Blob-backed
   cities (`api/health.js` → `lib/gtfs-refresh.js`), that is a direct candidate root cause for
   Newcastle's stale snapshot — and it would mean more cities go stale over the coming days.
   **Determine whether the Vercel cron path is healthy**; do not assume it is fine just because
   only Newcastle is failing today. Staleness is progressive.
2. **It still refreshes Amsterdam and Rotterdam, both retired** in the release-1 scope cut
   (`efefad1`). The workflow's whole stated reason for existing is those two cities' oversized
   shared OVapi feed. If no live city needs it, it should be removed rather than left failing
   daily; if a live city does need it, fix its city list. Decide from the registry, and say which
   in the PR.

**Do not paste, echo, or commit any credential value.** If the fix requires a secret to be rotated
or re-added, that is Tim's action — say exactly what he needs to do, and do not attempt it.

## Acceptance criteria

1. `GET /api/next-train` for Newcastle Interchange returns a real board (or an honest empty board
   outside service hours) instead of HTTP 500, verified against production or a preview deploy.
2. The PR states plainly which of the two causes was real — stale snapshot, or ID-scheme mismatch —
   with the evidence that settles it.
3. A QA script covers this failure mode so it cannot regress silently. Extend
   `qa/gtfs-snapshot-freshness.mjs` if it fits there; otherwise add a Newcastle-specific gate and
   register it in `qa/run-all.mjs`. It must fail if a live city's snapshot resolves under the
   threshold.
4. The refresh workflow either no longer fails daily, or is removed with the reasoning recorded —
   plus a clear statement of any secret Tim must rotate.
5. You have checked whether other live cities are heading for the same staleness, and said so
   either way. Name them if they are.
6. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite. `malmo-dogfood-gate.mjs` and `uppsala-dogfood-gate.mjs` are currently flaking inside
   batch runs with Sweden `ECONNRESET` and pass in isolation — known, unrelated.

## Handoff

Branch from master: `newcastle-stale-snapshot`. Commit, push, and open a normal (non-flip) PR
linking this brief, with the production reproduction and the after-fix verification in the
description. Copy this brief into your branch — it is untracked on master by design. Do not merge.
