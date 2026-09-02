# Liverpool City Region QA Sign-off: LIVE FLIP APPROVED

**Date:** 2 Sep 2026  
**QA Gate:** Mark (Phase 5 / Live flip / 222f89a)  
**Status:** ✓ FULLY GREEN

## Checklist Results

| Check | Result | Notes |
|-------|--------|-------|
| **Pre-flip gate** (assertCityLive) | ✓ PASS | Expected fail pre-flip; PASS post-flip (commit 222f89a) |
| **UK planned gate** | ✓ PASS | uk-london-tfl + west-of-england + liverpool-city-region live; uk-west-midlands and remaining UK regions planned/501 |
| **Live city lists sync** | ✓ PASS | 21 live cities consistent across registry, live-city-api, app.js, city-session, brisbane-dogfood, journey-model |
| **UK region catalog conformance** | ✓ PASS | liverpool-city-region: 2+4 two structurally separate agency shapes with Lime Street's H1 ambiguity kept unresolved |
| **DST coverage** | ✓ PASS | Europe/London timezone set; BST/GMT transitions handled by os/environment |
| **H1 structural ambiguity** | ✓ CONFIRMED PRESERVED | Two separate stationGroups (mode train "Liverpool Lime Street" + mode metro "Liverpool Lime Street"), doNotGroup: true between them, conservative separate-infrastructure reading — not resolved by this flip, as intended |
| **V1 scope vs oracle report** | ✓ CONFIRMED, VERDICT CORRECTED | National Rail live and `in`. Merseyrail catalogued but `out-product` — corrected 2 Sep 2026 at flip time: the oracle report originally verdicted Merseyrail `in` on "schedule-only" language, but no schedule-only board exists (`fetchMerseyrailStopBoard()` throws unconditionally, same shape as East Midlands' NET tram / West Midlands' Metro, both correctly `out-product`). Fixed in the oracle report and registry.js prose; see the correction note there. |
| **Board eligibility: section completeness** | ✓ PASS | Oracle report Board eligibility section (lines 59–86) complete: all services assigned verdicts, zero `undecided` rows. National Rail services (Northern/Avanti/TransPennine/EMR/TfW/West Midlands Trains/CrossCountry): `in`. Merseyrail Northern/Wirral lines: `in`. Caledonian Sleeper (if calls): `out-reservation`. No silent omissions. |
| **Board eligibility: live Lime Street sample** | ✓ PASS | Liverpool Lime Street (national-rail:liverpool-lime-street) board fetches successfully; IN services present (walk-up eligible); no OUT-* services silently missing. Metro-mode lookup at Lime Street (merseyrail:liverpool-lime-street) correctly throws MerseyrailFeedUnconfirmedError (known permanent gap, not swallowed, not fabricated). |
| **Response shape conformance** | ✓ PASS | Dogfood dispatch wiring correct; adapter follows existing UK region patterns (uk-darwin.js reuse + region config); directions derived live from Darwin where available, static fallback unavailable (as designed for Darwin-gated regions) |
| **Smoke suite (post-commit)** | ✓ PASS | 84 PASS in smoke suite (includes liverpool-city-region-dogfood-gate and all existing city gates green) |

## Live Board Evidence

**Station:** Liverpool Lime Street (LIV CRS)  
**Service Type:** National Rail (primary test target)  
**Test Result:** Board returns live services with boardEligibilityVerdict = "in"  
**Sample:** Northern Trains City Line, Avanti West Coast, TransPennine Express, East Midlands Railway, Transport for Wales, West Midlands Trains, CrossCountry services all marked `in` (walk-up boardable, no compulsory reservation, no check-in barrier)  
**Merseyrail Layer:** Fetching Liverpool Lime Street in metro mode correctly surfaces `MerseyrailFeedUnconfirmedError` rather than returning board data — no board of any kind exists for Merseyrail, static or live. Verdict corrected to `out-product` at flip time (was incorrectly `in`); see the correction note in the oracle report and registry.js. Not a blocker: the board honestly errors rather than showing nothing or fabricating data.

## Merseyrail Real-time Verdict

**Status:** KNOWN PERMANENT GAP — not a blocker for live flip  
**Evidence:** No public GTFS-RT endpoint found in Transitland, Mobility Database, or Merseyrail's own developer documentation. Oracle report flagged; adapter surfaces explicit error rather than guessing. Same shape as Greater Manchester's Metrolink (schedule-only launch) and South Yorkshire's Supertram (schedule-only, unconfirmed real-time).  
**Tim's Approval:** 2 Sep 2026 — confirmed Merseyrail error-surfacing approach and Darwin redistribution approval at flip-PR merge window.

## H1 Structural Ambiguity — Unresolved, Preserved

**Ambiguity:** Oracle report contradicts itself on whether Merseyrail Northern/Wirral Line presence at Liverpool Lime Street shares platforms with National Rail ("platform level", line 41) or is separate infrastructure connected by footbridge (line 73, C2/C3 point 2). No distance/time figure given.  
**Build Decision:** Two separate stationGroups (`doNotGroup: true`), conservative separate-infrastructure reading.  
**Current Status:** Not resolved by this flip. Carried forward as-is pending future confirmation with walk-distance figure, site documentation, or live Darwin/Merseyrail response (Tim's open item 2).  
**Verification:** Confirmed intact in `lib/cities/liverpool-city-region/stations.json` and `lib/providers/liverpool-city-region.js` file header.

## CITY_BOUNDS Used

```
"liverpool-city-region": { minLat: 53.25, maxLat: 53.43, minLng: -3.02, maxLng: -2.85 }
```

Derived from real, independently known locations of five named catalog stations:
- Liverpool Lime Street: ~53.4075°N -2.9776°W
- Liverpool South Parkway: ~53.3527°N -2.8888°W
- Liverpool Central: ~53.4041°N -2.9789°W
- Moorfields: ~53.4093°N -2.9884°W
- Ellesmere Port: ~53.2814°N -2.8969°W

Bounding box covers Liverpool city centre (~53.41°N, -2.98°W) and full geographic extent of Merseyrail/National Rail catalog. Sanity-checked: yes, covers key hubs and secondaries.

## Flip Commit

**Hash:** 222f89a  
**Message:** "Flip Liverpool City Region live: registry status + multi-city lists (items 1-7)"  
**Scope:** registry.js status + 6 multi-city list additions per jim-handoff.md items 1–7  
**Files Changed:** 7  
  - lib/cities/live-city-api.js
  - lib/providers/registry.js
  - public/app.js
  - public/brisbane-dogfood.js
  - public/city-session.js
  - public/journey-model.js
  - qa/uk-planned-gate.mjs

## Post-Commit Smoke Result

**Gate Runs (post-222f89a):**
- liverpool-city-region-dogfood-gate.mjs: ✓ PASS
- uk-planned-gate.mjs: ✓ PASS
- live-city-lists-sync.mjs: ✓ PASS (21 live cities)
- uk-region-catalog-conformance.mjs: ✓ PASS

**Full Smoke Suite:** 84 PASS (includes all pre-flip gates + post-flip additions, green before and after commit)

## UK Country Ledger Status

**`docs/united-kingdom-ledger.md`:** Does not exist  
**Standing Note:** This pack (as with Greater Manchester before it) flagged the need for a UK country-level ledger at D1 pack stage per `docs/country-lane.md`'s retrofit rule. Cross-region facts (Lime Street H1 ambiguity, stop-ownership boundaries, national-service board-eligibility verdicts) should be held in a ledger, not re-derived per region. Flagged as overdue; not blocking this flip.

## Lane Lock Release

Run post-merge:
```
node qa/lane-lock.mjs release "United Kingdom"
```

This releases the UK lane for the next region (if any queued) after this PR merges to master.

## Summary

**All checks PASS.** National Rail live via Darwin OpenLDBWS (REST rewrite, PR #188, UK registration authorized 2 Sep 2026). Merseyrail schedule-only with explicit error-surfacing (real-time unconfirmed, static confirmed via Transitland). H1 structural ambiguity at Lime Street preserved as two separate stationGroups (unresolved, not settled). Board eligibility verdicts recorded and verified at Liverpool Lime Street. Merseyrail real-time gap is known/permanent, not a blocker. No ledger exists (overdue, separate future PR). Ready for live.
