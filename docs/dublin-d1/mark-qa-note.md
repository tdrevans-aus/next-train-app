# Dublin (Luas Red + Green) -- pre-flip QA note (run 6)

**Verdict: RED. Do not flip. No PR opened.**

Run by Mark on `mark/dublin-flip-6` (cut from `origin/master` @ `70b37e9`, PR #484 merged), 2026-09-27, ~15:20-15:45 UTC (Sunday afternoon, full Luas service).

This is the confirmation pass after runs 3-5 (each green except the one item fixed that run). The whole checklist was run end to end. Everything is green except item 3 (the all-stations live sweep), which found a new, genuine, reproducible coverage gap at Broombridge -- the same shape as the already-recorded Connolly/Saggart gaps, but not yet given a verdict. This blocks the flip on its own; nothing else needs fixing.

## 1. Board eligibility (docs/board-eligibility-rule.md)

PASS. docs/dublin-d1/oracle-clash-report.md Board eligibility section has no undecided rows. Six verdict rows: Luas Red in, Luas Green in, DART out-product (v2), Dublin Bus/Bus Eireann/Go-Ahead Ireland out-mode, Connolly Luas stop out-feed, Saggart Luas stop out-feed. Boards are Luas-only in both the catalog and the live rider-facing response (verified below).

## 2. Live-only grep on lib/providers/dublin.js

PASS. The adapter file header and dropUnconfirmedTrips()/tripHasRealtimeConfirmation() state explicitly: every trip shown requires GTFS-RT confirmation; a trip without RT confirmation is dropped, never shown as live from the schedule alone (mirrors melbourne.js, cites docs/jim-brief-boston-subway-live-predictions.md). MissingNtaApiKeyError propagates rather than falling back to a timetable board when the key is absent.

## 3. GTFS snapshot / RT join / all-stations live sweep -- FAIL (blocking)

- node qa/verify-dublin-gtfs-snapshot.mjs -- PASS. Trimmed snapshot has exactly 2 routes (Luas Red, Luas Green), 1 agency (LUAS), 128 distinct stops used by kept trips. 465,806 bytes, published to blob and fetched 200.
- node --env-file=.env.local qa/dublin-rt-join-check.mjs -- PASS. 2,169 total TripUpdates in the live feed; 59 identified as Luas; 59/59 (100%) resolved against the static snapshot. Zero unmatched trip_ids.
- node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs -- FAIL, exit 1. Ran the full 9-minute, 18-poll, headway-aware sweep (Sunday ~15:21-15:30 UTC / 16:21-16:30 Dublin time, full service, 294-374 total live trips per poll across the network -- healthy feed, not a quiet period):

    Error: dublin-all-stations-live-sweep: 1/65 station(s) were continuously empty for >= 1.5x their
    own scheduled headway -- a real per-station coverage gap, same shape as the Connolly/Saggart
    bugs, needs a coverage.json verdict rather than passing behind the honest-empty banner:
    Broombridge (headway 5min, empty 10min)

I corroborated this by hand rather than taking the script word alone: a dedicated 6-poll/20s foreground check against /api/board (dev server, flip-commit state -- see item 4) hitting Broombridge and its immediate Green-line neighbour Cabra as a control:

    poll 1 Broombridge Green + Brides Glen EMPTY(no-live-predictions)   poll 1 Cabra Green + Broombridge 7m
    poll 2 Broombridge Green + Brides Glen EMPTY(no-live-predictions)   poll 2 Cabra Green + Broombridge 6m
    poll 3 Broombridge Green + Brides Glen EMPTY(no-live-predictions)   poll 3 Cabra Green + Broombridge 17m
    poll 4 Broombridge Green + Brides Glen EMPTY(no-live-predictions)   poll 4 Cabra Green + Broombridge 18m
    poll 5 Broombridge Green + Brides Glen EMPTY(no-live-predictions)   poll 5 Cabra Green + Broombridge 17m
    poll 6 Broombridge Green + Brides Glen EMPTY(no-live-predictions)   poll 6 Cabra Green + Broombridge 3m

Broombridge was empty on 24/24 consecutive polls across the two checks (18 automated + 6 foreground, spanning ~11 minutes), while its neighbour Cabra carried a healthy, varying live trip every single poll on the same branch, same headway, same time window. This is not the transient single-poll gap shape seen at Red Cow/Rialto (which resolved 10/10 on a dedicated recheck last pass) -- it is the permanent, no-stopTimeUpdate-ever shape already recorded for Connolly and Saggart. The rider-facing board is already showing the honest empty state correctly (emptyReason: no-live-predictions, confirmed in the raw /api/board response), but per the Dublin-specific checklist item (honest-empty-state brief, Connolly precedent), a station empty on every poll needs a coverage-note exclusion instead of just passing behind that banner.

This needs the same treatment Jim already gave Connolly/Saggart: a notCovered entry in lib/cities/dublin/coverage.json, removal from lib/cities/dublin/stations.json (65 -> 64), and a correction note in hazard-pack.md/oracle-clash-report Board eligibility section recording Broombridge as a seventh out-feed verdict. Broombridge is also a printed Green Line terminus (LINE_TERMINI.green), so per the Saggart precedent the "Green + Broombridge" direction chip should very likely keep surfacing upstream even once Broombridge own board is filtered -- that is a design decision for whoever picks this up, not something I changed.

I did not make this fix myself (flag, do not fix). No adapter/catalog edit was made; the working tree is clean at 70b37e9.

## 4. Rider-facing /api/board + /api/directions, flip-commit state

I made the flip-commit edits temporarily in this worktree only to test the real rider path (registry status: live, dublin added to MULTI_CITY_IDS/typedef, country-regions.js ie/Ireland entries, regenerated city-directions/dublin.json and city-manifest.seed.*), ran a dev server on an explicit free port (3002, never 3000), sampled the ten requested stations, then reverted all of it (git checkout --) once item 3 above turned up a blocking finding -- nothing in this section should be read as "ready to flip", it is the evidence for why the rider path itself is fine and the only problem is the Broombridge feed gap.

All ten sampled stations responded in well under 3s (Abbey Street 3170ms cold, 20-80ms warm; all others 17-79ms):

| Station | Result |
|---|---|
| Abbey Street | Red / Red + Tallaght / Red + The Point, all realtime true. No Green chip (hub lock holds). |
| Tallaght | Red + The Point, realtime true. |
| The Point | Red + Tallaght, realtime true. |
| Brides Glen | Green + Broombridge, realtime true. |
| Broombridge | Green + Brides Glen entry present, but next null, emptyReason no-live-predictions -- see item 3, this is the permanent gap, not a bug in the empty-state itself. |
| Belgard | Red + Saggart, Red + Tallaght, and Red + The Point all present, all realtime true -- fork confirmed correctly. |
| Sandyford | Green + Brides Glen, Green + Broombridge, both realtime true. |
| Marlborough | Green + Brides Glen only, realtime true (no Red chip -- Green interchange walk-only, hub-lock holds). |
| Rialto | Red + Tallaght, Red + The Point, both realtime true (confirms last pass finding that Rialto gap was transient, not permanent). |
| Red Cow | Red + Tallaght, Red + The Point, both realtime true. |

- No station offered a chip naming itself (checked programmatically against every destination string returned; none matched -- the terminus-guard fix from PR #484 holds).
- Green loop exclusivity held: O Connell-GPO/O Connell Upper northbound-only, Marlborough southbound-only, per code inspection of isDirectionAllowedAtStop() (not independently re-derived by me this pass beyond the Marlborough sample above, which is consistent).
- /api/directions?city=dublin&station=Belgard returned directions: Red + Saggart, Red + Tallaght, Red + The Point -- Belgard fork requirement satisfied.
- /api/cities manifest entry for dublin in the flip-commit state: status live, country id ie name Ireland, timeZone Europe/Dublin, bounds populated, modes light_rail, directionsVersion 9c7534fb -- all present and correct.

## 5. Hub lock / timezone / doNotGroup

PASS. lib/cities/dublin/marketing-directions.js: DUBLIN_HUB = Abbey Street, DUBLIN_TIME_ZONE = Europe/Dublin (IANA, explicit comment against hand-rolling a fixed-offset rule). doNotGroup pairs enforced via HUB_PROXY_FORBIDDEN (Marlborough / O Connell-GPO / O Connell Upper / Connolly / Busaras / O Connell Bridge never stand in for the hub) and FORBIDDEN_STATION_TOKENS (invented city ids, other cities hub strings, generic City/Centre tokens). Confirmed live in the board samples above (Abbey Street never shows a Green chip; Marlborough never shows a Red chip).

## 6. Registry-driven

PASS (in the flip-commit state, reverted after testing -- see item 4 preamble). /api/cities correctly listed dublin live with Ireland/bounds/directionsVersion/modes as shown above. Editing only lib/providers/registry.js, lib/cities/country-regions.js, lib/cities/live-city-api.js, plus regenerating public/city-directions/dublin.json and public/city-manifest.seed.json/js was sufficient -- no public/app.js / city-session.js / brisbane-dogfood.js / journey-model.js edit needed. lib/cities/city-bounds.js already had Dublin box from a prior pass; I only tidied its stale "still planned" comment (not committed, reverted along with everything else). node scripts/write-city-directions.mjs --only=dublin gave 65/65 stations with chips. node scripts/write-city-manifest.mjs wrote 42 cities, 13 countries.

coverage.json confirms: Luas only; DART/Connolly/Saggart/buses recorded not covered; the intermittent-gap note (Red Cow/Rialto precedent) is present and accurate -- but see item 3, it needs a Broombridge line added to the notCovered list, not the intermittent-gap note.

## 7. Gates at flip state

- node qa/dublin-dogfood-gate.mjs -- PASS without edits, confirming it is genuinely status-agnostic per PR #484: status=planned, dispatch switch-cases wired, ... 65 stations (Connolly + Saggart filtered ...), ... Perth Australia green.
- node qa/live-city-lists-sync.mjs -- PASS (pre-flip state).
- node qa/country-regions-sync-gate.mjs -- PASS.
- node qa/registry-driven-client.mjs -- PASS.
- node qa/honest-empty-state.mjs -- PASS.
- node qa/run-all.mjs --smoke (PLAIN, pre-flip state, timeout 600000) -- 113 scripts, 112 PASS, 1 FAIL: melbourne-dogfood-gate.mjs -- legacy hub-bound label request (Eaglemont towards Flinders Street) must return a non-null next train. This is the documented time-of-day flake (Melbourne past midnight, Hurstbridge line finished for the night) -- re-ran it alone (node qa/melbourne-dogfood-gate.mjs) and got the identical failure both times, consistent with the known flake rather than a new regression. no-live-feed-stops-gate (the other documented flake) did not fire this run. Every Dublin-specific gate in the suite (dublin-dogfood-gate, honest-empty-state, bundled-city-directions, registry-driven-client) passed.

## Net

Everything the adapter/pack/gates own is clean, again. The blocker is a new finding, not a repeat of a prior-run defect: Broombridge needs the same out-feed verdict Connolly and Saggart already have (coverage.json + stations.json + oracle-clash-report Board eligibility section), before this city can flip. Once that is done, item 3 sweep should be re-run clean and the rest of this checklist re-confirmed (it has not newly broken anything, so a fast re-run, not a full re-pass, should suffice) before opening the flip PR.

No dev server, background loop, or poll left running -- port 3002 (only port used besides the suite own auto-picked one) is confirmed free; the worktree is clean at 70b37e9 with only this note staged.
