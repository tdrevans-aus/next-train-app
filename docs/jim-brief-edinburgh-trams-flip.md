# Jim brief — Edinburgh Trams: the flip PR (tramsLive → true)

**Lane:** expansion flip, with bug-fix/product authority for the files below. **City:** edinburgh,
country united-kingdom. Acquire the lane lock: the controller checked on 25 Oct 2026 and it was free.
**Date:** 25 Oct 2026. **tim-review:** no.
- Tim delegated all flip merges to the controller on 22 Sep.
- Tim accepted the Trapeze terms on 24 Oct (G1).
- Mark's QA gave GO (#537 comment, https://github.com/tdrevans-aus/next-train-app/pull/537#issuecomment-6397015542),
  and G2–G5 PASS (`docs/edinburgh-trams-d1/mark-flip-gates.md`).
- `EDINBURGH_BUSTRACKER_KEY` is in Vercel, with 3 env entries. The controller checked on 25 Oct 2026.

**Label the PR `flip`.** The controller merges it after Mark's verification and its own pre-check. Don't
merge it yourself.

## The flip commit

1. `lib/providers/registry.js`: Edinburgh `tramsLive: true`. City `status` stays `live`.
2. The items in `docs/edinburgh-trams-d1/jim-handoff.md` "For Mark's flip PR" (~line 138):
   - **Coverage:** the coverage text shown when trams are live. Today that's `coverage-trams.json`,
     selected by the switch. With the switch permanently on, decide whether to fold it into `coverage.json`
     (cleaner) or keep the switch selection. Remove the stale "no confirmed live-times feed" partial entry,
     the station-count string and the Waverley note.
   - **`stations.json` notes:** fix the "22 vs 23", `liveFeed:false` and "Schedule-only v1" notes, or fold
     the overlay in. Keep exactly **20** tram stops (Haymarket, Edinburgh Gateway and Edinburgh Park Station
     withheld).
   - **Remove Edinburgh from the no-live-feed lists:** `scripts/list-no-live-feed-stops.mjs`,
     `qa/lib/no-live-feed-gate-helper.mjs`, and `qa/feed-unconfirmed-rider-copy.mjs`'s Newhaven case.
   - **Dogfood gate:** update `qa/edinburgh-dogfood-gate.mjs` counts. The planned gate's switch-ON checks
     become the dogfood coverage. Retire its switch-off half, including the 72-surface golden, because it
     no longer describes production. Rename the gate if the convention calls for it.
   - **Directions:** regenerate `public/city-directions/edinburgh.json` if tram chips should be bundled.
     Follow how other mixed-mode cities do it.
3. **F1 (Mark):** the coverage stations string still says "58 stations and stops"; it should be **57**
   (37 rail + 20 tram). Add a gate assertion that the number in the coverage text equals the
   `/api/city-stations` count, so it can't drift again.
4. **F2 (Mark):**
   - `scripts/write-coverage-notes.mjs` writes the app bundle's `public/coverage-notes/edinburgh.json` from
     `coverage.json` only. Native builds read that file first, so it must reflect the tram coverage. Run it
     and commit the output.
   - `dev-server.js` `/api/coverage-notes` reads `coverage.json` directly. Make it serve the same thing as
     `api/coverage-notes.js`.
5. **The empty-state vehicle noun (Mark's caveat 2).** `nearbyModeVehicleNoun(cityId)`
   (`public/nearby-mode.js` ~128, called ~2624) returns "trains" for Edinburgh because its modes are
   `["train","metro"]`. A tram stop in a feed gap would read "Trains are running…". Derive the noun from the
   focused board or station's mode (Edinburgh metro means "trams"; the station combobox already labels them
   "Trams"). **Don't** add `tram` to Edinburgh's modes. No new strings: "trams" is already a value the
   function returns. If this means a native app bundle change (`public/` and `web-sources/` bundles), say
   so in the PR, because the app needs a store release for native users. Web gets it on deploy.

## Not in scope (follow-ups, listed in `jim-handoff.md`)

- **Out-of-hours wording** (Mark's caveat 1): a documented service-hours window giving `not-currently-served`
  overnight. It needs the official hours verified first.
- **The mode/stop-id API parameter** to bring back the three shared-name tram stops.
- **"Late trams show On Time"** (Mark's G2 note: the adapter sets scheduled = live).

## QA

- All Edinburgh gates pass with `tramsLive: true`.
- `node qa/live-city-lists-sync.mjs` passes.
- Mutation check on the new count assertion and the noun derivation.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground). A switch flip
  changes many gates, so read the full summary, not the tail.
- Live, through a local dev server on a free PORT with QA_BASE matching, while trams are running:
  - `/api/board`, `/api/directions` and `/api/next-train` for Edinburgh Park Central, St Andrew Square and
    Newhaven;
  - `/api/city-stations` (57);
  - `/api/coverage-notes`.
  
  `EDINBURGH_BUSTRACKER_KEY` is in the main checkout's `.env.local`. Never print it, and keep the rate modest.

Open a PR labelled `flip`, linking this brief, Mark's gate results and his #537 note. Leave no background
loops running.
