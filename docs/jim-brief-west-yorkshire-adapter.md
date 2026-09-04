# Jim brief: West Yorkshire adapter (D2–D6) — planned → adapter-wired, no live flip

**For:** Jim
**From:** Tim (product), scoped by Fable overnight 5 Sep 2026 (Tim asleep; this is the first of 3–4 rail-only UK regions tonight).
**Input pack (finished, hygiene-passed):** `docs/west-yorkshire-d1/` — read `jim-handoff.md` first (its final dated section supersedes the stale "STOP CONDITION FOR MARK" above it), then `direction-model-memo.md`, `hazard-pack.md`, `published-network.json`, `oracle-clash-report.md`.
**Worked example to copy:** West of England — the most recent rail-only Darwin region: `lib/cities/west-of-england/dogfood-next-train.js`, `qa/west-of-england-dogfood-gate.mjs`, its `lib/cities/live-city-api.js` wiring and `lib/providers/registry.js` entry, and `lib/cities/west-of-england/direction-hubs.json`. Use `git log --oneline -- lib/cities/west-of-england/dogfood-next-train.js` to find the PR that first wired it and mirror its file set (including how the `*-planned-gate.mjs` became a `*-dogfood-gate.mjs`).
**Scope:** `west-yorkshire` only. Branch from `west-yorkshire-adapter` (current branch, carries the hygiene commit). PR base master.

## Facts

- 10 National Rail stations, no metro layer. Hub lock Leeds Station (LDS); secondary Bradford Forster Square (BDQ); Bradford Interchange (BDI) is separate infrastructure — `doNotGroup` BDQ/BDI per the pack. Boundary through-running points: Denby Dale (DBD, South Yorkshire side), Walsden (WDN, Greater Manchester side).
- All ten CRS codes were verified live against Darwin on 5 Sep 2026 (four were wrong in the original pack and are now corrected everywhere). Coordinates filled from NaPTAN.
- `DARWIN_LDB_TOKEN` is live (in `.env.local`, read via `loadEnvLocal()`; the QA gates deliberately don't load it and must stay token-tolerant).
- Direction model: destination (as Darwin prints it) + operator, exactly like West of England / East Midlands. No static line map.
- Board eligibility: all four operators (Northern, LNER, CrossCountry, TransPennine Express) `in`, no `undecided` rows.

## Deliverables

1. `lib/cities/west-yorkshire/dogfood-next-train.js` — `getWestYorkshireDogfoodDirections(station)` and `getWestYorkshireDogfoodNextTrain({ station, destination, leaveBeforeMinutes, ... })` over `fetchStationBoard` / `fetchRegionalDepartureBoard` from `lib/providers/uk-darwin.js`, wired through the shared hub helper (`lib/cities/uk/direction-hubs.js`: `applyDirectionHubs`, `planUkNextTrainFetch`) with the national index fallback for exact chips, carrying `printedDestination` on remapped trips. Export a `planWestYorkshireNextTrainFetch` wrapper for the gate. Copy West of England's structure; do not invent a new shape.
2. `lib/cities/west-yorkshire/direction-hubs.json` — **only if live probing shows a real case.** Probe every station's live chip set (`scripts/probe-uk-board.mjs "<name>" --region=west-yorkshire`, and `--filter-crs=LDS` / `BDQ` where relevant). Candidates to test, not assumptions: an operator split on "Leeds" (Northern vs TPE vs others) at Calder Valley / Airedale stations would take the Liverpool shape (label "Leeds", `filterCrs: LDS`, absorbs "Leeds"); a through-service past Leeds to a terminus riders don't recognise would take the Kidderminster shape. If nothing qualifies, ship no hub file and say so in the PR with the chip tables as evidence. Every `absorbs` entry needs the filtered-board evidence in the PR for Tim's approval.
3. `lib/cities/live-city-api.js` — add `west-yorkshire` to `MULTI_CITY_IDS` and the directions / next-train dispatch, mirroring West of England.
4. `lib/providers/registry.js` — `adapterReady: true`, `integration`/`notes` updated to say the adapter is wired and verified live; **`status` stays `"planned"`**. Do not flip. Mark opens the flip PR later.
5. `qa/west-yorkshire-dogfood-gate.mjs` (replacing/renaming the planned gate the way West of England did; register in `qa/run-all.mjs` smoke tier where West of England's is): token-tolerant; asserts registry shape, D1 pack present, Board eligibility all-in, 10 rail stations, doNotGroup BDQ/BDI, directions derive live from Darwin with no static line map, planner routing table (hub if any / exact via national index / undirected / metro-never), end-to-end next-train with token returns `printedDestination`, **and the token-gated full-catalog CRS→Darwin-stationName sweep copied from `qa/uk-west-midlands-dogfood-gate.mjs`** (10 cheap calls) so the wrong-code defect cannot regress.
6. `docs/west-yorkshire-d1/jim-handoff.md` — append a dated "Adapter wired" section: what was built, live evidence, hub decision.
7. `public/city-directions/west-yorkshire.json` if `scripts/write-city-directions.mjs` / `qa/bundled-city-directions.mjs` require one for every `MULTI_CITY_IDS` entry (check how West of England handled it; the writer currently aborts at `uk-west-midlands` on missing TfWM creds — if that blocks generating this file, generate it with a one-off that loads `.env.local` and only runs this region, and note it).

## Guardrails

- No edit to `lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`, `lib/cities/uk/*`, or any other region. If the shared helper genuinely needs a change, stop and report.
- Never fabricate departures; Darwin errors surface as they do elsewhere.
- Board-eligibility rule: hub anchoring hides no train. State it in the PR.
- Stage by explicit path. No `status: "live"`.
- Lane lock: `node qa/lane-lock.mjs check united-kingdom` (top-level saw `free`), then `acquire united-kingdom west-yorkshire adapter` before touching shared files (`live-city-api.js`, `registry.js`, `run-all.mjs`); commit `docs/expansion-tracker/lane-locks.json`. Release is post-merge, not yours — put the release command in the PR body.
- `node qa/west-yorkshire-dogfood-gate.mjs` token-free and with the token (via a `loadEnvLocal()` wrapper), then `node qa/run-all.mjs --smoke` once before the PR; no edits while it runs; never the full suite.

## PR body must include

Live chip table for every station (before hubs / after, if any); a Leeds board sample; the hub decision with filtered-board evidence or the "no hub warranted" statement; the eligibility statement; the lane-lock release command; smoke result.
