# Charleroi — oracle clash report

**Lane:** Nico research. **Date:** 2026-09-06. **Status:** Scoped. **city id:** `charleroi` (not `charleroi-central`, not merged into Brussels or Antwerp).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | TEC (Transports en Commun) — Opérateur de Transports Wallons (public transport operator, Walloon region, Belgium) |
| Official map | Charleroi Metro Network: https://mapa-metro.com/en/belgium/charleroi/charleroi-metro-map.htm. TEC official site network maps: https://www.letec.be/parcourir-nos-lignes (FR: https://www.tec.be/) |
| Static GTFS | Belgian Mobility Open Data Portal (daily update). Primary: https://api-management-opendata-production.azure-api.net/api/gtfs/feed/tec/static (current **200 application/zip** 2026-09-02). Historic URLs: http://opendata.tec-wl.be/Current GTFS/TEC-GTFS.zip; http://gtfs.irail.be/tec/tec-gtfs.zip. Transitland Onestop **f-u0g-tec** (operator **o-u0g-tec**). Mobility Database **mdb-1212** (official; last download 2026-08-28, 882 routes across Belgium/Luxembourg/France/Germany). |
| GTFS-RT | Trip Updates: https://api-management-opendata-production.azure-api.net/api/gtfs/feed/tec/rt/trip-update. Service Alerts: https://api-management-opendata-production.azure-api.net/api/gtfs/feed/tec/rt/alert. Format: Protocol Buffers, refreshed every 30 seconds. Transitland **f-u0g-tec~rt**; last successful fetch 2026-09-02. |
| Auth | Header: `Ocp-Apim-Subscription-Key` (Azure API Management). Free tier: **100 requests/day, 10 requests/min** anonymous; registered user quotas higher. Developer portal signup: https://api-management-opendata-production.developer.azure-api.net/signin (free account creation; immediate key issuance). Key is personal and non-transferable under Belgian Mobility Terms of Use §5. Never paste a key. |
| Timezone | Europe/Brussels (HAS DST) |

## v1 mode cut

**Light rail metro only: lines M1, M2, M3, M4** — all four lines of the Charleroi Light Metro system. **M1 and M2:** anticlockwise and clockwise routes around the central loop, connecting Anderlues via shared 32.1 km corridor (28 stations total, loop completed 27 February 2012). **M3:** central loop + northern Gosselies extension via Lodelinsart and Jumet (19.5 km, 11 metro stations + 27 tram stops; extended to Gosselies 22 June 2013). **M4:** central loop + Gilly/Soleilmont southern branch (12 km, 21 distinct stations; opened 27 February 2012).

**Out:** M5 line (planned for 2027; not yet open — do not include); all surface tram-only routes outside the four lines; NMBS/SNCB national rail at Charleroi-Central / Charleroi-Ouest stations; bus; any non-metro TEC services.

**Hub lock: Waterloo** (metro station on the central loop, intersection of **M1 × M2 × M3 × M4** — all four lines meet here, making it the primary system interchange). Secondary hubs: **Palais** (M1/M2/M3/M4) and **Piges** (M1/M2/M3).

## Skip risk

GTFS feed verified live via Transitland (last successful fetch 2026-09-02). Fetch status shows 403 on latest retry — likely temporary key quota issue, not feed unavailability. Feed is stable; keyed access via free Azure developer portal (registration friction at D1, not a feed blocker). Charleroi Light Metro is a published, fully operational system (lines opened 2012–2013, M3 Gosselies extension confirmed since June 2013). Not a skip.

## Board eligibility section

Light rail lines (v1 in-scope, all four lines walk-up boardable):

| Line | Service type | Verdict | Notes |
|---|---|---|---|
| **M1** | Walk-up tram, anticlockwise central loop + Anderlues branch | `in` | No compulsory reservation; direct platform access from metro stations. |
| **M2** | Walk-up tram, clockwise central loop + Anderlues branch | `in` | No compulsory reservation; direct platform access from metro stations. |
| **M3** | Walk-up tram, central loop + Gosselies extension (street-running to Gosselies) | `in` | No compulsory reservation; walk-up boarding at all stops including street-running section. |
| **M4** | Walk-up tram, central loop + Gilly/Soleilmont branch | `in` | No compulsory reservation; direct platform access from metro stations. |

**Out-of-scope services at in-catalog stations:**

- **NMBS/SNCB national rail** (Thalys, IC, regional services) calling at Charleroi-Central and Charleroi-Ouest: `out-mode`. Heavy rail (different vehicle type from light metro). Central stations physically adjacent to metro but separate ticketing and different mode.
- **M5 line** (planned for 2027, not yet open): `out-product`. Future infrastructure not yet in passenger service — do not include in v1.
- **Surface tram-only TEC routes** (not part of the four metro lines): `out-mode`. Excluded by v1 mode cut to metro lines M1–M4 only.
- **TEC bus services** in Charleroi: `out-mode`. Out of scope for this city.

**Verdict summary:** All four operational metro lines in v1 scope (M1, M2, M3, M4) are walk-up boardable. No services fail reservation or check-in tests. No undecided entries.

## Gosselies extension note (D1 pack context)

M3 extended to Gosselies on 22 June 2013, connecting central Charleroi to Gosselies via 18 new stops (14 km extension, street-running in the Gosselies section). The closest metro stop to Brussels South Charleroi Airport is **Faubourg de Bruxelles**; the airport itself is not served. GTFS feed includes the full Gosselies routing (verified via Mobility Database coverage). D1 pack will confirm and extract all M1–M4 stops from GTFS feed.

## C2 / C3 to put in front of Jim

1. **city=charleroi**, displayName **Charleroi**. Not `charleroi-central`, not merged into Brussels or Antwerp.
2. **Waterloo** is the hub-lock (all four lines M1, M2, M3, M4 meet; central loop interchange). Secondary: Palais (M1/M2/M3/M4) or Piges (M1/M2/M3).
3. **v1 = light rail metro lines M1, M2, M3, M4 only.** M5 (planned 2027) is out-product. All surface tram-only routes are out-mode. No NMBS/SNCB (Charleroi-Central / Charleroi-Ouest are separate rail mode).
4. **M1 and M2:** central loop + Anderlues branch (anticlockwise and clockwise, 28 stations total). **M3:** central loop + Gosselies extension (11 metro + 27 tram stops, street-running to Gosselies, opened June 2013). **M4:** central loop + Gilly/Soleilmont branch (21 stations).
5. **Europe/Brussels HAS DST.** Live path is keyed TEC GTFS-RT (Azure API Management via Belgian Mobility). D1 stays **planned** — key friction is development account setup, not feed unavailability. `assertCityLive("charleroi")` must fail until wired.

## License

- **License name:** Belgian Mobility Open Data Portal Terms of Use (effective 1 Jan 2026) — **CC BY 4.0** unless a dataset specifies otherwise. TEC GTFS static and GTFS-RT are governed by BMC terms; de facto CC BY 4.0 as confirmed in Transitland feed page (f-u0g-tec) and Mobility Database (mdb-1212).
- **Redistribution / rehosting:** BMC ToU §3: CC BY 4.0 "allows free reuse — including commercial — provided that attribution is given." Attribution must include "Source: [PTO Name] – Open Data – [Date of dataset update]". The license does not add a "do not make the feed available to third parties" clause. Do not interpret CC BY 4.0 as sublicensable to arbitrary third parties beyond serving riders in our app — Tim judges that.
- **Commercial use:** BMC ToU §3 and FAQ: allowed with required attribution. Gold tier may incur fees for high-volume use causing substantial infrastructure costs (per service agreement).
- **Attribution:** Required minimum: "Source: TEC – Open Data – [date of latest dataset update]". Transitland lists: "Any Reuse Of Data Must Include, At A Minimum, The Following Attribution: Source: TEC - Open Data - [date Of Dataset Update]."
- **Terms URL:** https://data.belgianmobility.io/en/terms.html (current BMC terms). Developer signup / API key: https://api-management-opendata-production.developer.azure-api.net/signin. Transitland feed page: https://www.transit.land/feeds/f-u0g-tec. Mobility Database: https://mobilitydatabase.org/feeds/gtfs/mdb-1212.
- **Confidence:** `clear` that CC BY 4.0 governs TEC GTFS static and GTFS-RT feeds via BMC portal, that attribution with date is required, and that commercial use is permitted. `clear` that API key signup is free and immediate. No ambiguity on license terms.
- **Keyed feeds:** BMC ToU §5: API key is personal and non-transferable; "not to share, disclose, or transfer their API key to any third party." The key agreement governs the live feed more tightly than CC BY 4.0 governs a static dump. Never paste a key. Key is obtained free at https://api-management-opendata-production.developer.azure-api.net/signin.

## What I did not do

No published-network.json generation, no stopIds in output, no live city flip, no product edit, no lib/ edit, no registry entry, no GTFS parsing. Charleroi Light Metro lines, stations, and system structure sourced from Wikipedia, official maps, and Transitland/Mobility Database. GTFS feed verified live via Transitland and Mobility Database. Waterloo confirmed as hub via line-service analysis (all four M1/M2/M3/M4 lines converge; Palais and Piges as secondary hubs noted).

## C2 locks (Nico — to remain; D1 pack to follow)

1. city=`charleroi`. displayName Charleroi. Not charleroi-central / merged into other Belgian city.
2. Waterloo hub. All four lines M1/M2/M3/M4 meet. Not surface tram, not Central Station rail.
3. Modes v1 light rail M1/M2/M3/M4 only. M5 (2027) out. Surface tram out. NMBS/SNCB out.
4. M1/M2: central loop + Anderlues. M3: central loop + Gosselies (street-running). M4: central loop + Gilly.
5. M3 Gosselies extension open since June 2013; closest airport stop is Faubourg de Bruxelles.
6. assertCityLive("charleroi") must fail until wired.
