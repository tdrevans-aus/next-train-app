# Jim brief — tube termini: show arrivals and say why, instead of "No upcoming trains"

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises shared-UI changes
(`public/app.js`, `public/nearby-mode.js`), an additive API change if one proves necessary, the
generated bundles, and `qa/`.

tim-review: no — Tim chose this approach in chat on 7 Sep 2026, explicitly over the alternative of
deriving estimated departure times. Do not implement derivation; see "Why not derive" below.

## Problem

At a tube terminus, TfL's `/Arrivals` publishes essentially no forward departures. Measured live,
7 Sep 2026:

```
Walthamstow Central (Victoria)  29 terminating | 1 departing
Brixton (Victoria)              30 terminating | 1 departing
Morden (Northern)               27 terminating | 1 departing
Epping (Central)                10 terminating | 0 departing
```

Each of these stations correctly offers only onward directions (Walthamstow Central offers
"Victoria Brixton"; Brixton offers "Victoria Walthamstow Central"). So a rider standing at the
Victoria line's northern terminus selects the only sensible direction and sees
**"No upcoming trains"**, while ~29 trains that will shortly depart in exactly that direction sit
on the board as terminating arrivals.

This is the same walk-up-rule failure as `26eccfb` and `d91e122` — a real, boardable service
silently vanishing — but it is **not** a normalisation bug and has no data fix:
`ArrivalDepartures` does not exist for 940G tube stops.

## Why not derive estimated departures

The obvious fix — departure = terminating arrival + dwell — was considered and rejected by Tim.
Dwell cannot be validated from available data: correlating `vehicleId` across the two directions in
a single snapshot gives essentially zero overlap (one match across four termini, and it produced a
nonsensical **-53 second** dwell). Publishing ~29 estimated times built on an unverified constant,
at stations where trains run every 2-3 minutes, would look authoritative and be wrong — a worse
failure than an empty board. **Do not invent or estimate departure times anywhere in this change.**

## Required behaviour

When a selected direction has no upcoming departures **and** the board holds trips on the same line
terminating at this station, show those terminating arrivals with their real times, clearly
labelled as arrivals rather than departures, together with a short explanation that the operator
does not publish departure times from this terminus.

Detection must be **data-driven, not a station list** — a hardcoded list of termini will rot as
the catalog grows. The signature is: zero matching upcoming trips for the chosen direction, plus
one or more trips on that line whose destination is this station itself.

Preserve the genuine empty case: when there are no trips at all (late at night, or a real service
gap), "No upcoming trains" stays exactly as it is. Distinguishing these two is the core of the
change — getting it wrong turns a correct empty board into a confusing one.

## Determine before you build

The API may not currently expose terminating arrivals to the client: `buildNextTrainResponse`
receives trips already filtered to the chosen direction. Establish whether the terminating rows
reach the client at all. If they do not, any response change must be **additive and optional** — a
new field that existing consumers ignore — not a reshaping of `upcoming`/`next`/`following`. Say in
the PR which route you took and why.

Three UI sites render this state and must stay consistent: `public/app.js:3912`,
`public/app.js:4148`, `public/nearby-mode.js:2409`.

## Acceptance criteria

1. At Walthamstow Central, Brixton, Morden, Epping, Cockfosters and High Barnet, the offered
   direction no longer shows a bare "No upcoming trains"; it shows the terminating arrivals with
   real times plus the explanation.
2. No estimated, derived, or invented departure time appears anywhere. Arrival times are presented
   as arrivals.
3. A genuinely empty board — no trips at all — still shows "No upcoming trains", unchanged.
4. **No behaviour change for any other live region.** This logic is shared across all 33+ live
   cities. Verify a sample spanning modes and countries (a GTFS city, a Darwin city, an AU city)
   and show that their boards are byte-identical before and after.
5. Any API response change is additive and optional; the bundle is rebuilt if the client bundle's
   dependency graph is touched.

## QA

- Add fixture-backed coverage for the three states: terminus-with-arrivals-only, genuinely empty,
  and normal board with departures. Prefer extending an existing gate over a parallel script;
  `qa/uk-london-tfl-direction-match.mjs` is the natural home if the state is reachable from its
  fixtures, otherwise say why a new script was needed.
- Run the gates you touch plus `node qa/bundle-freshness.mjs` and `node qa/run-all.mjs --smoke`,
  all in the FOREGROUND, to completion. Do not run the full suite.

## Handoff

Commit, push, open a PR linking this brief with before/after output for at least three of the six
named stations plus one unaffected region. Record a board-eligibility verdict per
`docs/board-eligibility-rule.md`: the service is not excluded, it is displayed as arrivals because
the operator publishes no departure times. Do not commit `docs/expansion-tracker/lane-locks.json`.
Leave no background sleep, poll, or watch loops running.

---

# Copy revision — 8 Sep 2026, Tim's decision

Replace the `arrivalsOnly.message` string with:

```
Trains terminate here. Departure times aren't published — these are arrivals.
```

Two reasons the original ("This is the end of the line here — the operator doesn't publish
departure times from this stop. Times below are arrivals.") had to change:

1. **It can be factually false.** The detection is data-driven, so it fires wherever trips
   terminate at the station — including mid-route reversing points. Mark found a live example at
   **Queen's Park** (Bakerloo), where short workings terminate alongside trains continuing to
   Harrow & Wealdstone. "This is the end of the line here" is simply wrong there. "Trains terminate
   here" is true at both a real terminus and a short-working reversal, because in both cases those
   specific trains do terminate.
2. Tim asked for it shorter.

The new wording is also deliberately agnostic about an open question: whether TfL publishes no
departures because there are none, or because it simply doesn't publish them. Evidence so far
favours the latter — Walthamstow Central published exactly one real departure towards Brixton
(23s out) alongside 29 terminating arrivals at 17:05 BST on 7 Sep — but this is not yet proven. A
downstream-correlation test (do a terminus's terminating arrivals reappear at the next station down
the line?) will settle it during a live service window; the London tube had stopped for the night
when it was attempted. **Do not run that test or act on it in this PR** — it is the top-level
session's, and the wording above holds either way.

Keep everything else in the change as merged-ready: the additive `terminatingTrips`/`arrivalsOnly`
API shape, the data-driven detection, and the no-derived-times guarantee are all QA-green.
