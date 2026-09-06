# Jim brief — `npm run cap:sync` aborts in `write-city-directions` on East Midlands

**Date:** 7 Sep 2026 · **Lane:** bug-fix lane (CLAUDE.md) · **tim-review:** no.
**Dispatch:** `subagent_type: jim`, `isolation: "worktree"`. Branch `write-city-directions-resilience`. Commit, push, open a PR linking this brief.

## Symptom
`npm run cap:sync` (and anyone building an APK) dies partway through its first step:

```
NetFeedUnconfirmedError: NET (Nottingham Express Transit) has no confirmed GTFS source — Beeston/Chilwell board cannot be built. ...
    at fetchNetStopBoard (lib/providers/east-midlands.js:124:9)
    at fetchBoardForMode (lib/cities/east-midlands/dogfood-next-train.js:122:12)
    at getEastMidlandsDogfoodDirections (lib/cities/east-midlands/dogfood-next-train.js:140:23)
    at directionsFor (lib/cities/live-city-api.js:215:12)
    at async scripts/write-city-directions.mjs:47:18
```

Reproduced 6 Sep 2026 on master. Because the npm script chains with `&&`, the bundle builds (`build:ads` … `build:analytics`), `cap sync android`, and `prune-ship-assets` never run, and no `public/city-directions/<city>.json` is written for east-midlands or any city after it in `MULTI_CITY_IDS` (liverpool-city-region, solent, south-wales, west-yorkshire, thames-valley, greater-anglia, rest-of-wales, rest-of-scotland, london-se-national-rail, southwest, greater-manchester, south-yorkshire, north-east, glasgow, edinburgh, cumbria). Those files are the phone's fallback direction chips when production's `/api/directions` doesn't know the city.

## Cause
`scripts/write-city-directions.mjs` awaits `getMultiCityDirections(city, name)` per station with no error handling. The NET tram stops throw by design (board-eligibility rule: an excluded/unconfirmed service surfaces an explicit error rather than a silent empty board). The provider is correct; the build script is the bug.

## Fix
In `scripts/write-city-directions.mjs` only:
- Wrap the per-station call. On error: `console.warn` one line (`write-city-directions: <city>/<station> skipped — <error.name>: <first line of message>`), skip the station, continue.
- Still write the city file even if some stations were skipped. If *every* station in a city failed, write nothing for that city, print a clear `write-city-directions: <city> FAILED (0/<n> stations)` line, and remember it.
- Exit code: 0 when every city produced a file; 1 only if at least one city produced none (so a genuinely broken provider still fails CI, but one excluded tram stop doesn't).
- Do not change `lib/providers/east-midlands.js`, the dogfood module, or any board-eligibility behaviour.

## Acceptance
1. `node scripts/write-city-directions.mjs` on master exits 0 and writes a file for all 37 cities in `MULTI_CITY_IDS`, with a warning line for the NET stops.
2. `npm run cap:sync` completes end to end.
3. New `qa/write-city-directions-resilience.mjs`, registered in the **smoke** tier of `qa/run-all.mjs`: runs the writer against a stubbed `getMultiCityDirections` (or a `--only=<city>` flag you add, whichever is less invasive) where one station throws, and asserts (a) the file is written, (b) the thrown station is absent, (c) the exit code is 0, (d) a city whose every station throws yields exit code 1 and no file.
4. `node qa/run-all.mjs --smoke` green.

## Notes
`public/city-directions/` is gitignored build output; don't commit the JSON. Perth is not in `MULTI_CITY_IDS` and is unaffected.
