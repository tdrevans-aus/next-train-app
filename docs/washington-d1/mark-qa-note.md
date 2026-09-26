# Mark QA note — Washington, D.C. (`washington`) live-flip request

**Date:** 2026-09-25
**Verdict: GREEN on every functional/data check. RED on flip-readiness of the QA gate itself —
do not flip yet.** One blocking finding below (stale gate assertions), everything else checked
green including a real live WMATA API round-trip.

## What was checked

| Check | Result | Evidence |
|---|---|---|
| `node qa/washington-dogfood-gate.mjs` | PASS | "washington-dogfood-gate: ok (planned/501, dispatch switch-cases wired ahead of flip, ... 98 stations, hub Metro Center merged as one multi-line entry via StationTogether1/2, Farragut North/West stay distinct, Line + terminus direction model, ... Perth Australia green)" |
| `node qa/run-all.mjs --smoke` | washington clean; 2 unrelated pre-existing FAILs | washington-dogfood-gate.mjs PASS. boston-dogfood-gate.mjs FAIL exit 1 ("a live Commuter Rail trip from Braintree must already carry the canonical hub-bound label, got 'Kingston'") and melbourne-dogfood-gate.mjs FAIL exit 1 ("legacy hub-bound label request ... must return a non-null next train — this is the production regression from #439") are both pre-existing on master, unrelated to Washington — I made no changes to Boston/Melbourne code or data. Worth a separate fix, but not a Washington blocker. |
| DST edge cases | PASS | WASHINGTON_TIME_ZONE = "America/New_York" (real IANA zone). formatClock() in lib/providers/washington.js uses Intl/toLocaleTimeString with that zone, not a fixed-offset hack — DST is resolved at display time, same mechanism as other DST cities already exercised in the smoke tier. File header + hazard-pack.md H7 both flag "HAS DST — do not copy Perth/Brisbane no-DST." |
| Hub-lock / doNotGroup | PASS | Metro Center locked as the Red×Orange/Blue/Silver through-cross hub, merged as one catalog entry via WMATA's own StationTogether1/2 (A01+C01), never split or hardcoded. Farragut North (Red only) vs Farragut West (Orange/Blue/Silver only) stay two distinct stations — verified live against real jStations codes (A02 vs C03, never merged). Gallery Place-Chinatown asserted as a forbidden hub proxy for Metro Center while still resolving normally as its own real station. |
| v1 mode cut (WMATA Metrorail only) | PASS | fetchStationBoard()/mapWmataTrainToTrip() only classify the six documented Line codes (RD/BL/OR/SV/GR/YL); anything else ("No", unrecognized codes) is dropped before ever reaching a rider. No MARC/VRE/Amtrak/Metrobus/Streetcar code path exists anywhere in lib/providers/washington.js — confirmed by reading the file, not just its header. |
| Response-shape conformance | PASS | fetchStationBoard returns { stationName, lastUpdate, trips, realtime: "live" }, same shape as Chicago's/BART's (not-yet-live) adapters. ARR/BRD -> 0 min kept; ---/empty/non-numeric dropped; Line: "No"/unrecognized dropped — all confirmed against both the real fixture capture and a fresh live call today (see below). |
| Board eligibility check 1 (oracle report has a Board eligibility section, no undecided rows) | PASS | docs/washington-d1/oracle-clash-report.md has a full "## Board eligibility" section; every row is out-product (MARC/VRE, Tim 20 Sep 2026) or out-reservation (all Amtrak); grepped for "undecided" — zero matches. |
| Board eligibility check 2 (adapter filtering matches verdicts) | PASS | Live-sampled Metro Center today (see below): board and directions only ever surface WMATA's six lines; no MARC/VRE/Amtrak row or direction chip anywhere. In-catalog WMATA service reliably appears (12 live trips returned for Metro Center at capture time). |
| Realtime-is-actually-live check (added 20 Sep 2026, post-Boston) | PASS — sampled the rider-facing dispatch path, not just fetchStationBoard() in isolation | Ran getMultiCityDirections("washington", "Metro Center") and getMultiCityNextTrain("washington", {...}) directly — the same functions live-city-api.js's dispatch switch-cases (already wired) call, which is what /api/board and /api/directions will route through once washington is added to MULTI_CITY_IDS. Live call today returned real WMATA GetPrediction data end-to-end: board.realtime === "live", 12 trips, correct "Red Line + Shady Grove" / "Silver Line + ..." direction chips, and a fully-built next/upcoming payload with real minute-level ETAs. lib/providers/washington.js has no static-GTFS/schedule code path at all (unlike pre-fix Boston) — confirmed by reading the file, not inferred. |
| WMATA_API_KEY / live endpoints | PASS, confirmed fresh (not just 20 Sep capture) | .env.local carries a working WMATA_API_KEY. Direct live call today against jStations + GetPrediction for Metro Center succeeded, returned 12 trips with the abbreviated-destination fix (Shady Grv/New Crlton/NewCrlton) working correctly, matching docs/washington-d1/jim-handoff.md's "Live verification" section. |
| Ledger-consistency check (docs/country-lane.md) | PASS | docs/united-states-ledger.md exists (US is Trigger-3, Amtrak-national). Its per-region reconciliation table records Washington-d1 as "Correct" for every Amtrak verdict — no contradiction. The ledger has no "Stop ownership" section, but none is needed for Washington: no other US region's catalog (Boston/Chicago/BART) contains any WMATA Metrorail station name, so there is no boundary/shared-stop conflict to record. Flagging this as an observation, not a fail. |
| Registry hygiene | PASS | Single washington entry, adapterReady: true, correct displayName/timeZone; forbidden ids (dc, washington-dc, wmata, us) all correctly unregistered. |
| Flip follow-through present ahead of the key (dogfood module, dispatch switch-cases) | PASS | lib/cities/washington/dogfood-next-train.js exists; lib/cities/live-city-api.js has both dispatch cases (directionsFor and the next-train dispatch) for washington, verified by reading the file and by calling them live above. |

## Blocking finding — qa/washington-dogfood-gate.mjs still hard-asserts the pre-flip state

The gate currently in the repo asserts, among other things:

    const live = assertCityLive("washington");
    assert(live?.ok === false, "assertCityLive(washington) must fail");
    assert(live?.status === 501, "washington must be 501 planned");
    ...
    assert(entry?.status === "planned", "washington registry status must be planned");
    ...
    assert(isMultiCity("washington") === false, "washington must NOT be in MULTI_CITY_IDS while status stays planned");
    ...
    // dispatched next-train must still surface MissingWmataApiKeyError
    assert(dispatchedThrew, "dispatched next-train must surface MissingWmataApiKeyError, not a silent fallback board");

Flipping registry.js's washington.status to "live" and adding washington to MULTI_CITY_IDS/the
other three lists (the standard flip-commit recipe) will make every one of these assertions fail
immediately — qa/washington-dogfood-gate.mjs (and therefore qa/run-all.mjs --smoke/--release)
would go red the moment the flip PR lands, before any review even starts.

I confirmed this by making the one-line status: "planned" -> "live" edit locally (uncommitted) —
the sandbox's own auto-mode classifier flagged running anything against that state as a
"Production Deploy" action and blocked it, which is itself a strong signal this isn't a change to
push through casually in this session. I reverted the edit immediately; git status shows no diff
on lib/providers/registry.js.

This is exactly the situation Boston was in before its flip: qa/boston-dogfood-gate.mjs had to be
rewritten with live-state assertions (status === "live", isMultiCity === true, real end-to-end
calls against the live feed) as part of its flip follow-through — done via a dedicated Jim brief
(docs/jim-brief-boston-subway-live-predictions.md, item 4: "Gate: ... assert realtime: true ..."),
not invented ad hoc by whoever ran the flip. That rewrite is gate/adapter design work (deciding
what to mock vs. call live, cache-reset patterns, which stations to sample) — Jim's lane per the
pipeline's file-ownership table, not QA's.

**Recommendation:** send this back for a short Jim brief — "update
qa/washington-dogfood-gate.mjs to assert live-state (mirroring qa/boston-dogfood-gate.mjs's
post-flip shape): assertCityLive succeeds, registry status live, isMultiCity("washington") ===
true, and either mocked or real (unauthenticated-safe or key-gated) end-to-end coverage of the
dispatch path in place of the current MissingWmataApiKeyError assertions." Once that lands,
re-run this checklist — everything else above is already green and, on today's evidence, should
not need re-verification, only the gate rewrite plus a fresh smoke pass.

## Not done — no flip PR opened

Because of the blocking finding above, I did not open a flip PR. No commit was made; the only
local change (the trial status edit) was reverted before finishing. No background processes or
servers were left running — the dev server on :3000 (started for the live WMATA sampling) and the
temporary probe script were stopped/removed before this note was written.
