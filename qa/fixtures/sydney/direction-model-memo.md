# §3 direction model — decision memo (Sydney)

**Pack:** Luke / Sydney D1 research  
**Status:** **LOCKED by Tim** (2026-08-23)  
**Blocks:** D5 direction-label assertions (still held)

---

## Decision

**Use line + terminus:** show the T/M number and the far terminus for the direction of travel.

Examples:

- `T1 Emu Plains`
- `T4 Cronulla`
- `M1 Tallawong`
- `T6 Bankstown`

Not terminus-only (Perth-style). Not inbound/outbound as the primary label. **City Circle is a loop, not a terminus** — never `T2 City Circle` as a far-end chip.

---

## Why this model for Sydney

Sydney is **through-running numbered lines** plus Metro, not a Perth-style hub. Every heavy-rail line and M1 calls at Central (Metro on a separate stop graph). Terminus-only at Central would surface a dozen far ends with no line context. Line + terminus matches what riders already see on TfNSW pages (T1–T9, M1) and platform screens.

| Model | Central example | Pros | Cons |
|-------|-----------------|------|------|
| **Line + terminus** *(locked)* | `T1 Emu Plains` | Matches published T/M numbers; splits T1’s three far ends; splits Metro vs Trains | Needs C2 stopId split so M1 Central is not mixed into T1 |
| Terminus only (Perth-style) | `Emu Plains` (+ many others) | Simple | Unusable at Central / Town Hall |
| Inbound/outbound + terminus | `Outbound · Emu Plains` | Familiar phrase | Ambiguous on through-running T1/T9 and on City Circle |

---

## Locked display rules

| Topic | Use | Do not use |
|-------|-----|------------|
| T1 western far end | **T1 Emu Plains** (example in Tim lock) | City / Town Hall as a T1 terminus |
| City Circle | Via / loop context only if needed later | City Circle as a terminus |
| M1 | **M1 Tallawong** / **M1 Sydenham** | M1 Bankstown until D1 stops list Bankstown |
| T6 leftover rail | **T6 Bankstown** / **T6 Lidcombe** | Calling T6 “Metro” |
| T4 south | **T4 Waterfall** / **T4 Cronulla** | T4 Helensburgh (SCO, out of modes v1) |
| Shared names | Distinct catalog rows per mode | Shared `stopIds` for Central, Martin Place, Epping, Chatswood, Sydenham |

---

## Example labels (illustrative — not D5 assertions)

These are **examples for Tim's locked model**, not test assertions. Jim holds D5 until explicitly cleared.

### Central (Trains parent)

| Trip context | Label |
|--------------|-------|
| Western through-service | `T1 Emu Plains` |
| Richmond branch | `T1 Richmond` |
| North Shore | `T1 Berowra` |
| Inner West / Leppington | `T2 Leppington` |
| Liverpool via Regents Park | `T3 Liverpool` |
| Illawarra | `T4 Waterfall` or `T4 Cronulla` |
| Airport & South | `T8 Macarthur` |
| Northern | `T9 Hornsby` or `T9 Gordon` |

### Central (Metro parent — different stopIds)

| Trip context | Label |
|--------------|-------|
| North West | `M1 Tallawong` |
| South (published) | `M1 Sydenham` |

### Town Hall

Same T-numbers as Trains Central. Still line + terminus. Loop services (T2/T3/T8) take the far suburban terminus, not “Circular Quay” unless that trip actually terminates there (it should not, on D1).

### Blacktown

| Trip context | Label |
|--------------|-------|
| Main west | `T1 Emu Plains` |
| Richmond line | `T1 Richmond` |
| Cumberland | `T5 Richmond` or `T5 Leppington` |

### Sutherland

| Trip context | Label |
|--------------|-------|
| Cronulla branch | `T4 Cronulla` |
| Waterfall | `T4 Waterfall` |

### Lidcombe

| Trip context | Label |
|--------------|-------|
| T6 shuttle | `T6 Bankstown` |
| T7 shuttle | `T7 Olympic Park` |
| T1 / T2 through | `T1 Emu Plains` / `T2 Leppington` as applicable |

---

## H2 bridge

Passenger pages already have T/M numbers. Public Greater Sydney GTFS zip also has T1–T9 and M1 (no key). Gateway Trains/Metro URLs still 401 without `TFNSW_API_KEY`. Label layer should print the published T/M number; identity still comes from the keyed split feeds when Jim wires D2.

---

## What Jim should do / not do

| Do | Don't |
|----|-------|
| Own D2–D6 (topology, catalog, sweep) | Write D5 label assertion table yet |
| Structure D5 later with one top-of-file label table | Pick a different §3 model |
| Split Metro vs Trains stopIds at C2 names | Share stopIds because the place-name matches |
| Keep city `planned` | Flip `sydney` live |
| Leave Perth and Brisbane live-gates untouched | Copy Brisbane no-DST (H7) |
| | Implement a generator from this pack |

---

## Open items (not §3)

- C3-1: shared T2/T3 PDF — topology, two line ids  
- C3-2: Helensburgh SCO on T4 PDF — suppress  
- C3-3: M1 printed Bankstown vs Sydenham stops  
- T7 event through-running — H3, not §3  
- D5 held until Tim clears
