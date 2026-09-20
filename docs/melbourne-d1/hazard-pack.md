# Melbourne hazard pack (H1–H7 + board eligibility)

Evidence: `docs/melbourne-d1/oracle-clash-report.md` (Nico, 2026-08-29) plus
`docs/melbourne-d1/open-data-feed-and-eligibility.md` (Nico addendum, 2026-09-20, on the Open
Data Portal decision). Station graph is `docs/melbourne-d1/published-network.json`, hand-
transcribed from established knowledge of the current Metro Trains network per the oracle's
named line groups and the Metro Tunnel project pages — **no browser/PDF-fetch tool was available
in this lane**, so the official PDF's bytes were not independently re-rendered here either (the
oracle report hit the same Cloudflare block). Flagged as an open item below, not silently assumed
correct.

## H1 — parent + child

D1 has no stopIds. Jim resolves GTFS `stop_id`/`parent_station` against the static feed's
folder 2 (Metropolitan Train) by name/alias match, never by inventing IDs here. Southern Cross
and Flinders Street are the two multi-platform buildings most likely to need parent-station
grouping once real GTFS is loaded.

**doNotGroup** (carried from the oracle report's hub-lock section, verbatim scope):
**Flinders Street** vs **Federation Square** (not a station — Town Hall's Swanston Street /
Young & Jackson walk-up) vs **Town Hall** vs **State Library** vs **Melbourne Central** vs
**Parliament** vs **Flagstaff** vs **Southern Cross Metro** vs **Southern Cross V/Line** vs
**North Melbourne** vs **Arden** vs **Union** (Pakenham/Cranbourne suburban, not Sydney) vs
**Richmond**.

**Open item — "Union":** the oracle report lists a doNotGroup entry "Union (Pakenham/Cranbourne
suburban, not Sydney)" alongside the other hub-adjacent names. This lane could not independently
confirm a station named "Union" on the current Metro Trains Pakenham/Cranbourne (Metro Tunnel
spine) line list against any source available in this environment — it is not part of the
established real-world Dandenong-corridor station list transcribed into
`published-network.json`. It has been carried into the doNotUse list as instructed so a future
name collision is still guarded against, but **it has not been inserted as a stations[] entry
anywhere**, since inventing its location would be guessing at the station graph. Jim/Mark:
resolve against the live GTFS static feed or the official map before flip — if "Union" doesn't
exist, drop it from the doNotUse list; if it does, place it correctly on the Metro Tunnel spine
and add its own doNotGroup note.

## H2 — Metro Tunnel and City Loop interchanges (physically separate stations)

- **Town Hall ↔ Flinders Street**: separate stations, walking transfer via the surface **Degraves
  Street Subway**. Not the same stop, not a parent/child pair.
- **State Library ↔ Melbourne Central**: separate stations, walking transfer via an **underground
  concourse**. Not the same stop.
- **Southern Cross**: one physical building shared by Metro Trains and V/Line long-distance.
  Recorded as a mode-level doNotGroup pair (Southern Cross Metro / Southern Cross V/Line) so a
  V/Line walk-up service at this stop is never silently dropped from, nor double-counted onto,
  the Metro board — see board eligibility section below.

## H3 — thin / event / overlay

- **Racecourse line (Flemington Racecourse, Showgrounds)**: printed Metro special-events stations
  and line, race days / shows only — not a daily all-day spine. Kept on the map (dashed
  special-events print convention); do not timetable as regular weekday Metro service.
- **Stony Point**: diesel shuttle off Frankston, confirmed a Metro line by the official PTV route
  page, not V/Line. No timetable overlay hazard beyond it having no hub-lock stop of its own.
- **Metro Tunnel opening (1 Feb 2026)**: not an overlay — a permanent routing change. Sunbury,
  Cranbourne and Pakenham no longer serve Flinders Street, North Melbourne, or the City Loop.
  Any pre-tunnel published map, screenshot, or cached rider-tools page that still shows these
  three lines running through Flinders Street is stale and must not be trusted over this pack.
- **Rail-replacement buses / service deviations (skipped stops, changed routes) / platform
  information**: the Open Data Portal's own spec says the Metro trip-updates GTFS-R feed does
  **not** carry any of these. A skipped-stop or platform-changed service will not be reflected in
  real time by this feed — recorded here as a live-board hazard for Jim, not something the
  adapter can silently correct for. See `open-data-feed-and-eligibility.md` §"Known coverage
  gaps".
- **Yarra Trams / buses (incl. Night Bus) / SkyBus / V/Line long-distance beyond the walk-up
  services / coaches / interstate / Melbourne Airport Rail / Suburban Rail Loop**: out of v1,
  per the oracle report's mode cut. None printed as open Metro Trains service on the current map.

## H4 — branches (doNotGroup candidates / fork points)

| node | branches | evidence |
| --- | --- | --- |
| Burnley | Glen Waverley (via Heyington) vs Alamein/Belgrave/Lilydale (via Auburn/Camberwell) | published-network.json Burnley group |
| Camberwell | Alamein (via Riversdale) vs Belgrave/Lilydale (via Canterbury) | published-network.json |
| Ringwood | Belgrave (via Heathmont) vs Lilydale (via Croydon) | published-network.json |
| Clifton Hill | Hurstbridge (via Westgarth) vs Mernda (via Rushall/Northcote) | published-network.json |
| Newmarket | Craigieburn (continues north) vs Racecourse (special-events spur) | published-network.json |
| Newport | Werribee (direct or via Altona Loop) vs Williamstown | published-network.json |
| Footscray | Metro Tunnel spine (Sunbury west leg) continues toward Arden; also a V/Line Regional Rail Link stop | published-network.json + open-data-feed-and-eligibility.md |
| Dandenong | Cranbourne vs Pakenham (Metro Tunnel spine east forks); also a V/Line Gippsland-line stop (Traralgon `in`, Bairnsdale `out-reservation`) | published-network.json + open-data-feed-and-eligibility.md |
| Frankston | Frankston line (electrified) vs Stony Point (diesel shuttle) | published-network.json |
| Southern Cross | Metro (all loop/direct groups) vs V/Line long-distance | oracle report §hub lock |

## H5 — nested short turns

No official nested short-turn codes analogous to Adelaide's GAW/SALIS were found for Melbourne in
the sources available to this lane. `shortTurns` arrays are left empty in
`published-network.json` pending a real timetable pass by Jim once the Open Data Portal feed is
verified live — do not invent short-turn codes here.

## H6 — inner city (where §3 lives)

Locked set: **Flinders Street** for every line group except the Metro Tunnel spine
(Sunbury/Cranbourne/Pakenham), which has no hub-lock stop after 1 Feb 2026. Shared inner
approaches: City Loop stations Flagstaff, Melbourne Central, Parliament; surface hub Southern
Cross; Metro Tunnel stations Arden, Parkville, State Library, Town Hall, Anzac. See
`direction-model-memo.md` for the full reasoning — this is the hardest part of the Melbourne pack
because the same physical Flinders Street lock does not apply uniformly across all 17 line
groups, unlike every other AU city packed so far.

## H7 — DST

**Australia/Melbourne observes DST (AEDT/AEST).** Do not copy the Perth/Brisbane/Adelaide
no-DST assumption used elsewhere in the AU static-join family — Melbourne is the first AU city
in this pipeline wave that needs DST-aware leave-by math.

## Static-join hazards (Open Data Portal / GTFS-RT)

Carried from `docs/melbourne-d1/open-data-feed-and-eligibility.md` and the oracle report:

- **Weekly GTFS republish** — the static schedule zip is republished weekly or as needed
  (Last-Modified was 2026-08-28 at oracle-report time). No `feed_version` field is documented;
  use the Last-Modified header for change-driven refresh, per the existing snapshot-freshness
  safeguards used by other AU static-join cities (`qa/gtfs-snapshot-freshness.mjs`,
  `lib/providers/gtfs/board.js`'s resolved-trip-id-share heuristic).
- **trip_id churn on republish** — because the feed is a rolling export, trip_ids are not
  guaranteed stable week to week. The realtime-to-static trip-id match rate must be watched the
  same way Newcastle's staleness bug was (`docs/jim-brief-newcastle-stale-snapshot.md`) — a
  sudden drop to near-zero resolved trip IDs is a strong signal of an ID-scheme mismatch or a
  stale snapshot, not silently ignorable.
- **Nested zip-of-zips** — the statewide GTFS download is a single zip containing per-mode
  folders, each with its own `google_transit.zip`. **Folder 2 = Metropolitan Train** is the only
  in-scope folder for this city id. Folder 1 (V/Line regional) is the second, separate feed used
  only for the walk-up V/Line services recorded in the board-eligibility section below — never
  extract folders 3–11 (tram, bus, coach, interstate, SkyBus) into this city's data.
- **Feed gaps confirmed by the portal's own documentation, not inferred**: the Metro trip-updates
  GTFS-R feed does **not** include rail-replacement buses, service deviations (skipped stops /
  changed routes), or platform information. Any of these three, if needed later, requires a
  different source — do not attempt to derive them from this feed.
- **Rate limits**: Metro Train 24 calls/60s with a 30s cache window; V/Line 20–27 calls/min with
  a 30s cache window. Jim's polling design must respect both, especially once V/Line's second
  feed is wired for the `in` services below.
- **Auth header casing**: `KeyID` (capital K, capital ID) — not `Key-Id`, not `apikey`. Verified
  from the portal spec in the addendum, distinct from the oracle report's earlier (also correct)
  observation that empty-key requests return 401 with `WWW-Authenticate: ApiKey` /
  `Failed to find key field: KeyId`.

## Board eligibility

Carried in full from `docs/melbourne-d1/open-data-feed-and-eligibility.md` (Nico, 2026-09-20).
Summary for the QA gate; the source file has the full per-station table and citations.

| Verdict | Count | Notes |
| --- | --- | --- |
| `in` | 24 | V/Line walk-up unreserved services (Geelong, Ballarat, Bendigo, Seymour, Traralgon, Echuca, Ararat) at Southern Cross, Flinders Street, Richmond, Caulfield, Clayton, Dandenong, Pakenham, North Melbourne, Footscray, Sunshine, Broadmeadows. |
| `out-reservation` | 16 | Albury, Swan Hill, Shepparton, Bairnsdale, Warrnambool — compulsory reservation. |
| `undecided` | 2 | Maryborough at Footscray and Sunshine — reservation status unconfirmed. **Must be resolved (verified `in`/`out-reservation`, or escalated to Tim) before any flip.** |
| `out-mode` | — | Rail-replacement buses. |

**Recommendation carried through (Nico's Option A, endorsed):** all V/Line walk-up services get
`in` verdicts and are wired into the adapter via the second (V/Line) GTFS-R feed. Reserved
services (`out-reservation`) and unverified feed-coverage rows stay excluded structurally (by
route/destination, never by dropping a shared station) per `docs/board-eligibility-rule.md`.

**Open items that hold the flip (per the rule's `undecided` = "must not survive to a live flip"):**
1. Maryborough reservation status at Footscray and Sunshine — unresolved.
2. Whether the V/Line GTFS-R trip-updates feed actually carries Albury, Swan Hill, and
   Warrnambool departures (marked "Unverified" coverage in the source table) — needs live
   verification once `VIC_OPENDATA_API_KEY` is available, not an assumption either way.
3. Whether trip_ids/stop_ids in either GTFS-RT feed match the static schedule "by the book" —
   the addendum records this as unverified; Jim's first live-verification pass (per
   `jim-handoff.md`) must settle it for both Metro and V/Line before wiring boards.

## doNotGroup proposals (full list for `line-map.json` / hazard tooling)

| candidate | reason |
| --- | --- |
| melbourne vs city=mel / ptv / vic | Do not invent a second city id |
| Flinders Street vs Town Hall | Separate buildings; Degraves Street Subway transfer only |
| Flinders Street vs Federation Square | Federation Square is not a station |
| State Library vs Melbourne Central | Separate buildings; underground concourse transfer only |
| Melbourne Central vs Town Hall | Melbourne Central is City Loop only; Town Hall is Metro Tunnel only |
| Southern Cross Metro vs Southern Cross V/Line | Same building, different operator/mode; per-service verdict, not a station split |
| North Melbourne vs Arden | Different stations; North Melbourne is City Loop-group only, Arden is Metro Tunnel spine only |
| "Union" (Pakenham/Cranbourne, per oracle report) vs a same-named station in another city | **Unverified existence — see H1 open item above.** |
| Parliament vs Flagstaff | Both City Loop, different lock roles per line group |
| Stony Point vs the Frankston electrified line | Diesel shuttle, no hub-lock stop of its own |
| Racecourse / Showgrounds vs the Craigieburn line | Special-events only, not daily service |
| Metro Center / Chicago Loop / Beurs / T-Centralen / Brunnsparken / Centraal Station / Waitematā Station | Other-city hub strings. Do not copy. |

## What I did not do

No generator run against GTFS, no live API call (real or empty key), no provider code edit, no
`registry.js` edit, no live city flip, no edit to the oracle report, no invented station
insertion for the unverified "Union" name, no product/copy decision on "via City Loop" /
"via Metro Tunnel" labelling (left for Tim per direction-model-memo.md).
