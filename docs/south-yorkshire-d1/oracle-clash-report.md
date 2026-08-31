# South Yorkshire oracle clash report

D1 (published, as of 31 Aug 2026): **Sheffield Supertram** operates four light-rail and tram-train lines across 51 stops in Sheffield and Rotherham. Static data source: **no public GTFS feed found**; Stagecoach historically published TransXChange/NetEx data (opendata@stagecoachbus.com) but operator changed to South Yorkshire Future Tram Limited (SYFTL, public authority) on 22 March 2024 — status of data exports under new operator unconfirmed (skip risk flagged). Real-time: live departures board at [SuperTram live Departures](https://livetrams.azurewebsites.net/) (no documented API, schedule-only v1 assumed). **National Rail** (Darwin/OpenLDBWS) covers Sheffield (SHF CRS code) and surrounding regional/through-running stations; requires DARWIN_LDB_TOKEN via [Rail Data Marketplace](https://raildata.org.uk/) subscription. Both services call **Sheffield Station** hub (tram platforms above main rail platforms; footbridge/viaduct connects).

## V1 scoping — Supertram schedule-only, National Rail slot TBD

**Supertram v1 assumption:** schedule-only boards at Sheffield Station (light rail). No public GTFS or GTFS-RT feed confirmed; Supertram data source status under new SYFTL operator (since March 2024) requires verification with South Yorkshire Mayoral Combined Authority / SYFTL before D1 pack. **National Rail:** blocked at account level by EvansAppStudio's AU-registered Rail Data Marketplace registration — Tim is re-registering with UK company address (same block affects West Midlands / Greater Manchester / Liverpool City Region / East Midlands). Unblock first before wiring. Once unblocked, Sheffield (SHF) will show Darwin departures for regional trains.

## Station name table

Match rule: published Supertram stop name vs. National Rail station print vs. official agency map.

| published (Supertram tram / NR rail) | agency print | class |
| --- | --- | --- |
| Sheffield Station | Supertram tram: Sheffield Station; NR rail: Sheffield Station (SHF CRS) | **hub lock** — shared tram/rail interchange. Tram platforms on viaduct above main rail platforms. Footbridge connects. |
| Meadowhall Interchange | Supertram tram: Meadowhall; NR rail: Meadowhall Interchange (MHS CRS) | **through-running point, not merge**. Supertram and National Rail share same platform area but separate operators/infrastructure. Tram-Train switches to national rail infrastructure here. |
| Rotherham Central | Supertram tram: Rotherham Central; NR rail: Rotherham Central railway station | **through-running only**. National Rail only at this point; Tram-Train terminates. No shared platform with main-line trains. |
| Parkgate | Supertram tram: Parkgate; NR rail: not served by National Rail | Tram-Train terminus. Tram-only stop. |
| Denby Dale | not served by Supertram | National Rail only (West Yorkshire / South Yorkshire boundary). Through-running point. |
| Darton | not served by Supertram | National Rail only (South Yorkshire / West Yorkshire boundary). Through-running point. |
| South Elmsall | not served by Supertram | National Rail only (West Yorkshire / South Yorkshire boundary, ticketing schemes valid both ways). Through-running point. |
| Moorthorpe | not served by Supertram | National Rail only (West Yorkshire / South Yorkshire boundary). Through-running point. |

Supertram tram lines do not extend beyond Sheffield and Rotherham; Tram-Train extends to Parkgate via Meadowhall. Through-running stations on National Rail are served by East Midlands Railway and other operators crossing regional boundaries; they are not de-dup points but may appear in both South Yorkshire and West Yorkshire/East Midlands feeds if those regions add National Rail slices. Flag for Luke at D1 pack stage.

## H2 clash surface

**Supertram:** No product `lib/cities/south-yorkshire/` exists. No live adapter. Static data source unclear — Stagecoach data previously available via TransXChange/NetEx; operator change to SYFTL (public authority) in March 2024 requires confirmation of data export status. No public GTFS; live departures board available at livetrams.azurewebsites.net (no documented API, no GTFS-RT). Four routes: Blue (Malin Bridge—Halfway), Purple (Sheffield Station—Herdings Park branch), Yellow (Middlewood—Meadowhall), Tram-Train (Sheffield—Rotherham Central—Parkgate). Tram-Train infrastructure switches to national rail at Meadowhall South/Tinsley. 51 stops total.

**National Rail:** OpenLDBWS documented. Multiple train operating companies (East Midlands Railway, Northern, TransPennine Express, CrossCountry) serve South Yorkshire stations. Darwin feed is live. **Account-level blocker:** EvansAppStudio registered on Rail Data Marketplace as an Australian company; RDM geography-checks reject AU registrations for GB services. Tim's re-registration with UK address is the unblock path (same workaround for West Midlands / Manchester / Liverpool / East Midlands; not a feed problem).

**Clash:** schedule-only Supertram (no public GTFS found, no RT source) + account-blocked National Rail RT (unblock required before D1). Supertram and National Rail both call Sheffield Station; tram on viaduct, rail on main platforms (separate infrastructure, doNotGroup). Meadowhall is also a through-point for Tram-Train infrastructure switch. Boundary stations with West Yorkshire (Denby Dale, Darton, South Elmsall, Moorthorpe) may appear in adjacent-region feeds.

## C2/C3 to put in front of Jim

1. **city=south-yorkshire** (or split by agency). Supertram = Sheffield Supertram (four lines, 51 stops). National Rail = Darwin LDBWS (East Midlands Railway + cross-boundary services via through-running stations).
2. **Sheffield Station (SHF CRS)** is the hub lock (tram + rail, separate platforms, viaduct/footbridge connect).
3. **doNotGroup Sheffield Station tram vs. rail platforms.** Supertram tram viaduct is above the main-line railway — different infrastructure, different operators, different boarding areas.
4. **Supertram four lines:** Blue (Malin Bridge—Halfway via Sheffield city centre / Manor Top / Gleadless Townend / Crystal Peaks), Purple (Sheffield Station—Herdings Park via city centre/Manor Top; branches to Gleadless Townend), Yellow (Middlewood—Meadowhall via city centre / Kelham Island / Hillsborough / Sheffield Arena), Tram-Train (Sheffield—Rotherham Central—Parkgate via Sheffield Arena and Meadowhall, switching to national rail infrastructure post-Meadowhall South/Tinsley).
5. **No real-time feed found.** Supertram boards are schedule-only in v1. Live departures board exists (livetrams.azurewebsites.net) but no documented API or GTFS-RT. Confirm with SYFTL / South Yorkshire MCA whether public GTFS and/or real-time data will be published.
6. **National Rail unblock required.** Darwin/OpenLDBWS blocked at Tim's account level (AU company registration on RDM). Do not wire this region until DARWIN_LDB_TOKEN exists with UK registration.
7. **Through-running boundary stations (Denby Dale / Darton / South Elmsall / Moorthorpe):** These are National Rail only. They may appear in both South Yorkshire and West Yorkshire feeds if both regions include National Rail slices. All four are on the ticketing-scheme boundary; both regions' services call shared platforms — flag for de-dup consideration at D2. Chesterfield (East Midlands' flagged boundary station) is not in South Yorkshire proper but may be served by through-running services.
8. **Meadowhall Interchange (MHS CRS):** Supertram stop + National Rail interchange. Tram-Train infrastructure switches to national rail tracks here for continuation to Rotherham.
9. **Supertram operator status:** South Yorkshire Future Tram Limited (SYFTL), arm's length subsidiary of South Yorkshire MCA. Took over from Stagecoach 22 March 2024. Confirm data export / GTFS publication plans with SYFTL before D1.
10. **No buses, no additional rail modes in v1 scope.** Network Rail corridor between regions; multiple TOCs (EMR, Northern, TPE, CrossCountry) sole operators on National Rail tracks in South Yorkshire. Supertram only on light rail.

## License

- **Supertram static data (if available via SYFTL/SYMCA):**
  - **License name:** Not yet confirmed. Previous Stagecoach data was described as open for personal, educational, or commercial use (TransXChange/NetEx format), but official license terms unclear.
  - **Redistribution / rehosting:** SYFTL/SYMCA license terms not stated in public sources checked. Under previous Stagecoach operation, contact was opendata@stagecoachbus.com. Confirm with current operator before assuming redistribution rights.
  - **Commercial use:** Not yet confirmed.
  - **Attribution:** South Yorkshire Future Tram Limited or Supertram operator name.
  - **Terms URL:** SYFTL/SYMCA official data portal or contact; previously Stagecoach: https://www.stagecoachbus.com/open-data (now historical).
  - **Confidence:** `unclear` — operator change in March 2024 means previous Stagecoach terms may not apply. SYFTL/SYMCA has not published explicit GTFS/data-sharing terms in sources checked. Do not assume open redistribution; contact SYFTL before D1.

- **National Rail / Darwin OpenLDBWS:**
  - **License name:** Open Government Licence v2.0 (OGL 2.0) with amendments by National Rail Enquiries (NRE).
  - **Redistribution / rehosting:** OGL 2.0 baseline permits redistribution with attribution. **Ambiguity flagged:** NRE amendments and Rail Data Marketplace Platform Agreement (data sharing agreement between subscriber and RDG) may restrict downstream redistribution to third-party rider clients. Operative clause not yet confirmed in writing.
  - **Commercial use:** Allowed under OGL 2.0 baseline; specific RDM terms unclear.
  - **Attribution:** National Rail Enquiries (NRE), Darwin data source. Train operating companies (EMR, Northern, TPE, CrossCountry) for service operator branding.
  - **Terms URL:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/. Platform agreement template: https://raildata.org.uk/helpAndInformation/policies/rdm-platform-agreement-data-consumer. Official Open Government Licence v2.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/.
  - **Confidence:** `unclear` on third-party rider redistribution. The RDM Platform Agreement text (data sharing agreement) specifies limits on how data may be used; the exact language permitting or prohibiting downstream API provision to end users is not stated in public sources checked. Tim must review the signed RDM Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Do not assume OGL 2.0 baseline permits public API relay; confirm with RDM / NRE before launch.

- **Keyed feeds:** DARWIN_LDB_TOKEN is a subscription token, not a secret API key; no HMAC or signature. Free tier: 100,000 calls/month (public sector orgs avoid overage charges). Subscription terms govern API use, not a separate data license.
