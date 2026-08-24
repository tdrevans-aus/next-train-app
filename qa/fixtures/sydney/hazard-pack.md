# Sydney hazard pack (H1–H7 evidence)

**Pack:** Luke / Sydney D1 research  
**For:** Jim (D2–D6). Not a generator. Not a live flip.  
**D1:** TfNSW line pages + current PDFs, 2026-08-23

Evidence only — no code, no `doNotGroup` auto-accept.

---

## H1 · Parent + child platforms, two modes

Highest-severity catalog bug class (same as Brisbane Central / Boggo Road).

Sydney Trains parents have many platform children. Metro M1 uses a **different** stop graph at the same place-names (C2). Missing a child = half the board. Unioning Metro children into a Trains parent = the other half of the board on the wrong mode.

Catalog `stopIds` must union **all children of one parent of one mode**, never mix Metro and Trains IDs for Central / Martin Place / Epping / Chatswood / Sydenham.

---

## H2 · T/M numbers vs keyed gateway

Passenger pages already print T1–T9 and M1. The public Greater Sydney GTFS zip (`full_greater_sydney_gtfs_static_0.zip`) carries those names **without** `TFNSW_API_KEY`. Gateway schedule/RT URLs still return **401** without the key (verified 2026-08-23):

- `https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains`
- `https://api.transport.nsw.gov.au/v1/gtfs/schedule/metro`
- `https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains`
- `https://api.transport.nsw.gov.au/v2/gtfs/realtime/metro`

Probe already fails clearly without the key. Do not scrape the public zip as a substitute for the keyed Trains/Metro endpoints without an explicit Tim lock.

---

## H3 · Services that only sometimes exist

| Pattern | Evidence | Product risk |
|---------|----------|--------------|
| **T7 Lidcombe ↔ Olympic Park** | Current PDF is shuttle-only (valid 20 Oct 2024). Special-event through-running to City is **not** in this booklet | Do not advertise City as a T7 terminus from the D1 PDF |
| **T5 Richmond arm** | 26 Jul 2026 PDF lists Leppington–Richmond; some weekday columns stop at Blacktown with Richmond rows blank | Nested short-turn (H5), not a missing station |
| **T4 Helensburgh SCO** | On the T4 PDF, not Sydney Trains T4 | Suppress from T4 direction lists (C3-2) |
| **T1 BMT footnotes** | Western PDF marks some early trips **BMT** (Blue Mountains intercity overlay) | Out of modes v1; do not treat as T1 termini |

**Sweep implication:** direction offered must respect the active day’s stopping pattern. Olympic Park event extras are H3, not extra T-numbers.

---

## H4 · Branch traps — proposed `doNotGroup` candidates

Same shape as Perth High Wycombe / Ellenbrook at Bayswater.

| Candidate pair | Junction | Reason |
|----------------|----------|--------|
| **Cronulla** ↔ **Waterfall** | Sutherland | T4 split; collapsing yields the wrong peninsula |
| **Airport** (Domestic/International) ↔ **Sydenham / St Peters** | Wolli Creek | T8 via Airport vs via Sydenham |
| **Emu Plains** ↔ **Richmond** | Blacktown | T1 western fork |
| **Leppington** ↔ **Parramatta** | Granville / Merrylands | T2 two published termini; City Circle is not a third |
| **T2 Leppington** ↔ **T3 Liverpool via Carramar** | Cabramatta | Shared inner west, different T-number after Cabramatta |
| **T6 Bankstown** ↔ **M1 Sydenham** | Bankstown corridor | Different modes; M1 does not yet publish Bankstown stops |
| **T1 Berowra** ↔ **T9 Hornsby via Epping** | Hornsby / Gordon | Shared North Shore stations, different far end |

Jim: run `proposeDirectionGroups()` and treat these as **review proposals**, not auto-accepted.

---

## H5 · Nested short-turn chains

```
Berowra ⊃ Hornsby ⊃ Gordon ⊃ Chatswood ⊃ North Sydney
Emu Plains ⊃ Penrith ⊃ Blacktown ⊃ Parramatta ⊃ Central
Richmond ⊃ Schofields ⊃ Blacktown
Macarthur ⊃ Campbelltown ⊃ Glenfield ⊃ Revesby
Waterfall ⊃ Sutherland ⊃ Hurstville ⊃ Bondi Junction
Cronulla ⊃ Sutherland
Leppington ⊃ Glenfield ⊃ Liverpool ⊃ Granville
```

**Risk:** Over-aggressive R1 collapse merges a short-turn headsign with its parent corridor (“Penrith” vs “Emu Plains” at Blacktown). Under-aggressive collapse duplicates chips at Central.

**Proposal:** Prefer explicit `doNotGroup` at H4 junctions. §3 is line + terminus, so opposite through-run ends must not collapse.

---

## H6 · Inner-city stations (§3 lives or dies here)

| Station | Who serves it (D1) | Trap |
|---------|--------------------|------|
| Central | T1–T4, T8, T9, **and M1** | Two stop graphs; busiest board |
| Town Hall / Wynyard | T1, T2/T3 City Circle, T4, T8, T9 | T1/T9 through vs T2/T3/T8 loop |
| Museum / St James / Circular Quay | T2, T3, T8 | Loop — **not a terminus** |
| Martin Place | T4 and M1 | C2 stopId split |
| Redfern | Almost every train line, not M1 | |

At **Central**, terminus-only would dump every far end (Berowra, Emu Plains, Richmond, Leppington, Liverpool, Bondi Junction, Waterfall, Cronulla, Macarthur, Hornsby, Gordon, Tallawong, Sydenham, …) with no T/M context. §3 is **line + terminus** — see `direction-model-memo.md`.

**D5 labels:** still held.

---

## H7 · Sydney has DST

IANA zone is `Australia/Sydney`. NSW observes daylight saving.

**Do not copy Brisbane no-DST.** Brisbane is UTC+10 year-round. Copying that assumption into Sydney boards, overnight windows, or “minutes until” will be wrong from the first October/April transition.

Perth also has no DST — that is not a Sydney shortcut either.

---

## What this pack does not do

- No line-map generator  
- No D5 assertion table  
- No `sydney` live flip  
- No edits to Perth or Brisbane live-gates
