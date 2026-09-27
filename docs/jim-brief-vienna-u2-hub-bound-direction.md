# Jim brief — Vienna: U2 hub-bound direction is invisible to riders (Seestadt board empty)

**Lane:** expansion follow-up, bug-fix / product mode (CLAUDE.md "Bug-fix lane"). **City:** vienna, country austria (acquire the lane lock). **Date:** 27 Sep 2026. **tim-review:** no for the fix; the chosen label wording is flagged for Tim at the flip PR.

## Symptom
Mark's flip QA (RED note: `git show mark/vienna-flip:docs/vienna-d1/mark-qa-note.md`, local branch in the main checkout, copy it into your PR unchanged) found that `/api/board` and `/api/directions` return **zero** entries for Seestadt while `fetchStationBoard("Seestadt")` returns six real live U2 departures. Seestadt is an in-catalog station; a walk-up service silently missing from its board is a hard fail.

## Root cause (confirmed by reading the code, not yet by a test)
`lib/cities/vienna/marketing-directions.js`: `LINE_TERMINI.u2 = ["Seestadt"]` only. Karlsplatz was excluded on the theory that the hub lock forbids it as a direction token. Consequences:
1. `marketingLabelsForStation("Seestadt")` skips the self-terminus and returns **no chips**; `api/board.js` fetches one sub-board per chip, so nothing is fetched.
2. Worse and probably unnoticed: at every intermediate U2 station (Praterstern, Schottentor, Stadion, Donaustadtbrücke, Aspern Nord …) a Karlsplatz-bound trip resolves via `mapLineTerminusDestination` to the bare label `"U2"`, which no chip from `marketingLabelsForStation` matches (`tripMatchesMarketingChip` is an exact string match on `"U2 + Seestadt"`). **Verify** whether half of U2's service is dropped at every U2 station. Mark's note only proves Seestadt.

The direction-model-memo's sentence "Karlsplatz is not a valid outbound destination from anywhere else in the network" is wrong — every U2 train from Seestadt runs towards Karlsplatz. The hub-lock rule forbids the *bare hub name as a generic cross-line token*; it does not forbid a line-qualified hub-bound chip. Precedent: Adelaide/Melbourne city-bound chips are "<hub station> (<line> line)" (PRs #439/#441); Perth style.

## Fix (what to build)
- Add a hub-bound U2 direction. Recommended label: `"U2 + Karlsplatz"` — same "line + terminus" shape as every other Vienna chip, line-qualified so it is not a generic hub token. Do not use "City"/"Zentrum"/"Wien". Add Karlsplatz to `LINE_TERMINI.u2` (or an equivalent hub-bound terminus list) so `resolveTerminus` maps the monitor's `towards` string (check the live value — likely "Karlsplatz") to it.
- Keep the existing guarantee that **at Karlsplatz itself** no "U2 + Karlsplatz" chip is offered (self-terminus skip already does this) and that U1/U4 never gain a Karlsplatz chip.
- `marketingLabelsForStation("Seestadt")` must return `["U2 + Karlsplatz"]`; every intermediate U2 station returns both U2 chips.
- Update the header comments in marketing-directions.js and append a correction to docs/vienna-d1/jim-handoff.md and docs/vienna-d1/direction-model-memo.md (append a dated "Correction" section; never rewrite existing lines).
- Extend `qa/vienna-dogfood-gate.mjs` with synthetic-payload assertions: (a) Seestadt has ≥1 chip and Karlsplatz-bound trips match it; (b) an intermediate U2 station shows trips in BOTH directions; (c) Karlsplatz offers no U2 hub-bound chip and U1/U4 never offer a Karlsplatz chip. Add a per-direction trip-count assertion pattern so a zero-trip chip at a station with live trips fails.

## Acceptance
1. With registry status set to live ONLY in your local working copy (revert before committing), a dev server's `/api/board` and `/api/directions` at Seestadt, Aspern Nord and Praterstern return U2 rows in both applicable directions with per-direction trip counts > 0 while service runs (Vienna is in the Saturday-night 24 h window until ~05:00 local Sunday, then normal service from ~05:00). Space monitor requests ≥ 10 s apart — Mark hit HTTP 403 rate limiting.
2. Karlsplatz still shows exactly one U2 direction (Seestadt).
3. `node qa/vienna-dogfood-gate.mjs`, `node qa/live-city-lists-sync.mjs`, `node qa/run-all.mjs --smoke` green.
4. Status stays "planned". PR title: "Vienna: hub-bound U2 direction (Seestadt board empty) — still planned". Link this brief and Mark's note in the description.
