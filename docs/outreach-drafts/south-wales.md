# South Wales outreach: TfW GTFS feed availability

## To: Transport for Wales (data team)
**Email:** data@tfw.wales  
**Subject:** Public GTFS feed inquiry — Valley Lines timetable and real-time data

---

## Draft message

Hello,

We are developing **Next Train**, a multi-city real-time transit app that displays live departure boards for commuter rail networks. We currently integrate with National Rail via the Darwin API and are planning to add Valley Lines service coverage for the South Wales region.

To include Valley Lines (Cardiff Central, Pontypridd, Merthyr Tydfil, and other stations on the six Valley Lines routes) in our application, we need timetable data in **GTFS static format** and real-time departure data in **GTFS-RT format** — both published as public feeds.

We understand Transport for Wales currently distributes Valley Lines timetables in TransXChange format via direct contact. To scope this region for our roadmap, we need to confirm:

1. **Does TfW publish (or plan to publish) a public static GTFS feed for Valley Lines?** If not currently available, is there a timeline or process to request public GTFS distribution?

2. **Is there a public GTFS-RT (real-time) API endpoint for Valley Lines departures?** If not, would TfW be open to exposing real-time data via a standard GTFS-RT feed for third-party transit apps?

3. **If GTFS is not available, would TfW accept a direct data-sharing arrangement** (e.g., TransXChange timetable files on a regular schedule, or API access to real-time data) to enable integration with third-party mobility apps like ours?

We are not requesting exclusive access, only confirmation of what data sources are available publicly or via standard third-party agreements. This will help us plan whether Valley Lines can be included in our v1 launch or deferred to a later phase pending feed availability.

Thank you for your time. Please let us know the next steps.

Best regards,  
Tim  
[Next Train app contact info]

---

## Context for Tim

**This addresses the critical blocker in the South Wales oracle report:** TfW does not publish static GTFS or GTFS-RT via a public API. The report recommends confirming with TfW directly before D1 pack work proceeds.

**Possible outcomes:**
- TfW confirms public GTFS/GTFS-RT feeds exist or will be published → proceed to D1 pack.
- TfW offers direct data-sharing (TransXChange files or API access) → D1 pack proceeds with custom parser.
- TfW declines to publish or share data → Valley Lines defers to later phase (remains planned-only; use National Rail Darwin at Cardiff Central hub for v1).

**Do not send this until after the National Rail account blocker (DARWIN_LDB_TOKEN via UK re-registration) is resolved** — the oracle report indicates both blockers must clear before region wiring begins, but the TfW feed question is independent and can be confirmed in parallel.
