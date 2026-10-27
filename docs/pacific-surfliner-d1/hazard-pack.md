# Los Angeles — Amtrak Pacific Surfliner hazard pack (H1–H7)

Evidence: oracle clash report `docs/pacific-surfliner-d1/oracle-clash-report.md` (Nico research + Tim approval, 25 Oct 2026); US ledger `docs/united-states-ledger.md` §Los Angeles table (Tim ruling, 25 Oct 2026). Static GTFS `https://content.amtrak.com/content/gtfs/GTFS.zip` opened 25 Oct 2026; route_id 78 (`Pacific Surfliner`), stop_id `LAX` (`Los Angeles`), confirmed via Transitland Onestop f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle. Third-party GTFS-RT `https://asm-backend.transitdocs.com/gtfs/amtrak` (transitdocs, keyless) approved for rider use by Tim, 25 Oct 2026. Amtrak has not given written permission; that is Tim's product decision, recorded in the ledger. Product `lib/cities/los-angeles/` is the primary LA Metro Rail catalog; this pack is the Pacific Surfliner second-operator supplement. No new stations are introduced.

## H1 — parent + child / doNotGroup

D1 has no stop-level IDs in this pack beyond the single mapped stop. Jim will resolve GTFS stop_id `LAX` (stop_name `Los Angeles`) → catalog `Union Station` during wiring.

**doNotGroup — direction group:**

- Pacific Surfliner direction chips form a **separate group** from both LA Metro Rail chips and Metrolink chips on the Union Station board. Do not collapse into "A Line + …", "SB Line + …", or any Metro Rail / Metrolink label. Three direction groups coexist at Union Station: Metro Rail, Metrolink, and Pacific Surfliner. (Source: oracle clash report §v1 mode cut; ledger §LA table)
- **7th St/Metro Ctr** is the Metro Rail hub lock (A × B × D × E). It is **never** a Pacific Surfliner direction chip. Pacific Surfliner does not call at 7th St/Metro Ctr. (Source: oracle clash report §v1 mode cut; Metrolink hazard pack H6)
- **Union Station** is the Pacific Surfliner terminal at the Los Angeles end. Trains whose final stop is `Los Angeles` (stop_id LAX) terminate here and are **not** chips at Union Station. (Source: oracle clash report §Correction, 25 Oct 2026)

**doNotGroup — station scope:**

- `Union Station` (catalog name) maps to GTFS stop_id `LAX`, stop_name `Los Angeles`. These are the same physical station. One catalog entry. (Source: oracle clash report §Stations in Los Angeles catalog)
- **Pomona North is not served by Pacific Surfliner.** Pomona North is a Metrolink SB Line / A Line station. No Surfliner call there; no Surfliner chip at Pomona North. (Source: oracle clash report §Stations in Los Angeles catalog — "Pomona North: Not served by Pacific Surfliner")

## H3 — thin / event / overlay

- **Long-distance Amtrak trains in the same feed are out-reservation.** The transitdocs GTFS-RT feed (`https://asm-backend.transitdocs.com/gtfs/amtrak`) covers all Amtrak and VIA Rail services, not just Pacific Surfliner. Long-distance trains calling at Union Station — Coast Starlight, Southwest Chief, Sunset Limited, Texas Eagle — carry compulsory seat reservations and must not appear on the board. **Filter by route_id 78 to include only Pacific Surfliner departures.** All other route_ids from this feed are out-of-scope for this board. (Source: oracle clash report §Board eligibility; ledger §LA table — "Long-distance trains in that same feed stay `out-reservation`")
- **Seasonal all-reserved days (peak holidays).** The Pacific Surfliner walk-up default is unreserved coach. Amtrak and pacificsurfliner.com note "restrictions may apply on peak travel days when trains are all-reserved." Per board-eligibility rule §6 (optional restriction, not compulsory reservation), the verdict stays `in`; walk-up is the default. The board does not need a special-case for holiday blackouts. (Source: ledger §2 Pacific Surfliner row — "optional restriction, not compulsory reservation")
- **No Surfliner service to any other in-catalog LA station.** The A/B/D Metro Rail stations (7th St/Metro Ctr, Pomona North, etc.) and all other catalog entries are not Surfliner stops. Union Station is the sole LA catalog station on route 78. (Source: oracle clash report §Stations in Los Angeles catalog)

## H4 — branches (doNotGroup candidates)

| node | Pacific Surfliner direction chips | evidence |
| --- | --- | --- |
| **Union Station** | `Pacific Surfliner + San Diego` (22 departures), `Pacific Surfliner + Goleta Amtrak` (6 departures), `Pacific Surfliner + San Luis Obispo` (3 departures). Trains whose final stop is `Los Angeles` (13 inbound) are not chips here. | stop_times join on route_id 78, stop_id LAX; oracle clash report §Correction 25 Oct 2026 |

A trip that terminates at the board station is **not** a direction chip at that station. (Source: oracle clash report §Correction, 25 Oct 2026)

Dropping any of the three departure destinations is a silent board cut.

## H5 — nested short turns

There are no short turns in the standard sense here: every departure from Union Station on route 78 is already represented by one of the three chip destinations (San Diego, Goleta Amtrak, San Luis Obispo). The trip table has no "primary terminus vs. short turn" structure for outbound departures at Union Station — all three destinations are real finals of trips departing that stop.

What looks like a short-turn pattern in the oracle trip table is trains that originate away from Union Station (e.g., Goleta Amtrak → San Diego, San Luis Obispo → San Diego) and call at Union Station en route. Their **final stop** is the chip label, regardless of where the trip started. The three chip labels cover all 31 departing trips.

## H6 — inner city (where §3 lives)

**Pacific Surfliner has no inner-city hub lock in this pack.** Union Station is the single Pacific Surfliner stop in the LA catalog. There is no through-cross shape for Pacific Surfliner within the LA catalog.

Metro Rail hub lock stays **7th St/Metro Ctr** (A × B × D × E). Pacific Surfliner direction chips must never emit "7th St/Metro Ctr" as a destination or token.

Metrolink uses Union Station as its terminal for all six in-catalog lines. Pacific Surfliner shares the same building but is a separate operator and a separate direction group. Do not merge.

## H7 — DST

**America/Los_Angeles observes DST (PDT/PST).** Wall-clock is Pacific local. Do not copy Perth / Brisbane no-DST. (Source: oracle clash report §Feed verification; ledger §LA table; Metrolink hazard pack H7)

## License / live-wire status

**Static GTFS:** `https://content.amtrak.com/content/gtfs/GTFS.zip` — no key required. No explicit open-data license; no license field in feed_info.txt. Amtrak's web terms (updated 2025-03-05) prohibit redistribution without prior written permission. Public availability does not establish a redistributable license.

**GTFS-RT (third-party):** `https://asm-backend.transitdocs.com/gtfs/amtrak` — keyless. Transitdocs (operator: Bridger Cummings, asm-contact@transitdocs.com) publishes this feed without key or registration. No formal downstream-redistribution permission from Amtrak or transitdocs has been obtained. **Tim approved serving this feed to riders on 25 Oct 2026 (Australia/Perth session). That is the operative gate. Amtrak has still not given written permission; this pack records Tim's decision, not a license clearance.** (Source: oracle clash report §Board eligibility; ledger §LA table)

**Do not write provider code. This pack is `planned` in status until Jim wires it.** Feed is approved; provider code is Jim's job.

Known risks (per oracle report §Skip risk — approved, not re-opened):
1. **Unofficial real-time feed.** Transitdocs is a third-party conversion of Amtrak's Track-A-Train endpoint. No Amtrak SLA.
2. **Redistribution terms unconfirmed.** Tim's approval is the operative gate; no written Amtrak permission.
3. **Transitdocs operational dependency.** Volunteer-maintained. No continuity guarantee.
4. **Track-A-Train data staleness.** Derived GTFS-RT inherits upstream quality issues.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| Pacific Surfliner direction group vs LA Metro Rail direction group | Separate groups on the same board — do not collapse |
| Pacific Surfliner direction group vs Metrolink direction group | Separate groups on the same board — three operators coexist at Union Station |
| 7th St/Metro Ctr (Metro hub) vs Union Station (Surfliner stop) | Metro hub is never a Pacific Surfliner direction chip |
| Union Station (catalog) vs GTFS stop_id LAX / stop_name "Los Angeles" | Same station; one catalog entry |
| Pomona North | Not a Pacific Surfliner station — no chip, no board entry |
| Long-distance Amtrak (Coast Starlight, Southwest Chief, Sunset Limited, Texas Eagle) at Union Station | `out-reservation`; same feed, different route_ids; never a board chip. Filter by route_id 78. |
| pacific-surfliner vs los-angeles (Metro Rail pack) | Second-operator supplement — do not overwrite `docs/los-angeles-d1/published-network.json` |
| Other-city hub strings (7th St/Metro Ctr, L.A. Union Station GTFS name, Chicago Loop, Beurs, T-Centralen, Brunnsparken, Centraal Station, Waitematā Station, Metro Center, Rautatientori) | Do not copy |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no provider code, no GTFS-RT key, no Pomona North entry, no new stations, no Metrolink station names copied, no Metrolink line names copied, no LA Metro Rail pack edit.
