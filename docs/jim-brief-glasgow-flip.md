# Jim brief — Glasgow flip follow-through (5 Sep 2026)

Region: `glasgow` (lib/providers/glasgow.js, docs/glasgow-d1/). Status stays `planned` in this PR —
Mark flips it. Two independent networks under one city id: Glasgow Subway (hub Buchanan Street) plus
National Rail at two independent termini (Glasgow Central GLC, Queen Street GLQ) with no single hub
lock — the dogfood module and gate must reflect that.

Second layer: the Subway. Its schedule source is a community feed with an unclear licence (ledger and
oracle report). Do not resolve licensing here. If the Subway layer cannot produce a live board under
the current code, the board surfaces its explicit documented error class and the dogfood gate asserts
that class rather than a live Subway board. The National Rail layer is what the gate proves live.
Record the licence question explicitly in the PR description so Mark carries it into the flip PR for
Tim to hold on if he wants.

Do the flip follow-through exactly as your definition's "Do now, ahead of the flip" list, copying the
shape of the most recent UK flip (`lib/cities/south-wales/`, PR #258, or `lib/cities/east-midlands/`
for a two-layer region):

1. `lib/cities/glasgow/dogfood-next-train.js` (+ `stations.json` / `direction-hubs.json` as the
   pattern needs).
2. Dispatch switch-cases in `lib/cities/live-city-api.js` (`directionsFor` / `getMultiCityNextTrain`).
3. `qa/glasgow-dogfood-gate.mjs` replacing `qa/glasgow-planned-gate.mjs`, and the `run-all.mjs`
   registration swapped accordingly (gate live-probes Darwin with the local `DARWIN_LDB_TOKEN` at both
   termini).
4. Do NOT touch `MULTI_CITY_IDS`, `brisbane-dogfood.js`, or `journey-model.js` lists — leave a note
   for Mark in `docs/glasgow-d1/jim-handoff.md` naming the three one-line additions.

Lane lock: run `node qa/lane-lock.mjs check "United Kingdom"` first (it must report free), then
`acquire "United Kingdom" glasgow jim <branch>` before touching shared files.

Branch from master: `glasgow-flip-followthrough`. Run `node qa/glasgow-dogfood-gate.mjs` and
`node qa/run-all.mjs --smoke`, then open a normal (non-flip) PR with results in the description. Do
not merge it. If port 3000 is held by an unrelated process, say so in the PR and rely on CI's web-qa
rather than killing it.
