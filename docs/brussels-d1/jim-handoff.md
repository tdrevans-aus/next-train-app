Brussels D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Rotterdam is cut #1 and **untouched**. Melbourne stays planned. Sweden / Stockholm / Göteborg / Malmö / Uppsala stay planned and **untouched**. Washington / Helsinki / Berlin / Munich / Hamburg / Oslo stay planned and **untouched**. **assertCityLive("brussels") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip brussels live from this pack. Do not edit Perth. Do not invent city=bru, city=bruxelles, city=stib, or city=belgium. Sweden out.

Drop later (Jim D2): qa/fixtures/brussels/published-network.json. Research pack is docs/brussels-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

## Horizon investigation (20 Sep 2026) — docs/jim-brief-brussels-horizon-and-sncb-directions.md Part A

Symptom: the live STIB metro board shows 1-2 trains per direction, 0-14 minutes ahead
(confirmed again live this pass — Arts-Loi -0 to 14 min, Simonis -0 to 10 min, Gare Centrale
1-11 min for metro). Investigated every avenue the brief named, in order, with a real
`STIB_API_KEY` (never committed):

1. **"2 passages per line per stop" — hard dataset property, not a query default.** The
   WaitingTimes operation's own portal description (`GET
   https://api-management-opendata-production.developer.azure-api.net/mapi/apis/_api_datasets_stibmivb_rt_WaitingTimes/operations?api-version=2018-06-01-preview`)
   is titled "Waiting times for the **next two vehicles**... (from StopMonitoring)" — this is
   StopMonitoring/SIRI's own upstream cap, not something the BMC gateway adds. Verified live at
   Arts-Loi (point IDs 8041/8042/8401/8402, all 4 lines): every `(pointid, lineid)` row carried
   **exactly 2** entries in `passingtimes`, and this did not change under any query variant
   tried — `limit=1000`, `select=*`, per-line `where`, per-single-`pointid` `where` (one point +
   one line, isolated from every other row), or plain re-fetch. Querying a single platform in
   isolation does not surface a 3rd/4th passing time that a combined station query was
   supposedly truncating — there is nothing to surface; the upstream StopMonitoring feed itself
   only ever tracks the next two approaching vehicles per stop/line. This closes the brief's
   first bullet: no query parameter widens this.
2. **VehiclePositions — real, but not a usable ETA source without a day-plus of new work.**
   `GET .../api/datasets/stibmivb/rt/VehiclePositions?where=lineid="1"` returns, per line, a
   flat list of `{ directionId, pointId, distanceFromPoint }` entries (`distanceFromPoint` is a
   binary 0/1, not a distance in metres) — no timestamp, no absolute position, no vehicle
   identity carried across polls. Deriving a further-out ETA from this would need: (a)
   reconstructing each line's full ordered point sequence per direction from the static GTFS
   feed, (b) counting stops between a vehicle's last-seen point and the target station, (c)
   summing static inter-stop run times, and (d) re-identifying the "same" vehicle across polls
   with no ID to key on (today's binary distanceFromPoint gives no polling-interval-independent
   position). That is a genuine multi-day estimation-and-testing effort, not a query tweak — per
   the brief's instruction, described here and NOT built. If pursued later, the brief requires
   it ships as an explicitly-flagged derived estimate, never presented as plain "live".
3. **TravellersInformation — confirmed irrelevant.** Sampled live: every entry is a
   long-running service-disruption notice (diversions, works, months-long), not a departure
   time source of any kind.
4. **Belgian NAP re-checked (STIB's own real-time feed is absent) — confirmed again, more
   thoroughly than the 29 Aug check.** The oracle report's 29 Aug finding ("no STIB GTFS-RT")
   was re-verified against the actual National Access Point catalogue this time
   (`https://www.transportdata.be`, CKAN-based) rather than by guessing endpoints:
   `GET https://www.transportdata.be/api/3/action/package_search?q=stib` lists exactly 6 STIB
   datasets on the NAP — Network schedule (NeTEx/XML), Reduced Fares, NeTEx static, Route
   Planner info service, Basic Common Standard Fares, CO2 Consumption. **None is a real-time
   feed of any kind** (no GTFS-RT, no SIRI-ET). This is the authoritative Belgian rail/transit
   open-data registry (the same shape as France's transport.data.gouv.fr) — its absence there is
   as definitive as this investigation can make it without STIB confirming directly (a Viv
   outreach question, not this pass's scope).

**Conclusion: no genuine way exists today to raise the live STIB metro horizon above ~2
passings/direction, 0-14 min ahead — the target (≥4/direction or ≥25 min at Arts-Loi/Simonis)
is unreachable from any live STIB source without the multi-day VehiclePositions-derivation
project described above.** Part B (labelled scheduled tail) is therefore the fallback per Tim's
20 Sep ruling — see the next section for why it was NOT shipped this pass.

## Part B (scheduled tail) — investigated, NOT shipped (20 Sep 2026)

Static GTFS + freshness-safeguard loading (`loadGtfsStatic`, `snapshotCoversToday` in
`lib/providers/gtfs/static-cache.js`) is ready to reuse exactly as the brief describes. The
blocker is upstream of that: **`public/` has no visible way to distinguish a scheduled-only row
from a live one today.** Checked every board-rendering path
(`renderUpcomingDepartureBoard`/`printedDestinationSuffix` in `public/app.js`): a trip's meta
line renders `Pl ${platform} · ${status}` where `status` is a delay string ("On Time" / "X min
late" / "Estimated") — there is no CSS class, badge, or copy anywhere that says "this time is
from the timetable, not tracked live." `lib/providers/contract.js`'s per-trip `realtime`
boolean (already used by Brussels' own two live sources, both `mode: "metro"`/`"rail"` trips
carrying `realtime: true`) is the natural field a tail row would carry `realtime: false` on, but
nothing in `public/` reads it. Per the brief's explicit instruction ("If there is no visible
distinction... stop short of shipping the tail... any new copy is Tim's to approve"), Part B is
**not built** this pass. Building the visible distinction (a "scheduled" badge/class + copy) is
Tim's call, flagged as an open item.

## SNCB/NMBS directions in the rider-facing API (Part C, 20 Sep 2026)

`/api/directions` previously returned only the 4 metro "line + terminus" chips at every
station — SNCB rows existed in `fetchStationBoard()`'s `board.trips` (mode: "rail") but never
reached a direction chip, so a rider could never pick an SNCB destination even though the board
itself already showed SNCB departures. Fixed: `getBrusselsDogfoodDirections()`
(`lib/cities/brussels/dogfood-next-train.js`) now also fetches iRail directly (not via
`fetchStationBoard()`, so a directions listing never depends on STIB's own uptime) at the three
shared stations and adds one chip per distinct `(vehicle type, destination)` pair actually
running live — e.g. `"IC + Oostende"`, `"S10 + Aalst"` — via a new `sncbDirectionLabel()` /
`tripMatchesSncbDirectionChip()` pair in `lib/cities/brussels/marketing-directions.js`.
doNotGroup-by-mode: SNCB chips are never compared against or merged with a metro chip (two
separate matcher functions, joined only by `getBrusselsDogfoodNextTrain`'s filter). Live-derived
rather than a fixed enumeration — same call Copenhagen already made for its own DSB
Regional/InterCity chips (no printed SNCB line map exists to enumerate from, and the network-wide
destination fan-out is too large to hand-maintain). iRail down degrades directions silently to
metro-only chips (no error), matching the board's own partial-source posture.

**Direction-model choice, flagged for Tim:** grouped by vehicle type + destination (`"IC +
Oostende"`), matching the Stockholm/Malmö/Oslo "+" convention. Live-verified 20 Sep 2026: Gare
Centrale returns 8 metro chips + **30** SNCB chips in one snapshot (mostly `IC + <dest>` — the
InterCity network fans out to ~20 distinct stations from Brussels within an hour). This is a lot
more than a UK Darwin region ever shows (London Waterloo tops out at 15, using "destination
(operator)"), because Brussels is a national hub, not one operator's suburban fan-out. Two
options considered: (1) **ship as-is** (chosen) — every chip is a real, live, walk-up-boardable
service; capping or collapsing it would either hide real destinations or misrepresent train type,
and Copenhagen already accepted the same "large, live-derived, not hand-curated" shape for its
own DSB chips; (2) collapse to destination-only chips (drop the type prefix) — rejected, this
would only reduce the *type* dimension, not the destination count that's actually large, while
losing useful IC-vs-S-train context UK Darwin's own "(operator)" suffix preserves for its
smaller-scale equivalent. Ship (1); if the chip count is a rider-facing UX problem in practice,
that is a picker-UI question for Tim/Mark to revisit with real usage data, not a data-model fix.

`lib/cities/brussels/coverage.json` already accurately described SNCB as a second live source
shown separately from metro (written at flip time) — no change was needed there; the gap was
purely `/api/directions` not matching what `coverage.json` already promised.

## Flip follow-through (20 Sep 2026)

Dogfood wiring landed ahead of the flip, status stays `planned`:
`lib/cities/brussels/dogfood-next-train.js` (single agency — STIB/MIVB
metro 1/2/5/6, directions from the printed line map, board from the
LIVE `fetchStationBoard()`), dispatch switch-cases in
`lib/cities/live-city-api.js` (`directionsFor`/`getMultiCityNextTrain`),
and `qa/brussels-dogfood-gate.mjs` (replacing the retired
`qa/brussels-planned-gate.mjs`, registered in `qa/run-all.mjs`'s smoke
tier).

## STIB live board CONFIRMED and wired (20 Sep 2026) — this pass

The BMC Waiting Time live JSON path this pack's D1 note (below, "Live
boards" line) flagged as unconfirmed **is now confirmed and wired**. The
previous session's exhaustive path-guessing against the developer portal
(`api-management-opendata-production.developer.azure-api.net/apis`, a
client-side-rendered SPA) never found the real operation because it was
guessing against the wrong surface. The fix: the portal itself exposes a
public, unauthenticated content-listing endpoint used to render its own
API catalogue —
`GET https://api-management-opendata-production.developer.azure-api.net/mapi/apis?api-version=2018-06-01-preview`
— which returns every published API's real `properties.path`. That listing
named `api/datasets/stibmivb/rt/WaitingTimes` directly; its
`/operations` sub-resource gave the exact `urlTemplate` (`/`, i.e. the
API's own base path). The live call is against the **gateway** host, not
the portal host:
`GET https://api-management-opendata-production.azure-api.net/api/datasets/stibmivb/rt/WaitingTimes?where=...`,
header `Ocp-Apim-Subscription-Key: STIB_API_KEY`. Verified live with the
real key: Arts-Loi / Kunst-Wet (point IDs 8041/8042/8401/8402, matching
this catalog's `stopIds` exactly — STIB point IDs and this catalog's GTFS
stop IDs are the same numbering scheme, no separate mapping needed)
returned all four v1 lines with genuine `expectedArrivalTime` timestamps;
Simonis/Elisabeth returned lines 2 and 6, including a live-only
`"message": "Do not embark"` entry that cannot exist in a static schedule
— itself confirmation this is real vehicle tracking, not a schedule echo.
No response headers exposed a numeric rate limit; the adapter uses a
conservative 15s cache TTL per station (documented as a placeholder, same
posture as Göteborg's Västtrafik cache). `lib/providers/brussels.js` is
rewritten around this live source — no timetable fallback
(`MissingStibCredentialsError` / `StibUnavailableError` are hard errors,
per Tim's standing rule, Göteborg PR #332). This closes the "STIB metro
live JSON also still unconfirmed" line in the registry `notes` — the
**only** remaining flip blocker is SNCB below.

**SNCB/NMBS — NOT wired, still holds the flip.** The Board eligibility section
below rules SNCB domestic rail `in` at Gare Centrale / Gare du Midi / Gare
de l'Ouest (walk-up, no compulsory reservation) and it has a confirmed
free real-time source (iRail liveboard API, no key required — verified
live 19 Sep 2026 against `https://api.irail.be/liveboard/?station=Brussels-Central`,
returned real departures with live delay minutes). It is deliberately left
out of this pass rather than faked: implementing it cleanly needs (1) a
second provider surface for iRail, (2) a station-name map between iRail's
English names (Brussels-Central / Brussels-South/Brussels-Midi /
Brussels-West) and this catalog's locked FR/NL names, and (3) a
doNotGroup-by-mode catalog split at all three stations (SNCB is a separate
building/platform section from the metro, same shape as South Yorkshire's
Sheffield Station rail-vs-Supertram split) — genuine follow-up scope, not
a missing key or a broken call. Recorded in the registry `notes` so Mark's
QA correctly holds the flip on this gap rather than passing it silently.

**Note for Mark — bundle these three one-line additions into the actual
flip commit, not before** (per CLAUDE.md's flip-follow-through split; adding
them early breaks `qa/live-city-lists-sync.mjs` for every city, not just
this one):

1. Add `"brussels"` to `MULTI_CITY_IDS` (and the `MultiCityId` typedef) in
   `lib/cities/live-city-api.js`.
2. Add brussels to `brisbane-dogfood.js`'s mount/available map.
3. Add brussels to `journey-model.js`'s persisted-city/country lists.

## SNCB/NMBS board-eligibility gap CLOSED + Belgium flip readiness (20 Sep 2026)

Both remaining flip blockers from Mark's Boston second pass
(`docs/boston-d1/mark-qa-note.md`, 20 Sep section) are addressed —
`docs/jim-brief-brussels-flip-readiness.md` is the full brief; this is the
short version for whoever opens the flip PR.

**A. SNCB/NMBS is now on the three shared boards.** Gare Centrale /
Centraal, Gare du Midi / Zuidstation, Gare de l'Ouest / Weststation
(exactly the three the oracle report's Board eligibility section names —
Schuman/Luxembourg were NOT added, the report doesn't name them as
SNCB-shared) now show SNCB domestic rail alongside metro, via a second live
source — iRail liveboard (`https://api.irail.be/liveboard/`, no key,
`lib/providers/irail.js`), not a fork of the STIB pipeline. Every trip
carries `mode`/`agency` (`"metro"`/`"STIB/MIVB"` vs `"rail"`/`"SNCB/NMBS"`)
so the two are never merged into one direction group (doNotGroup-by-mode).
Eurostar/Thalys/TGV INOUI/OUIGO/Nightjet/European Sleeper are filtered out
by iRail vehicle type (`classifySncbVehicleType`); ICE stays `in`. iRail
failing degrades that station's board to metro-only with `partial: true`
on the returned board object (`lib/providers/contract.js`'s `StationBoard`
typedef now documents this field) — it never refuses the board. STIB
failing is unchanged: still a hard refusal of the whole board. Proven
offline in `qa/brussels-dogfood-gate.mjs` against
`qa/fixtures/brussels/irail-liveboard.json` (one row of every
board-eligibility-relevant vehicle type, plus a canceled and an
already-departed row that must both drop regardless of type) — the
"iRail down" case needs no separate fixture, since the gate's top-of-file
fetch stub already throws on any real network attempt, so omitting the
`irailRawDepartures` escape hatch alone proves the degrade-to-partial path.

**Open item closed 20 Sep 2026 (Mark's PR #419 QA + this follow-up
fix):** Mark's live QA found `classifySncbVehicleType`'s `IN_TYPES` had a
bare `"S"` entry — but live iRail always sends S-trains as `S` + a
sub-line number (S1/S2/S3/S8/S10, never bare `S`), so every real S-train
at all three shared stations was silently dropped (Gare de l'Ouest showed
0 rail rows despite two live S10 departures). Fixed by matching S-trains
with a pattern instead of an exact string. Mark's same pass also found
EC (EuroCity) and ECD (EuroCity Direct) running live at Gare du Midi with
no oracle-report verdict — researched and closed in
`docs/brussels-d1/board-eligibility-addendum.md` (`in`, no compulsory
reservation) and added to the classifier. Rail-replacement `BUS` rows
(also seen live at Gare du Midi) now classify `out-mode` rather than
falling into the generic "unmapped" bucket. `mapIrailDepartures()` now
returns an `unmapped` property (type + count) for any vehicle type it
still doesn't recognise, surfaced on the board via `debug.irailUnmappedTypes`
(never surfaced by `api/next-train.js` or any UI); `qa/brussels-dogfood-gate.mjs`
fails if the captured-live fixture produces any unmapped row.
`qa/fixtures/brussels/irail-liveboard.json` is now a real 20 Sep 2026
iRail liveboard capture at Brussels-Central and Brussels-South (one call
each), trimmed to a representative set with every `vehicleinfo.type`/
`shortname` string kept verbatim, plus hand-authored rows (marked
`"_source": "synthetic"`) for out-reservation kinds (THA/TGV/OUI/NJ/ES)
that weren't running at capture time and for the whole `gareDeLOuest`
(iRail "Brussels-West") block, which wasn't part of this capture. Live
re-verified after the fix: Gare de l'Ouest / Weststation now shows real
S10 SNCB departures; Gare du Midi shows a real ECD row; Gare Centrale
shows a real EC row; no `debug.irailUnmappedTypes` on any of the three at
verification time.

**B. Belgium flip readiness.** `public/city-session.js` now has a
`Belgium` country (id `be`) with Brussels as a `comingSoon: true` region,
placed after Australia/before England (alphabetical, matching the existing
order), plus a `CITY_BOUNDS` box (`lat 50.79-50.92, lng 4.24-4.49`, padded
from the 60-station catalog's actual extent). This does not change
`assertCityLive("brussels")` or the registry `status` — both stay exactly
as before this pass. `qa/live-city-lists-sync.mjs` and
`qa/uk-city-bounds-overlap-gate.mjs` both stay green with Brussels still
`planned` (verified this pass) — a `comingSoon` entry outside the live set
isn't checked by either gate, only the live-city set is.

### Flip commit — exact edits (for whoever opens Brussels' flip PR)

Registry status flip PLUS these list-membership edits, exactly the pattern
`qa/live-city-lists-sync.mjs` checks (8 copies of "which cities are live"):

1. `lib/providers/registry.js` — brussels `status: "planned"` → `"live"`.
2. `lib/cities/live-city-api.js` — add `"brussels"` to `MULTI_CITY_IDS` and
   the `MultiCityId` typedef (already flagged above, repeated here for the
   single combined list).
3. `public/app.js` — add `"brussels"` to both `NEARBY_MULTI_CITY_IDS` and
   `LIVE_CITY_IDS`.
4. `public/city-session.js` — add `"brussels"` to `MULTI_CITY_IDS`, AND
   flip the Belgium picker entry's `comingSoon: true` to `comingSoon:
   false` (or drop the flag entirely, matching how other live single-region
   countries like Finland/Norway are written) — the picker entry itself
   from part B above does NOT need to move or be re-created, only that one
   flag changes.
5. `public/brisbane-dogfood.js` — add `brussels: true` to both its own
   `MULTI_CITY_IDS` array and the `available` map.
6. `public/journey-model.js` — add `"brussels"` to `PERSISTED_CITY_IDS`,
   and `"be"` to `PERSISTED_COUNTRY_IDS` (not already present — this is
   Belgium's first live region).
7. `public/city-session.js`'s `CITY_BOUNDS` already carries the `brussels`
   entry from part B above — no edit needed here at flip time, only
   confirm `qa/live-city-lists-sync.mjs`'s "CITY_BOUNDS missing entries for
   live cities" check passes (it will, the entry already exists).

`qa/live-city-lists-sync.mjs` will fail loudly (naming exactly which of the
8 copies is out of sync) if any of 1-6 above is missed — the same
self-checking property it was built for.

D1 = official STIB/MIVB **Map for metro, CHRONO lines and SNCB-NMBS** https://www.stib-mivb.be/files/live/sites/STIBMIVB/files/Travel/Plans%20r%C3%A9seau/Plan_Metro_Train.pdf (PDF title Plan_Metro_Train_240923; HTTP Last-Modified **Thu, 03 Oct 2024 15:13:01 GMT**) plus official district-map texts as support. Index https://www.stib-mivb.be/travel/network-and-district-maps. Mixed plate — v1 is the **metro legend only**. Stations hand-transcribed from the rendered map. **Not generated from GTFS.** Static NAP zip may 200 empty-key — do not use it to build JSON.

Four lines: **1** Gare de l'Ouest / Weststation – Stockel / Stokkel (21), **2** Simonis – Elisabeth (19), **5** Erasme / Erasmus – Herrmann-Debroux (28), **6** Roi Baudouin / Koning Boudewijn – Elisabeth (26). **60** unique open metro stops. **94** line ticks. **No passenger metro 3 or 4.** Tracker M1–M6 overstates.

Hub lock **Arts-Loi / Kunst-Wet** (metro **1 × 2 × 5 × 6**; official district text: metro 1, 2, 5, 6; no tram). Not Gare du Midi / Zuidstation, not Gare Centrale, not De Brouckère, not Rogier, not Simonis, not Elisabeth. **Simonis ≠ Elisabeth.** Bilingual FR/NL names.

C2/C3: (1) Separate city brussels, agency STIB/MIVB. Do not invent city=bru. (2) Lock Arts-Loi / Kunst-Wet. (3) Metro 1/2/5/6 only. Tram, premetro, CHRONO, SNCB, De Lijn, TEC out. (4) Metro 3 Albert–Bordet frozen — out. (5) doNotGroup Simonis vs Elisabeth; Midi SNCB vs metro; Gare du Nord (no metro). (6) FR/NL slash pairs as locked.

H2: no product brussels stations.json. Clash is **map-stack order vs FR/NL lock** plus **metro vs premetro / SNCB name family**.

**Live boards: BMC Waiting Time + Vehicle Positions keyed later — not a D1 blocker.** Portal https://api-management-opendata-production.developer.azure-api.net/apis. Header `Ocp-Apim-Subscription-Key`. No STIB GTFS-RT (NAP). Empty-key WaitingTimes.json **404** on 29 Aug 2026. This pack has **no key** and did not call the API with a real key. Never paste a key. D1 stays planned. assertCityLive("brussels") must fail. **UPDATE 20 Sep 2026: confirmed and wired — see the "STIB live board CONFIRMED and wired" section above.** The real operation path was `api/datasets/stibmivb/rt/WaitingTimes` on the gateway host, recovered from the developer portal's own public `/mapi/apis` content-listing endpoint, not the guessed paths this line originally referred to.

H7: Europe/Brussels **HAS DST**. Do not copy Perth / Brisbane no-DST.

§3 rec: line + terminus (`1 + Stockel / Stokkel`, `6 + Roi Baudouin / Koning Boudewijn`). Flag: inbound/outbound dies at Arts-Loi / Kunst-Wet. **Arts-Loi / Kunst-Wet is a hub stop string, not a direction token.** Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **brussels**. Do not flip from this pack. Testers live is Jim’s job, not this pack’s flip.
