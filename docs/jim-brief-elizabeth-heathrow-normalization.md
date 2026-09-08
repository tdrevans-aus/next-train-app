# Jim brief — Elizabeth line and Piccadilly Heathrow T4/T5: 100% unreachable directions

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises changes to
`lib/providers/uk-tfl.js`, `lib/train-times-core.js`, the generated bundle, and `qa/`.

tim-review: no — Tim approved fixing these as a single PR after the DLR dedup work, on 7 Sep 2026.

Two independent normalisation defects, both **100% failure**, both found by the full-network audit.
Source records: `confirmedNewDefects[0]` and `[1]` in `docs/london-destination-gaps.json`; narrative
in `docs/london-destination-reconciliation-audit.md`.

## Defect 1 — Elizabeth line: `lineName` is literally "Elizabeth line"

10/10 offered Elizabeth directions never match, at every sample.

```
raw destinationName : "Heathrow Terminal 4 Rail Station"
raw lineName        : "Elizabeth line"          <- note the trailing " line"
parsed destination  : "Elizabeth line Heathrow Terminal 4"
offered direction   : "Elizabeth Heathrow Terminal 4"
```

`parseTflArrival` builds `` `${lineName} ${destination}` ``, so every Elizabeth trip carries a
stray " line" token and can never equal the catalog's direction. `lineNameToId` already strips this,
but only for URL construction — never on the display/matching path.

Strip a trailing `/\s+line$/i` from the line-name portion before concatenation, or add the alias.
**Check every other `lineName` TfL emits before choosing**: confirm no line legitimately ends in
"line" such that stripping breaks it, and that the other Overground line names (Mildmay, Windrush,
Weaver, Lioness, Suffragette) are unaffected.

Note while you are here: only **two** catalog stations offer Elizabeth directions at all (Stratford
and Tottenham Court Road), yet many more are served by it — Farringdon returns live
"Elizabeth line Shenfield"/"Elizabeth line Paddington" trips but offers only "Circle". That gap is
**catalog data, Luke's lane — do not fix it here**, but say in the PR that fixing the suffix will
not by itself make Elizabeth reachable at those stations.

## Defect 2 — Piccadilly Heathrow: the terminal number is thrown away

66/66 offered "Piccadilly Heathrow Terminal 4"/"...5" instances across **33 stations** never match.

```
towards         : "Heathrow via T4 Loop"
destinationName : "Heathrow Terminal 4 Underground Station"   <- correct, and discarded
parsed          : "Piccadilly Heathrow"
offered         : "Piccadilly Heathrow Terminal 4" / "... Terminal 5"
```

`parseTflArrival` prefers a non-blank, non-compass `towards` over `destinationName`. For the
Heathrow branch `towards` carries a loop label, and `normalizeDestination`'s
`.replace(/\s+via\s+.*$/i, "")` then strips " via T4 Loop", collapsing both terminals to bare
"Heathrow". `destinationName` would have normalised correctly.

**Do not simply delete the `via` strip** — it is load-bearing for genuine cases such as
"Grange Hill via Woodford" and "Hainault via Newbury Park" on the Central line, which must keep
working. Prefer a catalog-driven rule consistent with the `"London "` prefix fix already in
`d91e122`: when the `towards`-derived destination does not resolve to an offered destination for
that station but `destinationName` does, use `destinationName`. That fixes this class rather than
special-casing two terminal names, and degrades safely when neither resolves.

The 33 affected stations are listed in the gaps JSON under `confirmedNewDefects[1].affectedStations`
— use that list, do not guess.

## Acceptance criteria

1. Stratford and Tottenham Court Road: every offered Elizabeth direction returns matching trips.
2. A representative sample of the 33 Piccadilly stations (include Arnos Grove, Hatton Cross,
   Heathrow Terminals 2 & 3, and Cockfosters): "Piccadilly Heathrow Terminal 4" and
   "Piccadilly Heathrow Terminal 5" both populate, and are **distinguished from each other** — a
   fix that makes both match the same trips is a fail.
3. Central-line `via` destinations still resolve: Grange Hill via Woodford, Hainault via Newbury
   Park.
4. No regression to the three normalisation fixes already merged (`26eccfb`, `d91e122`): trailing
   " (London)", leading "London ", terminus placeholder timings. Spot-check Barking Riverside,
   Gospel Oak, Cheshunt and Mildmay Stratford.
5. No change to `pickUpcomingTrips` or the `/api/next-train` response shape. Rebuild the bundle if
   `lib/train-times-core.js` changes — `qa/bundle-freshness.mjs` will catch you if you forget.

## QA

Extend `qa/uk-london-tfl-direction-match.mjs` (do not add a parallel script) with live-captured
fixtures covering an Elizabeth-line row and both Heathrow terminal rows, plus a Central-line `via`
row as the regression guard. Fixtures must be genuinely captured, not reconstructed — a
reconstructed fixture already cost this workstream a round.

Run that gate, `node qa/bundle-freshness.mjs`, and `node qa/run-all.mjs --smoke` **with an explicit
`timeout: 600000`** (~460-515s), all foreground and to completion. Do not run the full suite.

## Handoff

Commit, push, open a PR linking this brief and the audit. Do not commit
`docs/expansion-tracker/lane-locks.json`. Do not start background waits or poll loops. If port 3000
is held by another session, report it rather than killing it.
