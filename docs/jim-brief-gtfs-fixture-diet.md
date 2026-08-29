# Jim brief: GTFS fixture column diet (`qa/fixtures/*/gtfs/*.txt`)

**For:** Jim (implement)
**From:** Claude (repo-size review) / Tim (product)
**Date:** 29 Aug 2026
**Status:** Done (29 Aug 2026) — column diet applied to sydney, brisbane, rotterdam, vancouver, canberra, gold-coast, newcastle, auckland, wellington. Amsterdam's local fixture was migrated to Vercel Blob before this landed (see `docs/jim-brief-gtfs-data-platform-scale.md`) and still carries pre-diet columns — a small (~9.8MB raw) known gap, follow up if it matters.
**Related:** `docs/codebase-inventory.md` · `docs/dead-code-inventory.md` (D-12, resolved same day) · `docs/jim-brief-gtfs-data-platform-scale.md` (complementary — that brief removes the git/deployment size ceiling this one still lives under; do both) · `lib/providers/gtfs/static-cache.js` · `scripts/trim-*-gtfs.mjs` / `trim-sydney-gtfs.py`
**Out of scope:** Date-range/service-span trimming, route/mode filtering (already correct), rewriting the CSV parser, touching any non-fixture GTFS consumer (`melbourne.js` uses a live API, not these fixtures)

---

## 1. Why

`qa/fixtures/*/gtfs/*.txt` is **120MB tracked in git**, despite the directory name — it is not test-only data. `lib/providers/{amsterdam,rotterdam,vancouver,canberra,gold-coast,newcastle}.js` and `lib/cities/{sydney,brisbane}/dogfood-next-train.js` all load it directly at request time (`existsSync(FIXTURE_DIR) → loadGtfsStaticFromDirectory(...)`, else fall back to a live download). For these "tester-live" cities this checked-in snapshot **is** the production schedule source. It ships in every git clone and — since `.vercelignore` does not exclude `qa/fixtures/` (correctly, since deleting it would break those cities' APIs) — in every Vercel upload too.

**Size by city (tracked, `stop_times.txt` + `trips.txt` dominate):**

| City | Size | Notes |
|---|---|---|
| Sydney | 68.3 MB | T1–T9 + M1, full network |
| Brisbane | 13.7 MB | SEQ rail-only |
| Rotterdam | 12.6 MB | RET metro A–E |
| Amsterdam | 9.8 MB | GVB metro 50–54 |
| Vancouver | 9.0 MB | SkyTrain |
| Gold Coast / Auckland / Wellington / Canberra | <3 MB each | Already small |

The route/mode filtering these fixtures already do (rail-only, metro-only, etc. — see each `qa/fixtures/{city}/gtfs/README.md`) is correct and **should not change**. The bloat is column-level: every trimmed CSV keeps **every original GTFS column**, because `trim-*.mjs`'s `columnsByFile` map does `Object.keys(rows[0])` (pass-through) instead of an explicit allow-list, and `trim-sydney-gtfs.py` does the equivalent with `fieldnames=stop_time_fields`.

**Verified via grep across `lib/`, `scripts/`, and `qa/`** — the only fields ever read from these two tables:

| Table | Columns actually used | Columns never referenced anywhere |
|---|---|---|
| `stop_times.txt` | `trip_id`, `stop_id`, `stop_sequence`, `departure_time`, `arrival_time` (fallback only, `build-line-map.mjs:361`), `pickup_type` (`board.js:142`) | `stop_headsign`, `drop_off_type`, `shape_dist_traveled`, `timepoint`, `stop_note` |
| `trips.txt` | `route_id`, `service_id`, `trip_id`, `trip_headsign` | `shape_id`, `direction_id`, `block_id`, `wheelchair_accessible`, `route_direction`, `trip_note`, `bikes_allowed` |

(`direction_id` is read in `lib/providers/melbourne.js`, but Melbourne has no `qa/fixtures/melbourne/gtfs` directory — it's a live-API provider, unaffected by this change.)

Dropping the unused columns from `stop_times.txt` — the file that's 90%+ of the bloat — should cut roughly a third to half of its bytes (5 of 11 columns gone, several of them the widest: `stop_headsign` is free text, `shape_dist_traveled` is a float on every row). Exact savings depend on per-city string lengths; measure after generating, don't promise a number up front.

---

## 2. Decision (locked)

**Trim columns, not rows or date span.** No change to which routes, trips, stops, or calendar days are included — only which CSV columns survive into the checked-in fixture. Computed output (next-train times, headsigns, line maps) must be byte-identical before/after.

Do **not**:
- Touch `columnsByFile`/`fieldnames` for `stops.txt`, `calendar.txt`, `calendar_dates.txt`, `agency.txt`, `feed_info.txt`, `routes.txt` — these are already small (`stops.txt` largest at 261KB for Sydney) and not worth the risk.
- Shrink the feed date span or re-filter routes — that's already correct per-city and is a different (functional) decision, not a size one.
- Apply this to `qa/fixtures/rotterdam|auckland|canberra|gold-coast|newcastle|wellington/published-network.json` D1 oracle files — those are hand-transcribed map data, not GTFS, and untouched by this brief.

---

## 3. Implementation

### 3.1 Update each trim script's column allow-list

In every `scripts/trim-*-gtfs.mjs` (`amsterdam`, `rotterdam`, `vancouver`, `canberra`, `gold-coast`, `newcastle`, `auckland`, `wellington`) and `scripts/trim-sydney-gtfs.py` / `scripts/trim-brisbane-gtfs.mjs`, change the `stop_times.txt` and `trips.txt` column selection from pass-through to an explicit allow-list:

```js
"stop_times.txt": ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "pickup_type"],
"trips.txt": ["route_id", "service_id", "trip_id", "trip_headsign"],
```

Keep `arrival_time` (used as a fallback in `build-line-map.mjs`) even though `board.js` itself only reads `departure_time`.

If any single city's trim script has a local reason to need one more column (check its own `build-*-catalog.mjs` / `dogfood-next-train.js` path individually before assuming the generic list applies), add it for that city only — don't widen the shared list speculatively.

### 3.2 Regenerate fixtures

Each trim script needs its original source zip (Sydney/Brisbane/Rotterdam/Amsterdam/Vancouver READMEs list the exact source URLs). Re-run:

```bash
node scripts/trim-sydney-gtfs.mjs /path/to/full_greater_sydney_gtfs_static_0.zip
node scripts/trim-brisbane-gtfs.mjs
node scripts/trim-rotterdam-gtfs.mjs --zip=qa/tmp/gtfs-nl.zip
node scripts/trim-amsterdam-gtfs.mjs --zip=qa/tmp/gtfs-nl.zip
node scripts/trim-vancouver-gtfs.mjs --zip=qa/tmp/translink-gtfs.zip
node scripts/trim-canberra-gtfs.mjs
node scripts/trim-gold-coast-gtfs.mjs
node scripts/trim-newcastle-gtfs.mjs
node scripts/trim-auckland-gtfs.mjs
node scripts/trim-wellington-gtfs.mjs
node scripts/build-line-map.mjs --city=sydney
node scripts/build-line-map.mjs --city=brisbane
```

(Regenerate line maps for any city whose `build-line-map.mjs` reads these fixtures — check `lib/cities/*/line-map.json`'s `source` field for which cities that applies to.)

### 3.3 Verify byte-for-byte functional equivalence — this is the real gate, not the column grep

For each affected city, before replacing the committed fixture:

1. Snapshot current API output: run the relevant `qa/*-network-sweep.mjs` and `qa/*-dogfood-gate.mjs` scripts against the **old** fixture, save output.
2. Swap in the new column-trimmed fixture.
3. Re-run the same scripts, diff output. **Zero difference expected** — trip times, headsigns, station lists, line-map conformance must match exactly.
4. Run `qa/*-line-map-conformance.mjs` for each affected city.
5. Run `npm run test:web` (full suite) once all fixtures are swapped, since `lib/train-times-core.js` and the API layer sit downstream of every provider.

Do this **per city, one PR at a time** — don't batch all ten. Sydney and Brisbane are the highest-value and highest-blast-radius (production dogfood cities); do them first and separately from the smaller tester-live cities (Amsterdam/Rotterdam/Vancouver/Canberra/Gold Coast/Newcastle/Auckland/Wellington).

---

## 4. Acceptance

| Check | Pass |
|---|---|
| `columnsByFile`/`fieldnames` in each trim script is an explicit allow-list, not `Object.keys(rows[0])` pass-through | Yes |
| Regenerated `stop_times.txt`/`trips.txt` per city have only the listed columns | Yes |
| Network-sweep + dogfood-gate + line-map-conformance output identical before/after, per city | Yes, diffed |
| `npm run test:web` green after all cities swapped | Yes |
| Total `qa/fixtures/*/gtfs/*.txt` tracked size measurably smaller (`git ls-files -z qa/fixtures \| xargs -0 du -ch \| tail -1`) | Yes, report the before/after number |
| No provider/build script references a now-dropped column (re-run the grep from §1 against the new files) | Yes |

---

## 5. Also in this batch (already done)

`design/target-icon-pick.html` — confirmed zero references anywhere in the tree (grepped `*.js`/`*.html`/`*.json`/`*.mjs`), already flagged obsolete in `docs/codebase-inventory.md` D-12 ("FB-17 superseded"). Deleted 29 Aug 2026; `docs/codebase-inventory.md` D-12 updated to reflect it. No brief needed for this one — pure zero-reference deletion, unlike the fixture work above which touches production data and needs the verification pass in §3.3.

---

## Slack-ready (Tim → Jim)

> Jim — go `docs/jim-brief-gtfs-fixture-diet.md`. `qa/fixtures/*/gtfs/*.txt` is 120MB checked in and doubles as live production schedule data for six cities — don't touch rows/date-span, only drop the GTFS columns nobody reads (`stop_headsign`, `drop_off_type`, `shape_dist_traveled`, `timepoint`, `stop_note` from stop_times; `shape_id`, `direction_id`, `block_id`, `wheelchair_accessible`, `route_direction`, `trip_note`, `bikes_allowed` from trips). One city per PR, diff network-sweep/dogfood-gate output before vs after each swap — zero functional difference is the bar, not just "tests pass." Sydney + Brisbane first since they're the biggest and highest-risk. `design/target-icon-pick.html` already deleted, no action needed there.
