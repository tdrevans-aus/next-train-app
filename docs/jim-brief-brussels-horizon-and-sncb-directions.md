# Jim brief — Brussels: board horizon is ~10 minutes; SNCB rows never reach riders

Mode: **bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Brussels is LIVE (flipped 20 Sep 2026,
#422). `tim-review: yes` **only if** you end up building Part B's fallback (the scheduled tail) —
it changes what riders see and amends a standing rule; Parts A and C are `tim-review: no`.
Written 20 Sep 2026 by the controller session from Tim's instruction in chat. Copy this file into
your worktree and include it in your PR (it is untracked in the main checkout on purpose).

## Symptoms (production, 20 Sep 2026 ~12:00 UTC)

1. **Horizon.** `/api/board?city=brussels` shows 1–2 trains per direction, the furthest 3–14
   minutes ahead (Gare Centrale 6–10 min, Arts-Loi 3–12, Simonis 6–14). Helsinki shows 5 per
   direction, 41–48 min ahead. With the default 10-minute leave-before, nearly every Brussels row
   is already "late" — the app's core leave-by job fails. Tim noticed this himself.
2. **SNCB invisible.** `/api/directions?city=brussels&station=Gare Centrale` returns only the four
   metro directions. SNCB rows exist in `fetchStationBoard()` but
   `lib/cities/brussels/dogfood-next-train.js` only surfaces trips that match a metro marketing
   chip, so the `in` verdict for SNCB (oracle report + `board-eligibility-addendum.md`) is not
   met in the product, and `lib/cities/brussels/coverage.json` claims coverage riders don't get.

## Part A — find more LIVE times (Tim: do this first, properly)

Tim's instruction: *explore the STIB API for a default cap and see if there is another way to get
more live times before falling back.* Investigate, with evidence recorded in
`docs/brussels-d1/jim-handoff.md` (dated section "Horizon investigation"):

- Is "2 passages per line per stop" a hard property of the Waiting Times dataset, or a default?
  Read the dataset's own schema/docs on the Belgian Mobility / STIB open-data portal (you found
  the operation list via the portal's `/mapi/apis?api-version=2018-06-01-preview` endpoint last
  time — use it again), and try the query parameters the platform supports (`limit`, `rows`,
  `where`, `select`, `refine`, pagination, per-`pointid` vs per-`lineid` filters, direction).
  Does querying each platform/direction `pointid` separately yield more passages than querying
  the station? Does the payload carry more than two entries in `passingtimes` for any stop?
- Other STIB real-time datasets on the same key: vehicle positions / "VehiclePosition",
  "stop details", "travellers information", anything giving vehicles' last-passed stop. If
  vehicle positions are available, **deriving** an arrival at our stop from an upstream
  vehicle's live position plus scheduled inter-stop run time is a live-derived estimate, not a
  timetable time — assess whether it is accurate enough and honest enough to show, and how the
  contract would mark it (a derived-estimate flag, not plain "live"). Do not build this without
  saying clearly in the PR what it is; if it is more than a day's work, describe it and stop.
- Any other official source with a longer live horizon for STIB metro (the Belgian NAP's SIRI /
  GTFS-RT catalogue — the oracle report says STIB is absent; re-check once, it was written
  29 Aug).
- Be a polite client: the gateway exposes no rate-limit headers; keep exploration to a few dozen
  sequential calls. `STIB_API_KEY` is in `C:/Users/tdrev/Projects/next-train-app/.env.local` —
  copy it into the worktree, never print or commit it, delete the copy before committing.

If Part A finds a genuine way to show more live departures (target: ≥4 per direction or ≥25
minutes ahead at Arts-Loi and Simonis), implement it, skip Part B, and say so.

## Part B — only if Part A genuinely finds nothing: labelled scheduled tail ("Option 1")

Tim's fallback decision (20 Sep 2026), which amends the standing rule's wording from "no scheduled
times" to "**scheduled times are never presented as live, and never shown when live data is
unavailable**":

- The live rows stay exactly as they are. **After** the last live row for a direction, append
  later departures from STIB's static GTFS timetable, each carrying an explicit
  scheduled marker in the contract (use the existing per-trip field the static-join cities use
  to distinguish a trip with no realtime update, if one exists; otherwise add one and document
  it in `lib/providers/contract.js`) so the UI can style it as scheduled. Never merge a
  scheduled row in *before* or *between* live rows; never let a scheduled row duplicate a live
  one (dedupe on line + direction + time window).
- **Only while the live feed is healthy**: if the Waiting Times call fails, is rate-limited, or
  returns nothing for the station, the board refuses exactly as today — the tail is never a
  fallback. Gate-prove this.
- Static GTFS must be loaded the way the AU static-join cities do it (snapshot cache, freshness
  safeguards per `docs/jim-brief-gtfs-snapshot-freshness.md`) — not a cold multi-second zip load
  on the request path (that is what made Boston's board take 30–60 s).
- Check how `public/` renders a trip flagged scheduled today (the static-join cities must already
  have a treatment). If there is no visible distinction, say so in the PR and stop short of
  shipping the tail — an unlabelled tail is exactly what the rule forbids. Any new copy is
  Tim's to approve.
- Horizon cap: tail up to 60 minutes ahead or 6 departures per direction, whichever is first.

## Part C — SNCB directions in the rider-facing API (do regardless)

Surface SNCB/NMBS departures at the shared stations (Gare Centrale, Gare du Midi, Gare de
l'Ouest) through `/api/directions`, `/api/board` and `/api/next-train`, as their own direction
entries, never merged into a metro direction (doNotGroup-by-mode). Direction model for SNCB: follow
how other cities label national rail at shared stations (Stockholm/Malmö/Oslo — destination
station, with train type where the existing pattern shows it, e.g. "IC + Oostende"); too many
distinct destinations is a real risk at Central/Midi — propose and implement a sensible grouping
(the UK Darwin regions solved the same problem; look at how `public/city-directions/*.json` and
the Darwin directions builder do it) and flag the choice for Tim. iRail gives roughly an hour of
live departures, so these rows will also have a proper horizon. Keep `partial: true` behaviour
when iRail is down. Fix `coverage.json` to match reality.

## Acceptance
- Handoff contains the Part A evidence (requests tried, what came back) and a plain conclusion.
- Either Part A's improvement or Part B's tail is live-verified at Arts-Loi, Simonis and Gare
  Centrale; in both cases STIB down ⇒ refusal, gate-proved offline.
- `/api/directions` at Gare Centrale lists SNCB directions separately from metro; a metro-only
  station lists none; no Eurostar/TGV/Nightjet/etc. direction can appear.
- `/api/board` at Arts-Loi and Gare Centrale responds in under 3 s cold locally.
- `node qa/brussels-dogfood-gate.mjs`, `node qa/coverage-notes-gate.mjs`,
  `node qa/live-city-lists-sync.mjs`, `node qa/run-all.mjs --smoke` pass.

## Mechanics
- Lane lock: `node qa/lane-lock.mjs check belgium`, then `acquire belgium brussels jim <branch>`.
- Branch from up-to-date `origin/master`. Do not change Brussels's `status`.
- lib/ code reached from api/ must not use bare npm imports (breaks in the Vercel bundle).
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read. Foreground
  commands with explicit timeouts only — no background processes, sleeps or poll loops.
- Commit, push, open a PR that links this brief and states in its first line which of Part A /
  Part B was built. Do not merge.
