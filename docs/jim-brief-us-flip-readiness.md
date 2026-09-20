# Jim brief — United States flip readiness (picker country, bounds, station coordinates)

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane") — this brief authorises the shared-UI
(`public/`), `qa/` and `lib/cities/` changes below. `tim-review: no` — the only user-visible change
is Coming Soon picker entries (same class as earlier planned-city PRs); each live flip is a
separate `flip` PR with Tim's 12-hour veto window.

Written 20 Sep 2026 by the controller session. Copy this file into your worktree and include it in
your PR (it is untracked in the main checkout on purpose).

## Why

Mark's Boston second pass (`docs/boston-d1/mark-qa-note.md`, 20 Sep 2026 section) found Boston's
boards, eligibility and gates all green, but could not open a flip PR: Boston is the first US city
and the app has no United States scaffolding.

- `public/city-session.js` has no `United States` picker country and no `CITY_BOUNDS` box for any
  US city.
- `lib/cities/boston/stations.json` and `lib/cities/bart/stations.json` carry no `lat`/`lng`, so
  Near me and bounds cannot work. (Helsinki, Oslo and Brussels catalogs do carry them.)
- `qa/live-city-lists-sync.mjs` enforces eight copies of the live-city set, not the three the
  handoffs name, so a "status line + three lists" flip commit would break smoke on master.

## Deliver

1. **Coordinates.** Add `lat`/`lng` to every station in the Boston and BART catalogs (and Chicago
   if `lib/cities/chicago/stations.json` is on master by the time you branch), in the same field
   shape Helsinki/Oslo use. Source them from the operator's own open data — MBTA v3 `/stops`
   (keyless), BART's public GTFS `stops.txt`, CTA's public GTFS `stops.txt` — matched by the stop
   ids already in each catalog, never by fuzzy name. Every station must get coordinates; list any
   you cannot match in the PR rather than guessing. For multi-platform stations use the parent
   station coordinate.
2. **Picker.** Add a `United States` country (id `us`) to the picker in `public/city-session.js`,
   placed consistently with existing country ordering, with Boston, BART (display name per the
   BART pack — the city id stays `bart`) and Chicago-if-present as **Coming Soon** regions
   (`comingSoon: true`), with correct `timeZone` values (`America/New_York`,
   `America/Los_Angeles`, `America/Chicago`).
3. **Bounds.** Add `CITY_BOUNDS` boxes for those cities derived from the catalog coordinates
   (small margin; check they do not swallow a neighbouring future city — BART's box must not be
   written so that it would claim Caltrain/VTA-only territory beyond BART stations).
4. **Flip recipe.** From `qa/live-city-lists-sync.mjs`, work out exactly which edits a flip commit
   needs for a US city once this lands, and write it into `docs/boston-d1/jim-handoff.md` under
   "Flip commit — exact edits" (and reference it from the BART handoff) so Mark's flip PR is
   mechanical. If the eight-list requirement is itself duplication that could safely derive from
   one source, do **not** refactor it here — note it in the PR as a follow-up.
5. Keep every US city `status: "planned"`; add none to any live list. Smoke must stay green with
   them planned.

## Acceptance
- Every Boston and BART station has coordinates sourced by stop id; a gate (extend
  `qa/boston-dogfood-gate.mjs` / `qa/bart-planned-gate.mjs` or the existing catalog-coords gate
  if there is one) fails if any station lacks them or falls outside its city's bounds box.
- Picker shows United States › Boston / BART as Coming Soon; selecting them behaves like other
  Coming Soon regions. A coordinate at South Station resolves to `boston`, one at Embarcadero to
  `bart` (gate-proved, offline).
- `node qa/live-city-lists-sync.mjs`, the Boston and BART gates, and
  `node qa/run-all.mjs --smoke` all pass.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check united-states`, then
  `acquire united-states us-readiness jim <branch>`.
- Branch from up-to-date `origin/master`.
- lib/ code reached from api/ must not use bare npm imports (breaks in the Vercel bundle).
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read. No background
  processes, sleeps or poll loops left running.
- Commit, push, open a PR that links this brief. Do not merge.
