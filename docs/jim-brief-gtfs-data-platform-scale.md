# Jim brief: GTFS data platform for 309-city scale

**For:** Jim (implement, phased)
**From:** Claude (repo-size review) / Tim (product)
**Date:** 29 Aug 2026
**Status:** Phases 0, 1, and the Netlify decision are done (29 Aug 2026). Storage target: Vercel Blob (store `next-train-gtfs`, linked to this project). Netlify deprecated and removed. All 8 runtime-fixture-backed cities (sydney, brisbane, amsterdam, rotterdam, vancouver, canberra, gold-coast, newcastle) now fetch via `loadGtfsStatic({ url: gtfsFixtureBlobUrl(city) })` instead of a committed local fixture — `qa/fixtures/*/gtfs` dropped from 120MB to 2.5MB tracked in git. `qa/fixtures/auckland/gtfs` and `qa/fixtures/wellington/gtfs` remain committed on purpose: auckland's fixture is build-time-only (feeds `build-line-map.mjs`, never read at runtime — confirmed via grep, not part of this brief's scaling problem), and wellington isn't live yet. Phase 2 (compact index format) and the automated refresh job (§3.2's scheduled pipeline, item 6.5 in `docs/codebase-inventory.md`) remain **not started** — cities are on Blob but still refreshed by manually re-running `scripts/publish-gtfs-fixture-to-blob.mjs <city>` after a local `trim-*-gtfs` regeneration, same cadence as before, just a different destination.

**7 Sep 2026 update (`docs/jim-brief-sweden-static-429-and-key-leak.md`):** goteborg, malmo and uppsala joined the Blob-backed set — their static loaders were fetching straight from Trafiklab's quota-limited GTFS Regional static endpoint on every cold start / cache expiry, and a burst of traffic tripped the quota and 500'd every rider in Göteborg. They now fetch `loadGtfsStatic({ url: gtfsFixtureBlobUrl(city) })` the same as the 8 cities above; Trafiklab (`TRAFIKLAB_API_KEY`) is the publish source only, never fetched on the request path. Because these are downloaded zips rather than a committed fixture directory, they use a sibling publisher, `scripts/publish-gtfs-snapshot-to-blob.mjs <city>`, which downloads the real Trafiklab zip, strips it to the route_types/agencies the matching adapter keeps (to shrink the blob), and `put`s it at the same stable `gtfs/<city>.zip` pathname with `allowOverwrite`. There is still no scheduled refresh job for any Blob-backed city (same "not started" as the rest of this brief) — these three are refreshed the same manual way: re-run `node --env-file=.env.local scripts/publish-gtfs-snapshot-to-blob.mjs <city>` when Trafiklab's feed changes meaningfully. GTFS-RT TripUpdates stay on Trafiklab directly for all three (that endpoint didn't 429 and isn't cached/republished).
**Related:** `docs/jim-brief-gtfs-fixture-diet.md` (complementary, not a substitute — see §5) · `lib/providers/gtfs/static-cache.js` · `lib/cities/live-city-api.js` · `lib/providers/registry.js`
**Out of scope:** Native app / Capacitor bundle size (`webDir` is `public/`; `qa/fixtures` never ships in the APK/IPA — this is a server-only concern), rewriting the CSV parser or GTFS query logic, any change to computed schedule output

---

## 1. Why

Tim is planning to expand from ~18 cities to **309**. The current mechanism for the ~9 cities that run on committed static GTFS cannot get there — not "should be optimized," but a hard ceiling:

- Those 9 cities' `qa/fixtures/*/gtfs/*.txt` are **committed to git and bundled into every Vercel function deployment**. Vercel serverless deployments have a real size ceiling (order of 250MB compressed per function). Today's 9 cities are already ~118MB raw. 309 cities, even with the column diet in the companion brief applied, plausibly lands in the 1–5GB range if a reasonable fraction are metro/heavy-rail scale like Sydney. That doesn't fit regardless of column trimming — trimming buys time, not headroom.
- **Found in the process of writing this brief, independent of the scaling question:** the fixture-loading path has no cache. `loadGtfsStaticFromDirectory()` (`static-cache.js:201`) does a synchronous disk read + full CSV parse on **every call**, and `lib/cities/{sydney,brisbane,...}/dogfood-next-train.js`'s `fixtureStatic()` calls it with no memoization. Every single next-train request for these 9 cities re-parses their full stop_times/trips CSVs from scratch — for Sydney, that's re-parsing ~71MB of text per request. Contrast with the URL path: `loadGtfsStatic()` (`static-cache.js:285`) already has a `cacheByUrl` Map with TTL and `If-Modified-Since` support. This is a pre-existing perf issue, not something this migration introduces — worth fixing regardless of the storage decision (see Phase 0).

### Current state, accurately mapped (this took real tracing — `dogfood-next-train.js`'s name undersells what it does)

`api/next-train.js`, `api/board.js`, `api/destinations.js`, `api/directions.js`, `api/city-stations.js` all route through `lib/cities/live-city-api.js` ("Production routing for Sydney, Brisbane, Adelaide, and London on Vercel" — its own doc comment), which dynamically imports a per-city module. Two genuinely different patterns exist today, both already in production:

| Pattern | Cities today | Storage | Cache |
|---|---|---|---|
| **Committed fixture, file-first** (`dogfood-next-train.js` → `loadGtfsStaticFromDirectory(FIXTURE_DIR)`) | sydney, brisbane, amsterdam, rotterdam, vancouver, canberra, gold-coast, newcastle, auckland (9) | Git + deployment bundle | **None** — reparses every request |
| **Live URL fetch, no local file** (`loadGtfsStatic({ url })`) | adelaide, perth, melbourne, stockholm, uk-tfl, uk-darwin, uk-metro-wm (7) | Not in git at all | In-memory `Map` + TTL, already built |

The second pattern is the one that scales — it's already proven in production for 7 cities. The work here is retiring the first pattern, not inventing a new one. `wellington`'s fixture (0.6MB) is committed but not yet wired into `live-city-api.js`'s `MULTI_CITY_IDS` — it's pre-launch, gated on a D1 oracle per its README. Bring it up on the new pattern directly; don't onboard it onto the old one first.

**Dual deployment target:** `netlify/functions/` also exists (`next-train.js`, `directions.js`, `destinations.js`) but hasn't been touched since the app's very first single-city (Perth) release — it doesn't know about `live-city-api.js` or the multi-city registry at all. **Tim needs to decide: deprecate it explicitly, or bring it to parity.** This affects the storage choice below (a Vercel-proprietary store is a bad fit if Netlify has to keep working).

---

## 2. Decision (proposed — confirm before coding)

**Phase 0 (do first, independent of everything else — small, safe, immediately valuable):**
Add the same cache-by-key + TTL wrapper that `loadGtfsStatic()` already has, around `loadGtfsStaticFromDirectory()`. Keyed by directory path, same `DEFAULT_TTL_MS`. This alone fixes the "reparse 71MB per request" problem for today's 9 cities with no architecture change. Ship this regardless of what happens with Phases 1–2.

**Phase 1: stop committing GTFS data to git; make every city fetch-and-cache like the 7 already do.**
Move the 9 fixture-backed cities off `loadGtfsStaticFromDirectory(local path)` onto `loadGtfsStatic({ url })`, same as adelaide/perth/etc. today. The "url" doesn't have to be the original transit agency's endpoint (some, like Rotterdam/Amsterdam, come from a shared multi-agency OVapi zip that needs the existing route/mode trim applied first) — it should be **a trimmed snapshot re-hosted in object storage**, refreshed by a scheduled job instead of a person running `trim-*.mjs` locally and committing the result.

- Storage target: prefer something fetchable over plain HTTPS (S3, Cloudflare R2, or a Vercel Blob public URL) over anything that requires a platform-specific SDK — keeps the Netlify question open without blocking this work, and keeps `loadGtfsStatic()` unchanged (it already just does `fetch(url)`).
- Refresh job: a scheduled function (Vercel Cron, or GitHub Actions on a schedule) that re-downloads each city's upstream feed, runs the existing `trim-*.mjs`/`trim-sydney-gtfs.py` logic (plus the column diet from the companion brief) against it, and uploads the result to storage — replacing "Jim runs a script locally and opens a PR" with an automated pipeline. This is a genuine gap regardless of storage choice: manually refreshing 9 cities is already infrequent (Rotterdam's fixture is dated per-README, not continuously current); manually refreshing 309 is not going to happen, and stale schedules silently degrade instead of failing loudly.
- Once moved, delete the corresponding `qa/fixtures/{city}/gtfs/*.txt` from git — the whole reason this brief exists.

**Phase 2 (defer — only pursue if Phase 1's fetch/parse cost is measured to be a real problem at scale):**
Precompute a compact per-city index (binary or minified JSON: per-stop sorted departures by service pattern) at refresh time instead of shipping/parsing raw multi-column GTFS CSV per cold cache miss. This is a data-format change with real engineering cost — don't build it speculatively. Measure Phase 1 in production with a realistic subset of new cities first; if parse-on-cache-miss latency or storage egress cost is actually a problem, come back and scope this properly.

**Explicitly not doing:** standing up a relational database (Postgres/MySQL) or SQLite. The access pattern here is a point lookup (city + stop + time → next departures), not relational joins across cities or full-text search — a DB adds connection-pooling-in-serverless complexity and an operational dependency this app has never had, for no query benefit this access pattern needs. Revisit only if a future feature genuinely needs cross-city querying.

---

## 2.5 Finding from implementation (29 Aug 2026): `existsSync(FIXTURE_DIR)` is doing double duty

Before wiring any city, checked every call site of the pattern `existsSync(join(FIXTURE_DIR, "stops.txt"))`. In `lib/providers/{amsterdam,rotterdam,vancouver,canberra,gold-coast,newcastle}.js`, this check is used **twice** per file, for two different decisions:

1. Which static-schedule loader to call (`loadGtfsStaticFromDirectory` vs `loadGtfsStatic({url})`) — this is the one Phase 1 is meant to change.
2. Whether to attempt a live GTFS-RT fetch at all (`amsterdam.js:115`, `rotterdam.js:116`: `if (existsSync(...)) throw new Error("skip-national-rt")` — RT is explicitly skipped whenever the fixture path exists; `canberra.js:104`, `vancouver.js:125` have the equivalent). **In today's production deployment the fixture files ARE present** (they're committed to git and deployed), so this second check currently evaluates true for all of these cities — meaning **RT is currently disabled and these cities run static-schedule-only in production already**, not as a dev/test fallback.

Deleting the local fixture directory and switching only the first check would silently flip the second one too — enabling live RT fetch in production as a side effect of an infra migration, which is exactly the kind of change this brief's "byte-identical" verification bar is meant to catch. **Fix:** introduce an explicit `STATIC_ONLY` (or per-city equivalent) constant decoupled from file existence, defaulting to `true` to preserve current behavior, instead of deriving the RT-skip decision from `existsSync`. Re-enabling RT for a given city is a separate, deliberate product decision — not a side effect of where the static data is hosted.

---

## 3. Implementation sketch

### 3.1 Phase 0 — cache the fixture-directory path
In `lib/providers/gtfs/static-cache.js`, wrap `loadGtfsStaticFromDirectory` the same way `loadGtfsStatic` is wrapped: a `Map<directory, {data, loadedAt}>`, same `DEFAULT_TTL_MS`, same "return cached if fresh" check. No API change to callers.

### 3.2 Phase 1 — per city migration (one PR per city, same discipline as the fixture-diet brief)
1. Stand up the refresh job for that city: fetch upstream zip → apply existing route/mode trim (`trim-{city}-gtfs.mjs`) → apply column diet → upload to storage → note the resulting URL.
2. Change `lib/cities/{city}/dogfood-next-train.js` to call `loadGtfsStatic({ url: <stored-url>, ... })` instead of `loadGtfsStaticFromDirectory(FIXTURE_DIR, ...)`, matching the options `adelaide.js`/`perth.js` already pass.
3. Diff-verify output against the current fixture-backed response (same discipline as the diet brief §3.3) before deleting the git-committed copy.
4. Delete `qa/fixtures/{city}/gtfs/*.txt` from git once verified.

### 3.3 New cities (all 291 of them)
Onboard directly onto the Phase 1 pattern — never write a new `FIXTURE_DIR`-style local-file path again. `adelaide.js` / `perth.js` are the reference implementation for "how a new city provider should be wired."

---

## 4. Acceptance

| Check | Pass |
|---|---|
| Phase 0: `loadGtfsStaticFromDirectory` results cached with TTL; repeat calls within TTL don't re-read disk | Yes |
| Phase 1: Tim has picked a storage target and made the Netlify keep/deprecate call | Yes |
| Refresh job exists and runs on a schedule, not manually | Yes |
| Per city: output identical pre/post migration (network-sweep + dogfood-gate diff, per companion brief's method) | Yes |
| `qa/fixtures/{city}/gtfs/*.txt` removed from git once that city is migrated | Yes |
| No new city is onboarded using the old local-fixture pattern | Yes |
| No database dependency added | Confirmed absent |

---

## 5. How this relates to the fixture-diet brief

`docs/jim-brief-gtfs-fixture-diet.md` (column pruning) and this brief are **complementary, do both**: the diet shrinks bytes-per-city and is safe to do immediately at today's scale regardless of storage location. This brief removes the constraint that those bytes must fit inside a git repo and a Vercel function bundle at all. Diet alone doesn't survive 309 cities; storage migration without the diet still uploads/fetches more data than necessary. Order doesn't matter much — the diet's column allow-list can be folded straight into the Phase 1 refresh job's trim step instead of being a separate one-off regeneration, which would actually save a redundant pass if both are done close together.

---

## Slack-ready (Tim → Jim)

> Jim — go `docs/jim-brief-gtfs-data-platform-scale.md`. We're expanding to 309 cities and the current committed-GTFS-fixture setup hits a hard wall (Vercel function size limit) well before that, not just a "nice to optimize" thing. Good news: 7 of today's 18 cities (adelaide, perth, melbourne, stockholm, uk-tfl, uk-darwin, uk-metro-wm) already use the pattern that scales — live URL fetch + in-memory cache, nothing committed to git. The other 9 need to move onto that same pattern via a scheduled refresh job into object storage, instead of a person running a trim script and committing the output. Do Phase 0 first regardless (it's a one-file fix for a real bug: the fixture-file path currently reparses the full CSV on every request, no cache). Before Phase 1 code: I need a call on storage target (S3/R2/Blob) and whether Netlify functions are dead or need parity — both affect the design. No database — this is point lookups, not relational queries.
