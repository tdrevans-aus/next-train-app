# Jim brief — CITY_BOUNDS order and boxes after the UK geocode pass (PR #328 CI failure)

**Date:** 7 Sep 2026 · **Lane:** bug-fix lane (CLAUDE.md), bug-fix / product mode · **tim-review:** no.
**Dispatch:** `subagent_type: jim`, `isolation: "worktree"`. Work **on the existing PR branch** `uk-catalog-geocode` (PR #328): `git fetch origin && git checkout -b uk-catalog-geocode origin/uk-catalog-geocode` (use a different local name if that one is taken, and push back to `uk-catalog-geocode`). Copy this brief into `docs/` on that branch and commit it with your change. No lane lock (no `lib/providers/` changes).

## Symptom
PR #328 (Luke's geocode pass) passes locally but `web-qa` fails in CI on `qa/uk-city-bounds-overlap-gate.mjs` (added by PR #326, merged after Luke branched — a semantic conflict, not a flake). The newly geocoded stations expose real GPS-hint faults in `public/city-session.js` `CITY_BOUNDS` / `hintCityFromCoords` (first matching box wins, in object order):

1. **Glasgow** — Glasgow Central (55.8598, -4.2576), Queen Street, Partick, Kelvinhall resolve to `rest-of-scotland` because its box (55.4–58.6, -5.5 to -2.0) contains Glasgow and is declared before `glasgow` (55.80–55.92, -4.40 to -4.15). Same risk for `edinburgh` (55.88–55.98, -3.38 to -3.05) which is also inside the rest-of-scotland box.
2. **Taunton** (51.0233, -3.1027) is catalogued in `southwest` but falls in `west-of-england`'s box (50.90–51.95, -3.15 to -2.10), which is declared first.
3. **London National Rail termini** (Waterloo, Victoria, London Bridge, Liverpool Street, King's Cross, St Pancras, Paddington) in `london-se-national-rail` resolve to `uk-london-tfl`. Both regions genuinely cover central London; a GPS rider at King's Cross could want either. This is a product ambiguity, not a box error.

## Fix
- **Order rule, made explicit and enforced:** declare the more specific (smaller) box before any larger box that contains it. Move `glasgow` and `edinburgh` above `rest-of-scotland`; keep `south-wales` above `west-of-england` (already done in #326). Add a comment at the top of `CITY_BOUNDS` stating the rule. Extend `qa/uk-city-bounds-overlap-gate.mjs` with a second check: for every pair of UK boxes where one fully contains the other, the contained one must be declared first — fail otherwise, so the next region can't regress this.
- **Taunton / West of England:** West of England's catalogued stations are all north of Taunton (check `lib/cities/west-of-england/stations.json` coordinates — Bristol, Bath, Weston-super-Mare etc.). Raise `west-of-england.minLat` to just south of its own southernmost station so Taunton (51.02) falls out, and confirm every West of England station still resolves to itself.
- **London termini:** do not change boxes. Add allow-list entries in the gate for each `london-se-national-rail` station inside the TfL box, with the reason "central London: TfL and National Rail regions legitimately overlap; GPS hint prefers TfL, the rider picks National Rail from the region screen". Then record the product question for Tim in the PR body: should a GPS hint inside the TfL box prefer the National Rail region when the nearest catalogued station is a National Rail terminus? Don't decide it here.
- Re-run the geocode gate and everything below; nothing in Luke's coordinates should change.

## Acceptance
1. `node qa/uk-city-bounds-overlap-gate.mjs` green on the branch with the new containment-order check, and the allow-list carries a reason per London station.
2. `hintCityFromCoords(55.8598, -4.2576)` → `glasgow`; `(55.9520, -3.1883)` Edinburgh Waverley → `edinburgh`; `(57.1437, -2.0983)` Aberdeen → `rest-of-scotland`; `(51.0233, -3.1027)` Taunton → `southwest`; `(51.4545, -2.5879)` Bristol → `west-of-england`. Add these to the gate's spot-checks.
3. `node qa/uk-catalog-coords-gate.mjs`, `node qa/region-selection.mjs`, `node qa/live-city-lists-sync.mjs`, and `node qa/run-all.mjs --smoke` green.
4. Push to `uk-catalog-geocode` so PR #328's CI re-runs; add a PR comment summarising the three faults and the London question. Do not open a second PR.
