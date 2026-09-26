# Jim brief: QA nightly red on gtfs-live-blob-snapshot-integrity, cause invisible

**For:** Jim (bug-fix / product mode)
**From:** top-level session, 26 Sep 2026
**tim-review:** no

## Symptom

`QA nightly` (`.github/workflows/qa-nightly.yml`) has failed every night 22–25 Sep 2026.
In run 35968253088 (24 Sep) the only unexpected failure was:

```
gtfs-live-blob-snapshot-integrity.mjs FAIL  exit 1
```

Every other non-PASS row was an already-listed KNOWN-RED script.

## Why we can't see the cause

- The GitHub job log API only returns the last ~5,000 lines. The workflow sets
  `QA_VERBOSE: "1"`, so `[dev-server] GET …` request lines flood the log, and the output of this
  script (which runs early, alphabetically) is gone. Only the summary row survives.
- It can't be reproduced from a Claude cloud sandbox: the egress proxy returns
  `403 CONNECT tunnel failed` for `*.public.blob.vercel-storage.com`, so locally every city
  "fails" with HTTP 403. **A local 403 is the sandbox, not the bug. Don't chase it.**

Suspects, unconfirmed: a city recently moved to blob-backed storage (Brussels #432, Dublin #443)
whose snapshot is missing, or looks synthetic to the gate, or fails the resolved-share check.

## What to do

1. Make failures survive log truncation. In `qa/run-all.mjs`, after the summary table, print a
   "Failure details" section with the last ~60 lines of captured output for each FAIL script
   (not KNOWN-RED, not PASS). It has to come after the summary so it sits at the end of the log.
   Keep the existing output otherwise unchanged.
2. In `qa-nightly.yml`, add a step **before** `npm run test:web:ci` that runs
   `node qa/gtfs-live-blob-snapshot-integrity.mjs` with `continue-on-error: true`, so its full
   output appears in a short, separate step log. Don't change the cron or the main step.
3. If, while reading the gate, you find a real defect you can prove without network access (e.g. a
   city derived as blob-backed that shouldn't be, or a missing coverage entry for Brussels or Dublin),
   fix it. Otherwise, don't guess at the network cause.

## Acceptance

- `node qa/run-all.mjs --smoke` passes.
- A deliberately failing script shows its tail under "Failure details" (demonstrate locally,
  then revert the deliberate failure; don't commit it).
- The workflow YAML is valid, and the new step can't turn the job red on its own.
- The PR links this brief. Leave no background sleep/poll loops running.
