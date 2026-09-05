# Jim brief — CRS corrections: Rest of Wales (8) and Rest of Scotland (3), live-verified

**Dispatched:** 5 Sep 2026 (Tim's call) · **Lane:** `united-kingdom`, region label
`crs-corrections`, stage `adapter` · **Regions:** `rest-of-wales`, `rest-of-scotland` (both
planned, no flip). Copy this file into the repo as `docs/jim-brief-uk-crs-corrections.md` and
commit it with the change.

## The live finding (probe 5 Sep 2026, ~06:50 Europe/London, `scripts/probe-uk-board.mjs --crs=`)

Both packs shipped CRS codes that were never verified (`crsVerified` unset). Probing every code
against Darwin: eleven are wrong. Five return HTTP errors (no such CRS) and six silently resolve
to a **different, English** station — the dangerous case, since a board would render with no
error.

| Region | Catalog name | Wrong code → what Darwin returned | Correct code (live-verified) |
|---|---|---|---|
| rest-of-wales | Conwy | CON → error | **CNW** (4 trips, TfW) |
| rest-of-wales | Holyhead | HOY → Honley (Yorkshire, Northern) | **HHD** (6 trips, TfW) |
| rest-of-wales | Welshpool | WEL → Wellingborough (EMR) | **WLP** (3 trips, TfW) |
| rest-of-wales | Machynlleth | MCH → March (Cambridgeshire) | **MCN** (4 trips, TfW) |
| rest-of-wales | Whitland | WLD → West St Leonards (Southeastern) | **WTL** (6 trips, TfW) |
| rest-of-wales | Tenby | TNB → error | **TEN** (2 trips, TfW) |
| rest-of-wales | Milford Haven | MLH → Mill Hill (Lancashire, Northern) | **MFH** (1 trip, TfW) |
| rest-of-wales | Fishguard Harbour | FGW → Fishguard & Goodwick (a real but different station, one stop short of the harbour) | **FGH** — verify live before committing; if FGH returns no board, keep FGW and rename the entry "Fishguard & Goodwick", and say which you did |
| rest-of-scotland | Dundee | DDE → error | **DEE** (12 trips, ScotRail) |
| rest-of-scotland | Kyle of Lochalsh | KLS → error | **KYL** (board valid, 0 trips at 06:50 — re-probe later in the day and paste the transcript) |
| rest-of-scotland | Thurso | THR → error | **THS** (2 trips, ScotRail) |

Codes that were probed and are correct, leave untouched: WRX, LLJ, BNG, AYW, PWL, CMN, NAR, PMD,
LLE (Wales); PTH, INV, ABD, WCK, MLG, FTW, GLC, GLQ, EDB, HYM, SLA (Scotland).

## What to change

1. `lib/cities/rest-of-wales/stations.json` and `lib/cities/rest-of-scotland/stations.json`: fix
   the codes above and set `crsVerified: true` on every train entry in both files (all were
   probed today), with a one-line `crsSource` noting "live Darwin probe 5 Sep 2026".
2. `qa/rest-of-wales-planned-gate.mjs` (CRS list ~line 119; Whitland/Machynlleth assertions
   ~151/155) and `qa/rest-of-scotland-planned-gate.mjs` (hub-lock list lines ~86/113/123 —
   Dundee is one of the four co-equal hub locks, so DDE→DEE appears three times): update every
   occurrence. Grep both files for each old code.
3. `lib/providers/rest-of-wales.js` and `lib/providers/rest-of-scotland.js` header comments and
   `lib/providers/registry.js` `notes` for those two regions: where they say "CRS codes
   unverified (crsVerified: false)", change to "CRS codes live-verified 5 Sep 2026 (11
   corrected — see docs/jim-brief-uk-crs-corrections.md)". Change nothing else in registry.js.
4. Also fix the D1 packs' `published-network.json`? **No.** Packs are immutable history; the
   ledger records the correction. Do not edit `docs/<region>-d1/`.
5. Do not edit `docs/united-kingdom-ledger.md` — the top-level session records this in the
   ledger closeout PR.

## Verification (report the output)

- `node qa/rest-of-wales-planned-gate.mjs` and `node qa/rest-of-scotland-planned-gate.mjs` pass.
- `node qa/uk-region-catalog-conformance.mjs` passes (it asserts rest-of-wales 17+0 and
  rest-of-scotland 9+0 — counts are unchanged, only codes).
- Probe transcript for every corrected code pasted in the PR body (re-run them).
- `node qa/run-all.mjs --smoke`; kill it if it stalls past 12 minutes, say which scripts hung,
  leave no node processes behind.

## Guardrails

- `node qa/lane-lock.mjs check united-kingdom` first; acquire
  `node qa/lane-lock.mjs acquire united-kingdom crs-corrections adapter` before editing.
- Own worktree, branch from `origin/master`. No `status` changes, no catalog additions or
  removals, no `uk-darwin.js`.
- One PR titled "CRS corrections: Rest of Wales (8) + Rest of Scotland (3), live-verified", with
  the release command (`node qa/lane-lock.mjs release united-kingdom crs-corrections`) in the body.
