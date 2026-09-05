# Metra oracle clash report

**Transit Agency:** Regional Transportation Authority (RTA), Commuter Rail Division (Metra)  
**Service area:** Northeastern Illinois (6-county commuter rail system serving Chicago metropolitan area)  
**Status:** To Do, Wave: Later (US expansion wave 2–3)

## Feeds

**Static GTFS:**
- URL: https://schedules.metrarail.com/gtfs/schedule.zip
- Hosted: schedules.metrarail.com
- Archive: https://gtfsapi.metrarail.com/gtfs/raw/schedule.zip (legacy mirror)
- Update cadence: Scheduled updates published 3:00 AM daily when changes occur
- Transitland Onestop ID: `f-dp3-metra`

**GTFS Realtime (next-train):**
- Hosts: https://gtfspublic.metrarr.com/gtfs/public/
  - Trip Updates: `/tripupdates`
  - Vehicle Positions: `/positions`
  - Service Alerts: `/alerts`
- Authentication: API token required (query parameter `api_token`)
- Transitland Onestop ID: `f-metra~rt`

**Authentication & Registration:**
- Type: Developer API key (query parameter).
- Process: Register at https://metra.com/developers, agree to Metra GTFS Realtime API Key Request License Agreement, receive `api_token`.
- Restrictions: All requests must include the token; redistribution must occur through your own host, not directly from Metra's servers. Developers must include a disclaimer that the product is not sponsored, affiliated, or operated by Metra.

## v1 scope & direction model hazard

**v1 network:** All 11 Metra commuter rail lines (no buses, no Pace/CTA modal split).

**Lines in scope:**
1. BNSF (to Aurora)
2. Heritage Corridor (HC, to Joliet)
3. Metra Electric District (ME, to University Park)
4. Milwaukee District North (MD-N)
5. Milwaukee District West (MD-W, to Elgin)
6. North Central Service (NCS, to Antioch)
7. Rock Island District (RI, to Joliet)
8. SouthWest Service (SWS, to Manhattan)
9. Union Pacific North (UP-N, to Kenosha)
10. Union Pacific Northwest (UP-NW, to Harvard)
11. Union Pacific West (UP-W, to Elburn)

**Direction-model hazard (H2 clash surface):**

Metra has four separate downtown Chicago terminals, each serving different line groups. This is the primary direction-modeling clash — a rider boarding at any outer-loop station must know which terminal their line terminates at to correctly model "inbound" direction.

| Terminal | Lines | Notes |
|----------|-------|-------|
| **Union Station** | BNSF, Heritage Corridor, MD-N, MD-W, NCS, SouthWest Service | Central hub, most Metra passengers. Amtrak also terminates here (board eligibility: `out-reservation`). |
| **Ogilvie Transportation Center** | Union Pacific North, Union Pacific Northwest, Union Pacific West | Historic C&NW main lines. Ex-Chicago & North Western Terminal. |
| **LaSalle Street Station** | Rock Island District | Historic Chicago, Rock Island & Pacific terminal. |
| **Millennium Station** | Metra Electric District | Lowest-ridership single line; hosts South Shore Line platforms (separate operator; `in` verdict). |

No single downtown station is called by all 11 lines — direction coding must resolve on terminal + line.

## Hub-lock station & shared-name collisions

**Hub-lock recommendation: Union Station (IATA/CRS: CUS)**

Union Station is the largest Metra hub, serving six of the 11 lines (BNSF, HC, MD-N, MD-W, NCS, SWS). It is also Amtrak's Chicago gateway and connects to CTA (multiple 'L' lines within walking distance). Not "The Loop" (that's a structure/district); the station name is **Union Station**.

**doNotGroup collisions with CTA 'L' — verified from Chicago CTA report:**

| Metra stop | CTA 'L' stop | class |
|---|---|---|
| **Union Station** (Metra BNSF/HC/MD/NCS/SWS hub) | **Quincy** ('L' Red/Orange/Pink/Brown/Purple; map node on Loop) | Same location, different stations. Riders walk between them (5–10 min within Union Station complex). No shared platform. **doNotGroup: Quincy ≠ Union Station.** |
| **Ogilvie Transportation Center** (Metra UP-N/NW/W hub) | **Washington/Wells** ('L' Brown, one of Loop corners) | **doNotGroup: Washington/Wells ≠ Ogilvie.** Ogilvie icon on CTA map is transfer annotation only. |
| **LaSalle Street Station** (Metra Rock Island hub) | **LaSalle/Van Buren** ('L' Blue; one stop east, near Van Buren on Loop) + Library ('L' Brown/Orange/Purple; renamed Harold Washington Library-State/Van Buren) | **doNotGroup: LaSalle/Van Buren ≠ LaSalle Street Station** (different streets; one is L-Van Buren corner, other is Rock Island terminal). **doNotGroup: Library ≠ LaSalle Street Station.** |
| **Millennium Station** (Metra Electric hub) | **Washington/Wabash** ('L' Brown/Green/Orange/Pink/Purple) + WMATA-parallel: various | **doNotGroup: Washington/Wabash ≠ Millennium Station.** |

No Metra station name is identical to a CTA 'L' stop name in the Loop region. Metra stops on outer branches (e.g., Forest Park–Oak Park Harlem duplicates on Blue/Green or Western on multiple lines) require per-line disambiguation in published networks, consistent with CTA's published-network structure (already handled in next-train-app CTA adapter).

## Board eligibility

**Walk-up boarding contract:** Metra offers walk-up boarding with a $5 surcharge for onboard ticketing at all in-scope stations. No compulsory reservation; riders with a pass or standard ticket can board the next departure.

| Service | Verdict | Reason | Evidence |
|---------|---------|--------|----------|
| **Metra commuter rail (all 11 lines)** | `in` | Walk-up boarding available; no reservation required. $5 onboard surcharge does not prevent walk-up boarding — it is a pricing choice, not a boarding contract barrier. | https://metra.com/riding-metra-faqs, https://metra.com/stations-and-lines |
| **Amtrak (at Union Station only)** | `out-reservation` | All Amtrak services require compulsory seat reservation in advance. No walk-up boarding is available; seats are booked 45+ minutes prior to departure via Amtrak.com or Ticket Office. | https://www.amtrak.com/stations/chi, https://chicagounionstation.com/travel/amtrak |
| **NICTD South Shore Line (at Millennium Station only)** | `in` | Separate commuter rail operator (Northern Indiana Commuter Transportation District). Walk-up boarding available; no compulsory reservation. South Shore is a distinct operator from Metra; it is **not** part of Metra's 11 lines and requires its own verdict because it calls at an in-catalog station (Millennium). Verdict: `in` (passes walk-up and check-in tests). | https://www.mysouthshoreline.com/, Transitland feed f-northern~indiana~commuter~transportation~district |

**Catalog decision:** All three services call at in-catalog stations (Union Station for Amtrak, Millennium for South Shore). Each has a recorded verdict. No silence.

## License

- **License name:** Metra GTFS Realtime API Key Request License Agreement (custom developer terms).
- **Redistribution / rehosting:** Non-exclusive, limited, and revocable license granted. Licensee may reproduce and redistribute Metra Data, but **must redistribute through licensee's own host/server, never directly from Metra's endpoints**. Licensee must include disclaimer: "This product, application, or site is not sponsored, affiliated, or operated by Metra." Data may not be modified or deleted.
- **Commercial use:** Allowed within the scope of the license (rider-assistance, public-transportation-promotion products). Restrictions apply to claims of sponsorship/affiliation with Metra.
- **Attribution:** Disclaimer text required (above); attribution logo/specific wording not mandated, but Metra branding rules apply (verify at https://metra.com/developers for current branding guidelines).
- **Terms URL:** https://metra.com/gtfs-realtime-api-key-request-license-agreement
- **Confidence:** `clear` — license terms are explicit and well-documented. Key agreement process is standard (developer registration → agreement → token issuance). No ambiguity on redistribution (must use own host) or derivative rights (allowed).
- **Keyed feeds:** API token is required for GTFS-RT (trip updates, vehicle positions, alerts). Static GTFS schedule.zip at schedules.metrarail.com is public-download without key. Key terms cover realtime access only; account/key agreement does not restrict redistribution beyond the "own host" rule already stated in the license.

## Notes for Luke (D1 pack)

1. **Terminal distribution is the H2 surface.** Union Station is the prime hub, but no single inbound direction applies to all 11 lines. Recommend recording terminal + line as the direction model (or "inbound to [terminal name]"). This differs from CTA 'L' (single Loop hub) and is closer to BART multi-terminal model.
2. **South Shore Line verdict stands separately.** NICTD is a distinct operator. If v1 includes South Shore at Millennium (board eligibility: `in`), South Shore's own feed must be integrated alongside Metra's. If Millennium is Metra-only in v1, no South Shore on the board. Recommend `in` (walk-up boarding available, no compulsory reservation or check-in barrier).
3. **No api_token in any file.** API key is developer-secret; secure storage via Vercel environment variable or .env.local (never in code).
4. **doNotCollapse** across all Metra-CTA collisions listed in the table (Quincy, Washington/Wells, LaSalle/Van Buren, Library, Washington/Wabash, Ogilvie, Millennium, Union Station as termini).
5. **City token:** Recommend `city=chicago-metra` or `city=metra`. Do not split Metra into region-by-region rows (all 11 lines are one operator). Do not merge with CTA (chicago-l).

## What I did not do

No live GTFS API call with a key. No static schedule.zip ingestion. No station list extraction. No direction model coding. No published-network.json generation. No product edit. No adapter wiring. No registry entry. No github actions.

## References

- Transitland feed registry: https://www.transit.land/feeds/f-dp3-metra (static), https://www.transit.land/feeds/f-metra~rt (GTFS-RT)
- Metra Developer Portal: https://metra.com/developers
- Metra GTFS API page: https://metra.com/metra-gtfs-api
- Metra License Agreement: https://metra.com/gtfs-realtime-api-key-request-license-agreement
- NICTD South Shore Line: https://www.mysouthshoreline.com/, Transitland: https://www.transit.land/feeds/f-northern~indiana~commuter~transportation~district
- Chicago Transit Authority CTA 'L' report (collision reference): https://github.com/next-train-expansion/next-train-app/docs/chicago-d1/oracle-clash-report.md
