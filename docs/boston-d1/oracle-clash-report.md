# Boston — oracle clash report

**Lane:** Nico research. **Date:** 2026-08-29. **Status:** scoped, D1 pack not written. **city id:** `boston` (do not invent `bos`, `mbta`, or merge into another US city).

## Agency / feed (verified)

| field | value |
| --- | --- |
| Agency | Massachusetts Bay Transportation Authority (MBTA) |
| Official map | MBTA subway map — https://www.mbta.com/maps (rapid transit / subway map) |
| Static GTFS | https://cdn.mbta.com/MBTA_GTFS.zip — no key. Transitland Onestop **f-drt-mbta**, last fetch 2026-08-28 |
| GTFS-RT / live | MBTA V3 API https://api-v3.mbta.com/ (optional `x-api-key`; unauthenticated is allowed but rate-limited) + GTFS-RT from the developers page |
| Auth | GTFS zip: none. V3 API: optional key from https://www.mbta.com/developers. Never paste a key. |
| Timezone | America/New_York (HAS DST) |

Do not generate a published-network.json from GTFS. D1 is the official subway map, hand-transcribed, later.

## v1 mode cut

**Subway / rapid transit only:** Red, Orange, Blue, Green, Mattapan (printed as rapid transit). **Out:** Silver Line (BRT), bus, ferry, Commuter Rail, CapeFlyer, Massport shuttles.

Hub lock: **Park Street** (Red × Green). Not Downtown Crossing (Red × Orange), not Government Center (Green × Blue), not State (Orange × Blue), not South Station, not Downtown. There is no single station on all colours — Park Street is the inner Red/Green lock. doNotGroup Park Street vs Downtown Crossing vs Government Center vs State.

## Skip risk

Silver Line BRT leaking into subway; Commuter Rail name-family at South Station / North Station; folding Mattapan into Red as if it were heavy rail; inventing city=`bos`. Feed itself is verified. Not a skip.

## License

- **License name:** MassDOT Developers License Agreement (governs MBTA static + realtime data).
- **Redistribution / rehosting:** Grants non-exclusive, limited, revocable rights to use, reproduce, and redistribute the Data (clause 3.1 of the 2023-08 agreement). Do not treat this as sublicensable to arbitrary third parties beyond serving riders in our app — Tim judges that.
- **Commercial use:** Transitland indexes commercial use allowed = Yes. Agreement is revocable.
- **Attribution:** Required. Transitland: "Clearly Acknowledge Massdot As The Provider Of The Data." Use without attribution = No.
- **Terms URL:** https://cdn.mbta.com/sites/default/files/2023-08/mbta-massdot-develop-license-agreement.pdf (linked from https://www.mbta.com/developers). Older Transitland pointer: https://www.mass.gov/files/documents/2017/10/27/develop_license_agree_0.pdf
- **Confidence:** `clear` on attribution + revocable redistribute; `unclear` on passing the feed itself to third parties.
- **Keyed feeds:** V3 API key agreement is the same MassDOT licence. Optional key.

## C2 for a later D1 pack (not this file's job)

1. city=`boston`. displayName Boston.
2. Park Street hub. doNotGroup Downtown Crossing / Government Center / State.
3. Modes v1 subway only. Silver Line out.
4. assertCityLive("boston") must fail until wired.
