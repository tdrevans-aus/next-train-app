# Mark QA note — LA Metrolink wire (bug-fix / product mode)

Branch: `cursor/la-metrolink-in-ruling-84bf`  
Commits checked: `aba910a` (Metrolink wire) and `2fa1d1e` (false empty-reason fix)  
PR: [#535](https://github.com/tdrevans-aus/next-train-app/pull/535)  
Date: 25 Oct 2026  
Brief: `docs/jim-brief-la-metrolink-wire.md`

**Verdict: PASS** — all acceptance items green; gate exit 0.

---

## Gate result

`node qa/los-angeles-dogfood-gate.mjs` — **EXIT 0**

```
los-angeles real-feed reachability: 334 station/terminus pairs over 110 stations, 0 unreached
Union Station Metrolink chips: [AV Line + Lancaster, OC Line + Oceanside, SB Line + Redlands - Downtown, SB Line + San Bernardino - Downtown]
Pomona North Metrolink chips: [SB Line + Redlands - Downtown, SB Line + San Bernardino - Downtown, SB Line + Union Station]
los-angeles Metrolink assertions: ok (6a-6i)
los-angeles Metrolink empty-reason assertions: ok (6j + mutation check)
los-angeles-dogfood-gate: ok (…, Metrolink group on Union Station and Pomona North boards - chip split, two stations, absent at hub, Metro survives Metrolink failure, mutation checks 6a-6j, Perth Australia green)
```

---

## Acceptance items

### 1. Metrolink rows only at Union Station (stop 107) and Pomona North (stop 109), separate from Metro chips

**PASS.**

`METROLINK_CATALOG_TO_STOP_ID` in `lib/providers/los-angeles.js` maps exactly `"Union Station" → "107"` and `"Pomona North" → "109"` — no other entries. Chips are built solely from stop_times for those stop IDs. Gate assertions 6e (no Metrolink chips at 7th St/Metro Ctr) and 6f (chip pattern separation, `isMetrolinkChip` vs `isMetroChip`) both pass.

### 2. Six lines plus short-turn chips at Union Station; SB Line only at Pomona North; westbound chip is "SB Line + Union Station"

**PASS.**

- Union Station: code derives chips from all stop_times for stop 107 — the hazard pack H4/H5 confirms all six lines (AV, VC, OC, 91-PV, RIV, SB) and their short-turn finals call at stop 107. Gate mini-fixture exercises AV, OC, SB and asserts `unionMlChips.includes("AV Line + Lancaster")`, `SB Line + San Bernardino - Downtown`, `SB Line + Redlands - Downtown` (short-turn). Full gate output: `[AV Line + Lancaster, OC Line + Oceanside, SB Line + Redlands - Downtown, SB Line + San Bernardino - Downtown]` from mini-fixture.
- Pomona North: gate asserts SB Line only (checks `!pomonaMlChips.some(c => c.startsWith("AV Line"))`, `!...OC Line`). Output: `[SB Line + Redlands - Downtown, SB Line + San Bernardino - Downtown, SB Line + Union Station]`.
- Westbound chip: gate asserts `buildMetrolinkChip("SB Line", "107", "L.A. Union Station", "109") === "SB Line + Union Station"` (6b) and `pomonaMlChips.includes("SB Line + Union Station")` (6d). Pass.

### 3. IE-OC, Pomona - Downtown, Redlands - University, and 7th St/Metro Ctr are not Metrolink chips

**PASS.**

- **IE-OC**: Hazard pack H3 confirms "IE-OC does not call at Union Station or Pomona North" (oracle clash report: "IE-OC calls at neither"). No filtering code needed — the data excludes it. Gate chip regex `/^(AV|VC|OC|91-PV|RIV|SB) Line \+ /` also wouldn't match "IE-OC Line" regardless.
- **Pomona - Downtown (stop 120)**: Not in `METROLINK_CATALOG_TO_STOP_ID`; code never queries its stop_times.
- **Redlands - University**: Hazard pack H3 and H5 confirm none of its 39 SB Line trips call at stop 107 or 109. No filtering needed.
- **7th St/Metro Ctr**: Not in `METROLINK_CATALOG_TO_STOP_ID`; gate 6e asserts `hubMlChips.length === 0`. Pass.

### 4. Missing METROLINK_API_KEY or failed live fetch does not drop Metro rows; env name METROLINK_API_KEY; header X-Api-Key; no key in repo

**PASS.**

- `lib/providers/gtfs/auth.js` lines 465–476: `readMetrolinkApiKey()` reads `process.env.METROLINK_API_KEY`; `metrolinkAuthHeaders()` sets `{ "X-Api-Key": trimmed }`.
- `fetchStationBoard` in `lib/providers/los-angeles.js`: when `mlHeaders` is null (no key) or `liveResult` failed, sets `metrolinkPartial = true` and continues; Metro Rail fetch is unconditional and unaffected. Gate assertion 6g confirms Metro rows survive a Metrolink failure.
- No key value committed: `git grep` finds no `.env` file containing a key; no key literal in any JS/JSON.
- Log/detail message includes `METROLINK_API_KEY` and the signup URL; rider-facing copy never exposes it. Comment in `los-angeles.js` line 49 confirms "never a departure time from the keyed feed."

### 5. Metrolink chip with no live row → no-live-predictions; not-currently-served only when timetable has no remaining trip; Metro chips unchanged; metrolinkPartial included; gate 6j mutation check

**PASS.**

- `2fa1d1e` adds `scheduledMetrolinkDestinationsToday()` and `scheduledMetrolinkDestinationsRemainingToday()` in `lib/providers/los-angeles.js`. Both run from the unkeyed static GTFS, even when `metrolinkPartial` is true.
- `composeStationBoard` merges their results into `board.scheduledDestinationsToday` and `board.scheduledDestinationsRemaining` via set-union with Metro Rail equivalents — comment explicitly says "Runs even when metrolinkPartial is true."
- `buildLosAngelesNextTrainFromBoard` already reads `scheduledDestinationsRemaining` to decide `no-live-predictions` vs `not-currently-served`; Metrolink chips are now present in that list when the static timetable still expects them, so they get `no-live-predictions` rather than `not-currently-served`.
- Gate 6j: asserts `partialWithStaticBoard.scheduledDestinationsRemaining.includes("AV Line + Lancaster")` on a `metrolinkPartial` board (no live rows), then asserts `mlPartialResult.emptyReason === "no-live-predictions"`. Mutation check: removing the chip from `scheduledDestinationsRemaining` asserts `emptyReason === "not-currently-served"`. Both pass (gate output: "ok (6j + mutation check)").
- Metro chips: the Metro Rail scheduled-destination logic is unchanged; gate 6g and existing honest-empty-state assertions cover this.

### 6. status stays planned; Surfliner not wired; coverage text matches

**PASS.**

- `lib/providers/registry.js` line 677: `status: "planned"`. Unchanged from before this branch.
- No reference to Pacific Surfliner in `lib/providers/los-angeles.js` (grep confirms zero hits).
- `lib/cities/los-angeles/coverage.json`: Metrolink moved to `covered` with correct detail ("Union Station (AV, VC, OC, 91-PV, RIV, SB lines — GTFS stop 107) and Pomona North (SB Line only — GTFS stop 109)"). Pacific Surfliner remains in `notCovered` as "Not shown yet." Gate asserts `coverage.notCovered.some(c => /Pacific Surfliner/.test(c.label))` — pass. `stations` field updated to "110 Metro Rail stations; Metrolink at Union Station and Pomona North."

---

## Mutation check summary (from gate)

Mutation checks 6a–6j all confirmed: each core Metrolink assertion goes red when the guarded invariant is broken. Specifically:
- 6j mutation: removing `AV Line + Lancaster` from `scheduledDestinationsRemaining` produces `not-currently-served` as expected.

---

No dev server left running. No background loops. Port 3000 clear.
