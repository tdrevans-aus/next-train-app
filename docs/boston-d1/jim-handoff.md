Boston D1 + research pack. City stays **planned** / Coming Soon until Jim wires testers. **Not tester-live. Not live.** Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Rotterdam is cut #1 and **untouched**. Washington / Chicago / BART stay planned and **untouched**. **assertCityLive("boston") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). Not in `LIVE_CITY_IDS`. No generator, no product edit, no Perth edit, no merge of other PRs. Jim owns D2–D6. Do not flip boston live from this pack. Do not invent city=bos, city=mbta, city=boston-mbta, or city=us.

Drop later (Jim D2): qa/fixtures/boston/published-network.json. Research pack is docs/boston-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

D1 = official MBTA **Subway Map** https://cdn.mbta.com/sites/default/files/2026-06/2026-06-14-subway-map-v01.pdf (PDF title MBTA | Subway and frequent bus routes | Effective June 14, 2026; HTTP Last-Modified **Thu, 18 Jun 2026 15:25:24 GMT**; footer © MBTA June 2026) plus official line / stops pages as support only. Index https://www.mbta.com/maps (`/subway-map` 302s to the PDF). Modes v1: **subway / rapid transit only** — Red, Orange, Blue, Green B/C/D/E, Mattapan. No Silver Line BRT, no bus, no ferry, no Commuter Rail, no CapeFlyer, no Massport shuttles. Stations hand-transcribed from map images. **Not generated from GTFS.**

Eight services: **Red** Alewife–Ashmont & Braintree (22), **Orange** Oak Grove–Forest Hills (20), **Blue** Wonderland–Bowdoin (12), **Green B** Boston College–Gov't Center (23), **Green C** Cleveland Circle–Gov't Center (20), **Green D** Riverside–Union Sq (25), **Green E** Heath St–Medford/Tufts (25), **Mattapan** Ashmont–Mattapan (8). **125** unique open rapid-transit stops. Mattapan is on the official rapid-transit legend — included, not folded into Red.

Hub lock **Park Street**. Why: official subway map prints it as the Red × Green inner transfer; all four Green services call it; Nico clash report locked it. Not Downtown Crossing, not Gov't Center, not State, not South Station, not North Station, not Downtown. **doNotGroup** those downtown buildings.

C2/C3: (1) Separate city boston, agency MBTA. Do not invent city=bos. (2) Lock Park Street; Red × Green. (3) Subway only; Silver Line out. (4) Green B/C end at Gov't Center; D Union Sq; E Medford/Tufts; E skips Hynes/Kenmore. (5) Red Ashmont vs Braintree at JFK/UMass. (6) Mattapan is its own line from Ashmont. (7) Map abbreviations (Gov't Center, Tufts Medical Ctr, Mass. Ave, Hynes Convention Ctr, Sq / St / Ave / Rd / BU).

H2: no product boston stations.json. Map-vs-page (Gov't vs Government; Ctr / Ave / Sq expansions) plus **zero** mix-in with washington / chicago / bart.

**Live boards: official path exists; D1 stays planned.** (1) **V3 API** `GET https://api-v3.mbta.com/predictions` — optional header `x-api-key` from https://www.mbta.com/developers. Unauthenticated **200** on 29 Aug 2026 (rate-limit 20). Filter subway routes **Red, Orange, Blue, Green-B, Green-C, Green-D, Green-E, Mattapan**. Park Street / Downtown Crossing / Gov't Center / State are different stop-places — doNotGroup. (2) **Static GTFS** `https://cdn.mbta.com/MBTA_GTFS.zip` — **no key**, **not a D1 generator**. (3) GTFS-RT from https://www.mbta.com/developers/gtfs-realtime. **Never paste a key.** The optional key is **not a D1 blocker**. **D1 stays planned.** assertCityLive("boston") must fail.

H7: America/New_York **HAS DST** (EDT/EST). Do not copy Perth / Brisbane no-DST.

§3 rec: line + terminus (`Red Line + Alewife`, `Green Line B + Boston College`, `Mattapan Line + Mattapan`). Flag: inbound/outbound dies at Park Street. **Park Street is a hub stop string, not a direction token.** Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **boston**. Do not flip from this pack. Testers live is Jim’s job, not this pack’s flip. Not cut #1.

---

## Jim → Mark note (adapter wired, 6 Sep 2026)

`lib/providers/boston.js` + `lib/cities/boston/{stations.json,marketing-directions.js}` wired. Registry entry `status: "planned"`, `adapterReady: true` — **not** flipped live; that stays Tim/Mark's call. `assertCityLive("boston")` still returns 501 (verified in `qa/boston-planned-gate.mjs`, registered in `qa/run-all.mjs`'s smoke tier).

- **Standalone adapter, not a shared-provider config.** Unlike Copenhagen/UK-Darwin, MBTA is Boston's own agency with no other Next Train city on the same feed, so this follows the Adelaide/Perth storage pattern (`loadGtfsStatic({url})` over a committed catalog object, `lib/cities/boston/stations.json`) rather than the config-over-shared-provider shape.
- **125-station catalog** built directly from `published-network.json`'s per-line `stations[]` arrays (order preserved), with `aliases[]` populated only for genuine map-abbreviation ↔ official-long-form renames (Gov't Center/Government Center, Tufts Medical Ctr/Center, Mass. Ave/Massachusetts Avenue, the `Sq→Square`/`St→Street`/`Ave→Avenue`/`Rd→Road`/`Ctr→Center` family, BU East/Central → Boston University East/Central, Northeastern → Northeastern University). No alias was added across any of the hazard-pack's documented doNotCollapse pairs (Harvard vs Harvard Ave, Central vs Central Ave, Chestnut Hill vs Chestnut Hill Ave, Washington St vs Washington Sq, Longwood vs Longwood Medical Area) — verified no alias collides with another station's canonical name (gate assertions).
- **Stop resolution is exact-match, not the shared substring helper.** `gtfs/static-cache.js`'s `findRailStopIdsForName` (`name.includes(needle)`) would silently collapse Central into Central Ave (and similar pairs) — used instead: `lib/providers/boston.js`'s `resolveStopIds`, doing exact fold-key matching against each catalog entry's name + aliases, then expanding to parent/child platform stops the same way the shared helper does. Everything else (`loadGtfsStatic`, `buildBoardForStops`, GTFS csv parsing) is reused unchanged.
- **Route classification is by exact GTFS `route_id`** (Red/Orange/Blue/Green-B/C/D/E/Mattapan — matches `published-network.json`'s `gtfsRouteIdsIfKnown` exactly), resolved from the trip table (`lineIdForTrip`) rather than `routeShortName`/`routeLongName` string-matching, since MBTA's `route_short_name` is blank for several of these routes. `BOSTON_ROUTE_TYPES = ["0","1"]` (light rail + subway) is only a first-pass parse-level filter — **unverified against a live payload, flag for D2** (same caveat class as Copenhagen's `COPENHAGEN_ROUTE_TYPES`).
- **Direction model implements memo §3 recommendation A** (line + terminus) in `lib/cities/boston/marketing-directions.js`: `mapLineTerminusDestination` only ever emits a terminus that's a member of that line's own `LINE_TERMINI` list, falling back to the bare line label otherwise — this guarantees a hub string (Park Street/City/Downtown) can never leak into a direction chip, with no separate forbidden-token filter needed on the output. Gov't Center IS a valid Green B/C direction terminus (the legend inner end); it's only forbidden as a Park Street *identity* proxy (`isForbiddenHubProxy`), a distinct check from the direction model.
- **No live real-time path wired.** MBTA V3 API (`api-v3.mbta.com/predictions`) works unauthenticated per the D1 pack's probe (200, rate-limited 20/window) but no key was registered, per the explicit instruction not to sign up for anything. `MissingMbtaApiKeyError` is exported and documented in the `lib/providers/boston.js` file header for whoever wires that path later — it is not thrown anywhere in the current code path (schedule-only GTFS static board).
- **Follow-through NOT done, by design:** no dogfood module, no `live-city-api.js` dispatch wiring, no `*-dogfood-gate.mjs`. Per the current guardrails that bundle only happens once Mark's QA is green and the flip is imminent, and even then the `MULTI_CITY_IDS`/`brisbane-dogfood.js`/`journey-model.js` three-list additions get bundled into the actual status-flip commit, not before.
- **Open items carried from D1, not resolved by Jim:** direction-model-memo.md's open question 1 (spoken/printed line token wording) and open question 3 (Gov't Center vs Government Center chip wording) are both already locked in code as the map-print short forms (`Green Line B`, `Gov't Center`) — flag for Tim if that's not what he intended when he reviews.

No product edit, no Perth edit, no live flip, no merge of other PRs, no API key registered/pasted, no `washington`/`chicago`/`bart` adapters touched.

---

## Flip commit — exact edits (docs/jim-brief-us-flip-readiness.md, 20 Sep 2026)

Coordinates, the `United States` picker country (Coming Soon), `lib/cities/country-regions.js`,
and Boston/BART/Chicago's `CITY_BOUNDS` boxes all landed ahead of the flip in the readiness PR —
none of those need touching at flip time. `qa/live-city-lists-sync.mjs` derives its expected sets
from `CITIES.filter(status === "live")`, so once Boston's status flips, these are the *only*
remaining edits (worked out by reading that gate's own numbered checks 1–8):

1. `lib/providers/registry.js` — Boston's `status: "planned"` → `status: "live"`.
2. `lib/cities/live-city-api.js` — add `"boston"` to `MULTI_CITY_IDS`.
3. `public/app.js` — add `"boston"` to both `NEARBY_MULTI_CITY_IDS` and `LIVE_CITY_IDS`.
4. `public/city-session.js` — add `"boston"` to its own `MULTI_CITY_IDS`; on the picker's
   `boston` region entry, drop `comingSoon: true` (or set it `false`).
5. `public/brisbane-dogfood.js` — add `"boston"` to `MULTI_CITY_IDS`; add a `boston` key to the
   `available` map.
6. `public/journey-model.js` — add `"boston"` to `PERSISTED_CITY_IDS`; add `"us"` to
   `PERSISTED_COUNTRY_IDS` (unless BART or Chicago flipped first and already added it).
7. `public/city-session.js` `CITY_BOUNDS` — already present (this PR); no action.
8. `lib/cities/country-regions.js` — already present (this PR); no action.

Same recipe applies to BART (`docs/bart-d1/jim-handoff.md` references this section) and Chicago,
swapping the city id and (for `PERSISTED_COUNTRY_IDS`) skipping step 6's country id add if a
different US city already flipped first.

**Not derived here, flagged as a follow-up instead (per the brief):** the eight-list requirement
itself may be more duplication than necessary — `MULTI_CITY_IDS` appears three times
(`live-city-api.js`, `app.js`'s `NEARBY_MULTI_CITY_IDS`, `city-session.js`) and could plausibly
derive from the registry's `status === "live"` set at build/import time instead of being
hand-copied per flip. Out of scope for this PR; a real refactor risks exactly the kind of
"missed one copy" regression `live-city-lists-sync.mjs` exists to catch, so it deserves its own
brief and gate re-verification rather than a drive-by change here.
