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

## Live verification (28 Sep 2026, ~03:53 Europe/Prague — metro just opened)

After merging master (PR #488 conflict-resolution pass), the Prague Metro's early-morning
service was running, so `fetchStationBoard()` was called for real (not synthetic) at Muzeum and
Můstek using the checked-in `GOLEMIO_API_KEY`:

- **Muzeum** (A x C): 20 trips returned. All A trips resolved cleanly to `A + Depo Hostivař` /
  `A + Nemocnice Motol`. Every C trip towards Letňany resolved cleanly to `C + Letňany`.
- **Můstek** (A x B): 20 trips returned. All A trips resolved to `A + Depo Hostivař` /
  `A + Nemocnice Motol`; all B trips resolved to `B + Zličín` / `B + Černý Most`.
- Both boards' timestamps and destinations look correct and match the expected line/terminus
  model — no self-terminus leaks, no hub-string leaks, no cross-line contamination (no B at
  Muzeum, no C at Můstek) observed in either live poll.

**NEW FINDING confirming hazard-pack.md H5's flagged gap** ("verify... whether any A/B/C trips
terminate short of the printed line ends... before assuming `shortTurns: []` holds"): it does
NOT hold. At Muzeum, every Line C departure whose real headsign is toward the Háje end printed
**`"Pražského povstání"`** as `trip.headsign` — a genuine, real Line C station (between Vyšehrad
and Pankrác), not Háje itself. This is a real short-turn/partial-route service pattern (observed
consistently across the whole live poll window, not a one-off), most likely an early-morning
reduced-service pattern. `resolveTerminus`/`mapLineTerminusDestination` correctly do NOT fabricate
a matching chip for this (per their "never invent an unknown terminus" contract) and fall back to
the bare `"C"` label — this is the SAFE behaviour (no wrong string shown), but it means riders see
an under-specified direction chip for this real, recurring service, not a wrong one. This is a
**direction-model decision for Tim** (§3 memo says "Hold D5... until Tim locks this," and
explicitly flagged this exact gap as unconfirmed) — options are (a) add `Pražského povstání` as a
second valid C terminus in `LINE_TERMINI.c` so it gets its own `"C + Pražského povstání"` chip, or
(b) leave the bare-`"C"` fallback as the deliberate degraded-but-safe behaviour. Not decided or
changed here — `lib/cities/prague/marketing-directions.js`'s `LINE_TERMINI` is untouched pending
that call. No other short-turn headsigns were observed on A or B in this poll window.

## Correction, 28 Sep 2026 (docs/jim-brief-prague-line-c-short-turn.md — flip prerequisite)

Tim's call above is now made (controller decision under the Washington #482 precedent: real
short-turns are promoted to terminus chips, not left as a bare line label). Re-verified live
against the real Golemio departureboards feed at ~03:53-04:10 Europe/Prague (early-morning
short-turn window, same window as the original finding):

- **Line C, southbound (Letňany -> Háje):** `"Pražského povstání"` confirmed again as a real,
  recurring headsign (41 departures across a full-line-C poll of 90 total departures) — this is
  not a one-off. Added to `LINE_TERMINI.c` as `"C + Pražského povstání"`.
- **Line C, northbound (Háje -> Letňany):** a SECOND short-turn found this session, not previously
  reported — `"Chodov"` (10 departures, all seen at Háje and Opatov, i.e. trips originating at
  Háje and terminating two stops north at Chodov). Chodov is a real, separately-catalogued Line C
  station (between Roztyly and Opatov). Added to `LINE_TERMINI.c` as `"C + Chodov"`.
- **Lines A and B:** re-polled in full (every stop on each line, 86 and 89 departures
  respectively) over the same window — every A departure read `Nemocnice Motol`/`Depo Hostivař`,
  every B departure read `Zličín`/`Černý Most`. No short-turn headsign observed on either line.
  `shortTurns: []` stays correct for A/B on this evidence, but remains a live-sample-of-one for
  those two lines, not an exhaustive schedule audit — a future session should re-check rather than
  treat this as permanently confirmed.

Both C short-turns are geographically direction-aware in the dogfood picker (`marketingLabelsForStation`
in `lib/cities/prague/marketing-directions.js`, via `isTerminusReachableFromStation`): a short-turn
chip is only offered at stations that short-turn's trip actually passes through (e.g. Pankrác,
south of Pražského povstání, never offers that chip; Roztyly, north of Chodov, never offers that
chip), and never at the short-turn terminus itself. Production boards needed no equivalent change —
`resolveTerminus`/`mapLineTerminusDestination` are driven by the live headsign itself, so a station
only ever shows a chip for a trip that genuinely passes it, automatically.

`node qa/prague-dogfood-gate.mjs` carries the synthetic-payload proof (a C trip headsigned
Pražského povstání is counted and correctly chipped at Muzeum, dropped as a self-terminus arrival
at Pražského povstání itself, and the reachability filter is asserted directly) plus the reachable/
unreachable station pairs for both short-turns. Status stays `"planned"` — this is a flip
prerequisite, not a flip.

## Correction, 28 Sep 2026 (docs/jim-brief-prague-flora-sweep-empty-state.md) — Flora resolved as a real gap, not a mapping bug; sweep pacing fixed; honest empty state wired

Mark's QA pass (`origin/mark/prague-flip`, `docs/prague-d1/mark-qa-note.md`) found the sweep
script (`qa/prague-all-stations-live-sweep.mjs`) didn't pace requests to Golemio's documented
20 req/8s limit (18-29/58 stations 429'd per poll, Finding A) and that Flora was empty on every
clean poll with no honest-empty-state support at all (Finding B), plus asked for a re-check of
Budějovická/Kačerov/Roztyly during full service (Finding D). This session's investigation and
fixes:

**Finding B — investigated FIRST, per this brief's instruction, before treating it as a gap.**
Downloaded a fresh copy of `https://data.pid.cz/PID_GTFS.zip` (live, ~50MB, feed span
20260928-20261011) and dumped every stop row whose name folds to "Flora":

```
U118Z1P   Flora  location_type=0  parent_station=(none)   platform_code=A   (tram)
U118Z2P   Flora  location_type=0  parent_station=(none)   platform_code=B   (tram)
U118Z3P   Flora  location_type=0  parent_station=(none)   platform_code=C   (tram)
U118Z4P   Flora  location_type=0  parent_station=(none)   platform_code=D   (tram)
U118Z101P Flora  location_type=0  parent_station=U118S1    platform_code=1   (metro platform)
U118Z102P Flora  location_type=0  parent_station=U118S1    platform_code=2   (metro platform)
U118S1    Flora  location_type=1  parent_station=(none)                      (metro parent station)
```

`lib/cities/prague/stations.json`'s Flora entry used `U118Z101P`/`U118Z102P` — exactly the correct
metro platform ids (not the tram platforms `U118Z1P-Z4P`, which correctly have no parent_station
and were never in scope). **Zero** metro-route (`route_type=1`) `stop_times.txt` rows reference
either id, across the entire current feed (not just today's calendar — every service_id checked).
Dumping a real Line A trip's full stop sequence confirmed the mechanism directly: trip
`991_11915_260207` (Depo Hostivař -> Nemocnice Motol) runs `... Želivského (11:10:05) ->
Jiřího z Poděbrad (11:13:25) ...` — Flora's slot is simply absent between them, the same shape as
Dublin's Connolly (a stop the RT/schedule skips entirely, not a wrong id). Cross-checked against
Mark's own live Golemio evidence: 9/9 clean polls, zero trips, no errors. **Conclusion: a real,
current zero-service gap, not a stop-id mapping bug** — Flora was removed from the serving catalog
(`lib/cities/prague/stations.json`, 58 -> 57 stations; Line A 17 -> 16) with a coverage-note
exclusion (`lib/cities/prague/coverage.json`), same precedent as Dublin's Connolly/Saggart.
`docs/prague-d1/published-network.json` (Luke's D1 pack) is deliberately NOT edited — it stays the
historical 58-name topology record, exactly as Dublin's published-network.json still lists
Connolly/Saggart.

Added an offline static-coverage gate case to `qa/prague-dogfood-gate.mjs` (every catalog station
must have >= 1 metro stop_time in the committed, regenerated `qa/fixtures/prague/gtfs` fixture —
committed directly this session, small enough at ~4MB uncompressed to not need Auckland/
Wellington's gitignore treatment) — this is the exact check that would have caught Flora before it
ever reached a live poll, and now covers all 57 remaining stations.

**Finding A — fixed.** `qa/prague-all-stations-live-sweep.mjs` now batches every station's
stop_ids into requests of <= 50 `ids[]` (Golemio's endpoint accepts up to 100 combined) instead of
one request per station, and paces every request — across the whole run, not reset per poll —
through a sliding-window token bucket capped at 15 requests / 8 seconds (a deliberate margin under
Golemio's documented 20/8s limit). A batch that still 429s is retried once, honouring the
response's `Retry-After` header when present. Re-ran for real against the live API during full
Prague daytime service (~05:37-05:46 Europe/Prague, well past the opening ramp-up): **0 rate-limit
errors across all 9 polls, all 3 batches per poll** (120 stop_ids total across 57 stations).

**Finding D — re-checked during full service, not the opening ramp-up.** Budějovická, Kačerov,
Pankrác and Roztyly (plus Háje, Hůrka, Invalidovna, Kobylisy, Malostranská, Nemocnice Motol, Nové
Butovice, Rajská zahrada) were empty for the whole 9-minute run this session, but none reached the
1.5x-headway (15 min) failure threshold within that runtime cap — reported as "uncertain", not
failed, per the sweep's own design (a 9-minute cap can't always resolve every station's headway).
This is a real re-run during full service (not the early-morning ramp-up Mark's original run
caught), so the gap is likely just these stations' genuine service headway exceeding one 9-minute
window, not a coverage problem — but per the sweep's own evidence-log design, this isn't a final
verdict either way; a longer or repeated run would confirm. Not escalated to a coverage.json
change — no station here showed the Flora shape (confirmed zero in the static schedule too).

**Finding C (honest empty state) — wired.** `lib/providers/prague.js` now loads the same trimmed
static snapshot at runtime (`loadPragueStatic()`, cached, same `loadGtfsStatic()` pattern as
`lib/providers/dublin.js`) purely as a side-computation: when Golemio's live board is empty,
`computeScheduledCandidates()` checks whether the static schedule expects any trip at this stop
within the near-term horizon; if so, `emptyReason: "no-live-predictions"` is set through
`buildNextTrainResponse` (already supports this field, unchanged). This load is best-effort and
non-fatal — any failure (stale 2-week calendar, network, missing blob) is swallowed and just omits
`emptyReason`, never turns a working live board into a thrown error. `qa/prague-dogfood-gate.mjs`
now covers the same three cases as `qa/honest-empty-state.mjs`'s Dublin fixtures (all-empty ->
reason; partial -> no reason; outside hours / nothing scheduled either -> no reason), plus an
unknown-static-state case, all exercised offline via `fetchStationBoard()`'s
`options.departures`/`options.scheduledCandidates` overrides — no network call. The regenerated
GTFS fixture was republished to the `next-train-gtfs` Blob store
(`node --env-file=.env.local scripts/publish-gtfs-fixture-to-blob.mjs prague`) so this runtime
static load resolves against current data.

Status stays `"planned"`. This is a flip prerequisite, not a flip — Mark should re-run QA (his
note's item 3 in particular) once this PR merges.
