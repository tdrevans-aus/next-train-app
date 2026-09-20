# Melbourne — Jim handoff (D2+)

City stays **planned** until Jim wires and verifies the new feed, then Mark greenlights a flip.
**Not tester-live. Not live.** `assertCityLive("melbourne")` must still fail (registry already
has `melbourne` with `status: "planned"` — do not flip it here). Do not invent city=mel, city=ptv,
city=vic, or a second city id for V/Line. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates
untouched. No generator, no product edit, no live flip, no merge of other PRs, no API key
registered or pasted.

## The decision this pack encodes (Tim, 20 Sep 2026)

**Abandon the PTV Timetable API path.** The `devid`/`PTV_API_KEY` HMAC key never arrived
(tracker: Blocked since 29 Aug 2026, "No follow-up unless Tim says"). Melbourne moves onto the
**Transport Victoria Open Data Portal** instead — GTFS Realtime trip updates over the static GTFS
schedule, the same static-join shape already used for Sydney/Brisbane/Adelaide. New env var:
`VIC_OPENDATA_API_KEY`, header `KeyID` (exact casing). Full endpoint list, rate limits, and
licence are in `docs/melbourne-d1/open-data-feed-and-eligibility.md`.

**This supersedes, does not extend, the existing PTV adapter.** `lib/providers/melbourne.js` and
`lib/providers/ptv/` (HMAC client) are the old Timetable-API path and must be **replaced**, not
kept alongside the new one — the registry's `adapterReady: true` and
`integration: "PTV Timetable API v3 (HMAC devid+key)"` / `envKeys: ["PTV_DEVID", "PTV_API_KEY"]`
are all stale once this pack lands and should be updated to describe the GTFS-RT static-join
integration and `VIC_OPENDATA_API_KEY` instead. Do not leave both adapters wired side by side —
that's exactly the kind of two-source drift `docs/multi-region-coherence-problem.md` warns about.

## What to build

1. **Static-join adapter following the AU pattern** — model it on `lib/providers/adelaide.js` /
   `lib/providers/brisbane.js`: `loadGtfsStatic` against the Metropolitan Train folder (folder 2
   of the nested statewide zip — extract only that folder's `google_transit.zip`, never folders
   1/3–11), `fetchTripUpdates`/`indexTripUpdates` against
   `.../gtfs/realtime/v1/metro/trip-updates`, `buildBoardForStops` for the board assembly, and an
   auth helper analogous to `adelaideAuthHeaders`/`readAdelaideMetroApiKey` but for the `KeyID`
   header and `VIC_OPENDATA_API_KEY` env var (do not reuse Adelaide's `x-api-key` shape verbatim —
   header name and casing differ).
2. **Station catalog**: build `lib/cities/melbourne/stations.json` from
   `docs/melbourne-d1/published-network.json`'s per-line `stations[]` arrays (order preserved),
   the same way Boston's 125-station catalog was built from its own `published-network.json`
   (`docs/boston-d1/jim-handoff.md`'s Jim→Mark note). Populate `aliases[]` only for genuine
   map-vs-GTFS name renames found once the real static feed is loaded — do not guess renames from
   this pack alone.
3. **First step, before anything else: live verification that Metro trip-updates carry real-time
   data for every line.** At the time of writing, empty-key GTFS-RT probes return 401 and the
   real `VIC_OPENDATA_API_KEY` returns **401 from the gateway even when set** — live verification
   is currently blocked on Transport Victoria (see "Current blocker" below). Once a working key is
   available, confirm the trip-updates feed actually resolves live trips for **every** one of the
   17 line groups, not just a sample — the Metro Tunnel spine (Sunbury/Cranbourne/Pakenham) and
   Stony Point's diesel shuttle are the two most likely to be thin or absent in a first pass.
   **If any line group has no live coverage, stop and report it rather than shipping a board that
   silently falls back to nothing for that line** — this is a variant of the same
   "0 of N trip IDs resolved" failure class documented in
   `docs/jim-brief-newcastle-stale-snapshot.md`; treat a suspiciously low or zero match rate as
   a signal to investigate the ID-scheme match, not just feed age.
4. **Snapshot-freshness safeguards** — wire this city into the existing staleness heuristic
   (`lib/providers/gtfs/board.js`'s resolved-trip-id-share check, `STALE_RESOLVED_SHARE_THRESHOLD`,
   and `qa/gtfs-snapshot-freshness.mjs`) rather than inventing a new one. The Open Data Portal's
   static feed is a rolling weekly-or-as-needed republish with no `feed_version` field — use
   Last-Modified for change-driven refresh detection, same as recorded in hazard-pack.md.
5. **V/Line second feed for the `in` services** — wire
   `.../gtfs/realtime/v1/vline/trip-updates` as a **second, separate** realtime source (folder 1
   of the same static zip for the schedule side) feeding only the walk-up services marked `in` in
   `docs/melbourne-d1/open-data-feed-and-eligibility.md` (Geelong, Ballarat, Bendigo, Seymour,
   Traralgon, Echuca, Ararat) at the shared stations listed there. Exclude the `out-reservation`
   destinations (Albury, Swan Hill, Shepparton, Bairnsdale, Warrnambool) structurally — by
   route/destination, never by dropping the shared station — per `docs/board-eligibility-rule.md`
   and the Sydney precedent (`docs/sydney-d1/board-eligibility-intercity.md`'s
   `excludeRouteShortNames` pattern). **Do not wire the Maryborough `undecided` rows either way**
   until they're resolved (see "Open items" below) — an `undecided` verdict must not reach a live
   board.
6. **Live-only boards, no scheduled-time fallback presented as live** — same rule as every other
   AU static-join city; if a trip can't be resolved live, it's absent from the board, not
   backfilled from the static timetable.
7. **Loop-vs-direct direction derivation** — implement `direction-model-memo.md` §3: derive
   loop/direct from the trip's actual stop sequence against the static schedule (primary signal),
   cross-check against headsign text only once verified live that the Open Data Portal's
   `trip_update`/`trips.txt` payloads carry it reliably (currently unverified — part of the live
   verification pass in step 3). No timetable-based guess when the live trip can't be resolved.
8. **Flip follow-through, held until Mark is green** (per the current guardrails — bundle at flip
   time, not before): dogfood module + `live-city-api.js` dispatch wiring, a
   `melbourne-dogfood-gate.mjs` registered in `qa/run-all.mjs`, station coordinates, a
   `coverage.json` entry, and the 8-list flip recipe from `docs/boston-d1/jim-handoff.md`'s "Flip
   commit — exact edits" section (registry status flip, `MULTI_CITY_IDS` in `live-city-api.js`,
   `NEARBY_MULTI_CITY_IDS`/`LIVE_CITY_IDS` in `app.js`, `MULTI_CITY_IDS` + picker `comingSoon` in
   `city-session.js`, `brisbane-dogfood.js`'s `MULTI_CITY_IDS`/`available` map,
   `PERSISTED_CITY_IDS`/`PERSISTED_COUNTRY_IDS` in `journey-model.js`, `CITY_BOUNDS`, and
   `country-regions.js`) — Melbourne already has an `Australia` country entry live via Sydney/
   Brisbane/Adelaide, so most of the country-level plumbing (picker country, `CITY_BOUNDS` family,
   `country-regions.js`) should already exist; confirm rather than re-add.

## Current blocker (as of this pack, 20 Sep 2026)

**`VIC_OPENDATA_API_KEY` returns 401 from the gateway.** Live verification (step 3 above) is
blocked on Transport Victoria — this is not a code problem to work around; it needs either a
valid key from the Open Data Portal signup (https://opendata-signup.transport.vic.gov.au/) or
confirmation from Tim that the currently-held key is expected to work and the 401 is a portal-side
issue worth following up on. **Do not substitute the no-key static GTFS zip for the realtime
path, and do not fabricate a board from static-only data** — that would violate the live-only
rule this whole pipeline enforces. Stop and report if the 401 persists once a key is confirmed
correct; this is exactly the kind of Nico-to-Viv escalation this pipeline exists for if the
portal itself is the blocker rather than the key value.

## Open items carried from Luke's pack, not resolved here

1. **"Union" doNotGroup entry** (hazard-pack.md H1) — carried from the oracle report but its
   existence as an actual Melbourne station could not be confirmed in this lane (no browser/PDF
   tool). Resolve against the live static GTFS feed once loaded; if it exists, place it correctly
   on the Metro Tunnel spine's stations[] and note its doNotGroup pairing; if it doesn't, drop it
   from `published-network.json`'s `doNotUse` list.
2. **Station graph needs a page-by-page diff against the live official map** — this pack was
   hand-transcribed from established network knowledge, not a fresh PDF render (no browser/PDF
   tool in this lane; the oracle report hit the same Cloudflare block on the PDF host). Treat
   `published-network.json`'s `stations[]` arrays as a strong first draft, not verified-by-image
   the way Washington/Boston's map crops were — spot check station order and names, especially
   the Northern group (Craigieburn/Upfield/Werribee/Williamstown) and Burnley group branch points,
   before locking D5 assertion tables.
3. **Board eligibility `undecided` rows** — Maryborough at Footscray and Sunshine. Must not reach
   a live board either way until resolved.
4. **V/Line GTFS-R coverage unverified** for Albury, Swan Hill, Warrnambool, and Maryborough (if
   ultimately reserved) — confirm during the live verification pass (step 3), don't assume either
   direction.
5. **Loop/direct copy format** (direction-model-memo.md §2) and **"Metro Tunnel" as a brand name**
   (§4) both need Tim's decision before D5 tables for the loop-serving line groups are written.
6. **trip_id/stop_id matching scheme between the RT feeds and the static schedule** is
   unverified per the portal documentation — confirm this as part of step 3, since it directly
   affects the snapshot-freshness heuristic's resolved-share threshold behaviour.

## What I did not do

No provider code written or edited (`lib/providers/melbourne.js` and `lib/providers/ptv/` are
untouched by this pack — Jim's job to replace). No `registry.js` edit. No live flip. No API key
requested, held, or pasted. No edit to the oracle report. No station inserted into
`published-network.json` without a traceable source.
