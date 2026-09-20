# Melbourne hazard pack (H1–H7 + board eligibility)

Evidence: `docs/melbourne-d1/oracle-clash-report.md` (Nico, 2026-08-29) plus
`docs/melbourne-d1/open-data-feed-and-eligibility.md` (Nico addendum, 2026-09-20, on the Open
Data Portal decision), `docs/melbourne-d1/vline-reservation-check.md` (V/Line reservation
verification, 20 Sep 2026), and `docs/melbourne-d1/tim-decisions-2026-09-20.md` (copy decisions
and the reconciliation instruction). Station graph is `docs/melbourne-d1/published-network.json`.

**SECOND PASS (20 Sep 2026):** the first pass's station graph was hand-transcribed from memory
with no browser/PDF/GTFS access and was confirmed wrong in several places (see
`docs/melbourne-d1/gtfs-reconciliation.md` for the full before/after diff). This pass downloaded
and read the official Victorian GTFS Schedule static feed (public, no key) and reconciled every
line's station list and order against it. The live official PDF map has still not been re-rendered
page-by-page (still no browser/PDF-fetch tool in this lane), but the GTFS check is a materially
stronger source for station membership/order than the first pass's pure transcription — remaining
open items are name-form spot-checks, not graph correctness.

## H1 — parent + child

D1 has no stopIds. Jim resolves GTFS `stop_id`/`parent_station` against the static feed's
folder 2 (Metropolitan Train) by name/alias match, never by inventing IDs here. Southern Cross
and Flinders Street are the two multi-platform buildings most likely to need parent-station
grouping once real GTFS is loaded.

**doNotGroup** (carried from the oracle report's hub-lock section, with Union's line attribution
corrected in this pass):
**Flinders Street** vs **Federation Square** (not a station — Town Hall's Swanston Street /
Young & Jackson walk-up) vs **Town Hall** vs **State Library** vs **Melbourne Central** vs
**Parliament** vs **Flagstaff** vs **Southern Cross Metro** vs **Southern Cross V/Line** vs
**North Melbourne** vs **Arden** vs **Union** (Belgrave/Lilydale, between Chatham and Box Hill —
see resolution below, NOT Pakenham/Cranbourne) vs **Richmond**.

**RESOLVED — "Union" (was an open item; oracle report's line attribution was wrong):** the oracle
report's doNotGroup entry read "Union (Pakenham/Cranbourne suburban, not Sydney)". The GTFS
Schedule static feed (folder 2, Metropolitan Train; see `gtfs-reconciliation.md`) confirms Union
is a real station (`stop_id vic:rail:UNI`, `location_type=1`, "Union Railway Station") on **both
Belgrave and Lilydale**, sitting between Chatham and Box Hill:
`Camberwell -> East Camberwell -> Canterbury -> Chatham -> Union -> Box Hill`. It is **not** on
Pakenham or Cranbourne — the oracle report's line attribution was simply wrong, not the station's
existence. It has been inserted into `published-network.json`'s `belgrave` and `lilydale`
`stations[]` arrays in the correct position, and the "unverified existence" flag on it is removed.
No corresponding station exists on the Pakenham/Cranbourne Metro Tunnel spine.

**Also GTFS-confirmed alias:** the official map's "Jolimont" (kept as the printed NAME FORM) is
spelled "Jolimont-MCG" in the GTFS feed (`stop_id vic:rail:JLI`). Record `Jolimont-MCG` as a
doNotGroup alias of `Jolimont`, not a separate station — this is the map-vs-GTFS name-form
difference the task brief called out by name; GTFS wins on membership/order, the map wins on
which spelling riders see.

**Also GTFS-confirmed, out of scope:** `routes.txt` has an 18th route_id, "City Circle"
(`aus:vic:vic-02-CCL:`, a Flinders Street-loop-Flinders Street shuttle), not one of the 17 named
lines on the current Metro Trains picker. Kept out of `lines[]` per the "published map wins for
line inventory" rule — see H3 below and `gtfs-reconciliation.md`.

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

- **Racecourse line (Showgrounds)**: printed Metro special-events station and line, race days /
  shows only — not a daily all-day spine. Kept on the map (dashed special-events print
  convention); do not timetable as regular weekday Metro service. **"Flemington Racecourse" as a
  separate calling point is an open item** — GTFS's `stops.txt` has no stop by that name, and the
  route's only calling pattern in the 2026-09-18 snapshot week is Flinders St / Southern Cross /
  North Melbourne / Showgrounds, even though the GTFS route's own `route_long_name` is "Flemington
  Racecourse Line". See `gtfs-reconciliation.md` — do not re-insert it without a snapshot that
  actually calls at it.
- **"City Circle" (GTFS `aus:vic:vic-02-CCL:`)**: a real short Flinders Street → Southern Cross →
  Flagstaff → Melbourne Central → Parliament → Flinders Street shuttle found in the GTFS feed, but
  not one of the 17 named lines on the current Metro Trains picker. Out of scope for `lines[]` per
  the published-map-wins-for-line-inventory rule; recorded here so Jim doesn't mistake a live
  `vic-02-CCL` trip_update for a bug.
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
| North Melbourne | Craigieburn (continues to Kensington/Newmarket) vs Racecourse (special-events spur, diverges before Kensington — CORRECTED this pass, was wrongly attributed to Newmarket, which Racecourse doesn't call) | gtfs-reconciliation.md |
| Newport | Werribee (direct or via Altona Loop) vs Williamstown | published-network.json |
| Town Hall | Sunbury's own GTFS route ends here; a through Sunbury-to-Cranbourne/-Pakenham working continues as a chained trip on the Cranbourne/Pakenham route from here (CORRECTED this pass — the first pass said the tunnel spine joined at Footscray/South Yarra; GTFS shows the actual join is Town Hall) | gtfs-reconciliation.md |
| Dandenong | Cranbourne vs Pakenham (Metro Tunnel spine east forks, sharing the whole Town Hall-Anzac-Malvern-Caulfield-Dandenong trunk before this point — CORRECTED this pass, the first pass's Cranbourne/Pakenham stations[] omitted that whole shared trunk); also a V/Line Gippsland-line stop (Traralgon `in`, Bairnsdale `in` per §6 this pass) | published-network.json + open-data-feed-and-eligibility.md + vline-reservation-check.md |
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

**SECOND PASS (20 Sep 2026):** the first pass's board-eligibility table (from
`open-data-feed-and-eligibility.md`) carried two `undecided` rows (Maryborough) and had marked
Shepparton/Bairnsdale/Swan Hill as flatly `out-reservation` on a note flagging that V/Line's own
FAQ actually describes those three as "a mixture of reserved and unreserved carriages." Both
questions are now resolved by `docs/melbourne-d1/vline-reservation-check.md` (V/Line's official
FAQ, https://www.vline.com.au/Information/FAQs/Question-1) and Tim's approach sign-off in
`tim-decisions-2026-09-20.md`. **No `undecided` rows remain.**

| Service | Compulsory reservation? | Verdict | Reasoning |
| --- | --- | --- | --- |
| Maryborough | No | `in` | V/Line FAQ lists Maryborough under "all other destinations" where reservations are not required — falls outside the five named reserved-seating services (Albury, Bairnsdale, Shepparton, Swan Hill, Warrnambool). Verified, not assumed. |
| Ararat | No | `in` | Same "all other destinations" grouping. Verified. |
| Echuca | No | `in` | Same "all other destinations" grouping. Verified. |
| Shepparton | No (mixed reserved/unreserved carriages) | `in` | V/Line's own FAQ describes this service as "a mixture of reserved and unreserved carriages" — a rider can walk up and board an unreserved carriage with a standard ticket. Per `docs/board-eligibility-rule.md` §2 test 1 ("a rider on the platform with a standard ticket... can board the next departure") and §6's optional-reservation clause (a service with SOME walk-up-boardable unreserved capacity is `in`, not `out-reservation`, because the reservation is optional for at least part of the train, not compulsory for the whole working), this is `in`, not `out-reservation`. |
| Bairnsdale | No (mixed reserved/unreserved carriages) | `in` | Same reasoning as Shepparton — "mixture of reserved and unreserved carriages" per V/Line's FAQ; optional reservation, not compulsory, so §6 applies. |
| Swan Hill | No (mixed reserved/unreserved carriages) | `in` | Same reasoning as Shepparton/Bairnsdale. |
| Albury | Yes (all seats reserved) | `out-reservation` | V/Line FAQ: "all seating is reserved." No unreserved walk-up capacity — compulsory, not optional. |
| Warrnambool | Yes (all seats reserved) | `out-reservation` | Same — "all seating is reserved," fully compulsory. |

**In-catalog calling points for each `in` V/Line service** (at the shared Metro stations recorded
in `open-data-feed-and-eligibility.md`):

- **Geelong / Ballarat / Bendigo / Seymour / Traralgon** (previously verified `in`): Southern
  Cross; Traralgon also at Flinders Street, Richmond, Caulfield, Clayton, Dandenong, Pakenham
  (Gippsland line); Bendigo/Geelong/Ballarat also at Footscray/Sunshine (Regional Rail Link);
  Seymour also at North Melbourne, Broadmeadows.
- **Maryborough**: Southern Cross, Footscray, Sunshine.
- **Ararat**: Southern Cross, Footscray, Sunshine.
- **Echuca**: Southern Cross.
- **Shepparton**: Southern Cross, North Melbourne, Broadmeadows.
- **Bairnsdale**: Southern Cross, Flinders Street, Richmond, Caulfield, Clayton, Dandenong,
  Pakenham (Gippsland line — same calling points as Traralgon, since Bairnsdale services are the
  longer-distance Gippsland-line workings that Traralgon services also use as an intermediate
  stop).

| Verdict | Unique services | Notes |
| --- | --- | --- |
| `in` | 10 | Geelong, Ballarat, Bendigo, Seymour, Traralgon (previously verified `in`) + Echuca, Ararat, Maryborough (verified `in` this pass) + Shepparton, Bairnsdale, Swan Hill (reclassified `out-reservation` → `in` this pass, per §6). |
| `out-reservation` | 2 | Albury, Warrnambool — fully compulsory reservation, no unreserved capacity. |
| `undecided` | 0 | None remain. |
| `out-mode` | — | Rail-replacement buses. |

(Counted by unique V/Line service, not by per-station occurrence — a service with multiple
calling points at shared Metro stations carries the same verdict at each. The source table in
`open-data-feed-and-eligibility.md` has the full per-station-pair breakdown.)

**Recommendation carried through (Nico's Option A, endorsed):** all V/Line walk-up-boardable
services get `in` verdicts (including the mixed-carriage Shepparton/Bairnsdale/Swan Hill services,
per §6) and are wired into the adapter via the second (V/Line) GTFS-R feed. Only the two
fully-reserved destinations (Albury, Warrnambool) stay excluded structurally (by route/destination,
never by dropping a shared station) per `docs/board-eligibility-rule.md`.

**Open items still held for Jim's live-verification pass (feed coverage, not eligibility):**
1. Whether the V/Line GTFS-R trip-updates feed actually carries Albury and Warrnambool departures
   (excluded anyway, but Jim should confirm the adapter's exclusion filter matches what the feed
   sends, not assume the feed omits them for free) and now also Shepparton/Bairnsdale/Swan Hill
   (newly `in` — must be confirmed present in the V/Line feed before they can appear on a live
   board, not assumed).
2. Whether trip_ids/stop_ids in either GTFS-RT feed match the static schedule "by the book" —
   still unverified; Jim's first live-verification pass (per `jim-handoff.md`) must settle it for
   both Metro and V/Line before wiring boards.

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
| "Union" (Belgrave/Lilydale, GTFS-confirmed between Chatham and Box Hill) vs a same-named station in another city | Resolved — see H1 above. |
| "Jolimont" vs "Jolimont-MCG" (GTFS spelling) | Same station; map form wins, GTFS form is an alias — see H1 above. |
| "City Circle" (GTFS route, not a picker line) vs the 17 named Metro lines | Out of scope for `lines[]` — see H3 above. |
| Parliament vs Flagstaff | Both City Loop, different lock roles per line group |
| Stony Point vs the Frankston electrified line | Diesel shuttle, no hub-lock stop of its own |
| Racecourse / Showgrounds vs the Craigieburn line | Special-events only, not daily service |
| Metro Center / Chicago Loop / Beurs / T-Centralen / Brunnsparken / Centraal Station / Waitematā Station | Other-city hub strings. Do not copy. |

## What I did not do

**Second pass:** downloaded and read the public GTFS Schedule static feed (folder 2, Metropolitan
Train) to reconcile the station graph — this was NOT done in the first pass. Still did not: run
any live API call (real or empty key), edit provider code, edit `registry.js`, flip the city live,
edit the oracle report, commit the downloaded GTFS zip to the repo (kept out of git per its size —
Jim must re-fetch), or make a product/copy decision beyond folding in Tim's already-recorded
decisions from `tim-decisions-2026-09-20.md` (no new copy calls invented here).
