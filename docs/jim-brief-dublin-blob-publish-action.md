# Jim brief: one-click GitHub Action to publish Dublin's Luas GTFS snapshot

**For:** Jim (bug-fix / product mode). This brief authorises `.github/workflows/` and `scripts/` changes.
**tim-review:** no

## Problem
The Dublin adapter (PR #443, `status: "planned"`) reads its Luas-only static GTFS from Vercel Blob
via `gtfsFixtureBlobUrl("dublin")`. That file has never been published, because doing so needs
`BLOB_READ_WRITE_TOKEN` plus network access to the NTA GTFS download and the blob store, and
Claude sandboxes have neither. Tim has confirmed `NTA_API_KEY` and `BLOB_READ_WRITE_TOKEN` exist in
Vercel. He will copy `BLOB_READ_WRITE_TOKEN` (and `NTA_API_KEY` if the trim needs it) into
**GitHub repo Actions secrets** under the same names.

## Do
1. Add `.github/workflows/publish-gtfs-snapshot.yml`, `workflow_dispatch` only (never on a schedule
   or on push), with a `city` choice input (`dublin` only for now; structure it so others can be
   added). Steps: checkout, set up Node 22, `npm ci`, run `scripts/trim-dublin-gtfs.mjs`, then
   publish the trimmed zip to the path `gtfsFixtureBlobUrl("dublin")` resolves to. Reuse
   `scripts/publish-gtfs-fixture-to-blob.mjs` / `publish-gtfs-snapshot-to-blob.mjs` /
   `publish-brussels-gtfs-snapshot-to-blob.mjs`; don't write a new uploader if one fits. Secrets
   go in via `env:` from `secrets.*`. Never echo them.
2. After upload, the workflow should run `node qa/gtfs-live-blob-snapshot-integrity.mjs`, or the
   Dublin-relevant part of it, so a synthetic-looking or empty snapshot fails the run.
   If the gate only covers live cities, say so and run a small inline check (fetch the published
   URL, confirm HTTP 200, a zip over some sane size, and that stops.txt contains Luas stops).
3. Fail with a clear message when a required secret is missing.
4. Read `scripts/trim-dublin-gtfs.mjs` and check it works headless in CI (paths, whether the NTA
   download needs `NTA_API_KEY`, memory for the ~160MB national zip).
5. Document the one-click steps (Actions tab → workflow → Run, city=dublin) in
   `docs/dublin-d1/jim-handoff.md`, plus the two secrets Tim must add.

## Acceptance
- The YAML parses. The workflow is manual-only and has no effect until someone runs it.
- `node qa/run-all.mjs --smoke` passes, apart from environmental failures (name them).
- The PR links this brief. No background loops.
