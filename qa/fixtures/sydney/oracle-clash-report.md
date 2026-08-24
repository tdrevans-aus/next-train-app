# Sydney oracle clash report (D1 vs PDF vs GTFS)

**Pack:** Luke / Sydney D1 research  
**D1 retrieved:** 2026-08-23 — [TfNSW train index](https://transportnsw.info/routes/train) + official T1–T9 / M1 line pages + current PDF timetables  
**GTFS inspected:** passenger pages (T/M numbers); public Greater Sydney complete zip (no API key); Gateway schedule/RT URLs (key required)

This report compares the **published map oracle** (`published-network.json`) against PDF booklets and GTFS identity. Disagreement is expected — do not auto-resolve. **No generator in this pack.**

Modes v1: **Sydney Trains T1–T9 + Metro M1 only.** Out of scope: light rail, ferry, bus, NSW TrainLink regional.

---

## H2 · T/M numbers vs feeds

| Source | T1–T9 + M1 present? | Auth |
|--------|---------------------|------|
| Passenger line pages + PDF titles | **Yes** — T1–T9 and M1 on the live index and each line page | None |
| Public Greater Sydney GTFS zip (`full_greater_sydney_gtfs_static_0.zip`, Hub resource updated 2026-08-22) | **Yes** — T1–T9 and M1 as passenger route names | **No API key** |
| Gateway `…/v1/gtfs/schedule/sydneytrains` and `…/metro`; `…/v2/gtfs/realtime/sydneytrains` and `…/metro` | Same products, split feeds | **401 without `TFNSW_API_KEY`** (verified 2026-08-23) |

**Name clash:** the public zip already carries the same T/M short names riders see. Gateway feeds still need a key and are split (Trains vs Metro). Do not treat “T1 in the zip” as the same stop graph as “T1 on the Trains endpoint” without checking `agency` / `route_id` / parent stop.

**Implication for Jim:** C1 can use T/M numbers as the published key. Catalog still must not collapse Metro vs Trains stops that share a place-name (C2).

---

## C2 · Same place-name, different stopIds (locked)

These names appear on **both** M1 and Sydney Trains. They must **not** share `stopIds`.

| Place-name | Metro (M1 PDF) | Trains (D1 PDFs) |
|------------|----------------|------------------|
| Central | M1 Sydenham–Tallawong | T1 / T2 / T3 / T4 / T8 / T9 |
| Martin Place | M1 | T4 Eastern Suburbs |
| Epping | M1 | T9 Northern |
| Chatswood | M1 | T1 North Shore, T9 |
| Sydenham | M1 published southern end | T4 Illawarra, T8 via Sydenham |

Existing dogfood catalog already sketches `Sydenham` vs `Sydenham Metro`. Extend that split to Central, Martin Place, Epping, and Chatswood (parent + child platforms per mode).

---

## C3 · Published booklet vs product topology

### C3-1 · T2 + T3 share one official PDF

T2 line page links `93-T2-Inner-West-Leppington-Line-20250629.pdf`.  
T3 line page links `93-T3-Liverpool-Inner-West-Line-20250629.pdf`.

The two URLs return **the same bytes** (SHA-256 `44EC82B037F99B3E7E0A3C35E061AFB1322C9C913900D9AA89256FB9018DE4FC`). Booklet masthead is **T2/3**.

Oracle still has **two line objects** (T2 Leppington & Inner West vs T3 Liverpool via Regents Park). Generator must not merge them because the PDF is shared.

### C3-2 · T4 PDF includes Helensburgh SCO intercity

T4 booklet heading: **Waterfall or Cronulla to Bondi Junction**. Columns include **Helensburgh** with service information **SCO**.

| Station | On T4 PDF? | In D1 `stations`? | Modes v1 |
|---------|------------|-------------------|----------|
| Waterfall, Cronulla, Bondi Junction | Yes | Yes | Sydney Trains T4 |
| Helensburgh | Yes (SCO) | **No** | NSW TrainLink South Coast — out of scope |

**Conformance stance:** Helensburgh on the T4 PDF is a clash, not a T4 terminus. Do not add it to the oracle.

### C3-3 · M1 name vs published stops vs leftover T6

| Source | What it says |
|--------|----------------|
| Line page + PDF title | **Metro North West & Bankstown Line** |
| M1 PDF stopping pattern (valid from 21 Oct 2024) | **Sydenham ↔ Tallawong** (Waterloo, Central, Gadigal, …) |
| T6 PDF (valid from 20 Oct 2024) | **Bankstown ↔ Lidcombe** (Yagoona, Birrong, Regents Park, Berala) |

Printed M1 name is ahead of the published stop list. Remaining heavy rail on that corridor is **T6**, not a phantom Bankstown Metro terminus.

### C3-4 · City Circle is a loop

T2, T3, and T8 PDFs list Museum, St James, Circular Quay, Wynyard, Town Hall, Central. That is a **loop**, not a terminus. T1 and T9 use Wynyard–Town Hall–Central without the loop. T4 uses Town Hall–Martin Place–Kings Cross.

---

## Summary for Jim (C2/C3 only)

| ID | Status | Action |
|----|--------|--------|
| C2 Metro vs Trains names | Locked | Distinct `stopIds` for Central, Martin Place, Epping, Chatswood, Sydenham |
| C3-1 shared T2/T3 PDF | Locked fact | Two lines; one booklet |
| C3-2 Helensburgh on T4 PDF | Locked | Exclude from T4 oracle |
| C3-3 M1 name vs Sydenham | Locked | Termini Tallawong + Sydenham; leftover rail is T6 |
| C3-4 City Circle | Locked | Loop, not a terminus |
| H2 T/M numbers | Locked fact | Pages already numbered; public zip has T/M; gateway 401 without key |

**D5 label assertions:** held. **D2–D6:** Jim. Do not flip `sydney` live. Do not touch Perth or Brisbane live-gates.
