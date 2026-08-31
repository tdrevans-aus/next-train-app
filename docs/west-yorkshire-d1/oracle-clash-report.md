# West Yorkshire oracle clash report

**CAVEAT:** The tracker (docs/expansion-tracker/cities.csv, United Kingdom/West Yorkshire row) shows status "Packing now" — Zoe may already be working this region through Luke. Verify with Zoe before starting Luke/Jim work to avoid duplicate effort.

D1 (published, as of 31 Aug 2026): **National Rail** (Darwin/OpenLDBWS) covers Leeds (LDS, CRS code) and Bradford (BDQ Forster Square, BDI Interchange) as hub stations, plus surrounding regional/through-running stations. Static GTFS via [UK Department for Transport Bus Open Data Service](https://data.bus-data.dft.gov.uk/downloads/) (Onestop ID `f-bus~dft~gov~uk`, no key required; verified 31 Aug 2026) for bus operators (First West Yorkshire, Arriva Yorkshire, Transdev/Keighley Bus Company). **National Rail realtime:** OpenLDBWS available via Rail Data Marketplace subscription (free tier: 100,000 calls/month). **Bus real-time:** No public GTFS-RT confirmed; static timetables via DFT aggregator.

## V1 scoping — National Rail only, bus slot TBD

**National Rail v1 assumption:** schedule-only boards at Leeds Station (hub) and Bradford Forster Square (secondary hub). Darwin realtime blocked at account level by EvansAppStudio's Au-registered Rail Data Marketplace registration — Tim is re-registering with UK company address (same block affects East Midlands / West Midlands / Greater Manchester / Liverpool City Region). Unblock first before wiring. Once unblocked, Leeds (LDS) will show Darwin departures for regional trains (Northern Trains, TransPennine Express, cross-boundary services). **Buses:** First West Yorkshire, Arriva Yorkshire, Transdev operate fragmented local services; no single unified GTFS-RT feed published. Bus boarding network too distributed for v1; defer to later wave.

## Station name table

Match rule: published National Rail station name vs. CRS code vs. official Network Rail agency print.

| published (NR rail) | CRS code | class |
| --- | --- | --- |
| Leeds Station | LDS | **hub lock** — major interchange, 18 platforms (0–17). Network Rail. Central hub for West Yorkshire Metro transit authority. |
| Bradford Forster Square | BDQ | **secondary hub** — main Bradford rail station. Network Rail. Connected to Bradford Interchange (BDI) by walk-link (bus/rail interchange). |
| Bradford Interchange | BDI | **through-running point, not merge** — serves both bus (city-centre coach station) and rail (Northern Trains services). Separate from BDQ platform infrastructure. |
| Denby Dale | DDL | **through-running point, South Yorkshire boundary** — last station in West Yorkshire on Penistone Line. Northern Trains continue south into South Yorkshire (Penistone, Barnsley, Sheffield). De-duplicate if both WY and South Yorkshire regions enter the app. |
| Walsden | WAD | **through-running point, Greater Manchester boundary** — Calder Valley Line crosses into Rochdale District (GM). Services continue to Manchester Victoria. De-duplicate if both WY and Greater Manchester regions enter the app. |
| Huddersfield | HUD | **regional station, Penistone Line hub** — serves North of England routes; boundary to South Yorkshire via Penistone Line (Denby Dale). |
| Halifax | HFX | **regional station, Calder Valley Line** — serves West Yorkshire; continuation west to Manchester. |
| Todmorden | TOD | **regional station, Calder Valley Line** — West Yorkshire side before Walsden boundary. |
| Hebden Bridge | HBN | **regional station, Calder Valley Line** — West Yorkshire side. |
| Keighley | KEY | **regional station, branch** — Airedale Line from Leeds/Bradford. Northern Trains. |

National Rail Enquiries (NRE) publishes three-letter CRS codes; match boards to the code as the de-dup key across regions. Through-running stations (Denby Dale / Walsden) are pass-throughs where the same operator continues across regional boundary, not shared platforms requiring merge logic.

## H2 clash surface

**National Rail:** OpenLDBWS documented. Northern Trains + TransPennine Express service codes (cross-boundary services via Denby Dale / Walsden). Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for East Midlands / West Midlands / Manchester / Liverpool; not a feed problem).

**Buses:** DFT Bus Open Data Service aggregates First West Yorkshire, Arriva Yorkshire, Transdev GTFS. Feed is static (monthly refresh), no public real-time endpoint found. Multiple operators, no unified next-train API.

**Clash:** National Rail Darwin blocked at account level (unblock required before D1). Bus feed fragmented across operators; no v1 real-time found. Leeds Station is hub for all modes (rail, bus, Metro Coach services); separate infrastructure, platforms. No local light rail (West Yorkshire Metro mass-transit project is in planning stage, not D1-live as of 31 Aug 2026).

## C2/C3 to put in front of Jim

1. **city=west-yorkshire** (National Rail). Leeds Station (LDS) is the hub lock (rail only; bus connections at separate interchange). Bradford Forster Square (BDQ) is secondary hub.
2. **Leeds Station (LDS CRS)** is the locked hub. Bradford Forster Square (BDQ) and Bradford Interchange (BDI) are separate; walk-link only, not shared platform. Do not merge BDQ rail + BDI bus — separate infrastructure.
3. **doNotGroup Leeds Station rail vs bus/coach platforms.** Different operators, different boarding areas, different real-time feeds (none for bus yet).
4. **National Rail operators:** Northern Trains (local/regional), TransPennine Express (long-distance cross-boundary). Service codes cross Denby Dale (South Yorkshire) and Walsden (Greater Manchester) boundaries; flag for de-dup at D2 if both regions enter the app.
5. **Through-running stations:** Denby Dale (Penistone Line, South Yorkshire boundary), Walsden (Calder Valley Line, Greater Manchester boundary), Huddersfield (Penistone Line hub). These are pass-through, not merge points — same operator continuing across boundary.
6. **No real-time bus feed found.** DFT bus data is static GTFS only. Confirm with First West Yorkshire / Arriva / Transdev whether real-time will be published; defer v1 bus to later wave if no RT source emerges.
7. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration.
8. **No West Yorkshire Metro light rail in v1 scope.** Mass-transit project is in planning (published Strategic Outline Case March 2024); no passenger rail lines open yet. When operational (future), will add separate infrastructure — tag as West Yorkshire Metro, not National Rail.
9. **No Metrolink, tram, or regional buses beyond DFT fragmented operators in v1 scope.** Penistone Line and Calder Valley Line are National Rail corridors (Northern Trains).

## License

- **Bus GTFS (DFT Bus Open Data Service):**
  - **License name:** Open Government Licence v3.0 (OGL 3.0).
  - **Redistribution / rehosting:** OGL 3.0 permits "copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially." Derived products allowed; redistribution to third-party users via Next Train API is permitted.
  - **Commercial use:** allowed under OGL 3.0.
  - **Attribution:** "Contains public sector information licensed under the Open Government Licence v3.0" or link to https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Name source as Department for Transport Bus Open Data Service and relevant bus operator (First West Yorkshire, Arriva Yorkshire, Transdev).
  - **Terms URL:** https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/. Feed landing: https://data.bus-data.dft.gov.uk/downloads/ (aggregator); Transitland entry: https://www.transit.land/feeds/f-bus~dft~gov~uk.
  - **Confidence:** `clear` for bus GTFS static license. Feed is live 200 on DFT platform (verified 31 Aug 2026). No key required for download.

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. Northern Trains / TransPennine Express for train service operator branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. The RDM Platform Agreement text (data sharing agreement) specifies limits on how data may be used; the exact language permitting or prohibiting downstream API provision to end users is not stated in public sources checked. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license.
