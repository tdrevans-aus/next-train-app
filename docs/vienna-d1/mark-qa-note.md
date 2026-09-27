# Vienna flip QA -- Mark, 2026-09-27

Run on mark/vienna-flip (cut from master @ d058f2b, PR #467 "Add Vienna (Wiener Linien
U-Bahn) provider adapter, planned"). Local time in Vienna ~02:50-03:05 Sunday CEST during this
run (Saturday-night 24-hour U-Bahn service running) -- confirmed via /api/health timestamps
(00:59:43 UTC = 02:59 CEST).

## Verdict: RED. Do not flip. No PR opened.

Blocking finding: Seestadt (U2's own eastern terminus, real in-catalog D1 station) is
silently invisible to riders -- both /api/board and /api/directions return zero entries,
even though the adapter itself returns real, live, walk-up U-Bahn departures there right now.
This is the exact "walk-up service silently missing from an in-catalog station's board" failure
class named in this checklist, same severity as a hub-lock violation. Not a rate-limit artifact
(reproduced deterministically, several minutes apart, isolated from any 403 noise -- see item 3
below).

Reproduction:

    curl "http://localhost:3000/api/board?city=vienna&station=Seestadt"
    -> {"stationName":"Seestadt","lastUpdated":"2026-09-27T01:05:06.599Z","entries":[]}

    curl "http://localhost:3000/api/directions?city=vienna&station=Seestadt"
    -> {"directions":[],"source":"vienna-marketing-ends"}

but the adapter itself, called directly, returns six real upcoming U2 departures at that exact
moment:

    await fetchStationBoard("Seestadt")
    -> trips: six entries, destination "U2", lineId "u2", displayTimes 03:02/03:03/03:18/03:33/03:48/04:03

Root cause: lib/cities/vienna/marketing-directions.js's marketingLabelsForStation() builds
direction chips only from LINE_TERMINI[lineId], skipping any terminus equal to the station
itself (so a station never offers a chip back to itself). For every other line this is harmless
because both printed termini are real, distinct stations -- but U2's LINE_TERMINI is
deliberately ["Seestadt"] only (Karlsplatz, U2's other end, is excluded by design because it's
the hub lock and must never be a direction token -- direction-model-memo.md section 2). At
Seestadt, the loop therefore has exactly one candidate terminus, which is the station itself, so
it's skipped and zero chips are produced. api/board.js builds its entries by calling
getMultiCityDirections first and then fetching one board per returned direction -- with zero
directions, it fetches nothing and returns entries: [], discarding the six real trips the
adapter already has. This is a structural consequence of the hub-lock design (correct everywhere
else) colliding with U2's terminate-at-the-hub shape, not a bug introduced by any flip-prep
edit -- it would reproduce on any commit built from the current pack, live or planned status
notwithstanding (only visible once you actually call the rider-facing endpoints, which is why
Jim's D2 dogfood gate -- synthetic/offline, no dispatch coverage of this station -- never caught
it, and why this checklist explicitly asks for /api/board and /api/directions sampling rather
than trusting fetchStationBoard() in isolation).

This needs a fresh Jim dispatch (bug-fix / product mode per CLAUDE.md's bug-fix lane, or a
direct continuation of the Vienna adapter brief) to fix the direction model so Seestadt gets a
real chip -- most likely a bare-line-label chip ("U2", matching what mapLineTerminusDestination
already falls back to for a Karlsplatz-bound trip) rather than requiring a second named terminus,
plus a matching change in api/board.js (or the dogfood/dispatch layer) so a bare-label direction
is still walked and fetched. I have NOT made that fix myself (flag, don't fix) and have
reverted every flip-prep edit I made while investigating (registry status, MULTI_CITY_IDS/picker/
CITY_BOUNDS/country-regions.js entries, the dogfood-gate rewrite, the generated
city-directions/vienna.json) -- the working tree is back to master's PR #467 state, only this
note is new.

## Checklist results (informational -- recorded even though the run stops here)

1. Board eligibility -- GREEN on paper, but the finding above is exactly what this check
   exists to catch. docs/vienna-d1/oracle-clash-report.md has a full Board eligibility section
   (line 61 "## Board eligibility"), all verdicts recorded (U1-U6 "in"; S-Bahn/Badner
   Bahn/OBB "out-product"), no "undecided" rows. Adapter-level filtering matches at the stations I
   sampled -- Karlsplatz (/api/board) returned exactly "U1 + Leopoldau", "U1 + Oberlaa",
   "U2 + Seestadt", "U4 + Heiligenstadt", "U4 + Hutteldorf" (no S-Bahn/tram rows; U2 correctly
   shows only its one live direction, confirming the hub-lock claim); Stephansplatz and
   Landstrasse (both U-Bahn + S-Bahn/tram/CAT nearby) returned only U-Bahn direction rows once
   clear of the rate limit -- no non-U-Bahn leakage anywhere I sampled. But Seestadt is the
   counter-example: an in-catalog station where a real, walk-up, "in"-verdict U-Bahn service is
   entirely absent from the rider-facing board -- this is the hard-fail class the rule exists to
   catch, and it's RED, not GREEN, overall.

2. Live-only, no static-as-live-time -- GREEN.
   grep -n "realtime:\|loadGtfsStatic\|stop_times" lib/providers/vienna.js matches only
   realtime: "live" (the literal field set on every returned board) -- no loadGtfsStatic, no
   stop_times, no static-schedule code path anywhere in the file. fetchStationBoard() calls
   the live Wiener Linien OGD Realtime Monitor every time; confirmed by direct call above.

3. Live cross-check against the real monitor -- GREEN, with a caveat. Sampled
   /api/board and /api/directions (not just fetchStationBoard() in isolation) at Karlsplatz,
   Floridsdorf, Stephansplatz, Landstrasse, and Seestadt via a local dev server
   (node dev-server.js, port 3000, confirmed free before starting and stopped afterwards).
   Karlsplatz responded in ~1.5s with real trips. Firing four station boards back-to-back
   (Praterstern/Landstrasse/Floridsdorf/Stephansplatz within a few seconds) tripped the monitor's
   own rate limit (HTTP 403, logged server-side as "[api/board] Failed to fetch ... HTTP 403")
   -- exactly the messageCode 316 risk this checklist warns about. Spacing requests out
   (~15s apart) made every one of those four succeed cleanly on retry with real live data and
   correctly-scoped U-Bahn-only rows, all well under 3s once not rate-limited. Seestadt's empty
   response is NOT part of this rate-limit noise -- it was reproduced cleanly, in isolation,
   several minutes after the 403 burst had cleared (see blocking finding above).

4. Per-direction trip count -- Karlsplatz: U2 shows exactly one direction
   ("U2 + Seestadt"), confirmed both via /api/directions and /api/board (5 total direction
   entries, all with real upcoming trips). Floridsdorf: one direction ("U6 + Siebenhirten"),
   6 real upcoming trips behind it once past the rate limit. Stephansplatz: 4 directions
   (U1 x2, U3 x2), all populated. Landstrasse: 4 directions (U3 x2, U4 x2), all populated. Every
   chip that exists has real trips behind it, none empty while service is running -- EXCEPT
   Seestadt, which has no chips at all (item 1 / blocking finding).

5. Hub lock, DST, doNotGroup -- GREEN. Karlsplatz never appears as a direction token
   (mapLineTerminusDestination(VIENNA_HUB, "u1") === "U1", no "+ Karlsplatz" suffix anywhere,
   confirmed both in the gate and live). VIENNA_TIME_ZONE/VIENNA_TIMEZONE is the bare IANA
   string "Europe/Vienna", passed straight to toLocaleTimeString's timeZone option -- no
   manual DST offset math to get wrong. doNotGroup pairs (hazard-pack.md H1/H4/H6) -- Praterstern,
   Stephansplatz, Landstrasse, etc. are all separately catalogued from Karlsplatz
   (isForbiddenHubProxy rejects all nine), confirmed live: none of their boards ever surfaced a
   Karlsplatz-flavoured row.

6. U5 absent / U2 truncated routing -- GREEN. U5 does not appear anywhere in
   WIENER_LINIEN_LINE_NAME_TO_LINE, LINE_LABELS, or the catalog; the live Karlsplatz capture
   in docs/vienna-d1/jim-handoff.md and my own sampling never returned a U5 row. U2's board at
   both Karlsplatz and Seestadt only ever shows "Seestadt"/bare-"U2" as the destination -- matches
   the pack's documented Karlsplatz-Seestadt truncated routing (U2/U5 works), not the old
   Karlsplatz-Schottentor-Seestadt line.

7. coverage.json rider copy -- GREEN. lib/cities/vienna/coverage.json: U-Bahn (U1/U2/U3/
   U4/U6) listed as covered; U5, S-Bahn, Badner Bahn, OBB national rail, tram/bus listed under
   notCovered; notes field carries "Data: Wiener Linien - Open Data (CC BY 4.0)" attribution.

8. Gates / smoke -- not run to completion. node qa/vienna-dogfood-gate.mjs passes as-is at
   planned status (offline, synthetic payloads only -- it never exercises the
   /api/board and /api/directions path that actually has the bug, which is exactly why this
   checklist item asks Mark to sample those endpoints directly rather than trust the gate).
   I did not run qa/run-all.mjs --smoke against a flipped-live state, since the flip itself is
   blocked on the finding above -- no point green-lighting a smoke run against a state I'm not
   allowed to ship.

## What happens next

A fresh Jim dispatch (bug-fix / product mode, brief should point at this note plus
docs/vienna-d1/jim-handoff.md and docs/vienna-d1/hazard-pack.md / direction-model-memo.md)
needs to fix Seestadt's direction/board gap -- likely by allowing a bare line-label chip
("U2") to be offered and matched at true single-terminus stations, and confirming
api/board.js's direction-driven fetch loop still surfaces it -- then re-run this full checklist
(the fix touches the exact code path this note is red on, so re-verify all of items 1-4, not just
Seestadt) before any flip PR is opened.
