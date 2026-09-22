# Jim brief — Melbourne (and Adelaide) direction labels: terminus only, Perth style

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). `tim-review: yes` — rider-facing label
copy; Tim decided the direction in chat on 22 Sep 2026 after testing Melbourne on the emulator.
Written by the controller session. Copy this file into your worktree and include it in your PR
(untracked in the main checkout on purpose). Labels are served by the API, so this reaches every
installed build on deploy — no APK needed; it does not block the 3.0.4 upload.

## Symptom (emulator, 3.0.4, Flinders Street / Richmond, 22 Sep 2026)

Melbourne's line names are the names of their termini, so the `line + terminus` model doubles up
nearly every label: "Williamstown Line + Williamstown", "Belgrave Line + Belgrave via City Loop",
"Craigieburn Line + Craigieburn via City Loop" (wraps to two lines on a phone). Perth — the
reference AU city — shows the terminus alone: "towards Yanchep". Adelaide has the same doubling
("Belair line Belair", "Gawler line Gawler Central") and is in scope for the same fix.

Also seen at Flinders Street: "Glen Waverley Line + Flinders Street · 1 min" — a train whose
terminus is the station the rider is standing at. Nobody boards that; it is an arrival.

## Tim's decision

**Terminus only, Perth style**, for Melbourne and Adelaide. The line name appears only where the
terminus alone is ambiguous — the inbound direction toward the hub, where several lines share the
terminus "Flinders Street" / "Adelaide Railway Station". Keep the "via City Loop" suffix rule
exactly as decided (only at Flinders Street / Southern Cross / Flagstaff / Melbourne Central /
Parliament, only on loop trips, derived live from the stop sequence).

## Deliver

1. **Melbourne** (`lib/cities/melbourne/direction-labels.js`, marketing directions, dogfood):
   - Outbound / branch-bound: `<terminus>` — "Williamstown", "Belgrave via City Loop",
     "Craigieburn via City Loop", "Sunbury", "Cranbourne", "Pakenham", "Stony Point".
   - Hub-bound where the terminus is shared: `<terminus> (<Line> Line)` — e.g.
     "Flinders Street (Williamstown Line)". Look at how the UI renders "towards X" so the
     result reads naturally: the hero says "towards Flinders Street (Williamstown Line)".
     If the app already has a distinct "line" chip field the UI can render separately from the
     terminus (check `public/app.js`'s direction rendering and the other cities' label objects),
     prefer that over baking parentheses into the string — say which you did in the PR.
   - Never blank on the Sunbury/Cranbourne/Pakenham spine; Cranbourne vs Pakenham distinct at
     Dandenong; V/Line rows keep their own grouping (they are destination-named already).
   - `public/city-directions/melbourne.json` regenerated; `qa/melbourne-dogfood-gate.mjs`
     assertions updated to the new strings (and a negative assertion: no label contains the
     same word twice as "<X> Line + <X>").
2. **Adelaide** (`lib/cities/adelaide/*`): same rule — "Belair", "Gawler Central", "Outer Harbor";
   hub-bound "Adelaide Railway Station (Belair line)" or the chip-field equivalent. Update
   `public/city-directions/adelaide.json` and `qa/adelaide-dogfood-gate.mjs`.
3. **Terminating-here filter** (both cities, and check whether the shared board code or only the
   Perth adapter already does this): a trip whose terminus is the station being viewed is an
   arrival, not a departure — exclude it from that station's directions and board rows. Confirm
   the Perth adapter's behaviour and match it. Gate-assert with a fixture that includes a
   terminating trip.
4. **Saved journeys / pins**: riders may already have a saved Melbourne direction under the old
   string (city flipped today, so few). Check how `public/journey-model.js` matches a saved
   direction to current chips and either add an alias map from old → new labels for Melbourne
   and Adelaide, or state plainly in the PR that stale saved directions re-prompt on next open.
5. Report only (do not change): list every other live city whose labels repeat the terminus in
   the line name, so Tim can decide whether to extend the rule. Brisbane/Sydney line codes
   ("T1", "CCN") are NOT redundant — leave them.

## Acceptance
- `/api/directions` at Richmond, Flinders Street, Dandenong, Southern Cross (Melbourne) and
  Adelaide Railway Station, Goodwood (Adelaide) show the new labels; no label repeats its
  terminus; no direction is blank; "via City Loop" still only at the five stations.
- At Flinders Street no direction has terminus Flinders Street; same for Adelaide Railway Station.
- `node qa/melbourne-dogfood-gate.mjs`, `node qa/adelaide-dogfood-gate.mjs`,
  `node qa/bundled-city-directions.mjs`, `node qa/live-city-lists-sync.mjs`,
  `node qa/run-all.mjs --smoke` pass.
- PR description lists the exact before/after labels for the six sample stations for Tim.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check australia`, then
  `acquire australia melbourne-adelaide-labels jim <branch>`.
- Branch from up-to-date `origin/master`. `VIC_OPENDATA_API_KEY` / Adelaide key: copy
  `.env.local` into the worktree for live checks, never print or commit, delete before committing;
  load it via `loadEnvLocal()` (values are double-quoted — never hand-export one).
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read; if an
  unrelated script fails, re-run it once in the foreground with a timeout. Foreground commands
  with explicit timeouts only — no background processes, sleeps or poll loops; stop any dev server
  you start (free port, never 3000).
- Commit, push, open a PR titled "Melbourne + Adelaide: terminus-only direction labels (Perth
  style), drop terminating-here trips". Do not merge.
