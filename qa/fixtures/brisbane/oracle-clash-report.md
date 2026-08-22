# Brisbane oracle clash report (D1 vs diagram vs GTFS)

**Pack:** Luke / Brisbane D1 research  
**D1 retrieved:** 2026-08-22 — [QR text map](https://www.queenslandrail.com.au/forcustomers/stations-and-maps/text-version-of-seq-network-map)  
**Diagram (cited only):** Translink SEQ network map, 10 Aug 2026 — [translink.com.au/plan-your-journey/maps](https://translink.com.au/plan-your-journey/maps)  
**GTFS snapshot inspected:** SEQ_GTFS.zip, feed span **2026-08-22 → 2026-10-21** ([gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip](https://gtfsrt.api.translink.com.au/GTFS/SEQ_GTFS.zip))

This report compares the **published map oracle** (`published-network.json`) against GTFS static and, where noted, the Aug 2026 diagram. Disagreement is expected and valuable — do not auto-resolve.

---

## H2 · T-line numbering lag

| Source | T1–T6 present? | How lines are identified |
|--------|----------------|--------------------------|
| Translink timetable index | **Yes** — T1–T6 rows with route-code lists | [jp.translink.com.au/plan-your-journey/timetables/train](https://jp.translink.com.au/plan-your-journey/timetables/train) |
| Translink SEQ diagram (Aug 2026) | **Yes** — T numbers on map (cited, not transcribed here) | Aug 2026 rollout per [Translink announcement](https://translink.com.au/news-and-media/articles/1130511) |
| SEQ GTFS `routes.txt` (20260822–20261021) | **No** | `route_short_name` still uses legacy codes: `CAIP`, `FGBN`, `BDVL`, `BRDB`, `CADB`, `DBCA`, etc. No `T1`…`T6` values observed |

**Implication for Jim:** C1 mapping must bridge T-numbers (published) ↔ legacy route codes (GTFS). Riders search "T5"; GTFS still says `BDVL`.

### Timetable index → GTFS route codes (reference)

| T-line | Timetable name | Route codes listed |
|--------|----------------|-------------------|
| T1 | Caboolture / Ipswich / Nambour | BRCA, BRNA, CABR, CAIP, IPCA, IPNA, NABR, BRGY, GYBR |
| T2 | Kippa-Ring / Springfield Central | BRRP, RPBR, SPRP |
| T3 | Doomben | BRDB, DBBR *(weekday shuttle also CADB/DBCA — see H3)* |
| T4 | Cleveland / Shorncliffe | BRCL, CLBR, CLSH, SHCL, BRSH, SHBR |
| T5 | Brisbane Airport / Varsity Lakes | BDVL, BRBD, BRBR, VLBD, BRVL, VLBR |
| T6 | Beenleigh / Ferny Grove | BNBR, BNFG, BRBN, FGBN |

---

## C2 · Station name mismatches

| Published (D1) | GTFS / diagram | Disposition | Notes |
|--------------|----------------|-------------|-------|
| Brisbane Central | Central station (`place_censta`) | **rename** | Product lock: display **Central**. Alias D1 → Central in conformance layer. |
| Boggo Road | Boggo Road station (`place_parsta` parent); platforms also under `place_brse` | **match** (with alias nuance) | Tim locked **Boggo Road**, not Park Road. GTFS parent `place_parsta` is already named "Boggo Road station"; rail platforms split across `place_brse` (busway, platforms 3–4) and `place_parsta` (platforms 6–8). Catalog must union both parents (H1). |
| Domestic Airport | Brisbane Domestic Airport (typical GTFS long name) | **rename** | D1 prints "Domestic Airport". Verify exact `stop_name` at snapshot time. |
| International Airport | Brisbane International Airport | **rename** | Same pattern as Domestic. |

No "Park Road" appears on D1. Any legacy "Park Road" label in product or old docs should not override the Boggo Road lock.

---

## C3 · Station set / order disagreements

### C3-1 · Inner-city spine (all T-lines)

D1 uses **Brisbane Central** once per through-run. GTFS uses **Central station**. Order through the CBD spine is consistent across sources once Central is aliased; inner-city order is where §3 direction labels will live or die (H6).

### C3-2 · Boggo Road vs branch split (T4/T5/T6)

| Line | D1 order past South Bank | GTFS through-running |
|------|--------------------------|----------------------|
| T6 | … South Bank → **Boggo Road** → Dutton Park → … (Beenleigh branch) | `FGBN` serves Boggo Road then Beenleigh corridor |
| T4 | … South Bank → **Boggo Road** → Buranda → … (Cleveland branch) | `CLSH` / `BRCL` Cleveland corridor |
| T5 | … South Bank → **Boggo Road** → **Altandi** (express skip) | `BDVL` may serve additional stops (Fairfield–Kuraby) on some trips |

**Branch trap (H4):** Cleveland and Beenleigh diverge after Boggo Road. Do not collapse Beenleigh and Cleveland termini at Boggo Road.

### C3-3 · T1 Petrie → Northgate gap (D1 vs T2/diagram)

| Segment | D1 (T1 Caboolture corridor) | T2 + diagram (Kippa-Ring corridor) |
|---------|----------------------------|-------------------------------------|
| Petrie → Northgate | **Petrie → Northgate** (no intermediate stops listed) | Lawnton, Bray Park, Strathpine, Bald Hills, Carseldine, Zillmere, Geebung, Sunshine, Virginia |

D1 prose for the Caboolture/Sunshine Coast line reads: *"…Dakabin, Petrie, Northgate, Eagle Junction…"* — it does **not** list the Redcliffe Peninsula stations between Petrie and Northgate.

The diagram and T2 list the full Kippa-Ring corridor including Lawnton–Virginia. This is a **published-map simplification** (T1 corridor description elides stations shared with T2), not evidence those stations lack T1 service in GTFS.

**Conformance stance:** C3 failure is expected here until Tim decides whether D1's elision is acceptable for the oracle or the transcription should inherit the full Petrie–Northgate sequence from the diagram for the shared track section.

### C3-4 · T5 express-style stopping pattern (D1 vs GTFS all-stops)

D1 Gold Coast line text: *"…Boggo Road, Altandi, Loganlea, Beenleigh, Ormeau…"* — skipping Fairfield, Yeronga, Kuraby, etc.

GTFS `BDVL` trips commonly serve the full Beenleigh-corridor stopping pattern (all-stops) on many services. D1 describes the **map's express-style** representation, not every stopping pattern in the feed.

| D1 T5 stations after Boggo Road | Often present on GTFS BDVL |
|---------------------------------|----------------------------|
| Altandi | Yes |
| Loganlea | Yes |
| *(skipped on D1)* Dutton Park, Fairfield, Yeronga, Yeerongpilly, Moorooka, Rocklea, Salisbury, Coopers Plains, Banoon, Sunnybank, Runcorn, Fruitgrove, Kuraby, … | Often yes (all-stops services) |

**Conformance stance:** Treat as **pattern variant**, not a missing station. Generator should not force a single stopping pattern per T-line.

---

## Stations on GTFS but not on D1 map prose

| Station / service | GTFS evidence | On D1 T-lines? |
|-------------------|---------------|----------------|
| Exhibition | `CAEX`, `EXCA`, `EXGY`, `GYEX`, `EXNA`, `NAEX`, `EXRP`, `RPEX`; calendar `QR 26_27-43781` (Sat **2026-08-29**), `QR 26_27-43782` (Sun **2026-08-30**) only | **No** — event-only, not a T-line |
| Cross River Rail future stations | Mentioned in D1 "Future lines" footer only | Not in current `stations` arrays |

---

## Summary for Jim (C2/C3 only)

| ID | Status | Action |
|----|--------|--------|
| C2 Central rename | Locked | Alias Brisbane Central → Central |
| C2 Boggo Road | Locked | Use Boggo Road; union `place_brse` + `place_parsta` stopIds |
| C3-3 T1 Petrie–Northgate | Open | Document elision; do not silently merge T1/T2 lists |
| C3-4 T5 express vs all-stops | Open | Allow pattern variants in generator |
| H2 T-numbers | Locked fact | Map uses T1–T6; GTFS still legacy codes |

**D5 label assertions:** blocked until Tim locks §3 (done — see `direction-model-memo.md`). **D2 generator:** Jim still owns; not in this pack.
