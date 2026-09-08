# London: full-network destination reconciliation audit

**Lane:** QA (flag only) -- `docs/mark-brief-london-destination-reconciliation.md`. No adapter, core, or
direction-data file was changed. This report and `docs/london-destination-gaps.json` are the only
deliverables.

**Ran against:** master at `d91e122` (PR #346, leading `"London "` prefix fix, already merged) plus
`26eccfb` (Overground terminus fix). Live TfL Unified API, `TFL_APP_KEY` from `.env.local`.

**When:** Monday 7 September 2026, ~15:28-15:39 UTC (16:28-16:39 BST) -- normal weekday afternoon
service, every mode running a standard pattern. Not a quiet window.

**Rate limiting:** paced 450-600ms between requests. **545 requests, 0 429s** across the full sweep
(every one of the 434 catalog stations). No result below is a rate-limit artifact.

**Method:** for every station in `public/city-directions/uk-london-tfl.json` (434 stations), fetched
raw TfL rows through **the same endpoint the adapter would choose** -- `usesArrivalDepartures`
mirrored exactly, including `alsoNaptanIds` folding, reproducing `fetchStopBoard`'s own per-id
endpoint routing and dedup. Parsed every row through the adapter's own `parseTflArrival` /
`parseTflArrivalDeparture`, then `normalizeDestination`, then matched against the catalog's offered
directions via `pickUpcomingTrips` -- exactly the pipeline a real board request runs. Probe:
`qa/london-destination-reconciliation-probe.mjs` (throwaway, not registered in `qa/run-all.mjs` --
needs `TFL_APP_KEY` and live network, same reason `qa/uk-london-terminus-sweep-probe.mjs` is
unregistered).

---

## Headline: two of the three fixed classes' own bug class recurred elsewhere in the network, at 100%

The three previously-fixed defects (trailing `"(London)"`, placeholder termini timing, leading
`"London "` prefix) are confirmed genuinely closed, network-wide (see §1). But the same underlying
failure mode -- **the text the picker offers and the text TfL's feed actually produces never
line up, and nothing detects it** -- recurs in three more places this pass found, two of them at
**100% failure rate** for every station and every sample taken:

| Finding | Scope | Root cause | Severity |
|---|---|---|---|
| Elizabeth line: every direction unreachable | 10/10 offered instances, 100% | TfL's raw `lineName` is literally `"Elizabeth line"`, not `"Elizabeth"`; nothing strips it | Hard fail |
| Piccadilly Heathrow Terminal 4/5: both directions unreachable | 66/66 offered instances, 100% | `towards` carries `"Heathrow via T4/T5 Loop"`; the `via` strip collapses both terminals to bare `"Heathrow"` | Hard fail |
| DLR: most directions intermittently unreachable | 265/308 offered instances, 86% | TfL's DLR feed reuses the same `id` across genuinely different destinations; the adapter's trip dedup silently drops the losers | Hard fail |

Each is detailed in §2. None of the three are text-normalization edge cases like the earlier three
-- they are structural: a whole line's line-name field, a whole branch's `towards` convention, and a
whole mode's id scheme.

---

## 1. The three previously-fixed classes -- confirmed closed, network-wide

| Class | Fixed in | Verdict this pass |
|---|---|---|
| Trailing `" (London)"` suffix | `26eccfb` | **Closed.** 0 raw or parsed `destinationName` retains the suffix anywhere in 434 stations / 545 requests. |
| `/Arrivals` placeholder termini timing | `26eccfb` (ArrivalDepartures routing) | **Closed.** 0 raw `ArrivalDepartures` rows with real (non-null) timing show a near-identical (<10s spread) cluster of 3+ departures anywhere in the network. (An earlier automated pass of this same check falsely flagged 16 stations -- `new Date(null).getTime()` is `0`, not `NaN`, so terminating-train rows with genuinely absent timing fields were miscounted as a placeholder cluster. Corrected and re-verified: zero real matches.) |
| Leading `"London "` prefix | PR #346 (`d91e122`) | **Closed.** 0 parsed destination anywhere retains an unstripped `"London "` prefix. The 4 legitimate `"London X"` catalog stations (London Bridge, London City Airport, London Euston, London Fields) are unaffected -- confirmed by direct raw evidence at London Euston (152 raw "London Euston Rail Station" rows across 17 originating stations, all correctly stripped to "Euston" for the Lioness direction). |

**On the empirical-safety question raised in the PR #346 review:** the invariant ("the catalog
never lists a `London X`-prefixed form as an offered direction, so the strip guard's `!fullKnown`
branch never fires against a legitimate case") holds across the whole network right now -- confirmed
by the same "0 corrupted `London X` station" result above, not just at the stations PR #346's own
test fixture covers. But it is still empirical, not asserted: `isKnownOfferedDestinationName`
derives its known-set from the direction catalog's *current* contents, so the guard's safety is a
fact about today's `public/city-directions/uk-london-tfl.json`, not a structural guarantee. If a
future catalog edit ever wrote a direction like `"Northern Euston"` at a station near the
tube-only `"Euston"` stop (940GZZLUEUS, a real, separate catalog station from `"London Euston"`,
910GEUSTON) the guard's behaviour wouldn't change (it already treats bare "Euston" as known via the
existing Lioness direction) -- but the *general class* of risk is that the guard's correctness is
never re-verified by an assertion, only observed empirically each time someone happens to run this
audit. Recommend the QA gate (`qa/uk-london-tfl-direction-match.mjs`) add a standing assertion (not
just this one-off audit) that none of the catalog's 4 legitimate `"London X"` station identities
ever appears as a `remainder` that gets stripped -- i.e. assert the invariant, don't just observe it.
This is a QA-lane recommendation, not a code change; flagged for Jim's follow-up brief.

---

## 2. Confirmed new defects (Jim's lane)

### 2a. Elizabeth line -- every offered direction permanently unreachable

TfL's raw `lineName` for the Elizabeth line is the literal string `"Elizabeth line"` (confirmed:
every one of 11 stations with any Elizabeth-line raw row sends exactly this string, no variation).
`lib/providers/uk-tfl.js` builds `fullDestination` as `` `${lineName} ${destination}` ``, so every
parsed trip reads e.g. `"Elizabeth line Heathrow Terminal 4"`, never `"Elizabeth Heathrow Terminal
4"` -- the catalog's offered form. `normalizeDestination` has no rule stripping a trailing `" line"`
token from the line-name portion (`lineNameToId` does this, but only for URL construction, never for
the display/matching path).

Only two catalog stations offer Elizabeth-prefixed directions -- **Stratford** and **Tottenham Court
Road**, 5 each, 10 total. **All 10 show 0 matching trips, always.** Evidence (Tottenham Court Road,
`910GTOTCTRD`): raw `destinationName: "Heathrow Terminal 4 Rail Station"`, `lineName: "Elizabeth
line"` -> parsed `"Elizabeth line Heathrow Terminal 4"` vs offered `"Elizabeth Heathrow Terminal
4"`. Confirmed for all 5 Elizabeth termini (Abbey Wood, Heathrow Terminal 4, Heathrow Terminal 5,
Reading, Shenfield) at both stations.

This is the single cleanest, highest-confidence finding in the whole audit -- a one-line root cause,
100% reproducible, affecting every Elizabeth-line rider on the picker.

### 2b. Piccadilly line -- Heathrow Terminal 4 and Terminal 5 both permanently unreachable

For Piccadilly-line Heathrow-branch trains, TfL's `towards` field carries a branch-loop label
(`"Heathrow via T4 Loop"`, `"Heathrow via T5 Loop"`, `"Heathrow T123 + 5"`), not the terminal name.
`parseTflArrival`'s `compassOrUnknown` check treats any non-blank, non-compass, non-"Check Front of
Train" `towards` as authoritative and uses it *instead of* `destinationName` -- so the branch-loop
text becomes `rawDestination`. `normalizeDestination`'s `.replace(/\s+via\s+.*$/i, "")` then strips
everything from `" via"` onward, collapsing **both** terminals to bare `"Heathrow"`, which matches
neither offered direction. `destinationName` itself (`"Heathrow Terminal 4 Underground Station"` /
`"...5..."`) would normalize correctly if it were used instead.

Confirmed live at Arnos Grove: `towards="Heathrow via T4 Loop"`, `destinationName="Heathrow Terminal
4 Underground Station"` -> parsed `"Piccadilly Heathrow"`. **66/66 offered instances of `"Piccadilly
Heathrow Terminal 4"` / `"Piccadilly Heathrow Terminal 5"` across 33 stations show 0 matches, at
every sample taken** -- Alperton, Arnos Grove, Arsenal, Boston Manor, Bounds Green, Caledonian Road,
Cockfosters, Covent Garden, Finsbury Park, Hatton Cross, Heathrow Terminal 4, Heathrow Terminal 5,
Heathrow Terminals 2 & 3, Holloway Road, Hounslow Central/East/West, Hyde Park Corner, King's Cross
St. Pancras, Knightsbridge, Manor House, North Ealing, Northfields, Oakwood, Osterley, Park Royal,
Russell Square, South Ealing, South Harrow, Southgate, Sudbury Hill, Sudbury Town, Turnpike Lane,
Wood Green.

### 2c. DLR -- widespread intermittent loss from an id collision in the adapter's trip dedup, not a text bug

This one is a different mechanism from 2a/2b: the destination text normalizes fine. The defect is
in `fetchStopBoard`'s `allTripsMap`, which dedupes parsed trips by `trip.id`
(`arrival.id || arrival.vehicleId || ...`). TfL's DLR `/Arrivals` feed sometimes **reuses the same
`id` across rows with genuinely different `destinationName`, `platformName`, and `timeToStation`** --
confirmed live at two stations:

- **Abbey Road** (`940GZZDLABR`): all 6 raw rows share `id: "322784161"` -- 3 rows to Woolwich
  Arsenal, 1 to Beckton, 2 to Stratford International, at 6 different times, 2 different platforms.
  Only 1 trip (Stratford International) survives the dedup; Woolwich Arsenal and Beckton both vanish
  from the board entirely, even though the offered direction `"DLR Woolwich Arsenal"` has real,
  correctly-timed departures in the raw feed.
- **Beckton Park** (`940GZZDLBPK`): all 6 raw rows share `id: "-1340095081"` -- 3 to Tower Gateway,
  3 to Beckton (opposite directions). Only 1 survives.

**265 of 308 (86%) offered DLR-prefixed direction instances showed 0 matching trips at capture
time**, across 44 of the DLR-served catalog stations (full list in the JSON). This is the
largest-by-volume defect in the whole audit and the worst-affected mode. It was not individually
live-verified at all 44 stations -- confirmed directly at 2, inferred at the rest from the same
raw-row-count-vs-parsed-trip-count signature (a gap that shouldn't exist on the `/Arrivals` path,
where every valid rail-mode row with a valid time always parses to a trip). High confidence given the
mechanism is now understood and is a single shared TfL DLR feed quirk, not a per-station one.

**This is not a normalization-lane fix.** The remedy is a dedup key that can't collide across
distinct destinations -- e.g. `naptanId + destinationNaptanId + timeToStation` instead of TfL's raw
`id`/`vehicleId`.

---

## 3. Table A -- normalisation gaps (all distinct raw `destinationName` strings, region-wide)

93 distinct raw strings appeared across the sweep. 35 never resolved to a normalized form that
matches *any* offered direction, anywhere. Of those 35, most (26) are TfL reporting an intermediate
calling point or branch-indicator as `towards`/`destinationName` for a destination the catalog never
offers as a rider-facing direction at all (e.g. `"Central North Acton"`, `"Northern Kennington"`,
`"District Tower Hill"`) -- not a reconciliation defect, since no offered direction is affected; the
string simply isn't a picker choice anywhere. The remaining 9 are the confirmed defects above (the
Elizabeth-line and Piccadilly-Heathrow rows show up here too, tagged distinctly because the exact
*string* match check treats `"Elizabeth line X"` and `"Piccadilly Heathrow"` as never-offered even
though their un-mangled cousins are genuinely offered -- see §2) plus two real catalog gaps:

| Raw `destinationName` | Occurrences | Normalized form | Status |
|---|---|---|---|
| `[towards: "Check Front of Train"]` | 224 (78 stations) | bare line name, e.g. `"District"` | Out of scope -- see §5 |
| `Battersea Power Station Underground Station` | 103 (24 stations) | `"Northern Battersea"` | **New catalog gap** -- see §4 |
| `Dalston Junction Rail Station` | 200 (15 stations) | `"Windrush Dalston Junction"` | Catalog gap, corroborates existing finding -- see §4 |
| `New Cross ELL Rail Station` | 83 (10 stations) | `"Windrush New Cross ELL"` | Catalog gap, corroborates existing finding -- see §4 |
| `Heathrow Terminal 4/5 (Underground/Rail) Station` | 109+101+72+30 | collapses to `"Piccadilly Heathrow"` / `"Elizabeth line Heathrow Terminal N"` | Confirmed defects 2a/2b |
| `Abbey Wood` / `Shenfield Rail Station` / `Paddington` / `Reading Rail Station` / `Maidenhead Rail Station` | 167/116/108/52/26 | `"Elizabeth line X"` | Confirmed defect 2a (Elizabeth line serves stations beyond the 2 that offer it as a direction; these show the same suffix bug at every Elizabeth-line-served stop, not just the 2 with an offered direction) |

Full table (all 93 rows, with `matchedAnywhere` and sample stations) is in
`docs/london-destination-gaps.json` -- not reproduced in full here per the brief's data-not-prose
instruction.

## 4. Table B -- unreachable directions, per station (summary; full 862-row table is the JSON)

**862 (station, direction) pairs showed 0 matching upcoming trips at capture time**, out of several
thousand offered directions network-wide. Breakdown by line prefix:

| Line | Zero-match instances |
|---|---|
| DLR | 265 |
| Tram | 109 |
| Piccadilly | 90 |
| Metropolitan | 86 |
| District | 75 |
| Northern | 58 |
| Windrush | 62 |
| Central | 44 |
| Weaver | 34 |
| Mildmay | 13 |
| Elizabeth | 10 |
| Bakerloo | 6 |
| Jubilee | 2 |
| Circle | 2 |
| Victoria | 3 |
| Waterloo & City | 2 |
| Lioness | 1 |

**Classification (per the brief's mandatory three-way split):**

1. **Normalisation defect (Jim's lane, goes in the follow-up PR):** the Elizabeth-line (10) and
   Piccadilly-Heathrow (66) instances above, confirmed root-caused, 100% of their respective totals.
2. **Adapter defect, not text normalization, still Jim's lane:** the DLR id-collision (up to 265,
   86% of the DLR total -- confirmed mechanism, not row-by-row verified at every station).
3. **Catalog/direction data problem (Luke's lane, no fix here):**
   - **New this pass:** Battersea Power Station branch never offered as a direction anywhere (§ above).
   - **Corroborated, quantified:** Windrush terminus-naming mismatch (Dalston Junction / New Cross
     ELL never offered; 62/132 Windrush instances still zero-match even where a real terminus *is*
     offered) -- `docs/london-terminus-sweep-findings.md` finding 4.
   - **Referenced, not re-verified:** Tramlink generic termini lists and Metropolitan cross-branch
     listings (`docs/london-terminus-sweep-findings.md` finding 3) plausibly account for a large
     share of the Tram (109) and Metropolitan (86) totals; not individually re-confirmed station by
     station in this pass.
4. **Genuine absence of service (record and move on):** a residual set (Kensington (Olympia)'s
   District directions, Roding Valley's Central directions, Heathrow Terminal 5's cross-branch
   Piccadilly directions) showed literally zero raw rows for that line at capture time -- consistent
   with genuinely low-frequency/off-peak shuttle services rather than a defect. Per
   `docs/london-terminus-sweep-findings.md`'s own caveat, a single snapshot cannot fully distinguish
   this from headway noise (see §6's gate-coverage limitation).

The remaining un-root-caused instances (roughly 460 of the 862) are not individually classified in
this pass -- they are most plausibly split across categories 3 and 4 above (the CFOT-affected stub
termini in particular, see §5, contribute to several of the Northern/Central/District/Tram counts).
`docs/london-destination-gaps.json`'s `tableB_full` tags each row with a mechanical `suspectedCause`
(by line prefix) so a follow-up pass or Jim's fix work can filter without re-deriving this from
scratch, and is explicit that `"unclassified"` rows still need a human look rather than being
treated as resolved.

## 5. Table C -- placeholder timing

**Zero.** No raw `ArrivalDepartures` rows with real (non-null) timing show a near-identical cluster
anywhere in the network at capture time. See §1 -- the placeholder-timing fix (`26eccfb`) holds.

## 6. Out of scope, not re-litigated: "Check Front of Train" / stub-terminus sparsity

Per the brief, not re-investigated or proposed a fix -- recorded in
`docs/london-terminus-sweep-findings.md`'s addendum, awaiting Tim's product decision. This pass
confirms the scale: **224 raw rows with `towards: "Check Front of Train"` (and `destinationName:
"undefined"`) across 78 stations** (up from the single-station Amersham finding and the
Walthamstow Central addendum spot-check). Full station list in the JSON
(`outOfScope_awaitingProductDecision.scaleConfirmedThisPass.stationsAffected`).

## 7. What the existing gate structurally cannot cover

`qa/uk-london-tfl-direction-match.mjs` is fixture-backed against 9 of 434 catalog stations (~2%),
all Overground (plus tube/DLR only incidentally via folded ids at Barking). It could not have caught
any of the three new defects in §2, and not because of an oversight in its assertions -- structurally:

- **No Elizabeth-line, Piccadilly, or DLR fixture exists at all.** Its whole station set is
  Overground termini (Barking Riverside, Gospel Oak, Woodgrange Park, Barking) plus the 5
  London-prefix Overground stations from PR #346. A gate can only catch what its fixture set
  samples, and none of it touches the 3 lines this audit found broken.
- **The DLR id-collision defect depends on a specific, un-synthesizable data shape** -- a hand-authored
  or regenerated fixture would need to reproduce TfL's actual duplicate `id` values verbatim (a live
  capture at the right, unlucky moment), or it silently "fixes" the bug by construction without the
  adapter changing at all. This is the single most structurally-hard-to-fixture-test defect found.
- **It has zero assertions on `lineName`-derived text** (nothing strips `" line"`, nothing exercises
  the `via`-stripping path against a real Piccadilly-branch `towards` value) because none of its 9
  stations are on the Elizabeth or Piccadilly lines.
- More broadly: 9/434 stations and effectively 1.5/5 modes (Overground, plus DLR/tube only as
  collateral at Barking's folded ids) is not a representative sample of a 5-mode, 434-station catalog
  -- a fixture-based gate at this scale will always be blind to whichever mode/line it happens not to
  sample, by construction.

**Recommendation:** extend `qa/uk-london-tfl-direction-match.mjs` with:
1. Unit-level assertions on `lineName`-derived text -- `"Elizabeth line X"` must normalize the same
   as `"Elizabeth X"` -- cheapest, most direct catch for 2a, no fixture needed (mirrors how PR #346's
   own gate extension added unit assertions for the `"London "` prefix).
2. A captured-live Piccadilly-Heathrow fixture (Arnos Grove or Cockfosters both have real
   `"... via T4/T5 Loop"` rows right now) asserting the parsed destination retains the terminal
   number.
3. A captured-live DLR fixture at a station with a *known, current* id collision (Abbey Road or
   Beckton Park both qualify right now) asserting `fetchStopBoard`'s dedup does not drop a row whose
   `destinationName` differs from the surviving row's, even when `arrival.id` collides -- this
   assertion can only be written *after* the dedup-key fix lands (today's code would fail it by
   design), so gate-writing should follow Jim's fix, not precede it.
4. Given 2 of the 3 new defects are ~100% and line/mode-wide rather than station-specific, a single
   representative fixture per affected line is sufficient going forward -- this audit's 434-station
   full sweep was needed to *discover* the defects, not to gate them permanently. A periodic
   (not smoke-tier) full-network sweep along these lines, running the same way as
   `qa/uk-london-terminus-sweep-probe.mjs`, would be the next line of defense for whatever this pass
   didn't sample cleanly (the ~460 unclassified Table B rows) -- it needs live network/`TFL_APP_KEY`
   so it cannot join `qa/run-all.mjs`'s smoke tier, same constraint as the terminus sweep.

## 8. Does this generalise to other UK regions?

`lib/train-times-core.js`'s `normalizeDestination`/`pickUpcomingTrips` is shared by every UK region,
including the Darwin-backed National Rail regions (`uk-darwin`). The three specific defects found
here are TfL Unified-API data-shape quirks -- a literal `"Elizabeth line"` lineName string, a
`"via ... Loop"` branch-loop `towards` convention, and DLR-specific `id` reuse -- none of which have
an obvious Darwin/LDBWS equivalent (different feed, different id scheme, no "line name with a literal
trailing word" convention that a National Rail feed would produce). So these three defects
specifically are unlikely to recur verbatim in a Darwin-backed region. But the **structural
question this whole audit answers** -- "does the picker's offered-direction text actually reconcile
with what the feed's chosen endpoint returns, checked as data rather than assumed" -- is exactly as
unaudited in every Darwin-backed NR region as it was in London before this pass. One-line judgement:
worth a similarly-scoped full-network reconciliation pass per NR region eventually; not urgent, and
out of this brief's scope to start here.

## Files

- Probe (committed, throwaway): `qa/london-destination-reconciliation-probe.mjs`
- Machine-readable gaps (Jim/Luke can work from directly): `docs/london-destination-gaps.json`
- This report: `docs/london-destination-reconciliation-audit.md`
- Adapter: `lib/providers/uk-tfl.js` (`parseTflArrival`, `parseTflArrivalDeparture`,
  `usesArrivalDepartures`, `fetchStopBoard`'s `allTripsMap`)
- Normalisation: `lib/train-times-core.js` (`normalizeDestination`, `pickUpcomingTrips`)
- Direction catalog: `public/city-directions/uk-london-tfl.json`
- Existing gate: `qa/uk-london-tfl-direction-match.mjs`
- Prior context this audit builds on: `docs/jim-brief-london-overground-empty-direction.md`,
  `docs/jim-brief-london-station-name-prefix.md`, `docs/london-terminus-sweep-findings.md`

## No fixes made

Per brief: this is a flag-only investigation. No adapter, core, QA gate, or direction-data file was
changed. Three confirmed new defects (§2) are, in QA's judgement, severe enough (two at 100% failure
for an entire line's directions, one affecting the single largest-by-volume mode in the network) to
warrant a fresh Jim brief promptly, using `docs/london-destination-gaps.json` directly rather than
this prose.

