# Jim brief — South Wales flip follow-through (5 Sep 2026)

Region: `south-wales` (lib/providers/south-wales.js, docs/south-wales-d1/). Status stays `planned`
in this PR — Mark flips it.

Do the flip follow-through exactly as your definition's "Do now, ahead of the flip" list:

1. `lib/cities/south-wales/dogfood-next-train.js` (+ `stations.json` / `direction-hubs.json` if the
   pattern needs them — copy the shape of `lib/cities/greater-anglia/`, the most recent UK flip).
2. Dispatch switch-cases in `lib/cities/live-city-api.js` (`directionsFor` / `getMultiCityNextTrain`).
3. `qa/south-wales-dogfood-gate.mjs` replacing `qa/south-wales-planned-gate.mjs`, and the
   `run-all.mjs` registration swapped accordingly (gate should live-probe Darwin with the local
   `DARWIN_LDB_TOKEN`, as greater-anglia's does).
4. Do NOT touch `MULTI_CITY_IDS`, `brisbane-dogfood.js`, or `journey-model.js` lists — leave a note
   for Mark in `docs/south-wales-d1/jim-handoff.md` naming the three one-line additions.

Lane lock: run `node qa/lane-lock.mjs check "United Kingdom"` first, then
`acquire "United Kingdom" south-wales jim <branch>` before touching shared files.

Branch from master: `south-wales-flip-followthrough`. Run `node qa/south-wales-dogfood-gate.mjs`
and `node qa/run-all.mjs --smoke`, then open a normal (non-flip) PR with results in the description.
Do not merge it.
