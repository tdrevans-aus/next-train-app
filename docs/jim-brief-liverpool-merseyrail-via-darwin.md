# Jim brief: Merseyrail boards come from Darwin — wire them, retire `MerseyrailFeedUnconfirmedError`

**For:** Jim (implement)
**From:** Tim (via top-level session)
**Date:** 4 Sep 2026
**Status:** Ready to build — feed proven live from this repo with the existing token (see §1)
**Goal:** Ellesmere Port (and every other Merseyrail station) shows a live board in the initial go-live build of Liverpool City Region.
**Related:** `lib/providers/liverpool-city-region.js`, `lib/cities/liverpool-city-region/dogfood-next-train.js`, `lib/cities/liverpool-city-region/stations.json`, `lib/providers/uk-darwin.js`, `qa/liverpool-city-region-dogfood-gate.mjs`, `docs/liverpool-city-region-d1/{jim-handoff,rescope-addendum,oracle-clash-report}.md`
**Supersedes:** the Merseyrail half of `docs/jim-brief-directions-error-messaging.md` (there is no longer a Merseyrail error to word), and the "Merseyrail real-time: KNOWN PERMANENT GAP" line in `docs/liverpool-city-region-d1/qa-note.md`.
**Out of scope:** traini.ac or any second feed (decided against — `docs/uk-build-out-recommendation.md`); extending marketing chips to the five newly catalogued termini (product call, unchanged from the rescope handoff item 2).
**Decided by Tim, 4 Sep 2026:** Liverpool Lime Street becomes **one** catalog entry showing every train (option B in the top-level session). The metro-mode Lime Street entry and its doNotGroup pair are deleted. The H1 "one building or two" question is closed as moot: one Darwin CRS, one board, platform numbers on every train.

## 0. Authorization and route — read before deciding whether to execute

Jim declined a first version of this brief on the grounds that it asked an agent to change a live region, delete an error class, and flip a board-eligibility verdict on the strength of a claim inside the doc. Those are fair process questions. Here are the answers, so the decision to proceed is not Jim's to make or refuse:

- **Who decided.** Tim, in the top-level session on 4 Sep 2026, after seeing the probe output below run live. The verdict change (Merseyrail `out-product` → `in`) and the Lime Street merge are Tim's product decisions, recorded here. Jim implements; Jim does not own the verdict and is not being asked to.
- **Route.** This is a normal PR on a branch, not a flip PR and not a direct edit to `master`. Mark re-QAs it before Tim merges, exactly as `CLAUDE.md` requires for live regions. Nothing here bypasses Mark. The rescope addendum already required a Mark re-QA of Liverpool; this rides that pass.
- **Verify the claim yourself, first.** Do not trust the table in §1. Run this from the repo root (token comes from `.env.local`):

  ```bash
  node scripts/probe-uk-board.mjs --crs=ELP,LVC,MRF,LIV
  ```

  If Ellesmere Port, Liverpool Central and Moorfields do not each return trips with operator "Merseyrail", stop and report; the brief is wrong. If they do, the premise of the current code is wrong and the brief stands. The `--crs` flag was added to that script on 4 Sep 2026 for precisely this purpose; it asks Darwin directly, bypassing every region catalog.
- **On "deleting a safety mechanism."** The safety property is "never fabricate a board; surface a real error when there is no data." That property is kept: with no `DARWIN_LDB_TOKEN`, every Merseyrail lookup surfaces `MissingDarwinTokenError`, the identical shape National Rail already uses in this region and every other UK region. `MerseyrailFeedUnconfirmedError` was not a safety check; it was an assertion that a feed does not exist, and that assertion is false.
- **On editing `uk-darwin.js`.** Shared-file edits are normal Jim work under the lane lock (`acquire united-kingdom liverpool-city-region adapter`). The change asked for is additive (accept a pre-resolved entry or mode); no other region's behaviour may change, and the smoke suite proves it.

---

## 1. The premise was wrong, and here is the proof

Every document in the Liverpool pack says Merseyrail has "no confirmed public real-time feed" and models it as a metro layer whose board can never load. That was a category error. Merseyrail is a National Rail train operating company (a concession, like every other TOC). Its stations carry CRS codes, and its services are in Darwin exactly like Northern's or Avanti's. The pack looked for a GTFS-RT endpoint (the tram/metro lens used for Metrolink and Supertram) and, not finding one, concluded there was no feed — without ever asking Darwin.

Probed 4 Sep 2026, ~06:50 BST, from this repo, using the existing `fetchDepartureBoard()` in `lib/providers/uk-darwin.js` and the `DARWIN_LDB_TOKEN` already in `.env.local`:

| CRS | Station | Trips returned | Operators on the board |
|---|---|---|---|
| ELP | Ellesmere Port | 5 | Merseyrail ×5 (07:18, 07:31, 07:49, 08:19, 08:42 → Liverpool Central, platform 1, "On Time") |
| LVC | Liverpool Central | 8 | Merseyrail ×8 (Headbolt Lane, New Brighton, Ormskirk, Hunts Cross, West Kirby "4 min late", Ellesmere Port, Southport) |
| MRF | Moorfields | 8 | Merseyrail ×8 |
| LPY | Liverpool South Parkway | 12 | Merseyrail 5, Transport for Wales 2, EMR 1, LNR & WMR 2, Northern 2 |
| LIV | Liverpool Lime Street | 12 | Northern 4, Merseyrail 4, TPE 2, Avanti 1, LNR & WMR 1 |

Re-run at 07:49 BST with `node scripts/probe-uk-board.mjs --crs=ELP,LVC,MRF,LIV`: ELP 5 trips, LVC 15, MRF 15, LIV 15, all Merseyrail trips carrying live lateness ("8 min late", "3 min late") and platforms. At Lime Street, Merseyrail trips show platform "A" (the low-level platforms) while the other operators show numbered platforms, which is why one merged board loses nothing.

Platforms, live status ("4 min late"), and `operator: "Merseyrail"` all come through the existing parser untouched. Nothing new needs to be fetched or parsed. The only thing missing is that the adapter refuses to ask.

**Tim's rule for this change (4 Sep 2026):** the Merseyrail half of the 98-station catalog was accepted as "catalogued but never shows a train" only because no live trains were believed available. Now that they are, **all of them come back**: every Merseyrail station (68 once Lime Street's duplicate entry is folded into the single Lime Street row, see §2b) gets a live Darwin board, and every Merseyrail train Darwin returns appears on every board it calls at. No operator is filtered off any board anywhere in this region. Nothing in this brief may narrow that.

## 2. What to change

Keep this a config-over-shared-provider change, not a fork. Target is roughly 40 lines of code plus gate and prose.

### 2a. `lib/providers/liverpool-city-region.js`

- Replace the body of `fetchMerseyrailStopBoard()`: resolve the metro entry as now, then call Darwin for `entry.crs` and return the same shape `uk-darwin.js`'s `fetchStationBoard()` returns, but with `mode: "metro"`. Simplest path: add a `crs` override (or a `mode` passthrough) to `fetchStationBoard()` in `uk-darwin.js` so it can be called with a pre-resolved entry, rather than duplicating its `excludeOperators`/`includeOperators` filtering here. Do not call `fetchDepartureBoard()` directly from the region file if you can avoid it — the operator filters live upstream for a reason.
- Delete `MerseyrailFeedUnconfirmedError` and its export. Do not leave it as a dead class "for parity". Grep for every import (`dogfood-next-train.js`, the gate, `registry.js` prose, the region file header) and remove each.
- Rewrite the file header: Merseyrail is Darwin-served; the two-layer (train/metro) catalog split is kept only for the picker's mode label, not because the feeds differ. Remove every mention of the Lime Street doNotGroup and H1 from the header.
- Missing-token behaviour must stay identical to National Rail: with no `DARWIN_LDB_TOKEN`, a Merseyrail lookup surfaces `MissingDarwinTokenError`, not swallowed, not fabricated. Same shape West Midlands' gate already asserts.

### 2b. No operator filters anywhere, and Lime Street becomes one entry

Every board in this region shows every train Darwin returns for that CRS. Do not add `excludeOperators` or `includeOperators` anywhere in this region. Liverpool South Parkway's train entry keeps its five Merseyrail services alongside Northern and TfW; the Merseyrail-owned stations that get an occasional Northern train (Ellesmere Port–Helsby) show that too. This is the walk-up rule in `docs/board-eligibility-rule.md` applied literally.

Lime Street (Tim's option B, 4 Sep 2026):

- `stations.json`: **delete** the metro-mode entry `merseyrail:liverpool-lime-street` (the only Merseyrail stop with `crs: null`). Keep the train-mode entry (`crs: "LIV"`) and strip its `doNotGroup` field and reasoning text. Merseyrail count becomes **68**, total **97**.
- The one remaining Lime Street entry returns the full LIV board: Northern, Avanti, TPE, LNR & WMR, and Merseyrail together, each with its platform. A rider picks a direction chip such as "Ellesmere Port (Merseyrail)" and the mix does not matter.
- `resolveCatalogEntry("Liverpool Lime Street", "metro")` must now return null, not fall through to the rail entry. Check `isForbiddenCollapseName` and the dispatcher in `dogfood-next-train.js` for any Lime Street special-casing and remove it.
- `qa/uk-region-catalog-conformance.mjs`: its Liverpool block asserts the two Lime Street entries resolve distinctly by mode. Replace that with: exactly one Lime Street entry, mode train, CRS LIV.
- `docs/jim-brief-donotgroup-picker-disambiguation.md` was written for this pair. Its fix stays (East Midlands' Nottingham Station still needs it), but Liverpool no longer has a same-name pair; note that in the PR.
- Hazard pack H1, the registry `notes` paragraph on "LIME STREET STRUCTURAL AMBIGUITY", and `published-network.json`'s doNotGroup text: add a dated line saying H1 is closed as moot under option B (one CRS, one board, platforms from Darwin). Do not delete the history.

### 2c. `lib/cities/liverpool-city-region/dogfood-next-train.js`

- `fetchBoardForMode("metro")` already routes to `fetchMerseyrailStopBoard()`; it should now just work. Remove the header text and the `MerseyrailFeedUnconfirmedError` import/re-export.
- Direction chips: `directionChip()` yields `"Liverpool Central (Merseyrail)"`, `"Ellesmere Port (Merseyrail)"`, and so on — same destination+operator shape as every UK region. Take Darwin's destination verbatim. Do not map through `MERSEYRAIL_LINES`/`mapMerseyrailDestination` at chip time; that module is the marketing model and stays as it is.
- Directions now derive live for **all 98 stations**, including the ~60 Merseyrail stops that have no `line` field. The "termini-only" limit in `marketing-directions.js` was a consequence of having no live data; it is not a limit on which stations get directions. Do not gate any station's board or directions on whether it has a line assignment or a marketing chip.
- This pass also discharges the rescope handoff's item 1 ("verify the generic adapter needs no code change for 98 stations"). Confirm counts come from `stations.json`, not from a hand-written list, and say so in the PR.

### 2d. `qa/liverpool-city-region-dogfood-gate.mjs`

- Drop every assertion that the Merseyrail board throws `MerseyrailFeedUnconfirmedError`.
- Add, following the West Midlands gate's pattern: with the token absent, metro-mode lookup of Ellesmere Port surfaces `MissingDarwinTokenError`. With the token present: all 68 Merseyrail entries resolve to a non-null CRS and dispatch to Darwin (structural, no network); a live sample of at least Ellesmere Port, Liverpool Central, Moorfields, and one un-named intermediate stop (e.g. Aigburth) each return at least one trip whose `operator` includes "Merseyrail"; Lime Street returns Merseyrail trips **alongside** the other operators; metro-mode lookup of "Liverpool Lime Street" resolves to nothing.
- Change the count assertions to 68 Merseyrail / 29 National Rail. Delete the Lime Street doNotGroup assertions (lines around 156–176 of the current gate). Keep every other assertion.

### 2e. Prose that now lies (fix in the same PR, do not leave for later)

- `lib/providers/registry.js` Liverpool entry: `integration` and `notes` both say Merseyrail real-time is unconfirmed and `out-product`. Rewrite to: Merseyrail served by Darwin via `uk-darwin.js`, verdict `in`, live from the same token. Remove the "contact data@merseyrail.org" open item.
- `stations.json` `feeds.metro`: change `"merseyrail-static-gtfs-confirmed-no-realtime-confirmed"` to `"darwin"`.
- `docs/liverpool-city-region-d1/oracle-clash-report.md` Board eligibility section: add a dated correction (4 Sep 2026) under the existing 2 Sep correction, changing the Merseyrail row from `out-product` to `in` with the ELP/LVC/MRF probe above as evidence. Precedent for in-place dated corrections to Nico's report already exists in that section; follow it, do not rewrite history silently.
- `published-network.json` `notes` if it repeats the verdict.
- `docs/liverpool-city-region-d1/jim-handoff.md`: append a short dated note pointing at this brief.

## 3. Verify

1. `node qa/lane-lock.mjs check united-kingdom` was run at the top level on 4 Sep 2026: free. Run `acquire united-kingdom liverpool-city-region adapter` before touching shared files (`uk-darwin.js`, `uk/catalog.js`).
2. `node qa/liverpool-city-region-dogfood-gate.mjs` green with and without `DARWIN_LDB_TOKEN`.
3. `node qa/uk-region-catalog-conformance.mjs` green (exactly one Lime Street entry).
4. Manual: `getLiverpoolCityRegionDogfoodNextTrain({ station: "Ellesmere Port", mode: "metro", destination: "Liverpool Central (Merseyrail)", leaveBeforeMinutes: 10 })` returns a leave-by against a real 07:xx service. `"Liverpool Lime Street"` with no mode returns directions that include both a Merseyrail chip and an Avanti or Northern chip. Liverpool South Parkway in train mode shows a Merseyrail chip next to a Northern one. The station picker shows Lime Street once.
4b. Sweep: a throwaway script that calls the metro-mode board for every one of the 68 Merseyrail entries and prints `name, crs, tripCount, operators`. Every row must have a CRS and must not throw. Paste the output in the PR. Any station returning zero trips at a sensible hour is a catalog problem to report, not to hide.
5. `grep -rn MerseyrailFeedUnconfirmedError .` returns nothing outside `docs/` history.
6. `node qa/run-all.mjs --smoke` green.
7. Open the PR as a normal change (not a flip PR — the region is already live). Mark re-QAs Liverpool afterwards; the rescope addendum already required that re-QA for the 98-station catalog, so this rides the same pass.
