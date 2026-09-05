# Jim brief — CRS sweep 2: Cumbria, Southwest, Greater Manchester, South Yorkshire, North East (live-verified)

**Dispatched:** 5 Sep 2026 (Tim's call) · **Lane:** `united-kingdom`, region label `crs-sweep-2`,
stage `adapter` · **Regions:** `cumbria`, `southwest`, `greater-manchester`, `south-yorkshire`,
`north-east` (all planned, no flips). Copy this file into the repo as
`docs/jim-brief-uk-crs-sweep-2.md` and commit it with the change.

## The live finding (probe 5 Sep 2026, ~08:20 Europe/London, `scripts/probe-uk-board.mjs --crs=`)

Every planned UK region's station codes were probed against Darwin (the top-level session holds
the token; you do not — rely on this transcript, do not re-probe). Results:

**Wrong codes (8):**

| Region | Catalog name | Wrong code → what Darwin returned | Correct code (live-verified) |
|---|---|---|---|
| cumbria | Oxenholme Lake District | OXO → HTTP error | **OXN** (14 trips) |
| cumbria | Penrith | PEN → **Penarth** (South Wales) | **PNR** (9 trips) |
| cumbria | Windermere | WND → **Wendover** (Bucks) | **WDM** (2 trips) |
| cumbria | Kendal | KND → **Kingswood** (Surrey) | **KEN** (4 trips) |
| cumbria | Settle | SLF → HTTP error | **SET** (4 trips) |
| greater-manchester | Stockport | SMN → **Southminster** (Essex) | **SPT** (15 trips) |
| southwest | Newton Abbot | NAB → HTTP error | **NTA** (15 trips) |
| southwest | Totnes | TON → **Tonbridge** (Kent) | **TOT** (10 trips) |

**Null codes to fill (5):** north-east Sunderland → **SUN** (15 trips); south-yorkshire
Rotherham Central → **RMC** (15), Darton → **DRT** (4), South Elmsall → **SES** (4),
Moorthorpe → **MRP** (5).

**Verified correct, leave untouched:** cumbria CAR, BIF; greater-manchester MAN, MCV, WDN;
southwest EXD, PLY, PNZ, TAU, TRU, SAU, SER; south-yorkshire SHF, MHS; north-east NCL, BWK;
london-se-national-rail WAT, VIC, LBG, LST, KGX, STP, PAD (all correct — no change to that
region); liverpool-city-region all 29 train codes and all 68 Merseyrail codes (correct — no change,
but set `crsVerified: true` there too since they were probed).

## What to change

1. Fix the 8 codes and fill the 5 nulls in each region's `lib/cities/<region>/stations.json`.
   Set `crsVerified: true` with `crsSource: "live Darwin probe 5 Sep 2026"` on **every** train
   entry in: cumbria, southwest, greater-manchester, south-yorkshire, north-east,
   london-se-national-rail, and liverpool-city-region (train and metro entries). Where a station
   had a "CRS code not given — do not guess" note, replace it with the verified code and drop the
   note.
2. Gates: grep each of `qa/cumbria-planned-gate.mjs`, `qa/southwest-planned-gate.mjs`,
   `qa/greater-manchester-*gate*.mjs`, `qa/south-yorkshire-planned-gate.mjs`,
   `qa/north-east-planned-gate.mjs`, and `qa/uk-region-catalog-conformance.mjs` for every old
   code (OXO, PEN, WND, KND, SLF, SMN, NAB, TON) and for the five station names whose CRS was
   null; update expectations. Cumbria's hub-lock assertions reference OXO (Oxenholme is a tier-2
   hub) — that appears in more than one place.
3. Provider headers (`lib/providers/<region>.js`) and `registry.js` notes for these five regions
   ONLY: where they say CRS codes are unverified or "not given — do not guess", replace with
   "CRS codes live-verified 5 Sep 2026 (see docs/jim-brief-uk-crs-sweep-2.md)". Cumbria's
   registry note also cites a "7 of 48 stations catalogued" gap — leave that sentence alone.
   Change nothing else in registry.js.
4. Ledger: append ONE Propagation-log row to `docs/united-kingdom-ledger.md` naming the 8
   corrections + 5 fills and the PR number. No other ledger edits; no `docs/<region>-d1/` edits.

## Verification (report the output)

- Each region's planned gate above passes; `node qa/uk-region-catalog-conformance.mjs` passes
  (station counts are unchanged — codes and nulls only).
- `node qa/run-all.mjs --smoke`; kill it if it stalls past 12 minutes, list which scripts hung,
  leave no node or chrome processes behind.

## Guardrails

- `node qa/lane-lock.mjs check united-kingdom` first (top level confirmed free); acquire
  `node qa/lane-lock.mjs acquire united-kingdom crs-sweep-2 adapter` before editing.
- Own worktree, branch from `origin/master`. No `status` changes, no catalog additions or
  removals, no `uk-darwin.js`.
- One PR titled "CRS sweep 2: Cumbria/Southwest/Greater Manchester/South Yorkshire/North East,
  live-verified", with this transcript in the body. The lane lock self-releases on merge (#244);
  no release commit needed.
