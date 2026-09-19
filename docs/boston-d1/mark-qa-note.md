# Mark QA note — Boston (`boston`) live-flip request

**Date:** 2026-09-20
**Verdict: RED — do not flip.** Two blocking findings below (board-eligibility rule, and
missing flip-follow-through). Everything else checked green.

## What was checked

| Check | Result | Evidence |
|---|---|---|
| `node qa/boston-planned-gate.mjs` | PASS | `boston-planned-gate: ok (planned/501, adapterReady, D1 pack, 125 stations, hub Park Street, doNotCollapse pairs enforced ..., Perth Australia green)` |
| `node qa/run-all.mjs --smoke` | PASS | 144 PASS · 0 FAIL · 554s (full log tailed; `boston-planned-gate.mjs PASS` present, no other city regressed) |
| DST edge cases | PASS | `BOSTON_TIME_ZONE = "America/New_York"` (real IANA zone, not a fixed-offset hack) — file header explicitly flags "HAS DST … do not copy Perth/Brisbane no-DST" and the shared `gtfs/board.js` DST handling is already exercised by other DST cities in the smoke tier. |
| Hub-lock / doNotGroup | PASS | Park Street locked as the Red×Green hub; Downtown Crossing, Gov't Center, State, South Station, North Station, Haymarket all kept as separate stop-places — asserted directly by `boston-planned-gate.mjs`'s "doNotCollapse pairs enforced" and "hub Park Street" lines, matching `hazard-pack.md` H1/H2/H6. |
| v1 mode cut (subway/rapid-transit only) | PASS (mechanically) — see flag below | `BOSTON_ROUTE_TYPES = ["0","1"]` plus an exact GTFS `route_id` allow-list (`MBTA_ROUTE_ID_TO_LINE`) correctly admits only Red/Orange/Blue/Green-B/C/D/E/Mattapan and excludes Commuter Rail (`"2"`), bus (`"3"`), ferry (`"4"`) at parse time — matches the oracle report's stated cut. |
| Response-shape conformance | PASS | `fetchStationBoard` returns `{ stationName, lastUpdate, trips, realtime: false }`, the same shape used by other schedule-only planned cities (e.g. Copenhagen); `realtime: false` is accurate since no MBTA V3 predictions path is wired. |
| Ledger-consistency check (`docs/country-lane.md`) | N/A | No `docs/united-states-ledger.md` (or equivalent) exists, and none is required: MBTA is a standalone, single-agency feed with no other US region currently in the pipeline overlapping it (Washington/Chicago/BART are separate agencies, untouched, per `jim-handoff.md`) — same "segregated networks" category as AU/NZ/CA, which `docs/country-lane.md` explicitly exempts. |
| Live MBTA feed reachability | N/A by design | The adapter never calls `api-v3.mbta.com` — it is schedule-only static GTFS (`lib/providers/boston.js` file header, confirmed by reading the code). No `MBTA_API_KEY` (or similar) is read from `.env.local`, and none is required for the current code path — `MissingMbtaApiKeyError` exists only for a future live-realtime path that isn't wired. This matches the D1 pack's explicit instruction not to register a key. Flagging for visibility, not as a fail: a live subway flip shipping with **no real-time predictions at all** (schedule-only) is a materially different rider experience than every other city's live boards — worth Tim's eyes before flip, even though it's the documented, deliberate D1/D2 design. |

## Blocking finding 1 — Board eligibility section missing (`docs/board-eligibility-rule.md`)

`docs/boston-d1/oracle-clash-report.md` has **no "Board eligibility" section at all** — not even
the required "No services other than the in-scope operator call at any in-catalog station —
verified" sentence for an empty case. Per the rule (§5, Mark's checklist item 1) this alone is a
blocking gate before any flip-PR, independent of everything else being green.

It's not an empty case here, either. §6 of the rule is explicit that **a second rail network
sharing an in-catalog station is not automatically `out-mode`** — that's the exact "recurred
three times" mistake the rule calls out (Öresundståg/Krösatågen, Vy/Flytoget, S-tog/DSB). Boston
has the same shape:

- **South Station** and **North Station** are both in-catalog subway stops (Red Line / Green &
  Orange respectively — confirmed in `lib/cities/boston/stations.json`).
- MBTA **Commuter Rail** also calls at both. Commuter Rail is walk-up boardable (tickets sold
  on-train or at kiosks/machines, no compulsory seat reservation) and has no check-in/security
  barrier at these stations — i.e. it appears to pass both walk-up tests in §2 of the rule.
- The adapter currently drops all Commuter Rail rows silently and unconditionally at parse time
  (`BOSTON_ROUTE_TYPES = ["0","1"]` excludes GTFS route_type `"2"`), and the D1 pack's
  justification for this is written as a mode cut ("No … Commuter Rail" in `jim-handoff.md`,
  `hazard-pack.md`), not as a tested walk-up/check-in verdict.

This is the task's named hard-fail case: **a walk-up service silently missing from an in-catalog
station's board**, same severity as a hub-lock violation. It may well resolve to a legitimate
`out-product` verdict (Commuter Rail is a materially different fare/ticketing product and a much
lower-frequency service than subway — that's a real candidate reason under §3), but that
determination and Tim's sign-off don't exist yet. Per the rule this has to go back to Nico/Luke to
add the Board eligibility section (with a real tested verdict for Commuter Rail at South
Station/North Station, and confirmation that Silver Line BRT is legitimately `out-mode` as a
genuinely different vehicle type) before this can be re-QA'd for flip.

## Blocking finding 2 — flip follow-through not done (per this task's own guardrails)

Per the flip-PR guardrails: before opening a flip PR I must confirm Jim has already done the
code-side flip follow-through — a `*-dogfood-gate.mjs` replacing the `*-planned-gate.mjs`, a
dogfood module, and the `live-city-api.js` dispatch switch-cases. `docs/boston-d1/jim-handoff.md`
states explicitly this was **not** done, by design, at D2:

> "Follow-through NOT done, by design: no dogfood module, no `live-city-api.js` dispatch wiring,
> no `*-dogfood-gate.mjs`."

Only `qa/boston-planned-gate.mjs` exists; there is no `boston-dogfood-gate.mjs`. Per the flip
instructions this must be flagged back rather than opening an incomplete flip PR (the explicit
Helsinki #164 precedent).

## Not blocking, but worth carrying forward

- Route classification is flagged by Jim as "unverified against a live payload" — a D2 caveat,
  not something Mark can resolve without a live V3 payload; the GTFS static feed load during
  `qa/run-all.mjs --smoke` exercised real MBTA GTFS data end-to-end today and both gates passed,
  which is reasonable confirmatory evidence but not the same as verifying against `api-v3.mbta.com`.

## Suites run

- `node qa/boston-planned-gate.mjs` — PASS
- `node qa/run-all.mjs --smoke` (foreground, 600000ms timeout, output to file, read after
  completion) — 144 PASS · 0 FAIL · 554s
- No background processes or sleep/poll loops were left running; confirmed nothing listening on
  :3000 after the run.

## Recommendation

Do not flip. Route back to Nico/Luke for a Board eligibility section covering Commuter Rail at
South Station/North Station (and Silver Line BRT's out-mode status), and to Jim for the
dogfood-gate/dispatch follow-through — both need to land before Mark can re-run this checklist
green.
