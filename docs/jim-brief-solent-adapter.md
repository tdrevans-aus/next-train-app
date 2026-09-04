# Jim brief: Solent adapter (D2–D6) — planned → adapter-wired, no live flip

**For:** Jim
**From:** Tim (product), scoped by Fable overnight 5 Sep 2026 (second of the night's rail-only UK regions; West Yorkshire is #215).
**Input pack (finished, hygiene-passed):** `docs/solent-d1/` — read `jim-handoff.md` first (its final dated section supersedes the "account-level blocker" framing above it; the token exists), then `direction-model-memo.md` (two-hub architecture — read all of it), `hazard-pack.md`, `published-network.json`, `oracle-clash-report.md`.
**Worked examples to copy:** West Yorkshire (#215, the immediately preceding region on this exact pattern: `lib/cities/west-yorkshire/dogfood-next-train.js`, `qa/west-yorkshire-dogfood-gate.mjs`, its `live-city-api.js` dispatch cases and `registry.js` notes) and West of England (`lib/cities/west-of-england/direction-hubs.json` for the hub-file shape).
**Scope:** `solent` only. Branch from `solent-adapter` (current branch, carries the hygiene commit, stacked on `west-yorkshire-adapter`). PR base master; if #215 has merged by the time you open it, base master directly, otherwise base `west-yorkshire-adapter` and say so.

## Facts

- 7 National Rail stations, no metro layer: Southampton Central (SOU, hub), Portsmouth Harbour (PMH, hub) + Portsmouth & Southsea (PMS, secondary to PMH), Fareham (FRM), Eastleigh (ESL), and two boundary points shared with neighbouring regions — Westbury (WSB, also in West of England) and London Waterloo (WAT). The pack's architecture is **two hubs**, not one: respect the Portsmouth-side hub+secondary structure and the `doNotGroup` decisions exactly as `direction-model-memo.md` and `published-network.json` state them. Do not re-litigate the architecture.
- All seven CRS codes verified live on 5 Sep 2026 (Fareham was wrong and is corrected everywhere).
- `DARWIN_LDB_TOKEN` is live (in `.env.local`, via `loadEnvLocal()`; gates stay token-tolerant).
- Direction model: destination (as Darwin prints it) + operator; no static line map.
- Board eligibility: SWR, Southern, GWR (and any other operator the report lists) `in`, no `undecided`.

## Deliverables

Same seven as the West Yorkshire brief (`docs/jim-brief-west-yorkshire-adapter.md`, items 1–7), with these region specifics:

1. `lib/cities/solent/dogfood-next-train.js` — `getSolentDogfoodDirections` / `getSolentDogfoodNextTrain` (+ `planSolentNextTrainFetch` wrapper) through the shared hub helper and national-index exact path, `printedDestination` on remapped trips.
2. `lib/cities/solent/direction-hubs.json` — **only with live evidence.** Candidates to probe (not assumptions): an operator split on "Portsmouth Harbour" or "Southampton Central" at Fareham/Eastleigh (Liverpool shape); a through-service past Southampton Central to a terminus riders don't recognise (e.g. from Eastleigh: Poole/Weymouth/Bournemouth print as termini but riders may anchor on Southampton — that is a *Kidderminster-shape* candidate: label "Southampton Central", `filterCrs: SOU`, absorbs the west-of-Southampton termini **only if** `--filter-crs=SOU` from ESL shows them). Every `absorbs` entry needs filtered-board evidence for Tim.
3. `live-city-api.js` dispatch cases (mirror West Yorkshire: dispatch only; `MULTI_CITY_IDS` membership is part of the later flip, note this in the PR as #215 did).
4. `registry.js`: notes/integration updated, `adapterReady: true`, **`status` stays `"planned"`**.
5. `qa/solent-dogfood-gate.mjs` replacing the planned gate (register in `qa/run-all.mjs` smoke tier), token-tolerant, with the token-gated catalog CRS sweep, two-hub assertions (SOU and PMH both resolve as hubs, PMS secondary, WSB/WAT boundary points resolve), planner routing table, end-to-end with token.
6. `docs/solent-d1/jim-handoff.md` — dated "Adapter wired" section with live chip tables for all seven stations and the hub decision.
7. `public/city-directions/solent.json` — same treatment as #215 (not generated pre-flip; note it).

## Guardrails

Identical to the West Yorkshire brief: no edits to `lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`, `lib/cities/uk/*`, or any other region (West of England shares Westbury — do not touch its files; the shared boundary station is by design). Never fabricate. Eligibility statement in the PR. Stage by explicit path. No `status: "live"`. Lane lock: `check united-kingdom` must be free (top-level checks first); `acquire united-kingdom solent adapter` before touching shared files; commit the lock file; release is post-merge. Gate token-free and with token, then `node qa/run-all.mjs --smoke` once; no edits while it runs; never the full suite.

## PR body must include

Live chip table for every station; a Southampton Central and a Portsmouth Harbour board sample; the hub decision with filtered-board evidence or the "no hub warranted" statement; the two-hub architecture confirmation; the eligibility statement; the lane-lock release command; smoke result.
