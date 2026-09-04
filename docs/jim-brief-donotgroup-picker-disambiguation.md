# Jim brief: doNotGroup stations are indistinguishable in the station picker

**For:** Jim (implement)
**From:** Tim (via top-level session)
**Date:** 2 Sep 2026
**Status:** Ready to fix — confirmed by Tim testing Liverpool City Region
**Related:** `public/station-combobox.js`, the doNotGroup catalog entries at Liverpool Lime Street (`lib/cities/liverpool-city-region/stations.json`) and Nottingham Station (`lib/cities/east-midlands/stations.json`)
**Out of scope:** Resolving Lime Street's H1 structural ambiguity (whether it's genuinely one building or two) — that stays open per `docs/liverpool-city-region-d1/hazard-pack.md`. This brief is about the picker UI only, not the underlying station-graph question.

---

## 1. What Tim saw

Searching stations in Liverpool City Region's picker returns:

```
Liverpool Lime Street
Liverpool South Parkway
Liverpool Lime Street   <- same name, second entry
Liverpool Central
Moorfields
Ellesmere Port
```

Two rows with the identical label "Liverpool Lime Street." Nothing distinguishes them. Picking either one is a coin flip between the National Rail board and the Merseyrail board — and Merseyrail's board can never load (see the companion brief on `MerseyrailFeedUnconfirmedError`), so picking the "wrong" one silently produces an error with no indication why, or that a second, working entry exists under the same name.

This is a direct consequence of the doNotGroup design: two catalog entries, same printed name, disambiguated only by `mode` (`"train"` vs `"metro"`), used deliberately so the two boards are never incorrectly merged. But the picker UI was never updated to expose that `mode` distinction to a human picking from a flat name list. The same shape exists at East Midlands' Nottingham Station (NET tram vs. National Rail, also same printed name) — check that catalog's entries too when you fix this, since the fix should cover the general case, not just Liverpool.

## 2. Fix

In the station combobox's option list, when two or more catalog entries share the same printed name, disambiguate them visibly — e.g. append the mode as a short suffix or secondary line ("Liverpool Lime Street — National Rail" / "Liverpool Lime Street — Merseyrail"). Do not invent new copy conventions from scratch — check whether `lib/cities/*/stations.json` or `marketing-directions.js` already carries a human-readable mode label anywhere in this codebase (e.g. how Nottingham/Sheffield/Newcastle's own doNotGroup pairs are described in their hazard packs or notes) and reuse that vocabulary if one exists, rather than picking your own wording.

Scope this generically — the picker code shouldn't special-case Liverpool or East Midlands by name; it should detect "two options with an identical label" for whatever city is currently active and disambiguate all such pairs the same way. Search for every current doNotGroup pair across the UK regions (`grep -rn "doNotGroup" lib/cities/`) to confirm your fix actually covers all of them, not just the one Tim happened to test.

## 3. Verify

- Liverpool City Region: both "Liverpool Lime Street" entries appear distinguishable in the picker, and selecting each one reaches the board/error you'd expect for that mode.
- East Midlands: same check at Nottingham Station.
- Any other UK region with a same-name doNotGroup pair, if your grep above finds one.
- `node qa/run-all.mjs --smoke` stays green.
