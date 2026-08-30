Uppsala D1 pack — generated from the actual `ul` GTFS Regional feed (not the Mälartågskartan
PNG). City stays **planned** until QA passes. Do not flip uppsala live from this pack.

Pack files: `docs/uppsala-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file. (Also `scripts/fetch-uppsala-gtfs.mjs`, the one-off tool
used to generate `published-network.json` from `ul.zip` — rerun it if the feed changes.)

## What's solid (cite: oracle-clash-report.md + published-network.json)

- **city=uppsala**, agency Mälardalstrafik (Mälartåg). V1 = Mälartåg regional rail only
  (route_type 100, agency "Mälardalstrafik"). No UL buses (route_type 700, 233 routes excluded).
  No SL-pendeln (route_type 100 but agency "Storstockholms Lokaltrafik AB" — that's SL Line 40,
  already in `docs/stockholm-d1/published-network.json`, correctly excluded here). No
  ersättningstrafik (no replacement route_ids found in the filtered set).
- **`published-network.json` was GENERATED from `ul.zip`** (Trafiklab GTFS Regional operator
  `ul`), filtered to route_type 100 + agency "Mälardalstrafik" — 3 route_ids, 356 trips analysed.
  Every station has real lat/lng from `stops.txt`'s parent (location_type 1) row — see
  `stationCoordinates` in the JSON, 19 stations, all with coordinates.
- **Hub lock: Uppsala C** — a parented cluster (30 platform children), both route_type 100 and
  700 call there, filter by mode not by parent membership.
- **doNotGroup at Uppsala C, Knivsta, AND Arlanda C** — SL-pendeln (SL Line 40) runs the
  identical Uppsala C → Knivsta → Arlanda C stop sequence before continuing to Stockholm. The
  oracle report only called out Uppsala C as shared; Knivsta and Arlanda C are shared too (found
  by reading SL-pendeln's own GTFS trip pattern in the same feed — not in the oracle report).
- **Direction-collapse hazard on route_id `9011313099300000`** (the Arlanda C / Märsta route):
  `direction_id` does not distinguish the two branches — both share Knivsta and both outbound
  trips land in `direction_id=1`. **Must resolve branch/far-end from `stop_headsign`, never
  `direction_id`.** Full detail in direction-model-memo.md and hazard-pack.md H4.
- **GTFS-RT TripUpdates confirmed live** with in-scope trips as of 2026-08-30 (oracle report).
  Uses `TRAFIKLAB_API_KEY_RT`, a separate key product from `TRAFIKLAB_API_KEY` — see
  `lib/providers/gtfs/auth.js`'s `requireTrafiklabRealtimeApiKey`/`trafiklabGtfsRtTripUpdatesUrl`.
- **Europe/Stockholm, HAS DST.**
- **License: CC0 1.0 Universal** (Trafiklab GTFS Regional) — redistribution/commercial use
  unrestricted, attribution not legally required (oracle report).

## What is still NOT solid — resolve at D2, don't wire around

1. **Station-graph gap, the important one**: the oracle report names four corridors (Gävle;
   Sala/Västerås/Eskilstuna; Stockholm-via-Märsta; Stockholm/Örebro-via-Arlanda), but the `ul`
   feed's own stop-level data only covers the UL-county segment of each. Västerås, Eskilstuna,
   Stockholm Central, Flemingsberg, and Örebro have **zero** stop_times rows and (for Örebro)
   zero mentions anywhere in this feed. `published-network.json`'s four `lines[]` entries are
   deliberately truncated at what the feed actually proves (Gävle C; Sala; Arlanda C; Märsta) —
   see each line's `note` field and the top-level `coverageGaps` array. Closing this needs either
   a second Trafiklab GTFS Regional operator feed (candidates: `sl`, or a Västmanland/Sörmland/
   Örebro-region equivalent) or the national `sweden.zip` bundle Malmö's oracle report used. Do
   not extend the board past Uppsala C's UL-side stops until that read happens — the far-end
   strings "Stockholm Central" and "Flemingsberg" are real (from `stop_headsign`) but have no
   backing coordinates in this feed.
2. **Route_id sharing**: the Arlanda C and Märsta lines in `published-network.json` both list
   `gtfsRouteIdsIfKnown: ["9011313099300000"]` — same id, not a typo. Any D2/D5 code that assumes
   one route_id maps to one line/corridor will break here; branch on `stop_headsign` instead.
3. **No H3 (thin/event/overlay) coverage** — the oracle report gave none, and no official print
   map or news copy was obtained this pass to check for seasonal reductions or engineering-work
   overlays the way Malmö's H3 found PågatågenExpress's summer pause. If Mälartåg has anything
   like that, it isn't captured here.
4. **Short-turn lists are single-snapshot indicative** (Tierp, Mehedeby, Morgongåva) — from one
   static-feed pull with no `calendar.txt`/`calendar_dates.txt` day-of-week analysis. D5 assertion
   tables should assert the actual per-trip `stop_headsign`, not this list.
5. **No printed Mälartågskartan station-name cross-check** — station display names in
   `stationCoordinates` are cleaned GTFS `stop_name` values (municipality parenthetical and
   redundant "station"/"Central" suffix stripped), not verified against any printed map string.
   If UI copy needs to match the official map's wording exactly, that check hasn't happened.

## Direction model

**Line + `stop_headsign`-derived far end ("Mälartåg mot `<far end>`"), never `direction_id` for
branch resolution on route_id `9011313099300000`.** The Gävle and Sala routes are `direction_id`-
clean and can use it safely as a coarse inbound/outbound filter. Worked §3 examples and the full
Arlanda/Märsta collapse analysis are in direction-model-memo.md.

## What I did not do

No `lib/providers/` or `registry.js` edit, no live flip, no UI wiring, no D5 assertion tables, no
second Trafiklab/GTFS-Sweden feed pulled to close the Västerås/Eskilstuna/Örebro/Stockholm-side
gap, no `calendar.txt` service-day analysis, no printed-map station-name verification, no edits to
any other city's pack.
