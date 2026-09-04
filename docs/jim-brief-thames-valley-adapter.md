# Jim brief: Thames Valley adapter (D2–D6) — planned → adapter-wired, no live flip

**For:** Jim
**From:** Tim (product), scoped by Fable overnight 5 Sep 2026 (third of the night's rail-only UK regions; West Yorkshire #215 and Solent #216 are merged).
**Input pack (finished, hygiene-passed):** `docs/thames-valley-d1/` — read `jim-handoff.md` first (its final dated section supersedes the blocker framing above it), then `direction-model-memo.md` in full (hub + secondary-hub with a `doNotGroup` twist at Oxford), `hazard-pack.md`, `published-network.json`, `oracle-clash-report.md`.
**Worked examples to copy:** Solent (#216, the immediately preceding region: `lib/cities/solent/dogfood-next-train.js`, `qa/solent-dogfood-gate.mjs`, its `live-city-api.js` dispatch cases, `registry.js` notes, and `lib/cities/solent/direction-hubs.json`) and West Yorkshire (#215).
**Scope:** `thames-valley` only. Branch: `thames-valley-adapter` (current branch; contains master through #216 plus the hygiene commit). PR base master.

## Facts

- 8 catalog entries over 7 physical stations, no metro layer: Reading (RDG, hub), Oxford as **two operator-split entries both on OXF** — "Oxford (GWR)" and "Oxford (Chiltern)" — which is the pack's `doNotGroup` twist at the secondary hub (read the memo's "Why Oxford still needs doNotGroup" before touching resolution: both entries must resolve to OXF and the picker must keep them apart the way the pack says), Swindon (SWI), Banbury (BAN), Didcot Parkway (DID), Henley-on-Thames (HOT), and the boundary point Westbury (WSB, also catalogued by West of England and Solent by design).
- All CRS codes verified live on 5 Sep 2026 (Henley-on-Thames was wrong and is corrected everywhere).
- `DARWIN_LDB_TOKEN` is live (in `.env.local`, via `loadEnvLocal()`; gates stay token-tolerant).
- Direction model: destination (as Darwin prints it) + operator; no static line map.
- Board eligibility section present, no `undecided` rows (GWR, Chiltern, CrossCountry and whatever else the report lists; confirm from the report).

## Deliverables

Same seven as the West Yorkshire brief (`docs/jim-brief-west-yorkshire-adapter.md`, items 1–7), with these specifics:

1. `lib/cities/thames-valley/dogfood-next-train.js` — `getThamesValleyDogfoodDirections` / `getThamesValleyDogfoodNextTrain` (+ `planThamesValleyNextTrainFetch`) through the shared hub helper and national-index exact path, `printedDestination` on remapped trips. The two Oxford entries share a CRS: make sure station resolution by either printed name reaches OXF and that the operator suffix in chips keeps GWR and Chiltern services distinguishable, as the memo requires.
2. `lib/cities/thames-valley/direction-hubs.json` — **only with live evidence.** Candidates to probe: the Henley branch (from HOT, do services run through to Reading or terminate at Twyford? if riders anchor on Reading and trains call at RDG, that is a Kidderminster-shape hub "Reading", `filterCrs: RDG`, absorbing only what `--filter-crs=RDG` shows); an operator split on "London Paddington" or "Reading" at Didcot/Swindon (Liverpool shape); an operator split on "Oxford" at Banbury (Chiltern vs CrossCountry). Known limitation from #216: the shared helper supports **one hub per station** — if a station qualifies for two, pick one, keep the other on the exact-chip path, and record it for Tim as Solent did at Fareham.
3. `live-city-api.js` dispatch cases only (membership lists are the flip's job; say so in the PR).
4. `registry.js`: notes/integration updated, `adapterReady: true`, **`status` stays `"planned"`**.
5. `qa/thames-valley-dogfood-gate.mjs` replacing the planned gate (register in the smoke tier), token-tolerant, with the token-gated catalog CRS sweep, hub + secondary-hub + Oxford `doNotGroup` assertions, WSB boundary resolution, planner routing table, end-to-end with token.
6. `docs/thames-valley-d1/jim-handoff.md` — dated "Adapter wired" section with live chip tables for every entry and the hub decision.
7. `public/city-directions/thames-valley.json` — not generated pre-flip (note it, as #215/#216 did).

## Guardrails

Identical to the previous two briefs: no edits to `lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`, `lib/cities/uk/*`, or any other region (Westbury is shared by design — do not touch West of England or Solent files). Never fabricate. Eligibility statement in the PR. Stage by explicit path. No `status: "live"`. Lane lock: the top-level session has already released Solent's lock in the working tree (uncommitted); do not release again — `acquire united-kingdom thames-valley adapter` and commit the lock file carrying both; release is post-merge. Gate token-free and with token, then `node qa/run-all.mjs --smoke` once; no edits while it runs; never the full suite.

## PR body must include

Live chip table for every entry (both Oxford rows separately); a Reading board sample; the hub decision with filtered-board evidence or the "no hub warranted" statement; the Oxford `doNotGroup` confirmation; the eligibility statement; the lane-lock release command; smoke result.
