# Jim brief — Brussels + Melbourne snapshots drop feed_info.txt (integrity gate red)

**Lane:** bug-fix / product mode. **Scope:** publish and trim scripts only. **No lane lock needed:** don't
edit `lib/providers/`. **Date:** 25 Oct 2026. **tim-review:** no.

## Symptom

`qa/gtfs-live-blob-snapshot-integrity.mjs` fails on master (and in the full regression, 25 Oct 2026):

- `brussels`: the published GTFS static snapshot (`gtfs/brussels.zip`) looks synthetic. `feed_info.txt`
  is missing from the published zip entirely, so the gate fails closed.
- `melbourne`: the same for `gtfs/melbourne.zip`.

Production boards are fine. At about 00:05 UTC on 25 Oct, Flinders Street had 11 directions and Gare
Centrale had 4. So this is provenance hygiene, not an outage. But the gate exists because of the
Melbourne stale-snapshot outage (6–8 Oct). While it's red, it can't catch a genuinely bad snapshot.

## Cause

- `scripts/publish-brussels-gtfs-snapshot-to-blob.mjs` (~line 61–70) keeps only routes, trips,
  stop_times, stops and calendar, and its comment says `feed_info.txt` is "dropped entirely".
- `scripts/trim-melbourne-gtfs.mjs` `stripToConfig` (~line 61) likewise drops it. Melbourne publishes
  two zips, `melbourne` and `melbourne-vline`, through `scripts/publish-melbourne-gtfs-to-blob.mjs`.
- The Copenhagen and Dublin trims carry `feed_info.txt` through unchanged
  (`trim-copenhagen-gtfs.mjs` ~131/206/216), and they pass.

## Fix

1. Carry the upstream `feed_info.txt` through unchanged in the Brussels publisher and the Melbourne
   trim, for both zips, the same way Copenhagen does. If an upstream feed genuinely has no
   `feed_info.txt`, **don't fabricate one.** Stop, record which upstream it is and what it does provide
   (agency.txt, URL, dates), and propose a gate exception in the PR description for the controller to
   decide.
2. Check `lib/providers/gtfs/static-cache.js` still ignores or handles the extra table (the comment
   says it's unused). There must be no parse-time or memory regression. Melbourne cold boards had to
   stay fast (#511).
3. **Don't upload to Blob yourself.** Prove it offline: run the trim or publish in **dry-run** or
   `--out` mode against the real upstream, and show the produced zip contains `feed_info.txt` with a
   real `feed_publisher_name`. Then run the integrity gate's zip-inspection logic against that local
   zip. Export or reuse a function if needed, without loosening the gate.
4. In the PR description, give the republish command for the controller:
   `gh workflow run refresh-hand-published-gtfs.yml -f cities=brussels,melbourne -f force=true`
   (check the input names). Include a dry-run variant first.

## QA

- Add an offline check, extending the integrity gate's unit coverage or adding
  `qa/snapshot-feed-info-carried.mjs`: the Brussels and Melbourne strip functions given a fixture zip
  *with* `feed_info.txt` output one with it intact. Mutation check: dropping it again fails.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground).
- **Respect the Blob transfer limit** (memory: 10 GB/month Hobby, burned by QA re-downloads in Sep).
  Download each upstream at most twice, and never loop downloads.

Open a PR that links this brief and leave no background loops running.
