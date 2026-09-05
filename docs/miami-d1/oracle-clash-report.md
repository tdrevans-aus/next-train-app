# Miami oracle clash report

**Agency:** Miami-Dade Transit.

**GTFS & GTFS-RT feeds:**
- **Static GTFS:** http://www.miamidade.gov/transit/googletransit/current/google_transit.zip (no authentication; 123 routes covering Metrorail, Metromover, Metrobus, and Coral Gables Trolley).
- **Real-time (GTFS-RT):** Swiftly API endpoint https://mdcware.miamidade.gov/swagger/ui/index (requires access registration via Google Form; no public API key provided).

**Authentication type:** 
- Static GTFS: none.
- GTFS-RT: Form-based access request (non-standard; Swiftly-managed API key, account-specific terms).

**v1 network cut:**
Metrorail Green Line and Orange Line only. No Metrobus, Trolley, Metromover in v1 (board eligibility recorded separately below). Both lines share central section between Earlington Heights and Dadeland South; 23 passenger stations total.

**Hub-lock station:** Government Center (Green ✕ Orange junction; also Metromover transfer; pedestrian bridge to MiamiCentral for Tri-Rail/Brightline connections).

**Data quality note (D1 oracle surface):**
D1 oracle is official Metrorail system map (https://www.miamidade.gov/transit/library/metrorail-map.pdf) and agency line pages / station PDFs (https://www.miamidade.gov/global/transportation/metrorail.page). GTFS is not the D1 source for station order or names — map + official pages win.

## Board eligibility

Three services call at in-catalog Metrorail stations and require verdicts per `docs/board-eligibility-rule.md`:

| Service | Calling stations | Test 1: walk-up boardable? | Test 2: leave-by valid? | Verdict | Evidence |
|---|---|---|---|---|---|
| Metromover | Government Center, Brickell | Yes (free, no reservation) | Yes | `in` | https://www.miamidade.gov/global/transportation/metromover.page (fare-free automated system) |
| Tri-Rail | Government Center (MiamiCentral bridge) | **No — advance purchase only** (app/TVM; not onboard) | Yes | `out-reservation` | https://www.tri-rail.com/ states "Tickets are not sold onboard trains"; https://www.american-rails.com/tri-rail.html confirms app/TVM purchase required |
| Brightline | Government Center (MiamiCentral bridge) | Yes (walk-up ticket purchase at station) | Yes | `in` | https://www.gobrightline.com/ confirms walk-up purchase available; https://miamionthecheap.com/how-to-ride-and-save-brightline-train/ confirms same-day purchase option |

**Metromover verdict note:** Metromover is free and does not require reservation; it serves as a downtown circulator. While technically a separate operator (Miami-Dade Transit, like Metrorail), it is a walk-up boardable service at in-catalog stations and passes both tests. Verdict is `in` (not `out-product`).

## Skip risk

**High: GTFS-RT access friction.** Real-time data for Metrorail requires Swiftly API registration with no public key listed. Form-based access request may introduce latency or access denial. Static GTFS feed is stable and publicly available; RT is the friction point for live-boarding use cases.

## License

- **License name:** Unclear (static GTFS: no explicit license statement found on Miami-Dade pages or Transitland entry; GTFS-RT: Swiftly API License Agreement).
- **Redistribution / rehosting:**
  - **Static GTFS:** Not stated. Feed is publicly available but no explicit redistribution clause found.
  - **GTFS-RT (Swiftly API):** Per API License Agreement (https://www.goswift.ly/api-license): licensees may integrate APIs into own applications and distribute to end users, but "cannot... provide [APIs] to any person or entity" outside employees/contractors. Cannot "sell data to any third party, including any data broker." Public GTFS-RT data feeds may be used in competing products.
- **Commercial use:**
  - **Static GTFS:** Unclear.
  - **GTFS-RT:** Permitted in own app (e.g., rider-facing boards); prohibited for data brokerage or resale.
- **Attribution:** Not stated (static GTFS); Swiftly API forbids removal of copyright notices but does not mandate specific attribution text.
- **Terms URL:**
  - Static GTFS: https://www.miamidade.gov/global/transportation/open-data-feeds.page (no embedded license link).
  - GTFS-RT: https://www.goswift.ly/api-license and https://www.goswift.ly/saas-terms-of-service.
- **Confidence:** `unclear` on static GTFS (public data, no explicit license found); `clear` on GTFS-RT (Swiftly terms are explicit but restrictive on sublicense/resale).

## What was not done

No product code generated, no GitHub branch, no cities merge, no GTFS-RT key in any file, no Swiftly API call with real credentials, no invent city=mia or miami-dade. Network map transcription deferred to D1 Luke stage (map scan + official page source). All verdicts per published ticketing/boarding policies; no speculation on future changes.
