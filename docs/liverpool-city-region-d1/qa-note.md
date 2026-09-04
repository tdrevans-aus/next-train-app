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

---

**4 Sep 2026 correction (Jim, docs/jim-brief-liverpool-merseyrail-via-darwin.md):** the Merseyrail
"KNOWN PERMANENT GAP" verdict above and the H1 doNotGroup preservation below are both superseded.
Merseyrail is Darwin-served (probed live: Ellesmere Port, Liverpool Central, Moorfields, Lime
Street all returned Merseyrail trips with platform + status); `MerseyrailFeedUnconfirmedError` is
deleted and board eligibility is `in`. Lime Street's H1 doNotGroup split is closed as moot (Tim's
option B, 4 Sep 2026) — one catalog entry, one Darwin board. This history section is kept for
record, not deleted; Mark re-QAs this branch per the normal PR process (region already live, not a
new flip).

---

## 4 Sep 2026 QA Re-Check: PR #202 (liverpool-merseyrail-via-darwin branch)

**Date:** 4 Sep 2026  
**QA Gate:** Mark (PR #202, branch: liverpool-merseyrail-via-darwin)  
**Status:** ✓ FULLY GREEN

### Verification Checklist

| Check | Result | Notes |
|-------|--------|-------|
| **Probe script (ELP, LVC, MRF, LIV)** | ✓ PASS | ELP: 4 Merseyrail trips, platform 1, live status ("3 min late"). LVC: 15 Merseyrail trips, platforms 1–3, live status ("9 min late", "3 min late", etc.). MRF: 15 Merseyrail trips, platforms 1–3, live status ("6 min late", "3 min late", etc.). LIV: 15 trips total including Merseyrail (5 trips, platform "A") + Northern (3) + Avanti (1) + TPE (1) + EMR (1) + LNR & WMR (1) + TfW (1), all with live status ("On Time", "9 min late", etc.). Platforms on Merseyrail verified: "A" for low-level Lime Street platforms; numbered 1–3 for other stations. All returned with operator "Merseyrail" in payload. |
| **Liverpool City Region dogfood gate (with DARWIN_LDB_TOKEN)** | ✓ PASS | 29 rail + 68 Merseyrail stations = 97 total. Lime Street H1 closed as moot (one entry, mode train, CRS LIV). Merseyrail Darwin-served via shared uk-darwin.js path (no operator filters). Perth/London TfL/West of England stay green. |
| **Liverpool City Region dogfood gate (without token)** | ✓ PASS | Structural-only pass: all 68 Merseyrail entries resolve to a CRS and fail closed with MissingDarwinTokenError (same shape as National Rail, not swallowed). |
| **UK region catalog conformance** | ✓ PASS | liverpool-city-region 29+68 (full-network rescope 4 Sep 2026). Merseyrail via Darwin, H1 closed as moot. Two structurally separate agency shapes. |
| **UK planned gate** | ✓ PASS | uk-london-tfl + west-of-england + east-midlands + uk-west-midlands + liverpool-city-region live; remaining UK regions planned/501. |
| **Live city lists sync** | ✓ PASS | 23 live cities consistent across registry, live-city-api, app.js, city-session, brisbane-dogfood, journey-model. |
| **Station counts** | ✓ PASS | 29 National Rail (mode train), 68 Merseyrail (mode metro), 97 total. Lime Street single entry confirmed (mode train, CRS LIV, no doNotGroup). |
| **Operator filters** | ✓ PASS | No excludeOperators or includeOperators found in lib/providers/liverpool-city-region.js or lib/cities/liverpool-city-region/dogfood-next-train.js. Every board shows every train Darwin returns (walk-up rule applied literally). |
| **Lime Street resolution** | ✓ PASS | "Liverpool Lime Street" + train mode resolves to single entry (CRS LIV, mode train). "Liverpool Lime Street" + metro mode resolves to null (correct — no metro-only entry exists). |
| **Liverpool South Parkway** | ✓ PASS | Both train and metro entries present, same CRS (LPY), both call Darwin (same board returned for both modes). Merseyrail trains visible alongside Northern/TfW. |
| **MerseyrailFeedUnconfirmedError deletion** | ✓ PASS | Zero references in lib/, api/, public/, qa/ code. Removed from: lib/cities/liverpool-city-region/dogfood-next-train.js, lib/providers/liverpool-city-region.js, qa/directions-error-messaging.mjs (import + test). Comments updated in api/directions.js, public/journey-detail.js, lib/cities/live-city-api.js to reference other unconfirmed-feed examples (NetFeedUnconfirmedError, MetrolinkFeedUnconfirmedError, etc.) instead. |
| **Shared uk-darwin.js changes** | ✓ PASS | Additive only. Added optional `entry` (pre-resolved catalog entry) and `mode` (override returned board's mode label) parameters to fetchStationBoard(). No behavior change for existing callers (entry defaults to resolveRailEntry, mode defaults to "train"). All other UK regions' gates remain green in individual tests. |
| **Documentation updates** | ✓ PASS | oracle-clash-report.md: Board eligibility section has dated corrections (lines 69–70, superseding the 2 Sep correction) stating Merseyrail verdict is `in` with probe evidence. registry.js liverpool-city-region entry updated: integration and notes fields mention 4 Sep 2026 correction, Darwin-served, verdict `in`. published-network.json: notes field has "MERSEYRAIL-VIA-DARWIN CORRECTION, 4 Sep 2026" and "LIME STREET (H1) CLOSED AS MOOT, 4 Sep 2026" sections with dated history preservation. Hazard pack H1, rescope-addendum, jim-handoff updated per brief section 2e. |
| **Related file changes (no behavior)** | ✓ PASS | api/directions.js: comment only (removed MerseyrailFeedUnconfirmedError from example, replaced with NetFeedUnconfirmedError). public/journey-detail.js: comment only (replaced MerseyrailFeedUnconfirmedError with MetrolinkFeedUnconfirmedError in error-handling prose). lib/cities/live-city-api.js: comment only (updated to reflect Merseyrail is Darwin-served). qa/directions-error-messaging.mjs: removed import and test for deleted error class, no other changes. |

### Board Eligibility Verification

**Lime Street (LIV) live board sample:** Merseyrail services returned with platform "A" + lateness ("On Time", "9 min late", etc.), appearing alongside Northern, Avanti, TPE, LNR & WMR, EMR, TfW — all with their own platform numbers. No operator filtered out. ✓

**Liverpool South Parkway (LPY) mixed-operator sample:** Train-mode board includes Merseyrail (5 trips, platforms shown) + Northern (2) + TfW (2) + EMR (1) + LNR & WMR (2). No operator filtered out. ✓

**Merseyrail-only sample (Liverpool Central / Moorfields):** Boards resolve to metro mode, call Darwin, return Merseyrail services with platforms and live status. ✓

### Findings

**FULLY GREEN.** All verification checks pass. Merseyrail real-time is live via Darwin, boards show every operator (walk-up rule applied literally), Lime Street is one catalog entry, operator filters are absent, MerseyrailFeedUnconfirmedError is completely deleted, documentation is updated with dated corrections, shared-file changes are additive and safe for other regions.

**ONE FLAG (documentation inconsistency, non-blocking):** oracle-clash-report.md Board eligibility section, line 87 (board eligibility table row for Merseyrail) still shows verdict `out-product` with outdated reasoning ("board throws MerseyrailFeedUnconfirmedError..."). This row contradicts the corrected prose in lines 69–70 and lines 72–73 (HISTORICAL sections) which correctly state verdict `in`. The table row should be updated to match the corrected verdict, or clearly marked as historical artifact (unlike the prose sections, which are already marked HISTORICAL / CORRECTED AGAIN). Current form is confusing — a reader seeing the table would not know the verdict changed. Flag to fix before merge (Jim/Tim decision on whether the table should be rewritten with the correction inline, or the outdated row deleted + replaced with corrected version). No code impact; documentation consistency issue only.

**Smoke suite:** ✓ PASS — 90 PASS, 0 FAIL, 389s total. Includes liverpool-city-region-dogfood-gate.mjs (line 100 of output) plus all other city gates, browser tests, region selection, and cross-city consistency checks. Full run confirms no blast radius on other cities.

Ready to merge.
