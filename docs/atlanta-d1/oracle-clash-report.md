# Atlanta oracle clash report

D1 (published, as of 6 Sep 2026): [MARTA Maps and Schedules](https://www.itsmarta.com/Maps-Schedules.aspx) **System Map** showing four heavy rail lines (Red, Gold, Blue, Green) with 38 stations. Stations arrays **hand-transcribed** from official MARTA network diagram plus official line-page stop sequences as ordered-stop support. **Not generated from GTFS.** Not generated from Real-Time API. Map printed names win.

Supporting official pages (ordered stops / tokens):

- [MARTA Red Line](https://www.itsmarta.com/Red-Line.aspx)
- [MARTA Gold Line](https://www.itsmarta.com/Gold-Line.aspx)
- [MARTA Blue Line](https://www.itsmarta.com/Blue-Line.aspx)
- [MARTA Green Line](https://www.itsmarta.com/Green-Line.aspx)
- [MARTA System Map & Schedules](https://www.itsmarta.com/Maps-Schedules.aspx)

Hub lock: **Five Points** (Red × Gold / Blue × Green transfer; historic zero-mile marker and downtown central hub). Five Points is the only station where all four heavy rail lines are accessible via walkway transfers. Not Peachtree Center, not Arts Center, not Airport.

H2 clash surface (after transcription): **no** product `lib/cities/atlanta/`. Clash is **map-vs-line-page** ordering. Zero mix-in with chicago / washington / other cities. No Atlanta Streetcar, No bus, no airport-oriented product decision in v1 oracle.

## Station name table

Match rule: published D1 string (system map) vs official line-page stop sequence. All MARTA heavy rail stations use consistent naming across map and official pages.

| published (D1) | line pages | class |
| --- | --- | --- |
| Five Points | All four line pages: Red, Gold, Blue, Green | **match (lock)**. Central downtown hub. Only four-line transfer point. |
| Airport | Red, Gold terminus (legend circle) | **match**. Airport is the sole southern terminus shared by Red/Gold. |
| Lindbergh Center | Red, Gold pages (northbound junction before split) | **match**. Red and Gold split north of this station. |
| Arts Center | Red page only | **match (Red only)**. |
| Peachtree Center | Red, Gold pages (downtown node) | **match**. Not the hub lock (Five Points only). Close to streetcar stop. |
| West Lake | Blue page (westbound terminus) | **match**. Blue Line western end. |
| East Point | Green page (southbound terminus) | **match**. Green Line southern end. |
| Indian Creek | Blue page (eastbound terminus) | **match**. Blue Line eastern end. |
| Hamilton E. Holmes | Blue page (westbound intermediate stop) | **match**. West end of Blue Line (not terminus; West Lake is). |
| Decatur | Blue, Green pages (shared east-central stop) | **match**. Two-line connection on east side. |
| All other D1 names in official line pages | same map / page print | match |

**38** unique D1 passenger stops. Product `lib/cities/atlanta/` is **absent**. **Zero** mix-in with chicago / washington / perth / any other city file.

## H2 — who has line codes today

| surface | Red/Gold/Blue/Green? | what it actually has |
| --- | --- | --- |
| System Map + Line Pages (D1) | **yes (colors)** | Four heavy rail lines by color. No Streetcar/light rail as D1 lines. No bus. |
| Official line pages | **yes (live pages)** | Color line names + stop sequences. Five Points transfer callout. |
| Product `lib/cities/atlanta/` | **absent** | No atlanta stations.json / line-map.json. `assertCityLive("atlanta")` is Unknown city |
| Real-Time Rail API (GetRealtimeArrivals) | requires key | Key later, not a D1 blocker. Not this H2 stop-order surface |
| GTFS Static (google_transit.zip) | no key required | 86 routes (rail + streetcar + bus). v1 cut to heavy rail only. |

H2 conclusion: four color lines already agree (map + line pages). Clash is **no published stop-name mismatches between map and line pages**, **Five Points is the single four-line hub**, and **no product atlanta file**. Do not generate published-network.json from GTFS. Do not invent city=atl / atlanta-rail. Do not merge with chicago, washington, or any other city. Atlanta Streetcar is operationally separate with no free transfers to heavy rail — explicitly excluded from v1 oracle per mode cut decision.

## C2/C3 to put in front of Jim

1. **city=atlanta**, not `atl`, not `atlanta-rail`, not `marta`. Do not invent city=streetcar or split into multiple cities.
2. **Five Points** is the locked inner-city hub (Red × Gold / Blue × Green transfer). All four lines accessible via Five Points. Not Peachtree Center, not Arts Center, not Airport.
3. **doNotCollapse** Five Points only — it is the sole transfer hub between all four lines. Peachtree Center is a two-line transfer (Red/Gold) only.
4. **doNotCollapse** same-name different-line: Decatur appears on both Blue and Green line pages; Peachtree Center on Red/Gold only; Arts Center on Red only.
5. **Four lines: Red, Gold, Blue, Green.** Red and Gold share trackage between Airport and Lindbergh Center, then diverge northbound (Red to North Springs, Gold to H.E. Holmes). Blue runs west–east (Hamilton E. Holmes–Indian Creek). Green runs north–south (Doraville–East Point). They all connect at Five Points in downtown Atlanta.
6. **v1: MARTA heavy rail only.** No Atlanta Streetcar, no bus, no airport express product variant. Atlanta Streetcar has no free transfers to MARTA rail — it is an operationally separate light rail system; exclude explicitly as `out-product` on boards showing it.
7. **Modes v1: Four MARTA heavy rail lines only** (Red, Gold, Blue, Green). 38 stations total after dedupe.
8. **America/Chicago HAS DST.** Do not copy Perth / Brisbane no-DST.
9. **Real-Time Rail API key later.** Static GTFS (google_transit.zip) requires no key. Developer key registration at https://itsmarta.com/developer-reg-rtt.aspx for GetRealtimeArrivals endpoint. Not a D1 blocker. Never paste a key.
10. GTFS static feed at https://www.itsmarta.com/google_transit_feed/google_transit.zip (no auth). GTFS-RT Bus at https://gtfs-rt.itsmarta.com/TMGTFSRealTimeWebService/ (vehicle positions + trip updates, no auth, bus only). Rail Real-Time GetRealtimeArrivals is key-gated, JSON, separate from GTFS-RT. Do not mix bus and rail RT in v1.
11. Do not generate published-network.json from GTFS or from any other city. Do not merge with chicago, washington, rotterdam, perth, or any other city product file. Cut #1 is Rotterdam only. This pack stays **planned**.

## Board eligibility

No rail services other than MARTA's own four heavy rail lines call at any MARTA in-catalog station. MARTA operates a unified heavy rail system with no other walk-up rail operators at these stations (no commuter rail, no regional rail, no Amtrak, no other light rail with free transfers). 

**Atlanta Streetcar:** Operates as a separate light rail system owned by MARTA but run under separate operations/fares. **Verdict: `out-product`** — No free transfers between MARTA heavy rail and Atlanta Streetcar are provided; riders must exit and re-pay. Streetcar touches MARTA system at Peachtree Center station only, but no transfer/connection exists. [Atlanta Streetcar details](https://itsmarta.com/streetcar.aspx).

**Summary:** All walk-up services at in-catalog MARTA stations are MARTA heavy rail (Red, Gold, Blue, Green). Streetcar has explicit no-transfer policy. No board eligibility verdicts needed beyond the streetcar's `out-product` cut (compulsory re-purchase).

## License

- **License name:** MARTA Real-Time Transit Data Feed Terms and Conditions (account-keyed; static GTFS terms not separately published).
- **Redistribution / rehosting:** "You may share the original data feed with third parties if they acknowledge the terms and you notify MARTA identifying the third party, their intended use, and the transfer date." Sublicensing (passing to a third-party API) is not explicitly prohibited in the keyed-feed terms, but requires MARTA notification and third-party acknowledgment of the original MARTA terms.
- **Commercial use:** Allowed (no commercial-use restriction stated in Real-Time API terms). MARTA trademark/mark usage is separately restricted — "MARTA prohibits using, copying, modifying, displaying, or distributing MARTA Marks for any commercial or non-commercial purpose, including app development, without prior written consent."
- **Attribution:** Not explicitly required in Real-Time API terms. MARTA logo/mark usage requires written consent; attribution phrasing (e.g., "MARTA Real-Time Data") is not forbidden but not mandated.
- **Terms URL:** https://itsmarta.com/developer-reg-rtt.aspx (Real-Time API registration & terms). Static GTFS terms: not separately documented; Google GTFS spec is CC BY 4.0, but MARTA's hosting may have separate conditions (not found in public docs).
- **Confidence:** `clear` on Real-Time API terms (registration page spells them out). `unclear` on static GTFS redistribution terms (not published separately; GTFS spec is CC BY 4.0 generic, but MARTA's own GTFS hosting terms not found).
- **Keyed feeds:** Real-Time Rail API (GetRealtimeArrivals) requires API key registration. Account terms (above) govern. Static GTFS (google_transit.zip) is unkeyed/public but terms may apply — contact MARTA for clarification before redistribute-to-third-party use.
