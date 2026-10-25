# Los Angeles flip QA note (Mark, 24 Oct 2026 ~20:15 PDT, master 52c49ca1)

Result: all checklist items green. Flip PR is labelled `flip` AND `hold` because Tim has not ruled on Metrolink / Pacific Surfliner (`out-product` is proposed in `docs/united-states-ledger.md`, awaits his sign-off).

| Check | Result |
|---|---|
| v1 mode cut (Metro Rail A/B/C/D/E/K only; G/J/bus/Metrolink/Amtrak out) | PASS (110 stations; coverage notes state it) |
| Hub lock 7th St/Metro Ctr never a direction token; doNotGroup downtown stations | PASS (`/api/directions` has no 7th token; dogfood gate enforces) |
| DST (America/Los_Angeles, PDT/PST) | PASS with note: tz correct; rider rows are Swiftly absolute times. Known limit documented in `scheduledDestinationsRemainingToday`: on the two DST-change nights the 01:00-03:00 emptyReason window can be an hour out (affects only no-live-predictions vs not-currently-served choice). Fall-back is 1 Nov. |
| Board eligibility: oracle section present, no `undecided` | PASS (SkyLink "no verdict until operating" is not undecided) |
| Board eligibility: filtering matches verdicts | PASS (Metrolink/Surfliner absent = proposed out-product; Amtrak LD out-reservation; G/J out-mode; all Metro Rail walk-up services shown) |
| Ledger consistency | PASS with note: US ledger has no stop-ownership section (no overlapping US regions); LA verdicts match; adapter contradicts none. Metrolink/Surfliner verdict differs from oracle (`in`) and is pending Tim |
| Coverage notes | PASS (`/api/coverage-notes?city=los-angeles`, coverage-notes-gate) |
| Honest empty state | PASS (sweep: 0 silent empties; `no-live-predictions` / `not-currently-served` present on rider `/api/board`) |
| No bare/self chips | PASS (110 stations in gate; rider samples) |
| Every chip reachable or carries emptyReason | PASS (gate: 334 station/terminus pairs, 0 unreached; empty chips carry a reason) |
| Live-only times, board `realtime: true` | PASS (`fetchStationBoard` realtime true; scheduled-only rows dropped; sampled via /api/board, /api/directions, /api/next-train) |
| All-stations live sweep | PASS, 9 polls, 9 Swiftly requests: 107 live x9, 3 documented not-currently-served, 0 zero |
| `node qa/run-all.mjs --smoke` on flip branch | 175 PASS, 0 FAIL, 586 s |

Open: jim-handoff item (a) Tim's Metrolink/Surfliner sign-off (hold reason); item (b) fixed by #531/#532; item (c) re-check the Wilshire La Brea / Fairfax / La Cienega D stations go live after 1 Nov stays open.
