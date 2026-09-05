# Jim brief — Southwest flip follow-through (5 Sep 2026)

Region: `southwest` (lib/providers/southwest.js, docs/southwest-d1/). Status stays `planned` in this
PR — Mark flips it. CRS codes were live-verified in PR #252 (merged) — start from current master.

Do the flip follow-through exactly as your definition's "Do now, ahead of the flip" list, copying the
shape of the most recent UK flip (`lib/cities/south-wales/`, PR #258, or `lib/cities/greater-anglia/`):

1. `lib/cities/southwest/dogfood-next-train.js` (+ `stations.json` / `direction-hubs.json` as the
   pattern needs).
2. Dispatch switch-cases in `lib/cities/live-city-api.js` (`directionsFor` / `getMultiCityNextTrain`).
3. `qa/southwest-dogfood-gate.mjs` replacing `qa/southwest-planned-gate.mjs`, and the `run-all.mjs`
   registration swapped accordingly (gate live-probes Darwin with the local `DARWIN_LDB_TOKEN`; it
   should also assert the Night Riviera Sleeper is excluded per the board-eligibility verdict).
4. Do NOT touch `MULTI_CITY_IDS`, `brisbane-dogfood.js`, or `journey-model.js` lists — leave a note
   for Mark in `docs/southwest-d1/jim-handoff.md` naming the three one-line additions.

Lane lock: run `node qa/lane-lock.mjs check "United Kingdom"` first (it must report free), then
`acquire "United Kingdom" southwest jim <branch>` before touching shared files.

Branch from master: `southwest-flip-followthrough`. Run `node qa/southwest-dogfood-gate.mjs` and
`node qa/run-all.mjs --smoke`, then open a normal (non-flip) PR with results in the description. Do
not merge it. If port 3000 is held by an unrelated process, say so in the PR and rely on CI's web-qa
rather than killing it.
