# Jim brief — London & South East National Rail flip follow-through (5 Sep 2026)

Region: `london-se-national-rail` (lib/providers/london-se-national-rail.js,
docs/london-se-national-rail-d1/). Status stays `planned` in this PR — Mark flips it. Seven
independent per-terminus station groups, no single hub lock (Tim's Option A) — the dogfood module
and gate must reflect that, not a single-hub shape. `uk-london-tfl` is a separate live city and
must be untouched.

Do the flip follow-through exactly as your definition's "Do now, ahead of the flip" list, copying the
shape of the most recent UK flip (`lib/cities/south-wales/`, PR #258, or `lib/cities/greater-anglia/`):

1. `lib/cities/london-se-national-rail/dogfood-next-train.js` (+ `stations.json` /
   `direction-hubs.json` as the pattern needs).
2. Dispatch switch-cases in `lib/cities/live-city-api.js` (`directionsFor` / `getMultiCityNextTrain`).
3. `qa/london-se-national-rail-dogfood-gate.mjs` replacing
   `qa/london-se-national-rail-planned-gate.mjs`, and the `run-all.mjs` registration swapped
   accordingly (gate live-probes Darwin with the local `DARWIN_LDB_TOKEN`, at least one terminus per
   group).
4. Do NOT touch `MULTI_CITY_IDS`, `brisbane-dogfood.js`, or `journey-model.js` lists — leave a note
   for Mark in `docs/london-se-national-rail-d1/jim-handoff.md` naming the three one-line additions.

Lane lock: run `node qa/lane-lock.mjs check "United Kingdom"` first (it must report free), then
`acquire "United Kingdom" london-se-national-rail jim <branch>` before touching shared files.

Branch from master: `london-se-nr-flip-followthrough`. Run
`node qa/london-se-national-rail-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke`, then open a
normal (non-flip) PR with results in the description. Do not merge it. If port 3000 is held by an
unrelated process, say so in the PR and rely on CI's web-qa rather than killing it.
