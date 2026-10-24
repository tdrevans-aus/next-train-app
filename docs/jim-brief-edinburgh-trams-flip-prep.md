# Jim brief — Edinburgh Trams: flip prep (shared-name stops, bundling, 429 test)

**Mode:** bug-fix / product mode. **City:** edinburgh, country united-kingdom. Acquire the lane lock:
the controller checked on 24 Oct 2026 and it was free. **Date:** 24 Oct 2026. **tim-review:** no.
**Input:** Mark's PASS note on #523
(https://github.com/tdrevans-aus/next-train-app/pull/523#issuecomment-6382867176), together with
`docs/edinburgh-trams-d1/jim-handoff.md` ("For Mark's flip PR").
**The switch stays `tramsLive: false` in this PR.** This is prep for the flip, not the flip.

## 1. Shared-name stops: filter out tram Haymarket and tram Edinburgh Gateway (Tim, 24 Oct)

`/api/board`, `/api/directions` and `/api/next-train` take a bare name, and `resolveCatalogEntry`
resolves rail first. A rider who taps the **tram** Haymarket or the tram Edinburgh Gateway gets the
**rail** board. That looks believable but is wrong.

Tim's decision: for the first flip, these two tram stops are **not in the catalog**. Neither may
appear as a tram stop in the picker, in Near me, in the station lists or in directions. Add a coverage
note in the same style as Dublin's Connolly. Proposed copy, which you may tune to match the existing
coverage-note style:

> "Trams at Haymarket and Edinburgh Gateway aren't shown yet; their rail departures are."

- The filter only takes effect when the switch is on. With the switch off, every surface stays
  byte-identical to master, and the #523 golden must still match with **0 diffs**.
- The other 21 tram stops, including Edinburgh Park Station and Edinburgh Park Central, are unaffected.
- The two rail stations HYM and EGY are untouched.
- Record the follow-up (a mode or stop-id parameter through the API and client, so these two stops can
  come back later) in `jim-handoff.md`. **Don't build it.**

## 2. Bundling: `trams-api.json` must reach the Vercel bundle

`lib/cities/edinburgh/trams-catalog.js` reads the overlay with
`readFileSync(join(dirname(fileURLToPath(import.meta.url)), ...))`, and nothing in `vercel.json`
includes it. With the switch on, a missing file would throw in the catalog loaders and take Edinburgh
**rail** down too. Load it the way the repo already loads other `lib/` JSON files, for example
`lib/cities/edinburgh/stations.json`, so the bundler traces it. Prefer that over adding
`includeFiles`. **Don't touch `maxDuration` or any other function settings.** If you can, prove it
traces: run `@vercel/nft` on `api/board.js`, or confirm with a preview deploy.

## 3. Test: status propagation on HTTP errors

Mark's mutation check (`if (!response.ok)` replaced with `if (false)`) stayed green. A mocked 500 only
ended in `FeedUnavailableError` by luck, because its body then failed parsing. Add a purpose-written
assertion: a **429** with a `Retry-After` header and a **valid JSON body** must produce
`FeedUnavailableError` with status 429 and `retryAfterMs` set. A 503 with a valid body must also fail.
Confirm that the same mutation now turns the gate red.

## 4. The flip to-do list in `jim-handoff.md`

Do any items that are safe while the switch is off, and leave the rest listed for the flip PR:
- the `coverage.json` copy;
- the stale `stations.json` notes;
- the no-live-feed helper and script exemptions;
- the dogfood gate counts;
- the Newhaven rider-copy case;
- the picker entry.

## QA

- `node qa/edinburgh-trams-planned-gate.mjs`, with switch-ON checks added for:
  - Haymarket and Edinburgh Gateway tram stops absent;
  - the coverage note present;
  - 21 tram stops.
  
  Also `node qa/edinburgh-dogfood-gate.mjs`, the mutation checks for each new assertion, and
  `node qa/run-all.mjs --smoke` (plain, with a 600000 ms timeout, in the foreground).

PR title: "Edinburgh Trams: flip prep — shared-name stops filtered, overlay bundled, 429 test (switch
still off)". Link this brief and Mark's note. Leave no background loops running.
