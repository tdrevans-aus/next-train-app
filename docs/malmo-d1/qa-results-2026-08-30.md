# Malmö QA Results — Mark's Report (2026-08-30)

## Status: Tests Pass ✅ | Blocking Risk Identified ⚠️

All offline contract tests pass. Adapter is correctly wired per D1 pack. However, **TRAFIKLAB_API_KEY scope for regional `skane` endpoint is unverified**, blocking live-flip decision.

## Test Summary

| Test | Result | Notes |
|------|--------|-------|
| malmo-planned-gate.mjs | ✅ PASS | Registry/catalog/direction model verified |
| malmo-line-map-conformance.mjs | ✅ PASS | Created during QA; doNotGroup rules confirmed |
| Direction model (ring/express/plain) | ✅ PASS | mapMalmoDestination() proven; no headsign leaks |
| Hub-lock (Malmö C) | ✅ PASS | Set as fallbackStationName |
| doNotGroup rules | ✅ PASS | 5 rules present for Öresundståg + headsign |
| V1 scope (Pågatågen only) | ✅ PASS | tripAllowed() + route_type filtering enforced |
| DST (Europe/Stockholm) | ✅ PASS | timeZone + dst flags set |
| Feed naming renames | ✅ PASS | printedStationName() + FORBIDDEN_COLLAPSE rules |
| Smoke suite (60 tests) | ✅ PASS (1 unrelated FAIL) | malmo-planned-gate.mjs passes; line-map added |
| Gatekeeper cities (Perth/Göteborg) | ✅ PASS | No regression |

## Blocking Risk: Unverified TRAFIKLAB_API_KEY Scope

**What:** The adapter uses `TRAFIKLAB_API_KEY` (same env var as Göteborg's `vt` adapter) to fetch regional `skane` GTFS static + realtime data. Whether this key has regional scope is **unverified from sandbox.**

**Why it matters:** If the key lacks `skane` scope, live board calls will fail 403 when fixtures are absent.

**Verification needed (before flip):**
- [ ] Test `TRAFIKLAB_API_KEY` against `https://opendata.samtrafiken.se/gtfs/skane/skane.zip?key=…` in production
- [ ] Test TripUpdates: `https://opendata.samtrafiken.se/gtfs-rt/skane/TripUpdates.pb?key=…`
- [ ] If both fail, register new regional key at trafiklab.se (Tim's call; Viv-lane outreach if needed)

**Source:** docs/malmo-d1/jim-handoff.md item 1; lib/providers/malmo.js lines 14–19.

## Hazards from D1 Pack — All Handled

- **H1 (doNotGroup Öresundståg @ 4 stations)** — line-map.json rules ✓
- **H3 (PågatågenExpress overlay)** — isExpressPattern() detection ✓
- **H4 (Malmö C double-call)** — mapMalmoDestination() + getTripStopIndex() ✓
- **H5 (Short-turns)** — published-network.json arrays ✓
- **H6 (Hub lock)** — fallbackStationName: MALMO_HUB ✓
- **H7 (DST)** — Europe/Stockholm flagged ✓
- **Feed naming** — printedStationName() + FORBIDDEN_COLLAPSE ✓

## Artifacts Created This QA

- **qa/malmo-line-map-conformance.mjs** — new offline test (passes)
- **qa/run-all.mjs** — updated to include malmo-line-map-conformance.mjs in smoke tier

## Recommendation

**Do not flip live without resolving the key-scope risk.** All technical aspects are ready; decision requires production API key verification by Tim.

Once verified, proceed with one-line flip PR: status "planned" → "live" in lib/providers/registry.js.
