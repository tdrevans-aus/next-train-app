# Jim brief — fix-ups from Mark's QA fail on PR #356 (blob snapshot integrity)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Same authorisation as the original
brief: `lib/providers/` (including `lib/providers/gtfs/`), `lib/gtfs-refresh.js`, `scripts/`,
`.github/workflows/`, and `qa/`.

tim-review: no — same approval as `docs/jim-brief-newcastle-stale-snapshot.md`.

Lane lock: touches `lib/providers/` for live cities. Run `node qa/lane-lock.mjs check "Sweden"`
**and** `check "Australia"` first, and acquire before touching shared files.

## Context

PR #356 (branch `newcastle-stale-snapshot`) fixes the Newcastle outage. Mark reviewed it and
returned **FAIL**.

**Read both before starting:**
- `docs/mark-note-newcastle-stale-snapshot.md` — Mark's full note (also a PR comment).
- `docs/jim-brief-newcastle-stale-snapshot.md` — the original brief.

The code changes were judged sound and the smoke suite is clean for the right reason. **Do not
rework the publish guard, the board.js error message, the workflow deletion, or the Vancouver cron
removal.** Four items are open.

## Item 1 — the gate's coverage claim is false (the blocking one)

`qa/gtfs-live-blob-snapshot-integrity.mjs` carries a **hand-maintained `CITIES` array**, and it is
already wrong. Malmö and Uppsala are live, blob-backed cities — both `lib/providers/malmo.js` and
`lib/providers/uppsala.js` call `gtfsFixtureBlobUrl` — and both are silently absent from the gate
*and* from `lib/gtfs-refresh.js`'s refresh pipeline. Brisbane, meanwhile, **is** in the gate's
content check without being blob-backed, so it inspects an inert artifact disconnected from what the
runtime actually reads.

I verified the Swedish blobs by hand: both hold real Samtrafiken data (28MB / 19MB, `feed_version
2026-09-06`, calendars to 2026-12-11). So this is not a second Newcastle — but with no refresh path
those snapshots will expire in December and nothing would have noticed.

**The root cause is the hand-maintained list itself**, which is the same class of defect as the
original outage: a curated list that drifts from reality. Derive the set of blob-backed cities from
the code — the providers that actually call `gtfsFixtureBlobUrl` — intersected with
`status: "live"` in `registry.js`. Adding, flipping or retiring a city must then change the gate's
coverage with no separate edit. Today that set is canberra, gold-coast, malmo, newcastle, uppsala
(amsterdam, rotterdam and vancouver are blob-backed but retired); your derivation should produce
exactly that, and you should assert it rather than hardcode it.

Then decide, and say which in the PR: do Malmö and Uppsala belong in `lib/gtfs-refresh.js`'s
refresh list? If yes, add them. If there is a good reason they are excluded, record it — but
"nobody added them" is not a reason.

## Item 2 — the synthetic-content heuristic fails open

`SYNTHETIC_PUBLISHER_MARKERS` checks one field against five hardcoded substrings, and **passes when
`feed_info.txt` is absent entirely**. A fixture without a `feed_info.txt`, or one published under a
different name, sails through. Make it fail closed: a live city's snapshot with no `feed_info.txt`
is suspicious, not fine. Consider corroborating signals that do not depend on naming — the Newcastle
fixture was 2KB with two trips and a perpetual calendar, against 28MB and real calendars for a
genuine feed. Size, trip count, and an implausibly long calendar span are all harder to fake by
accident than a publisher string.

## Item 3 — the red gate needs a distinguishing marker

Mark's view, which I agree with: ship the gate red rather than hiding the outage, but make a
known-and-tracked failure visually distinct from a new one. A bare FAIL sitting in the smoke output
indefinitely is a FAIL everyone learns to scroll past — and this suite already has a
`PASS (passed on retry)` convention for exactly this kind of nuance. Make Newcastle's expected
failure legible as expected, without suppressing it, and make sure it stops being special
automatically once real data is published rather than needing a follow-up edit.

## Item 4 — correct the factual error in the record

The original brief and PR state that Brisbane's and Gold Coast's calendars both expire 2026-10-28.
Mark checked against `snapshotCalendarRange` — the function the runtime staleness check actually
uses — and found **Brisbane expires 2026-11-09**; only Gold Coast is 2026-10-28. No live city's
calendar expires inside Tim's 27 Sep – 9 Oct absence. Correct this in the PR description. Do not
leave a refuted claim standing in the record of a merged PR.

## Acceptance criteria

1. The gate's covered-city set is derived from code + registry status, not hand-maintained, and
   today resolves to exactly canberra, gold-coast, malmo, newcastle, uppsala.
2. Malmö and Uppsala are covered by the gate, and either added to the refresh pipeline or excluded
   with a recorded reason.
3. Brisbane is no longer content-checked as though it were blob-backed.
4. The synthetic-content check fails closed on a missing `feed_info.txt` and uses at least one
   signal that does not depend on the publisher string.
5. Newcastle's expected failure is distinguishable from a new one and self-clears when real data
   lands.
6. The PR description's calendar-expiry claim is corrected.
7. Everything Mark passed stays passing — publish guard, board.js message, workflow deletion,
   Vancouver removal.
8. `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
   suite. Expect the Newcastle gate to still fail; that is correct until Tim republishes.

## Handoff

Work on the existing branch `newcastle-stale-snapshot` and push to it, updating PR #356 in place. Do
not open a second PR and do not merge. Copy this brief into the branch. Leave a PR comment
summarising the changes so Mark's re-review starts from it. Attempt no credential, blob or
republish operation — that remains Tim's to do.
