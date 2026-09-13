# Jim brief — empty board during a planned line closure (Bjuv, Malmö/Skåne)

**Lane:** bug-fix / product mode. `tim-review: yes` — this changes user-facing copy and adds a
field to the board API response.
**Lane lock:** none needed (shared `lib/providers/gtfs/realtime-board.js` + `api/` + `public/`;
no per-city provider file changes expected). Leave no background loops running when done.

## Symptom

Tim, 13 Sep 2026: "I've selected Bjuv in Sweden and there are no trains." Production
`GET /api/board?city=malmo&station=Bjuv` returns both directions with `upcoming: []` and
`next: null`, and the app shows an empty board with no explanation.

## Root cause (established, not a data bug)

Trafikverket is renewing track and points on Skånebanan between Åstorp and Helsingborg. Trains
are replaced by buses from 9 Sep 2026 01:00 to 9 Nov 2026 05:00 (Skånetrafiken / Helsingborg.se,
confirmed 13 Sep 2026). The Skånetrafiken static GTFS reflects this exactly: Bjuv's rail
stop_times belong to services whose `calendar_dates` run 3–8 Sep and then resume 9 Nov–12 Dec;
there is no rail service date at Bjuv between 9 Sep and 8 Nov. Replacement buses are
`route_type` bus and are trimmed out of the Malmö static snapshot by design (buses out of v1,
`docs/malmo-d1/hazard-pack.md` H3). Helsingborg C has service every day this week, so the feed
and the horizon logic are fine. The app is correct; it is just silent about *why*.

Evidence: local probe 13 Sep 2026 — Bjuv stop ids `9022012060090041` / `9022012060090042`,
168 rail trips, service ids 681–685, service dates `20260903–20260908, 20261109–20261212`.

## Fix

When a resolved catalog station yields zero trips in the board horizon, the board should say
so and, when the static feed can tell us, say when service resumes:

1. In `lib/providers/gtfs/realtime-board.js` (shared by every GTFS city): when the filtered trip
   list for the station is empty, compute `nextServiceDate` = the earliest `calendar` /
   `calendar_dates` service date after today on which any in-scope trip serves the station's
   stop ids (respecting the same route_type / `filterTrip` rules the board uses). Return it on
   the board object alongside `trips` (null when there is none inside the feed's calendar range,
   or when the station has no trips in the feed at all — distinguish "none today" from "no
   service until X" from "never"). Don't load anything extra; the static data is already in
   memory.
2. `api/board.js`: pass `nextServiceDate` through per direction entry (and at the top level).
   Keep every existing field unchanged.
3. `public/app.js` empty-board rendering: when `upcoming` is empty and `nextServiceDate` is set,
   render a plain-language line, e.g. "No trains scheduled here until Mon 9 Nov. Check the
   operator for replacement buses." Date formatted in the city's timezone and locale. When
   `nextServiceDate` is null keep today's behaviour. Copy is Tim's to approve — put the exact
   string in the PR description.
4. Do **not** add bus trips to the Malmö snapshot and do not special-case Bjuv or Skånebanan.

## Acceptance criteria

1. `GET /api/board?city=malmo&station=Bjuv` returns `nextServiceDate: "2026-11-09"` on each
   direction entry while the closure lasts; Helsingborg C and Lund C responses are unchanged
   apart from the new field being null/absent.
2. A new QA script `qa/planned-closure-empty-board.mjs` builds a tiny synthetic static fixture
   (one stop, services with a gap) and asserts `nextServiceDate` for: gap in progress, no gap,
   station beyond feed range (null). Registered in `qa/run-all.mjs` smoke tier. It must **not**
   download any GTFS from Vercel Blob (see the smoke-tier blob rule).
3. `node qa/malmo-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke` pass.
4. Other GTFS cities' boards are unchanged except for the new field.

## Process

Worktree; copy this brief in; commit, push, open a PR titled "Board: explain empty boards during
planned closures (nextServiceDate)" linking this brief and marked **tim-review** in the
description with the proposed copy string.
