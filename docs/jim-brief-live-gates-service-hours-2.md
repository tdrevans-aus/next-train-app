# Jim brief — remaining live gates with unguarded "at least one" assertions (follow-up to #491)

**Lane:** bug-fix / product mode (qa/ only). **Date:** 28 Sep 2026. **tim-review:** no.

## Scope (Mark's #491 audit, five highest-confidence night-flake candidates; Jim's grep found ~28 total)
1. qa/uk-west-midlands-dogfood-gate.mjs (~line 595): Jewellery Quarter Metro live directions non-empty — gated on TFWM key only.
2–3. qa/greater-anglia-dogfood-gate.mjs (~312, ~324): Peterborough LNER chip; Norwich hub chip — Darwin-token-gated only (LNER has an overnight gap).
4–5. qa/liverpool-city-region-dogfood-gate.mjs (~329, ~336–342): Merseyrail-trip and Lime Street operator-mix assertions — Darwin-token-gated only.
Then sweep the rest of Jim's ~28 list and apply the same pattern where an assertion needs live service.

## Fix
Use qa/helpers/service-hours.mjs (per-city windows; add UK windows: West Midlands Metro ~05:30–00:30, LNER at Peterborough ~05:30–23:30, Merseyrail ~05:30–00:30 — verify from operator timetables and cite). Outside the window: SKIP-LIVE line + assert the well-formed empty/next-service shape. Inside: strict, unchanged. Never weaken offline assertions. For each changed gate, prove the strict path still fails on a deliberate break (record it in the PR).

## Acceptance
- `node qa/service-hours-helper.mjs` extended for the new cities and green; each changed gate run live once with the local hour stated; `node qa/run-all.mjs --smoke` PLAIN green. PR title: "qa: remaining live gates service-hours aware (UK Metro/LNER/Merseyrail + audit sweep)". Link #491 and Mark's comment there.
