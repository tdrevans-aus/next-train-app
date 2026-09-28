# Jim brief — Copenhagen: trim the Rejseplanen national static GTFS to Metro + S-tog (+ in-scope DSB) for the request path (cold start 14–19 s)

**Lane:** bug-fix / product mode. **City:** copenhagen, country denmark (acquire the lane lock). **Date:** 28 Sep 2026. **tim-review:** no.

## Symptom (Jim, PR #504 cold-path measurements)
Copenhagen's first `/api/directions`/`/api/board` after a cold start takes ~14–19 s (Rejseplanen's national GTFS, all Danish operators, fetched and parsed on the request path); Dublin ~3.9 s, Melbourne ~2 s after their trims. #504 raised the function limit to 30 s and added a client retry — a bound, not a cure. Vercel cold starts hit real riders.

## Fix
Do what Dublin (#460, scripts/trim-dublin-gtfs.mjs) and Prague (scripts/trim-prague-gtfs.mjs) did: a `scripts/trim-copenhagen-gtfs.mjs` that trims the national zip to the routes/agencies Copenhagen's board-eligibility verdicts mark `in` (Metro M1–M4, S-tog, and the DSB/Öresundståg regional services at the in-catalog stations — read lib/providers/copenhagen.js + lib/providers/rejseplanen.js and docs/copenhagen-d1/ for the exact route set; never trim away an `in` service), publishes it to Blob via the existing publish-gtfs-snapshot workflow (add a one-click Action like Dublin's #453 if needed), and makes the adapter read `gtfsFixtureBlobUrl('copenhagen')` with the existing staleness detection. Keep the RT join unchanged. Add `qa/verify-copenhagen-gtfs-snapshot.mjs` mirroring Dublin's (routes/agencies present, all catalog stations resolve, a live RT join ≥ 20 judgeable trips).

## Acceptance
- Cold `/api/directions` for København H < 5 s on a fresh server (qa/cold-start-directions-gate.mjs bound tightened for Copenhagen); warm unchanged; direction sets and trip counts at København H, Nørreport, Kongens Nytorv identical to master within live noise (Regionaltog chips still present — the #491 gate); `node qa/copenhagen-dogfood-gate.mjs`, `node qa/run-all.mjs --smoke` PLAIN green.
- PR title: "Copenhagen: trimmed GTFS snapshot on Blob (cold start 14–19 s → < 5 s)". Link this brief and #504.
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline; Blob transfer is metered — publish once, don't loop.
