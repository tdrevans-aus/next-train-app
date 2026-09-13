# Jim brief — refresh pipeline hardening: status-record caching + function memory

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `lib/gtfs-refresh.js`,
`lib/providers/gtfs/blob-fixtures.js`, `qa/prod-sweep.mjs`, `vercel.json`, and `qa/`.

tim-review: no — Tim chose these two follow-ups on 13 Sep 2026. Lane lock: not required.

Two small changes, one PR. Both exist to keep the GTFS refresh pipeline trustworthy while Tim is
away 27 Sep – 9 Oct.

## 1. The status record is CDN-cached for 30 days, and the sweep trusts it

`lib/gtfs-refresh.js` `writeRefreshStatus()` (~line 129) writes `gtfs/_refresh-status.json` via
`putImpl(REFRESH_STATUS_BLOB_PATH, …)` with no cache option. Observed 12 Sep right after the first
complete run: the blob came back with `Cache-Control: public, max-age=2592000`,
`X-Vercel-Cache: HIT`, and a read 45 s after the final write still returned the mid-run snapshot.

`qa/prod-sweep.mjs` (~line 108) reads it with a plain `fetch(gtfsRefreshStatusBlobUrl())`. So the
monitor can read a month-old record and report the refresh healthy when it has been failing for
weeks — which defeats the record's entire purpose (`docs/jim-brief-gtfs-refresh-cron-crash.md`,
item 3).

Fix both ends:

- **Writer:** pass a short `cacheControlMaxAge` (60 s is fine) to `put` for the status record.
  Confirm the option name against the installed `@vercel/blob` (^2.8.0). Decide whether the
  per-city manifests `gtfs/<city>.json` need the same — `probeUpstreamChanged` reads them every
  run, and a stale manifest means a needless re-download rather than a missed one, so it is a
  cost question, not a correctness one. Say what you decided.
- **Reader:** cache-bust the sweep's fetch (a query parameter plus `cache: "no-store"`) so it never
  trusts an edge copy regardless of what the writer did.

**Do not add a bare `@vercel/blob` import in `lib/`** — that crashes in Vercel's bundle
(`docs/jim-brief-gtfs-refresh-cron-crash.md`); `putImpl` is threaded from `api/health.js` on purpose
and `qa/lib-bare-import-gate.mjs` will fail if you regress it. The `put` options travel through
`putImpl` unchanged.

## 2. Raise `/api/health` memory to the Pro maximum

`vercel.json` `functions["api/health.js"].memory` is 2048. Mark's review of #366 measured the full
`runGtfsRefresh()` shape at **1441 MB RSS / 1021 MB heap** — ~30% headroom. If TransLink's SEQ
feed grows, the refresh OOMs again with nobody watching. Raise it to 3009, the documented Pro
ceiling — verify the current documented maximum (Vercel docs, functions memory configuration) and
use that figure if it differs.

Set it **only in `vercel.json`**. A comment in `api/health.js` records that the in-file `memory`
export is silently ignored by the deployed `.vc-config.json`. Cite the measured peak in the commit.

## Acceptance criteria

1. By construction: write a status record through the real `writeRefreshStatus` path against a
   stubbed `putImpl`, and show the `cacheControlMaxAge` option reaches `put`.
2. By construction: the sweep's status fetch carries the cache-busting parameter and `no-store`.
3. `vercel.json` memory raised, with the documented ceiling confirmed and the measured peak cited.
4. `qa/lib-bare-import-gate.mjs` and `qa/gtfs-refresh-partial-status-gate.mjs` pass.
5. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite. Do not trigger the production cron or source `CRON_SECRET`.

## Handoff

Branch from master (`57b6325` or later): `refresh-status-cache-and-memory`. Commit, push, open a
normal PR linking this brief. Copy this brief into the branch. Do not merge.
