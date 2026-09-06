# Mark QA — South Yorkshire flip request (6 Sep 2026)

**Result: FAIL — flip not opened.** One hard-fail item below; per CLAUDE.md's flip-lazy-consensus
rule and this run's own instructions, a single failed/ambiguous checklist item means no `flip` PR
is opened. No branch, no registry edit, no list-membership edit was made.

Inputs read: `lib/providers/south-yorkshire.js`, `lib/cities/south-yorkshire/dogfood-next-train.js`,
`lib/cities/south-yorkshire/marketing-directions.js`, `qa/south-yorkshire-dogfood-gate.mjs`,
`docs/south-yorkshire-d1/{oracle-clash-report,hazard-pack,direction-model-memo,jim-handoff,
published-network.json}`, `docs/united-kingdom-ledger.md`, `docs/board-eligibility-rule.md`,
`lib/providers/registry.js`, `lib/cities/live-city-api.js`. Lane lock: top-level session reported
`United Kingdom` free before this run.

## Checklist

| # | Check | Result |
|---|---|---|
| 1 | Contract test suite: `node qa/south-yorkshire-dogfood-gate.mjs` (run with real `DARWIN_LDB_TOKEN` from `.env.local`) | **PASS** — National Rail directions/next-train derive live from Darwin, hub/Meadowhall doNotGroup resolution correct, Supertram path throws `SupertramFeedUnconfirmedError` as designed, dispatch parity between provider and `live-city-api` confirmed |
| 2 | `node qa/live-city-lists-sync.mjs` (baseline, pre-flip) | **PASS** — 33 live cities consistent across all list copies; south-yorkshire correctly absent (still planned) |
| 3 | DST edge cases | **PASS** — Europe/London, DST documented (hazard-pack.md H7); shared `uk-darwin.js`/`uk-normalize-etd.mjs` path, same as every live UK Darwin region — no region-specific DST logic to re-check |
| 4 | Hub-lock / doNotGroup rules | **PASS** — Sheffield Station (SHF) doNotGroup tram-viaduct vs National Rail platforms, two catalog entries same name/different mode, verified by the gate (`hubRail`/`hubMetro` resolution, `isForbiddenCollapseName`). Meadowhall Interchange correctly modelled as a through-running/infrastructure-switch point, not a second hub lock — also gate-verified |
| 5 | v1 mode cut (per oracle report) | **PASS** — train + metro(tram) only, no buses; Supertram genuinely unbuildable (no confirmed SYFTL feed) surfaces a typed error rather than a fabricated schedule, matching the East Midlands NET / Greater Manchester Metrolink precedent |
| 6 | Response-shape conformance | **PASS** — `getSouthYorkshireDogfoodNextTrain`/`Directions` go through the shared `buildNextTrainResponse`/`pickUpcomingProviderTrips` (`train-times-core.js`), same as every other UK region; gate asserts `printedDestination`, `config.destination`, array-of-strings directions |
| 7 | Ledger-consistency (`docs/united-kingdom-ledger.md` exists for GB) | **PASS** — every South Yorkshire catalog station is either home-owned (Sheffield Station, Meadowhall, Rotherham Central) or a correctly-excluded boundary station: Denby Dale is explicitly dropped from this catalog per the ledger's 5 Sep 2026 Tim ruling (West Yorkshire's), Chesterfield is explicitly excluded (East Midlands'), and Darton/South Elmsall/Moorthorpe are uncontested. No ledger verdict is contradicted — Northern is `in` per the ledger and is not filtered in this adapter |
| 8a | Board-eligibility check 1 — oracle report has a Board eligibility section with no `undecided` rows | **HARD FAIL** — `docs/south-yorkshire-d1/oracle-clash-report.md` has **no "Board eligibility" section at all** (confirmed: `## Board eligibility` exists in 92 other D1 packs' oracle reports, including every other already-flipped UK region's; south-yorkshire-d1's is not among them, and no synonym section — "verdict", "walk-up", "eligib", "undecided" — appears anywhere in the pack). This is a Nico/D1 gap per `docs/board-eligibility-rule.md` §5, not something Mark can supply. A de facto `out-product` verdict for Supertram exists elsewhere (tracker `cities.csv`, `docs/uk-build-out-recommendation.md`, the ledger's "Parked second modes" table), and Northern's `in` verdict for National Rail is recorded in the country ledger — but the rule requires the section to live in the region's own oracle report, and it is simply absent |
| 8b | Board-eligibility check 2 — adapter filtering matches verdicts (sampled board) | **BLOCKED** on 8a — no formal per-service verdict table to check the adapter against. Informally: National Rail applies no `excludeOperators`/`includeOperators` filter for this region (all TOCs calling at SHF/MHS would show), consistent with the ledger's `Northern: in` row and no `out-*` National Rail row for this region; Supertram correctly shows nothing (typed error) consistent with its de facto `out-product` status. This is consistent, but is not a substitute for the missing formal section |

## Why this blocks the flip

Per this run's instructions: "If even one check failed or was ambiguous, skip this [flip] section
entirely and file the pass/fail note instead." Item 8a is a clean, mechanical fail — not
ambiguous — so no `south-yorkshire-flip` branch, no registry `status` edit, and no PR were created.

## What would clear it

Someone (Nico, or a targeted addendum) needs to add a `## Board eligibility` section to
`docs/south-yorkshire-d1/oracle-clash-report.md` covering every service calling at the six
National Rail catalog stations (SHF, MHS, Rotherham Central, Darton, South Elmsall, Moorthorpe) —
in practice this is very likely to just be "Northern (Trains) / EMR / TPE / CrossCountry: `in`,
no compulsory reservation" mirroring the ledger's existing National-service-verdicts table, plus
the Supertram sentence ("no confirmed feed at all — `out-product`, Tim/tracker sign-off already on
record") — but it has to actually live in the pack per the rule, not just be inferable from the
country ledger. Once that section exists with zero `undecided` rows, re-run this checklist; items
1–7 are already green and nothing else is expected to move.

## Not verified in this run

`node qa/run-all.mjs --smoke` did not produce output before this run's time budget — port 3000 was
already bound by another process (PID 44504, not started by this run) when the suite's
browser-dependent scripts tried to use it, matching the known "if port 3000 is busy, rely on CI"
case. The single-city gate (`south-yorkshire-dogfood-gate.mjs`) and `live-city-lists-sync.mjs` were
run directly instead and both passed; CI's own `web-qa` run should be treated as the smoke-suite
verification once/if a PR is opened for the missing section fix.
