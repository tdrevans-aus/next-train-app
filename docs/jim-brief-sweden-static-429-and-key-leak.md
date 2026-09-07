# Jim brief — Sweden: Trafiklab static 429 on every cold start, and the key leaks into API errors (6 Sep 2026)

**Dispatched:** 6 Sep 2026 (production sweep, evening) · **Lane:** Sweden (`goteborg`, `malmo`,
`uppsala`; shared `lib/providers/gtfs/`) · **Model:** sonnet (pinned; no override) · **Branch:**
`sweden-static-blob-and-redaction` from master (start after the `goteborg-bus-rows` PR has merged;
both touch `lib/providers/goteborg.js`).

## Symptom (production, 6 Sep 2026 ~18:20 UTC)

Every Göteborg `/api/next-train` call returned HTTP 500 with:

```
GTFS static download failed (429) for https://opendata.samtrafiken.se/gtfs/vt/vt.zip?key=<the real TRAFIKLAB_API_KEY>
```

Two defects in one line:

1. **Rate limit.** `lib/providers/goteborg.js` (and `malmo.js`, `uppsala.js`) load their static
   GTFS straight from Trafiklab on every cold start / cache expiry
   (`trafiklabStaticUrl()` in `lib/providers/gtfs/auth.js` line ~130). Trafiklab's GTFS Regional
   static endpoint is quota-limited; a burst of Vercel cold starts plus local gate runs tripped
   it, and once tripped **every** rider in that city gets a 500 until the window resets. The
   non-Swedish GTFS cities already avoid this: Canberra, Gold Coast, Newcastle, Amsterdam,
   Rotterdam, Vancouver load a snapshot from the public Vercel Blob store via
   `gtfsFixtureBlobUrl()` (`lib/providers/gtfs/blob-fixtures.js`), published by
   `scripts/publish-gtfs-fixture-to-blob.mjs` (see `docs/jim-brief-gtfs-data-platform-scale.md`).
2. **Secret leak.** `lib/providers/gtfs/static-cache.js` line ~439 and
   `lib/providers/gtfs/realtime.js` line ~23 interpolate the full request URL into the thrown
   `Error`, and `api/next-train.js` / `api/directions.js` return `error.message` to the browser.
   Any URL that carries a key in its query string (Trafiklab `?key=`, TransLink `apikey=`) is
   therefore exposed to every caller whenever the upstream fails. Tim is rotating the Trafiklab
   key separately; the code must stop leaking regardless.

## What to build

1. **Redaction (shared, all cities).** In `static-cache.js` and `realtime.js`, build the error
   message from a redacted URL: strip the query string entirely (or replace every query value
   with `…`). Add a tiny helper in `lib/providers/gtfs/` used by both, and a unit-style QA script
   `qa/gtfs-error-redaction.mjs` (register in `qa/run-all.mjs`'s smoke list) that asserts a
   failing fetch of `https://example.invalid/x.zip?key=SECRET` throws a message containing
   `x.zip` and not `SECRET`. Grep `lib/providers` for any other `throw new Error(` that embeds a
   URL and route it through the same helper.
2. **Blob snapshots for the three Swedish cities.** Switch `goteborg.js`, `malmo.js` and
   `uppsala.js` static loading to `gtfsFixtureBlobUrl("goteborg" | "malmo" | "uppsala")`, keeping
   Trafiklab as the *publish* source only. Note `scripts/publish-gtfs-fixture-to-blob.mjs`
   today zips a `qa/fixtures/<city>/gtfs` directory, not a downloaded feed — extend it (or add a
   sibling `scripts/publish-gtfs-snapshot-to-blob.mjs`) to download the real Trafiklab zip with
   `TRAFIKLAB_API_KEY`, optionally strip it to the `routeTypes`/agencies the adapter uses so the
   blob stays small, and `put` it at the same stable `gtfs/<city>.zip` pathname with
   `allowOverwrite`. Use the `BLOB_READ_WRITE_TOKEN` in `.env.local`. Confirm the published blob
   is what `loadGtfsStatic` expects, with any remaining `routeTypes` filtering still happening at
   load.
   If Trafiklab is still returning 429 when you publish, wait for the window rather than
   hammering it; say so in the PR if you had to. Keep the realtime (`TripUpdates.pb`) fetch on
   Trafiklab; that endpoint is not the one that 429'd.
3. **Refresh path.** Record in `docs/jim-brief-gtfs-data-platform-scale.md` (or the handoff files
   for the three cities) how the snapshot is refreshed, matching whatever the other blob cities
   do; if there is no scheduled refresh anywhere, say so in the PR rather than inventing one.
4. Each of the three city gates: assert the static source URL used is the blob URL (no
   `samtrafiken.se` in it) and that a live board still resolves with `.env.local` present.

Do not touch chips, registries, list files, or the Göteborg Västtrafik live path beyond the static
loader swap.

## Verify

`node --env-file=.env.local qa/goteborg-dogfood-gate.mjs`, `qa/malmo-dogfood-gate.mjs`,
`qa/uppsala-dogfood-gate.mjs`, `qa/gtfs-error-redaction.mjs`, `qa/live-city-lists-sync.mjs`, and a
direct `getMultiCityNextTrain` for Lerum Station → `Västtågen + Göteborg Central`, Malmö C and
Uppsala C toward any offered chip. Do not run the full smoke suite locally (port 3000 is held by an
unrelated dev server); rely on CI.

Lane lock: the top-level session checks `node qa/lane-lock.mjs check sweden` before dispatch; run
`acquire sweden goteborg jim sweden-static-blob-and-redaction` before editing. Open a normal PR
with the before/after error text (redacted) and the blob URLs in the description. Do not merge it.
