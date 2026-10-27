# Jim brief — Edinburgh Trams: fix flip blockers B1 and B2 (switch stays off)

**Lane:** bug-fix / product mode. **City:** edinburgh, country united-kingdom. Acquire the lane lock:
the controller checked on 25 Oct 2026 and it was free. **Date:** 25 Oct 2026. **tim-review:** no.
B1 extends Tim's 24 Oct decision on shared-name stops (filter them for the first flip, with a coverage
note) to a third stop with the same defect.
**Input:** `docs/edinburgh-trams-d1/mark-flip-gates.md` (on master, #536), the G6 blockers.
`tramsLive` stays **false**, and switch-off output stays byte-identical to master (the #523 golden).

## B1 — tram "Edinburgh Park Station" shows the rail board

`/api/board?station=Edinburgh Park Station` returns the ScotRail board (Dunblane, Edinburgh, Helensburgh
Central, Stirling), and `/api/directions` gives rail chips. `resolveCatalogEntry` resolves the name to
rail **EDP**. It's the same shadowing as Haymarket and Edinburgh Gateway. The handoff called it "safe",
which was wrong.

**Fix (Mark's option a):** add `tram:edinburgh-park-station` to `TRAM_SHARED_NAME_HIDDEN_CATALOG_IDS`
(`lib/cities/edinburgh/trams-catalog.js:29`). That leaves **20** tram stops at the first flip.
- Extend the coverage note in `lib/cities/edinburgh/coverage-trams.json` to cover all three stops in the
  existing style, e.g. "Trams at Haymarket, Edinburgh Gateway and Edinburgh Park Station aren't shown yet;
  their rail departures are."
- Rail EDP is untouched. **Edinburgh Park Central (tram) stays in**, and its name doesn't collide.
- Add a switch-ON gate assertion that **no** in-catalog tram stop name resolves to a non-tram entry through
  the bare-name `resolveCatalogEntry`. That's the general guard for this whole class of bug.

## B2 — no honest empty state on tram boards

With a stubbed all-null feed, `/api/board` for Newhaven returns 200 with zero trips, and
`/api/next-train` returns `next: null` and `upcoming: []`. **Neither carries an `emptyReason`.** It's a
real case: Newhaven was empty for 3 consecutive polls, 09:43–09:46Z.

**Fix:** an empty tram board carries `emptyReason: "no-live-predictions"` and passes it through the
next-train path, as Prague and Dublin do (`lib/providers/prague.js` ~466–499, Dublin #500 per direction).
- Use only the existing approved rider copy, no new strings.
- If the switch-on catalog can know a stop has no service today (unlikely for trams), use
  `not-currently-served`. Otherwise `no-live-predictions` is enough. No stop was empty on every poll.
- Check the rider surfaces render it for Edinburgh trams. Wire it if a city allowlist gates it out.

## QA

- `qa/edinburgh-trams-planned-gate.mjs` switch-ON checks:
  - 20 tram stops;
  - Edinburgh Park Station absent as a tram stop and present as rail;
  - the coverage note names all three;
  - the bare-name resolution guard;
  - an empty-feed tram board and next-train carry `no-live-predictions`.
- Switch-OFF: the 72-surface golden still matches with 0 diffs.
- Mutation-check each new assertion.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground).
- Live check with the switch forced on in-process, if trams are running: Edinburgh Park Central and
  Newhaven boards. `EDINBURGH_BUSTRACKER_KEY` is in the main checkout's `.env.local`. Never print it, and
  keep the rate modest.

Open a PR that links this brief and Mark's results file, and leave no background loops running.
