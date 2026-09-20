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
   of the same static zip for the schedule side) feeding only the walk-up services marked `in`
   (see hazard-pack.md's Board eligibility section, updated 20 Sep 2026): Geelong, Ballarat,
   Bendigo, Seymour, Traralgon, Echuca, Ararat, Maryborough, **and now also Shepparton, Bairnsdale,
   Swan Hill** (reclassified `out-reservation` → `in` this pass — these run mixed
   reserved/unreserved carriages, and the unreserved carriages are walk-up boardable, so per
   `docs/board-eligibility-rule.md` §6 they are `in`, not `out-reservation`) at the shared
   stations listed there. Exclude only the two fully-reserved destinations (Albury, Warrnambool)
   structurally — by route/destination, never by dropping the shared station — per
   `docs/board-eligibility-rule.md` and the Sydney precedent
   (`docs/sydney-d1/board-eligibility-intercity.md`'s `excludeRouteShortNames` pattern). No
   `undecided` rows remain to hold back — Maryborough is resolved `in`.
6. **Live-only boards, no scheduled-time fallback presented as live** — same rule as every other
   AU static-join city; if a trip can't be resolved live, it's absent from the board, not
   backfilled from the static timetable.
7. **Loop-vs-direct direction derivation and copy — Tim's decisions (20 Sep 2026), now build
   requirements, not open questions:**
   - Derive loop/direct from the trip's actual stop sequence against the static schedule (primary
     signal). GTFS's static `trips.txt` reliably carries a "via City Loop" string in
     `trip_headsign` for every loop-serving line group this pass sampled (Alamein, Belgrave,
     Craigieburn, Frankston, Glen Waverley, Hurstbridge, Lilydale, Mernda, Upfield all showed it
     consistently — see `gtfs-reconciliation.md`) — but this is the **static** schedule, not the
     **realtime** `trip_update` payload the adapter will actually poll; confirm the realtime feed
     carries the same signal before relying on it as anything more than a cross-check. The
     stop-sequence signal (Flagstaff/Melbourne Central/Parliament present or absent) remains
     primary; headsign is a cross-check only, never the sole source.
   - **Copy: append "via City Loop" as a plain suffix** to the line+terminus label (e.g.
     `Frankston Line + Frankston via City Loop`), never a chip/tag/parenthetical. Direct trains
     get **no suffix at all** — never render the word "direct".
   - **Show the suffix only at five stations**: Flinders Street, Southern Cross, Flagstaff,
     Melbourne Central, Parliament. Everywhere else on a loop-capable line, render plain
     `{Line} Line + {terminus}` regardless of loop/direct — both variants converge again outside
     those five stops.
   - **"Metro Tunnel" must never appear as a line name or qualifier** anywhere in the UI for
     Sunbury/Cranbourne/Pakenham, even though GTFS's own `trip_headsign` text for some
     Cranbourne/Pakenham-to-Sunbury through-workings literally contains "via Metro Tunnel" (see
     `gtfs-reconciliation.md`) — do not pass that headsign text through to the rider-facing label.
   - **Gate assertions Mark will check for:**
     (a) a test must fail if a Sunbury/Cranbourne/Pakenham-spine trip renders with a blank or
     missing terminus (bare `Sunbury Line` with no destination is a hard failure, per Tim's
     decision that the terminus must never be blank on this spine);
     (b) a test must fail if "via City Loop" appears anywhere other than at Flinders Street,
     Southern Cross, Flagstaff, Melbourne Central, or Parliament;
     (c) a test must fail if "via City Loop" is shown for a trip whose actual stop sequence does
     NOT include a City Loop station (Flagstaff/Melbourne Central/Parliament) — i.e. it must be
     derived per-trip, not applied to a whole line;
     (d) a test must fail if the string "Metro Tunnel" appears anywhere in a Sunbury/Cranbourne/
     Pakenham board label.
   See `direction-model-memo.md`'s "Decided (20 Sep 2026)" section for the full reasoning.
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

## GTFS facts for Jim's build (from this pass's static-feed reconciliation, 20 Sep 2026)

Gathered while reading folder 2 (Metropolitan Train) of the public GTFS Schedule zip to reconcile
the station graph — full method and per-line diff in `docs/melbourne-d1/gtfs-reconciliation.md`.
This is the STATIC schedule, not the realtime feed Jim will actually poll; treat these as
structural facts about the data shape, not a substitute for live verification (step 3 above).

- **No `feed_info.txt` / `feed_version` field** — confirms the existing note in
  `open-data-feed-and-eligibility.md`. Use Last-Modified / a snapshot date instead:
  this pass's downloaded zip has an internal `2/google_transit.zip` timestamp of
  **2026-09-18 08:12**, and `calendar.txt`'s earliest `service_id` (`T2`) has
  `start_date 20260918`.
- **17 route_ids, one per named picker line**, all shaped `aus:vic:vic-02-XXX:` — ALM
  (Alamein), BEG (Belgrave), CBE (Cranbourne), CGB (Craigieburn), FKN (Frankston), GWY (Glen
  Waverley), HBE (Hurstbridge), LIL (Lilydale), MDD (Mernda), PKM (Pakenham), RCE (Racecourse),
  SHM (Sandringham), STY (Stony Point), SUY (Sunbury), UFD (Upfield), WER (Werribee), WIL
  (Williamstown). Each also has a paired `-R` rail-replacement-bus route_id (e.g. `ALM-R:`) —
  exclude these from the Metro board entirely (mode cut, per `board-eligibility-rule.md`'s
  `out-mode`, not a station-graph concern). An 18th route_id, `CCL:` ("City Circle"), exists but
  is not one of the 17 picker lines — see hazard-pack.md H3; if this route_id ever appears in the
  realtime feed, it is expected and should be filtered, not treated as a data bug.
- **`trip_headsign` reliably names the terminus**, with a "via City Loop" suffix appended when
  the trip is via-loop, and "via Metro Tunnel" appended for Cranbourne/Pakenham-to-Sunbury
  through-workings — confirmed present in the static schedule for every loop-serving line group
  sampled. **Do not assume the realtime `trip_update` carries the same text** — Jim's live
  verification pass must confirm this for the GTFS-RT payload specifically before using headsign
  as anything more than a cross-check (stop sequence stays primary per direction-model-memo.md §3).
- **Parent-station / platform structure**: platform-level stops (`location_type` blank) carry
  `parent_station` pointing at a `location_type=1` row (the named station, e.g. stop_id
  `10117` "Jordanville Station" → `parent_station vic:rail:JOR` → `location_type=1`
  "Jordanville Railway Station"). `location_type=2` rows are entrances, `location_type=3` rows
  are generic access nodes (e.g. bike racks) — both also carry `parent_station` back to the
  same `location_type=1` row. Resolve boards to the `location_type=1` name/id, matched by
  name/alias against `published-network.json`, never by inventing stop_ids.
- **Sunbury/Cranbourne/Pakenham are three separate GTFS routes, not one spine route** — see
  `published-network.json`'s `sunbury`/`cranbourne`/`pakenham` entries and
  `direction-model-memo.md` §4. A single physical Sunbury-to-Cranbourne (or -Pakenham) working
  is two chained `trip_id`s under two different `route_id`s, joined at Town Hall. If the
  realtime feed's `block_id` (or an equivalent chaining field) is populated, use it to present
  one continuous journey rather than surfacing a phantom "change at Town Hall" to the rider.

## Open items carried from Luke's pack, still not resolved

1. **Station graph is now GTFS-verified for membership/order** (this pass fixed the first pass's
   omissions — see `gtfs-reconciliation.md`) but the live official PDF map has still not been
   re-rendered page-by-page (no browser/PDF tool in either lane so far). Remaining risk is limited
   to exact printed NAME FORMS beyond the ones already reconciled (Jolimont/Jolimont-MCG) — spot
   check before locking D5 assertion tables, but do not re-transcribe from memory.
2. **"Flemington Racecourse" as a distinct station** — GTFS's `stops.txt` has no stop by that
   name in the snapshot read this pass, and the route's only calling pattern that week was
   Flinders St / Southern Cross / North Melbourne / Showgrounds. Removed from
   `published-network.json`'s racecourse `stations[]` pending a snapshot taken during an actual
   race meeting. See hazard-pack.md H3 and gtfs-reconciliation.md.
3. **V/Line GTFS-R coverage unverified** for the newly-`in` Shepparton/Bairnsdale/Swan Hill
   (reclassified this pass — see hazard-pack.md's Board eligibility section) and for the two
   `out-reservation` destinations (Albury, Warrnambool) — confirm during the live verification
   pass (step 3), don't assume either direction. No `undecided` rows remain to hold back the
   wiring, but "resolved eligibility" is not the same as "confirmed present in the RT feed."
4. **trip_id/stop_id matching scheme between the RT feeds and the static schedule** is
   unverified per the portal documentation — confirm this as part of step 3, since it directly
   affects the snapshot-freshness heuristic's resolved-share threshold behaviour.
5. **`shortTurns`** are still empty arrays — no short-turn codes were derivable from this pass's
   "longest typical pattern" reconciliation; a real timetable pass is needed (hazard-pack.md H5).

Loop/direct copy format and "Metro Tunnel as a brand name" (previously open item 5 in this list)
are now DECIDED — see step 7 above and direction-model-memo.md's "Decided (20 Sep 2026)" section.
Board eligibility `undecided` rows (previously open item 3) are also resolved — no `undecided`
rows remain.

## What I did not do

No provider code written or edited (`lib/providers/melbourne.js` and `lib/providers/ptv/` are
untouched by this pack — Jim's job to replace). No `registry.js` edit. No live flip. No API key
requested, held, or pasted. No edit to the oracle report. No station inserted into
`published-network.json` without a traceable source. Downloaded the public GTFS Schedule zip to a
scratch/temp directory to reconcile the station graph, but did not commit it to the repo (large —
Jim must re-fetch for the live adapter build) and did not use it to fabricate or substitute for
the live realtime path (still blocked on `VIC_OPENDATA_API_KEY`, see "Current blocker" above).
