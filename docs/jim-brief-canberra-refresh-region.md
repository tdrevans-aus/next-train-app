# Jim brief — Canberra daily GTFS refresh fails (403) from Vercel iad1; pin the cron function to syd1

mode: bug-fix / product
tim-review: no
lane: Australia / canberra (run `node qa/lane-lock.mjs acquire "Australia" canberra jim <branch>` before touching shared files; top-level `check "Australia"` was free at 13 Sep 2026 01:20 UTC)

## Symptom

The daily GTFS refresh (`lib/gtfs-refresh.js`, dispatched from `/api/health`'s cron branch, Vercel cron
`17 3 * * *`, region iad1) completed end-to-end for the first time on 12 Sep 2026 16:07 UTC. Every city
succeeded except Canberra:

```
download failed (403) for https://www.transport.act.gov.au/googletransit/google_transit_lr.zip
```

`gtfs/_refresh-status.json` therefore carries `ok: true, failed: 1` and will every day until fixed, and
`qa/prod-sweep.mjs`'s `checkRefreshStatus` only looks at `report.ok`, so this is *not* red anywhere —
it's exactly the kind of failure that becomes background noise. Nothing is broken for riders: the blob
snapshot `gtfs/canberra.zip` (feed_version 20260731) has calendar coverage to 2027-07-29.

## Root cause (confirmed 13 Sep 2026, triage on throwaway preview deployments — nothing written to the blob store)

Not a User-Agent check. `www.transport.act.gov.au` sits behind Cloudflare, and Cloudflare serves a
**managed JS challenge** to Vercel's US egress. Probe function (`fetch` with the same `Accept` header
`downloadZip` sends) results:

| Function region | HTTP | Evidence |
|---|---|---|
| iad1 (default) | **403** | `cf-mitigated: challenge`, `server: cloudflare`, `content-type: text/html`, body `<title>Just a moment...</title>` (5,712 bytes), `cf-ray: ...-IAD` |
| syd1 | **200** | `content-type: application/zip`, `content-length: 96842`, `cf-cache-status: HIT`, `cf-ray: ...-SYD`, body starts `PK` |
| Australian residential (curl) | 200 | same 96,842-byte zip |

Also confirmed on this project's plan: a **per-function** `regions` override deploys fine while the
project default stays iad1. Preview `next-train-p5qd1wbqr` had `functions["api/dev/probe.js"].regions =
["syd1"]` and nothing else: `/api/dev/probe` answered with `X-Vercel-Id: syd1::syd1::...` and got 200;
`/api/ready` on the same deployment answered `X-Vercel-Id: syd1::iad1::...` (still iad1). So the fix
does not need a project-wide region move. Vercel docs:
<https://vercel.com/docs/functions/configuring-functions/region#per-function-configuration>.

The 403 body is a challenge page, not a geo/ASN "error 1020" block, so an ACT open-data mirror is not
needed: the only documented alternative (Transport Canberra's MuleSoft GTFS API on the developer portal)
needs basic-auth keys we don't hold, which would be a Viv outreach item, not a fix. Do not go there.

## Fix (least fragile option)

1. `vercel.json`: add `"regions": ["syd1"]` to the existing `functions["api/health.js"]` block (it already
   sets `memory` and `maxDuration`). Do **not** add a top-level `regions` key — every other function
   stays on the project default (iad1). `vercel.json` can't carry comments, so:
2. `api/health.js` header comment: one short paragraph saying the function is pinned to syd1 in
   `vercel.json` because the Canberra upstream (Cloudflare in front of transport.act.gov.au) challenges
   US datacenter egress with a 403 `cf-mitigated: challenge`, pointing at this brief. Note that this
   also moves the UptimeRobot liveness check's function to Sydney — fine, it's still the same platform,
   but say so.
3. `lib/gtfs-refresh.js`: on the `canberra` `STANDALONE` entry, a comment with the failure signature
   ("403 whose body is a Cloudflare 'Just a moment...' page / `cf-mitigated: challenge` header means
   the function is not running in syd1 — check `vercel.json`, not the URL or UA").
4. Optional but cheap: in `downloadZip`, when `!response.ok`, include `cf-mitigated` (if present) in
   the thrown message, e.g. `download failed (403, cf-mitigated=challenge) for <url>`, so the status
   record itself says what happened next time. Keep the message prefix `download failed (<status>)`
   unchanged — `qa/gtfs-refresh-partial-status-gate.mjs` may match on it; check before changing.

No change to the `skipped` list. Canberra stays a refreshed city.

## Proof required (all three)

A. **Real code path from syd1, dry-run, on a preview deployment.** On a scratch commit (NOT in the PR),
   add a throwaway `api/dev/refresh-probe.js` that imports `refreshCityIfChanged` from
   `../../lib/gtfs-refresh.js` and `buildTrimmedFiles` from `../../scripts/trim-canberra-gtfs.mjs`, and
   calls `refreshCityIfChanged({ city: "canberra", url: <the ACT URL>, build, putImpl: dryPut })`
   where `dryPut` records `(pathname, byteLength)` into the JSON response and writes nothing.
   Pin that probe to syd1 the same way (`functions["api/dev/refresh-probe.js"].regions`). Deploy with
   `vercel deploy` (preview; the CLI is authenticated as tdrevans-7114; link with
   `.vercel/project.json` copied from `C:/Users/tdrev/Projects/next-train-app/.vercel/project.json`,
   `.vercel` is gitignored). Paste the probe's JSON (region, reason, dryPut records) into the PR
   description. Note `refreshCityIfChanged` first calls `probeUpstreamChanged` against the blob
   manifest — read-only, fine; if the manifest says "unchanged" and it short-circuits before
   downloading, pass whatever the function accepts to force the download, or call `downloadZip` +
   `build` directly and say which you did. Constraints: **never** call `/api/health` with a bearer
   token, never touch `CRON_SECRET`, `putImpl` must not write. State plainly in the PR that nothing
   was written to the production blob store. Remove the probe and the `.vercel` dir before the final
   push; function count is 11 of the Hobby limit of 12, so one probe fits.
B. **Offline QA gate**, new `qa/vercel-health-region-gate.mjs` (offline, no network): asserts
   `vercel.json` `functions["api/health.js"].regions` deep-equals `["syd1"]`, that there is no
   top-level `regions` key, and that the `canberra` `STANDALONE` entry's URL host is
   `www.transport.act.gov.au` (so if someone swaps the source, the gate's comment tells them the pin may
   be droppable). Register it in `qa/run-all.mjs` in both the smoke and release lists next to the two
   existing `gtfs-refresh-*` gates.
C. `node qa/gtfs-refresh-partial-status-gate.mjs`, `node qa/gtfs-refresh-retired-city-skip-gate.mjs`,
   the new gate, and `node qa/run-all.mjs --smoke` all pass. Paste the smoke summary line.

## Acceptance criteria

1. `vercel.json` pins only `api/health.js` to `syd1`; no other function's region changes.
2. Preview dry-run (A) shows Canberra downloading and building successfully from `syd1`.
3. New gate (B) exists, passes, is registered in smoke + release.
4. Comments in `api/health.js` and `lib/gtfs-refresh.js` explain the pin and the failure signature.
5. `--smoke` green; PR links this brief; PR is a normal PR (not `flip`), **not merged** by Jim. The
   production proof is the next cron run after merge (03:17 UTC daily): `gtfs/_refresh-status.json`
   should show `failed: 0` with a canberra result — say that in the PR description so whoever merges
   knows what to look for.

## Not in scope

- Moving the whole project to syd1 (product/latency decision for Tim, separate).
- Manual-refresh / `skipped`-list fallback — only if the pin somehow fails on the real cron, which the
  preview test says it won't.
- Making `prod-sweep` fail on `failed > 0` (worth doing, separate brief).
