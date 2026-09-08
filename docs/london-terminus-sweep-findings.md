# London terminus sweep — placeholder-timing / unreachable-direction audit

**Ran against:** current master, commit `26eccfb` (London Overground terminus fix) +
`f6053bb` (Tramlink duplicate-stop dedupe), live TfL Unified API, `TFL_APP_KEY` from
`.env.local`.

**When:** Monday 7 September 2026, ~15:16-15:45 Europe/London — a normal weekday mid-afternoon,
every mode in the region running a standard service pattern (not a quiet late-night window).

**Rate limiting:** paced at 450-600ms between requests (raw fetch, then board fetch, then an
inter-station delay), with 429 retry/backoff (2s/4s/6s, then give up and mark the station
rate-limited rather than reporting it as a defect). Zero 429s were hit across the full
47-station sweep plus about 30 follow-up spot-check requests used to root-cause specific rows —
no result in this report is a rate-limit artifact.

**Candidates:** derived programmatically (not hand-copied) from
`public/city-directions/uk-london-tfl.json`: a station S is a terminus candidate when some
published direction string is "Line S" and S is itself a key in the file. This run's
derivation found 47 candidates, not the 43 quoted in the brief — the brief's count undercounts
the DLR spur termini (Bank, Beckton, Lewisham, Stratford, Stratford International, Tower Gateway,
Woolwich Arsenal weren't all in its example list). Doesn't change any conclusion below. Script:
`qa/uk-london-terminus-sweep-probe.mjs` (throwaway, not registered in `qa/run-all.mjs`).

## Headline finding: the merged fix (#343 / 26eccfb) does not fix most of its own target set —
## a second, un-caught normalization gap

Jim's brief called out stripping the trailing " (London)" parenthetical suffix (e.g.
"Richmond (London)" -> "Richmond") and asked to check the whole region for other
"(London)"-style National-Rail-flavoured destinationNames and handle the class, not just
this one string. TfL also disambiguates the other way — a leading "London " prefix
("London Liverpool Street", "London Euston") — and that form is not stripped anywhere in
applyDestinationAliases. Live board dumps, right now on master:

```
Cheshunt:         { "Weaver London Liverpool Street": 4 }   offered: "Weaver Liverpool Street"
Chingford:        { "Weaver London Liverpool Street": 8 }   offered: "Weaver Liverpool Street"
Enfield Town:     { "Weaver London Liverpool Street": 6 }   offered: "Weaver Liverpool Street"
Walthamstow Ctl:  { ..., "Weaver London Liverpool Street": 8, ... } offered: "Weaver Liverpool Street"
Watford Junction: { "Lioness London Euston": 8 }             offered: "Lioness Euston"
```

Every one of these is a real, currently-running, correctly-timed departure (the endpoint-routing
fix worked — these are ArrivalDepartures rows with real spaced departure times, not the
2-second placeholder). But "Weaver London Liverpool Street" never equals the catalogs
"Weaver Liverpool Street", so pickUpcomingTrips returns zero for the only (or only remaining)
offered direction at four stations, and a fifth (Walthamstow Central) loses one of its two
directions the same way. This is the identical walk-up failure Barking Riverside had — a rider at
Cheshunt selecting "Weaver Liverpool Street" today gets "No upcoming trains" while 4 real trains
are 14-59 minutes out — except this one shipped inside the PR for the exact defect class the
brief told Jim to check for.

Barking Riverside and Gospel Oak themselves are unaffected only because "Gospel Oak" and
"Barking Riverside" are not ambiguous station names elsewhere in Britain, so TfL/NR never prefixes
them. Any Overground/Elizabeth-line terminus whose name is ambiguous nationally (Liverpool
Street, Euston, and likely others not sampled here) inherits this gap.

## Table — all 47 candidates

| Station | Naptan prefix | Modes | Directions offered | Reachable | Unreachable | Raw /Arrivals rows | Board trips | Placeholder clustering (raw) |
|---|---|---|---|---|---|---|---|---|
| Aldgate | 940G | tube | 1 | 1 | - | 19 | 15 | no |
| Amersham | 940G | tube | 4 | 0 | Metropolitan Aldgate; Metropolitan Chesham; Metropolitan Uxbridge; Metropolitan Watford | 6 | 2 | no |
| Arsenal | 940G | tube | 4 | 2 | Piccadilly Heathrow Terminal 4; Piccadilly Heathrow Terminal 5 | 18 | 18 | no |
| Bank | 940G | dlr | 14 | 8 | DLR Beckton; DLR Stratford; DLR Stratford International; DLR Tower Gateway; DLR Woolwich Arsenal; Waterloo and City Waterloo | 5 | 40 | no |
| Barking | 910G | overground | 6 | 5 | District Wimbledon | 16 | 38 | no |
| Barking Riverside | 910G | overground | 1 | 1 | - | 8 | 8 | no |
| Beckenham Junction | 940G | tram | 4 | 0 | Tram Elmers End; Tram New Addington; Tram West Croydon; Tram Wimbledon | 3 | 3 | no |
| Beckton | 940G | dlr | 6 | 1 | DLR Bank; DLR Lewisham; DLR Stratford; DLR Stratford International; DLR Woolwich Arsenal | 3 | 1 | no |
| Brixton | 940G | tube | 1 | 0 | Victoria Walthamstow Central | 23 | 10 | no |
| Chesham | 940G | tube | 4 | 0 | Metropolitan Aldgate; Metropolitan Amersham; Metropolitan Uxbridge; Metropolitan Watford | 3 | 2 | no |
| Cheshunt | 910G | overground | 3 | 0 | Weaver Chingford; Weaver Enfield Town; Weaver Liverpool Street | 9 | 4 | yes (London Liverpool Street Rail Station x4) |
| Chingford | 910G | overground | 3 | 0 | Weaver Cheshunt; Weaver Enfield Town; Weaver Liverpool Street | 16 | 8 | yes (London Liverpool Street Rail Station x8) |
| Clapham Junction | 910G | overground | 2 | 1 | Mildmay Richmond | 20 | 12 | yes (Stratford (London) Rail Station x6, Dalston Junction Rail Station x5) |
| Cockfosters | 940G | tube | 3 | 0 | Piccadilly Heathrow Terminal 4; Piccadilly Heathrow Terminal 5; Piccadilly Uxbridge | 20 | 8 | no |
| Crystal Palace | 910G | overground | 4 | 1 | Windrush Clapham Junction; Windrush New Cross; Windrush West Croydon | 16 | 8 | yes (Highbury & Islington Rail Station x8) |
| Ealing Broadway | 910G | elizabeth-line | 2 | 0 | Central Epping; Central West Ruislip | 40 | 47 | no |
| Edgware | 940G | tube | 3 | 0 | Northern High Barnet; Northern Mill Hill East; Northern Morden | 18 | 10 | no |
| Elmers End | 940G | tram | 4 | 0 | Tram Beckenham Junction; Tram New Addington; Tram West Croydon; Tram Wimbledon | 3 | 3 | no |
| Enfield Town | 910G | overground | 3 | 0 | Weaver Cheshunt; Weaver Chingford; Weaver Liverpool Street | 11 | 6 | yes (London Liverpool Street Rail Station x6) |
| Epping | 940G | tube | 2 | 0 | Central Ealing Broadway; Central West Ruislip | 9 | 5 | no |
| Euston | 940G | tube | 4 | 4 | - | 45 | 45 | no |
| Gospel Oak | 910G | overground | 4 | 4 | - | 54 | 46 | yes (Barking Riverside x8) |
| Heathrow Terminal 4 | 940G | tube | 3 | 0 | Piccadilly Cockfosters; Piccadilly Heathrow Terminal 5; Piccadilly Uxbridge | 4 | 21 | no |
| Heathrow Terminal 5 | 940G | tube | 3 | 0 | Piccadilly Cockfosters; Piccadilly Heathrow Terminal 4; Piccadilly Uxbridge | 0 | 8 | no |
| High Barnet | 940G | tube | 3 | 0 | Northern Edgware; Northern Mill Hill East; Northern Morden | 26 | 10 | no |
| Highbury & Islington | 940G | tube | 9 | 7 | Windrush Clapham Junction; Windrush New Cross | 13 | 67 | no |
| Lewisham | 940G | dlr | 6 | 1 | DLR Beckton; DLR Stratford; DLR Stratford International; DLR Tower Gateway; DLR Woolwich Arsenal | 4 | 1 | no |
| Liverpool Street | 910G | elizabeth-line | 3 | 3 | - | 47 | 84 | no |
| Mill Hill East | 940G | tube | 3 | 0 | Northern Edgware; Northern High Barnet; Northern Morden | 2 | 2 | no |
| Morden | 940G | tube | 3 | 0 | Northern Edgware; Northern High Barnet; Northern Mill Hill East | 29 | 11 | no |
| New Addington | 940G | tram | 4 | 1 | Tram Beckenham Junction; Tram Elmers End; Tram Wimbledon | 4 | 4 | no |
| Richmond | 940G | tube | 3 | 0 | District Ealing Broadway; District Upminster; District Wimbledon | 16 | 3 | no |
| Ruislip | 940G | tube | 5 | 1 | Metropolitan Aldgate; Metropolitan Amersham; Metropolitan Chesham; Metropolitan Watford | 5 | 3 | no |
| Stanmore | 940G | tube | 1 | 0 | Jubilee Stratford | 22 | 8 | no |
| Stratford | 940G | dlr | 17 | 4 | DLR Bank; DLR Beckton; DLR Lewisham; DLR Stratford International; DLR Tower Gateway; Elizabeth Abbey Wood; Elizabeth Heathrow Terminal 4; Elizabeth Heathrow Terminal 5; Elizabeth Reading; Elizabeth Shenfield; Jubilee Stanmore; Mildmay Clapham Junction; Mildmay Richmond | 9 | 27 | no |
| Stratford International | 940G | dlr | 6 | 1 | DLR Bank; DLR Beckton; DLR Lewisham; DLR Stratford; DLR Tower Gateway | 4 | 1 | no |
| Tower Gateway | 940G | dlr | 6 | 1 | DLR Bank; DLR Lewisham; DLR Stratford; DLR Stratford International; DLR Woolwich Arsenal | 6 | 1 | no |
| Upminster | 910G | overground | 4 | 1 | District Ealing Broadway; District Richmond; District Wimbledon | 8 | 10 | yes (Romford Rail Station x4) |
| Uxbridge | 940G | tube | 4 | 0 | Metropolitan Aldgate; Metropolitan Amersham; Metropolitan Chesham; Metropolitan Watford | 17 | 5 | no |
| Walthamstow Central | 910G | overground | 5 | 1 | Victoria Brixton; Weaver Cheshunt; Weaver Enfield Town; Weaver Liverpool Street | 17 | 31 | no |
| Waterloo | 940G | tube | 9 | 6 | Northern Edgware; Northern Morden; Waterloo and City Bank | 38 | 38 | no |
| Watford | 940G | tube | 4 | 0 | Metropolitan Aldgate; Metropolitan Amersham; Metropolitan Chesham; Metropolitan Uxbridge | 5 | 2 | no |
| Watford Junction | 910G | overground | 1 | 0 | Lioness Euston | 16 | 8 | yes (London Euston Rail Station x8) |
| West Croydon | 910G | overground | 8 | 3 | Tram New Addington; Tram Wimbledon; Windrush Clapham Junction; Windrush Crystal Palace; Windrush New Cross | 10 | 13 | no |
| West Ruislip | 940G | tube | 2 | 0 | Central Ealing Broadway; Central Epping | 10 | 5 | no |
| Wimbledon | 940G | tram | 7 | 0 | District Ealing Broadway; District Richmond; District Upminster; Tram Beckenham Junction; Tram Elmers End; Tram New Addington; Tram West Croydon | 6 | 15 | no |
| Woolwich Arsenal | 940G | dlr | 6 | 1 | DLR Beckton; DLR Lewisham; DLR Stratford; DLR Stratford International; DLR Tower Gateway | 6 | 1 | no |

Raw row counts are from a single /Arrivals fetch against the stations primary naptanId; for
hub stations that fold several platform-level naptanIds into one board (Bank, Waterloo, Highbury &
Islington, Euston — see docs/jim-brief-london-tram-duplicate-stops.md), board trips is
correctly larger than raw rows because the board fetch queries every folded-in id and this
probes raw fetch queries only one. Treat raw-vs-board deltas at those specific stations as a probe
limitation, not a row-loss finding — signature 3 is only meaningful at single-naptan stations.

## The three signatures

1. Unreachable direction (per-direction, live, this sweep). 34 of 47 stations have at least one
offered direction with zero matching trips at time of sweep. Re-checked several minutes later,
some flip to reachable (Highbury & Islington's Windrush pair, for instance) purely because that
direction's next train had not entered the roughly 2hr prediction horizon yet at the first probe —
normal headway noise, not a defect. Others (the "London "-prefix set above, and Amersham below)
are reproducible and structural. Signature 1 alone cannot tell the two apart; it is the trigger
for looking, not the verdict.

2. Placeholder timing (raw /Arrivals, 3+ rows same destination within a few seconds). Fired at
exactly the stations already diagnosed in #343 — Cheshunt, Chingford, Clapham Junction, Crystal
Palace, Enfield Town, Gospel Oak, Upminster, Watford Junction — all National-Rail-backed
Overground termini, all now routed away from /Arrivals by usesArrivalDepartures(), so this
signature confirms the raw endpoint is still broken exactly as diagnosed but no longer reaches
these boards. It fired at zero tube/DLR/tram/Elizabeth-line stations in this sweep.

3. Row loss (raw rows vs board trips, by destination). Unreliable across hub stations, for the
reason noted under the table. At single-naptan true stub termini it is stark in a different way
than diagnosed for Overground: High Barnet, Edgware, Mill Hill East, Morden (Northern line);
Beckenham Junction, Elmers End, New Addington (Tram); Beckton, Lewisham, Tower Gateway, Stratford
International, Woolwich Arsenal (DLR) all return raw /Arrivals rows that are almost entirely
self-terminating (destinationName equals the station itself) with few or zero rows for any
onward/departing direction — e.g. all 30 raw rows at High Barnet are "High Barnet Underground
Station". This is not clustered-near-zero placeholder timing (signature 2) — it is closer to no
usable departure data being published for the reversing direction at all, at that instant. A
follow-up spot check at Edgware a few minutes later caught one real "Morden via Bank" row at
timeToStation: 14 (a single train, about to depart, already inside the same near-zero-second
window the Overground bug exhibits) — so the underlying mechanism looks like the same defect
family as signature 2, just with N=1 flickering row instead of a scheduled batch of 8, because
these reversal-worked termini run one train at a time rather than Overground's forward-published
timetable. This was not confirmed as a live board defect across the full set in the time
available — DLR spur termini in particular could just be genuinely low-frequency branches (raw
row counts of 3-9 total are consistent with an off-peak DLR shuttle, not necessarily a bug).
Flagged as an open item, not a confirmed finding, except where corroborated below.

## Confirmed defects (root-caused, not just observed)

1. "London " prefix not stripped (new, live, on master right now) — Cheshunt, Chingford,
Enfield Town, Walthamstow Central (partial), Watford Junction. Hard fail under
docs/board-eligibility-rule.md: a real, correctly-timed walk-up service is invisible on the
only (or only remaining) offered direction. Same severity class as the Barking Riverside bug
this PR was meant to close. Fix belongs in applyDestinationAliases in
lib/train-times-core.js — a leading /^London\s+/i strip alongside the existing trailing
\s+\(London\)$ one, mirroring the existing "handle the class, not just this string" guidance
from the original brief.

2. "Check Front of Train" swallows the whole destination at true stub termini (new, live).
At Amersham, 6 of 8 raw rows have no destinationName at all and towards: "Check Front of
Train". parseTflArrival's compassOrUnknown branch falls back to towards ("Check Front of
Train"), then normalizeDestination's .replace(/check front of train/i, "") strips it to an
empty string, leaving only the bare line name ("Metropolitan") as the trips destination —
which can never equal any offered direction ("Metropolitan Aldgate" etc). These are real
trains 90 seconds to 24 minutes out at Amersham, silently unmatched by every direction the
station offers. Same walk-up-rule severity as finding 1.

3. Pre-existing generic/over-broad direction lists — wider than the Tramlink case already
found. The Tramlink finding from the fix work (Addiscombe offering all 5 tram termini
regardless of which serve it) is one instance of a class that also shows up on the Metropolitan
line: Amersham, Chesham, Watford and Uxbridge each offer the other three as directions, but
these are structurally disconnected branches (a train at Amersham can only ever go toward
Aldgate; it cannot reach Chesham, Watford or Uxbridge without a reversal at a junction station
miles away) — raw /Arrivals at all four shows zero rows ever destined for a sibling branch,
consistent with genuine topological impossibility rather than a live-board bug. This is a data
fix (the direction catalog), not a code fix — same lane as the Addiscombe finding, same
remediation (Luke's pack, not Jim's adapter).

4. Catalog completeness/accuracy gaps, mirroring the "Gospel Oak missing Suffragette" gap from
the original brief: Upminster's board runs "Liberty Romford" departures but the catalog offers
no Liberty-line direction at Upminster at all; West Croydon's board runs "Windrush Highbury and
Islington" (the line's real other terminus) but the catalog instead offers "Windrush Clapham
Junction", "Windrush Crystal Palace", "Windrush New Cross" — none of which is the terminus
the Windrush line actually reaches from West Croydon. Data-catalog fix, not code.

## 910G/940G split — does not track the defect cleanly

The fixs usesArrivalDepartures() gate is naptanId.startsWith("910G") && modes.includes(
"overground"). This sweep shows that boundary is not where the real defect family lives:

- The Overground/910G set the fix targeted is itself still partly broken — by finding 1
  ("London " prefix), a defect the endpoint-routing change did nothing for because it is a text
  problem, not a timing problem. 5 of the regions Overground termini remain user-visibly broken
  post-fix.
- Elizabeth line (910G, modes excludes "overground", so still routed to /Arrivals) — clean at
  the two stations reliably sampled (Ealing Broadway, Liverpool Street; 0 unreachable
  directions, 0 placeholder signature). But those are not the lines true end termini — the real
  western/eastern ends (Reading, Shenfield, Abbey Wood, the Elizabeth-line legs of Heathrow T4/T5)
  share station names with unrelated Piccadilly-line (940G) tube stops in
  lib/cities/uk-london-tfl/stops.json, and this probe resolves stations by name, so it is very
  likely it silently tested the tube naptanId instead of the Elizabeth-line one at Heathrow T4/T5.
  This is an open gap in the sweep, not a clean bill of health for Elizabeth line termini — a
  naptanId-scoped (not name-scoped) re-probe of Reading/Shenfield/Abbey Wood is the next step
  before concluding Elizabeth line is unaffected.
- Tube and tram (940G) show three separate defect classes of their own (findings 2, 3, and the
  open signature-3 pattern) that have nothing to do with National-Rail backing.

So the split is not the axis the fix should have used. usesArrivalDepartures() narrowly patches
one symptom (placeholder timing) for one slice (NR-backed Overground) of a defect family that is
broader on both axes: broader in symptom (text-normalization gaps, catalog gaps, and a possible
zero-row variant, not just placeholder timing) and broader in scope (tube and tram stub termini
show their own variants; Elizabeth lines true termini are untested).

## Recommendation

Yes, a permanent gate is warranted — findings 1 and 2 are hard walk-up-rule fails sitting on
master right now, and the fixture-backed pattern already exists to catch exactly this class.

Extend qa/uk-london-tfl-direction-match.mjs; do not add a parallel script. It already
asserts (a) every catalog direction matches a parsed trip and (c) no directions departures
cluster within a few seconds — recapture its fixture to include a station showing finding 1
(Cheshunt or Watford Junction) and Amersham (finding 2). Concretely:

- Add a unit-level assertion directly on normalizeDestination/applyDestinationAliases in
  lib/train-times-core.js for both "X (London)" and "London X" inputs — cheapest, most
  direct catch for finding 1, does not need a fixture at all.
- Add a fixture case for a "Check Front of Train"/blank-destinationName row and assert the
  parsed trip is either dropped (not silently reduced to a bare line name that can never match) or
  the offered direction still resolves it — that is a genuine adapter-behavior decision Jim needs
  to make, not something this note should prescribe.
- Leave findings 3 and 4 out of the gate — they are catalog-data correctness, not adapter
  behavior, and belong in Luke's pack / published-network.json review, not a code assertion.
- Leave the signature-3 stub-terminus pattern (High Barnet, Beckenham Junction, DLR spurs) as a
  follow-up live spot-check, not a committed gate, until it is disambiguated from low-frequency
  branches — a fixture snapshot cannot tell "no train due" from "no train ever reported".
- The live sweep itself (qa/uk-london-terminus-sweep-probe.mjs) stays a manual, un-registered
  script per the brief — it needs TFL_APP_KEY and network, so it cannot be part of
  qa/run-all.mjs.

## Files

- Probe script (throwaway, not registered): qa/uk-london-terminus-sweep-probe.mjs
- Raw sweep output: qa/.terminus-sweep-results.json (untracked scratch, not meant to be
  committed)
- Existing fixture-backed gate to extend: qa/uk-london-tfl-direction-match.mjs,
  qa/fixtures/uk-london-tfl/direction-match-arrivals.json
- Adapter: lib/providers/uk-tfl.js (parseTflArrival, parseTflArrivalDeparture,
  usesArrivalDepartures)
- Normalization: lib/train-times-core.js (applyDestinationAliases, normalizeDestination,
  destinationMatchesFilter)
- Direction catalog: public/city-directions/uk-london-tfl.json
- Prior context this sweep builds on: docs/jim-brief-london-overground-empty-direction.md,
  docs/jim-brief-london-tram-duplicate-stops.md

## No fixes made

Per brief: this is a flag-only investigation. No adapter, core, or direction-data file was
changed. Findings 1 and 2 are, in QAs judgement, severe enough (silent loss of a walk-up service
on a live, currently status: "live" region) to warrant a fresh Jim brief promptly rather than
waiting for the next scheduled sweep.

---

## Addendum — top-level verification, 7 Sep 2026 ~16:30. Tube termini are a distinct open defect.

Confirmed while verifying PR #346. At **Walthamstow Central** (`940GZZLUWWL`), the Victoria line's
northern terminus, raw `/Arrivals` returns:

```
 1x  towards="Brixton"              timeToStation: 23
22x  towards="Walthamstow Central"  timeToStation: 166 … 1695   (terminating arrivals)
 1x  towards="Check Front of Train" dest="undefined"   timeToStation: 23
```

TfL publishes **essentially no forward departures** at this terminus — one row, 23 seconds out,
against 22 terminating arrivals with real spread times. A rider at the Victoria line's northern
terminus therefore sees one train or none, depending on timing.

This is the same defect class as Barking Riverside, but on a **940G tube stop**, where
`ArrivalDepartures` is not available — so neither `26eccfb` nor PR #346 reaches it. It confirms
this report's conclusion that the defect does **not** track the 910G/940G split: the endpoint swap
fixed the National-Rail-backed half and the tube half remains open, needing a different remedy.

The `dest="undefined"` / `"Check Front of Train"` row is the second defect root-caused at Amersham,
now confirmed at a second station — evidence it is systematic at stub termini rather than an
Amersham quirk.

**Not yet briefed.** Needs its own investigation: whether any TfL endpoint carries tube terminus
departures, and if none does, what the board should honestly show at such a station. Per
`docs/board-eligibility-rule.md` a walk-up service that exists must not silently vanish, so
"show nothing" is not an acceptable resting state without a recorded verdict.
