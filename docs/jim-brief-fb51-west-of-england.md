# Jim brief: FB-51 — West of England on the shared hub helper

**For:** Jim
**From:** Tim (product), scoped by Fable 4 Sep 2026. Second FB-51 invocation; the shared helper, national index and East Midlands landed in #210.
**Read first:** `docs/jim-brief-fb51-uk-hub-rollout.md` (pattern, helper API, guardrails — all still apply), then `lib/cities/east-midlands/dogfood-next-train.js` and `qa/east-midlands-dogfood-gate.mjs` as the worked example to copy.
**Scope:** `west-of-england` only. Liverpool City Region is the next invocation, not this one. Branch from master.

## Region facts (live Darwin chips, 4 Sep 2026 ~13:30 UTC)

- Bristol Temple Meads: Avonmouth (GWR), Cardiff Central (GWR), Frome (GWR), Glasgow Central (XC), London Paddington (GWR), Manchester Piccadilly (XC), … (fan-out hub — exact-chip path is the fix here, no hub chip)
- Bath Spa: Bristol Temple Meads (GWR), Cardiff Central (GWR), Frome (GWR), Gloucester (GWR), London Paddington (GWR), Oxford (GWR), …
- Westbury: Bristol Temple Meads (GWR), Cardiff Central (GWR), Frome (GWR), Gloucester (GWR), London Paddington (GWR), London Waterloo (SWR), …
- Gloucester: Bristol Temple Meads (GWR), Cardiff Central (XC / TfW), Cheltenham Spa (GWR / TfW), Frome (GWR), …
- Chepstow: Cardiff Central (XC / TfW), Cheltenham Spa (TfW), Nottingham (XC)
- Taunton: Cardiff Central (GWR), Edinburgh (XC), Exeter St Davids (GWR), London Paddington (GWR), Penzance (XC / GWR), Plymouth (…)

## Work

1. **Wire the region through the shared helper** exactly as East Midlands: `getWestOfEnglandDogfoodDirections` post-processes chips with `applyDirectionHubs`; `getWestOfEnglandDogfoodNextTrain` plans with `planUkNextTrainFetch` (hub / exact via region catalog then national index / undirected) and calls `fetchRegionalDepartureBoard()` for hub and exact, carrying `printedDestination` on remapped trips. Export a `planWestOfEnglandNextTrainFetch` wrapper for the gate.

2. **Hub table — `lib/cities/west-of-england/direction-hubs.json`.** Proposed v1, every row verified live with `scripts/probe-uk-board.mjs "<station>" --region=west-of-england --filter-crs=BRI` before writing; Tim approves the `absorbs` list in the PR:

| label | filterCrs | appliesFrom | absorbs (candidates — keep only what the BRI-filtered board actually shows) | why |
|---|---|---|---|---|
| Bristol Temple Meads | BRI | BTH (Bath Spa), WSB (Westbury) | Bristol Temple Meads; Cardiff Central; Gloucester; Cheltenham Spa; Avonmouth; Severn Beach | From Bath and Westbury every westbound train runs via Temple Meads (Portsmouth–Cardiff, Bath–Gloucester, Severn Beach extensions); riders anchor on Bristol. |

Rules from the FB-50 brief still hold: a printed destination **not** in `absorbs` keeps its own chip and its trains also appear under the hub chip; hub chips carry no operator suffix. **Do not** absorb London Paddington, Oxford, Frome, London Waterloo or anything that does not call at BRI from that station — if the filtered board contains a terminus, it is a candidate; if it doesn't, it isn't. Do not add hubs at Bristol Temple Meads, Gloucester, Chepstow or Taunton (Taunton's board reaches Bristol only on some services and its chips are recognisable termini) — list any real case you find as a proposal, unadded.

3. **Expected effect at Bristol Temple Meads** (record before/after in the PR): choosing "London Paddington (Great Western Railway)" fetches `filterCrs=PAD` via the national index and returns a full board instead of the diluted undirected 15.

## Guardrails

Same as the rollout brief: no edit to `lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`, `lib/cities/uk/*` (the helper is shared — if it needs a change, stop and report), or any other region. Board-eligibility statement in the PR. Never fabricate. Stage by explicit path. No status flips. Run `node qa/lane-lock.mjs check united-kingdom` first; acquire `united-kingdom west-of-england adapter` before touching shared files (you shouldn't need to); release is post-merge, not yours.

## QA

- Extend `qa/west-of-england-dogfood-gate.mjs` (token-tolerant): hub file loads/validates (BRI, BTH, WSB resolve); `applyDirectionHubs` on the Bath Spa chip set above at BTH returns the hub chip plus the un-absorbed chips in `localeCompare` order; same set at BRI unchanged; planner routes "Bristol Temple Meads" at BTH → hub BRI, "London Paddington (Great Western Railway)" at BRI → exact PAD, nonsense → undirected; end-to-end with token returns `printedDestination`.
- `qa/uk-west-midlands-dogfood-gate.mjs` and `qa/east-midlands-dogfood-gate.mjs` unchanged and green.
- `node qa/run-all.mjs --smoke`, then push and open the PR against master with: before/after chip tables for BTH, WSB, BRI; a BTH→BRI filtered board sample with printed destinations; a BRI→PAD row count before vs after; the absorbs table for Tim; the eligibility statement.
