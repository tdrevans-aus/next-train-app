# Jim brief — DLR: dedup-by-id discards almost every train on the board

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises changes to
`lib/providers/uk-tfl.js` and `qa/`.

tim-review: no — Tim approved fixing this as its own PR, separate from the Elizabeth-line and
Piccadilly-Heathrow normalisation defects, on 7 Sep 2026.

**Severity: highest-volume defect in the region.** ~86% of DLR direction/station combinations are
unreachable. Found by the full-network audit, `docs/london-destination-reconciliation-audit.md`
(gap rows in `docs/london-destination-gaps.json`).

## Root cause — confirmed live, Abbey Road (`940GZZDLABR`), 7 Sep 2026

```
6 raw rows, 1 unique id, 1 unique vehicleId

id=322784161 ->  Beckton@96s
              |  Woolwich Arsenal@216s   |  Woolwich Arsenal@757s
              |  Stratford International@395s | @995s | @1476s
```

TfL's DLR feed does not populate `id` or `vehicleId` per prediction — **every row at the stop
shares one value**, across three genuinely distinct destinations. `fetchStopBoard` keys
`allTripsMap` on `trip.id`, so five of six trains are silently discarded and the board renders a
single trip. Six of Abbey Road's seven offered directions are consequently empty.

This is an adapter dedup-key defect, not a text-normalisation one — a different mechanism from the
three destination-string defects fixed in `26eccfb` and `d91e122`.

## The constraint that makes this non-trivial

The dedup is not vestigial: `fetchStopBoard` fans out across each entry's `naptanId` plus its
`alsoNaptanIds` (the Tramlink platform fold-in from PR #344), so the **same** train legitimately
arrives via several fetches and must collapse to one row. Any replacement key must therefore:

- **collapse** the same prediction seen through different naptan ids for the same stop, and
- **preserve** genuinely distinct predictions that happen to share an upstream `id`.

A composite key over the fields that actually identify a service — line, resolved destination and
departure time, and platform if it proves necessary — satisfies both, because the same train
fetched twice carries identical values while two different trains differ in time or destination.
Verify that reasoning rather than taking it on trust; if you find a case it breaks, say so and
propose the key you chose instead.

Keep the existing "prefer the earlier `liveDeparture` on a genuine collision" behaviour.

## Scope

`allTripsMap` lives only in `lib/providers/uk-tfl.js`, so this is confined to `uk-london-tfl`. Make
the key mode-agnostic rather than special-casing DLR: tube ids were measured unique (37/37 at
Oxford Circus) and DLR's are not, so keying on data that happens to be well-formed for one mode is
what produced this bug.

## Acceptance criteria

1. Abbey Road returns all six trains, and its Beckton, Woolwich Arsenal and Stratford International
   directions all populate.
2. A representative sweep of DLR stations shows the previously-empty directions populated, with the
   before/after counts in the PR. Use `docs/london-destination-gaps.json` to pick the affected set
   rather than guessing.
3. No duplicate rows appear at a stop with `alsoNaptanIds` fan-out — the Tramlink fold-in from
   PR #344 must still collapse correctly. Demonstrate it, by fixture or mock if live traffic does
   not exercise it.
4. No regression for tube, Overground, Elizabeth line or tram boards; spot-check one of each and
   show trip counts unchanged where they were already correct.
5. No change to `pickUpcomingTrips` or anything else in `lib/train-times-core.js` — this is an
   adapter-local fix.

## QA

Extend `qa/uk-london-tfl-direction-match.mjs` with a DLR fixture whose rows share a single upstream
`id` across distinct destinations, so a regression to id-keying fails the gate. Add a fan-out case
proving genuine duplicates still collapse.

Run that gate, `node qa/bundle-freshness.mjs` and `node qa/run-all.mjs --smoke`, all in the
FOREGROUND and to completion. Do not run the full suite.

## Out of scope

The Elizabeth-line (`lineName` is `"Elizabeth line"`) and Piccadilly Heathrow T4/T5 defects are the
subject of a separate PR. Do not fix them here even though they appear in the same audit; note if
your change alters their symptoms.

---

# AMENDMENT — 8 Sep 2026, after live verification. The key must not contain `id`.

Live-tested once London service resumed. Two findings change the fix.

## 1. TfL's `id` varies by queried naptan — proven

Clapham Junction (`910GCLPHMJ1`, folded id `910GCLPHMJC`), matching the same train across both
fetches by line + destination + `expectedArrival`:

```
4 matched trains:  id same=0  id DIFFERENT=4  |  platformName same=4  diff=0
```

The same train carries a **different `id`** depending on which stop id you queried. Therefore any
dedup key containing `id` can never collapse the `alsoNaptanIds` fan-out — under the old key or
the one currently in PR #350.

## 2. That is already a live defect on master

```
fetchStopBoard("Clapham Junction") -> 6 trips
  2x Mildmay Stratford@06:00
  2x Mildmay Stratford@06:09
  2x Mildmay Stratford@06:23
```

Half the board is duplicated. PR #344 added the hub+platform fan-out; dedup-by-`id` cannot collapse
across naptans; so duplicates have been shipping since it merged. This affects the 40 catalog
entries with non-empty `alsoNaptanIds`. Fix it in this PR — it is the same function and the same
dedup design, and splitting it would mean two conflicting edits to `fetchStopBoard`.

## Required design: scope the dedup to *across* fetches

- **Across different naptan fetches for the same stop:** collapse on
  `line + resolved destination + platform + departure time`, **without `id`**. That is exactly the
  set of fields observed identical for the same train across the hub and folded queries.
- **Within a single response:** never dedup. Two rows in one response are two trains, even when
  every field but `id` matches — this is the Walthamstow Central Victoria case you correctly
  found (`-2066444382` vs `-411927803`, station has `alsoNaptanIds: []`, so it is a same-response
  pair and not fan-out at all). Dropping `id` from the key is safe **only** with this scoping;
  without it you would reintroduce the 29→28 collapse you caught.

This scoping resolves the apparent contradiction between the two cases: the previous attempt
treated one global key as having to serve both, which no single key can do.

## Additional acceptance criteria

6. `fetchStopBoard("Clapham Junction")` returns no duplicate `destination@displayTime` pairs, and
   the trip count drops accordingly. Show before/after.
7. The Walthamstow Central same-response pair is still preserved (no 29→28 collapse).
8. Spot-check two more `alsoNaptanIds` stations from `lib/cities/uk-london-tfl/stops.json` (40 have
   them, mostly Tramlink) and show duplicate counts at zero.
9. The DLR fix still holds — Abbey Road returns all six trains.

Add QA coverage for the fan-out case using **real captured rows from two naptans of the same stop**
where the ids genuinely differ, not a mock that reuses one id. That mock is what let this through
the first time.

---

# AMENDMENT 2 — 8 Sep 2026. The scoping heuristic drops trains. Confirmed.

Mark found it; I reproduced it directly against `dedupeTrips` on `76a19dd`:

```
3 distinct trains sharing one key, split 2+1 across two fetches -> survived 2 (expected 3); ids A,B — C dropped
same train via 2 fetches                                        -> survived 1 ✓
2 distinct trains in one response                               -> survived 2 ✓
```

"Keep the largest same-key group seen in any single response" undercounts whenever a train appears
**only in a folded fetch** — which is precisely the case PR #344 exists to serve ("a board never
loses trains that only ever posted against a platform id"). So the current heuristic can silently
drop a walk-up service, the exact failure class this whole workstream is fixing.

## The real problem, stated plainly

Without an identifier that is stable across naptan fetches, "the same train seen twice" and "two
distinct trains, one per fetch" are indistinguishable, and any group-counting heuristic must guess.
The current guess errs toward **dropping**. Under `docs/board-eligibility-rule.md` that is the worse
direction to err in: a duplicated row is ugly, a vanished train is a rider missing a service.

## Required

1. **Test whether `vehicleId` is stable across naptan fetches.** It is the obvious candidate — Mark
   used it successfully to tell real vehicles apart at Walthamstow Central, so it carries real
   meaning, unlike `id`. I could not test it: at the time I tried, the folded naptans returned zero
   rows, and matched pairs are needed. Retry when folded fetches carry data (Clapham Junction
   `910GCLPHMJ1`/`910GCLPHMJC` had 4 matched pairs earlier this morning). **If `vehicleId` is stable
   across fetches, key on it** — that removes the guessing entirely and is the correct fix.
2. **If it is not stable**, fall back to a rule that errs toward keeping trains rather than dropping
   them, and say explicitly in the PR that duplicates are possible in the ambiguous case and why
   that is the safer error.
3. Either way, the 2+1 counterexample above must survive as a QA assertion, along with the two
   controls that already pass.

## Also fold in — defect found by Mark, rider-visible, same key design

At Walthamstow Central the `4x Victoria Walthamstow Central@05:10` group is **not** four trains: it
is **two real vehicles, each duplicated across both platforms**, because TfL had not yet assigned a
platform (both sat in "Victoria Siding"). Since `platformName` is in the dedup key, the same vehicle
appears twice with different platform values.

This predates PR #350 — the old id-inclusive key had it too — but it is the same key being
redesigned here, it is live and rider-visible, and fixing it separately would mean a second
conflicting edit to `fetchStopBoard`. Handle it: an unassigned/placeholder platform must not make
one vehicle look like two. `"Platform Unknown"` and similar placeholder values appear in real
responses (seen at Barking Riverside), so treat platform as a weak key component rather than
trusting it.

Do not widen beyond these. The Elizabeth-line and Heathrow T4/T5 defects remain a separate PR.
