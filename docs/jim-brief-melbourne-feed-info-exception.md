# Jim brief — integrity gate: Melbourne exception for a missing feed_info.txt (Tim, Option A)

**Lane:** bug-fix / product mode. **Scope:** QA only: `qa/lib/snapshot-zip-integrity.mjs` (added by #528)
and `qa/gtfs-live-blob-snapshot-integrity.mjs`. **No lane lock** is needed, because there are no
`lib/providers/` edits. **Date:** 25 Oct 2026. **tim-review:** no.

## Tim's decision (25 Oct 2026, in chat)

> "option A for melbourne is fine"

Option A, as Jim proposed in #528: accept a missing `feed_info.txt` **for `melbourne` and
`melbourne-vline` only**, when agency.txt names a real agency and every other structural signal passes.

## Background

#528 made the Brussels and Melbourne publishers carry `feed_info.txt` through. Transport Victoria's
statewide upstream ships **no** `feed_info.txt` in either folder (metro folder 2, V/Line folder 1). The
gate fails closed on a missing `feed_info.txt`, so Melbourne stays red after any republish. agency.txt
names one agency, "Transport Victoria" (`https://transport.vic.gov.au/…`, Australia/Melbourne), and the
calendars are real (30 metro rows, 39 V/Line rows).

## Fix

- In the inspection logic, add an explicit, **named** exception list (e.g. `FEED_INFO_EXEMPT`) with
  exactly two entries, `melbourne` and `melbourne-vline`. For an exempt city, a missing `feed_info.txt`
  is accepted **only if** all of these hold:
  - `agency.txt` exists;
  - it has at least one row with a non-empty `agency_name` that doesn't match the synthetic or dogfood
    publisher markers the gate already uses;
  - it has a real `agency_url` (http or https).
  
  Every other existing check still runs unchanged: size, trip count, calendar span, markers.
- **If an exempt city's zip *does* contain `feed_info.txt`, apply the normal checks.** The exception only
  covers absence.
- Each exempt entry carries a comment with the reason and this date, and the reason appears in the gate's
  output (e.g. "melbourne: feed_info.txt absent upstream (Transport Victoria ships none) — accepted via
  agency.txt, Tim 25 Oct 2026").
- No other city changes. Brussels must keep failing closed if its `feed_info.txt` ever disappears again.

## QA

- Offline unit cases in `qa/snapshot-feed-info-carried.mjs` or the integrity helper's tests, built from
  fixture zips (no network):
  - Melbourne without `feed_info.txt` but with a real agency.txt **passes**.
  - Melbourne without `feed_info.txt` and with agency.txt missing or synthetic **fails**.
  - Brussels without `feed_info.txt` **fails**.
  - Melbourne **with** a synthetic `feed_info.txt` **fails**.
- Mutation check: removing the exception makes the first case fail; widening it to all cities makes the
  Brussels case pass, which must turn the check red.
- `node qa/gtfs-live-blob-snapshot-integrity.mjs` against production: Melbourne now passes. Brussels
  passes only after the controller republishes it. That's expected, so say which state you saw.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground).

Don't upload to Blob or trigger workflows. Open a PR that links this brief, and leave no background loops
running.
