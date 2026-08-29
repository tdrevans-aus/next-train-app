# Los Angeles hazard pack (H1–H7)

Evidence: official Metro Rail & Busway Map (26-1362_map_GM_Master_DCR-2-copy.pdf, Last-Modified Sun 10 May 2026 05:48:27 GMT) hand-transcribed from rendered map images on 29 Aug 2026; How to Ride Metro Rail + Jun 2026 line timetables as support; empty-key Swiftly 401; product `lib/cities/los-angeles/` absent.

## H1 — parent + child

D1 has no stopIds. LA Metro transfer buildings are separate stop-places (7th St/Metro Ctr ≠ Union Station ≠ Civic Ctr/Grand Park ≠ Pershing Square ≠ Historic Broadway).

doNotGroup: **7th St/Metro Ctr** (A × B × D × E) vs **Union Station** (A × B × D + Metrolink / Amtrak / FlyAway) vs **Civic Ctr/Grand Park** (B × D) vs **Pershing Square** (B × D) vs **Historic Broadway** (A × E) vs **East LA Civic Ctr** (E; different place); **Grand Av Arts/Bunker Hill** vs **Grand/LATTC** vs **Civic Ctr/Grand Park**; **Pico** (A × E) vs **Pico/Aliso** (E); **LATTC/Ortho Institute** (E) vs **Grand/LATTC** (A) vs **37th St/USC** (J, out); **Crenshaw** (C) vs **Expo/Crenshaw** (E × K); **Aviation/Century** (C × K) vs **Aviation/Imperial** (C); **Pacific Av** (A Line Long Beach loop) vs J Line Pacific Av / Downtown San Pedro; **Slauson** A vs J Line Slauson; **LAX/Metro Transit Center** metro vs FlyAway / airport people movers; **Pomona North** metro vs Metrolink; **North Hollywood** B vs G Line busway.

## H3 — thin / event / overlay

- **G Line Van Nuys\*** closed until winter 2028 (buses at Van Nuys Bl and Oxnard St). G Line is out of v1. Overlay on the same plate — do not import as Metro Rail.
- **METRO D LINE SUBWAY EXTENSION PROJECT** west of Wilshire/La Cienega. Dashed under construction. Overlay / future. **Not** D1 stops.
- **METRO A LINE EXTENSION PROJECT** east of Pomona North. Dashed under construction. Overlay / future. **Not** D1 stops.
- **A Line timetable shorts** (Monrovia, Wardlow, APU/Citrus College) and after-8pm maintenance delays. Overlay, not a deleted D1 stop and not a terminus change.
- **J Line street service** in Downtown LA and San Pedro on the same plate. Out of v1.
- **Metrolink / Amtrak / LAX FlyAway** logos. Transfers, not D1 stops.
- **System / owl / regional maps** on the same schedules index are mixed-mode twins, not a second stop oracle.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| 7th St/Metro Ctr | A N–S vs E E–W vs B/D to Union Station / North Hollywood / Wilshire. Hub lock. Not a direction token | Map transfer; A × B × D × E. C and K absent |
| Union Station | A through (Chinatown ↔ Little Tokyo) vs B/D inner end. Metrolink/Amtrak/FlyAway. **Not 7th St/Metro Ctr** | Map; A/B/D circles; ML/AM/FA icons |
| Civic Ctr/Grand Park | B/D only. **Not 7th St/Metro Ctr.** **Not East LA Civic Ctr** | Map |
| Pershing Square | B/D only. **Not Historic Broadway** | Map |
| Historic Broadway | A/E only. **Not Pershing Square** | Map |
| Pico | A south Grand/LATTC–Long Beach vs E west LATTC/Ortho Institute–Santa Monica. **Not Pico/Aliso** | Map split south of Pico |
| Little Tokyo/Arts Dist | A north Union Station–Pomona vs E east Pico/Aliso–Atlantic | Map |
| Wilshire/Vermont | B north Vermont/Beverly–North Hollywood vs D west Wilshire/Normandie–Wilshire/La Cienega | Map split |
| Willowbrook/Rosa Parks | A vs C | Map |
| Expo/Crenshaw | E vs K (K north end) | Map |
| LAX/Metro Transit Center | C west end vs K through (Expo/Crenshaw / Redondo Beach) | Map; airplane + LAX box |
| Aviation/Century | C/K shared; C continues Aviation/Imperial–Norwalk; K continues Mariposa–Redondo Beach | Map |
| Downtown Long Beach | Clockwise A loop (5th St / 1st St / Downtown Long Beach / Pacific Av) | Map arrows |

No city loop except the A Line Long Beach one-way loop. A and E through-run downtown. B/D through-run Union Station–Wilshire/Vermont then split.

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Passenger letters only: **A B C D E K**.

A Line `shortTurns`: **Monrovia**, **APU/Citrus College**, **Wardlow** (801 timetable notes B/C/D/E). Recorded in `shortTurns`, not as termini. Termini stay **Pomona North** / **Downtown Long Beach**.

Green B/C-style inner ends do not apply. G Line Van Nuys closure is H3 / out of v1, not a rail `shortTurns` row.

## H6 — inner city (where §3 lives)

Locked set: **7th St/Metro Ctr**. Shared approaches: Union Station, Civic Ctr/Grand Park, Pershing Square, Historic Broadway, Grand Av Arts/Bunker Hill, Little Tokyo/Arts Dist, Pico, Westlake/MacArthur Park, Wilshire/Vermont, Chinatown.

7th St/Metro Ctr is a **through-cross**, not a single-end hub. Inbound/outbound vs CBD is false here (A is N–S; E is E–W; B/D continue to Union Station). Union Station / Civic Ctr / Pershing Square / Historic Broadway are other transfer buildings — still not the lock. C and K never arrive here.

## H7 — DST

**America/Los_Angeles observes DST (PDT/PST).** Do not copy Perth / Brisbane no-DST. Wall-clock is Pacific local.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| los-angeles vs city=la / lax / metro / lacmta | Do not invent a second city id |
| los-angeles vs washington / chicago / bart / boston | Other US packs; do not merge |
| 7th St/Metro Ctr vs Union Station / Civic Ctr/Grand Park / Pershing Square / Historic Broadway | Four (plus) downtown buildings |
| 7th Street/Metro Center vs 7th St/Metro Ctr | Clash-report / timetable vs map |
| Civic Ctr/Grand Park vs East LA Civic Ctr vs Grand Av Arts/Bunker Hill vs Grand/LATTC | Four “Grand/Civic” strings |
| Pico vs Pico/Aliso | Two E-family names |
| Crenshaw vs Expo/Crenshaw | C vs E/K |
| Aviation/Century vs Aviation/Imperial | Shared C/K vs C-only |
| Lynwood vs Long Beach Bl vs Downtown Long Beach vs Pacific Av | C rename vs A Long Beach loop |
| LATTC/Ortho Institute vs Grand/LATTC vs 37th St/USC | E vs A vs J |
| Union Station metro vs Metrolink / Amtrak / FlyAway | Regional Rail / Airport Shuttle logos |
| North Hollywood B vs G Line | Busway out of v1 |
| LAX/Metro Transit Center vs FlyAway / people movers | Transfer icons |
| G Line / J Line vs Metro Rail | Out of v1 |
| D west of Wilshire/La Cienega / A east of Pomona North | H3 under construction; not D1 |
| Metro Center / Park Street / Clark/Lake / Embarcadero / Beurs / T-Centralen / Brunnsparken / Centraal Station / Waitematā Station | Other-city hub strings. Do not copy. |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no API key, no merge of other PRs.
