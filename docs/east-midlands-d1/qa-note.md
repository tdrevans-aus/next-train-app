# East Midlands QA note — live flip (2 Sep 2026)

**Gate status:** GREEN. Flip commit `24af500` on branch `flip-east-midlands-live` (stacked on `flip-west-of-england-live`, PR #190).

**Why now:** Darwin OpenLDBWS is genuinely live after the `uk-darwin.js` REST rewrite (PR #188). Tim authorised flipping East Midlands on 2 Sep 2026, after West of England.

## History

- First run (commit `335198a`): blocked on one gate only. The oracle report had no Board eligibility section.
- Nico appended the section (commit `ae9d869`): all National Rail TOCs at in-catalog stations `in`; NET tram Lines 1 & 2 `out-product` (feed unconfirmed).
- Second run: all checks green, flip commit made.

## Checklist

| Check | Result | Notes |
|---|---|---|
| Oracle Board eligibility section, no `undecided` rows | PASS | Added in `ae9d869` |
| Verdicts match adapter filtering | PASS | Live Nottingham sample below |
| `qa/east-midlands-dogfood-gate.mjs` | PASS post-flip | Fails pre-flip on `assertCityLive` by design |
| `qa/uk-planned-gate.mjs` | PASS | `LIVE_UK_REGION_IDS` now includes east-midlands |
| `qa/live-city-lists-sync.mjs` | PASS | 21 live cities consistent across registry and all list copies |
| `qa/uk-region-catalog-conformance.mjs` | PASS | 6 National Rail + 4 NET entries, doNotGroup at Nottingham Station |
| DST (Europe/London) | PASS | Hazard pack H7 |
| Hub lock / doNotGroup at Nottingham Station | PASS | Tram viaduct vs National Rail platforms, two catalog entries, different mode |
| v1 mode cut vs oracle report | PASS | National Rail live; NET tram surfaces `NetFeedUnconfirmedError`, never a fabricated schedule |
| Response shape | PASS | National Rail destination + operator; NET line + terminus |
| `qa/run-all.mjs --smoke` post-flip | See below | Mark's run timed out on late browser scripts; top-level session re-ran it in full |
| UK country ledger | N/A | `docs/united-kingdom-ledger.md` does not exist |

## Live board sample (Nottingham, NOT)

Mark queried Nottingham via Darwin at about 13:41 UTC on 2 Sep 2026 with the token in `.env.local`. Operators on the board: East Midlands Railway, CrossCountry, Northern. All are `in`. No `out-*` service appeared. NET tram entries surface `NetFeedUnconfirmedError` rather than an empty board.

Sample rows:

| Time | Operator |
|---|---|
| 13:41 | CrossCountry |
| 13:45 | East Midlands Railway |
| 13:45 | East Midlands Railway |

## Flip commit `24af500`

Items 1 to 7 from `jim-handoff.md`, one commit:

1. `lib/providers/registry.js` status `planned` to `live`
2. `lib/cities/live-city-api.js` `MultiCityId` typedef + `MULTI_CITY_IDS`
3. `public/app.js` `NEARBY_MULTI_CITY_IDS` + `LIVE_CITY_IDS`
4. `public/brisbane-dogfood.js` `MULTI_CITY_IDS` + `available`
5. `public/city-session.js` `MULTI_CITY_IDS`, gb picker region entry (`comingSoon: false`), `CITY_BOUNDS`
6. `public/journey-model.js` `PERSISTED_CITY_IDS`
7. `qa/uk-planned-gate.mjs` `LIVE_UK_REGION_IDS` + summary string

### CITY_BOUNDS

`"east-midlands": { minLat: 52.25, maxLat: 53.28, minLng: -1.47, maxLng: -0.65 }`

Catalog coordinates are null in the D1 pack, so the box was derived from real station locations: Nottingham 52.94/-1.14, Leicester 52.62/-1.14, Kettering 52.40/-0.73, Wellingborough 52.30/-0.70, Chesterfield 53.23/-1.42, Alfreton 53.12/-1.40, and NET termini Hucknall, Beeston, Chilwell, Phoenix Park. About 114 km north to south by 56 km east to west.

## For Tim at merge

1. **NET tram verdict.** `out-product`: no confirmed static or real-time feed (absent from the DFT BODS bulk GTFS on 31 Aug 2026). The tram board surfaces an explicit error instead of silently omitting the service. Merging this PR is the approval of that verdict.
2. **Tamworth** is deliberately excluded (shared platform with West Midlands, de-dup boundary).
3. **No UK ledger** exists yet. When one is written it should record Nottingham Station ownership, the through-running-only stations, the Tamworth boundary, and the NET verdict.
4. Post-merge, release the UK lane:

```
node qa/lane-lock.mjs release "United Kingdom"
```

*QA by Mark (QA lane), reviewed and consolidated by the top-level session, 2 Sep 2026.*
