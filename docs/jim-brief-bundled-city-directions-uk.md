# Jim brief — regenerate bundled city-directions for the 16 UK regions that lack one

**Lane:** bug-fix / product mode. `tim-review: no`. **Lane lock:** none (`public/`, `qa/`,
`scripts/`). Leave no background loops, pollers or dev servers.
**Start after PR #391 (nightly triage) has merged** — it moves `qa/bundled-city-directions.mjs`
into a KNOWN_RED list in `qa/run-all.mjs` and you will be taking it back out.

## Symptom

`qa/bundled-city-directions.mjs` requires `public/city-directions/<city>.json` for every id in
`MULTI_CITY_IDS`. 16 of the 32 live UK regions have no file (present: greater-anglia, solent,
thames-valley, west-yorkshire, uk-london-tfl; missing: the rest, e.g. edinburgh, glasgow,
rest-of-scotland, east-midlands, south-yorkshire, north-east, west-of-england, southwest,
cumbria, south-wales, rest-of-wales, london-se-national-rail, greater-manchester,
liverpool-city-region, uk-west-midlands, rest-of-england). The client
(`public/brisbane-dogfood.js` `loadDirectionsMap`) treats a missing file as `{}` and falls back
to `/api/directions`, so this is a first-paint/offline degradation, not a broken board — but
it's also the reason that gate has been red since these regions flipped, and every future flip
will forget it again.

## Fix

1. Run `node scripts/write-city-directions.mjs` (it reads `.env.local`; the Darwin token is
   there) and commit the generated files for every live region, including the 16 above and any
   changed existing ones. Read the script's header first: it has a 7 Sep resilience note about
   stations that throw; follow it rather than hand-editing output. If the writer produces an
   empty map for a UK region because directions are derived live from Darwin and there is no
   static chip source, say so per region in the PR and decide with evidence whether an empty
   `{}` file is the right artefact (it makes the gate honest) or whether the writer should skip
   such regions and the gate should accept "live-derived, no bundle" via an explicit list.
2. Make flips unable to forget it: `qa/live-city-lists-sync.mjs` (or the bundled-directions gate
   itself, moved into the smoke tier) must fail when a live city lacks its file, and Mark's
   flip checklist (`.claude/agents/mark.md`, the flip-PR section) must tell him to run the
   writer as part of the flip commit. Keep that agent-definition edit to the one added line.
3. Remove `bundled-city-directions.mjs` from `KNOWN_RED_SCRIPTS` once it passes.

## Acceptance criteria

1. `node qa/bundled-city-directions.mjs` passes on the branch.
2. Every id in `MULTI_CITY_IDS` has a file, or is on an explicit, commented "live-derived"
   allow-list inside the gate with a reason.
3. `node qa/run-all.mjs --smoke` and `--release` green (foreground, 600000 ms timeout).
4. No `lib/` changes.

## Process

Worktree from master after #391; copy this brief in; commit, push; PR "Bundle city-directions
for all live UK regions and gate it on flip".

## Addendum (14 Sep 2026) — one small dev-server tidy-up from Mark's #391 note

PR #391 has merged. Mark noted that the new catch blocks in `dev-server.js` for the multi-city
`/api/directions` and `/api/destinations` branches respond with `{ error: error.message }`,
the echo pattern that `qa/api-500-no-error-echo.mjs` (D-10) forbids in `api/`. Not deployed,
so not a production issue, but make them route through the same `sendGenericServerError`
helper the production handlers use (fixed message plus `reason`), so the dev server mirrors
production as the PR claimed. Confirm `qa/api-500-no-error-echo.mjs` still passes.
