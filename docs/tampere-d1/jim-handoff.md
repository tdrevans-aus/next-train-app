Tampere D1 + research pack (Luke), 28 Sep 2026. City stays **planned**. Existing live/planned
cities untouched. `assertCityLive("tampere")` must still fail (city not in
`lib/providers/registry.js` today). No generator committed, no PR, no product edit, no
`lib/providers/` or `registry.js` edit.

Pack files: `docs/tampere-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=tampere**, single-operator v1: Nysse (Tampereen joukkoliikenne), tram only (lines 1 and
  3), tram operated under contract by VR. Not merged with Helsinki. No `docs/finland-ledger.md`
  exists yet — the Finland country-lane light pass (`docs/expansion-tracker/countries.csv`) already
  concluded per-region adapters are justified because HSL/Digitransit and Tampere/Waltti diverge at
  the realtime layer (separate GTFS-RT hosts, separate brokers) — no full ledger was written and
  none is needed here since Tampere and Helsinki share no stops (no cross-region stop-ownership
  question exists).
- **Station graph, 33 unique stations (20 on line 1, 17 on line 3, 4 shared), transcribed from the
  current official `tampereenratikka.fi/en/tram-routes/` page** (re-fetched this pass, `dateModified
  2026-01-19`), cross-checked stop-by-stop against live GTFS trip-level `stop_times` sequences for
  both routes — full arrays in `published-network.json`. **This confirms, rather than corrects, the
  oracle report's line-level station counts and names** (unlike some prior packs in this pipeline).
- **One real correction against the oracle report**: there is no passenger Line 2. The report's
  claimed "Line 2 Santalahti – Lentävänniemi, opened 7 Jan 2025... further extensions to Partola/
  Ruotila target Aug 2028" conflates the tramway's internal construction-phase labels ("Part 2" /
  "Section 2A/2B" of Line 1's own extension) with a third passenger line. Confirmed wrong two
  independent ways: the official page states "Tampere Tram runs on two lines"; live GTFS
  `routes.txt` has exactly two `route_type=0` rows, `"1"` and `"3"` — no `"2"`. **No station-graph
  change results** — v1 scope was always tram lines 1 and 3 only and remains exactly that; a dated
  correction note is appended to `oracle-clash-report.md` (its original prose is untouched).
- **Hub lock: Rautatieasema, confirmed and strengthened** (not overridden, unlike the Bergen pass).
  Live GTFS confirms Line 3 does not call at Keskustori at all (runs Koskipuisto → Sorin aukio
  directly) — so Keskustori, the oracle report's own named alternate, was never actually a real
  candidate by the shared-stop test. Rautatieasema remains the lock: the one central stop genuinely
  shared by both lines, adjacent to (but confirmed-separate from) the VR railway station.
- **GTFS stop_ids and coordinates for all 33 stations**, resolved from ITS Factory's static GTFS
  `stops.txt` this pass (`published-network.json`'s `stationRegistry`) — never invented, always the
  feed's own value. Every station has two ids (`A`/`B` suffix, one per running direction).
- **Board eligibility, no `undecided` rows** (`published-network.json`'s `boardEligibility`): Nysse
  tram `in` (walk-up, no reservation, no barrier); Nysse bus `out-mode` (mode cut, even where
  co-located with a tram stop-place under the same printed name — Keskustori, Rautatieasema, Sorin
  aukio); VR regional/long-distance rail `out-scope` (Tampere railway station is a confirmed-
  distinct, nearby stop-place from every tram stop — never in-catalog under any name, so no
  service-level verdict is owed per the board-eligibility rule's "filter stations in, never trains
  off silently").
- **Tampere railway station is explicitly NOT an in-catalog tram stop** — confirmed with primary
  evidence, not just prose: Wikipedia's own "Tampere Central Station" article states "The
  Rautatieasema tram stop is located near the railway station" (i.e. adjacent, not the same
  place); the VR station never appears anywhere in the ITS Factory GTFS feed (a Nysse-only feed),
  and no VR stop_id exists to conflate with the tram's Rautatieasema A/B platforms (0809/0810).
- **License: Tampere City Open Data License (CC BY 4.0-compatible)** per the oracle report,
  covering both static GTFS and Waltti GTFS-RT. Attribution required, commercial reuse permitted.
  Not re-verified in this pass — treated as settled.
- **Europe/Helsinki HAS DST** — confirmed directly from the GTFS `agency.txt`'s
  `agency_timezone` field, consistent with Helsinki's own pack.

## Feed specifics for D2

- **Static GTFS (not a D1 generator, confirmed live this pass)**:
  `http://data.itsfactory.fi/journeys/files/gtfs/latest/gtfs_tampere.zip` — no auth, 200 OK,
  17.4 MB, `Last-Modified: 2026-09-21`. Standard GTFS zip (agency/stops/routes/trips/stop_times/
  shapes/calendar/transfers/fare files). Tampere City Open Data License.
- **GTFS-RT Vehicle Positions — confirmed live this pass**:
  `GET http://data.itsfactory.fi/journeys/api/1/gtfs-rt/vehicle-positions` — no auth, returned
  `200 OK` with `Access-Control-Allow-Origin: *` when queried directly this pass. Protobuf.
- **GTFS-RT Service Alerts — confirmed live this pass**:
  `GET http://data.itsfactory.fi/journeys/api/1/gtfs-rt/service-alerts` — no auth, same host,
  confirmed `200 OK` this pass. Protobuf.
- **GTFS-RT Trip Updates — location NOT independently confirmed this pass.** The itsfactory host's
  own `.../gtfs-rt/trip-updates` path returns `404` (confirmed this pass) — trip-updates does
  genuinely live elsewhere, matching the oracle report's claim of a separate host,
  `https://dev.publictransport.tampere.fi/`. That site returned `200 OK` for its root and `/docs`
  path, but is a client-rendered single-page app: every specific API path this pass guessed
  (`/gtfs-rt/trip-updates`, `/gtfs-rt/tripupdates`, `/api/gtfs-rt/tripupdates`, `/tripupdates`,
  `/trip-updates`) returned an **identical** 756-byte shell page (the SPA's catch-all route), not a
  real 404 vs 200 distinction — meaning this pass could not determine the actual trip-updates
  endpoint URL by direct HTTP probing alone. **Jim's D2 pass should load
  `dev.publictransport.tampere.fi/docs` in a real browser/JS-capable fetch (or find its OpenAPI/
  Swagger JSON directly) to get the real path** before wiring trip-updates. Vehicle-positions +
  service-alerts alone (both confirmed live, no key) may be enough for a working leave-by board
  without trip-updates, depending on how much the static GTFS's `stop_times.txt` scheduled times
  can carry versus needing live delay data — Jim's call.
- **Digitransit "waltti" routing profile — endpoint exists, key coverage NOT confirmed.**
  `POST https://api.digitransit.fi/routing/v2/waltti/gtfs/v1` responded `401 Access denied due to
  missing subscription key` when queried directly this pass (confirmed via a real GraphQL POST,
  not just a HEAD request) — i.e. the endpoint is real and live, gated by the same
  `digitransit-subscription-key` header Helsinki's adapter already uses
  (`lib/providers/helsinki.js`, `DIGITRANSIT_SUBSCRIPTION_KEY`). **Whether the existing key's
  portal-side product subscription covers the "waltti" product (as distinct from the "hsl" product
  Helsinki uses) was NOT confirmed this pass** — Digitransit's portal (portal-api.digitransit.fi)
  typically gates products separately even under one account/key. Jim's D2 pass should check the
  portal's product list for the key before assuming it just works, and treat a 401 on first live
  test as "needs a waltti product subscription added," not as "wrong header name."
- **No stopIds in the `lines[].stations` display arrays** — `published-network.json`'s
  `stationRegistry` carries GTFS stop_ids (both `A`/`B` platform ids per station) separately, same
  pattern as Bergen's NSR-id `stationRegistry` and Helsinki's Digitransit `stationGtfsId` catalog
  field. Jim's D2 will need to resolve each D1 station name to its stop_id pair for both the
  vehicle-positions filter and (once confirmed) the trip-updates query.

## What is still NOT solid — resolve before/at D2, don't wire around

1. **Through-running / short-turn minority (hazard-pack.md H5, direction-model-memo.md)**: live
   GTFS shows ~2-9% of trips tagged route 1 or 3 physically run through between the two lines'
   outer corridors (Pyhällönpuisto directly to/from Hervantajärvi), skipping Kaupin kampus/TAYS or
   Sorin aukio entirely, while GTFS `trip_headsign` alone doesn't disambiguate this (it uses the
   same headsign — `"Lentävänniemi"` or `"Hervanta"` — for both the clean and through-running
   trips). **Recommendation, not yet built**: derive each live trip's direction chip from its own
   actual remaining stops (trip-level, e.g. from `stop_time_update`s once trip-updates is wired),
   not from a fixed "route 1 always visits these 20 stops" assumption. If Jim's D2 pass finds this
   pattern has changed, stopped, or grown since 28 Sep 2026, that's new information this pack
   didn't have.
2. **GTFS-RT trip-updates exact endpoint** (see above) — not found by direct probing; needs a
   browser/JS-capable check of `dev.publictransport.tampere.fi/docs` or its underlying API spec.
3. **Digitransit "waltti" product subscription coverage** (see above) — the endpoint is real, the
   header pattern is known, but portal-side product access for the existing key is unconfirmed.
4. **Headsign-to-terminus mapping** (`direction-model-memo.md`): this pack recommends mapping GTFS
   headsign `"TAYS"` → display `"Kaupin kampus"` and `"Hervanta"` → display `"Hervantajärvi"`
   rather than passing the raw headsign through, since both headsigns are short/ambiguous versions
   of the real printed termini. Flagged as an open §3 question for Tim, not decided unilaterally.
5. **Pirkkala/Linnainmaa and Niihama extensions (2028+, 2032+)**: all "not yet built" per the
   official page's own construction-progress section. Not inserted. If Jim's D2 pass or a later
   check finds any of these have opened, that's new information this pack didn't have.

## Direction model (full detail: direction-model-memo.md)

- **Both lines**: line + printed terminus, e.g. `1 + Pyhällönpuisto`, `1 + Kaupin kampus`,
  `3 + Sorin aukio`, `3 + Hervantajärvi`. No ring, no printed branch (H4) — simpler than Bergen's
  three-shared-station topology, closer to Vienna's simple two-line pairs, **except** for the
  live-only through-running complication (item 1 above), which has no precedent in this pipeline
  so far.
- **Rautatieasema (hub lock)**: plain through-station on both lines, four ordinary direction
  chips, no self-referential-hub case (matches Bergen's Bergen busstasjon, contrasts Oslo's Vy
  R21/Jernbanetorget case) — Rautatieasema is never itself a printed terminus for either line.
- **Kaupin kampus / Sorin aukio**: each a true single-direction terminus for its own line only
  (same shape as Vienna's Karlsplatz-for-U2, Bergen's Byparken/Kaigaten) — only one live outbound
  chip at each. Never synthesize `1 + Kaupin kampus` at Kaupin kampus itself, or `3 + Sorin aukio`
  at Sorin aukio itself.
- **Keskustori**: Line 1 only, never a `3 +` chip (Line 3 doesn't call there).

## What I did not do

No live flip, no UI wiring, no D5 assertion tables, no adapter code, no `lib/providers/` or
`registry.js` edit, no station-graph invention for the unopened Pirkkala/Linnainmaa/Niihama
extensions, no resolution of the H5 through-running finding (flagged for Jim's D2 live
verification, not guessed at), no independent confirmation of the GTFS-RT trip-updates exact URL
or the Digitransit waltti-product key coverage (both flagged above, not asserted), no edits to any
other city's pack, no `docs/finland-ledger.md` write (none exists; the country-lane light pass in
`docs/expansion-tracker/countries.csv` already covers what's needed for this region, and Luke's
brief only asks to read a country ledger where one exists — a full ledger write is Nico's job, not
this pack's).

## Lane status

Luke needs no lane-lock check (per CLAUDE.md: "Luke needs no check" — his whole write set is
`docs/tampere-d1/`, which no other lane touches). The pack is complete by the shape of every other
`docs/<city>-d1/` folder (5 files including this one) and every claim in it is sourced. **The
adapter build is intentionally NOT started** — that's Jim's job (D2–D6), not this pack's. Finland's
country lane has had only a light pass (Nico, 30 Aug 2026) recorded in
`docs/expansion-tracker/countries.csv`, not a full `docs/finland-ledger.md` — that's expected per
the country-lane spec (a full ledger is written "as a retrofit before the next region," and this
pack found no cross-region fact that needs recording since Tampere and Helsinki share no stops).
No country-lane lock applies to Luke's work regardless (the lock is Jim's only, for shared files).
