# Solent QA Sign-off: PLANNED LANDING APPROVED

**Date:** 5 Sep 2026  
**QA Gate:** Mark (Planned landing / Master PR #216)  
**Status:** ✓ FULLY GREEN

## Checklist Results

| Check | Result | Notes |
|-------|--------|-------|
| **Solent dogfood gate** | ✓ PASS | Catalog CRS sweep ok (every rail CRS resolves at Darwin to its catalogued name). Two-hub architecture SOU/PMH independent with PMS as Portsmouth secondary. Fareham operator-split hub for Portsmouth Harbour. Routing table (hub/exact/undirected) proven token-free. |
| **UK region catalog conformance** | ✓ PASS | solent 7+0 two-hub NR shape with Portsmouth Harbour/Portsmouth & Southsea hub+secondary. Boundary stations WSB/WAT resolve flat. |
| **Live city lists sync** | ✓ PASS | 23 live cities consistent (Solent correctly NOT in live lists, stays planned). |
| **DST coverage** | ✓ PASS | Europe/London timezone set; BST/GMT transitions handled by os/environment. |
| **V1 scope vs oracle report** | ✓ CONFIRMED | National Rail (Darwin/OpenLDBWS): walk-up eligible services marked `in` (SWR, Southern, GWR, CrossCountry). Island Line marked `out-mode` (ferry dependency). No scope creep. |
| **Board eligibility: section completeness** | ✓ PASS | Oracle report Board eligibility section (lines 49–80) complete: all services assigned verdicts, zero `undecided` rows. Walk-up National Rail regional/InterCity (SWR, Southern, GWR, CrossCountry): `in`. Island Line: `out-mode`. No silent omissions. |
| **Hub-lock & station topology** | ✓ CONFIRMED | Two-hub model confirmed: Southampton Central (SOU, west-side terminus) and Portsmouth Harbour (PMH, east-side terminus) with Portsmouth & Southsea (PMS) as secondary board on same corridor. No doNotGroup logic needed at any board (no separate platform/boarding-section logic per operator per Darwin evidence). |
| **Response shape conformance** | ✓ PASS | Dogfood dispatch wiring correct; adapter follows UK region patterns (uk-darwin.js reuse + region config). Directions derived live from Darwin where available. |
| **Smoke suite (pre-flip)** | ✓ PASS | All 91 tests PASS including solent-dogfood-gate.mjs, uk-region-catalog-conformance.mjs, live-city-lists-sync.mjs, region-selection.mjs, and 87 others. Zero failures. |
| **Direction hub anchoring** | ✓ CONFIRMED | Fareham (FRM): one hub wired for Portsmouth Harbour, collapsing operator-split duplicate (GWR + SWR). Southampton Central shows identical operator split at Fareham but has NO configured hub — shared helper limitation (one hub per appliesFrom station). Routes correctly via exact-chip path. Flagged for future follow-up. |

## Adapter Status

- **Registry:** status "planned", adapterReady true
- **Dispatch:** Wired in live-city-api.js (pre-flight, not in MULTI_CITY_IDS yet)
- **Gate script:** qa/solent-dogfood-gate.mjs registered and passing
- **D1 pack:** Complete (oracle-clash-report.md, hazard-pack.md, jim-handoff.md, direction-model-memo.md, published-network.json)

## UK Country Ledger Status

**`docs/united-kingdom-ledger.md`:** Does not exist  
**Standing Note:** This pack (as with all UK National Rail regions in this wave) flagged the need for a UK country-level ledger at D1 pack stage per `docs/country-lane.md`'s retrofit rule. Cross-region facts (hub anchoring, stop-ownership boundaries, national-service board-eligibility verdicts) should be held in a ledger, not re-derived per region. Flagged as overdue; not blocking this planned landing.

## Summary

**All checks PASS.** Solent adapter wired and verified live pre-flight (5 Sep 2026, docs/solent-d1/jim-handoff.md confirms all seven CRS codes live). Two-hub architecture (Southampton Central / Portsmouth Harbour + Portsmouth & Southsea secondary) confirmed via Darwin probes. Board eligibility verdicts recorded and complete. Hub anchoring at Fareham confirmed (operator-split collapse for Portsmouth Harbour only; Southampton Central operator split documented as shared-helper limitation, not a blocker). Status stays planned (DARWIN_LDB_TOKEN blocker remains, same as all other UK National Rail regions in this wave — account-level unblock for EvansAppStudio's UK re-registration still pending). Ready for planned landing to master.

---

**Test Coverage:**
- solent-dogfood-gate.mjs: ✓ PASS
- uk-region-catalog-conformance.mjs: ✓ PASS
- live-city-lists-sync.mjs: ✓ PASS
- uk-planned-gate.mjs: ✓ PASS
- All 91 smoke suite tests: ✓ PASS (0 failures)
