# Mark brief — London: "served but not offered" catalog coverage audit

**Lane: QA (flag only).** Investigate and report. Do not fix, do not open a fix PR. Findings become
a single Jim brief that the top-level session writes.

tim-review: no — Tim approved this audit on 8 Sep 2026, choosing it over fixing from a snapshot.

## Why this exists

The reconciliation audit (`docs/london-destination-reconciliation-audit.md`) swept one direction of
the problem: **offered but unreachable** — directions the picker shows that match no trip. Ten
defects came out of that, all fixed.

The **inverse was never swept**: services a station genuinely runs that the picker does not offer at
all. A rider cannot select them, so they are just as invisible as the bug that started this — the
board simply never mentions the train. A snapshot at 08:00 on 8 Sep found:

```
Farringdon                offers 1 direction ("Circle")     live destinations: 13
Battersea Power Station   offers 0 directions               live destinations: 2
Richmond                  offers 3 District directions, none matched; 2 different ones live
Nine Elms / Kennington    "Northern Battersea" offered by no station
Stratford                 missing Elizabeth Paddington, DLR Canary Wharf, Central North Acton/White City
```

Farringdon is effectively unusable and Battersea Power Station offers nothing at all. "Four catalog
items" was an undercount by an order of magnitude, which is why this needs a sweep rather than a
patch.

## The trap that makes this harder than the last audit

**A live sample cannot tell you what a station serves.** Stratford offers "Elizabeth Abbey Wood"
and it did not appear in the snapshot — that is time-of-day, not evidence to remove it. Equally, a
destination appearing once may be a short working or a one-off diversion, not a direction worth
offering. Fixing from a single observation would recreate the original bug in reverse: plausible
directions that match nothing.

**Use TfL's own topology as the authority, not arrivals sampling.** `/Line/{id}/Route`,
`/Line/{id}/RouteSequence/{direction}` and `/Line/{id}/StopPoints` describe which stations a line
serves and what its branch termini are. Derive the *correct* direction set per station from that,
and use live arrivals only to corroborate and to catch cases where topology and reality disagree.
Say clearly in the report which of your findings rest on topology and which on observation.

## Scope

All 434 stations in `public/city-directions/uk-london-tfl.json`, every rail mode
(tube, DLR, Overground, Elizabeth line, tram).

For each station produce:
- **offered** — directions currently in the catalog.
- **should be offered** — derived from TfL line topology.
- **observed** — destinations seen live (note your sampling window; take more than one sample where
  a station looks empty, and never report a rate-limited or out-of-service probe as a gap).

Then classify every discrepancy into exactly one of:
1. **Missing direction** — the station serves it, the catalog does not offer it. The serious class.
2. **Spurious direction** — the catalog offers it, topology says the station is not served by it.
   Recommend removal, with the evidence.
3. **Time-of-day only** — offered, topologically correct, simply not running when sampled. Not a
   defect; say so explicitly so it is not mistaken for one.

## Also record, separately — an adapter defect, not a catalog one

The snapshot showed bare line-name destinations reaching the board: `"District"`, `"Metropolitan"`,
`"Hammersmith and City"`, with no destination attached. That is `parseTflArrival`'s unknown-
destination fallback emitting only the line name when both `towards` and `destinationName` are
unusable. Quantify how often it happens and on which lines and stations, but do **not** fold it into
the catalog findings — it needs its own fix in `lib/providers/uk-tfl.js`.

## Deliverables

- `docs/london-catalog-coverage-audit.md` — the narrative, the three-way classification, and an
  explicit statement of what is topology-derived versus observed.
- `docs/london-catalog-gaps.json` — machine-readable, per station, so the fix PR is driven by data
  rather than by re-reading prose. This mattered last time: the gaps JSON is what made the
  Elizabeth/Heathrow brief precise.
- A recommendation on whether a permanent gate is warranted for the missing-direction class, and
  what it could assert given that a fixture cannot know what a station *should* offer.

## Constraints

`TFL_APP_KEY` is in `C:\Users\tdrev\Projects\next-train-app\.env.local`. Pace live requests at
450-600ms — a prior full sweep made 545 requests with zero 429s at that rate. Run during London
service hours and state your window; the network is closed roughly 00:30-05:30 local and boards read
as empty then.

A throwaway probe script is fine; if you commit one, keep it to the probe and the two deliverables.
Do not change adapters, core, direction data, or gates. Do not run `node qa/run-all.mjs` in any
form — this audit does not need the suite. If port 3000 is held by another session, report it rather
than killing it. Leave no background sleep, poll, or watch loops running.
