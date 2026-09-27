# Vienna flip QA -- Mark, second pass, 2026-09-27

Run on mark/vienna-flip-2 (cut fresh from master @ 4a63ff3, PR #471 "Vienna: add hub-bound U2
direction (Seestadt board was silently empty)" -- the fix for the first pass's RED finding).
Local time in Vienna ~03:53 CEST during endpoint sampling (Saturday-night 24-hour U-Bahn service
still running, ending ~05:00 Sunday) -- confirmed via /api/health timestamp
(2026-09-27T01:53:41Z = 03:53 CEST).

## Verdict: GREEN. Flip PR opened.

The first pass's blocking finding (Seestadt's board and directions silently empty despite six
real live U2 departures) is fixed by docs/jim-brief-vienna-u2-hub-bound-direction.md: U2's
LINE_TERMINI now lists both Seestadt and Karlsplatz, giving Seestadt a real, line-qualified
"U2 + Karlsplatz" hub-bound chip. Re-ran the full checklist end to end against the fix, in the
actual flip-commit state (registry status "live", MULTI_CITY_IDS/lists updated) -- every item is
green, including the two items the first pass could only mark green "on paper."

## Checklist results

1. Board eligibility -- GREEN, including the walk-up rule. docs/vienna-d1/oracle-clash-report.md
   has a full Board eligibility section (line 61 "## Board eligibility"), all verdicts recorded
   (U-Bahn U1-U6 "in"; S-Bahn/Badner Bahn/OBB "out-product"; tram "out-mode"), no "undecided"
   rows. Sampled Praterstern and Landstrasse boards -- both show U-Bahn rows only, no
   S-Bahn/tram/night bus/CAT leakage. Seestadt -- the RED station from the first pass -- now
   returns its real walk-up U2 service: /api/board?city=vienna&station=Seestadt -> one direction
   ("U2 + Karlsplatz"), 6 real trips, 2.3s. This was the hard-fail case the rule exists to catch;
   it is now fixed and verified live.

2. Live-only, no static-as-live-time -- GREEN.
   grep -n "realtime:\|loadGtfsStatic\|stop_times" lib/providers/vienna.js matches only
   realtime: "live" (the literal board-level field set on every returned board, line 214) -- no
   loadGtfsStatic, no stop_times, no static-schedule code path anywhere in the file.
   fetchStationBoard() calls the live Wiener Linien OGD Realtime Monitor every time. Per-trip
   .realtime is never set to false anywhere in lib/providers/vienna.js or
   lib/cities/vienna/dogfood-next-train.js, so lib/train-times-core.js's
   trip.realtime === false check (the Boston-subway-live-predictions rule, added 20 Sep 2026)
   never fires -- every board is treated as live, correctly, by omission (the same convention
   every other provider that doesn't set the field uses).

3. Live cross-check via the rider-facing /api/board and /api/directions endpoints (not just
   fetchStationBoard() in isolation) -- GREEN, all under 3s, spaced >=10s apart to avoid the
   monitor's rate limit (learned the hard way in the first pass). Sampled against a local dev
   server (node dev-server.js, port 3000, confirmed free before starting and stopped
   afterwards) with the registry already flipped to status: "live" (the actual commit state):
   - Karlsplatz: 2.1s, 5 directions (U1 x2, U2 x1, U4 x2), real trips throughout.
   - Floridsdorf: 2.1s, 1 direction ("U6 + Siebenhirten"), 5 trips.
   - Stephansplatz: 1.9s, 4 directions (U1 x2, U3 x2), 4-5 trips each, no S-Bahn/tram rows.
   - Seestadt: 2.3s, 1 direction ("U2 + Karlsplatz"), 6 trips -- the fix, confirmed live.
   - Aspern Nord: 2.3s, 2 directions (U2 + Seestadt: 4 trips; U2 + Karlsplatz: 6 trips) --
     both directions of an intermediate U2 station now populated, per the brief's acceptance
     criterion 1.
   - Praterstern: 2.2s, 4 directions (U1 x2, U2 x2), 4-6 trips each -- both U2 directions
     plus U1, no S-Bahn leakage despite S-Bahn calling nearby.

4. Per-direction trip counts -- GREEN, no zero-trip chip anywhere sampled while service runs.
   Seestadt: exactly one chip ("U2 + Karlsplatz"), 6 trips > 0. Aspern Nord and Praterstern: both
   U2 chips present, each with trips > 0 (4/6 and 6/6 respectively). Karlsplatz: exactly one U2
   chip ("U2 + Seestadt"), never "U2 + Karlsplatz" -- confirmed both live and in
   qa/vienna-dogfood-gate.mjs's karlsplatzLabels assertions. U1/U4 never show a Karlsplatz
   chip anywhere sampled or in the gate's LINE_TERMINI.u1/.u4 assertions.

5. Hub lock and doNotGroup pairs, Europe/Vienna via IANA -- GREEN. Karlsplatz never appears
   as a direction token (mapLineTerminusDestination(VIENNA_HUB, "u1") === "U1", no bare
   "+ Karlsplatz" suffix on U1/U4 anywhere, confirmed both in the gate and live). The new
   "U2 + Karlsplatz" chip is line-qualified, not the forbidden generic hub token -- confirmed the
   self-terminus skip still means Karlsplatz itself only ever offers "U2 + Seestadt" (never a
   self-loop "U2 + Karlsplatz" at Karlsplatz itself), live and in the gate. VIENNA_TIMEZONE is
   the bare IANA string "Europe/Vienna" passed straight to toLocaleTimeString's timeZone
   option -- no manual DST offset math. doNotGroup pairs (hazard-pack.md H1/H4/H6) -- Praterstern,
   Stephansplatz, Landstrasse, etc. are all separately catalogued from Karlsplatz
   (isForbiddenHubProxy rejects all nine); confirmed live none of their boards surfaced a
   Karlsplatz-flavoured row.

6. U5 absent / U2 routing -- GREEN. U5 does not appear anywhere in
   WIENER_LINIEN_LINE_NAME_TO_LINE, LINE_LABELS, or the catalog; no U5 row in any live
   sample. U2's live payload matches the corrected routing: Seestadt shows "U2 + Karlsplatz"
   (hub-bound), Karlsplatz shows "U2 + Seestadt" (terminating), intermediate stations show both.

7. coverage.json rider copy + CC BY attribution -- GREEN.
   lib/cities/vienna/coverage.json: U-Bahn (U1-U6) listed as covered; U5, S-Bahn, Badner Bahn,
   OBB national rail, tram/bus listed under notCovered; notes field carries
   "Data: Wiener Linien - Open Data (CC BY 4.0)" attribution.

8. Gates / smoke -- GREEN.
   - node qa/vienna-dogfood-gate.mjs -- rewritten (this pass) from pre-flip to post-flip
     assertions, mirroring qa/washington-dogfood-gate.mjs's shape: assertCityLive("vienna")
     now succeeds, getCity("vienna").status === "live", isMultiCity("vienna") === true. PASS.
   - node qa/live-city-lists-sync.mjs -- PASS (40 live cities consistent across registry,
     live-city-api, app.js, city-session, brisbane-dogfood, journey-model).
   - node qa/country-regions-sync-gate.mjs -- PASS (43 country-regions.js entries match the
     picker's 43 regions, including the new Austria/vienna entry).
   - node qa/run-all.mjs --smoke (timeout 600000): 156 PASS, 0 FAIL, 602s.
     no-live-feed-stops-gate.mjs passed cleanly this run (12s) -- no re-run-alone was needed.
   - node scripts/write-city-directions.mjs --only=vienna -> "99/99 stations with chips" --
     every catalogued station (including Seestadt) now gets a real chip; generated
     public/city-directions/vienna.json and committed it.

## Flip commit -- exact edits made

- lib/providers/registry.js: vienna status: "planned" -> "live" (only status change; notes
  field left as Jim wrote it except the status line).
- lib/cities/live-city-api.js: vienna added to the MultiCityId typedef and MULTI_CITY_IDS;
  comments on the two vienna dispatch cases updated from "not in MULTI_CITY_IDS yet" to
  "flipped live 27 Sep 2026."
- public/app.js: vienna added to NEARBY_MULTI_CITY_IDS and LIVE_CITY_IDS.
- public/brisbane-dogfood.js: vienna added to MULTI_CITY_IDS and the available map.
- public/city-session.js: vienna added to MULTI_CITY_IDS; new Austria country entry
  ({ id: "at", name: "Austria", regions: [{ id: "vienna", ... }] }, no comingSoon -- this is
  Austria's first region and it's live from the start) inserted alphabetically before Belgium;
  new vienna CITY_BOUNDS box (minLat 48.10, maxLat 48.30, minLng 16.22, maxLng 16.55, derived
  from the 99-station catalog's real extent with a small margin, no overlap with any other
  city's box).
- public/journey-model.js: vienna added to PERSISTED_CITY_IDS; at added to
  PERSISTED_COUNTRY_IDS.
- lib/cities/country-regions.js: vienna: "at" added to CITY_COUNTRY; at: "Austria" added
  to COUNTRY_NAMES.
- qa/vienna-dogfood-gate.mjs: rewritten pre-flip assertions to post-flip (see item 8 above).
- public/city-directions/vienna.json: generated fresh (99/99 stations).
- docs/vienna-d1/mark-qa-note.md (this file) and docs/vienna-d1/ci-live-evidence.md.

## Label decision for Tim

The "U2 + Karlsplatz" hub-bound chip wording (docs/jim-brief-vienna-u2-hub-bound-direction.md)
was the controller's call, not something Tim was asked in chat: it follows the "line + terminus"
shape every other Vienna chip uses and the Adelaide/Melbourne city-bound-chip precedent
(PRs #439/#441) for a line-qualified hub name. Tim can veto by adding the hold label to the
flip PR.

## No background processes left running

node dev-server.js (PID 69296, port 3000) was started for endpoint sampling and stopped
(taskkill /F /PID 69296) before this note was written; netstat confirms port 3000 is free. The
smoke suite (node qa/run-all.mjs --smoke) ran to completion in the foreground (no background
loop left behind). No sleep/poll loops were used.
