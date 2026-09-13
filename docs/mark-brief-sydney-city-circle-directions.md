# Mark brief — QA review of PR #354 (Sydney City Circle direction chips, FB-62)

**Lane: QA (flag only).** Investigate and report. Do not fix, do not push, do not merge.
This PR is `tim-review: yes` — it waits for Tim regardless of your verdict.

## What to read

- The PR: https://github.com/tdrevans-aus/next-train-app/pull/354, branch
  `sydney-city-circle-directions`. Check it out with `gh pr checkout 354`.
- `docs/jim-brief-sydney-city-circle-directions.md` — the brief Jim worked to, with the five
  acceptance criteria. **Note that this brief contains a factual error** (see item 1); do not treat
  its criterion 2 as authoritative without checking it yourself.

## What it does

Adds a single `CITY_BOUND_LABEL` ("City Circle") as a second marketing end for T2, T3 and T8 in
`lib/cities/sydney/marketing-directions.js`, folds the `City Circle Via …` headsign variants onto
one chip per line via `CHIP_HEADSIGN_GROUPS`, and adds a new gate `qa/sydney-direction-match.mjs`
(registered in `qa/run-all.mjs`). Before the fix, Macarthur offered no direction at all.

## The three things that actually need your judgement

**1. The T6/T7 call — was it right to leave them alone?**
The brief's criterion 2 asked Bankstown and Olympic Park to gain city-bound chips. Jim investigated,
found T6's and T7's entire scheduled headsign population never reaches the City Circle (T6: 1446
Bankstown + 1434 Lidcombe trips, zero City Circle; T7: Olympic Park/Lidcombe/Strathfield/Central
only), and left them unchanged rather than ship a permanently-`next:null` chip. Verify that headsign
analysis independently against the GTFS data. If he is right, the brief was wrong and his call was
correct — say so plainly. If he is wrong, this is a missed half of the fix.

**2. The criterion-3 "live" proof is fixture-backed, not live GTFS-RT.**
Jim had no `TFNSW_API_KEY` in his sandbox. He called the real `/api/next-train` handler with
`VERCEL=1` and argues this is the exact code path production uses regardless of the key, because
`lib/cities/sydney/dogfood-next-train.js` always serves Sydney from the published GTFS-static
fixture blob on Vercel. **Verify that claim about the production code path** — read
`dogfood-next-train.js` and the Vercel path yourself rather than accepting the reasoning. If Sydney
in production really is fixture-served, the proof is representative and criterion 3 is met; if
production ever hits a live feed for Sydney, it is not, and the chips are unproven against real
data. This is the same class of self-reported claim that did not survive review on PR #353, so
check it rather than waive it.

**3. Jim edited an existing gate assertion to accommodate his own change.**
`qa/sydney-dogfood-gate.mjs` carried an assertion that "City Circle is not a terminus chip"; Jim
rescoped it to M1/T1/T4/T5/T9. That may be exactly right — the assertion encoded the very rule this
PR deliberately changes — but a fixer narrowing a gate that would otherwise fail his own change is
worth confirming on its merits. Check the rescoped assertion still has teeth for the five lines it
now covers, and that nothing else it used to catch has quietly stopped being checked.

## Also verify

- Criterion 4: M1/T1/T4/T5/T9 chip lists byte-identical before/after across all 182 catalog
  stations. Jim claims a script diff, not a spot-check — reproduce it.
- Criterion 5: every `City Circle Via X` variant folds onto one chip per line; no picker gains a
  "Via Museum"/"Via Town Hall"/"Via Strathfield" long tail.
- No existing chip label changed or was removed.
- The `/api/next-train` and `/api/directions` response *shapes* are unchanged (new chip values are
  fine; new fields are not).
- Run `node qa/sydney-direction-match.mjs`, `node qa/sydney-dogfood-gate.mjs`, and
  `node qa/run-all.mjs --smoke` with an explicit `timeout: 600000`. Do not run the full untiered
  suite. Jim reported 117 PASS / 0 FAIL after killing a stale `localhost:3000` dev server left by an
  unrelated process — if you hit the same stale listener, say so rather than working around it
  silently.

## Out of scope

The chip *wording* ("City Circle" vs any alternative) is Tim's decision, not a QA finding — Jim
built it as briefed and the label is centralised in one constant. Two recorded notes contradict it
(`lib/cities/sydney/line-map.json:10` and `lib/cities/sydney/published-network.json:36`, "Do not
invent a City Circle terminus chip"); Jim correctly left both untouched. Do not edit them, and do
not treat their existence as a fail — just confirm they are still untouched. FB-61 is a separate
cross-city issue and is not part of this review.

## Deliverable

Post a single pass/fail note as a PR comment on #354 via `gh pr comment 354`, with the five
acceptance criteria checked one by one, your verdict on the three judgement items above, and a clear
verdict line. Write the same note to `docs/mark-note-sydney-city-circle-directions.md` so the path
can be handed to a follow-up Jim if you fail it. Do not open a fix PR and do not merge.
