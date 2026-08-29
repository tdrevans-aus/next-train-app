# Washington, D.C. hazard pack (H1–H7)

Evidence: official WMATA Metro Rail System Map (system-map-rail.pdf, Last-Modified Sat 18 Apr 2026 13:04:09 GMT) hand-transcribed from `metro-map-1.png` + `crop-*.png` on 29 Aug 2026; rider-tools line/hub pages as support; empty-key Station Prediction 401; product `lib/cities/washington/` absent.

## H1 — parent + child

D1 has no stopIds. WMATA transfer stations have two platform codes (Metro Center A01+C01, Gallery Place, Fort Totten, L'Enfant Plaza). Rider-tools parent grouping at Metro Center is STN_A01_C01.

doNotGroup: **Metro Center** Red platform vs Orange/Blue/Silver platform; **Farragut North** (Red) vs **Farragut West** (Orange/Blue/Silver); **Metro Center** vs **Gallery Place-Chinatown** (one stop apart, different transfers); **Union Station** metro vs MARC / VRE / Amtrak; **L'Enfant Plaza** metro vs VRE; **New Carrollton** metro vs MARC / Amtrak; **King St-Old Town** metro vs VRE / Amtrak; **Rockville / Silver Spring / Greenbelt / College Park-U of Md** metro vs MARC; **Franconia-Springfield / Crystal City** metro vs VRE; **Washington Dulles International Airport** metro vs airport terminal; **Ronald Reagan Washington National Airport** metro vs airport terminal.

## H3 — thin / event / overlay

- **Summer 2026 Red Line major construction** (6 Jul–6 Sep 2026): trains do not operate between North Bethesda and Friendship Heights. Free shuttles replace Grosvenor - Strathmore, Medical Center, Bethesda. Official passenger map still prints those three as open stops — **kept**. Construction map `System-Map-Effective-July-6-Sept-7-2026.pdf` is overlay only. Do not delete them.
- **Friendship Heights** appears as a Red west destination token on rider-tools during the overlay. Map still locks **Shady Grove**. Overlay short, not a D1 terminus change.
- **Metrobus / Better Bus** (DC, MD, VA bus maps on the same Maps and Schedules index). Out of v1.
- **DC Streetcar, DC Circulator**. Out of v1.
- **MARC / VRE / Amtrak** Connecting Rail Systems logos on the rail map. Transfers, not D1 stops.
- **Spanish Metro Rail System Map** on the same index is a language twin, not a second stop oracle.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Metro Center | Red NW–NE vs Orange/Blue/Silver E–W. Hub lock. Not a direction token | Map transfer double-ring; rider-tools Metro Center |
| Gallery Place-Chinatown | Red vs Green/Yellow. **Not Metro Center** | Map; one stop east of Metro Center |
| East Falls Church | Silver Ashburn–McLean vs Orange Vienna/Fairfax-GMU; shared East Falls Church–Rosslyn | Map split; Silver/Orange west |
| Rosslyn | Blue Arlington Cemetery–Franconia-Springfield vs Orange/Silver west; shared Rosslyn–Stadium-Armory | Map Blue join |
| Stadium-Armory | Orange (+ some Silver) Minnesota Av–New Carrollton vs Blue/Silver Benning Rd–Downtown Largo | Map east fork; Silver legend & New Carrollton |
| King St-Old Town | Yellow Eisenhower Av–Huntington vs Blue Van Dorn St–Franconia-Springfield | Map south split |
| Pentagon | Yellow river crossing to L'Enfant Plaza vs Blue Arlington Cemetery–Rosslyn | Map. Yellow does **not** serve Arlington Cemetery or Rosslyn |
| L'Enfant Plaza | Green Waterfront–Branch Av vs Yellow Pentagon; also Orange/Blue/Silver | Map. Not the hub lock |
| Fort Totten | Red vs Green/Yellow | Map. Not the hub lock |
| Mt Vernon Sq/7th St-Convention Center | Yellow solid short vs Green through (and dashed Yellow) to Greenbelt | Map legend Huntington / Mt Vernon Sq & Greenbelt; dashed yellow = every other train |
| New Carrollton | Orange terminus + Silver second east end | Map Silver legend & New Carrollton; O+S circles |

No city loop. Red is a U through Metro Center. Orange/Blue/Silver through-run E–W through Metro Center. Green/Yellow through-run N–S through Gallery Place (not Metro Center).

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Six passenger colors only: **Red Orange Blue Silver Green Yellow**.

- Yellow **Mt Vernon Sq/7th St-Convention Center** is a printed legend short (Huntington / Mt Vernon Sq). Recorded in `shortTurns`. Dashed every-other-train to Greenbelt stays on Yellow `stations[]`.
- Silver second east end **New Carrollton** is a legend branch, not a nested code. `stations[]` is the Ashburn–Downtown Largo path; the five Orange-east stops (Minnesota Av, Deanwood, Cheverly, Landover, New Carrollton) are the Silver-to-New-Carrollton branch.
- Red **Friendship Heights** overlay short is H3, not a D1 `shortTurns` row.

## H6 — inner city (where §3 lives)

Locked set: **Metro Center**. Shared approaches: Gallery Place-Chinatown, Farragut North, Farragut West, McPherson Sq, Federal Triangle, Smithsonian, L'Enfant Plaza, Union Station, Judiciary Sq, Archives-Navy Mem'l-Penn Quarter, Fort Totten, Rosslyn, Pentagon, Stadium-Armory.

Metro Center is a **through-cross**, not a single-end hub. Inbound/outbound vs CBD is false here (Red is NW–NE; Orange/Blue/Silver are E–W). Gallery Place and L'Enfant Plaza are other transfer buildings — still not the lock.

## H7 — DST

**America/New_York observes DST (EDT/EST).** Do not copy Perth / Brisbane no-DST. Wall-clock is Eastern local.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| washington vs city=dc / washington-dc / wmata | Do not invent a second city id |
| Metro Center vs Gallery Place-Chinatown | Two buildings, one stop apart |
| Farragut North vs Farragut West | Two stations |
| Downtown Largo vs Largo vs Largo Town Center | Map vs board vs historic |
| Ashburn vs Wiehle-Reston East | Far end vs through stop |
| Yellow vs Blue at Pentagon | Yellow does not serve Arlington Cemetery / Rosslyn |
| Silver Downtown Largo vs Silver New Carrollton | Two east ends at Stadium-Armory |
| Union Station metro vs MARC/VRE/Amtrak | Connecting Rail Systems logos |
| L'Enfant Plaza metro vs VRE | Transfer icon, two modes |
| Metrobus / Streetcar vs Metrorail | Out of v1 |
| Grosvenor / Medical Center / Bethesda overlay shuttle | H3; stops stay on D1 |
| Chicago Loop / Beurs / T-Centralen / Brunnsparken / Centraal Station / Waitematā Station | Other-city hub strings. Do not copy. |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no clone, no API key, no post.
