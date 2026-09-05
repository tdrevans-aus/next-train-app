# Salt Lake City oracle clash report

D1 (to be researched by Luke): **TRAX light rail system** — 3 lines (Blue, Red, Green), 50 stations across Salt Lake Valley. All lines converge downtown. Official system map and line pages available at https://www.rideuta.com/Services/TRAX.

Transitland references:
- Operator: [Utah Transit Authority](https://www.transit.land/operators/o-9x0-utahtransitauthority)
- GTFS feed: [f-9x0-uta](https://www.transit.land/feeds/f-9x0-uta)
- GTFS-RT feed: [f-9x0-uta~rt](https://www.transit.land/feeds/f-9x0-uta~rt)

## Feeds and authentication

**Static GTFS:** `https://gtfsfeed.rideuta.com/GTFS.zip` (public, no API key required)

**GTFS-RT (real-time):**
- Trip Updates: `https://apps.rideuta.com/tms/gtfs/TripUpdate`
- Vehicle Positions: `https://apps.rideuta.com/tms/gtfs/Vehicle`
- Service Alerts: `https://apps.rideuta.com/tms/gtfs/Alert`

All endpoints are public and return protobuf GTFS-RT format. No developer key, API token, or registration required.

**Feed status:** Both static and real-time feeds are actively maintained and verified current as of September 2026 (Transitland last fetch 5 Sep 2026).

## v1 mode cut

**TRAX Blue, Red, and Green lines only.** No buses, S-Line Streetcar, or FrontRunner commuter rail in v1 catalog.

- **Blue Line:** Downtown Salt Lake City ↔ Draper (via Murray, Midvale)
- **Red Line:** University of Utah ↔ Daybreak (via Sandy, West Jordan)
- **Green Line:** Salt Lake City International Airport ↔ West Valley City (via Downtown)

**Out of v1:** S-Line Streetcar (two-mile light rail in Sugar House, opened 2024; streetcar-specific service, separate from TRAX network). FrontRunner commuter rail (Ogden–Provo, shares platforms at Salt Lake Central, Murray Central, and North Temple Bridge/Guadalupe but is commuter-class, not metro-class v1 service).

## Hub-lock station

**900 South** (900 South 200 West, Downtown Salt Lake City) — served by all three TRAX lines (Blue, Red, Green). Opened September 19, 2005. Central transfer point within the shared downtown corridor (400 South to 2100 South). All lines converge here; no line-specific gaps or branch divergences at this station.

Alternative hubs: Salt Lake Central (Blue line only); City Center (Blue + Green); Gallivan Plaza (Blue + Green). **900 South is the only all-three-line hub.**

## Board eligibility

### Walk-up boardable services at TRAX stations

| Service | Lines / Coverage | Verdict | Reason |
|---------|-----------------|---------|--------|
| TRAX Blue Line | Downtown ↔ Draper | `in` | v1 in-scope TRAX line; walk-up ticketing |
| TRAX Red Line | University of Utah ↔ Daybreak | `in` | v1 in-scope TRAX line; walk-up ticketing |
| TRAX Green Line | Airport ↔ West Valley City | `in` | v1 in-scope TRAX line; walk-up ticketing |
| FrontRunner commuter rail | Ogden–Provo (shares Salt Lake Central, Murray Central, North Temple Bridge/Guadalupe) | `out-mode` | Walk-up ticketing confirmed; commuter class; v1 = TRAX only |
| S-Line Streetcar | Sugar House ↔ South Salt Lake (connects to TRAX, separate line) | `out-mode` | Walk-up ticketing; streetcar service; v1 = TRAX only |

**No reserved-seat or check-in services call at TRAX stations.** Walk-up boarding is available for all three TRAX lines; FrontRunner and S-Line use walk-up fares but are excluded per v1 mode cut (TRAX only).

## Skip risk

**None.** GTFS and GTFS-RT feeds are public, stable, and actively maintained. No API key, registration, or authentication barrier. Transitland confirms successful scheduled fetches. No indication of planned discontinuation or access restrictions.

## License

- **License name:** Agency-specific developer terms (titled "Route and departure data provided by permission of UTA").
- **Redistribution / rehosting:** Limited. UTA's standard language: "data provided by permission" suggests non-exclusive, conditional use. Full terms document not publicly accessible from current Transitland/Mobility Database or rideuta.com front page; requires contact with UTA or developer portal access at developer.rideuta.com.
- **Commercial use:** Unclear — referenced by Transitland as UTA's Terms of Use (http://developer.rideuta.com/TermsOfUse.aspx, currently inaccessible). UTA BusTrack app uses the phrase, suggesting internal/partner-level distribution is permitted, but public third-party redistribution terms are not explicit.
- **Attribution:** Not documented in publicly accessible sources.
- **Terms URL:** http://developer.rideuta.com/TermsOfUse.aspx (referenced by Transitland; portal access may require registration).
- **Confidence:** `unclear`. The GTFS feed is publicly downloadable and GTFS-RT endpoints are public with no gate, suggesting practical openness. However, the explicit license language ("by permission") and inaccessibility of the full terms document means redistribution terms are not confidently stated. Luke must contact UTA at developer.rideuta.com or via rideuta.com to clarify: (1) whether public redistribution (e.g., embedding in a third-party app's realtime board) is permitted, and (2) whether any attribution is required.

## Notes for Luke

1. **Keyed feeds?** No — neither static nor real-time endpoints require API key or developer registration. Feeds are public.
2. **GTFS quality:** Transitland reports "1 errors" and "12 warnings" as of last validation (Feb 2025 data in Mobility Database); typical for US light-rail systems but verify during D1 pack.
3. **Daylight saving time:** America/Denver timezone (Mountain Time, DST observed). Do not copy Perth/Brisbane no-DST handling.
4. **S-Line and FrontRunner boarding:** Both are walk-up (no compulsory reservation), but correctly marked `out-mode` per v1 scope cut (TRAX-only). If v1 scope expands in future, these would be `in`, not excluded.
5. **License contact:** UTA developer portal or main office (https://www.rideuta.com) should clarify data-use terms before D1 pack ships.
