# Jim brief — Edinburgh flip follow-through (5 Sep 2026)

Region: `edinburgh` (lib/providers/edinburgh.js, docs/edinburgh-d1/). Status stays `planned` in this
PR — Mark flips it. Single National Rail hub lock at Edinburgh Waverley (EDB), Haymarket and Slateford
as through-running satellites — do not apply Glasgow's two-terminus pattern here.

Second layer: Edinburgh Trams (T50). The ledger records the static GTFS as reachable but not fetched
or parsed, with no real-time (`EdinburghTramsFeedUnverifiedError`). Do not try to close that gap here —
the board surfaces that explicit error class and the dogfood gate asserts the class rather than a live
tram board. The National Rail layer is what the gate proves live.

Do the flip follow-through exactly as your definition's "Do now, ahead of the flip" list, copying the
shape of the most recent UK flip (`lib/cities/south-wales/`, PR #258, or `lib/cities/east-midlands/`
for a two-layer region):

1. `lib/cities/edinburgh/dogfood-next-train.js` (+ `stations.json` / `direction-hubs.json` as the
   pattern needs).
2. Dispatch switch-cases in `lib/cities/live-city-api.js` (`directionsFor` / `getMultiCityNextTrain`).
3. `qa/edinburgh-dogfood-gate.mjs` replacing `qa/edinburgh-planned-gate.mjs`, and the `run-all.mjs`
   registration swapped accordingly (gate live-probes Darwin with the local `DARWIN_LDB_TOKEN`).
4. Do NOT touch `MULTI_CITY_IDS`, `brisbane-dogfood.js`, or `journey-model.js` lists — leave a note
   for Mark in `docs/edinburgh-d1/jim-handoff.md` naming the three one-line additions.

Lane lock: run `node qa/lane-lock.mjs check "United Kingdom"` first (it must report free), then
`acquire "United Kingdom" edinburgh jim <branch>` before touching shared files.

Branch from master: `edinburgh-flip-followthrough`. Run `node qa/edinburgh-dogfood-gate.mjs` and
`node qa/run-all.mjs --smoke`, then open a normal (non-flip) PR with results in the description. Do
not merge it. If port 3000 is held by an unrelated process, say so in the PR and rely on CI's web-qa
rather than killing it.
