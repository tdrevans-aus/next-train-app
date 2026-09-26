# Jim brief: flip Dublin (Luas) live (Tim's decision, 26 Sep 2026)

**For:** Jim (bug-fix / product mode). This brief authorises the live-list edits a flip needs.
**Decision:** Tim approved in chat on 26 Sep 2026 ("Flip Dublin").

## Evidence (all green)
- Mark QA: PASS with no blockers (`docs/dublin-d1/mark-qa-note.md` on branch `mark/dublin-qa-note`).
  The note says the blob is unpublished; that's out of date, it was published on 26 Sep.
- Static snapshot: GTFS_LUAS.zip → `gtfs/dublin.zip`, 2 tram routes (Red, Green), agency LUAS,
  128 stops (`docs/dublin-d1/ci-snapshot-evidence.md` on `claude/busy-heisenberg-47ovag`; PR #460).
- Live join: NTA GTFS-R v2 TripUpdates matched the snapshot 70/70 (100%), CI run 36236001976
  (PR #464, `qa/dublin-rt-join-check.mjs`).
- `NTA_API_KEY` is set in Vercel production.

## Do
1. Check `node qa/lane-lock.mjs check ireland`, then `acquire ireland dublin jim flip-dublin-live`.
2. Branch `flip-dublin-live` from origin/master. Bring in `docs/dublin-d1/mark-qa-note.md` from
   origin/mark/dublin-qa-note (fix the stale "blob not published" line), plus
   `ci-snapshot-evidence.md` from the brief branch.
3. Flip `dublin` to `status: "live"` and make the live-list additions, following the Copenhagen
   flip (PR #454, merge 46fa00f): registry, live-city-api.js, journey-model.js (PERSISTED_CITY_IDS,
   plus the `ie` country in PERSISTED_COUNTRY_IDS if needed), brisbane-dogfood.js,
   app.js/city-session.js (a new **Ireland** country with a Dublin region, and CITY_BOUNDS),
   `lib/cities/country-regions.js`, and `lib/cities/dublin/coverage.json`, built from the D1
   board-eligibility verdicts. Add CC BY 4.0 attribution wherever other cities' attributions live
   (look for how existing CC BY cities do it; don't invent new UI).
4. Convert `qa/dublin-planned-gate.mjs` into a post-flip gate (or add
   `qa/dublin-dogfood-gate.mjs` mirroring Copenhagen's), keeping it offline-safe.
5. Don't hand-write `public/city-directions/dublin.json`. The top-level session will generate it
   with the write-city-directions workflow on your branch.
6. Run the offline gates, live-city-lists-sync, country-regions-sync-gate and coverage-notes-gate,
   then push `flip-dublin-live`. Don't merge. Report the PR body. No background loops.
