# Mark brief — QA review of PR #357 (stop QA/CI burning Blob Data Transfer)

**Lane: QA (flag only).** Do not fix, do not push, do not merge.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/357, branch
  `blob-transfer-reduction`. Check it out with `gh pr checkout 357`.
- `docs/jim-brief-blob-transfer-reduction.md` — the brief Jim worked to, with its seven acceptance
  criteria.

## Background

The Vercel Blob store `next-train-gtfs` was suspended earlier today for exceeding the Hobby plan's
10 GB/month Blob Data Transfer allowance (10.46 GB, 100% from that store). Seven live cities
returned HTTP 500 until it was restored. The cause was our own test traffic:
`lib/providers/gtfs/static-cache.js` caches per-process, so every fresh Node process re-downloaded
every zip — roughly 100 MB per `--smoke` run, on every CI run and every local run.

This PR stops that. It matters because on Pro we now have 100 GB/month rather than 10, and at the
pre-fix rate we would have used 45–60 GB of it with no public users at all.

## What it does

Seven dogfood gates (`sydney`, `brisbane`, `canberra`, `gold-coast`, `newcastle`, `malmo`,
`uppsala`) now check staleness against small local fixtures via a new
`qa/lib/local-gtfs-snapshot.mjs` → `loadGtfsStaticFromDirectory`. Fixtures live at
`qa/fixtures/gtfs-snapshots/<city>/` — 42 files, 23 KB total. A new offline gate
`qa/gtfs-local-snapshot-fixture-freshness.mjs` is meant to prove an expired fixture still throws
through the real code path. `scripts/extract-gtfs-calendar-fixture.mjs` generates fixtures from a
real snapshot.

## The four things that need your judgement

**1. Fixture fidelity — the Australian five are hand-authored.** Malmö and Uppsala were trimmed from
real last-known-good snapshots. The five Australian cities' fixtures were **hand-authored**, because
no real snapshot was retrievable while the store was suspended. Hand-authored test data is exactly
where a gate quietly stops reflecting reality. Check they are labelled as such, that their shape
genuinely matches what the real feeds produce, and say whether you would trust these gates to catch
a real staleness problem in those five cities. If not, say what should replace them now the store is
Active again and real snapshots can be fetched.

**2. Do the gates still fail when they should?** This is the crux of the whole change. Moving a gate
off live data is precisely how a gate becomes decorative. Criterion 6 asked Jim to demonstrate this
by construction for at least one gate — verify he did, and satisfy yourself for the others. A gate
that passes against a fixture no matter what the world is doing has lost its purpose.

**3. The integrity gate's new home.** `qa/gtfs-live-blob-snapshot-integrity.mjs` — the gate that
catches synthetic data like Newcastle's — was moved out of the smoke tier into
`OFFLINE_EXTRA_SCRIPTS`, so it runs on the full/nightly suite via `qa-nightly.yml` rather than every
PR. Confirm it still actually runs somewhere real, on a schedule that would catch a bad publish
within a sensible window, and that moving it has not quietly disabled it.

**4. Merge-order conflict with #356.** Jim copied that gate verbatim from PR #356
(`newcastle-stale-snapshot`, Mark-approved, unmerged) and both PRs touch `qa/run-all.mjs`. Verify
the headers and PR description name exactly what to keep on re-merge, and state plainly which PR
should merge first and what must be checked after.

## Also verify

- Criterion 1's proof: `node qa/run-all.mjs --smoke` performs **zero** blob fetches. Jim used a
  `fetch` spy — reproduce it rather than accepting the claim. The store is Active again, so a
  passing suite no longer proves this on its own.
- No large binary committed. Check the actual sizes.
- Jim's item-3 measurement: he reports 5/5 cache HIT via the real `loadGtfsStatic` path, meaning
  cache misses were **not** the driver — volume of fresh processes was. Sanity-check that
  conclusion, noting it is a single-vantage sample and CI runners hit different edges.
- `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
  suite.
- The FB-64 prod sweep (`qa/prod-sweep.mjs`) must still hit **real production** — it is monitoring,
  not test traffic, and must not have been swept into the fixture change.

## Deliverable

Post a single pass/fail note as a PR comment on #357 via `gh pr comment 357`, with the seven
acceptance criteria checked one by one, your verdict on the four judgement items, and a clear
verdict line. Write the same note to `docs/mark-note-blob-transfer-reduction.md`. Do not merge.
