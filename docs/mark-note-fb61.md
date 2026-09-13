# Mark QA note — PR #359 (FB-61 branch-reachable chips)

**Verdict: PASS. Recommend merge as a normal (non-flip) bug-fix PR.**

Reviewed against `docs/mark-brief-fb61.md`, `docs/jim-brief-fb61-branch-reachable-chips.md`
(7 acceptance criteria), and independent live/timetable data. Did not settle the Stockholm/Oslo
contradiction by re-reading Jim's reasoning — checked both live myself (see below).

## Acceptance criteria (Jim's brief)

1. **Abbey Road no longer offers DLR Bank/Lewisham.** PASS. Confirmed in code
   (`terminiReachableFromStation` in `lib/cities/uk-london-tfl/marketing-directions.js`) and live:
   TfL `/StopPoint/940GZZDLABR/Arrivals` right now returns only Woolwich Arsenal and Stratford
   International (Beckton absent at sample time — expected, time-of-day, not evidence against it;
   Beckton's reachability is independently documented live in `docs/jim-brief-dlr-dedup-key.md` and
   `docs/london-destination-reconciliation-audit.md`). No Bank, no Lewisham, live or in fixture.

2. **Stockholm Abrahamsberg / Oslo Ammerud no longer offer the named chips — CONTRADICTED, and
   Jim is right.** Independently verified both live, before reading his conclusion in depth:
   - Stockholm: `transport.integration.sl.se/v1/sites/9110/departures?forecast=1200` shows
     `18 → Farsta strand` as an `EXPECTED` (not just cancelled) departure from Abrahamsberg — a
     real, scheduled, currently-running service.
   - Oslo: Entur JourneyPlanner v3 (`NSR:StopPlace:59518`) shows multiple `4 → Bergkrystallen via
     Storo` estimated calls from Ammerud in the next 48h.
   Both chips are genuine. Jim correctly left Stockholm and Oslo untouched. **See "FB-61 ticket
   correction" below.**

3. **No station loses a genuinely reachable chip (the over-trim / reverse-Sydney risk) — PASS,**
   verified independently, not just by trusting the PR's own gate:
   - Ran the new gate: 1,819 London + 442 Stockholm + 356 Oslo chips checked across all 507/153/101
     catalog stations, 0 failures.
   - Cross-checked the fixture's 7 DLR segments station-by-station against TfL's own live
     `Line/dlr/Route/Sequence/all` API programmatically (not the code under test) — every segment's
     station list matches the live API exactly, station-for-station, aside from one cosmetic naming
     variant ("Cutty Sark" vs "Cutty Sark (for Maritime Greenwich)" — same station, not a reachability
     bug). Notably the fixture correctly distinguishes the two DLR corridors that share the same
     terminus pair (Bank↔Lewisham with/without West India Quay) — this is the class of bug a
     termini-only match would miss, and it didn't.
   - Live-sampled 6 more DLR junction/interchange stations (Canning Town, Poplar, Stratford,
     Lewisham, West India Quay) against TfL `/Arrivals`: every live-observed destination at every
     station was a subset of the fixture-predicted chip set — no station showed a live destination
     the fixture doesn't offer as a chip. (Some fixture-predicted chips didn't appear in a given
     live snapshot — expected sampling/frequency variance, not an over-trim.)
   - Canning Town specifically: live observed exactly {Bank, Beckton, Stratford International,
     Tower Gateway, Woolwich Arsenal} — an exact match to the fixture-derived 5-chip set.

4. **New offline gate, proof by construction — PASS.** `qa/branch-reachable-chips-gate.mjs`
   constructs a synthetic two-branch line and shows (a) `terminiReachableFromStation` excludes the
   cross-branch terminus and keeps the same-branch one, and (b) the gate's own independently-written
   `londonChipReachable` checker (reads raw segment/termini JSON directly, does not call
   `terminiReachableFromStation` or `marketingLabelsForStation`) rejects a constructed unreachable
   chip and accepts a constructed reachable one. This is a genuine independent re-derivation, not a
   function agreeing with itself — confirmed by reading the implementation, not just the PR's claim.

5. **No network calls in the gate — PASS.** Read the full gate file and both cities'
   `loadLineMap()` functions; only `readFileSync` against checked-in JSON, no `fetch`/`http`
   anywhere in the gate or its imports.

6. **Sydney untouched — PASS.** Diffed the PR branch against its actual merge-base
   (`fbb5df7`, not master's current HEAD, which has since moved on with unrelated commits) — the
   PR's own 5-file diff touches only `docs/jim-brief-fb61-branch-reachable-chips.md`,
   `lib/cities/uk-london-tfl/marketing-directions.js`, `qa/branch-reachable-chips-gate.mjs`,
   `qa/fixtures/uk-london-tfl/published-network.json`, `qa/run-all.mjs`. No Sydney file, no
   Stockholm/Oslo file.

7. **`node qa/run-all.mjs --smoke`, explicit 600000ms timeout — PASS.** Ran it myself on the PR
   branch (merge-base `fbb5df7` + the one commit): **118 PASS · 0 FAIL · 498s**, matching Jim's
   reported count exactly. `branch-reachable-chips-gate.mjs` ran as part of the smoke tier.

## Lane locks

PR/commit claims United Kingdom, Sweden and Norway were acquired and auto-released. The lock file
is local/gitignored so I can't audit history directly, but `node qa/lane-lock.mjs status` now
shows no lanes locked, consistent with normal auto-release after this branch's work. No collision
evidence found (no other in-flight PR touching the same three cities' shared files).

## FB-61 ticket correction

FB-61 as currently written in `docs/feature-backlog.md` names three cities with the bug. Two of
those three are wrong — independently confirmed against live SL Transport API and Entur
JourneyPlanner data, not just Jim's report. The backlog entry should be corrected to say:

> Found in the 6 Sep 2026 production sweep, but on independent re-verification (10 Sep 2026) only
> the London instance was real. London TfL Abbey Road → `DLR Bank`/`DLR Lewisham`: Abbey Road is on
> the Stratford International–Woolwich Arsenal branch, never Bank or Lewisham — confirmed
> unreachable and fixed in PR #359. The Stockholm (Abrahamsberg → Gröna linjen + Farsta strand) and
> Oslo (Ammerud → 4 + Bergkrystallen) examples from the same sweep do **not** reproduce: live SL
> Transport API and Entur JourneyPlanner data confirm both are genuinely scheduled, reachable
> services, and both cities' existing per-line/per-branch line-map data already models them
> correctly. The 6 Sep sweep's findings for those two cities were false positives — root cause
> not established, but not the `marketingLabelsForStation`-over-offer bug this ticket describes.
> Scope actioned: DLR branch/segment data added to London's `published-network.json`
> (`marketingLabelsForStation` now filters termini through it); Stockholm/Oslo left unchanged; new
> offline gate `qa/branch-reachable-chips-gate.mjs` asserts reachability across all three cities'
> full catalogs and guards against regression in all three, including the two that turned out to be
> non-issues.

Status: **Done** (10 Sep 2026, PR #359) rather than Open — the ticket's remaining scope (an
eligibility-on-live-board gate) was deliberately built offline/deterministic instead, per Jim's
brief, which is the right call and doesn't need to stay open as unfinished scope.

## Also verified

- `status` in `lib/providers/registry.js`: not touched by this PR — not applicable, this is not a
  live-flip PR.
- No stray background processes, dev servers, or port 3000 usage from this review session.

