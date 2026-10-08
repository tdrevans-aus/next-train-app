# Jim brief — every hand-published GTFS snapshot needs a scheduled, change-driven refresh (Melbourne went stale 6 Oct; Prague expires 11 Oct)

**Lane:** bug-fix / product mode, URGENT part 1. **Date:** 8 Oct 2026. **tim-review:** no. **Locks:** czechia before touching Prague's adapter; none for scripts/workflows only.

## Evidence
- Melbourne was down 6–8 Oct: `/api/board` → 500 "GTFS static snapshot is stale for melbourne: only 74/348 realtime trip IDs resolved (< 50%)"; `/api/directions` 500 at every station. The production sweep flagged it for 2 days (failing runs since 6 Oct 18:18 UTC) with nobody watching. The controller restored service on 8 Oct by rebuilding gtfs/melbourne.zip and gtfs/melbourne-vline.zip from the statewide Transport Victoria zip (2/ and 1/ google_transit.zip, keeping routes/trips/stop_times/stops/calendar/calendar_dates) and redeploying production to drop instances caching the stale copy. Script used: scratchpad only (not committed) — rebuild it properly as below.
- lib/gtfs-refresh.js (daily Vercel cron via /api/health) refreshes ONLY canberra, newcastle, brisbane, gold-coast. Snapshots read via `gtfsFixtureBlobUrl()` and published by hand with no refresh: **melbourne, melbourne-vline, dublin, prague, copenhagen, brussels, malmo, uppsala** (verify each against the registry's live list; ignore retired amsterdam/rotterdam/vancouver).
- **Prague's snapshot (PID feed span 20260928–20261011) expires 11 Oct 2026.** After that every Prague board goes stale.
- Stale detection throws GtfsSnapshotStaleError but does not evict the cached snapshot, so even after a fresh publish, warm instances keep the stale copy for up to the 6 h TTL.

## Fix
1. **First, before anything else:** republish Prague from a fresh PID_GTFS.zip with scripts/trim-prague-gtfs.mjs + publish (`--allow-live`), confirm the new calendar covers ≥ 14 days from today, and record it. Then commit a proper `scripts/trim-melbourne-gtfs.mjs` reproducing the controller's rebuild.
2. **Scheduled refresh:** one GitHub Actions workflow (daily is fine; check Actions minutes budget — docs memory: the hourly sweep alone was ~2× the free allowance in Sep) that, per city, does a cheap change check first (HEAD / ETag / Last-Modified / feed_info dates on the upstream) and only downloads + trims + publishes when changed or when the published snapshot's calendar ends within 7 days. Reuse the existing trim scripts (dublin, prague, copenhagen) and the new melbourne one; extend `.github/workflows/publish-gtfs-snapshot.yml` or add a sibling. Secrets needed (BLOB_READ_WRITE_TOKEN, per-city keys) — list exactly which the workflow requires; if a secret is missing in GitHub, the job must fail loudly, not skip silently.
3. **Evict on stale:** when the board join judges a snapshot stale, drop it from the in-memory cache (and the negative cache) so the next request re-fetches the Blob — bounded to at most one re-fetch per city per N minutes so a genuinely stale upstream doesn't cause a refetch storm.
4. **Alerting:** the production sweep detected Melbourne but nothing told anyone. Make a failing prod sweep raise a GitHub issue (or update one open "prod sweep failing" issue) with the failing city and error, so it shows up in Tim's notifications. No new paid services.
5. qa: a gate asserting every live city reading `gtfsFixtureBlobUrl()` is covered by the refresh workflow's city list (so the next city added can't be forgotten).

## Acceptance
- Prague republished and verified before merge (evidence in PR). Workflow run once by workflow_dispatch for all cities: unchanged cities skip cheaply, changed ones publish; log in PR. Stale-evict unit test. Coverage gate green. `node qa/run-all.mjs --smoke` PLAIN green.
- PR title: "Scheduled change-driven refresh for all hand-published GTFS snapshots + stale eviction + sweep alerting".
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline; Blob transfer is metered — publish only on change.
