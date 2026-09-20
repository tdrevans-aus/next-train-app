# Jim brief — Brussels: low-key "Scheduled" rows, the scheduled tail, and SNCB chip grouping

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Continues PR #432
(`docs/jim-brief-brussels-horizon-and-sncb-directions.md`) **on the same branch** — push follow-up
commits, do not open a new PR. `tim-review: yes` — this adds rider-visible copy/styling and amends
a standing rule; Tim approves the look and wording before merge.
Written 20 Sep 2026 by the controller session from Tim's decisions in chat. Copy this file into
your worktree and include it in the PR (it is untracked in the main checkout on purpose).

## Tim's decisions (20 Sep 2026)

1. Part A of the previous brief is accepted: STIB's two-passages cap is a hard upstream property;
   no more live metro times are available. Brussels **stays live** meanwhile.
2. Build the **scheduled tail**, which needs a visible scheduled-vs-live distinction that does
   not exist in `public/` today. Tim's words: *"Keep the 'Scheduled' thing relatively low key. It
   needs to exist but not be in your face."*
3. The standing rule is amended to: **scheduled times are never presented as live, and are never
   shown when live data is unavailable.** (Record this wording in `docs/board-eligibility-rule.md`
   is NOT the place — put it where the no-timetable-fallback rule is written down for adapters:
   find it (CLAUDE.md memory pointer: Göteborg PR #332 / release-1 scope; grep `docs/` for
   "timetable fallback") and update that text, plus the Help copy if Help states the old rule.)
4. SNCB chips: **group them the way the UK Darwin regions do** rather than shipping 30 chips at
   Gare Centrale.

## Part 1 — a low-key "Scheduled" row treatment (shared UI, all cities)

- **Contract:** one explicit per-trip marker for "this departure time comes from the timetable,
  not from live data". Reuse an existing field if the static-join cities already carry one for
  trips with no realtime update; otherwise add it and document it in
  `lib/providers/contract.js`. It must survive through `/api/board`, `/api/next-train` and the
  bundled client (`web-sources/train-times-client.mjs` → `public/train-times-bundle.js`; rebuild
  with `npm run build:train-times`).
- **Look — quiet, not alarming.** Rows already show a status word ("On Time", "Delayed"). A
  scheduled row shows **"Scheduled"** in that same slot, in the existing muted/secondary text
  colour token, with no live indicator/pulse and no warning colour; the time itself is rendered
  exactly like other rows (do not grey out or italicise the time — it must stay readable and
  the leave-by maths still applies to it). No badge, no icon, no banner, no tooltip pop-up. It
  must read correctly in light and dark themes and at phone width, and be conveyed to screen
  readers (the status word is real text, not colour alone).
- **Help:** one sentence in the existing "Which trains show up" / coverage Help copy in
  `public/index.html`, e.g. *"Times marked Scheduled come from the timetable; everything else is
  live."* Keep Tim's tone: plain, short. This sentence and the word "Scheduled" are the only new
  rider-facing copy — list them at the top of the PR description for Tim.
- **Do not change any other city's behaviour.** Static-join cities that today show a trip without
  a realtime update keep doing whatever they do; if you find they already present such trips
  with no distinction, REPORT it in the PR (that is a separate decision) — do not flip them to
  "Scheduled" in this PR.
- **Evidence for Tim:** the controller will screenshot the result; make it easy — say in the PR
  exactly which station/direction shows a scheduled row on a local dev server and how to see it.

## Part 2 — the Brussels scheduled tail (Part B of the previous brief, now unblocked)

Build it exactly as specified there: live rows untouched; **after** the last live row of a metro
direction, append later departures from STIB's static GTFS, flagged scheduled; never before or
between live rows; dedupe against live rows (line + direction + time window); cap at 60 minutes
ahead or 6 departures per direction; **only while the live feed is healthy** — Waiting Times
failure / rate-limit / empty ⇒ the board refuses exactly as today (gate-proved: the tail is never
a fallback). Static GTFS must come through the snapshot cache with the freshness safeguards
(`docs/jim-brief-gtfs-snapshot-freshness.md`), never a cold zip load on the request path — and
mind the Vercel Blob transfer budget: no per-request or per-CI-run re-downloads (see how the AU
static-join cities and the smoke tier avoid blob traffic). `/api/board` at Arts-Loi stays under
3 s cold locally. SNCB rows need no tail (iRail already reaches ~60 minutes).
Update `lib/cities/brussels/coverage.json` to say, plainly, that the next two metros are live and
later ones are timetable times marked Scheduled.

## Part 3 — SNCB chip grouping

30 SNCB chips (`"IC + Oostende"` …) plus 8 metro chips at Gare Centrale is too many. Study how
the UK Darwin regions tame the same destination explosion (`scripts/write-city-directions.mjs`,
`public/city-directions/*.json`, the Darwin directions builder and its picker disambiguation
gate) and apply the same approach to SNCB at the three shared stations. Target: a rider at Gare
Centrale sees a short, stable, scannable set of SNCB choices (order of 8–12, not 30), each still
truthful (every train behind a chip really goes that way), with metro chips listed first and
never merged with SNCB (doNotGroup-by-mode). Whatever is grouped must still let a rider find
Brussels Airport, Antwerp, Ghent/Bruges/Ostend, Leuven/Liège, Namur/Luxembourg, Mons/Charleroi
and the S-train suburban directions. Write the grouping table into
`docs/brussels-d1/jim-handoff.md` and the PR description for Tim's review. Chips must be stable
across times of day (no chip set that reshuffles with each fetch).

## Acceptance
- A scheduled row is visibly but quietly distinct ("Scheduled", muted, no live indicator) and the
  marker is present in `/api/board` JSON; live rows unchanged; other cities unchanged.
- Arts-Loi and Simonis directions reach ≥25 minutes ahead with live rows first, scheduled after;
  STIB down ⇒ refusal, no scheduled rows at all (gate-proved offline).
- Gare Centrale `/api/directions`: metro first, then the grouped SNCB set (count stated in PR);
  metro-only station: no SNCB; no Eurostar/TGV/Nightjet/etc.
- `node qa/brussels-dogfood-gate.mjs`, `node qa/coverage-notes-gate.mjs`,
  `node qa/bundled-city-directions.mjs`, `node qa/live-city-lists-sync.mjs`,
  `node qa/run-all.mjs --smoke` pass (the browser scripts in smoke cover the UI bundle — make
  sure the rebuilt bundle is committed).

## Mechanics
- Same branch and PR as #432; the `belgium` lane lock is already held for it. If the branch is
  behind master, merge `origin/master` in and resolve additively. Do not change Brussels's
  `status`.
- `STIB_API_KEY`: copy `C:/Users/tdrev/Projects/next-train-app/.env.local` into the worktree,
  never print or commit it, delete the copy before committing. Polite API use as before.
- lib/ code reached from api/ must not use bare npm imports (breaks in the Vercel bundle).
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read. Foreground
  commands with explicit timeouts only — no background processes, sleeps or poll loops; stop any
  dev server you start (use a free port, never assume 3000).
- Push to #432, update its description (new copy listed first), do not merge.
