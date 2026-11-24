# Jim brief — Sydney snapshot: Metro section is 2024 data, and a weekly refresh can't keep up with TfNSW

tim-review: no (restores Metro; no copy, IA or API-shape change)
Lane: bug-fix / product mode. Country australia, city sydney: acquire the lane lock. **Don't start until
PR #553 (fix/sydney-rt-timeout-us-region) has merged.** It holds the Australia lock and touches
`lib/cities/sydney/dogfood-next-train.js`.

## Problem 1: Sydney Metro has no services in production
Found by Mark in his QA of #549 (comment https://github.com/tdrevans-aus/next-train-app/pull/549#issuecomment-7077620996).
He downloaded the published `gtfs/sydney.zip` (7.7 MB, built 21 Nov 2026). Its metro portion (route_type 401) is a **2024**
Sydney Metro static:
- `feed_info.feed_version 17092024-220045`
- trip ids like `101-02.160924.15.0435`
- calendar 20240915..20241226, so **0 services are active today**

Consequences:
- **No Metro trips on Vercel boards.** Tallawong still lists an `M1 Sydenham` chip from the catalog, but it has no trips behind it. This was already true before #549.
- **Metro live data can't match.** Live metro trip ids (`0277-001-…:1000`) never match, 0/35.
- **The snapshot's calendar reads `20240915..20261220`.** That is why the freshness check never noticed the stale Metro section: the Sydney Trains part keeps the overall range current.

`scripts/trim-sydney-gtfs.py` takes route_type 401 from the metro static zip that
`scripts/download-sydney-gtfs-zips.mjs` downloads (`SYDNEY_METRO_STATIC_URL` in `lib/providers/sydney.js`).
Unknown: is TfNSW's metro static endpoint itself serving 2024 data, or did we download it once and keep
it? Find out, using `TFNSW_API_KEY` from the main checkout's `.env.local`. The value is quoted there,
so strip the quotes and never print it.

NSW TrainLink at 0/252 is expected. Intercity routes ship in the sydneytrains zip, and the nswtrains zip
has no rail content (trim script note). Confirm that's still true. If nswtrains RT ids should be
matchable against something we publish, say so.

## Problem 2: a weekly, probe-less refresh breaks on every TfNSW timetable change
On 24 Nov, Jim (#553) found the published snapshot (feed 954.165, ids `1--A.954.165.116.B…`) resolved
**0/384** live trip ids. TfNSW had republished its timetable (now 954.170, ids `156N.954.170.12.A.8.…`)
within two days of our 21 Nov build. The Sydney unit in `scripts/refresh-hand-published-gtfs.mjs`
refreshes weekly with no probe, because the feed needs a key. So Sydney goes stale (503/500) after every
TfNSW timetable change until the next weekly run.

## Required changes
1. **Metro:** publish a current Metro section. Fix the download or trim at the right layer. If TfNSW's
   metro endpoint really is stale upstream, find the current official source (TfNSW Open Data
   portal), document it, and switch to it.
2. **Make a stale mode visible:** per-mode freshness. The Sydney snapshot's calendar check must fail
   (or the refresh must refuse to publish) when any included mode (sydneytrains, metro) has no active
   service today. One mode's current calendar must not hide another's expired one.
3. **Cadence:** refresh Sydney daily, or detect drift, e.g. a cheap authenticated check of TfNSW's
   current feed version or ETag, or a share of live trip ids that resolve. It must pick up a TfNSW
   republish within 24 h. Keep it inside the existing refresh workflow and its 30-min timeout. Keep
   Actions minutes in mind: one extra daily download of three ~100 MB zips is fine, hourly isn't.
4. Republish the Sydney snapshot with the fix and confirm production. The controller may already have
   force-refreshed Sydney by then; check the published `feed_info` first.

## Acceptance criteria
- Published snapshot: the Metro calendar includes today, and `feed_info` is current. Report the versions.
- Production in service hours: Tallawong → `M1 Sydenham` returns a `next` trip, ideally `realtime:true`.
  Central board still 200 with live Sydney Trains rows. The controller re-verifies.
- New QA, network-free: a snapshot fixture where one mode's calendar has expired must fail the
  per-mode check. It must go red on the current code, and Mark will mutation-check it.
- A refresh dry run shows the new cadence or drift decision for Sydney.
- Sydney gates, `node qa/sydney-vercel-realtime.mjs`, and `node qa/run-all.mjs --smoke` pass.

## Process
Worktree, branch `fix/sydney-metro-stale-and-cadence`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-sydney-metro-stale-and-refresh-cadence.md` (untracked in
the main checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it.
Leave Uppsala/Sweden files alone; another Jim owns them.
