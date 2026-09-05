# Jim brief — Rest of Scotland flip follow-through (5 Sep 2026)

Region: `rest-of-scotland` (lib/providers/rest-of-scotland.js, docs/rest-of-scotland-d1/). Status
stays `planned` in this PR — Mark flips it. Four co-equal hub locks (Perth, Inverness, Aberdeen,
Dundee) — the dogfood module and gate must not assume a single hub.

Do the flip follow-through exactly as your definition's "Do now, ahead of the flip" list, copying the
shape of the most recent UK flip (`lib/cities/south-wales/`, PR #258, or `lib/cities/greater-anglia/`):

1. `lib/cities/rest-of-scotland/dogfood-next-train.js` (+ `stations.json` / `direction-hubs.json` as
   the pattern needs).
2. Dispatch switch-cases in `lib/cities/live-city-api.js` (`directionsFor` / `getMultiCityNextTrain`).
3. `qa/rest-of-scotland-dogfood-gate.mjs` replacing `qa/rest-of-scotland-planned-gate.mjs`, and the
   `run-all.mjs` registration swapped accordingly (gate live-probes Darwin with the local
   `DARWIN_LDB_TOKEN`, at least one station per hub).
4. Do NOT touch `MULTI_CITY_IDS`, `brisbane-dogfood.js`, or `journey-model.js` lists — leave a note
   for Mark in `docs/rest-of-scotland-d1/jim-handoff.md` naming the three one-line additions.

Lane lock: run `node qa/lane-lock.mjs check "United Kingdom"` first (it must report free), then
`acquire "United Kingdom" rest-of-scotland jim <branch>` before touching shared files.

Branch from master: `rest-of-scotland-flip-followthrough`. Run
`node qa/rest-of-scotland-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke`, then open a normal
(non-flip) PR with results in the description. Do not merge it. If port 3000 is held by an unrelated
process, say so in the PR and rely on CI's web-qa rather than killing it.
