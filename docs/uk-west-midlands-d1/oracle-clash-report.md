# West Midlands oracle clash report

D1 (as of 2 Sep 2026): **National Rail** (Darwin/OpenLDBWS) covers West Midlands Combined Authority region (75 National Rail CRS stations: ORR 6329 base set, Camp Hill three new stations, plus Kidderminster as test station) and **West Midlands Metro** (35 Current Service stops, Birmingham–Wolverhampton light rail line). Darwin via [Rail Data Marketplace](https://raildata.org.uk/) using DARWIN_LDB_TOKEN (Onestop ID `f-nre-national_rail_enquiries_darwin_ldb_ws`). Metro real-time: **TfWM GTFS-RT trip_updates**, requires API portal registration at [api-portal.tfwm.org.uk](https://api-portal.tfwm.org.uk/) (Onestop ID `f-transport~for~west~midlands`; TFWM_API_APP_ID and TFWM_API_APP_KEY credentials). Services operated by **West Midlands Railway** (WMR) as primary National Rail operator; **London North Western Railway** (LNWR), **Avanti West Coast**, **CrossCountry**, **Chiltern Railways**, **Transport for Wales** (TfW), and **East Midlands Railway** (EMR) at regional boundaries.

## V1 scoping — National Rail + Metro schedule and realtime

**National Rail v1 assumption:** Schedule and realtime departures at National Rail stations via Darwin OpenLDBWS (DARWIN_LDB_TOKEN required). Multiple operators (WMR, LNWR, Avanti, CrossCountry, Chiltern, TfW, EMR at boundaries) all walk-up boardable. **Former account-level blocker resolved (2 Sep 2026):** Darwin OpenLDBWS is live via the `uk-darwin.js` REST rewrite (PR #188), verified with real departures at Bristol Temple Meads and Nottingham. West of England and East Midlands flipped live on it.

**West Midlands Metro v1 assumption:** Schedule and realtime departures at 35 Current Service stops via TfWM GTFS-RT. Walk-up, no reservation. **Credentials blocker:** TFWM_API_APP_ID and TFWM_API_APP_KEY not yet set on Tim's machine or in production. `lib/providers/uk-metro-wm.js` throws `MissingTfwmCredentialsError` so Metro board surfaces an explicit error rather than silently omitting the service (per board-eligibility principle — filter stations in, never trains off a board silently). Tim must register at TfWM API portal (`https://api-portal.tfwm.org.uk/`) and provide credentials before Metro board can display real-time.

## Hub lock

**Birmingham New Street (BHM, CRS code):** principal rail terminus for Birmingham city; all major National Rail services call here. CRS code: BHM. Coordinates: 52.4778°N 1.9002°W. All regional and inter-city departures.

## Station catalog summary

**National Rail:** 75 stations across West Midlands Combined Authority + Kidderminster (test station). Catalog sourced from ORR Table 6329 (31 Mar 2026 snapshot; Camp Hill three stations added 7 Apr 2026). Total: 71 ORR base + 3 Camp Hill (Moseley Village, Kings Heath, Pineapple Road) + 1 Kidderminster = 75 National Rail stations. All keyed by CRS code.

**West Midlands Metro:** 35 Current Service stops (Birmingham city centre to Wolverhampton via Dudley line, plus Birmingham extensions). Not National Rail; separate TfWM operation. Line names: line 1 (Birmingham–Wolverhampton via Dudley), line 2 (Birmingham–Wolverhampton via Brierley Hill via *future* Wednesbury–Brierley Hill extension, not yet open). Current service only; Wednesbury–Brierley Hill extension and Digbeth/Curzon Street stops are out-of-catalog (not open as of 2026-09-02, not listed on TfWM "Current Service" map).

## Hazards / skip risks

**National Rail account block:** resolved 2 Sep 2026 (Darwin live, PR #188). No longer a skip risk.

**Metro credentials:** TfWM API credentials (TFWM_API_APP_ID / TFWM_API_APP_KEY) not yet registered. `uk-metro-wm.js` adapter throws explicit error (MissingTfwmCredentialsError) so riders see a clear "credentials missing" message instead of a silent board omission. This is the correct behaviour per the board-eligibility rule. Tim must register at https://api-portal.tfwm.org.uk/ and provide credentials at flip time.

**Kidderminster Severn Valley Railway:** Kidderminster main-line station (KID, CRS code) shares a National Rail platform with Severn Valley Railway heritage services (steam trains, heritage carriages, volunteer-run operation). Severn Valley services do not pass the walk-up boarding contract test (heritage-museum experience, not a scheduled National Rail service). See board eligibility section, verdict `out-mode`.

**No sleeper services confirmed** at any in-catalog station.

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (National Rail + Metro at in-catalog stations):**

**National Rail services at West Midlands stations:**
- **West Midlands Railway (regional services, primary operator):** `in` (walk-up, no compulsory reservation; open seating on regional services; confirmed via WMR help pages)
- **London North Western Railway (LNWR, Avanti franchise successor):** `in` (walk-up, no compulsory reservation; services to London and regional connections pass both tests)
- **Avanti West Coast (long-distance, no compulsory reservation):** `in` (walk-up long-distance services London–Manchester–Scotland pass both tests; optional reservations only; per board-eligibility rule, walk-up long-distance is `in` unless there is a real `out-product` reason)
- **CrossCountry (cross-regional services):** `in` (optional reservations only, walk-up boardable)
- **Chiltern Railways (Oxford line via Warwickshire):** `in` (optional reservations, walk-up boardable; confirmed via Chiltern Railways help pages)
- **Transport for Wales (TfW, boundary services to Wales):** `in` (walk-up regional services, no compulsory reservation; services at Kidderminster and south-border stations pass both tests)
- **East Midlands Railway (EMR, boundary services to East Midlands):** `in` (walk-up regional services, no compulsory reservation; through-running at boundary stations pass both tests)

**West Midlands Metro at 35 Current Service stops:**
- **West Midlands Metro Lines 1 & 2 (Birmingham–Wolverhampton, light rail):** `out-product` — Walk-up service (light rail, no reservation system), passes both boarding-contract tests, but excluded by product decision due to missing API credentials. **Credentials status:** TFWM_API_APP_ID and TFWM_API_APP_KEY not set. Board surfaces explicit error (`MissingTfwmCredentialsError` from `lib/providers/uk-metro-wm.js`) until Tim registers at [api-portal.tfwm.org.uk](https://api-portal.tfwm.org.uk/) and provides credentials. **Reason:** "TfWM API credentials not yet registered (TFWM_API_APP_ID/TFWM_API_APP_KEY unset); board surfaces an explicit error until Tim registers at the TfWM API portal and confirms this verdict at flip-PR merge time."

**Kidderminster special case:**
- **Severn Valley Railway heritage services (steam/heritage diesel trains at Kidderminster):** `out-mode` — Shares platform with National Rail at Kidderminster (KID). Severn Valley is a volunteer-run heritage railway (see https://svr.co.uk/), not a National Rail walk-up board service. Runs steam locomotives and heritage carriages on select timetabled dates (seasonal operation, not a daily commute or inter-city service). Does not pass the walk-up boarding contract test because services are museum-experience themed (not standard ticketing, heritage-only operation). **Reason:** "Heritage railway, not a National Rail walk-up board service; operates steam/heritage-only trains outside standard ticketing. Severn Valley Railway services are excluded; National Rail services at Kidderminster (WMR / Chiltern / CrossCountry / TfW call KID) are included as `in`."

**Stations with multi-operator National Rail:**
All 75 National Rail stations support multiple TOC services (Darwin returns all calling services per operator code). No physical tram/rail split like East Midlands Nottingham. Dozing by operator or line code at hub stations is not required for v1 (single "National Rail" board per platform).

**No check-in barriers:** Platform access at all in-catalog stations is unrestricted. Ticket checking is on-board by conductors (National Rail) or low-level gating (Metro). Walk-up boarding is unobstructed for all `in` services.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **West Midlands Railway (regional services)** | All 75 National Rail stations; primary operator | No (walk-up, open seating, no compulsory reservation on regional services) | No | `in` | [WMR help pages](https://www.westmidlandsrailway.co.uk/); walk-up boarding available on all services |
| **London North Western Railway (LNWR)** | Nationwide coverage at WM stations; successor to Avanti franchise responsibilities for regional services | No (walk-up, no compulsory reservation on regional and semi-fast services) | No | `in` | [LNWR services info](https://www.lnwr.co.uk/); walk-up boardable |
| **Avanti West Coast (long-distance)** | Principal operator London–Manchester–Glasgow line via WM hubs (Birmingham New Street, Wolverhampton) | No (long-distance, walk-up, optional reservations only; no compulsory reservation) | No | `in` | [Avanti West Coast reservations info](https://www.avantiwestcoast.co.uk/); walk-up long-distance per board-eligibility rule |
| **CrossCountry (cross-regional services)** | Services via WM stations on cross-country routes (e.g. Manchester–Bristol via Birmingham) | No (optional reservations only; walk-up boardable) | No | `in` | [CrossCountry seat reservations](https://www.crosscountrytrains.co.uk/); walk-up boardable |
| **Chiltern Railways (Oxford line)** | Warwickshire / Midlands services via Stratford-upon-Avon line into WM region; optional £3 reservations | No (optional reservation at £3 cost; walk-up boardable without pre-booking) | No | `in` | [Chiltern Railways help pages](https://www.chilternrailways.co.uk/); walk-up boarding available |
| **Transport for Wales (TfW, South Wales services)** | South Wales to Kidderminster / border services | No (walk-up, no compulsory reservation on regional services) | No | `in` | [TfW services info](https://www.tfw.wales/); walk-up boardable |
| **East Midlands Railway (boundary services)** | East Midlands region through-running at boundary stations (Tamworth, etc.) | No (walk-up, open seating, no compulsory reservation on regional services) | No | `in` | [EMR help pages](https://www.eastmidlandsrailway.co.uk/); walk-up boarding available |
| **West Midlands Metro Line 1 & 2 (light rail, Birmingham–Wolverhampton)** | 35 Current Service stops (Birmingham city centre to Wolverhampton) | No (walk-up only, light rail with no reservation system) | No | `out-product` | Credentials missing (TFWM_API_APP_ID/TFWM_API_APP_KEY unset). Tim must register at [api-portal.tfwm.org.uk](https://api-portal.tfwm.org.uk/). Board surfaces explicit error until credentials are provided and verdict confirmed at flip-PR merge. |
| **Severn Valley Railway (heritage trains, Kidderminster only)** | Kidderminster station (KID) only; shares platform with National Rail | N/A (heritage experience, not standard ticketing) | No | `out-mode` | [Severn Valley Railway](https://svr.co.uk/); heritage railway volunteer-run operation, steam/heritage-only trains, not a walk-up National Rail board service. |

**Board eligibility summary:** All walk-up National Rail services (WMR, LNWR, Avanti, CrossCountry, Chiltern, TfW, EMR) calling at West Midlands stations pass both boarding-contract tests (`in` verdicts recorded). West Midlands Metro passes both tests but is excluded by product decision due to missing API credentials (`out-product` verdict recorded; board surfaces explicit error). Severn Valley Railway heritage services at Kidderminster are excluded as non-National-Rail heritage operation (`out-mode` verdict recorded). **All verdicts decided; no silent omissions. Tim's approval of TfWM credentials status and Metro error-surfacing approach to be confirmed at flip-PR merge time.**

## License

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing. See East Midlands report (same feed) for identical licence ambiguity.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. WMR / LNWR / Avanti / CrossCountry / Chiltern / TfW / EMR for train service operator branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. The RDM Platform Agreement text (data sharing agreement) specifies limits on how data may be used; the exact language permitting or prohibiting downstream API provision to end users is not stated in public sources checked. Tim accepted this same ambiguity when flipping West of England and East Midlands live on 2 Sep 2026; the same acceptance applies here.

- **West Midlands Metro / TfWM GTFS-RT:**
  - **License name:** Not confirmed in public TfWM API documentation (checked api-portal.tfwm.org.uk on 2 Sep 2026).
  - **Redistribution / rehosting:** TfWM API portal documentation (https://api-portal.tfwm.org.uk/docs) does not include an explicit public license statement. API access appears to be governed by API portal registration terms (developer account agreement). Operative clause unclear.
  - **Commercial use:** Unclear; depends on TfWM's API terms of service.
  - **Attribution:** Transport for West Midlands (TfWM). West Midlands Metro operator.
  - **Terms URL:** https://api-portal.tfwm.org.uk/ (registration required to view full API terms). TfWM main page: https://www.tfwm.org.uk/.
  - **Confidence:** `unclear` on both redistribution and commercial use. The TfWM API portal requires registration and does not publish terms in a static landing page. Tim must review the API platform agreement once TfWM credentials are registered. Do not assume public GTFS-RT availability permits redistribution; confirm with TfWM before launch.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token (Rail Data Marketplace Consumer key), not a secret API key; no HMAC or signature. Free tier: 5 million requests / 4-week railway period, then charged. Subscription terms govern API use, not a separate data license. TFWM credentials (TFWM_API_APP_ID / TFWM_API_APP_KEY) are API portal registration tokens; account terms govern use.

## Flip commit — list additions for Mark (added 2 Sep 2026, Jim's code-side follow-through)

Darwin's OpenLDBWS is genuinely live now (`lib/providers/uk-darwin.js` REST rewrite, PR #188,
verified against Bristol Temple Meads) — Tim has authorized flipping West Midlands live. Ahead of
that, this pass landed the code-side follow-through only: `lib/cities/uk-west-midlands/
dogfood-next-train.js`, the `uk-west-midlands` switch-cases in `lib/cities/live-city-api.js`'s
`directionsFor`/`getMultiCityNextTrain`, and `qa/uk-west-midlands-dogfood-gate.mjs` (a NEW gate —
uk-west-midlands never had its own dedicated `*-planned-gate.mjs`; it was covered generically by
`qa/uk-planned-gate.mjs`'s `UK_REGION_IDS` loop, which stays as-is pre-flip, see item 7 below).
Registered in `qa/run-all.mjs`'s smoke list, inserted after `east-midlands-dogfood-gate.mjs`.

This region predates the D1-pack pipeline: there is no `docs/uk-west-midlands-d1/jim-handoff.md`,
`published-network.json`, `hazard-pack.md`, or `direction-model-memo.md` — only this
oracle-clash-report.md, per the top-level session's instruction to put this section here instead.

West Midlands Metro's situation is a **credentials gap, not a feed-unconfirmed gap** (unlike East
Midlands' NET tram): `lib/providers/uk-metro-wm.js`'s `fetchMetroStopBoard()` checks
`TFWM_API_APP_ID`/`TFWM_API_APP_KEY` first and throws `MissingTfwmCredentialsError`
unconditionally while they're unset — permanent until Tim self-serves TfWM API portal
registration (FB-48, `docs/feature-backlog.md`). The dogfood dispatch surfaces that error rather
than swallowing it or fabricating a schedule, same shape as every other UK second-agency case.

**Hub-lock correction found while wiring (worth Mark/Tim knowing):** the task brief for this pass
described Birmingham New Street (BHM) as a doNotGroup hub with "the two catalog entries, same
printed name BHM, different mode," matching Nottingham Station's pattern. That is NOT what the
catalog data or this oracle report actually show. `lib/cities/uk-west-midlands/stations.json`'s
Metro entry nearest BHM is named **"Grand Central"** (`catalogId: "metro:grand-central"`,
aliases `["Grand Central New Street"]`), cross-referenced to BHM only via an `interchange.
nationalRailCrs: "BHM"` field — not the same printed name. This oracle report's own Hub lock /
Board-eligibility sections say so directly: "No physical tram/rail split like East Midlands
Nottingham." Mode-aware resolution was still built defensively (`resolveCatalogEntry(station,
mode)` in the new dogfood module honors an explicit mode by calling the matching fetcher
directly, never falling through to rail), both for parity with the other two-agency regions and
because it fails safe regardless. No catalog or registry-note change is needed for this —
flagging only so nobody re-derives a doNotGroup collision that isn't there.

**Catalog data-quality note (not fixed in this pass — out of adapter/wiring scope):** 14 of the
110 entries in `stations.json` (12 National Rail, e.g. Chester Road CDR at 55.96°N/-4.65°W,
Blake Street BLT at 55.80°N, Selly Oak SEA at 54.84°N, Small Heath SMH at 51.57°N/-0.08°W — all
well outside the West Midlands) carry clearly mis-geocoded `lat`/`lng` values scattered as far as
Scotland and outer London. The `CITY_BOUNDS` box below was derived by excluding these outliers,
not from the raw min/max. This looks like a NaPTAN name-collision artifact from whichever script
populated coordinates (several of these station names are common across the UK) — a Luke/catalog
concern for whoever owns `stations.json` next, not something this pass touched.

**Deliberately NOT done in this pass — bundle these into the actual status-flip commit** (same
split East Midlands' and West of England's flips used):

1. `lib/providers/registry.js` — flip the `uk-west-midlands` entry's `status` from `"planned"` to
   `"live"`. Also worth updating the `notes` prose the same way East Midlands' flip commit did
   (record the Darwin unblock, the TfWM credentials-gap verdict, and the flip date), though
   that's prose, not a gate.
2. `lib/cities/live-city-api.js` — add `"uk-west-midlands"` to the `MultiCityId` typedef union and
   to the `MULTI_CITY_IDS` array (both currently end in `..."west-of-england","east-midlands"]`/
   `|"west-of-england"|"east-midlands"`).
3. `public/app.js` — add `"uk-west-midlands"` to `NEARBY_MULTI_CITY_IDS` and to the
   `LIVE_CITY_IDS` `Set`.
4. `public/brisbane-dogfood.js` — add `"uk-west-midlands"` to the `MULTI_CITY_IDS` array and add
   `"uk-west-midlands": true` to the `available` map.
5. `public/city-session.js` — add `"uk-west-midlands"` to the `MULTI_CITY_IDS` array; add a
   picker region entry under the `gb` country's regions list, e.g. `{ id: "uk-west-midlands",
   name: "West Midlands", timeZone: "Europe/London", comingSoon: false }` (follow the exact shape
   East Midlands'/West of England's flips used, inserted wherever the gb regions array currently
   ends); add a `CITY_BOUNDS` entry. Unlike East Midlands (whose stations.json coordinates were
   all `null`), West Midlands' catalog DOES carry real coordinates — but 14 of 110 are
   mis-geocoded outliers (see the data-quality note above). Excluding those outliers, the 96
   remaining stations (both National Rail and Metro; Birmingham 52.478/-1.900, Wolverhampton
   52.588/-2.120, Coventry 52.401/-1.513, Kidderminster 52.384/-2.238 all included) span
   lat 52.372–52.645, lng -2.300 to -1.494. Recommended box, padded slightly beyond that range:
   `"uk-west-midlands": { minLat: 52.25, maxLat: 52.70, minLng: -2.35, maxLng: -1.45 }`. Confirm
   against the actual catalog before shipping — this box deliberately excludes the 14 outlier
   stations rather than being derived from the raw (polluted) min/max.
6. `public/journey-model.js` — add `"uk-west-midlands"` to `PERSISTED_CITY_IDS` (the `"gb"`
   country id is already in `PERSISTED_COUNTRY_IDS` from `uk-london-tfl`, no change needed
   there).
7. `qa/uk-planned-gate.mjs` — add `"uk-west-midlands"` to the `LIVE_UK_REGION_IDS` `Set`
   (currently `new Set(["uk-london-tfl", "west-of-england", "east-midlands"])`), and update the
   trailing `console.log` summary string to mention uk-west-midlands is live. **This assertion
   cannot be made to pass both before and after the flip** — `LIVE_UK_REGION_IDS` is a hardcoded
   set checked directly against `getCity(id)?.status`, not derived from the registry, so adding
   `"uk-west-midlands"` to it before the status flip lands would make the gate fail *now* (status
   still `"planned"`) instead of *after* (status `"live"`). This mirrors exactly what happened for
   West of England and East Midlands before it — add `"uk-west-midlands"` to
   `LIVE_UK_REGION_IDS` in the same commit (or the very next one) that flips `registry.js`'s
   status line, not before.

Verify with `node qa/live-city-lists-sync.mjs` after all of the above — it derives the expected
membership directly from the registry's `status === "live"` set and will catch any list that's
missing `uk-west-midlands` or, just as importantly, any list where it was added too early
relative to the others.

## 5 Sep 2026 — TfWM credentials unblocked (FB-48 closed); Metro board still gated on a catalog gap

TFWM_API_APP_ID/TFWM_API_APP_KEY are now confirmed working in `.env.local` (Tim registered at the
TfWM API portal, FB-48 closed) — not yet in Vercel prod, which is a separate deploy step. This
pass implemented the actual TfWM GTFS-RT `trip_updates` fetch/decode in
`lib/providers/uk-metro-wm.js`'s `fetchMetroStopBoard()`, reusing the shared decoder every other
GTFS-RT city adapter uses (`lib/providers/gtfs/realtime.js`'s `fetchTripUpdates()`, wrapping the
vendored `gtfs-realtime-bindings` protobuf parser) rather than a new one.

**Credentials are no longer the blocker, but the Metro board still cannot resolve any of the 35
stops**, for a separate, pre-existing reason: `lib/cities/uk-west-midlands/stations.json`'s
`stopId` field is `null` for every Metro entry. Per `docs/uk-coding-brief.md` ("Key Metro stops by
the operator's stop id, not a fake CRS"), the catalog was always supposed to carry TfWM's real
GTFS stop_ids for filtering the feed; that population never happened. `fetchMetroStopBoard()` now
throws a new, distinct `MetroStopIdNotCatalogedError` for this case — separate from
`MissingTfwmCredentialsError` (still thrown first, unconditionally, when the env vars are unset)
and from the new `MetroFeedFetchError`/`MetroFeedParseError` pair (network/HTTP vs malformed-
protobuf failures reaching the feed itself, once credentials and stop_id are both present). No
fabricated board, no silent empty board — per the board-eligibility rule.

**Verdict unchanged for now:** West Midlands Metro stays `out-product` in the board-eligibility
table above. The reason text should be updated at next review from "credentials missing" to
"TfWM credentials resolved (FB-48); catalog stop_id population still outstanding" — a Luke/catalog
task, not an adapter/wiring one. Once `stationId` values are populated for the 35 stops, no
adapter change is needed; `fetchMetroStopBoard()` already filters on `entry.stopId` and will start
returning real trips.

Scope note: this pass is adapter/wiring only (`lib/providers/uk-metro-wm.js`). It does not touch
`lib/providers/registry.js` (already `"live"` for uk-west-midlands, unrelated to this change), the
Darwin/National Rail path (untouched, already working), or the catalog's `stopId` values.

## 5 Sep 2026 (later same day) — real TfWM stop_ids populated; new direction-collapse gap found, verdict recommendation

`lib/cities/uk-west-midlands/metro-stops-source.json` (source of truth) and the built
`lib/cities/uk-west-midlands/stations.json` now carry real, TfWM-verified GTFS stop data for all
35 Metro stops (`scripts/enrich-wm-metro-stop-ids.mjs`, re-run through
`scripts/build-uk-west-midlands-catalog.mjs`). Verified two ways and cross-checked against each
other: the TfWM GTFS **static** feed's `stops.txt` (`http://api.tfwm.org.uk/gtfs/tfwm_gtfs.zip`)
and a live pull of the **realtime** `trip_updates` feed itself — both agreed on the same 35
station-level codes, a clean 1:1 match against the 35 catalog entries (matched by TfWM code, not
fuzzy name matching — see below for why).

**Station-graph finding — this is a hazard, not a routine data fill:** TfWM's GTFS models every
Metro stop as one parent station id (`940GZZWM<code>`, GTFS `location_type=1`) with **two
directional platform-level ids** (`9400ZZWM<code><1|2>`, `location_type=0`). Confirmed against a
live `trip_updates` pull: `stop_time_update.stop_id` **only ever carries the platform-level id,
never the parent** (0 of 67 distinct WM-prefixed stop_ids in a live sample were parent-style
`940GZZWM...`; all were platform-style `9400ZZWM<code><n>`). Three stations (Millennium Point,
Wolverhampton Station, Wolverhampton St George's — all line-end/single-track stops) genuinely have
only one platform id; every other station has two, one per direction.

`lib/providers/uk-metro-wm.js`'s `fetchMetroStopBoard()`/`buildMetroTrips()` filters on a single
scalar `entry.stopId` with an **exact match** against `stop_time_update.stop_id`
(`uk-metro-wm.js:165`). There is no shape in that adapter for "one board, both directions" — unlike
every other GTFS-RT city in this repo, which gets that via
`lib/providers/gtfs/realtime-board.js`'s `resolveStopIds` (plural). Filling the legacy `stopId`
scalar with just one of the two platform ids would make the board "work" in the sense of returning
real, non-fabricated trips — but it would **silently show only one direction's departures**,
dropping every walk-up-boardable service in the other direction with no recorded exclusion. That is
exactly the kind of silent direction-collapse the pipeline exists to catch, so this pass did not do
it.

**What was actually populated instead:** a new `stopIds` array field (both platform ids, TfWM-code-
verified) plus a reference-only `stationId` (the GTFS parent id, which never appears in the live
feed) on every Metro entry. The legacy `stopId` scalar is left as `null`, so
`MetroStopIdNotCatalogedError` keeps firing — the board still doesn't return trips yet, but it
fails loudly and honestly rather than silently half-working. Full reasoning, the TfWM-code mapping
table, and the static-feed-under-reports-one-platform gotcha (Five Ways' second platform has an
empty `location_type`/`parent_station` in `stops.txt` and was only caught by cross-checking against
the live feed) are documented in `scripts/enrich-wm-metro-stop-ids.mjs`'s header comment.

**Recommended follow-up (Jim's lane, not done here):** extend `fetchMetroStopBoard()` /
`buildMetroTrips()` to accept `entry.stopIds` (array) and merge matching trips across all of a
station's platform ids into one board — the data is now populated and ready to consume; this is a
small, mechanical adapter change, not a new research task. Once that lands, `metroNameByStopId()`
(currently keyed off the singular `stopId`, used to resolve destination names for terminus stops)
should also be updated to index off `stopIds`.

**Board-eligibility verdict recommendation (Nico/Mark's call, not changed here):** do **not** move
West Midlands Metro's verdict from `out-product` to `in` yet. Both the credentials gap and the
literal "stop_id is null" catalog gap are now closed, but a third, previously-undiscovered gap
blocks the board from actually returning correct data: the adapter's single-scalar stop-id model
can't represent TfWM's two-platform-per-station shape without silently dropping one direction's
departures. Recommend the verdict reason text be updated to reflect this specific remaining
blocker (adapter needs `stopIds[]` merge support) rather than moving to `in`, until that adapter
change lands and is QA-verified to return both directions.

**5 Sep 2026 (adapter follow-up, Jim's lane) — `stopIds[]` merge landed, verdict still not moved:**
`fetchMetroStopBoard()`/`buildMetroTrips()` in `lib/providers/uk-metro-wm.js` now accept
`entry.stopIds` (matching a trip if its `stop_time_update.stop_id` hits ANY of a station's platform
ids, merging both directions into one board), with the legacy scalar `entry.stopId` kept as a
fallback and `MetroStopIdNotCatalogedError` firing only when an entry has neither.
`metroNameByStopId()` now indexes off both fields too. A live pull against a mid-line station
(Jewellery Quarter, two platform ids) and an end-of-line station (Wolverhampton St George's, one
platform id) at ~02:00 BST on a Saturday returned zero Metro-prefixed (`9400ZZWM...`) stop_ids in
the feed at all — consistent with no tram service running at that hour, not a bug in the merge
logic (confirmed separately with a synthetic-feed unit test in
`qa/uk-west-midlands-dogfood-gate.mjs` that both directions merge correctly and a single-id station
is unaffected). The verdict move to `in` is still Mark's call, and should wait on a live QA re-check
during Metro service hours confirming both directions actually appear on a real mid-line board.
