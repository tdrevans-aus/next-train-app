# Melbourne — GTFS reconciliation (second D1 pass, 20 Sep 2026)

## Feed used

**Transport Victoria Open Data Portal — GTFS Schedule** (public, no key needed).

- Dataset landing: https://opendata.transport.vic.gov.au/dataset/gtfs-schedule
- Resolved direct download (CKAN resource, found by fetching the landing page):
  `https://opendata.transport.vic.gov.au/dataset/3f4e292e-7f8a-4ffe-831f-1953be0fe448/resource/fb152201-859f-4882-9206-b768060b50ad/download/gtfs.zip`
- Downloaded 2026-09-20 to a scratch/temp directory outside the repo; **not committed** (large —
  the outer zip is ~293MB, folder 2 alone unzips to ~26MB of CSV). Jim must re-fetch for the live
  adapter build.
- The outer zip is a zip-of-zips: folders `1` (V/Line regional), `2` (Metropolitan Train — in
  scope for this pack), `3` (Tram), `4`–`11` (bus/coach/interstate/SkyBus). Only folder 2's
  `google_transit.zip` was extracted and read.
- **Publication date**: no `feed_info.txt` / `feed_version` field exists in this feed (same as
  recorded in the first pass and `open-data-feed-and-eligibility.md`). Evidence of currency used
  instead: the inner zip entry `2/google_transit.zip` carries an internal timestamp of
  **2026-09-18 08:12**, and `calendar.txt`'s earliest `service_id` (`T2`) has `start_date
  20260918`. Treat **2026-09-18** as this feed's effective date for change-driven refresh, per the
  Last-Modified-based staleness approach already recorded in `hazard-pack.md`.

## Method

For each of the 17 named Metro Trains route_ids in `routes.txt` (excluding the `-R` rail-
replacement-bus variants and the extra, unlisted `City Circle` route — see below), found every
`trip_id` on that route in `trips.txt`, joined to `stop_times.txt`, and took the trip with the
**most distinct stations** as the "longest typical pattern" for that line (collapsing
platform-level stop_ids to their `location_type=1` parent station name via `stops.txt`'s
`parent_station` field, and stripping the universal `" Railway Station"` suffix GTFS adds to every
name). Where a line's longest via-loop and longest direct patterns disagreed only by the four
City Loop / two surface-hub stations, the existing "direct baseline, loop documented separately"
convention from the first pass was kept (loop stations are not part of a loop-capable line's base
`stations[]`, per `cityLoop` and `direction-model-memo.md`). Two cases needed a second targeted
query beyond the single "longest trip" pick: Lilydale's East Richmond (present on a slightly
shorter-total-length trip, not the single longest one) and Werribee's direct-vs-Altona-Loop
variants (the single longest trip was the Altona Loop variant, which would have hidden the direct
alignment's own Laverton/Aircraft stations) — both cross-checked directly against the full trip
set for that route.

## Per-line diff (before -> after)

Stations in **bold** were missing from the first pass and have been added. ~~Strikethrough~~ marks
an item that was wrong (misspelled, mis-ordered, or not actually a station in this feed) and has
been corrected or removed.

| Line | Before (first pass) | After (this pass) | Fix |
|---|---|---|---|
| Sandringham | 14 stations | 14 stations (unchanged) | Match — no error. |
| Frankston | 23 stations | 28 stations | Added **Hawksburn, Toorak, Armadale** (South Yarra→Malvern) and **Parkdale, Mordialloc** (Mentone→Aspendale); fixed spelling ~~Glenhuntly~~ → **Glen Huntly**. |
| Glen Waverley | 16 stations | 16 stations (unchanged) | Match — no error. |
| Alamein | 10 stations | 14 stations | Added **Hawthorn, Glenferrie** (Burnley→Auburn) and **Burwood, Ashburton** (Hartwell→Alamein). |
| Belgrave | 23 stations | 27 stations | Added **Hawthorn, Glenferrie** (Burnley→Auburn), **Union** (Chatham→Box Hill), **Tecoma** (Upwey→Belgrave); fixed order ~~Canterbury, Chatham, East Camberwell, Box Hill~~ → **East Camberwell, Canterbury, Chatham, Union, Box Hill**. |
| Lilydale | 19 stations | 23 stations | Same Burnley-group fixes as Belgrave (Hawthorn, Glenferrie, Union, order fix) plus **Ringwood East** (Ringwood→Croydon). East Richmond retained (real, minority-served infill stop, confirmed by a separate trip query). |
| Hurstbridge | 22 stations | 24 stations | Added **West Richmond, North Richmond** (Jolimont→Collingwood). |
| Mernda | 22 stations | 25 stations | Same West Richmond/North Richmond fix, plus **Bell** (Thornbury→Preston). |
| Craigieburn | 17 stations | 18 stations | Added **Kensington** (North Melbourne→Newmarket). Also corrected the Racecourse branch point: GTFS shows the fork is near North Melbourne, not "at Newmarket" as the first pass said (Racecourse trains never call Newmarket or Kensington). |
| Upfield | 15 stations | 16 stations | Added **Moreland** (Anstey→Coburg). |
| Werribee | 12 stations | 14 stations | Added **Laverton, Aircraft** (Newport→Williams Landing) to the direct alignment, which the first pass omitted entirely. Altona Loop variant (Seaholme/Altona/Westona) confirmed to rejoin the direct alignment at Laverton. |
| Williamstown | 11 stations | 12 stations | Added **Williamstown Beach** (North Williamstown→Williamstown). |
| Racecourse | 6 stations (Flinders St, Southern Cross, North Melbourne, Newmarket, Flemington Racecourse, Showgrounds) | 4 stations (Flinders St, Southern Cross, North Melbourne, Showgrounds) | Removed ~~Newmarket~~ (route never calls it — see Craigieburn branch fix) and ~~Flemington Racecourse~~ (no stop by that name exists in this feed's `stops.txt`; not called by any trip in the 2026-09-18 week — see "Open items" below, not a confirmed deletion). |
| Stony Point | 10 stations | 10 stations (unchanged) | Match once read terminus-first (Frankston→Stony Point) to match `termini[]` — no error. |
| Sunbury | Full corridor Sunbury→Dandenong (with Footscray/Arden/Parkville/StateLibrary/TownHall/Anzac/SouthYarra/Caulfield/...Dandenong all under this one id) | Sunbury→Town Hall/State Library only (16 stations) | **Structural fix**: GTFS's Sunbury route_id never reaches past Town Hall/State Library — the whole Anzac→Dandenong trunk belongs to the Cranbourne/Pakenham route_ids, not Sunbury. Also added **West Footscray, Middle Footscray** (Footscray→Tottenham direction), which the first pass's merged list had omitted. |
| Cranbourne | Dandenong→Cranbourne only (4 stations) | Town Hall→Cranbourne (19 stations) | **Structural fix**: added the entire **Town Hall, Anzac, Malvern, Caulfield, Carnegie, Murrumbeena, Hughesdale, Oakleigh, Huntingdale, Clayton, Westall, Springvale, Sandown Park, Noble Park, Yarraman** trunk before Dandenong, which the first pass had wrongly folded into "sunbury" only. |
| Pakenham | Dandenong→Pakenham only (7 stations) | Town Hall→East Pakenham (24 stations) | Same structural fix as Cranbourne, plus added **Cardinia Road** (Officer→Pakenham) and **East Pakenham** (the actual current terminus beyond Pakenham), both entirely missing from the first pass. |

## Union — resolved

Confirmed by GTFS on **both Belgrave and Lilydale**, between Chatham and Box Hill:
`... Camberwell -> East Camberwell -> Canterbury -> Chatham -> Union -> Box Hill -> Laburnum ...`
(`stop_id vic:rail:UNI`... location_type=1 stop_name "Union Railway Station" — confirmed present
in `stops.txt`). It is **not** on Pakenham or Cranbourne. The oracle report's doNotGroup line
("Union (Pakenham/Cranbourne suburban, not Sydney)") was wrong about which lines it's on; see
`hazard-pack.md`'s corrected H1 entry. Tim's decisions memo speculated Union replaced Surrey Hills
and Mont Albert — this feed has no stops named "Surrey Hills" or "Mont Albert" at all on this
corridor, consistent with that read, but this pack does not assert a historical replacement claim,
only the current GTFS-confirmed position of Union itself.

## City Circle — not a line in this pack

`routes.txt` has an 18th Metro route_id beyond the 17 on the picker: `aus:vic:vic-02-CCL:`,
`route_short_name` "City Circle", `route_long_name` blank. Its only trips are a short
Flinders Street → Southern Cross → Flagstaff → Melbourne Central → Parliament → Flinders Street
loop (38 trips in the week sampled). This is not one of the 17 named lines on the current Metro
Trains picker (`metrotrains.com.au/maps/`, oracle report, 2026-08-29), so per the "published map
wins for line inventory" precedence rule it is **not** added to `lines[]` — recorded here and in
`published-network.json`'s `coverageGaps` as a hazard note only, in case Jim's live-verification
pass sees `route_id vic-02-CCL` in the realtime feed and needs to know it's deliberately excluded,
not a bug.

## Open items for Jim/Mark (unresolved by this pass)

1. **"Flemington Racecourse" as a distinct station.** GTFS's `stops.txt` has no stop named
   "Flemington Racecourse" at all (only "Showgrounds", `vic:rail:SGS`), and the Racecourse
   route_id's only calling pattern in this snapshot week is Flinders St → Southern Cross → North
   Melbourne → Showgrounds. The route's own `route_long_name` is literally "Flemington Racecourse
   Line", so the brand name is real, but a physical "Flemington Racecourse" platform serving
   regular timetabled trips in this particular week's data was not found. This could mean (a) the
   platform genuinely doesn't run scheduled GTFS trips outside race days and this snapshot week
   had none, or (b) the station has been decommissioned/renamed. Removed from `stations[]` per the
   "GTFS is evidence, fix it" rule rather than guessed back in; if Jim's live-verification pass (or
   a snapshot taken during a race meeting) shows it, restore it in the correct position (between
   North Melbourne and Showgrounds, per historical map layout) with a fresh citation.
2. **Live PDF page-by-page re-render** is still not done in this or the prior lane (no
   browser/PDF-fetch tool available here either). This pass substitutes a stronger check (GTFS
   station graph + order) for the station-membership/order risk the first pass flagged, but exact
   printed NAME FORMS beyond the ones already reconciled (Jolimont) have not been individually
   spot-checked against the live map image.
3. **`shortTurns`** — no short-turn codes were derived from GTFS in this pass (out of scope for
   this reconciliation, which targeted the full-line "longest typical pattern"). A short-turn pass
   would need per-trip clustering by common truncation point (e.g. Ringwood-turn Belgrave/Lilydale
   services), left for Jim's real timetable pass per hazard-pack.md H5.
