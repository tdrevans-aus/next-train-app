# Hong Kong hazard pack (H1–H7)

Evidence: official MTR system map https://www.mtr.com.hk/en/customer/services/system_map.html + routemap.pdf (Last-Modified 11 Sep 2024; empty-key 200 2026-08-29); corporate Railway Network termini https://www.mtr.com.hk/en/corporate/operations/detail_network.html ; official EN homepage line lists; Next Train spec v1.7 (codes only) https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.7.pdf ; Nico clash report 2026-08-29.

## H1 — parent + child

D1 has no stopIds. There is **no MTR-only official GTFS** to collapse parent/child platforms. The Transport Department all-modes zip is not this city's source. The hazard is **name-family**, not feed hierarchy.

doNotGroup: **Admiralty** (hub, TWL × ISL × SIL × EAL, spec ADM) vs **Central** (TWL × ISL, CEN); **Tsim Sha Tsui** (TWL TST) vs **East Tsim Sha Tsui** (TML ETS) — interchange walk; **Hung Hom** (EAL × TML HUH); **Kowloon** (TCL / AEL KOW); **Hong Kong** station (TCL / AEL HOK) vs city id `hong-kong` vs **Hong Kong West Kowloon** HSR; **Exhibition Centre** (EAL EXC) vs Admiralty; **Mong Kok** (TWL/KTL MOK) vs **Mong Kok East** (EAL MKK); **Tsuen Wan** (TWL TSW) vs **Tsuen Wan West** (TML TWW). **Admiralty** is the metro lock string — keep it.

## H3 — thin / event / overlay

- **No Airport Express in v1.** AEL is in spec v1.7 and live on the same REST (`AEL-HOK` 200). That is the trap. Hong Kong / Kowloon / Tsing Yi stay as Tung Chung stops only.
- **No Disneyland Resort Line in v1.** DRL / DIS is in spec v1.7. Sunny Bay stays as a Tung Chung stop.
- **No Light Rail / NWNT.** Different official map (`LR_routemap.pdf`) and different REST (`lrt/getSchedule`). Do not invent a Light Rail city id.
- **No High Speed Rail.** Hong Kong West Kowloon prints on the mixed system-map plate. Not in Next Train v1.7.
- **Racecourse (RAC)** is an official EAL race-day tick at Fo Tan — in as a published stop, not an overlay to delete.
- **Lo Wu / Lok Ma Chau** are EAL border stations — in, not HSR and not a mainland through-train product.
- **Ngong Ping 360 / MTR Buses / KMB / Citybus / ferries / trams / Peak Tram** on neighbouring official sites. Out of v1.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Admiralty | Tsuen Wan + Island + South Island + East Rail | Official print + live REST TWL/ISL/SIL/EAL at ADM. Hub lock |
| Tseung Kwan O | Po Lam vs LOHAS Park | Official Railway Network “Po Lam/LOHAS Park”. Chip is Tseung Kwan O + Po Lam / LOHAS Park |
| Sheung Shui | Lo Wu vs Lok Ma Chau | Official Railway Network “Admiralty and Lo Wu/Lok Ma Chau”. Both stay IN |
| Tsim Sha Tsui / East Tsim Sha Tsui | TWL vs TML | Two official stations; interchange walk |
| Hung Hom | East Rail + Tuen Ma | Official HUH. Not the hub |
| Hong Kong / Kowloon | Tung Chung vs Airport Express | Same names, AEL out of v1 |
| Central | Tsuen Wan + Island | Not the hub. doNotGroup vs Admiralty |
| Sunny Bay | Tung Chung vs Disneyland Resort | DIS out of v1 |

No city loop as a passenger code. Inbound/outbound vs City is false at **Admiralty** (four lines; Island and Tsuen Wan through in both directions; East Rail and South Island start here).

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Eight passenger line tokens only: **ISL, TWL, KTL, TKL, TCL, TML, EAL, SIL**. No AEL / DIS / LR in v1.

`shortTurns` empty on all eight lines.

## H6 — inner city (where §3 lives)

Locked set: **Admiralty**. Shared approaches: Central (TWL × ISL; not the lock), Tsim Sha Tsui (TWL), Exhibition Centre (EAL neighbour), Hung Hom (EAL × TML).

Admiralty is a **through trunk** on Island and Tsuen Wan, and a **terminus** on East Rail and South Island. Inbound/outbound vs City is false here (ends are Kennedy Town / Chai Wan, Tsuen Wan / Central, Lo Wu / Lok Ma Chau, South Horizons). Central is the older Island / Tsuen Wan pair — still not the lock.

## H7 — DST

**Asia/Hong_Kong does not observe DST.** Do not copy Europe/Stockholm or Australia/Sydney DST cities. Wall-clock is Hong Kong time year-round.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| hong-kong vs city=hk / mtr / kowloon / china / light-rail | Separate city; agency MTR Corporation Limited |
| Admiralty vs City / Downtown / Central / Admiralty Station | Hub lock vs marketing / neighbour |
| Admiralty vs Tsim Sha Tsui / East Tsim Sha Tsui / Hung Hom | Official different stations |
| Admiralty vs Hong Kong / Kowloon / Hong Kong West Kowloon | TCL/AEL / HSR name-family |
| Tsim Sha Tsui vs East Tsim Sha Tsui | Interchange walk; TWL vs TML |
| Mong Kok vs Mong Kok East | TWL/KTL vs EAL |
| Tsuen Wan vs Tsuen Wan West | TWL vs TML |
| Hong Kong station vs city id hong-kong | Stop string vs city |
| AEL / DIS / Light Rail / HSR vs urban heavy-rail | Printed on the mixed plate; out of v1 |
| TD all-modes GTFS vs this city | Not an MTR-only subway feed |

## What I did not do

No generator, no live city flip, no Perth edit, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Stockholm / Göteborg, no Next Train REST wiring, no version bump, no public store listing, no D6 sweep as a PR gate.
