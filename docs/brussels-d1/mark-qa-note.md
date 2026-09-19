# Mark QA note — Brussels flip (20 Sep 2026)

## Summary of prior lane work (PR #419, `gh pr view 419 --comments`)

Two Mark QA passes ran on PR #419 before this flip:

- **First pass (comment 5744537624): RED.** Found a live-capture bug: `classifySncbVehicleType`'s
  `IN_TYPES` matched a bare `"S"` string, but live iRail always sends S-trains as `S` + a sub-line
  number (S1/S2/S3/S8/S10) — every real S-train at all three shared stations was silently dropped
  (a walk-up-service board-eligibility hard fail, same severity as a hub-lock violation). Also
  flagged EC/EuroCity Direct as unruled by the oracle report (amber).
- **Second pass (comment 5744802805), post-fix commit f845883: GREEN — "FLIP-READY once merged."**
  S-train pattern match fixed, EC/ECD researched and ruled `in`
  (`docs/brussels-d1/board-eligibility-addendum.md`), BUS reclassified `out-mode`, silent-drop
  detection added (`debug.irailUnmappedTypes`), fixture replaced with a real 20 Sep 2026 iRail
  capture. Full flip checklist (contract shape, DST, hub-lock/doNotGroup, bilingual FR/NL, v1 mode
  cut, live-only behaviour, both board-eligibility-rule items) all PASS, live-reverified at all
  four sample stations. One cosmetic amber: `jim-handoff.md`'s recipe section is headed "Note for
  Mark — bundle these three one-line additions into the actual flip commit" rather than "Flip
  commit — exact edits" (content complete and correct either way).

PR #419 merged as commit a133725 on `master`.

## This pass — flip commit + re-verification on master

**1. Light re-check on master (post-squash-merge).**

- `node qa/brussels-dogfood-gate.mjs` — PASS (pre-flip assertions, before making any edits).
- Live sample board fetch (`fetchStationBoard`, real `STIB_API_KEY` from `.env.local`, copied into
  the worktree and deleted before finishing, never printed):
  - **Gare Centrale / Centraal Station**: 44 trips, 8 metro (`STIB/MIVB`) + 36 rail (`SNCB/NMBS`).
    Rail breakdown: `IC:25 S3:3 S10:2 S8:2 S1:2 S2:2 EC:1` — real S-numbers, EC present, `partial:
    false`, no `debug` field (no unmapped types).
  - **Arts-Loi / Kunst-Wet** (hub, metro-only): 16 metro trips, 0 rail rows, `partial: false` —
    correctly no SNCB leak into a non-shared station.
  - No forbidden international types (Eurostar/Thalys/TGV/OUIGO/Nightjet/European Sleeper) seen at
    either station. Matches PR #419's second-pass live-verification exactly.

**2. Flip commit, per `docs/brussels-d1/jim-handoff.md`'s "Flip commit — exact edits" recipe,
   reconciled against what `qa/live-city-lists-sync.mjs` and `qa/country-regions-sync-gate.mjs`
   actually enforce (gates win over prose where they'd differ — no discrepancy found this pass):**

- `lib/providers/registry.js` — brussels `status: "planned"` → `"live"`.
- `lib/cities/live-city-api.js` — added `"brussels"` to `MULTI_CITY_IDS` and the `MultiCityId`
  typedef.
- `public/app.js` — added `"brussels"` to `NEARBY_MULTI_CITY_IDS` and `LIVE_CITY_IDS` (this file
  is one of the 8 copies `live-city-lists-sync.mjs` checks; the jim-handoff summary line in the
  task brief undercounted it as one of only "three" additions, but the full numbered recipe inside
  the same file already listed it correctly as item 3 — no real disagreement, just a summary/detail
  mismatch inside jim-handoff.md itself).
- `public/city-session.js` — added `"brussels"` to its own `MULTI_CITY_IDS`, and flipped the
  Belgium picker region's `comingSoon: true` off entirely (dropped the flag, matching how other
  live single-region countries like Finland/Norway are written).
- `public/brisbane-dogfood.js` — added `brussels: true` to its `MULTI_CITY_IDS` array and
  `available` map.
- `public/journey-model.js` — added `"brussels"` to `PERSISTED_CITY_IDS`, and `"be"` to
  `PERSISTED_COUNTRY_IDS` (Belgium's first live region).
- `public/city-session.js`'s `CITY_BOUNDS` already carried the `brussels` entry from the prior
  pass — no edit needed, confirmed still present.
- `lib/cities/country-regions.js` already carried `brussels: "be"` from the prior pass (added
  ahead of flip, since the picker already listed Belgium as Coming Soon) — `country-regions-sync-
  gate.mjs` requires this entry regardless of live/comingSoon state, so no edit was needed here
  either; already 39/39 in sync before and after the flip.
- `node scripts/write-city-directions.mjs --only=brussels` — generated `public/city-directions/
  brussels.json` (60/60 stations with chips), required by `qa/bundled-city-directions.mjs`.

**Gap found and closed (beyond the recipe): `qa/brussels-dogfood-gate.mjs`'s own status
assertions.** The gate (already committed ahead of the flip, per Jim's flip-follow-through pattern)
still asserted the *pre-flip* invariants — `assertCityLive("brussels").ok === false`,
`entry.status === "planned"`, `isMultiCity("brussels") === false` — which is the correct
established pattern (see `qa/east-midlands-dogfood-gate.mjs`'s identical file-header note: "this
gate's registry-status/adapterReady/isMultiCity assertions are therefore written for the POST-FLIP
state and will only pass once Mark's flip commit lands"), but Brussels' gate had not yet been
updated to the post-flip form the way East Midlands'/West of England's were. Updated the three
assertion blocks plus the header comment and closing `console.log` to match the live/`MULTI_CITY_IDS`-
member state — mechanical, matches the exact precedent from two already-flipped UK regions, not a
new judgment call.

**Gap found and closed (beyond the recipe): missing `lib/cities/brussels/coverage.json`.**
`qa/coverage-notes-gate.mjs` requires every `status: "live"` city to ship rider-facing coverage
prose; Brussels had none (reasonably — it was never live before). Added one modelled on the
existing South Yorkshire/East Midlands shape: STIB metro (all 60 stations) and SNCB/NMBS domestic
rail at the three shared stations listed under `covered` (with the iRail-down → metro-only-partial
degrade noted in the detail text), trams/premetro/buses/international-reservation-only trains
listed under `notCovered`. Passes the gate's shape checks (no TODO, no D1/oracle/CRS leakage, dated
2026-09-20).

## Gate results, this pass (post-edits)

| Check | Result |
| --- | --- |
| `node qa/live-city-lists-sync.mjs` | PASS — 35 live cities, all 8 list copies in sync |
| `node qa/country-regions-sync-gate.mjs` | PASS — 39/39 |
| `node qa/brussels-dogfood-gate.mjs` | PASS — live/200 post-flip, in `MULTI_CITY_IDS`, dispatch wired, all catalog/hub-lock/direction/SNCB assertions green |
| `node qa/coverage-notes-gate.mjs` | PASS — 35/35 live cities |
| `node qa/run-all.mjs --smoke` (foreground, 600000ms timeout) | First run: 145 PASS / 1 FAIL (`region-selection.mjs`, unrelated — see below). Re-run after cleanup: **146 PASS / 0 FAIL, 571s.** |

**`region-selection.mjs` flake, investigated and ruled unrelated to Brussels.** First smoke run
failed this one Playwright script silently after its last test block (no assertion message, just
exit 1). Standalone re-runs (per CLAUDE.md's "re-run the single script once before judging") each
hung for 180s/600s+ with no server attached (running the script directly needs an already-listening
dev server on :3000, which `run-all.mjs` provides but a bare `node qa/region-selection.mjs` does
not) — root cause was two of my own earlier standalone invocations left orphaned Node/Chromium
processes contending for resources (`ps -W` showed real Windows PIDs 6280/44148, both spawned
during this session, distinct from unrelated pre-existing desktop Chrome/Codex processes). Killed
both process trees (`taskkill /PID .../T /F`), confirmed no Brussels/Belgium code path is anywhere
near this test file (it exercises Sweden/Melbourne/Scotland/Wales/Cardiff picker flows only, no
Belgium test case exists in it), and re-ran the full smoke suite clean: 146/146 PASS. Treating the
first failure as environmental flakiness, not a regression from this flip.

## Live sample board — board-eligibility rule, item 2 (re-confirmed post-flip)

Same live fetch as PR #419's second pass, re-run against master post-flip-commit: `in` services
(SNCB IC/S-trains/L/P/EC/ECD/ICE, STIB metro 1/2/5/6) appear at the sampled boards; `out-*` services
(Eurostar, Thalys, TGV, OUIGO, Nightjet, European Sleeper, rail-replacement BUS) do not appear
anywhere sampled. No `debug.irailUnmappedTypes` on either sampled board.

## Nothing left running

Two stray Node/Chromium process trees from my own standalone debugging were found and killed
(`taskkill`). `.env.local` (STIB_API_KEY) copy deleted before finishing. `smoke-output.log` and the
placeholder probe files were removed before commit. `git status` clean apart from the intended flip
diff. No listening dev-server socket left on any port; no background/poll loops running.

## Verdict

**GREEN. All gates pass, smoke suite 146/146.** Flip PR follows, labelled `flip`, per the lazy-
consensus process — not merged by this pass.

