Auckland D1 + research pack (Luke). City stays planned. Perth/Sydney/Brisbane/Adelaide live-gates untouched. assertCityLive("auckland") must still fail. No generator, no PR, no issues. Tim copies files; Jim owns D2–D6. Do not flip auckland live.

Drop later (Jim D2): qa/fixtures/auckland/published-network.json. Research pack is /workspace/auckland-pack/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

D1 = official AT passenger train maps/PDFs/line pages as of 24 Aug 2026 (Southern EAST/WEST/STH/ONE network). Primary index https://at.govt.nz/bus-train-ferry/train-services/auckland-train-network-maps plus current Eastern/Western timetables, Waitematā Station page, Onehunga current description. Modes v1: TRAIN only. No bus/ferry/AirportLink/Te Huia in the oracle. Stations hand-transcribed. Not generated from GTFS.

CRL: NOT passenger-open. AT confirms opening Sunday 13 September 2026 (weekday timetable 14 Sep). Te Waihorotiu and Karanga-a-Hape are not D1 stops. Maungawhau currently closed. Future E-W / S-C / O-W stay in coverageGaps until a new D1 after opening.

C2/C3: (1) Lock Waitematā Station — not Britomart, not City Centre, not Waitemata Train Station. (2) Macron vs GTFS ASCII (Ōrākei, Ōtāhuhu, Rānui, Te Pāpapa, Paerātā). (3) Onehunga currently ends at Newmarket. (4) Paerātā and Drury live from 2 Aug 2026; Ngākōroa not open. (5) Manukau Train vs Bus Station. (6) CRL names already in GTFS stops — do not treat feed presence as live D1.

H2: Public static GTFS works with no key. https://gtfs.at.govt.nz/gtfs.zip (Last-Modified 13 Aug 2026 14:26:13 GMT; feed 20260806–20261129). Linked from https://at.govt.nz/about-us/at-data-sources/general-transit-feed-specification. Route codes STH EAST WEST ONE already match passenger pages. Dev portal https://dev-portal.at.govt.nz/ is for APIs if Tim needs realtime later — not required for this clash.

H7: Pacific/Auckland HAS DST. Do not copy Brisbane no-DST.

§3 rec: line + terminus (Southern Line + Pukekohe). Flag: official UI is Towards Waitematā / City Centre; CRL through-running will kill inbound/outbound. Hold D5. Jim owns D2–D6. Do not flip auckland live.
