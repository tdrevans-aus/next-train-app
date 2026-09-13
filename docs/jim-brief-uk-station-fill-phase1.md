# Jim brief — UK National Rail station fill, phase 1 (Scotland + East Midlands)

**Lane:** bug-fix / product mode (CLAUDE.md "Bug-fix lane"). This brief authorises multi-region
catalog data changes, QA gate updates and coverage copy under `lib/cities/`, `public/city-catalogs/`,
`qa/` and `docs/` for the four regions named below. `tim-review: no` — Tim set the rule in chat on
13 Sep 2026 and named these regions.
**Lane lock:** UK. Run `node qa/lane-lock.mjs check united-kingdom` then
`node qa/lane-lock.mjs acquire united-kingdom station-fill-phase1 jim <branch>` before touching
`lib/cities/`. Checked free by the controller at 14:40 UTC 13 Sep 2026.

## Tim's rule (13 Sep 2026, verbatim)

> If it has an API it is in scope. UK is in scope. So any station with an API is in. If it's
> GTFS, come back and have a chat.

Consequence: every National Rail station reachable through Darwin (OpenLDBWS) belongs in the
app. The D1 "hub + termini" station sets were the research pipeline's scope cut, never a product
decision, and they make the app look broken to locals. Tram/Subway/Metro stops backed only by
static GTFS are **not** touched by this brief.

## Symptom

Production `GET /api/city-stations?city=<region>` returns only the D1 hub set:

| Region | National Rail stations today | What a rider expects |
|---|---|---|
| edinburgh | 3 (Waverley, Haymarket, Slateford) | every station in the Edinburgh territory, e.g. Edinburgh Park (EDP), South Gyle, Brunstane, Wester Hailes, Curriehill, Kingsknowe, Newcraighall, Edinburgh Gateway |
| glasgow | 2 (Central, Queen Street) | the whole Strathclyde suburban network (Partick, Exhibition Centre, Argyle / North Clyde / Cathcart Circle / Inverclyde / Ayrshire lines) |
| rest-of-scotland | 9 | every other Scottish station: Fife, Stirling, Falkirk, Ayr/Dumfries corridor, Highlands, Borders line |
| east-midlands | 6 rail (+4 NET tram) | e.g. Carlton (CTO) and Burton Joyce (BUJ) are on the map but not in the dropdown — Tim, 13 Sep 2026 |

## Station list source

1. **Candidate dataset (fetched and checked 13 Sep 2026):**
   `https://raw.githubusercontent.com/davwheat/uk-railway-stations/main/stations.json` — about
   2,600 records of `{stationName, lat, long, crsCode, constituentCountry}`. Contains Carlton CTO,
   Burton Joyce BUJ, Edinburgh Park EDP. No licence statement in the file: check the repo's
   README/LICENSE and record what you find in the pack. If the licence is unclear, prefer the
   ORR "Estimates of station usage" table (Open Government Licence, every GB station with CRS and
   coordinates) and record that instead. Either way, cite the source and licence in
   `docs/uk-station-fill/source.md`.
2. **Every CRS must be live-verified against Darwin** with `scripts/probe-uk-board.mjs` (or the
   same approach as `docs/jim-brief-uk-crs-sweep-2.md`) before it ships — previous sweeps found
   8 of 17 and 3 of 9 wrong codes in hand-written lists. A CRS that returns an HTTP error, or a
   station whose Darwin `locationName` doesn't match the dataset name, is **excluded and listed**
   in `docs/uk-station-fill/unverified.md`, not shipped. Rate-limit the probe (Darwin cache is
   20s server-side; batch with a small delay and use `DARWIN_LDB_TOKEN` from `.env.local`).
   Closed or disused stations that Darwin no longer answers for are excluded the same way.

## Region assignment rule

- `constituentCountry: scotland` maps to one of `edinburgh`, `glasgow`, `rest-of-scotland`.
  Ownership: `docs/united-kingdom-ledger.md` section 2 governs named boundary stations (Falkirk
  High is Edinburgh's; Glasgow's catalog runs up to but not including it). For the rest use
  geography: Edinburgh = City of Edinburgh council area plus East Lothian / Midlothian / West
  Lothian commuter stations on lines into Waverley (Fife Circle stations north of the Forth stay
  rest-of-scotland); Glasgow = the Strathclyde (former SPT) suburban network including
  Inverclyde, Ayrshire (to Ayr/Largs), Lanarkshire and Dunbartonshire; everything else Scottish
  goes to rest-of-scotland. Write the rule you actually applied and the borderline calls into
  `docs/uk-station-fill/assignment.md` — ledger consistency is what Mark gates on.
- `east-midlands`: stations in Nottinghamshire, Derbyshire, Leicestershire, Northamptonshire,
  Rutland and Lincolnshire **that are not already owned** by South Yorkshire, West Midlands,
  Greater Anglia (Peterborough is Greater Anglia's) or Thames Valley per their packs and ledger
  section 2. Do not reassign any station another region already catalogs; if a station sits on a
  boundary, leave it with the existing owner and list it in `assignment.md`.
- Other UK regions and unassignable English stations are **phase 2** (separate brief). Do not
  touch them.

## What to change (per region)

- `lib/cities/<region>/stations.json`: append each verified station as a `mode: "train"` entry in
  the existing shape (`name`, `crs`, `crsVerified: true`, `crsSource`, `lat`, `lng`, short
  `class`). Keep existing entries and their hub/doNotGroup notes intact. Caledonian Sleeper
  `excludeOperators` stays only where the pack already applies it; do **not** add sleeper
  exclusions to new stations without evidence it calls there (list any candidates in
  `assignment.md`).
- `public/city-catalogs/<region>.json`: regenerate — the gates assert it is a verbatim copy.
- `lib/cities/<region>/coverage.json`: update the `stations` sentence (counts and wording).
- `qa/<region>-dogfood-gate.mjs`: update station-count/name assertions; add an assertion that a
  sample of the new stations (Edinburgh Park, Partick, Carlton, Burton Joyce, Stirling at least)
  resolves via the catalog and returns a Darwin board (skip-with-reason when the token is unset,
  matching the existing gates' pattern).
- Direction model needs no change: UK regions derive destination+operator live from Darwin. Do
  not add hub-anchoring (`filterCrs`) for new stations.

## Acceptance criteria

1. `/api/city-stations` for each of the four regions returns every Darwin-verified National Rail
   station assigned by the rule above; Carlton, Burton Joyce, Edinburgh Park, Partick and
   Stirling are present.
2. Every shipped CRS has `crsVerified: true` and a `crsSource` naming the live probe date.
3. `docs/uk-station-fill/{source,assignment,unverified}.md` exist and explain every exclusion.
4. `node qa/edinburgh-dogfood-gate.mjs`, `glasgow-`, `rest-of-scotland-`, `east-midlands-`
   gates pass.
5. `node qa/run-all.mjs --smoke` passes.
6. No change to any other region's catalog, to `lib/providers/`, or to tram/Subway/NET entries.

## Process

Work in your worktree. Copy this brief into it (it is untracked on master by design). Commit,
push, open a PR titled "UK station fill phase 1: Scotland + East Midlands full National Rail
catalogs" linking this brief, with the per-region before/after counts in the description. Leave
no background sleep/poll loops running when you finish.
