# Jim brief — Greater Manchester flip follow-through (5 Sep 2026)

Region: `greater-manchester` (lib/providers/greater-manchester.js, docs/greater-manchester-d1/).
Status stays `planned` in this PR — Mark flips it. Stockport's CRS was corrected to SPT in PR #252
(merged) — start from current master. Two hub+secondary-hub pairs (Piccadilly/Victoria for National
Rail, plus the Metrolink pair) cross-linked at one shared-building station.

Second layer: Metrolink. Its feed status is recorded in docs/united-kingdom-ledger.md. Do not try to
close any feed or credential gap here — if the Metrolink layer cannot produce a live board, the board
surfaces its explicit documented error class (uk-west-midlands precedent) and the dogfood gate asserts
that error class rather than a live Metrolink board. The National Rail layer is what the gate proves
live.

Do the flip follow-through exactly as your definition's "Do now, ahead of the flip" list, copying the
shape of the most recent UK flip (`lib/cities/south-wales/`, PR #258, or `lib/cities/east-midlands/`
for a two-layer region):

1. `lib/cities/greater-manchester/dogfood-next-train.js` (+ `stations.json` / `direction-hubs.json`
   as the pattern needs).
2. Dispatch switch-cases in `lib/cities/live-city-api.js` (`directionsFor` / `getMultiCityNextTrain`).
3. `qa/greater-manchester-dogfood-gate.mjs` replacing `qa/greater-manchester-planned-gate.mjs`, and
   the `run-all.mjs` registration swapped accordingly (gate live-probes Darwin with the local
   `DARWIN_LDB_TOKEN`).
4. Do NOT touch `MULTI_CITY_IDS`, `brisbane-dogfood.js`, or `journey-model.js` lists — leave a note
   for Mark in `docs/greater-manchester-d1/jim-handoff.md` naming the three one-line additions.

Lane lock: run `node qa/lane-lock.mjs check "United Kingdom"` first (it must report free), then
`acquire "United Kingdom" greater-manchester jim <branch>` before touching shared files.

Branch from master: `greater-manchester-flip-followthrough`. Run
`node qa/greater-manchester-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke`, then open a normal
(non-flip) PR with results in the description. Do not merge it. If port 3000 is held by an unrelated
process, say so in the PR and rely on CI's web-qa rather than killing it.
