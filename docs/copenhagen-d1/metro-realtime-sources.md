# Copenhagen Metro real-time sources — research findings

**Date:** 20 Sep 2026 | **Scope:** Verify whether Copenhagen Metro (M1–M4) has publicly accessible machine-readable real-time data from any source.

---

## Executive summary

Rejseplanen API 2.0 `departureBoard` (the primary aggregated feed) returns **NO real-time fields** for Metro departures — Jim's direct testing (19–20 Sep) confirmed Metro rows carry only schedule data (`name`, `time`, `date`, `direction`, `track`), with zero `prognosisType`, `rtTime`, `rtDate`, or `rtPlatform` fields. S-tog and DSB rows on the same endpoint carry `prognosisType` (real-time marker) consistently.

**No GTFS-Realtime (GTFS-RT) feed** for Copenhagen Metro appears in Transitland or Mobility Database; none documented or accessible.

**Metroselskabet / m.dk** publish no documented developer API for real-time data; m.dk is a customer-service portal, not a data endpoint.

**SIRI-ET via Dataudveksleren (Denmark's NAP)** exists as a Rejseplanen real-time path, but portal documentation required to verify Metro coverage is not publicly accessible (403 Forbidden on guides pages). Signup terms and operator coverage list cannot be independently verified.

**Headway/"next train in N min" data**: No publicly documented source found.

---

## Source-by-source findings

### 1. Rejseplanen API 2.0 `departureBoard` endpoint

**URL:** `https://api.rejseplanen.dk/api/2.0/departureBoard`  
**Auth:** Registered key via labs.rejseplanen.dk (free tier: 50,000 calls/month).  
**Scope:** Claims coverage of Metro, S-tog, DSB, buses; real-time ~1 min latency.

**Verdict:** **No real-time for Metro.** Jim's testing (live pulls, 19–20 Sep 2026, three stations: København H, Nørreport, Kongens Nytorv) observed:
- **Metro rows (every station, 100% of Metro rows):** Zero `prognosisType`, zero `rtTime`/`rtDate`/`rtPlatform`/`rtTrack`, zero `cancelled`. Pure schedule.
- **S-tog rows (same pulls):** 100% carry `prognosisType` field (`"PROGNOSED"` or `"CALCULATED"`); several rows also had `rtTime`, `rtDate`, `rtPlatform` showing live deviations (e.g., 19-min delay + platform change observed).
- **DSB/Regionaltog (same pulls):** 100% carry `prognosisType`; similarly robust RT data.

**Conclusion:** Rejseplanen API 2.0 explicitly does **not** publish Metro real-time on the `departureBoard` endpoint. This is not a transport mode filtering issue (Jim queried Metro-tagged stops and got correct Metro rows back, just schedule-only); it's operator-level: Metroselskabet data enters Rejseplanen's aggregation without real-time fields.

**Reference:** `docs/copenhagen-d1/jim-handoff.md`, "Jim's note — live-board wiring STOPPED" (20 Sep 2026).

---

### 2. GTFS-Realtime (GTFS-RT)

**Scope:** Protobuf real-time feed standard, used by many operators.

**Findings:**
- **Mobility Database** (mobilitydatabase.org): Rejseplanen entry (mdb-1292) lists only GTFS static schedule feed; no GTFS-RT feed listed for Rejseplanen or any Metro-specific variant.
- **Transitland** (transit.land): Searched for Copenhagen Metro feed — returns Rejseplanen static feed link, no real-time variant documented.
- **No Metro-specific GTFS-RT URL located** in public registry or search results.

**Conclusion:** No publicly accessible GTFS-Realtime feed for Copenhagen Metro found.

---

### 3. SIRI-ET via Dataudveksleren (Danish NAP)

**Endpoint:** Dataudveksleren / National Access Point for traffic & mobility data (Denmark)  
**Portal:** https://du-portal-ui.dataudveksler.app.vd.dk/ and https://semanticgis.dk/Data-Portals/Traffic-and-Mobility-data-(Dataudveksleren)  
**Auth:** Portal signup required for SIRI-ET access.  
**Scope:** Rejseplanen publishes real-time data in SIRI-ET (European standard) via this NAP.

**Findings:**
- **Portal documentation inaccessible** (HTTP 403 Forbidden on https://du-portal-ui.dataudveksler.app.vd.dk/guides?locale=en).
- **SIRI-ET format documented** on Rejseplanen Labs (Om SIRI-ET article exists but HTTP 403 on direct fetch).
- **Operators and coverage:** No public list found naming which operators' data flows through SIRI-ET. Generic documentation states Dataudveksleren carries Rejseplanen NeTEx files and real-time SIRI data for "buses, trains, metro" but does not itemize operator coverage or whether Metro real-time is included.

**Conclusion:** SIRI-ET **path exists** (Dataudveksleren is the NAP), but **Metro coverage is unconfirmed**. Signup terms and operator list require direct portal access or contact with NAP administrator (Vejdirektoratet / Danish Road Directorate).

---

### 4. Metroselskabet / m.dk direct API

**Website:** https://m.dk/ (customer-service portal) and https://metroselskabet.dk/ (corporate site)  
**Developer portal:** None found. No documentation of a real-time API for third-party developers.

**Findings:**
- **m.dk** separates "construction updates and corporate communication" but provides **no developer API documentation** or endpoint reference.
- **Search for "Metroselskabet API"** returns results for other cities' metro systems (LA Metro, NZ Metro, etc.) with public APIs, but **nothing for Copenhagen Metro**.
- **Contact information** available (dpo@m.dk, +45 3311 1700), but no pre-existing developer path documented.

**Conclusion:** No publicly accessible API found. Real-time data, if it exists, is not exposed to external developers.

---

### 5. Headway/"next train in N minutes" data

**Scope:** Operational headway feeds sometimes published as "next train available in X minutes" without full timetable detail.

**Findings:** No evidence of this data type for Copenhagen Metro in any public source.

**Conclusion:** Not found.

---

## Dataudveksleren signup requirements and terms

**What we know:**
- Dataudveksleren (Danish Road Directorate / Vejdirektoratet) is the legal NAP per EU Directive 2010/40/EU.
- Signup is required to access SIRI-ET data (not open/unauthenticated).
- Rejseplanen Labs references this path but does not provide signup details directly.

**What is unknown:**
- Whether Copenhagen Metro real-time is included in Dataudveksleren's SIRI-ET dataset.
- Signup process (self-service registration vs. manual approval).
- Commercial-use restrictions (whether redistribution of queried data is permitted under NAP terms).
- Rate limits or data refresh frequency.
- Whether the feed provides real-time fields analogous to `prognosisType` in Rejseplanen API 2.0.

---

## Conclusion: Jim's evidence vs. unverified paths

Jim's testing definitively rules out **Rejseplanen API 2.0** as a Metro real-time source. SIRI-ET **might** carry Metro real-time (it's the right format, the right operator network publishes through it), but:
1. Portal documentation required to confirm is behind auth/403.
2. No other source (Transitland, Mobility Database, community) documents Metro coverage.
3. Signup and terms are unknown.

This is a **gap between two hard facts**: Rejseplanen API (no Metro RT, confirmed) and a plausible-but-unverified path (SIRI-ET, format correct but coverage unknown). The gap cannot be closed without direct contact with Dataudveksleren administrator or a test signup to inspect available datasets.

---

## Tim's two options

### Option A: Investigate SIRI-ET coverage (Dataudveksleren, 2–3 day inquiry)

**Action:** Contact Vejdirektoratet (Danish Road Directorate) or Dataudveksleren administrator to:
1. Confirm whether Metroselskabet (Copenhagen Metro) real-time data is included in Dataudveksleren's SIRI-ET feed.
2. Obtain signup details and commercial-use terms for that feed.
3. Request a test account to verify real-time fields for Metro rows match the S-tog/DSB pattern (i.e., `prognosisType` present).

**Outcome:** If Metro is included and redistribution-allowed, Copenhagen stays in scope with a two-source board (Rejseplanen for S-tog/DSB/Öresundståg static + SIRI-ET for Metro real-time). If not included, falls through to Option B.

**Risk:** Dataudveksleren may require manual approval or charge a fee; timeline uncertain.

---

### Option B: Exclude Metro from v1, ship S-tog + DSB + Öresundståg only (immediate, low risk)

**Action:** Remove Metro M1–M4 from the Copenhagen D1 scope. Adapt `published-network.json` and board-eligibility tables to cover only:
- **S-tog** (A, B, Bx, C, E, H, F): Calls at Nørreport, Nørrebro, København H, Nordhavn. Real-time confirmed via Rejseplanen API 2.0.
- **DSB Regional/InterCity/InterCityLyn/Öresundståg**: Calls at København H and Nørreport. Real-time confirmed.
- Single hub lock: **København H** (three operators, all real-time capable).

**Board eligibility:** All three operators verdicted `in` (walk-up boardable); no changes to verdicts, only stations.

**Live board:** Rejseplanen API 2.0 `departureBoard` (single source, no two-path complexity).

**Outcome:** Immediate flip-ready city, real-time fully functional, lower complexity. Revisit Metro as a post-launch addition once Dataudveksleren path is verified or Metroselskabet publishes its own API.

---

## Recommendation

**Option A (SIRI-ET check)** is the right call **if Tim has contact/capacity** with Danish authorities this week. Metro is fundamental to the city's transport identity, and it's plausible the real-time exists just under a different roof (SIRI-ET vs. Rejseplanen aggregation).

**Option B (S-tog + DSB only)** is the safe path **if you want to ship this week** without inquiry delays. Copenhagen is still a meaningful, real-time-enabled region (three operators, 1000s of daily departures across the Metro footprint); Metro is the flagship line but not the only game. The work to drop Metro is small (filter the network, rewrite one verdicts table), and the city doesn't sit in "planned" limbo — it launches live, with a clear post-launch brief to revisit Metro when the SIRI-ET picture is known.

**My pick: Option A**, because if Metro RT exists and is findable, six months from now when it turns up would be a harder retrofit than a 2–3 day answer now. But I defer to Tim's bandwidth and timeline preferences — either option is solid from a data/integrity perspective.

---

## Sources checked

- [Transitland feed registry](https://www.transit.land/feeds)
- [Mobility Database Rejseplanen feed](https://mobilitydatabase.org/feeds/gtfs/mdb-1292)
- [Rejseplanen Labs API 2.0 documentation](https://labs.rejseplanen.dk/hc/en-us/articles/21554723926557-Om-API-2-0)
- [Rejseplanen SIRI-ET documentation](https://labs.rejseplanen.dk/hc/en-us/articles/25407687677597-Om-SIRI-ET)
- [Dataudveksleren NAP (Danish Road Directorate)](https://semanticgis.dk/Data-Portals/Traffic-and-Mobility-data-(Dataudveksleren))
- [Jim's handoff note: live-board wiring stopped, 20 Sep 2026](docs/copenhagen-d1/jim-handoff.md)
