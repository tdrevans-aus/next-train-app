Prague D1 + research pack. City stays **planned** until Jim wires testers live. No other city's
files touched. `assertCityLive("prague")` must still fail (city is not in `lib/providers/registry.js`
CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
prague live from this pack. Do not invent city=praha, city=pida, city=pid, or merge into another
Czech adapter — none exists yet.

Drop later (Jim D2): `qa/fixtures/prague/published-network.json`. This research pack is
`docs/prague-d1/`: `published-network.json`, `oracle-clash-report.md`, `hazard-pack.md`,
`direction-model-memo.md`, `jim-handoff.md`.

D1 station roster is reproduced from the official topology cited in the oracle report — [List of
Prague Metro stations](https://en.wikipedia.org/wiki/List_of_Prague_Metro_stations) — **not
independently re-fetched in this lane (no live-fetch tool available to Luke)**. The roster is
stable/well-documented (three lines, unchanged station counts for several years) and matches the
oracle report's verified per-line counts and interchange names. **Before any product edit, cross-
check every `stations[]` entry against PID static GTFS `stops.txt` `stop_name`** (verified live 200
anonymous at https://data.pid.cz/PID_GTFS.zip, per oracle report, no key required) — both for
completeness and for exact diacritic form (some feeds ASCII-fold Czech names; this pack's strings
carry full diacritics and must not be silently normalized).

Three lines: **A** Nemocnice Motol – Depo Hostivař (17 stations), **B** Zličín – Černý Most (24
stations, longest), **C** Letňany – Háje (20 stations, oldest). **61** line-station ticks (sum of
per-line counts); **58** unique station strings (61 minus the three interchange names each counted
on two lines: Muzeum, Můstek, Florenc). The oracle report's "61 unique D1 metro names" phrase is
the tick count, not the unique-name count — resolved the same way the Brussels pack distinguished
`lineTicks` (94) from `uniqueNames` (60). **No Line D** (under construction, no passenger service
until 2031-2032 earliest). No tram, bus, trolleybus, funicular, regional rail (Esko), ferries.

Hub lock **Muzeum** (metro **A × C**, beneath Wenceslas Square / National Museum), per this task's
instruction and the oracle report's "Muzeum listed first" tracker note. **Not Můstek** (A × B,
secondary), **not Florenc** (B × C, third vertex). No single station serves all three lines — this
is a **triangle of three two-line interchanges**, unlike Brussels' single 4-line cross or
Copenhagen's single hub. doNotGroup all three against each other.

C2/C3: (1) Separate city `prague`, agency PID (coordinator ROPID) / DPP (operator, metro). Do not
invent city=praha/pida/pid. (2) Lock Muzeum as hub; Můstek and Florenc as distinct doNotGroup
interchanges, never merged into the hub or each other. (3) Metro A/B/C only. Line D, tram, bus,
trolleybus, funicular, Esko, ferries all out. (4) Diacritics are load-bearing — lock full-diacritic
official forms (Můstek, Náměstí Míru, Vysočanská, etc.), confirm GTFS `stop_name` match at D2. (5)
No documented short-turn/partial-route codes in the oracle report — `shortTurns: []` is a default
pending D2 GTFS verification (`trip_headsign`/`stop_times`), **not** a confirmed empty; check before
relying on it.

H2 (from oracle report): station rosters and line codes are already public and stable (PID map,
Wikipedia); the actual clash is **mode filtering** (PID GTFS is a full multi-mode feed — filter to
metro only, do not generate `published-network.json` from `routes.txt`/`stops.txt`), **real-time
feed choice** (Golemio proprietary JSON, not GTFS-RT), and **the three-line interchange triangle**
(three separate doNotGroup nodes, not one hub).

**Live boards: Golemio API (api.golemio.cz), keyed later — not a D1 blocker.** Header
`X-Access-Token`. Free registration, non-commercial tier, email verification. No public GTFS-RT
confirmed for PID. This pack has **no key** and did not call the API. Never paste a key. D1 stays
planned. `assertCityLive("prague")` must fail. **Confirm Golemio API endpoint coverage for metro
departures/vehicle positions and ToS commercial-use terms at D2** — oracle report flags both as
open items, license section recommends Tim review Golemio ToS before wiring.

H7: Europe/Prague **HAS DST** (CEST/CET, last Sunday March/October). Do not copy Perth/Brisbane/
Auckland no-DST handling.

§3 rec: line + terminus (`A + Depo Hostivař`, `B + Zličín`, `C + Háje`). **Muzeum is a hub stop
string, not a direction token.** No compass-heading or loop ambiguity reported (each line is a
simple two-end trunk) — simpler direction model than Brussels or Copenhagen, but the interchange
triangle (Muzeum/Můstek/Florenc) must stay three distinct doNotGroup nodes. Hold D5. Jim owns
D2–D6. When Jim wires, testers can pick city id **prague**. Do not flip from this pack — testers
live is Jim's job, not this pack's flip.

## Gaps flagged back (not guessed at)

1. **Station roster not independently re-verified against GTFS** — reproduced from the oracle
   report's cited Wikipedia source only, since this lane has no live-fetch tool. Confirm against
   PID `stops.txt` before product edit (see hazard-pack.md, top note).
2. **No short-turn/partial-route service pattern documented.** `shortTurns: []` is a default, not a
   confirmed empty. Verify against GTFS `trip_headsign` at D2.
3. **Golemio API endpoint coverage and ToS/commercial-use terms unconfirmed.** Oracle report
   explicitly defers this to D1/D2 and recommends Tim review Golemio ToS before wiring — do not
   treat Golemio as license-clear the way PID's static CC BY 4.0 GTFS is.
4. **DPP metro agency/route filter string in GTFS not yet confirmed exact** — oracle report says
   "agency 'DPP metro' (or confirmed name)"; confirm exact `agency_name`/`route_type` filter at D2
   against the live GTFS zip rather than guessing a string.

## D2 (Jim, 28 Sep 2026) — appended, not a rewrite

Adapter wired: `lib/providers/prague.js` + `lib/cities/prague/{stations.json, marketing-
directions.js, dogfood-next-train.js, coverage.json}` + `lib/providers/registry.js` entry
(`status: "planned"`, `adapterReady: true`). Registered in `qa/run-all.mjs`'s smoke tier as
`qa/prague-dogfood-gate.mjs` (offline, synthetic Golemio payloads, status-agnostic). Golemio
live-sweep script added (`qa/prague-all-stations-live-sweep.mjs`), not run this session (see
"Live check" below).

**Golemio endpoint confirmed.** GET `https://api.golemio.cz/v2/pid/departureboards?ids[]=<GTFS
stop_id>`, header `X-Access-Token`, confirmed against the live OpenAPI spec at
https://api.golemio.cz/pid/docs/openapi/ (served from
https://api.golemio.cz/docs/static/vp-output-gateway/openapi.json) and a real 200 response
(empty `departures: []`, ~02:15 Prague — metro closed) using `GOLEMIO_API_KEY`. Rate limit: 20
requests / 8 seconds per key (the spec's own "Requests rate" note). `route.type` in a departure
row is the GTFS route_type (1 = metro) — used as a belt-and-braces filter even though the queried
stop_ids are already metro-only platforms.

**Static GTFS cross-check done, not skipped.** `scripts/trim-prague-gtfs.mjs` downloaded the live
~48MB `PID_GTFS.zip`, filtered to route_type 1, and confirmed the kept `route_short_name` set is
exactly `{A, B, C}` — no D. Every one of the 58 D1 station names matched exactly one
location_type=1 (parent station) row's `stop_name` in the FULL unfiltered feed, byte-for-byte
including diacritics — no misses, no duplicates. The trimmed fixture was published to the
next-train-gtfs Vercel Blob store (`gtfs/prague.zip`, 0.51MB zipped) for provenance, but the
resolved stop_ids are baked directly into `lib/cities/prague/stations.json` — the adapter does
NOT read that blob (or any GTFS static feed) at runtime; see lib/providers/prague.js's file
header for why (same "resolve once, store the result" pattern as Vienna's RBL arrays, not
Dublin's per-request GTFS lookup).

**Flora finding.** Flora (Metro A, between Jiřího z Poděbrad and Želivského) has ZERO
`stop_times.txt` rows referencing either of its platform stop_ids (`U118Z101P`/`U118Z102P`) in
the 28 Sep 2026 snapshot — every sampled Line A trip runs Jiřího z Poděbrad -> Želivského
directly, skipping it. This looks like a real, current service gap (e.g. an escalator/engineering
closure), not a fixture bug — Flora's parent + platform stop_ids were confirmed to still exist by
exact NAME match against the full feed (not trip-derived), so `scripts/trim-prague-gtfs.mjs`
unions in every D1-named station's parent+child platforms regardless of whether today's
stop_times touch them, and Flora stays in the 58-station catalog. If Golemio's live board
genuinely returns zero metro departures for Flora, that is an honest reflection of today's real
service, not a bug to paper over — flagged for Mark/Tim to re-confirm before flip whether this is
temporary (docs/board-eligibility-rule.md doesn't apply here — this isn't a mode/product
eligibility question, it's a live-service-pattern one).

**Live check: PENDING, not done.** It was ~02:15 Monday Prague time (Prague Metro closed
~00:00-04:40 local) when this adapter was built and QA'd — every live network step above (the
Golemio endpoint confirmation call, the GTFS static trim/cross-check) was done for real, but a
genuine end-to-end `fetchStationBoard()` call at Muzeum/Můstek/Florenc/a terminus during actual
service hours was NOT performed this session. `qa/prague-all-stations-live-sweep.mjs` is written
and ready (headway-aware, evidence log at `docs/prague-d1/live-sweep-log.jsonl`, 9-minute runtime
cap, modelled on Dublin's) but has not been run — left for Mark to run during Prague daytime/
evening service (`node --env-file=.env.local qa/prague-all-stations-live-sweep.mjs`).

**Golemio API ToS.** Not independently verified this session (oracle report's license section
recommends Tim review before commercial wiring) — not a D2 blocker per the pack's own
instruction, but flagged again here for Mark/Tim before flip.
