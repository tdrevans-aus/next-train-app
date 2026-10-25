# Amtrak Pacific Surfliner — real-time feed and redistribution terms

**Lane:** Nico research (feed verification & license). **Date:** 2026-10-25. **City:** Los Angeles. **Scope:** Pacific Surfliner GTFS-RT feed and redistribution-terms verification for LA Metro Rail board.

**Status:** Feed exists (third-party conversion); redistribution terms remain uncleared. Wiring gate **remains blocked** pending Tim's approval of redistribution terms.

---

## Feed verification

| Field | Finding |
|---|---|
| **Service** | Amtrak Pacific Surfliner (unreserved coach; see ledger) |
| **Official GTFS-RT endpoint** | **Not found.** Amtrak publishes a static GTFS schedule only (https://content.amtrak.com/content/gtfs/GTFS.zip, confirmed via Transitland and Mobility Database). No official public Amtrak GTFS-RT endpoint is documented or discoverable. Amtrak's Partner Portal requires approved-developer credentials (SOAP/REST API) and is not public. |
| **Real-time data source** | **Third-party conversion from Track-A-Train.** Public keyless GTFS-RT feeds are available: https://asm-backend.transitdocs.com/gtfs/amtrak (transitdocs project, Amtrak + VIA Rail). This feed decrypts Amtrak's private Track-A-Train map JSON (https://maps.amtrak.com/services/MapDataService/trains/getTrainsData) and produces valid GTFS-RT vehicle positions, trip updates, and alerts. No API key required. Alternative libraries: `amtrak-gtfs-rt` Rust crate (github.com/CatenaryTransit/amtrak-gtfs-rt, AGPL-3.0), which performs the same conversion. |
| **Is "Track-A-Train data" official Amtrak data or a third-party scrape?** | **Mixed / unclear.** Track-A-Train is Amtrak's own real-time web map (https://www.amtrak.com/track-your-train-with-google-maps). Amtrak publishes the map; the JSON endpoint is internal to the map but used by Amtrak's own systems. The endpoint is not officially documented as a public API. Third-party libraries decrypt and convert it to GTFS-RT. Transitdocs describes the feed as derived from "Amtrak's map" with no explicit API agreement or terms published by Amtrak. Amtrak does not formally authorize redistribution of Track-A-Train data or its derived forms. |
| **Static GTFS** | https://content.amtrak.com/content/gtfs/GTFS.zip. No authentication. Verified via Transitland (Onestop ID f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle, last fetch 2026-10-16 successful). Pacific Surfliner is route ID 78. |
| **Auth type** | **None for static GTFS.** Third-party GTFS-RT (transitdocs) is keyless. Amtrak Partner Portal (approved developers only) uses SSL certificate + credentials; not applicable to public feeds. |

---

## Stations in Los Angeles catalog

**Union Station only.** Pacific Surfliner calls at:
- **Los Angeles Union Station** (800 N. Alameda St., Los Angeles, CA 90012) — confirmed staffed station on official schedule.

**Pomona North:** Not served by Pacific Surfliner. Pomona North is an Inland Empire–Orange County Line Metrolink station (https://metrolinktrains.com/globalassets/rider-info/general-info/metrolink_system-map_editable_may_2026b.pdf). Pacific Surfliner terminates at Union Station northbound; it does not continue into San Gabriel Valley.

---

## v1 mode cut

Metro Rail only (A/B/C/D/E/K). Pacific Surfliner is a separate operator and separate network; it is not part of the v1 Metro Rail mode cut but qualifies as `in` (walk-up unreserved coach, passes board-eligibility tests per ledger).

---

## License / redistribution terms

- **License name:** Amtrak Web Notices & Site Terms of Use (amtrak.com), plus underlying data status of Track-A-Train conversion.
- **Redistribution / rehosting — static GTFS:** Amtrak's web terms (updated 2025-03-05) state: "you may not copy, reproduce, republish, upload, post, transmit or distribute the Materials, Software, or other content or information available on or through the Site **in any way without our prior written permission.**" The static GTFS zip is ungated (no key, no click-through) but is listed as "Materials" subject to this restriction. Transitland indexes it and notes the feed as publicly available; however, public availability does not establish a redistributable license. No feed-specific license (CC0, CC-BY, ODbL, PDDL, etc.) is published or stated in feed_info.txt.
- **Redistribution / rehosting — GTFS-RT (third-party):** The transitdocs feed (https://asm-backend.transitdocs.com/gtfs/amtrak) is published without key, registration, or click-through. Transitdocs documentation (asm.transitdocs.com/about) states: "Real time train status and position data is available in GTFS-RT format for Amtrak and VIA trains. No API key is required for access." However, transitdocs itself is a third-party aggregator (operator: Chris Whong / Bridger Cummings, contact asm-contact@transitdocs.com). Use of transitdocs' feed is subject to transitdocs' terms (not Amtrak's). The feed is regenerated daily from Amtrak's static GTFS + decrypted Track-A-Train data; transitdocs does not have published terms governing downstream redistribution by a third party (such as this app). **No formal permission from Amtrak or transitdocs has been obtained to include this feed in a published transit app.**
- **Commercial use:** Amtrak's general terms do not explicitly allow or prohibit commercial use of the GTFS data. The policy is "use subject to registration purpose" (Partner Portal). Transitdocs explicitly permits free use: "Amtraker's data is available for use for free, as long as you don't spam the API" (per Amtraker, a separate third-party aggregator). No statement on this app's commercial status has been verified against Amtrak terms.
- **Attribution:** Amtrak's terms require that copyright and other proprietary notices stay on downloaded Materials. They do not name a credit line. Transitdocs asks: "If you use any of these feeds, please let me know (asm-contact@transitdocs.com)" — a courtesy notice, not a formal attribution clause. A draft of this report quoted an LA Metro attribution sentence here; that sentence is not on the Amtrak terms page and has been removed (controller, 25 Oct 2026).
- **Terms URL:** 
  - Amtrak: https://www.amtrak.com/web-notices-terms-of-use (updated 2025-03-05)
  - Static GTFS landing (Transitland): https://www.transit.land/feeds/f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle
  - Transitdocs (GTFS-RT): https://asm.transitdocs.com/about ; contact asm-contact@transitdocs.com
- **Confidence:** `unclear`. Amtrak's general terms prohibit redistribution without permission. Public availability of the static GTFS and third-party GTFS-RT does not establish a redistributable license. Transitdocs' GTFS-RT is published freely but without explicit downstream-redistribution terms. No Amtrak formal licensing agreement has been obtained.

---

## Board eligibility

| Service | Station(s) | Verdict | Status | Notes |
|---|---|---|---|---|
| **Amtrak Pacific Surfliner** | Union Station | `in` | **Tim, 25 Oct 2026** | Unreserved coach (ledger §2). Walk-up ticketing at station machines; no compulsory reservation (pacificsurfliner.com FAQ). Passes board-eligibility tests 1 & 2. Verdict affirmed per ledger. **Feed gate remains blocked:** GTFS-RT is third-party-converted from Track-A-Train (not official Amtrak endpoint). Redistribution terms uncleared. Wiring this service onto the board is contingent on Tim's approval of redistribution license terms. |

**Correction note (Tim, 25 Oct 2026, Australia/Perth session):** The proposed `out-product` verdict for Pacific Surfliner was withdrawn. Service remains `in` (walk-up unreserved). Ledger records both the verdict (`in`) and the blocker (feed & redistribution terms unverified). This oracle report is the feed-verification step.

---

## Skip risk

**Wiring stays blocked.** No official Amtrak GTFS-RT, and redistribution of the third-party feed is not cleared. Specific risks:

1. **Unofficial real-time feed:** Transitdocs' GTFS-RT is a third-party conversion of Amtrak's private Track-A-Train endpoint. Not an official Amtrak API. No service-level agreement or stability guarantee from Amtrak or transitdocs.
2. **Redistribution terms unconfirmed:** Amtrak's general web terms prohibit redistribution without permission. No public open license or written permission for downstream use in a third-party app has been verified. Transitdocs permits free API access but does not formally authorize redistribution by this app.
3. **Transitdocs operational dependency:** The feed's availability is subject to transitdocs' continued operation and maintenance. Bridger Cummings (transitdocs operator) is a volunteer maintainer. No service continuity guarantee.
4. **Track-A-Train data staleness:** Transitdocs FAQ notes Amtrak's Track-A-Train feed itself is sometimes stale or displays day-old data. Derived GTFS-RT inherits this quality issue.

**Confidence on feed existence:** `clear` — the third-party transitdocs feed exists and is publicly accessible. **Confidence on official status:** `unclear` — Amtrak has not published or authorized this feed. **Confidence on redistribution:** `not found` — no written permission or open license from Amtrak. **Tim's approval required before wiring** (per ledger).

---

## Operative findings

1. **No official Amtrak GTFS-RT endpoint** exists; Amtrak publishes static GTFS only.
2. **Real-time data available via third-party conversion:** transitdocs (https://asm-backend.transitdocs.com/gtfs/amtrak), keyless, derived from Amtrak's Track-A-Train map.
3. **Los Angeles station:** Union Station only. Pacific Surfliner does not call at Pomona North.
4. **Redistribution terms:** Amtrak's general terms prohibit redistribution without permission. No open license published. Transitdocs permits free API use but does not authorize downstream redistribution by a third-party app without further agreement.
5. **Board eligibility:** Verdict `in` (Tim, 25 Oct 2026); feed gate remains blocked pending redistribution clearance.

**Next step:** Tim decides whether to approve redistribution terms for the transitdocs feed or request Amtrak direct authorization (unlikely; Amtrak does not publicly support GTFS-RT).
