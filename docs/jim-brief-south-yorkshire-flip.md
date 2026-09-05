# Jim brief — South Yorkshire flip follow-through (5 Sep 2026)

Region: `south-yorkshire` (lib/providers/south-yorkshire.js, docs/south-yorkshire-d1/). Status stays
`planned` in this PR — Mark flips it. CRS codes were live-verified in PR #252 (merged) — start from
current master. Hub lock Sheffield (SHF) with doNotGroup between Supertram and National Rail.

Second layer: Sheffield Supertram. Its feed status is recorded in docs/united-kingdom-ledger.md. Do
not try to close any feed gap here — if the tram layer cannot produce a live board, the board must
surface its explicit documented error class (the uk-west-midlands / east-midlands precedent), and the
dogfood gate asserts that error class rather than a live tram board. The National Rail layer is what
the gate proves live.

Do the flip follow-through exactly as your definition's "Do now, ahead of the flip" list, copying the
shape of the most recent UK flip (`lib/cities/south-wales/`, PR #258, or `lib/cities/east-midlands/`
for a two-layer region):

1. `lib/cities/south-yorkshire/dogfood-next-train.js` (+ `stations.json` / `direction-hubs.json` as
   the pattern needs).
2. Dispatch switch-cases in `lib/cities/live-city-api.js` (`directionsFor` / `getMultiCityNextTrain`).
3. `qa/south-yorkshire-dogfood-gate.mjs` replacing `qa/south-yorkshire-planned-gate.mjs`, and the
   `run-all.mjs` registration swapped accordingly (gate live-probes Darwin with the local
   `DARWIN_LDB_TOKEN`).
4. Do NOT touch `MULTI_CITY_IDS`, `brisbane-dogfood.js`, or `journey-model.js` lists — leave a note
   for Mark in `docs/south-yorkshire-d1/jim-handoff.md` naming the three one-line additions.

Lane lock: run `node qa/lane-lock.mjs check "United Kingdom"` first (it must report free), then
`acquire "United Kingdom" south-yorkshire jim <branch>` before touching shared files.

Branch from master: `south-yorkshire-flip-followthrough`. Run
`node qa/south-yorkshire-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke`, then open a normal
(non-flip) PR with results in the description. Do not merge it. If port 3000 is held by an unrelated
process, say so in the PR and rely on CI's web-qa rather than killing it.
