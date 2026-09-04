# Jim brief: Greater Anglia adapter (D2–D6) — planned → adapter-wired, no live flip

**For:** Jim
**From:** Tim (product), scoped by Fable overnight 5 Sep 2026 (fourth of the night's rail-only UK regions; West Yorkshire #215, Solent #216, Thames Valley #218 are merged).
**Input pack (finished, hygiene-passed):** `docs/greater-anglia-d1/` — read `jim-handoff.md` first (its final dated section supersedes the blocker framing above it and records tonight's CRS corrections and the LNER verdict), then `direction-model-memo.md` (hub Norwich with two co-equal secondary hubs Cambridge/Ipswich, and Peterborough's flat `excludeOperators` boundary — read all of it), `hazard-pack.md`, `published-network.json`, `oracle-clash-report.md` (Board eligibility section now has no `undecided` rows).
**Worked examples to copy:** Thames Valley (#218, the immediately preceding region: `lib/cities/thames-valley/dogfood-next-train.js`, `qa/thames-valley-dogfood-gate.mjs`, its dispatch cases and registry notes), Solent (#216) for the hub-file shape, West Yorkshire (#215).
**Scope:** `greater-anglia` only. Branch: `greater-anglia-adapter` (current branch; contains master through #218 plus the hygiene commit). PR base master.

## Facts

- 14 National Rail stations, no metro layer: Norwich (NRW, hub), Cambridge (CBG) and Ipswich (IPS) as co-equal secondary hubs, Peterborough (PBO, boundary with a flat `excludeOperators` rule per the pack — implement it exactly as `published-network.json` states; every excluded service must already carry a recorded verdict in the oracle report, silence is a QA failure), Colchester (COL), Ely (ELY), King's Lynn (KLN), Thetford (TTF), Diss (DIS), Wymondham (WMD), Great Yarmouth (GYM), Lowestoft (LWT), Stansted Airport (SSD), Bishops Stortford (BIS).
- Seven codes were wrong or missing in the original pack and are corrected everywhere as of 5 Sep 2026 (King's Lynn KLY→KLN, Thetford THF→TTF, Great Yarmouth YRD→GYM, Bishops Stortford BST→BIS, Diss/Wymondham/Lowestoft were null → DIS/WMD/LWT), all verified live.
- `DARWIN_LDB_TOKEN` is live (in `.env.local`, via `loadEnvLocal()`; gates stay token-tolerant).
- Direction model: destination (as Darwin prints it) + operator; no static line map.
- Board eligibility: Greater Anglia, Thameslink, CrossCountry, East Midlands Railway `in`; LNER at Peterborough resolved `in` on 5 Sep 2026 (unreserved coach always available, no compulsory reservation — same verdict and evidence as West Yorkshire's LNER row). Whether LNER appears on Peterborough's board is then governed only by the pack's `excludeOperators` boundary rule, not by eligibility.

## Peterborough `excludeOperators` — decision needed in the PR

The pack excludes LNER at Peterborough **only because** its verdict was `undecided`. That verdict is now `in`, and `docs/board-eligibility-rule.md` says a board must show every service a rider can walk up and board. So: probe Peterborough live, list every LNER service the exclusion would hide, and **propose removing the exclusion** in the PR (ship the adapter with the exclusion removed and the gate asserting LNER rows appear, unless you find a stop-ownership reason in the pack that still justifies it — if so, keep it and say why). Tim approves either way in the PR.

## Deliverables

Same seven as the West Yorkshire brief (`docs/jim-brief-west-yorkshire-adapter.md`, items 1–7), with these specifics:

1. `lib/cities/greater-anglia/dogfood-next-train.js` — `getGreaterAngliaDogfoodDirections` / `getGreaterAngliaDogfoodNextTrain` (+ `planGreaterAngliaNextTrainFetch`) through the shared hub helper and national-index exact path, `printedDestination` on remapped trips, and Peterborough's `excludeOperators` applied the way the pack specifies (check how `lib/providers/uk-darwin.js`'s region options already support `excludeOperators` before writing anything new — do not edit that file).
2. `lib/cities/greater-anglia/direction-hubs.json` — **only with live evidence.** Candidates to probe: the Norwich branches — from Wymondham/Thetford/Diss do services print termini past Norwich riders don't recognise, or an operator split on "Norwich" (Greater Anglia vs East Midlands Railway on the Liverpool–Norwich route at Thetford/Ely — Liverpool shape, label "Norwich", `filterCrs: NRW`); "Cambridge" split at Ely (Greater Anglia vs Thameslink vs CrossCountry vs Great Northern); "London Liverpool Street" split at Colchester/Ipswich. One hub per station (helper limitation) — pick the highest-value one and record the rest.
3. `live-city-api.js` dispatch cases only (membership lists are the flip's job; say so in the PR).
4. `registry.js`: notes/integration updated, `adapterReady: true`, **`status` stays `"planned"`**.
5. `qa/greater-anglia-dogfood-gate.mjs` replacing the planned gate (register in the smoke tier), token-tolerant, with the token-gated catalog CRS sweep (14 calls), hub + two-secondary-hub assertions, the Peterborough `excludeOperators` behaviour asserted against a fixture (every excluded operator has a recorded verdict), planner routing table, end-to-end with token.
6. `docs/greater-anglia-d1/jim-handoff.md` — dated "Adapter wired" section with live chip tables for all 14 stations and the hub decision.
7. `public/city-directions/greater-anglia.json` — not generated pre-flip (note it).

## Guardrails

Identical to the previous briefs: no edits to `lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`, `lib/cities/uk/*`, or any other region (Peterborough is also East Midlands' concern — do not touch its files). Never fabricate. Eligibility statement in the PR, including the explicit list of anything `excludeOperators` hides at Peterborough and the verdict that covers it. Stage by explicit path. No `status: "live"`. Lane lock: the top-level session has already released Thames Valley's lock in the working tree (uncommitted); do not release again — `acquire united-kingdom greater-anglia adapter` and commit the lock file carrying both; release is post-merge. Gate token-free and with token, then `node qa/run-all.mjs --smoke` once; no edits while it runs; never the full suite.

## PR body must include

Live chip table for every station; Norwich, Cambridge and Peterborough board samples; the hub decision with filtered-board evidence or the "no hub warranted" statement; the Peterborough exclusion list with verdicts; the eligibility statement; the lane-lock release command; smoke result.
