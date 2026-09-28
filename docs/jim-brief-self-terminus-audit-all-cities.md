# Jim brief — cross-city audit: no station may offer a direction chip naming itself (self-terminus), all live cities

**Lane:** bug-fix / product mode (qa/ first; per-city fixes need that country's lane lock). **Date:** 28 Sep 2026. **tim-review:** no.

## Why
Dublin (#484), Prague (#493) and Copenhagen (docs/jim-brief-copenhagen-self-terminus.md, in flight) each shipped or nearly shipped a terminus offering a direction to itself. Older live cities were built before the guard existed. The controller's quick scan of public/city-directions/*.json is in this brief's dispatch prompt — use it as the starting list, but do not trust it alone: chips derived live (source "*-live-board") are not in those files.

## Fix
1. Offline gate `qa/no-self-terminus-gate.mjs`: for every live city, for every catalog station, assert the station's direction list (from public/city-directions/<city>.json where present, else the city's marketing-directions `marketingLabelsForStation`) contains no chip whose terminus folds to the station's own name or any of its aliases. Register in qa/run-all.mjs smoke. Print a per-city table.
2. For every city the gate flags: fix at the source (the city's terminus guard in lib/providers/<city>.js or lib/cities/<city>/marketing-directions.js, Dublin #484 pattern: guard on resolved terminus/raw headsign, never the mapped label), acquire that country's lane lock first (`node qa/lane-lock.mjs check <country>`; skip and report any country locked — Copenhagen/denmark is locked right now by the in-flight fix; do not touch it), and regenerate that city's public/city-directions JSON. Keep per-city diffs minimal; no label changes beyond removing the self chip.
3. Live spot-check one terminus per fixed city on a dev server (explicit PORT + QA_BASE), before/after directions list.

## Acceptance
- `node qa/no-self-terminus-gate.mjs` green for all live cities (Copenhagen excluded if its lock is held — say so); `node qa/run-all.mjs --smoke` PLAIN green; per-city before/after table in the PR.
- PR title: "qa: no self-terminus chips in any live city (audit gate + fixes)". Link #484, #493, the Copenhagen brief.
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline; pace live feeds politely.
