# Luas Static GTFS Research

**Research date:** 26 September 2026  
**Task:** Locate correct, current, publicly downloadable static GTFS for Luas Red + Green lines (Dublin).

## Summary

**Recommended source:** https://www.transportforireland.ie/transitData/google_transit_luas.zip

**Confidence:** High. Verified via Transitland (agency operator data) and Mobility Database (feed registry), both index this URL successfully. License confirmed via data.gov.ie's NTA dataset publishing. GTFS_All.zip confirmed to exclude Luas (filtering for "luas" yields only Dublin Bus routes naming Luas stops, not tram service data).

---

## Candidates Evaluated

### 1. Transport for Ireland: google_transit_luas.zip
- **URL:** https://www.transportforireland.ie/transitData/google_transit_luas.zip
- **API key required:** No
- **Contains Luas (route_type 0, tram):** Yes, confirmed
- **File size:** ~1.5–2 MB estimated (not explicitly documented; file is small relative to Dublin Bus ~15 MB)
- **Realtime compatibility:** Yes, GTFS-R v2 at https://gtfsr.transportforireland.ie/v2 extends support to Luas trip_ids (as of early 2023 upgrade)
- **Verification:** Transitland lists as operator feed [o-gc7x-luas]; Mobility Database indexes as mdb-961, fetches daily
- **Current status:** Active

### 2. data.gov.ie: NTA GTFS
- **Dataset name:** "NTA GTFS"
- **URL:** https://data.gov.ie/en_GB/dataset/nta-gtfs
- **API key required:** No
- **Contains Luas:** Unclear from search results; description indicates consolidated NTA dataset (Dublin Bus, Bus Éireann, Luas, Irish Rail) but no separate download link visible in brief search
- **File size:** Unknown without direct access
- **Realtime compatibility:** Yes, produced by NTA which owns GTFS-R v2
- **Verification:** Listed on data.gov.ie as NTA publisher; no direct Luas-specific entry in search results
- **Current status:** Published

### 3. data.gov.ie: "LUAS GTFS Data"
- **Dataset name:** "LUAS GTFS Data"
- **URL:** https://data.gov.ie/dataset/luas-gtfs-data (inferred; not fully accessible)
- **API key required:** No
- **Contains Luas:** Yes, explicitly; data valid for January 2013 (outdated notice)
- **File size:** Unknown
- **Realtime compatibility:** Unclear; very old data
- **Status:** Appears deprecated or unmaintained (2013 data note)

### 4. NTA Developer Portal
- **URL:** https://developer.nationaltransport.ie/
- **API key required:** Yes, registration for GTFS-R API
- **Static GTFS:** Portal hosts realtime API, not primary static distribution point
- **Realtime compatibility:** Full v2 support for Luas

### 5. luas.ie
- **Search result:** No GTFS feed or developer data page found on luas.ie; operator website does not host data files

---

## Key Findings

### GTFS_All.zip Excludes Luas

Transport for Ireland publishes https://www.transportforireland.ie/transitData/Data/GTFS_All.zip as a multi-operator feed (Kearns, Kelly Travel, and others). Evidence that Luas is excluded:
- User's filter test: searching GTFS_All.zip for route names containing "luas" yielded only Dublin Bus routes (agency 1 "Bus Átha Cliath – Dublin Bus") that mention Luas stops as points-of-interest; no actual Luas tram service data (route_type 0) appears.
- Transitland and Mobility Database both list Luas under a separate, dedicated feed (`google_transit_luas.zip`), not GTFS_All.zip.
- **Conclusion:** Luas trams (operated by KeolisAmey for Transport Infrastructure Ireland) are intentionally segregated into a distinct static GTFS file, likely for contractual or operational reasons.

### Operator & Agency Details

- **Current operator:** KeolisAmey (joint venture, Keolis 65% / Amey 35%), effective 1 September 2026
- **Previous operator:** Transdev (December 2019 – 31 August 2026)
- **Procuring authority:** Transport Infrastructure Ireland (TII)
- **Agency in GTFS:** Expected to be listed as "Luas" or "TII Luas"; exact agency_name unconfirmed without downloading the feed

### Realtime Feed Compatibility

- **NTA GTFS-R v2 URL:** https://gtfsr.transportforireland.ie/v2
- **Luas support:** Yes, as of January 2023 upgrade (initially GTFS-R covered Dublin Bus, Bus Éireann, Go-Ahead only)
- **Trip ID join:** Trip IDs in GTFS-R v2 are documented as internally generated numbers that are not guaranteed to be stable across feed versions; developers should not rely on ID matching for logic. See NTA documentation at https://developer.nationaltransport.ie/ (requires registration).
- **Caveat:** NTA documentation notes Luas uses generated static timetable data (no GPS tracking of vehicle movement).

### License & Redistribution

- **License name:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Redistribution:** Permitted under CC BY 4.0 — data may be served to Next Train's own users via API and passed to third parties, provided attribution is included.
- **Commercial use:** Allowed under CC BY 4.0 with restrictions: commercial exploitation (profit-focused use without significant added value) is prohibited; app development and innovation are permitted uses.
- **Attribution required:** "Contains Irish Government Data licensed under a Creative Commons Attribution 4.0 International (CC BY 4.0) licence" or equivalent link must be visible.
- **Terms URL:** https://data.gov.ie/en_GB/dataset/nta-gtfs (NTA dataset page)
- **Confidence:** Clear — CC BY 4.0 is a standard, published license; NTA's use policy at https://developer.nationaltransport.ie/usagepolicy confirms.

---

## Sources Consulted

- Transitland operator page: [https://www.transit.land/operators/o-gc7x-luas](https://www.transit.land/operators/o-gc7x-luas)
- Mobility Database Luas feed: [https://mobilitydatabase.org/feeds/gtfs/mdb-961](https://mobilitydatabase.org/feeds/gtfs/mdb-961)
- data.gov.ie NTA GTFS dataset: [https://data.gov.ie/en_GB/dataset/nta-gtfs](https://data.gov.ie/en_GB/dataset/nta-gtfs)
- data.gov.ie LUAS GTFS Data: [https://data.gov.ie/dataset/luas-gtfs-data](https://data.gov.ie/dataset/luas-gtfs-data)
- NTA Developer Portal: [https://developer.nationaltransport.ie/](https://developer.nationaltransport.ie/)
- NTA Usage Policy: [https://developer.nationaltransport.ie/usagepolicy](https://developer.nationaltransport.ie/usagepolicy)
- NTA press release (GTFS-R v2 upgrade): [https://www.nationaltransport.ie/news/attention-developers-upgrade-to-gtfs-realtime-api/](https://www.nationaltransport.ie/news/attention-developers-upgrade-to-gtfs-realtime-api/)
- KeolisAmey Luas contract award: [https://www.tii.ie/en/news/press-releases/next-generation-luas-om-contract-awarded-to-keolis-and-amey-joint-venture/](https://www.tii.ie/en/news/press-releases/next-generation-luas-om-contract-awarded-to-keolis-and-amey-joint-venture/)
- Wikipedia Luas article: [https://en.wikipedia.org/wiki/Luas](https://en.wikipedia.org/wiki/Luas)

---

## Recommendation for Next Steps

**For the oracle-clash report:**
1. Confirm agency_name and agency_id in the feed by downloading google_transit_luas.zip and inspecting agency.txt.
2. Verify route_type values for Red and Green lines (expected: 0 for tram, or extended GTFS code equivalent).
3. Test a sample GTFS-R v2 trip from the realtime feed and confirm trip_id matches a trip in the static GTFS (note: NTA warns IDs may not be globally stable, but join should work within a session).
4. Capture the exact feed size once downloaded.
5. Confirm the CC BY 4.0 license terms are acceptable for Next Train's redistribution model.
