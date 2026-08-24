# §3 direction model — decision memo (Brisbane)

**Pack:** Luke / Brisbane D1 research  
**Status:** **LOCKED by Tim** (2026-08-22)  
**Blocks:** D5 direction-label assertions (still held)

---

## Decision

**Use line + terminus:** show the T-line number and the far terminus for the direction of travel.

Examples:

- `T6 towards Beenleigh`
- `T1 towards Rosewood`
- `T5 towards Varsity Lakes`

Not terminus-only (Perth-style). Not inbound/outbound relative to CBD as the primary label.

---

## Why this model for Brisbane

Brisbane is **through-running pairs**, not a Perth-style hub. Every line passes Central; terminus-only at Central would surface ~12 unrelated far ends with no line context. Line + terminus matches what Translink introduced in Aug 2026 (T1–T6 on maps and timetables) and what riders see on platform screens.

| Model | Central example | Pros | Cons for through-running |
|-------|-----------------|------|--------------------------|
| **Line + terminus** *(locked)* | `T6 towards Beenleigh` | Matches Aug 2026 signage; disambiguates at multi-line stations; searchable ("T5") | Needs line inference when GTFS still shows `BDVL` not `T5` (H2) |
| Terminus only (Perth-style) | `Beenleigh` (+ 11 others) | Simple implementation | Unusable at Central; no line context |
| Inbound/outbound + terminus | `Outbound · Beenleigh` | Familiar to Sydney commuters | "Inbound" is ambiguous on through-running lines; extra copy |

---

## Locked display names (H6)

| Context | Use | Do not use |
|---------|-----|------------|
| Central | **Central** | Brisbane Central (D1 only) |
| South Bank corridor | **Boggo Road** | Park Road |

D1 prints "Brisbane Central" and "Boggo Road". Product normalises Central; Boggo Road is already correct on D1.

---

## Example labels (illustrative — not D5 assertions)

These are **examples for Tim's locked model**, not test assertions. Jim holds D5 until explicitly cleared.

### Central (`place_censta`)

| Trip context | Label |
|--------------|-------|
| Ferny Grove → Beenleigh through-service | `T6 towards Beenleigh` |
| Beenleigh → Ferny Grove through-service | `T6 towards Ferny Grove` |
| Ipswich → Gympie North | `T1 towards Gympie North` |
| Kippa-Ring → Springfield | `T2 towards Springfield Central` |
| Doomben shuttle via EJ (weekday) | `T3 towards Doomben` |

### Roma Street

| Trip context | Label |
|--------------|-------|
| City Doomben (weekend pattern) | `T3 towards Doomben` |
| Cleveland through-service | `T4 towards Cleveland` |
| Varsity Lakes express | `T5 towards Varsity Lakes` |

### Eagle Junction

| Trip context | Label |
|--------------|-------|
| Airport line northbound | `T5 towards Domestic Airport` |
| Shorncliffe branch | `T4 towards Shorncliffe` |
| Kippa-Ring branch | `T2 towards Kippa-Ring` |
| Doomben shuttle (weekday) | `T3 towards Doomben` |

### Darra

| Trip context | Label |
|--------------|-------|
| Springfield branch | `T2 towards Springfield Central` |
| Ipswich / Rosewood | `T1 towards Ipswich` |

### Boggo Road (`place_parsta` / `place_brse`)

| Trip context | Label |
|--------------|-------|
| Beenleigh corridor | `T6 towards Beenleigh` |
| Cleveland corridor | `T4 towards Cleveland` |
| Gold Coast express | `T5 towards Varsity Lakes` |

---

## H2 bridge (GTFS → T-line for labels)

GTFS `route_short_name` is still legacy (`FGBN`, `CAIP`, `BDVL`, …). Label layer must map route code → T-line before composing "T*n* towards *terminus*". Timetable index route-code table in `oracle-clash-report.md` is the reference bridge until GTFS catches up.

---

## What Jim should do / not do

| Do | Don't |
|----|-------|
| Build topology (D2–D4) | Write D5 label assertion table yet |
| Structure D5 with a single top-of-file label table | Pick a different §3 model |
| Use **Central** and **Boggo Road** in any preview UI | Implement generator from this pack |
| Map `FGBN` → T6, `BDVL` → T5, etc. | Flip city live; touch Perth |

---

## Open items (not §3)

- C3-3: T1 Petrie–Northgate elision on D1 vs full T2 list — topology conformance, not direction copy
- C3-4: T5 express vs all-stops — pattern variant in generator
- Exhibition suppression rule — H3, not §3
