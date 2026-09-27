# Jim brief — Washington: boards show one train per direction on Blue/Orange/Silver; Metro Center missing directions

**Lane:** bug-fix / product mode. **City:** washington (LIVE), country united-states (acquire the lane lock). **Date:** 27 Sep 2026. **tim-review: yes for the direction-label change in Part B** (a direction label is an API contract; Tim reported the bug and the controller will show him the proposed labels before merge — build it, do not merge).

## Symptom (Tim, 27 Sep, on device; controller reproduced in production 08:55–09:00 EDT Sunday)
- Every Blue/Orange/Silver direction shows at most ONE train (`following` empty, `upcoming` length 1) while Red and Green directions show 2–3. Tim: "I only get 1 train, never 2 — annoying when the one I get is 2 mins away."
- Metro Center (Red + Orange/Blue/Silver, two station codes A01/C01) returned only ONE board entry ("Orange Line + New Carrollton") out of nine directions; Farragut North next door had Red trains both ways, so Red at Metro Center is missing, not absent.
- Production samples: L'Enfant Plaza — Blue Fr-Sp 1, Blue Largo 1, Green Greenbelt 2, Green Branch Av 3, Orange Vienna 1, Orange NC 1, Silver Ashburn 0, Silver Largo 0, Silver NC 1, Yellow Greenbelt 0.

## Root causes to confirm
A. **WMATA's Real-Time Rail Predictions return the next ~3 trains per platform (Group), not per line.** On the shared Blue/Orange/Silver trunk those three are interleaved across lines, so a "line + terminus" chip sees at most one of them. Confirm from a raw GetPrediction payload (fixture qa/fixtures/washington/predictions.json and one live call — WMATA_API_KEY in .env.local; pace calls, the key has a rate limit).
B. **Multi-code stations**: check that `fetchStationBoard` queries ALL station codes for Metro Center (A01, C01), Gallery Place (B01, F01), L'Enfant Plaza (D03, F03), Fort Totten (B06, E06) — the catalog/adapter may hold one code per station, or the second code's trains may be dropped by the direction filter. The one-entry Metro Center board is the tell.

## Fix
Part A — direction model: switch Washington to **terminus-only direction chips** (Perth/Melbourne/Adelaide style, PR #439/#440 precedent): "New Carrollton", "Vienna/Fairfax-GMU", "Franconia-Springfield", "Downtown Largo", "Ashburn", "Shady Grove", "Glenmont", "Greenbelt", "Branch Av", "Huntington", "Wiehle-Reston East" (short-turns per the D1 pack). Every train to that terminus appears regardless of line, and each row shows its line (the board row already carries line/colour — verify it renders, otherwise add the line name to the row's printed destination, e.g. "Silver Line · New Carrollton"). Ship SERVER-SIDE ALIASES for every old "<Line> + <Terminus>" label (lib/cities/washington/marketing-directions.js + the legacy alias mechanism from #440) so saved routes on installed clients keep working. Update public/city-directions/washington.json via the script, docs/washington-d1/direction-model-memo.md (append dated Correction), registry notes.
Part B — multi-code stations: query every code, merge trains, dedupe by (line, destination, Min).
Part C — per-direction trip-count gate: extend qa/washington-dogfood-gate.mjs with a fixture where three interleaved lines run to one terminus and assert the terminus chip lists all three; assert Metro Center's fixture yields Red AND Orange/Blue/Silver directions; add a rule that a trunk direction with ≥ 2 predicted trains in the fixture never renders `upcoming.length === 1`.

## Acceptance
1. Dev server with the real key, during DC service: L'Enfant Plaza "New Carrollton" and "Downtown Largo" chips show ≥ 2 upcoming when WMATA's raw payload has ≥ 2 trains to that terminus on that platform (print both counts side by side); Metro Center shows Red both ways plus the trunk directions; Farragut North unchanged.
2. Old labels still resolve: `/api/directions` / `/api/next-train` with destination "Orange Line + New Carrollton" returns the New Carrollton board (alias), and the response carries the new canonical label.
3. `node qa/washington-dogfood-gate.mjs`, `node qa/run-all.mjs --smoke` (PLAIN) green (known local flake: no-live-feed-stops-gate — re-run alone if only failure).
4. PR title: "Washington: terminus-only directions (all lines to a terminus), multi-code stations, ≥2 trains per direction". Description lists the old→new label table for Tim.
