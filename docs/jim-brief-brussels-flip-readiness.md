# Jim brief — Brussels flip readiness (SNCB on shared boards + Belgium in the picker)

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane") — this brief authorises the shared-UI
(`public/`), `qa/` and `lib/cities/` changes below. `tim-review: no` — nothing user-visible changes
beyond a Coming Soon picker entry (the same class of change as earlier planned-city PRs); the live
flip itself is a separate `flip` PR with Tim's 12-hour veto window.

Written 20 Sep 2026 by the controller session. Copy this file into your worktree and include it in
your PR (it is untracked in the main checkout on purpose).

## Why

Brussels is `planned` with live STIB boards (#416) and a dogfood gate (#412). Two things still stop
Mark opening a clean flip PR:

1. **Board eligibility.** `docs/brussels-d1/oracle-clash-report.md` rules SNCB/NMBS domestic trains
   `in` at the in-catalog stations they share with the metro. They are not on the boards. Rule:
   `docs/board-eligibility-rule.md` §5 — a service marked `in` must appear on a sampled board.
   Your earlier pass confirmed iRail's liveboard (`https://api.irail.be/liveboard/`, no key) is a
   usable real-time source.
2. **Flip readiness.** Mark's Boston second pass (`docs/boston-d1/mark-qa-note.md`, 20 Sep section)
   found that a first city in a new country cannot be flipped by the "status line + three lists"
   commit: `qa/live-city-lists-sync.mjs` enforces eight copies of the live-city set, and
   `public/city-session.js` needs a picker country entry and a `CITY_BOUNDS` box. Belgium has the
   same gap (no `Belgium` country in the picker). Brussels `stations.json` already has coordinates.

## Deliver

**A. SNCB/NMBS on shared-station boards**
- Second live source for the shared stations only (the report's list — Gare Centrale / Centraal,
  Midi / Zuid, Nord / Noord, Schuman, Luxembourg, and any others it names; verify each is genuinely
  the same in-catalog station, not an adjacent one).
- iRail etiquette: descriptive `User-Agent`, respect its rate limits and caching headers, cache
  per station for a short TTL server-side.
- Live only. If iRail fails, the SNCB rows are omitted and the response says so in whatever
  degraded/partial field the other two-source boards use (look at how Stockholm / Malmö or Oslo
  handle a second source failing); never scheduled times as live. STIB failing still refuses the
  board as today.
- Respect doNotGroup-by-mode: metro and SNCB departures at one station must not merge into one
  direction group. Bilingual FR / NL station-name form per the hazard pack.
- `out-checkin` (Eurostar) and `out-reservation` (Thalys/Eurostar-red, TGV INOUI, OUIGO, Nightjet,
  European Sleeper) must never appear; ICE is `in`. Filter on iRail's vehicle type/id and prove it
  in the gate with a fixture containing each kind. Registry `notes` lists the cuts.
- Remove the "SNCB `in` but not implemented" gap statement from the registry notes and handoff
  once true.

**B. Belgium flip readiness (no flip)**
- Picker: add a `Belgium` country with Brussels as a **Coming Soon** region
  (`comingSoon: true`, `timeZone: "Europe/Brussels"`), placed consistently with the existing
  country ordering. Add a Brussels `CITY_BOUNDS` box derived from the catalog coordinates.
- Work out from `qa/live-city-lists-sync.mjs` exactly which edits a Brussels flip commit will then
  need, and write that list into `docs/brussels-d1/jim-handoff.md` under "Flip commit — exact
  edits" so Mark's flip PR is mechanical. Keep `status: "planned"`; do not add Brussels to any
  live list; smoke must stay green with Brussels still planned.

## Acceptance
- A sampled live board at Gare Centrale shows both metro and SNCB departures, in separate groups;
  a metro-only station shows no SNCB rows; no Eurostar/TGV/Nightjet row can appear (gate-proved).
- iRail down ⇒ metro board still serves, flagged partial; STIB down ⇒ refusal. Both gate-proved
  offline with fixtures.
- Picker shows Belgium › Brussels as Coming Soon; Near me bounds resolve Brussels coordinates.
- `node qa/brussels-dogfood-gate.mjs`, `node qa/live-city-lists-sync.mjs`,
  `node qa/run-all.mjs --smoke` all pass.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check belgium`, then `acquire belgium brussels jim <branch>`.
- Branch from `origin/master` at or after 5bf08db. `STIB_API_KEY` is in the main checkout's
  `.env.local` — copy it into the worktree, never print or commit values.
- lib/ code reached from api/ must not use bare npm imports (breaks in the Vercel bundle).
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read. No background
  processes, sleeps or poll loops left running.
- Commit, push, open a PR that links this brief. Do not merge.
