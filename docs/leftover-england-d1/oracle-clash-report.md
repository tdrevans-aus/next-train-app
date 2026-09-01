# Leftover England oracle clash report — SCOPE DEFERRED

**D1 status (2026-09-01):** Research finds that "Leftover England" as a catch-all region is not buildable as a unified scope. Regional boundaries established by all other UK National Rail regions leave no contiguous English territory unclaimed, only fragmented gaps across multiple geographies. This report documents those gaps and recommends deferring "Leftover England" in favor of building explicit regions for Greater Anglia, Southwest, and Cumbria.

## Scope analysis — what's actually left

**Regions already built (D1 packs exist):**
1. London TfL (uk-london-tfl) — LIVE
2. London & South East National Rail — London termini + South East (Kent, Surrey, Sussex, Essex margins)
3. Thames Valley — Reading, Oxford
4. Solent — Southampton, Portsmouth
5. West of England — Bristol, Bath
6. West Yorkshire — Leeds, Bradford, Halifax
7. South Yorkshire — Sheffield
8. East Midlands — Nottingham, Leicester (through-running)
9. North East — Newcastle, Tyne & Wear
10. Greater Manchester — Manchester, Metrolink
11. Liverpool City Region — Liverpool, Merseyrail, Ellesmere Port

**Regions built but status unclear:**
12. West Midlands — tracker shows "planned" status; no D1 pack exists yet

**Regional boundaries and explicit exclusions found:**

### 1. Greater Anglia / East Anglia — EXPLICITLY EXCLUDED from London & South East, no separate region built

The **London & South East National Rail** oracle report (line 23) explicitly states:

> "**East of England / Greater Anglia boundary:** Greater Anglia services from Liverpool Street to East Anglia (Norwich, Cambridge, Peterborough). Separate region; services don't overlap into SE internally."

**Interpretation:** Greater Anglia services call at Liverpool Street (London & SE terminus) but their home region (East Anglia proper) is a separate, unbuilt region. This covers:
- Norwich (primary hub candidate)
- Cambridge (major station)
- Peterborough (through-running point, also mentioned as East Midlands boundary in LNER direction)
- King's Lynn, Ely, Thetford, and other East Anglian stations

**Status:** No greater-anglia-d1 folder. No tracker row. No oracle report. Not built.

### 2. Southwest / Devon / Cornwall — EXPLICITLY DEFERRED from West of England

The **West of England** oracle report (line 20) lists:

> "| **Taunton** | **TAU** | **through-running point toward Southwest/Devon region**. Not a merge. National Rail only; GWR services continue west to Exeter and beyond. |"

**Interpretation:** West of England explicitly stops at Taunton and defers Exeter, Plymouth, Penzance, and Southwest England stations to a future "Southwest/Devon region". This covers:
- Exeter (primary hub candidate)
- Plymouth (major station)
- Penzance (branch terminus)
- Taunton (boundary, already listed in WoE)
- Totnes, Dawlish, Newton Abbot, and other South West Main Line stations

**Status:** No southwest-d1 or devon-d1 folder. No tracker row. Not built.

### 3. Cumbria / North West beyond Greater Manchester & Liverpool — NOT COVERED BY ANY REGION

No oracle report or tracker row explicitly covers:
- Carlisle (primary hub candidate, significant English station)
- Kendal, Oxenholme, and Lake District stations
- Penrith, Lockerbie (Scottish boundary)
- Barrow-in-Furness, Furness Line stations

**Status:** No cumbria-d1 folder. No tracker row. Not built. Cumbria appears to fall between Greater Manchester/Liverpool City Region (south/southwest) and Rest of Scotland (north).

### 4. Lincolnshire — UNCLEAR COVERAGE, possibly gaps

The **East Midlands** oracle report lists Chesterfield, Alfreton, Kettering, Wellingborough as through-running stations but does not explicitly define whether Lincolnshire (Lincoln, Boston, Spalding, Grimsby area) is covered by East Midlands, Leftover England, or a future region.

**Status:** Transitional, depends on East Midlands scope definition. No explicit D1 pack coverage found.

## Why "Leftover England" is not a buildable single region

1. **Geographic fragmentation** — The gaps (East Anglia, Southwest, Cumbria, Lincolnshire boundaries) are scattered across England in non-contiguous chunks separated by already-built regions.

2. **Each gap has natural hub-lock candidates that would normally justify its own region:**
   - Greater Anglia: Norwich or Cambridge as hub-lock
   - Southwest: Exeter as hub-lock
   - Cumbria: Carlisle as hub-lock

3. **Size of gaps** — Building Leftover England as a unified catch-all would require either:
   - One enormous region spanning East Anglia + Southwest + Cumbria + misc. rural stations (too large, too geographically incoherent)
   - A placeholder region with minimal content (defeats the purpose of a "next-train" catalog)

4. **Existing precedent** — The tracker explicitly separated Solent and Thames Valley from a generic "catch-all" (line 25 of tracker: "Catch-all after Solent / Thames Valley split"), implying that once those two were carved out, a "Leftover England" would remain. But this was speculative; the actual remaining gaps don't form a coherent region.

## Recommendation

**Defer "Leftover England" and build explicit regions instead:**

1. **Greater Anglia** (priority) — East Anglia region covering Norwich, Cambridge, Peterborough, King's Lynn, Thetford, Ely. Hub-lock: Norwich (NRW, ~100 stations) or Cambridge (CBG). Operator: Greater Anglia (Stagecoach). Feed: National Rail GTFS + Darwin OpenLDBWS (same DARWIN_LDB_TOKEN as other UK regions). Through-running: Thameslink at Cambridge, LNER at Peterborough (boundaries with London & SE / East Midlands).

2. **Southwest / Devon / Cornwall** (second priority) — Southwest region covering Exeter, Plymouth, Penzance, Taunton, Totnes, Barnstaple. Hub-lock: Exeter St Davids (EXD, ~50 stations) or Plymouth (PLY). Operators: Great Western Railway (primary), CrossCountry (through-running). Feed: Darwin OpenLDBWS (same DARWIN_LDB_TOKEN). Boundaries: Taunton with West of England, Exeter with East Midlands (LNER through-running).

3. **Cumbria / North West Lakes** (third priority) — Cumbria region covering Carlisle, Kendal, Penrith, Barrow-in-Furness. Hub-lock: Carlisle (CAR, ~30 stations). Operators: Northern Trains, TransPennine Express (Scotrail at boundary). Feed: Darwin OpenLDBWS. Boundaries: south with Liverpool City Region / Greater Manchester, north with Rest of Scotland.

4. **Lincolnshire** (clarify scope) — Coordinate with East Midlands to determine whether Lincolnshire stations (Lincoln, Boston, Spalding, Grimsby, Skegness) are already in East Midlands scope or should be split into a separate region. If separate: Hub-lock Lincoln (LCN) or Grimsby (GMB).

## If "Leftover England" must proceed as a single region

If Tim decides "Leftover England" must be built as a unified catch-all (not recommended), the only honest scope would be:

**Leftover England (minimal definition):** All National Rail stations in England not explicitly claimed by the 11+ already-built regions, treating it as a flat, low-priority repository for small market towns, rural branch-line termini, and miscellaneous through-running stations. This includes:
- Greater Anglia corridor (Norwich, Cambridge, Peterborough) — full regional service coverage required
- Southwest corridor (Exeter, Plymouth, Penzance) — full regional service coverage required
- Cumbria corridor (Carlisle, Kendal, Penrith) — full regional service coverage required
- Lincolnshire stations (if not in East Midlands) — through-running only
- Miscellaneous rural branch termini (Isle of Wight, Welsh Marches rural lines, etc.) — triage needed

**Scale:** ~150–200 stations across four geographically separate corridors, none of which share a hub or coherent geography.

**Skip risk:** Very high. Building a single "Leftover England" region spanning East Anglia, Southwest, Cumbria, and miscellaneous rural areas would require:
1. Four separate direction models (one per corridor)
2. Four separate hub-locks (Norwich, Exeter, Carlisle, + generic catch-all)
3. No coherent onboarding story for users (why is Norwich and Exeter in the same "city"?)
4. High maintenance burden (each sub-corridor would evolve independently)

This structure violates the pattern used for every other region (one geographic hub, one direction model, one operator story). Nico does not recommend proceeding with this scope.

## Conclusion

**City ID:** Do not assign. "Leftover England" is not a buildable region as currently scoped.

**Status:** Deferred. Recommend Tim / Luke reconceive the tracker to list:
- uk-greater-anglia (Norwich hub, East Anglia)
- uk-southwest (Exeter hub, Devon/Cornwall)
- uk-cumbria (Carlisle hub, Lakes)
- Clarify Lincolnshire scope with East Midlands

**No D1 pack, no oracle report, no published-network.json for Leftover England itself.** The regional boundaries already established by the 11 built regions are explicit and coherent. Attempting to cram the remaining English stations into a single "Leftover" region creates a catch-all that violates the design pattern and will be difficult to ship and maintain.

## References

- **London & South East National Rail oracle:** docs/london-se-national-rail-d1/oracle-clash-report.md (lines 20–23, explicitly calls Greater Anglia a separate region)
- **West of England oracle:** docs/west-of-england-d1/oracle-clash-report.md (line 20, explicitly defers Southwest/Devon)
- **UK coding brief:** docs/uk-coding-brief.md (line 176, mentions "Residual England" as East Anglia rural, Devon/Cornwall, Cumbria, Lincolnshire)
- **Expansion tracker:** docs/expansion-tracker/cities.csv (row 25, defines Leftover England as "catch-all after Solent / Thames Valley split")

---

**Nico's final note:** Do not build this region as a catch-all. Either commit to Greater Anglia, Southwest, and Cumbria as explicit regions, or clarify from Tim / the product team what "Leftover England" actually means. Silence on scope creates rework downstream.
