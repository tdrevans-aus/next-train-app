# Jim brief — Washington DC: rewrite the dogfood gate to assert live state

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). `tim-review: no` — this is a QA-gate
mechanics fix, not a copy/UI/API-shape change.
Written 2026-09-25 by the controller session, from Mark's QA note.

## Symptom

Mark ran the full Washington DC (WMATA) QA checklist and it is functionally green: hub-lock
(Metro Center merged via `StationTogether1/2`, Farragut North/West kept distinct), v1 mode cut
(WMATA Metrorail only), DST via `Intl`/`America/New_York`, response-shape conformance, both
board-eligibility checks, the post-Boston realtime-is-actually-live check (`board.realtime ===
"live"`, no static-GTFS fallback), and `docs/united-states-ledger.md` consistency all pass. Full
note: `docs/washington-d1/mark-qa-note.md`.

**Blocker:** `qa/washington-dogfood-gate.mjs` still hard-asserts the *pre-flip* state —
`assertCityLive(washington)` must fail, `status === "planned"`, `isMultiCity === false`,
dispatched calls must throw `MissingWmataApiKeyError`. Flipping `lib/providers/registry.js`
`status` to `"live"` per the standard recipe would break this gate immediately, because the gate
itself asserts the city is *not* live.

## Precedent

Boston needed exactly this before its own flip. See `qa/boston-dogfood-gate.mjs` for the
live-state assertion pattern it was rewritten to use (and, if it still exists,
`docs/jim-brief-boston-subway-live-predictions.md` item 4 for how that rewrite was scoped).
Mirror that shape for Washington: assert the city *is* live, `isMultiCity` is whatever the
now-wired board actually reports, WMATA calls succeed and return real predictions (or a
recorded fixture equivalent), and the old pre-flip assertions are removed (not left disabled).

## Task

1. `node qa/lane-lock.mjs check united-states` then `node qa/lane-lock.mjs acquire united-states
   washington jim <branch>` before touching `lib/providers/registry.js` or shared QA files.
2. Rewrite `qa/washington-dogfood-gate.mjs` to assert live-state, following the Boston pattern.
3. Flip `lib/providers/registry.js`: `status: "live"` for Washington DC, plus the three live-list
   additions (same mechanics as every prior flip).
4. Run `node qa/washington-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke`. The pre-existing
   `boston-dogfood-gate.mjs` and `melbourne-dogfood-gate.mjs` smoke failures are known-unrelated
   (Mark confirmed both fail identically on master) — don't chase them, but don't let this branch
   introduce any *new* failures.
5. Commit, push, open the flip PR (label `flip`, checklist results from
   `docs/washington-d1/mark-qa-note.md` in the description, links this brief). Per CLAUDE.md,
   flip PRs are lazy-consensus — do not merge it yourself.

## Acceptance criteria

- `qa/washington-dogfood-gate.mjs` asserts live state, not planned state, and passes.
- `node qa/run-all.mjs --smoke` has no new failures vs. master's current baseline.
- Registry status is `"live"` for Washington DC with the three live-list additions.
- Flip PR opened, labelled `flip`, linking this brief and Mark's QA note.

Leave no background sleep/poll loops running when you finish.
