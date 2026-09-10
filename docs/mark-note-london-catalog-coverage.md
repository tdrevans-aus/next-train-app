# Mark QA note -- PR #353 (London: fill catalog coverage gaps from 16-sample full-day probe)

Reviewed against `docs/jim-brief-london-catalog-coverage.md`, `docs/mark-brief-london-catalog-coverage.md`, and `docs/london-catalog-gaps.json`. Verified programmatically against the full before/after catalog diff (not just the 9-station PR table).

## Acceptance criteria

1. **Class A additions are canonical + confident-evidence-backed -- PASS, with one flagged defect.**
   Diffed `public/city-directions/uk-london-tfl.json` master vs branch directly (not just the PR's table): 80 stations changed, 357 net direction additions, 0 removals. Every addition at all 9 worst-table stations is exactly the full canonical vocabulary already used elsewhere for that line, confirmed by rebuilding each line's canonical vocab from master's own catalog and diffing. The "N-1 of N, self-excluded" pattern holds at additional spot-checked stations beyond the table (Aldgate self-excludes `Metropolitan Aldgate`; Barking self-excludes `Hammersmith and City Barking`).
   **Defect found:** self-exclusion fails at **"Hammersmith (H&C Line)"** -- the PR adds `Hammersmith and City Hammersmith` there, a direction pointing back at the station itself. Likely because the derivation's self-match uses the plain station name and doesn't strip the `(H&C Line)` disambiguator suffix the way it evidently does for the sibling `(Dist&Pic Line)`/`(Circle Line)`/`(Bakerloo)` stations, which are all fine (checked). Minor -- one nonsensical picker entry at one station -- but it is exactly the defect class this PR exists to eliminate elsewhere, so flagging rather than waiving it.
   `qa/uk-london-tfl-direction-match.mjs`'s new confident-evidence check passes for all 9 table stations.

2. **Live-running verification -- FAIL / unresolved, not an afterthought.**
   Ran a fresh live spot-check across all 9 changed stations (ad hoc script against `lib/providers/uk-tfl.js` + `pickUpcomingTrips`, live `TFL_APP_KEY` fetch, not the fixture; deleted after use). Result: 0 live trips matched for every added direction, at every station -- but also 0 for pre-existing, already-offered directions at the same stations (e.g. `District Wimbledon` at Embankment/Paddington/Gloucester Road, unrelated to this PR). Confirmed via `TfL /Line/piccadilly/Status`: `statusSeverityDescription: "Service Closed"`, closure window `2026-09-10T00:17:43Z .. 2026-09-10T04:03:08Z` -- the Underground was inside its scheduled overnight closure at check time (02:02 London local), same situation as at the PR's original dispatch time (01:20 London). This is a **timing coincidence, not a defect**: the zero counts are a network-closed artifact, not evidence against the catalog additions.
   Net effect: criterion 2 ("returns trips at a time that line is running") still rests **only** on the 8 Sep 16-sample probe evidence. Neither the PR's dispatch-time attempt nor my QA-time attempt produced a same-day fresh live confirmation. **Recommend a live spot-check rerun between roughly 05:30 and 23:30 London time** before this criterion is treated as closed with same-day proof -- this is the one open item blocking a clean pass.

3. **No removals -- PASS.** Full before/after set-diff over all 434 stations: 0 directions removed anywhere, 0 stations dropped, 0 stations added. Confirms the PR's own claim and the brief's "don't act on the removal question."

4. **No long tail -- PASS.** Max after-count across the 80 touched stations is 16 (Liverpool Street, Whitechapel), consistent with genuine multi-line interchanges, not short-working spam -- Class B folding keeps each addition to one canonical entry per line. 16 is a lot to scroll but every entry is a real distinct line/branch, not noise.

5. **`lib/train-times-core.js` confined to `LINE_DESTINATION_GROUPS` -- PASS.** Diff is a single hunk inside that object; `pickUpcomingTrips`, the adapter, and `/api/next-train` are untouched. Confirmed no other city's existing `LINE_DESTINATION_GROUPS` entries were altered (Mandurah/Fremantle/Bakerloo/etc. byte-identical); the 3 pre-existing London entries that were extended (Central Epping, Central West Ruislip, District Upminster) were appended-to, not replaced. Counted the 24 claimed folds directly from the diff (3+3+2+3+2+1+1+2+2+1+1+1+1+1 = 24) -- matches exactly.

## Class B folds

24 folds verified exact-count-match against the diff; `normalizeDestination` unit checks all pass (`node qa/uk-london-tfl-direction-match.mjs`). The "genuinely ambiguous, left unmapped" list (Central Leytonstone/Woodford/Marble Arch, Piccadilly bare Heathrow/Northfields, DLR junction stops, Mildmay/Windrush shared-trunk stations, District/H&C central turnbacks, Metropolitan Harrow-on-the-Hill) reads as defensible network-topology reasoning, not skipped work -- no way to fully verify without independently rederiving TfL topology myself, but internally consistent and each has a stated, checkable reason. No cross-city string collisions: grepped every other `public/city-directions/*.json` for the new/extended fold keys -- none found.

## QA gates run

- `node qa/uk-london-tfl-direction-match.mjs` -- PASS
- `node qa/uk-region-catalog-conformance.mjs` -- PASS
- `node qa/london-catalog-no-duplicate-stops.mjs` -- PASS
- `node qa/london-picker-no-duplicate-stops.mjs` -- PASS
- `node qa/run-all.mjs --smoke` (explicit 600000ms timeout, ran to completion) -- all 80 scripts PASS, exit code 0

## PR description accuracy -- one claim refuted

The PR's "pre-existing, unrelated failures" section is wrong as currently stated: `qa/bundle-freshness.mjs` passes cleanly on this branch right now (`OK public/train-times-bundle.js matches a fresh rebuild of web-sources/train-times-client.mjs`), and it also passes on master. Branch history explains why: commit 1 changed `LINE_DESTINATION_GROUPS` without rebuilding the bundle (a self-introduced, not pre-existing, staleness), commit 2 ("Rebuild train-times bundle after LINE_DESTINATION_GROUPS change") fixed it -- but the PR description text wasn't updated afterward and still calls the failure pre-existing/unrelated. Currently harmless (gate is green, CI's web-qa is green), but the description misattributes a self-caused issue as pre-existing; worth a one-line correction. `uppsala-dogfood-gate.mjs` was fully green in my `--smoke` run (no flake observed this run) -- consistent with, not contradicting, the PR's own "flake, passes on retry" characterization.

## Verdict

**FAIL -- not mergeable as-is.** Two open items:
1. Self-referential direction added at "Hammersmith (H&C Line)" (`Hammersmith and City Hammersmith`) -- a small but real instance of the exact bug class this PR exists to fix.
2. Criterion 2 (live-running verification) is still unproven same-day -- both the PR's dispatch-time attempt and my QA-time attempt hit the Tube's overnight closure window. Needs a live spot-check rerun during London service hours (~05:30-23:30 London) before this can be called fully green.

Neither is board-eligibility/hub-lock hard-fail severity (no walk-up service is silently missing from a board here -- this PR is purely additive), but both are concrete, checkable gaps. Recommend sending back to Jim with: (a) fix the self-exclusion match to strip disambiguator suffixes like `(H&C Line)`/`(Dist&Pic Line)` before comparing a candidate direction's terminus against the station's own name, and (b) get a same-day live confirmation logged for the 9 changed stations during London service hours, then re-request QA.

Everything else -- Class A derivation logic, Class B folds, no-removal guarantee, no long tail, confinement of the core.js change, all 4 named gates, and the full `--smoke` suite -- is clean.
