# Jim brief — North East: Tyne and Wear Metro → `out-product` (no real-time feed), National Rail only

**Dispatched:** 5 Sep 2026 (Tim's decision, option 1 of the Metro design discussion) · **Lane:**
`united-kingdom`, region label `north-east-metro-out`, stage `adapter` · **Region:** `north-east`
(planned; stays planned). Copy this file into the repo as
`docs/jim-brief-north-east-metro-out-product.md` and commit it with the change.

## The decision

Tyne and Wear Metro has no public real-time feed (Nexus's `metro-rti` endpoint is undocumented
and app-only; the only public data is the static timetable inside the DfT BODS national archive).
Per the walk-up rule's precedent for Nottingham's NET tram (East Midlands, Tim 2 Sep 2026), the
app does **not** show a timetable dressed as a live board. Tim decided today:

- Metro board-eligibility verdict: **`out-product`** — reason "no confirmed real-time feed;
  static-timetable boards are not offered", pending a Nexus reply (Viv outreach draft in
  `docs/outreach-drafts/north-east-nexus.md`).
- The 1.46 GB DfT archive is **never** fetched by the app, at request time or in any job. The
  streaming parser (PR #253) stays as a general improvement; `MetroGtfsTooLargeError` is
  retired, not lifted.
- North East ships as **National Rail only** (Newcastle Central NCL, Sunderland SUN,
  Berwick-upon-Tweed BWK — all live-verified 5 Sep).

## What to change

1. `lib/providers/north-east.js`: replace `MetroGtfsTooLargeError` with
   `MetroFeedUnconfirmedError` modelled exactly on East Midlands'
   `NetFeedUnconfirmedError` (`lib/providers/east-midlands.js` ~line 63): same shape, same
   message pattern ("no confirmed real-time feed for Tyne and Wear Metro; board not offered"),
   thrown by `fetchMetroStopBoard()` before any network call. Remove the archive-download code
   path and the `metro-stops.json` loading if nothing else uses it (check; if the catalog
   dispatch needs the stopIds to resolve names, keep the file and only remove the fetch).
   Rewrite the file header: the 5.4 GB / `ERR_STRING_TOO_LONG` narrative becomes history in two
   sentences; the current state is "out-product, no RT feed, National Rail only".
2. `lib/cities/north-east/stations.json`: keep the 60 Metro entries in the catalog (so
   Newcastle Central's doNotGroup and Sunderland's shared-platform note still resolve, and so a
   future Nexus feed slots in without a catalog rebuild), but set `feeds.metro` to
   `"tyne-and-wear-metro-no-realtime-out-product"` and update the top-of-file prose to say the
   Metro board is not offered. Do not delete entries.
3. Direction model: `lib/cities/north-east/marketing-directions.js` stays (it is data, not a
   fetch) — leave untouched.
4. `qa/north-east-planned-gate.mjs`: assert Metro dispatch surfaces `MetroFeedUnconfirmedError`
   (mirror the East Midlands gate's NET assertion), remove any assertion on
   `MetroGtfsTooLargeError` or the archive. `qa/uk-region-catalog-conformance.mjs`: north-east
   counts stay 3+60 — confirm unchanged.
5. `lib/providers/registry.js` north-east entry: `integration` and `notes` prose only — replace
   the archive/string-limit paragraphs with the out-product decision (cite this brief and the
   ledger); keep everything about National Rail, Sunderland's shared platform, Berwick and
   Darlington as is. No `status` change.
6. `docs/united-kingdom-ledger.md`: in §3 add a row `Tyne and Wear Metro | out-product | no
   confirmed real-time feed; static-timetable boards not offered (Tim, 5 Sep 2026); pending
   Nexus outreach | all 60 Metro stations | this brief`; in §4 replace the Tyne and Wear Metro
   "GTFS too large" bullet with the out-product statement; append one Propagation-log row.
   Nothing else in the ledger; no `docs/north-east-d1/` edits.
7. `docs/expansion-tracker/cities.csv` North East row: notes → "National Rail only; Metro
   out-product (no RT feed), Nexus outreach drafted 5 Sep 2026". Status stays as is.

## Verification (report the output)

- `node qa/north-east-planned-gate.mjs`, `node qa/uk-region-catalog-conformance.mjs`,
  `node qa/east-midlands-dogfood-gate.mjs` (precedent, must be unchanged) pass.
- `node qa/gtfs-static-streaming.mjs` still passes (parser untouched).
- Check `netstat -ano | findstr :3000` before `node qa/run-all.mjs --smoke`; if held by another
  project, do not run smoke, say so, and rely on the named gates.

## Guardrails

- `node qa/lane-lock.mjs check united-kingdom` first (top level confirmed free); acquire
  `node qa/lane-lock.mjs acquire united-kingdom north-east-metro-out adapter`. Self-releases on
  merge.
- Own worktree from `origin/master`. No flips, no catalog deletions, no `uk-darwin.js`, no
  `static-cache.js`.
- One PR titled "North East: Tyne and Wear Metro out-product (no real-time feed), National Rail
  only".
