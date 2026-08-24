# Brisbane hazard pack (H3–H6 evidence)

**Pack:** Luke / Brisbane D1 research  
**For:** Jim (`docs/jim-brief-brisbane-route-conformance.md` hazards)  
**GTFS inspected:** SEQ_GTFS.zip, 2026-08-22 → 2026-10-21

Evidence only — no code, no generator, no `doNotGroup` auto-accept.

---

## H3 · Services that only sometimes exist

### Doomben (T3) — corrected from brief draft

The Jim brief draft said "weekday-peak only". GTFS shows a different split:

| Pattern | Route codes | Weekday? | Weekend? | Stop sequence (sample trip) |
|---------|-------------|----------|----------|----------------------------|
| **Eagle Junction ↔ Doomben shuttle** | `CADB`, `DBCA` | **Yes** (Mon–Fri services) | No | Eagle Junction → Clayfield → Hendra → Ascot → Doomben |
| **City ↔ Doomben via Central** | `BRDB`, `DBBR` | Sparse weekday exceptions | **Mostly Sat/Sun** | Roma Street → Central → … → Eagle Junction → … → Doomben |

Despite the `Caboolture - Doomben` / `Doomben - Caboolture` `route_long_name`, weekday `CADB`/`DBCA` trips are a **short Eagle Junction ↔ Doomben shuttle**, not a Caboolture through-service.

**Product risk:** A naive static-directions fallback that always offers "Doomben" at Central on a weekday may be wrong if the rider expects the full-city `BRDB` pattern. A fallback that offers full-city Doomben on Sunday may be correct.

**Sweep implication (S3):** Direction offered must respect `calendar` + `calendar_dates` for the active day type.

### Exhibition — event-only, not a T-line

| Field | Value |
|-------|-------|
| GTFS routes | `CAEX`, `EXCA`, `EXGY`, `GYEX`, `EXNA`, `NAEX`, `EXRP`, `RPEX` |
| Service calendar | `QR 26_27-43781`: Saturday **2026-08-29** only; `QR 26_27-43782`: Sunday **2026-08-30** only |
| On D1 map? | **No** (not listed on any T-line) |
| T-number? | **None** — suppress from direction lists |

**Product risk:** Exhibition pollutes direction lists at Bowen Hills, Fortitude Valley, and Caboolture corridor stations on event days if not suppressed. On all other days, must not appear.

---

## H4 · Branch traps — proposed `doNotGroup` candidates

These pairs share track but diverge to different termini. Same shape as Perth High Wycombe / Ellenbrook at Bayswater.

| Candidate pair | Junction | Reason |
|----------------|----------|--------|
| **Beenleigh** ↔ **Cleveland** | Boggo Road (south) | T6 vs T4 diverge after Boggo Road; collapsing yields wrong terminus |
| **Varsity Lakes** ↔ **Beenleigh** (local stops) | Boggo Road / Logan corridor | T5 express pattern vs T6 all-stops; different stopping patterns |
| **Brisbane Airport** ↔ **Shorncliffe** | Eagle Junction (north) | T5 vs T4; shared inner north but different far ends |
| **Brisbane Airport** ↔ **Kippa-Ring** | Eagle Junction | T5 vs T2 |
| **Springfield Central** ↔ **Ipswich / Rosewood** | Darra | T2 vs T1; Springfield branch splits west |
| **Springfield Central** ↔ **Richlands** | Darra | Short-turn vs through; verify against `SPRP` patterns |
| **Nambour / Gympie North** ↔ **Caboolture** | Caboolture | Nested short-turn chain (H5); outer vs inner terminus |
| **Doomben** ↔ **any through T-line** | Eagle Junction | T3 shuttle vs T4/T5 through services |

Jim: run `proposeDirectionGroups()` and treat these as **review proposals**, not auto-accepted.

---

## H5 · Nested short-turn chains (denser than Perth)

SEQ has many more nested corridors than Perth's three chains. Examples from D1 + GTFS:

```
Gympie North ⊃ Nambour ⊃ Caboolture ⊃ Petrie ⊃ Northgate ⊃ Eagle Junction
Ipswich ⊃ Darra ⊃ (Springfield branch)
Cleveland ⊃ Manly ⊃ … ⊃ Lindum
Shorncliffe ⊃ Northgate
Ferny Grove ⊃ Mitchelton
```

**Risk:** Over-aggressive R1 collapse merges a short-turn headsign with its parent corridor. Under-aggressive collapse leaves riders with duplicate directions ("Caboolture" vs "Nambour" vs "Gympie North" at Petrie).

**Proposal:** Review every `shortTurnGroups` proposal manually. Prefer explicit `doNotGroup` at listed junctions (H4) over hoping R1 generalises.

---

## H6 · Inner-city stations (§3 lives or dies here)

Stations served by almost every T-line through the CBD:

| Station | D1 name | Product lock |
|---------|---------|--------------|
| Bowen Hills | Bowen Hills | — |
| Fortitude Valley | Fortitude Valley | — |
| Central | **Brisbane Central** (D1) | **Central** (locked) |
| Roma Street | Roma Street | — |
| South Brisbane | South Brisbane | — |
| South Bank | South Bank | — |
| Boggo Road | Boggo Road | **Boggo Road** (locked; not Park Road) |

At **Central**, a Perth-style "terminus only" model yields ~12 far termini (every paired end of every through-line). §3 is **locked** to **line + terminus** — see `direction-model-memo.md`.

**D5 labels:** still held — do not write assertion tables until Jim wires the §3 model.

---

## H1 reminder (parent + child platforms)

Not H3–H5, but highest-severity bug class:

| Parent | GTFS name | Platform children |
|--------|-----------|-------------------|
| `place_censta` | Central station | platforms 1–6 |
| `place_parsta` | Boggo Road station | platforms 6–8 |
| `place_brse` | Boggo Road busway station | platforms 3–4 |

Catalog `stopIds` must union **all** child platforms per parent (D4). Missing a platform = half the board.

---

## H7 · No DST

Brisbane is UTC+10 year-round. Do not import Adelaide/Sydney DST workarounds.
