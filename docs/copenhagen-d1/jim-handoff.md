Copenhagen D1 + research pack (Luke), 30 Aug 2026. City stays **planned**. Existing live/planned
cities untouched. `assertCityLive("copenhagen")` must still fail (city not in
`lib/providers/registry.js` today). No generator committed, no PR, no product edit, no
`lib/providers/` or `registry.js` edit.

**Do not build the Copenhagen adapter from this pack in an unattended/overnight session.** Per
explicit instruction from the task that produced this pack, Copenhagen's D2 adapter work is
scoped for a **supervised session** given how much the board-eligibility scope grew tonight
(Metro-only v1 became Metro + S-tog + DSB Regional/InterCity + Öresundståg at four shared
stations). This file is a research handoff, not a green light to proceed unattended.

Pack files: `docs/copenhagen-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=copenhagen**, three-operator v1: Metroselskabet (Metro M1-M4, 44 stations, all in-catalog)
  + S-tog (DSB, 7 lines A/B/Bx/C/E/H/F) + DSB Regional/InterCity/InterCityLyn + Öresundståg
  (Skånetrafiken co-branded). Not `city=denmark`. Per `docs/denmark-ledger.md`, Rejseplanen is a
  genuine national platform - build Copenhagen as a **config over a shared Rejseplanen provider**,
  not a per-city clone (same architecture as UK/Darwin, opposite of Sweden's/Finland's per-city
  adapters). Confirm this decision still holds if you're the one wiring D2.
- **Hub lock: Kongens Nytorv** (Metro-only, all four lines, confirmed zero rail/S-tog transfer via
  its own row in the station-list table). Do not fold Nørreport/København H/Nørrebro/Nordhavn into
  it - those are separate multi-operator nodes.
- **Station graph for Metro M1-M4 (44 stations) is hand-transcribed from Wikipedia's station list +
  4 station infoboxes, cross-validated two independent ways**: (1) the "Time to Nørreport" minute
  column on the master list reproduces every trunk/branch ordering used in `published-network.json`;
  (2) each shared station's own `Adjacent stations` table (a separate, independently-sourced
  Wikipedia infobox field) confirms the immediate neighbours at every branch point. M3 is a **true
  ring** with no linear terminus (direction = clockwise/counter-clockwise, sourced from Nørrebro's
  infobox literally using those words) - do not reuse the Oslo line-5 loop-then-spur recipe here,
  it's a different topology.
- **Two corrections against the oracle report's C2/C3 section, both evidence-backed (hazard-pack.md
  H2)**: Nordhavn is **five** S-tog lines (A, B, Bx, C, E), not six - line H stopped serving Nordhavn
  in 2017, confirmed independently by Nordhavn's own infobox/adjacent-stations data AND the H line's
  own Wikipedia article. Nørreport is **six** S-tog lines (A, B, Bx, C, E, H), not just "C line" as
  the oracle report's phrasing implied. **Use the tables in direction-model-memo.md, not the oracle
  report's C2/C3 prose, for the S-tog filter allow-list per station.**
- **doNotGroup, four shared stations, each independently sourced**: Nørreport (Metro M1/M2 vs S-tog
  all 6 vs DSB/Öresundståg, 3-way, widest single-node surface), Nørrebro (Metro M3 vs S-tog F only,
  2-way, simplest), København H (Metro M3/M4 vs S-tog all 6 vs DSB/Öresundståg vs EuroCity-excluded,
  4-way, widest overall), Nordhavn (Metro M4 vs S-tog 5-of-6 lines sharing one island platform, 2-way
  but the highest single-platform line count). Full detail and worked chip examples in
  direction-model-memo.md, especially the Nordhavn section (task brief flagged this as the hardest
  case - do not collapse the five lines to a shared neighbour-station token, keep line letter as the
  primary key on every departure row).
- **License: CC BY 4.0** for Rejseplanen GTFS static (attribution required, redistribution/commercial
  use permitted). API 2.0/SIRI-ET terms need confirmation at registration (per oracle report).
- **Europe/Copenhagen HAS DST.**

## What is still NOT solid - resolve before/at D2, don't wire around

1. **Two unverdicted cross-border services at København H**: SJ (Stockholm, Southern Main Line) and
   České dráhy (Prague, RJ) both call at København H per the primary source data pulled for this
   pack, but neither has a board-eligibility verdict in the oracle report's table. Per
   `docs/board-eligibility-rule.md`, silence is a QA failure - **get a verdict from Nico/Tim, added
   to the oracle report or the Denmark ledger, before deciding either way.** Not in
   `published-network.json`.
2. **Öresundståg at Nørreport, not just København H.** København H's own Adjacent-stations data
   names Nørreport as an Öresundståg call point (all four corridors), but the oracle report's Board
   eligibility table only verdicted København H. I've included Nørreport in `published-network.json`
   on the reasoning that it's the same service/same boarding contract just an earlier stop, but this
   is flagged for Tim to confirm, not a settled call - see direction-model-memo.md open question 4.
3. **M3 direction token wording** (`Clockwise`/`Counter-clockwise` in English vs Danish "med
   uret"/"mod uret") - no printed passenger-facing convention found in sources. Open question 1 in
   direction-model-memo.md.
4. **S-tog A's short-turn handling** (fixed Hillerød↔Køge chip pair vs per-trip far-end from the live
   feed) - same open-question shape as Malmö's ring line. Recommend fixed pair for D1/D5, per-trip
   overlay at D2+.
5. **Regionaltog/InterCity destination lists are indicative, not exhaustive** - sourced from one
   station's Adjacent-stations snapshot (Valby, København S, Høje Taastrup, Ringsted, Odense,
   Copenhagen Airport), not a full DSB timetable. Verify against the live feed at D2.
6. **Rejseplanen API 2.0 real-time coverage for all three operators** - oracle report says confirmed
   working (2026-08-30 note) but flags it as something to re-verify while building, not settled.
   Same for SIRI-ET/GTFS-RT via Dataudveksleren.
7. **DSB EuroCity exclusion is seasonal** (compulsory reservation 26 Jun-16 Aug only) - the current
   `published-network.json` excludes it entirely rather than modeling a seasonal in/out toggle. If
   Tim wants seasonal display, that's a D2+ product decision, not assumed here.

## Direction model (full detail: direction-model-memo.md)

- **Metro linear lines (M1, M2, M4)**: line + terminus, e.g. `M1 + Vestamager`.
- **Metro M3 (ring)**: clockwise / counter-clockwise, never a fake terminus pair.
- **S-tog (A, B, Bx, C, E, H, F)**: line letter + official terminus, scoped to the shared stations
  only (not the full network) - e.g. `C + Klampenborg`. Nordhavn's five-line shared platform keeps
  the line letter as the primary token on every row.
- **DSB Regional/InterCity/InterCityLyn/Öresundståg**: no line code exists - service type +
  destination, e.g. `Regionaltog + Ringsted`, `Öresundståg + Lund`.
- Kongens Nytorv is the only hub-lock string; never a direction token anywhere in this pack.

## What I did not do

No live flip, no UI wiring, no D5 assertion tables, no adapter code, no `lib/providers/` or
`registry.js` edit, no live fetch of the official m.dk PDF map or the Rejseplanen GTFS feed (used
Wikipedia as the checkable D1 source instead, per hazard-pack.md), no resolution of the SJ/České
dráhy board-eligibility gap (flagged, not decided), no Aarhus scoping (unscoped, Later, per
`docs/denmark-ledger.md`), no edits to any other city's pack or to the Denmark ledger itself (that's
Nico's/the country-lane's job if the SJ/České dráhy gap or the Öresundståg-at-Nørreport question
gets resolved).

## Lane status

`node qa/lane-lock.mjs release Denmark` was run after this pack was written - the pack is complete
by the shape of every other `docs/<city>-d1/` folder (4 files) and every claim in it is sourced.
The **adapter build is intentionally NOT started** - that's the one open item, and it's open by
design (supervised session), not because this pack is incomplete.

## Jim's note for Mark (adapter wired, 6 Sep 2026, supervised session)

City stays `planned`/`adapterReady`; `assertCityLive("copenhagen")` still fails (501). Files:
`lib/providers/rejseplanen.js` (shared provider — Copenhagen is a config over it per
docs/denmark-ledger.md, so Aarhus can be a second config later without a fork),
`lib/providers/copenhagen.js` (allow-list + direction model config),
`lib/cities/copenhagen/{stations.json,line-map.json,marketing-directions.js}`, registry entry,
`qa/copenhagen-planned-gate.mjs` (registered in `qa/run-all.mjs` smoke tier).

**Schedule-only, by design, not a shortcut.** Static GTFS
(`https://www.rejseplanen.info/labs/GTFS.zip`) needs no key, so that's what's wired. Real-time
(Rejseplanen API 2.0 `departureBoard` or SIRI-ET) both require a key registered at
labs.rejseplanen.dk — per this task's explicit instruction, I did not register for one.
`MissingRejseplanenApiKeyError` is exported from `rejseplanen.js` for whoever wires that path
next; nothing currently throws it because the static path never needs it.

**No stopIds baked into the catalog** (none in this D1 pack) — `fetchStationBoard` resolves
GTFS stop_ids at request time by name match against the live static feed
(`findRailStopIdsForName`), same runtime-resolution pattern as `lib/providers/malmo.js`'s
`resolveStopIds`. This means the catalog has never been checked against a real parsed feed —
that check is still open, see below.

**What's unverified — please confirm live before any flip, not assumed here:**
1. Exact GTFS `route_type`/`agency_id` values separating Metro / S-tog / DSB / Öresundståg on
   this feed (hazard-pack.md items 5-6). Filtering here uses `route_short_name` allow-lists for
   Metro/S-tog (both have real line codes) and a `route_long_name`/`route_desc` regex heuristic
   for DSB/Öresundståg (`classifyDsbService` in `lib/cities/copenhagen/marketing-directions.js`,
   which has none) — modelled on `lib/providers/malmo.js`'s route_desc precedent for
   Öresundståg/Krösatågen, but not itself confirmed against a live Rejseplanen payload.
2. Whether `findRailStopIdsForName("Nørreport")` etc. actually resolve to the right stop_ids
   once the real GTFS.zip is parsed and doesn't collide with a same-named stop elsewhere in the
   national feed (this is a 25+ operator, 37,287+ stop feed — much bigger namespace than
   Malmö's regional file).
3. M3's real headsign wording for clockwise/counter-clockwise (`mapM3Direction` in
   marketing-directions.js normalizes English + the Danish "med uret"/"mod uret", but the exact
   printed convention is still open question 1 in direction-model-memo.md — needs Tim).
4. The two hazard-pack.md open items that are Nico/Tim's call, not mine: SJ Stockholm /
   České dráhy Prague board-eligibility verdict at København H (excluded, not decided), and
   whether Öresundståg's `in` verdict extends to Nørreport (currently included here on the
   evidence-shape reasoning in published-network.json, flagged not settled).

**QA run this session:** `node qa/copenhagen-planned-gate.mjs` (unit-tests the allow-list/
direction-model logic against synthetic trip objects — deliberately does NOT live-fetch the
national GTFS.zip in-gate, since it's a large nationwide download, not appropriate for the
smoke tier) and `node qa/live-city-lists-sync.mjs` both green. `node qa/run-all.mjs --smoke`
was started but ran very slowly in this shared/contended dev environment (unrelated Next.js/
vitest processes for another project competing for CPU on the same machine) — see the PR body
for exactly how far it got before I stopped waiting and relied on CI for the rest.

## Jim's note for Mark (flip follow-through, 20 Sep 2026, REJSEPLANEN_API_KEY now available)

Status stays `planned`; `assertCityLive("copenhagen")` still 501s. Added per the flip-follow-
through split (CLAUDE.md, "Do now, ahead of the flip"): `lib/cities/copenhagen/
dogfood-next-train.js`, the `copenhagen` dispatch cases in `lib/cities/live-city-api.js`'s
`directionsFor`/`getMultiCityNextTrain`, and `qa/copenhagen-dogfood-gate.mjs` (replaces the
retired `qa/copenhagen-planned-gate.mjs`, carrying forward every assertion it made). Not added
(Mark's flip commit, per the same split): `copenhagen`/`denmark` to `MULTI_CITY_IDS`, the
`MultiCityId` typedef, `brisbane-dogfood.js`'s mount/available map, or `journey-model.js`'s
persisted-city/country lists — `qa/live-city-lists-sync.mjs` stays green with those four
untouched.

Directions are derived LIVE from the board's own already-computed chip strings (not a static
marketing-directions enumeration) — see the dogfood module's file header for why: DSB
Regional/InterCity/InterCityLyn/Öresundståg destinations are "indicative, not exhaustive" per
this file's earlier open item 5, so a fixed chip list would fabricate coverage.

**Ran with the now-available `REJSEPLANEN_API_KEY` set (`node --env-file=.env.local ...`) and
also without it** — both pass identically, because the static GTFS path this adapter uses
needs no key (only a future API 2.0 `departureBoard`/SIRI-ET real-time path would). The key's
presence didn't change what got wired here; real-time is still not wired (see the adapter file
headers) — this remains a schedule-only board, same posture as before.

**Confirmed live against the real `GTFS.zip` and fixed two adapter defects found in the
process** (previously flagged as "unverified — please confirm live before any flip" above,
item 1 and item 3's underlying assumption):

1. **Regionaltog/InterCity/InterCityLyn were being silently dropped from every board.**
   `classifyDsbService()` only checked `route_long_name`/`route_desc`, which the D1-era
   comment assumed carried the service-type text. The real feed leaves both EMPTY for these
   three and instead puts a short code on `route_short_name`: `RE` (Regionaltog), `IC`
   (InterCity), `ICL` (InterCityLyn) — confirmed by pulling the real feed at København H and
   Nørreport. Fixed by adding a `DSB_SHORT_CODES` lookup checked first, before the text
   heuristic. This is exactly the class of bug `docs/board-eligibility-rule.md` exists to
   catch: all three are verdicted `in` by the oracle report and were being excluded anyway.
   `qa/copenhagen-dogfood-gate.mjs` now asserts both the short-code classification and a live
   check that København H's board actually surfaces at least one chip of each. EuroCity
   (`ECE`) and České dráhy (`RJ`) also carry short codes on the same feed but are deliberately
   NOT added to `DSB_SHORT_CODES` — both stay excluded per their `out-reservation` verdicts,
   confirmed still excluded live after the fix.
2. **Öresundståg was unaffected** — its live `route_short_name` is a bare corridor number
   (802/803/804/805) with no stable meaning, but `route_desc` reliably carries the literal
   string `"Öresundståg"`, so the existing text heuristic already worked. No change needed.
3. **M2's "Lufthavnen" terminus didn't fold-match the live headsign.** The real feed's M2
   airport-bound headsign is `"Københavns Lufthavn St. (Metro)"` — missing the "en" suffix
   that `resolveTerminus()`'s plain substring test needed. Every other Metro/S-tog terminus in
   this pack (Vanløse, Vestamager, Klampenborg, Frederikssund, ...) matched fine; only this
   one needed a fix. Added a small `FEED_TERMINUS_ALIASES` map (one entry) rather than
   loosening the general match, to avoid accidentally widening any other terminus's match.
4. **M3's ring-direction headsign is NOT "clockwise"/"counter-clockwise" or the Danish
   equivalent on the live feed — it's the next major interchange name plus "(Metro)"** (e.g.
   `"M3 + København H (Metro)"`). This answers open question 1 (direction-model-memo.md) but
   is a product-copy decision, not something I changed code for: `mapM3Direction()` still
   passes the raw string through unchanged when it doesn't match the clockwise/counter-
   clockwise words, which is what's happening here — honest, not fabricated, just not the
   originally-assumed wording. Flagging for Tim/Mark to decide whether "M3 + København H
   (Metro)" is acceptable rider-facing copy or whether the next-stop name should be mapped to
   a clockwise/counter-clockwise label instead (would need a per-station lookup, since the
   "next stop" differs by direction and by where you board).
5. **SJ X2000 was not seen calling at København H or Nørreport in this live pull** (searched
   by both route_short_name and route_desc/route_long_name text) — only `ECE` (EuroCity) and
   `RJ` (České dráhy) appeared as excluded services in the multi-hour live window checked. Not
   a contradiction of the oracle report's verdict (SJ may simply not have had a departure in
   the checked window, or its GTFS route id differs from what was searched) — flagging for
   Mark to note, not a claim that SJ doesn't call there.

No live fetch of the API 2.0 `departureBoard` or SIRI-ET endpoints was attempted (out of
scope for this pass — real-time wiring is separate D2+ work per the adapter file headers).

## Jim's note — live-board wiring STOPPED, Metro has no real-time on API 2.0 (20 Sep 2026)

`REJSEPLANEN_API_KEY` is now set (`.env.local` and Vercel). Dispatched to wire the API 2.0
`departureBoard` as the live board source per Tim's standing rule (Göteborg, PR #332: no live
times, no region). **Stopped before wiring anything** because the first-thing verification step
this task required — confirm Metro carries real-time before proceeding — came back negative,
reproducibly, at three different stations. This is a Tim decision, not something to paper over.

**Evidence (live pulls, 2026-09-19/20, `https://www.rejseplanen.dk/api/departureBoard`,
`format=json`).** Every non-Metro mode observed (S-tog, Regionaltog, ICL, Bus) carries a
`prognosisType` field (`"PROGNOSED"` or `"CALCULATED"`) on **every** row, present whether or not
the train is currently delayed — this is the real-time marker; `rtTime`/`rtDate`/`rtTrack`/
`rtPlatform` are added on top of it only when there's an active deviation from schedule. Example,
København H S-tog (`extId=8600626`): 27/27 rows have `prognosisType`, several also carry `rtTime`
(e.g. `C` line: `"time":"19:38:00"`, `"rtTime":"19:39:00"`). Regionaltog at the same stop:
18/18 rows have `prognosisType:"PROGNOSED"` (none delayed in that window, but the RT machinery is
clearly running). ICL 50054 at the same stop: `"time":"19:18:00"`, `"rtTime":"19:37:00"`,
`"platform":"6"`, `"rtPlatform":"5"` — an active 19-minute delay + platform change, i.e. definitely
real-time-capable.

**Metro rows have none of this, at every station checked:**
- København H (Metro-tagged stop, `extId=8603330`): 12/12 Metro rows, 0 with `prognosisType`,
  0 with `rtTime`/`rtDate`/`cancelled`.
- Nørreport (`extId=8600646`, combined board): 6/6 Metro rows, same — 0 with any RT field.
- Kongens Nytorv, the hub-lock station and Metro-only (`extId=8603308`): 17/17 Metro rows, 0 with
  any RT field.

Every Metro row across all three pulls has exactly `name`, `time`, `date`, `direction`,
`track`/no-track, `JourneyStatus` — a pure schedule row, no `prognosisType` key present at all
(not present-but-empty; absent). Note: København H and Nørreport's `departureBoard` responses
combine every co-located stop within the walking radius regardless of which of that node's
several `extId`s you query (verified: querying the rail extId and the Metro extId at København H
returned byte-identical 151-row combined boards including Metro, S-tog, DSB, and bus) — so this
isn't an artefact of asking the wrong stop id.

**This does NOT match the "later corrected" note in the earlier entry above** (dated before this
session): that entry implied Metro RT exclusion was an oracle-report-era misunderstanding, since
fixed. My direct pull says otherwise — Metro genuinely has no real-time surface on the API 2.0
`departureBoard` endpoint, full stop, as of today. I have not tried SIRI-ET via the Dataudveksleren
NAP (a different endpoint, out of scope for this pass) — it's possible Metroselskabet's own
real-time only flows through that path, or through a Metroselskabet-specific feed, not through
Rejseplanen's aggregation. That's unverified, not assumed either way.

**Why I stopped rather than wiring a partial board.** The task's stop condition was explicit: no
Metro RT → stop, evidence into this file, docs-only PR, report back, Tim decides. Wiring live
S-tog/DSB/Öresundståg while leaving Metro on the schedule-only static path would put schedule-only
departures back on a Copenhagen board — the exact thing Tim's standing rule (no live times, no
region) exists to prevent, since the pack's own scope is Metro + S-tog + DSB + Öresundståg
together, not Metro carved out. A mixed board without a live/timetable marker (FB-57, still
undecided) would be indistinguishable from live to a rider.

**Options for Tim, not decided here:**
1. Check whether SIRI-ET / Dataudveksleren carries Metro real-time separately from the aggregated
   Rejseplanen API 2.0 board — if so, Copenhagen would need a two-source board (Rejseplanen for
   S-tog/DSB/Öresundståg + a second feed for Metro), a materially bigger D2 than a single-provider
   config.
2. If no Metro RT exists anywhere reachable, decide whether Copenhagen ships as S-tog + DSB +
   Öresundståg only (Metro excluded from v1, contradicting the pack's board-eligibility scope) or
   stays parked entirely until a Metro RT source turns up.

**No code changed this session.** `lib/providers/copenhagen.js`, `lib/providers/rejseplanen.js`,
`registry.js`, and `qa/copenhagen-planned-gate.mjs` are untouched — still schedule-only, still
`planned`, exactly as the previous entry left them. The M3 ring-direction wording question (open
question 1, direction-model-memo.md, partially answered by the previous session's live pull —
`"M3 + København H (Metro)"` next-interchange-name headsigns rather than clockwise/counter-
clockwise) is still open and unchanged; no copy was touched this session either.

**Quota note.** This session made 8 live calls total (3 `location.name`, 5 `departureBoard`)
against the free tier's 50,000 calls/month — negligible, but flagging since no gate exists yet to
bound this: any future live-wiring QA gate should mock the HTTP layer rather than hitting the
real endpoint repeatedly per CI run, same pattern as the Göteborg/Helsinki dogfood gates.
