# St. Louis oracle clash report

D1 (published, as of 6 Sep 2026): **Bi-State Development Agency** operates **MetroLink**, a 46-mile two-line light rail system with 38 stations across Missouri and Illinois. Static GTFS via [Metro Transit Developer Resources](https://www.metrostlouis.org/developer-resources/) at https://www.metrostlouis.org/Transit/google_transit.zip (no authentication required; verified live 5 Sep 2026 via [Transitland feed f-9yzg-metrostlouis](https://www.transit.land/feeds/f-9yzg-metrostlouis)). **GTFS-RT** available at three protobuf endpoints (no authentication):
- Trip Updates: https://www.metrostlouis.org/RealTimeData/StlRealTimeTrips.pb
- Vehicle Positions: https://www.metrostlouis.org/RealTimeData/StlRealTimeVehicles.pb
- Service Alerts: https://www.metrostlouis.org/RealTimeData/StlRealTimeAlerts.pb

Transitland reports both feeds actively maintained with successful fetches as of 5 Sep 2026. **License:** Bi-State Development Agency Data License Agreement (accessed via Developer License Agreement at developer-resources page; see License section below).

## V1 scoping — MetroLink Red and Blue lines only

**v1 scope:** Red Line (Lambert Airport Terminal #1, Missouri to Shiloh-Scott, Illinois) and Blue Line (Shrewsbury-Lansdowne I-44, Missouri to Fairview Heights, Illinois). Both lines include Illinois stations; same operator throughout. **Mode cut:** Light rail only. MetroBus, Loop Trolley, Call-A-Ride, and all other modes out of v1. Civic Center station adjoins Gateway Transportation Center (Amtrak, Greyhound); these are separate operators and infrastructure (see Board eligibility section).

**Hub-lock station:** **Forest Park–DeBaliviere** (Red and Blue cross-platform transfer; island platform configuration at 250 DeBaliviere Ave, St. Louis, MO). Both lines stop here with direct cross-platform connection.

## Station name table

Match rule: published MetroLink system map / GTFS stop name vs. official Metro Transit agency page.

| published (MetroLink) | Metro Transit official | class |
| --- | --- | --- |
| Forest Park–DeBaliviere | Forest Park–DeBaliviere Station | **hub lock** — Red and Blue cross-platform transfer on island platform. |
| Civic Center | Civic Center Station | **major transfer point** — Red and Blue stop; adjacent to Gateway Transportation Center (Amtrak, Greyhound) via ~400-foot covered walkway. |
| Lambert Airport Terminal #1 | Lambert Airport Terminal #1 | **Red Line western terminus** — airport station, Missouri. |
| Shiloh-Scott | Shiloh-Scott | **Red Line eastern terminus** — Illinois. |
| Fairview Heights | Fairview Heights | **Blue Line eastern terminus** — Illinois. |
| Shrewsbury-Lansdowne I-44 | Shrewsbury-Lansdowne I-44 | **Blue Line western terminus** — Missouri. |

All 38 MetroLink stations follow published GTFS nomenclature and official Metro Transit agency naming. No rename conflicts found between GTFS and agency pages. Illinois stations included in v1 per operator consistency (same Bi-State Development agency operates both sides of state boundary).

## Board eligibility

**Rule basis:** `docs/board-eligibility-rule.md` (adopted 30 Aug 2026). Every service calling at an in-catalog station must pass two tests: walk-up boardable (no compulsory reservation) and leave-by valid (no check-in barrier).

**Verdict summary (MetroLink + Amtrak/Greyhound at in-catalog stations):**

**MetroLink services (Red and Blue lines):**
- **MetroLink Red Line (light rail):** `in` — walk-up only, no reservation system, no check-in barrier. Walk-up boarding confirmed via Metro Transit ticketing page (tickets at vending machines or Transit app, no advance purchase required).
- **MetroLink Blue Line (light rail):** `in` — same terms as Red Line. Walk-up only, light rail, no reservation.

**Amtrak at Gateway Transportation Center (near Civic Center MetroLink station):**
- **Amtrak intercity rail:** `in` — Walk-up boardable confirmed via [Amtrak boarding page](https://www.amtrak.com/at-the-station/boarding). No check-in required (only baggage check-in, which is optional, not a boarding barrier). Tickets available at station ticket counter or kiosk; no compulsory advance reservation (tickets purchasable onboard with fee, though pre-purchase recommended). Passengers board 15–20 minutes before departure with no airport-style check-in. Civic Center MetroLink station adjoins Gateway Transportation Center via covered walkway (~400 feet). While separate infrastructure from MetroLink, Amtrak calls at the same physical hub (Civic Center) and passes walk-up boarding and leave-by-valid tests per rule §6 (walk-up long-distance rail allowed).

**Greyhound buses at Gateway Transportation Center (near Civic Center MetroLink station):**
- **Greyhound intercity buses:** `out-mode` — Bus mode falls outside v1 network scope (MetroLink light rail only; no buses in v1). While Greyhound booking shows QR-code mobile boarding (walk-up compatible), the mode cut is legitimate per board-eligibility-rule.md §2 ("mode cuts stay legitimate").

**Stations with multi-operator overlaps:**
- **Civic Center (not hub-lock; Forest Park–DeBaliviere is hub):** MetroLink Red and Blue lines serve Civic Center MetroLink station platform. Gateway Transportation Center (Amtrak, Greyhound) is connected via covered walkway but separate infrastructure and separate ticketing. doNotGroup by infrastructure and operator (MetroLink vs. Amtrak vs. Greyhound).

**No check-in barriers:** Platform access at all 38 in-catalog MetroLink stations is unrestricted. Ticket validation required before boarding (red machines on platforms) but no security gatekeeping, border control, or airport-style pre-boarding processing at any MetroLink or Amtrak boarding point.

| Service | Calls at in-catalog stations | Compulsory reservation? | Check-in barrier? | Verdict | Evidence URL |
|---|---|---|---|---|---|
| **MetroLink Red Line** | Lambert Airport Terminal #1, Forest Park–DeBaliviere, Civic Center, Shiloh-Scott (IL), and 34 other MetroLink stations | No (light rail, walk-up only, no reservation system) | No | `in` | [Metro Transit MetroLink](https://www.metrostlouis.org/metrolink/); [System map and station info](https://www.metrostlouis.org/system-maps/addresses/) |
| **MetroLink Blue Line** | Forest Park–DeBaliviere, Civic Center, Fairview Heights (IL), Shrewsbury-Lansdowne, and 34 other MetroLink stations | No (light rail, walk-up only, no reservation system) | No | `in` | [Metro Transit MetroLink](https://www.metrostlouis.org/metrolink/); [Station list](https://www.metrostlouis.org/system-maps/addresses/) |
| **Amtrak (Gateway Transportation Center at Civic Center hub)** | Civic Center (via covered walkway to Gateway Transportation Center) and adjacent to main MetroLink interchange | No (walk-up tickets available; baggage check optional) | No (arrive 30 min before; no airport-style check-in) | `in` | [Amtrak boarding procedures](https://www.amtrak.com/at-the-station/boarding); [Gateway Transportation Center](https://en.wikipedia.org/wiki/Gateway_Transportation_Center); ~400-foot covered walk from Civic Center MetroLink platform to Amtrak main hall; walk-up boarding confirmed |
| **Greyhound (Gateway Transportation Center at Civic Center hub)** | Civic Center (via covered walkway to Gateway Transportation Center) | No (mobile QR-code ticketing) | No | `out-mode` | Bus mode out of v1 scope (MetroLink light rail only). No buses in v1 network cut. |

**Board eligibility summary:** All walk-up MetroLink light-rail services (Red and Blue lines) calling at all 38 in-catalog stations pass both boarding-contract tests (`in` verdicts recorded). Amtrak intercity rail at Gateway Transportation Center (walk-up boardable, no check-in) passes both tests and is included (`in`) per board-eligibility-rule.md §6 (walk-up long-distance trains allowed on boards; intercity is not a mode cut; display tier can differentiate if needed). Greyhound buses are `out-mode` (legitimate mode cut for light-rail-only network). **All verdicts decided; no silent omissions.**

## H2 clash surface

**GTFS:** Metro Transit GTFS static at https://www.metrostlouis.org/Transit/google_transit.zip (no key; verified live on Transitland). Feed covers all 38 MetroLink stations and both lines. No product `lib/cities/st-louis/` exists yet. Format is standard GTFS zip.

**GTFS-RT:** Three protobuf endpoints (Trip Updates, Vehicle Positions, Service Alerts) live at metrostlouis.org/RealTimeData/ (no authentication). Transitland caches GTFS-RT when redistribution terms permit; both static and RT feeds confirmed fetchable as of 5 Sep 2026.

**Clash:** None. Single operator (Bi-State Development), single mode (light rail), consistent GTFS and GTFS-RT. Gateway Transportation Center (Amtrak/Greyhound) is separate from MetroLink infrastructure but verdict recorded in Board eligibility section. No L3 / S-Bahn / commuter rail other than Amtrak visitor. No product file conflicts.

## C2/C3 to put in front of Jim

1. **city=st-louis** (or split by region if multi-operator future). MetroLink = Bi-State Development Agency light rail. Amtrak and Greyhound are separate operators at adjacent Gateway Transportation Center (included in board verdicts, not wired into adapter).
2. **Forest Park–DeBaliviere** is the hub-lock (Red and Blue cross-platform transfer on island platform). **The Loop** is not a station. Do not use "Civic Center" as hub if Forest Park–DeBaliviere serves as the lock; Civic Center is a secondary transfer point adjacent to intercity services.
3. **doNotGroup Civic Center MetroLink platform vs. Gateway Transportation Center** (Amtrak/Greyhound). Separate infrastructure, separate operators, separate ticketing. MetroLink-only adapter surfaces MetroLink stops; Amtrak/Greyhound verdicts are recorded for board-eligibility audit but not wired.
4. **MetroLink Red Line:** Lambert Airport Terminal #1 (MO) → Shiloh-Scott (IL). 22 stations. Illinois extension via Metro Sys (St. Clair County).
5. **MetroLink Blue Line:** Shrewsbury-Lansdowne I-44 (MO) → Fairview Heights (IL). 16 stations. Illinois extension same as Red.
6. **Both lines converge and share track:** Forest Park–DeBaliviere ↔ Fairview Heights. Cross-platform transfer at Forest Park–DeBaliviere (island platform).
7. **GTFS and GTFS-RT verified live:** No authentication. Feeds are active, Transitland confirms as of 5 Sep 2026. GTFS-RT endpoints are protobuf (standard format).
8. **No buses, no MetroBus, no Loop Trolley, no Call-A-Ride in v1 scope.** Network is light rail only. Amtrak (intercity rail) is boarded at adjacent station but is separate operator — board verdict recorded, not in adapter.
9. **Illinois stations included in v1:** Same operator (Bi-State Development) across state boundary. Do not split Red/Blue at state line.

## License

- **License name:** Bi-State Development Agency Data License Agreement (Developer License Agreement).
- **Redistribution / rehosting:** Bi-State grants "non-exclusive, limited and revocable rights to use, reproduce, and redistribute Transit District Data" for purposes of "assisting mass transportation riders or promoting public transportation." Redistribution to third-party users via Next Train API falls within rider-assistance purpose. Data redistribution to end-user applications permitted under this scope.
- **Commercial use:** Allowed within the rider-assistance / public-transportation-promotion scope (not for general commercial resale independent of transit rider assistance).
- **Attribution:** "Data provided by Metro Transit" recommended in user interface or API responses. Agency trademarks and copyrighted materials may not be used without agency approval. Bi-State branding guidelines apply.
- **Terms URL:** https://www.metrostlouis.org/developer-resources/ (Developer License Agreement embedded on page; no separate published DLA PDF URL found in public sources as of 6 Sep 2026). Full terms quoted: "Agency grants Licensee a non-exclusive, limited and revocable license" for data use "for the sole purpose of assisting mass transportation riders or promoting public transportation." Signature page and full DLA text available upon request to webmaster@metrostlouis.org.
- **Confidence:** `clear` on redistribution scope. DLA language is publicly accessible on developer-resources page and explicitly permits "reproduce, and redistribute" for rider-assistance purposes. No geographic or API-serving restrictions stated in public terms. Commercial-use language limits resale/use to within the transit-assistance purpose, not prohibiting it outright.
- **Keyed feeds:** None. Both GTFS static and GTFS-RT protobuf endpoints are keyless (no API key, no authentication token). Transitland caches GTFS-RT feeds where license permits redistribution; Metro's DLA permits this.
