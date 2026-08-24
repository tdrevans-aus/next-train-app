# Jim brief: London TfL leave-by directions — no stub

**From:** Zoe / Tim  
**Date:** 24 Aug 2026  
**Do this now.** Do not ship compass directions.

## Lock

`qa/fixtures/uk-london-tfl/direction-model-memo.md`  
`qa/fixtures/uk-london-tfl/published-network.json`

Chips = **line + terminus** (Victoria Brixton). Same idea as `T1 Emu Plains`.

## Code

1. Delete the stub array in `getMultiCityDirections` / `directionsFor` for `uk-london-tfl`.
2. Add `lib/cities/uk-london-tfl/marketing-directions.js` that reads the oracle termini (and catalog `lines` on the stop) and returns chips for that stop.
3. `CHIP_HEADSIGN_GROUPS`: shorts nest under the published terminus (see oracle `shortTurns`).
4. Trip `destination` is already `Line towards` from `uk-tfl.js`. Chips must be that shape so `pickUpcomingProviderTrips` hits.
5. Do not wait on Darwin. Do not enable WM/EP.

## Acceptance

| Check | Pass |
|-------|------|
| King’s Cross chips include `Victoria Brixton` and `Victoria Walthamstow Central` (and Northern / Piccadilly / Met / H&C / Circle policy per oracle) | Yes |
| No chip is `Northbound` / `Southbound` / `Eastbound` / `Westbound` | Yes |
| `All trains` is not a saved-journey chip (Nearby may still show unfiltered) | Yes |
| Highbury & Islington Overground chips use Mildmay / Windrush + published ends | Yes |
| Leave-by at King’s Cross + `Victoria Brixton` only returns Victoria trips towards Brixton (and nested shorts) | Yes |
