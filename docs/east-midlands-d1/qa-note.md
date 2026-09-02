# East Midlands QA Report — Live Flip Attempt

**Date:** 2 Sep 2026  
**Gate Status:** BLOCKED — Cannot proceed to flip

## Critical Blockers

### 1. BLOCKER: Missing Board eligibility section in oracle report

The oracle-clash-report.md does not contain a mandatory **Board eligibility section** required by the adopted rule (`docs/board-eligibility-rule.md`, §5). The rule states:

> **Nico:** every oracle-clash report includes the Board eligibility section. An empty section requires the sentence "No services other than the in-scope operator call at any in-catalog station — verified", not silence.

Mark's checklist gate requires: **(1) the city's oracle report has a Board eligibility section with no `undecided` rows**.

The oracle report ends with the License section and has no Board eligibility section — neither verdicts for individual services nor even an empty-section declaration. This is a mandatory gate failure per the rule adoption (Tim, 30 Aug 2026).

**Current oracle-clash-report.md section structure:**
- East Midlands oracle clash report (header)
- V1 scoping — NET schedule-only, National Rail slot TBD
- Station name table
- H2 clash surface
- C2/C3 to put in front of Jim
- License

**Missing:** Board eligibility section with service verdicts

---

## Mark's Verdict on NET Tram Board-Eligibility Issue

The task asks me to evaluate whether NET tram's `NetFeedUnconfirmedError` (error-surfacing instead of silent board omission) is acceptable for a live flip under the board-eligibility rule.

**Verdict: Acceptable IF verdict is recorded in oracle report; unacceptable if verdict is missing.**

**Reasoning:**

The board-eligibility rule (§2, §5) requires that every service calling at an in-catalog station receives one of six verdicts: `in`, `out-reservation`, `out-checkin`, `out-mode`, `out-product`, or `undecided` (pre-flip only). The rule forbids silence: verdicts must be *recorded*, not assumed.

NET tram services would pass the walk-up-boardable and leave-by-valid tests (light rail inherently requires neither compulsory reservation nor check-in); therefore, they belong on the board with a verdict.

The current adapter throws `NetFeedUnconfirmedError` on tram-layer board fetch, which is **better than silent omission** (explicit error is better than invisible filtering). However, this is a production decision, not a verdict. The appropriate oracle-report verdict is **`out-product`** with the reason: "Feed unconfirmed (no GTFS-RT, static GTFS pull 31 Aug 2026 found NET absent from DFT aggregator). Board surfaces error until feed is confirmed."

**What must happen for this to be acceptable:**

1. Oracle report gains a Board eligibility section with a recorded `out-product` verdict for NET tram services
2. That verdict includes Tim's explicit approval of the error-surfacing approach (this is what `out-product` with "Tim's sign-off recorded" means per the rule)
3. The adapter continues to surface `NetFeedUnconfirmedError` clearly to callers (current behavior is correct)
4. Once NET feed is confirmed, the verdict becomes `in` and tram boards show real schedules

**Current state:** No verdict recorded = gate failure, cannot flip.

---

## Action Required

The oracle report must be updated by Nico to include a Board eligibility section before this region can flip to live. The section should document verdicts for:

1. **NET tram services at Nottingham Station** — must be recorded as `out-product` with reason "Feed unconfirmed (absent from DFT aggregator 31 Aug 2026; no real-time feed confirmed). Board surfaces error until feed is confirmed." This verdict requires Tim's explicit approval per the board-eligibility rule.
2. **National Rail services at Nottingham and through-running stations** — verdicts per service. East Midlands Trains regional services likely all `in` (walk-up, no check-in). Any sleeper or premium services with compulsory booking should be marked `out-reservation`.

**Related context (for Tim/Nico re-verification):**
- NET tram: no real-time GTFS-RT feed confirmed; no static GTFS found in DFT aggregator (D2 finding, 31 Aug 2026). Schedule-only v1 unavailable pending feed confirmation.
- National Rail: Darwin/OpenLDBWS live (REST API verified against Bristol Temple Meads, PR #188). Currently account-blocked pending Tim's RDM re-registration with UK address — will be live once DARWIN_LDB_TOKEN is set.
- No ledger exists yet for UK (`docs/united-kingdom-ledger.md` absent — skip ledger-consistency check per task spec)
- Adapter correctly surfaces `NetFeedUnconfirmedError` for tram boards (explicit error preferred to silent omission per board-eligibility principle)

## Tests Run (Pre-Blocker)

All tests run before hitting the Board eligibility gate:

| Test | Result | Notes |
|------|--------|-------|
| `qa/east-midlands-dogfood-gate.mjs` | FAIL (expected) | `assertCityLive(east-midlands)` fails pre-flip — documented behavior per Jim's commit message |
| `qa/uk-planned-gate.mjs` | PASS | uk-west-midlands, uk-ellesmere-port, and remaining UK regions planned/501; uk-london-tfl + west-of-england live |
| `qa/live-city-lists-sync.mjs` | PASS | 20 live cities consistent across registry, live-city-api, app.js, city-session, brisbane-dogfood, journey-model |
| `qa/uk-region-catalog-conformance.mjs` | PASS | East Midlands catalog structure valid (6 National Rail + 4 NET tram stations) |
| `qa/run-all.mjs --smoke` | NOT COMPLETED | Timeout after 120s; pre-blocker gate failure stops flip attempt before full smoke run needed |

## Summary of Findings

| Item | Status |
|------|--------|
| Adapter code-side follow-through (Jim) | ✓ Complete (`83d2aad`) |
| Adapter board filtering logic | ✓ Correct (surfaces errors explicitly) |
| Catalog structure (6 NR + 4 NET stations) | ✓ Valid |
| doNotGroup hub lock (Nottingham Station NET vs NR) | ✓ Properly resolved |
| Direction model conformance | ✓ Valid (NET: line+terminus; NR: destination+operator) |
| DST (Europe/London, BST/GMT) | ✓ Noted in hazard-pack H7 |
| Oracle report Board eligibility section | ✗ MISSING (gate failure) |
| Board eligibility verdicts recorded | ✗ MISSING (gate failure) |
| NET tram error-surfacing approach | ✓ Acceptable (if verdicts recorded) |
| UK country ledger | N/A (doesn't exist yet; OK per task spec) |

## Recommendation

**STOP THE FLIP.** The oracle report is missing the mandatory Board eligibility section required by Tim's adopted rule (30 Aug 2026). No live flip is possible until:

1. Nico updates the oracle report with a Board eligibility section
2. NET tram is recorded with `out-product` verdict ("Feed unconfirmed, board surfaces error until confirmed") and Tim approves
3. National Rail services are recorded with individual verdicts (`in` for all walk-up services; `out-reservation` for any sleepers/premium-booking services)
4. Mark re-runs this QA gate and confirms the verdicts match the adapter's filtering

This is not a defect in the adapter or code — it's a missing gate artifact (the oracle report). Once Nico adds the Board eligibility section and Tim approves the NET tram approach, East Midlands will be ready for flip.

---

*Report generated by Mark (QA lane), East Midlands flip attempt (2 Sep 2026).*
