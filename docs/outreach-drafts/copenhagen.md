# Copenhagen Metro real-time outreach — drafts for Tim

Two outreach messages for Tim to review and send himself via the contact pages below. Both ask the same three core questions; send to separate people/roles.

---

## Message 1: Dataudveksleren / Danish National Access Point

**Send to:** Dataudveksleren support (contact page: https://semanticgis.dk/Data-Portals/Traffic-and-Mobility-data-(Dataudveksleren), portal: https://du-portal-ui.dataudveksler.app.vd.dk/)

**Courtesy opening (Danish):**  
"Hej — vi skriver på engelsk, håber det er okay."

**Body:**

Hello,

We're developing a transit rider app (Next Train) for Copenhagen and nearby regions. The app shows the next departures from a station in real time; we're already live in Australia, the UK, Sweden, Helsinki, and Oslo.

We're integrating Copenhagen's S-tog, DSB Regional, and Metro services via Rejseplanen's static GTFS feed, which works well for schedule display. However, our app's requirement is that all services shown must have real-time departure data — without it, the region cannot launch live.

**Rejseplanen API 2.0's `departureBoard` endpoint returns real-time for S-tog and DSB, but not for Copenhagen Metro** (we've confirmed this by direct API testing). We're trying to locate Metro real-time via other sources.

Three questions:

1. Does Dataudveksleren's SIRI-ET feed include **real-time departures for Copenhagen Metro (Metroselskabet M1–M4 lines)**? If so, what fields are included (e.g., `prognosisType`, `rtTime`)?

2. What **registration process and licence terms** apply for an independent rider app to access SIRI-ET data? Is redistribution/commercial display of queried departures permitted?

3. Is there a **contact at Metroselskabet or another source** for Copenhagen Metro real-time, or should we work through Dataudveksleren for this?

Any guidance would help us unblock this city. Thank you.

Best regards,  
Tim Evans

---

## Message 2: Rejseplanen Labs support

**Send to:** Rejseplanen Labs support (contact page: https://labs.rejseplanen.dk/ or support email if listed there)

**Courtesy opening (Danish):**  
"Hej — vi skriver på engelsk, håber det er okay."

**Body:**

Hello,

We're developing a transit rider app for Copenhagen (already live in Australia, the UK, Sweden, Helsinki, and Oslo). We've successfully integrated your static GTFS feed and API 2.0 `departureBoard` endpoint for S-tog and DSB services — both work well and return real-time data consistently.

However, **we've confirmed that `departureBoard` returns no real-time fields for Copenhagen Metro** — every Metro row carries only schedule data (`name`, `time`, `date`, `direction`), with no `prognosisType`, `rtTime`, or `rtDate`. S-tog and DSB rows on the same endpoint include `prognosisType` on every row, so this appears to be an operator-level absence, not an endpoint issue.

Our app's requirement is real-time for all displayed services, so this blocks Copenhagen's launch.

Two questions:

1. **Is Metro real-time planned for Rejseplanen API 2.0's `departureBoard` endpoint?** If so, what is the expected timeline?

2. If not, is there **another feed (GTFS-Realtime, SIRI-ET, or other) through which Metroselskabet's real-time departs are published** that we could access?

We're happy to work with you on registration and licensing if either path is available. Thank you.

Best regards,  
Tim Evans

---

## Notes for Tim

- Both drafts assume you'll add your email and contact method.
- The Dataudveksleren portal contact link (https://du-portal-ui.dataudveksler.app.vd.dk/) returned 403 on documentation pages when researched, so contact availability is unverified — check their public support/contact page first.
- Rejseplanen Labs support is likely via labs.rejseplanen.dk or a support email; their contact page should be linked from there.
- Both messages cite Jim's direct testing evidence (19–20 Sep 2026) as justification for the Metro RT absence claim — that evidence is in `docs/copenhagen-d1/metro-realtime-sources.md` if any respondent asks for details.
- The SIRI-ET question assumes it's the right vector since it's the NAP's format and Rejseplanen docs reference it; see metro-realtime-sources.md "Option A" for context.

---

## Context files for reference

- `docs/copenhagen-d1/metro-realtime-sources.md` — full research findings, contact details, and Tim's two options.
- `docs/copenhagen-d1/jim-handoff.md` — Jim's adapter notes, including the live-board wiring stop (20 Sep 2026) and evidence section.
