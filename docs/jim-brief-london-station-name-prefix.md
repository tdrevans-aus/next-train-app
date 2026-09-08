# Jim brief — London: "London " prefixed destinations leave whole boards empty

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises changes to
`lib/train-times-core.js`, `lib/providers/uk-tfl.js`, `public/city-directions/uk-london-tfl.json`,
the generated bundles, and `qa/`.

tim-review: no

**Severity: live breakage on a `status: "live"` region.** Three stations currently show
"No upcoming trains" for *every* direction they offer, while TfL publishes real services.

## Symptom, verified live on master (`26eccfb`), 7 Sep 2026 ~15:50

```
=== Cheshunt: 5 trips ===        parsed destinations: Weaver London Liverpool Street
  EMPTY  Weaver Chingford  |  EMPTY  Weaver Enfield Town  |  EMPTY  Weaver Liverpool Street
=== Chingford: 8 trips ===       parsed destinations: Weaver London Liverpool Street
  EMPTY  Weaver Cheshunt   |  EMPTY  Weaver Enfield Town  |  EMPTY  Weaver Liverpool Street
=== Enfield Town: 6 trips ===    parsed destinations: Weaver London Liverpool Street
  EMPTY  Weaver Cheshunt   |  EMPTY  Weaver Chingford     |  EMPTY  Weaver Liverpool Street

normalizeDestination("Weaver London Liverpool Street") => "Weaver London Liverpool Street"
```

The board has trips; not one is reachable. This is the same walk-up-rule failure as
`docs/jim-brief-london-overground-empty-direction.md` (merged as `26eccfb`) in a different
disguise: that fix stripped the *trailing* `" (London)"` form, but TfL also emits a **leading**
`"London "` disambiguation prefix on National-Rail-style names — `"London Liverpool Street"` —
which nothing strips. Mark's sweep also reports Watford Junction and a partial failure at
Walthamstow Central; confirm both.

Full context, including the three-signature analysis and the 910G/940G conclusion (the split does
**not** track the defect cleanly): `docs/london-terminus-sweep-findings.md`. Read it first.

## Do NOT fix this with a bare regex

The sweep's own recommendation — "one regex in `applyDestinationAliases`" — is wrong and would
ship a regression. Four catalog stations legitimately begin with `"London "`:

```
London Bridge          London City Airport
London Euston          London Fields
```

A blanket `^London\s+` strip turns `"London Bridge"` into `"Bridge"`, which is not a station, and
breaks those boards. Note the asymmetry that makes this subtle: `"London Euston"` **is** the
catalog name, so TfL emitting it there is correct and must survive untouched, while
`"London Liverpool Street"` must normalise to `"Liverpool Street"` (`"Liverpool Street"` is the
catalog name; `"London Liverpool Street"` is not).

Make the rule **catalog-driven**: strip a leading `"London "` only when the remainder resolves to a
known station in the region catalog **and** the unstripped string does not. Anything you cannot
resolve should pass through unchanged rather than being guessed at. Put the resolution behind the
existing catalog helpers rather than hardcoding a station list that will rot.

## Second defect in the same area — verify, then fix or split

The findings doc root-causes a `"Check Front of Train"` destination-swallowing bug at true stub
tube termini, with raw evidence captured at Amersham. `parseTflArrival` already has a
`check front of train` branch, so establish what actually happens before changing it. If fixing it
alongside the prefix work keeps the change coherent, do both in this PR; if it turns out to be a
genuinely separate mechanism, fix the prefix bug here and say clearly in the PR that the
Check-Front-of-Train defect needs its own brief. Do not leave it silently unaddressed either way.

## Out of scope — do not widen into these

The findings doc also lists over-broad Metropolitan-branch direction cross-listing and catalog
completeness gaps at Upminster and West Croydon. Those are direction/catalog **data** problems
(Luke's lane), not adapter bugs. Leave them; note them in the PR so they are not lost.

## Acceptance criteria

1. Cheshunt, Chingford, Enfield Town, Watford Junction and Walthamstow Central return non-empty,
   correctly-timed boards for every direction their real service supports.
2. `"London Bridge"`, `"London City Airport"`, `"London Euston"` and `"London Fields"` still
   resolve correctly — verify each explicitly, live or by fixture, and show the output.
3. No regression to the trailing `" (London)"` handling from `26eccfb`: Mildmay Stratford,
   Barking Riverside → Gospel Oak, Gospel Oak and Woodgrange Park all still populate.
4. No change to `pickUpcomingTrips`' `trip.liveDeparture > now` filter, and no reintroduction of
   `UPCOMING_BOARDING_GRACE_MS` in source or bundle.
5. Any station left with an unreachable offered direction is either fixed or explicitly recorded
   as a data problem with a verdict, per `docs/board-eligibility-rule.md`.

## QA

- Extend `qa/uk-london-tfl-direction-match.mjs` rather than adding a parallel script — it is
  already the fixture-backed direction-reachability gate. Add fixtures covering a `"London "`
  prefixed destination and at least two of the genuinely `"London "`-named stations, so a naive
  regex fix fails the gate.
- Run that gate, `node qa/bundle-freshness.mjs`, and `node qa/run-all.mjs --smoke`, all in the
  FOREGROUND. Do not run the full suite.
- If `lib/train-times-core.js` changes, rebuild the bundle (`npm run build:train-times`) — the
  freshness gate will catch you if you forget.

## Handoff

Commit, push, open a PR linking this brief and `docs/london-terminus-sweep-findings.md`, with
before/after output for the five broken stations and the four "London "-named ones. If port 3000 is
held by another session, report the contention rather than killing processes you did not start.
Leave no background sleep, poll, or watch loops running.
