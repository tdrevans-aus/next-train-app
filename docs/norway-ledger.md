# Norway country ledger

**Written by:** Nico, country-lane full pass · **Date:** 27 Sep 2026
**Spec:** `docs/country-lane.md` · **Trigger:** Trigger 1 (Entur is a genuine national aggregator serving all Norwegian operators) and Trigger 2 (Oslo and Bergen share physical and operational network facts: Flytoget calls both cities, Vy operates long-distance corridors between them)
**Status:** Full pass — Oslo (live since Aug 2026, lib/providers/oslo.js) and Bergen (oracle report only as of 27 Sep 2026; Luke D1 pack next) scoped; cross-region facts recorded once for visibility from both sides.

---

## 1. Provider decision

**Entur as the single shared national feed for both Oslo and Bergen.**

Entur is a genuine national platform, not city-specific. All Norwegian public transport operators contribute to Entur's national GTFS, GTFS-RT, SIRI, and NeTEx feeds. Both Ruter (Oslo T-bane) and Skyss (Bergen Bybanen), along with Vy, Flytoget, Go-Ahead, and SJ Nord, publish data through Entur's infrastructure.

**Decision: build Oslo and Bergen as per-city adapters over the shared Entur provider, NOT as a merged shared-provider config.** Each city has distinct operators (Ruter vs Skyss), distinct station catalogs (T-bane lines 1–5 vs Bybanen lines 1–2), and distinct direction models. A shared-provider config (UK/Darwin pattern) does not justify rework; per-city adapters with independent Entur queries is the right call. However, cross-region verdicts (Vy long-distance, Flytoget) are consolidated here for consistency across both cities' board-eligibility rules.

**Authentication and licensing:**

| Aspect | Details | Evidence URL |
|---|---|---|
| **Feed URL (Timetable)** | Entur GTFS (NeTEx, GTFS, or direct Entur Journey Planner v3 GraphQL) — no key required | https://developer.entur.no/open-data/timetable |
| **Feed URL (Real-time)** | Entur SIRI 2.0 (publish/subscribe, request/response, SIRI Lite) or GTFS-RT (15-second refresh) — no key required | https://developer.entur.no/open-data/realtime |
| **Auth type** | `ET-Client-Name` header (mandatory identifying header, not a secret key; no env var needed). Example: `ET-Client-Name: next-train-app`. Open service; header identifies the client app, confirms operator affiliation | https://developer.entur.no/open-data/timetable and realtime pages |
| **License** | NLOD 2.0 (Norwegian Licence for Open Government Data) — allows copy, modify, redistribute, including commercially, with attribution | https://data.norge.no/nlod/en/2.0 |
| **Commercial use** | Allowed under NLOD 2.0 | |
| **Attribution requirement** | Name Entur and the data source (Ruter for Oslo T-bane; Skyss for Bergen Bybanen; Vy for regional/commuter; Flytoget for airport express; Go-Ahead for Sørlandsbanen). Do not pretend to be any operator. | |
| **Confidence** | `clear` — Entur's developer pages explicitly state NLOD; Oslo and Bergen oracle reports confirm the same license terms | |

**Key API paths (both cities use the same provider):**
- **Journey Planner v3 GraphQL:** POST `https://api.entur.io/journey-planner/v3/graphql` — queries per stopPlace id; returns `estimatedCalls` with operator authority/lineCode filtering (not GTFS datasetId). Oslo adapter confirmed live 30 Aug 2026; Bergen adapter will use the same endpoint, filtered to Skyss operator.
- **SIRI ET / GTFS-RT:** Entur serves both standards per operator `datasetId` query param (RUT=Ruter, SKY=Skyss, VY=Vy, FLY=Flytoget, GAB=Go-Ahead). Regional and commuter operators have their own codespace-ids in the feed.

---

## 2. Stop ownership

**Every shared or boundary station with exactly one home region.** Applying the "first home region wins" rule: a station belongs to the region whose D1 oracle or pack first called it.

Both Oslo and Bergen operate on separate railway/light-rail infrastructure with no shared stations. No boundary stations exist. **Stop ownership is trivial: all T-bane stations belong to Oslo; all Bybanen stations belong to Bergen; national rail services (Vy, Flytoget, Go-Ahead, SJ Nord) are filtered at the adapter level, not the station level.**

| Station | Operator (NSR authority) | Home region | Evidence |
|---|---|---|---|
| **Oslo in-catalog T-bane (101 stations)** | Ruter / Sporveien T-banen (RUT:Authority:RUT) | oslo | docs/oslo-d1/oracle-clash-report.md; Ruter linjekart |
| **Oslo in-catalog shared railway (Jernbanetorget, Nationaltheatret)** | Multiple — Vy regional (VYG:Authority:VY), Flytoget (FLT:Authority:FLT), Vy long-distance (VYG:Authority:VY), Go-Ahead (GAB:Authority:GAB) | oslo | docs/oslo-d1/oracle-clash-report.md Board eligibility table; Entur NSR StopPlace 58366 (Jernbanetorget T-bane) vs 59872 (Oslo S / Vy / Flytoget) |
| **Bergen in-catalog Bybanen (35 stations)** | Skyss / Bybanen (SKY:Authority:SKY) | bergen | docs/bergen-d1/oracle-clash-report.md; Skyss linjekart |
| **Bergen Railway Station (Jernbanetorget, separate from Bybanen)** | Vy (VYG:Authority:VY) only; out of Bergen D1 scope | oslo (shared rail infrastructure, but not in Bergen's station catalog) | docs/bergen-d1/oracle-clash-report.md — explicitly out of v1 |

**NSR (Name/Stop Register) encoding:** Entur's Journey Planner v3 API returns `stopPlace.id` with the NSR prefix (e.g., `NSR:StopPlace:58366` for Jernbanetorget T-bane). Operators are distinguished by `serviceJourney.line.authority.id` in the API response, not by static GTFS `datasetId`. Adapters filter by authority id + transportMode allow-lists, not by stop name collapsing.

---

## 3. National-service board-eligibility verdicts

**Applying `docs/board-eligibility-rule.md` (walk-up tests):** Each rail service calling at an in-catalog station gets a verdict. Test 1: walk-up boardable (no compulsory reservation). Test 2: no check-in barrier.

| Service | Test 1: Compulsory reservation? | Test 2: Check-in barrier? | Verdict | Stations affected | Evidence | Ledger basis |
|---|---|---|---|---|---|---|
| **Vy regional/commuter (RE10, RE11, R12, R13, R14, R21, L1, L2)** | No — optional reservations per [Vy seat reservation policy](https://www.vy.no/en/buy-tickets/train-tickets/seat-reservations-on-regional-trains-in-eastern-norway) | No — Jernbanetorget and Nationaltheatret are public stations with no barriers | `in` | Jernbanetorget, Nationaltheatret (Oslo only) | [Vy seat reservation policy](https://www.vy.no/en/buy-tickets/train-tickets/seat-reservations-on-regional-trains-in-eastern-norway); docs/oslo-d1/oracle-clash-report.md Board eligibility table (Tim's decision 30 Aug 2026) | Vy regional is high-frequency commuter service; same walk-up boarding contract as Öresundståg/Krösatågen in Sweden |
| **Vy long-distance: Bergensbanen (Oslo-Bergen)** | YES — seat reservations are included in the ticket price; [Vy Bergensbanen page](https://www.vy.no/en/train/routes/the-bergen-line) confirms reservations mandatory | No — public station | `out-reservation` | Jernbanetorget (Oslo S) — Bergen Railway Station out of scope for Oslo | [Vy seat reservation policy](https://www.vy.no/en/buy-tickets/train-tickets/seat-reservations-on-regional-trains-in-eastern-norway); [Vy Bergensbanen route page](https://www.vy.no/en/train/routes/the-bergen-line) and community discussion [Oslo to Bergen / reservation](https://community.eurail.com/train-connections-reservations-47/oslo-to-bergen-reservation-1473) confirm "seat reservations included" | Fails test 1: compulsory reservation for specific train; capacity-capped per departure |
| **Vy long-distance: Dovrebanen (Oslo-Trondheim)** | YES — long-distance service with mandatory reservations included in ticket; [Vy Dovrebanen route page](https://www.vy.no/en/train/routes/trondheim-line) and [interrail.com trains Norway guide](https://www.interrail.com/en/plan-your-trip/tips-and-tricks/trains-europe/trains-country/trains-norway) confirm reservation requirements | No — public station | `out-reservation` | Jernbanetorget (Oslo S) only | [Interrail.com trains in Norway](https://www.interrail.com/en/plan-your-trip/tips-and-tricks/trains-europe/trains-country/trains-norway) and [Vy Dovrebanen](https://www.vy.no/en/train/routes/trondheim-line) confirm mandatory reservations on long-distance service | Fails test 1: compulsory reservation for specific train; capacity-capped per departure |
| **Flytoget (FLY1, FLY2)** | No — [Flytoget conditions of carriage](https://flytoget.no/en/terms-and-conditions/conditions-of-carriage/) state reservations are optional | No — Jernbanetorget and Nationaltheatret are public stations with no barriers; customs/border only at Oslo Airport, not at catalog stations | `in` | Jernbanetorget, Nationaltheatret (Oslo only); Lysaker not in in-catalog stations | [Flytoget conditions of carriage](https://flytoget.no/en/terms-and-conditions/conditions-of-carriage/) and [Flytoget route info](https://flytoget.no/en/to-and-from-airport/train-from-oslo-airport-to-city/); docs/oslo-d1/oracle-clash-report.md Board eligibility table (Tim's decision 30 Aug 2026) | Walk-up airport express; high-frequency service; Lysaker outside Oslo's D1 scope |
| **Go-Ahead Sørlandsbanen: Sørtoget (Stavanger-Oslo)** | YES — "seat reservations and three pieces of luggage are always included in the ticket price" per [Go-Ahead FAQ](https://business.edgeofnorway.com/services/bus-and-train-1/train-journeys-on-the-sorlandsbanen-and-jaerbanen); [wikipedia Oslo Central Station](https://en.wikipedia.org/wiki/Oslo_Central_Station) confirms Sørtoget terminates at Oslo S (Jernbanetorget) | No — public station | `out-reservation` | Jernbanetorget (Oslo S terminus) only | [Fjord Norway transport](https://www.fjordnorway.com/en/transport/go-ahead) and [wikipedia Sørland Line](https://en.wikipedia.org/wiki/S%C3%B8rlandet_Line) confirm Go-Ahead operates Sørlandsbanen line; [wikipedia Oslo Central Station](https://en.wikipedia.org/wiki/Oslo_Central_Station) confirms terminus at Jernbanetorget; Go-Ahead Sørtoget/Jærbanen pages state reservations always included | Fails test 1: compulsory reservation for specific train; included in ticket price |
| **SJ Nord (North Norway long-distance: Nordlandsbanen, Dovrebanen north of Trondheim)** | YES — long-distance service with mandatory reservations | No — public stations | `out-scope` | Does NOT call at any in-catalog station: operates North Norway corridors (Oslo-Trondheim-Bodø), not at Oslo T-bane or Bergen Bybanen | [SJ Norge about page](https://www.sj.no/en/about-sj-norge/) and [wikipedia Nordland Line](https://en.wikipedia.org/wiki/Nordland_Line) confirm SJ Nord operates only North Norway routes; no verdict required for in-catalog stations | No in-catalog exposure; no verdict needed |

**Vy Bergensbanen and Arna line at Bergen (cross-region note):**
Bergen's D1 scope is Bybanen only (35 stations). Vy Bergensbanen and Vy Arna line call at Bergen Railway Station (Jernbanetorget), which is NOT in the Bergen catalog. Per the board-eligibility rule, no verdict is required — these services do not call at any Bergen in-catalog station. Bergen's Q&A gate only verifies verdicts for Bybanen (Skyss) at Bybanen stations. **Bergen adapter filtering does not owe a verdict for Vy services; they are out of scope by station-set definition, not by service-level verdict.**

---

## 4. Coverage boundaries

**Where each operator's stop-level data actually exists in Entur.**

| Operator | Entur coverage | In-catalog (v1) | Out of catalog | Note |
|---|---|---|---|---|
| **Ruter (Oslo T-bane)** | Metro system in Oslo metro area; line 1–5 plus future Fornebubanen (unopened). Entur GTFS dataset `RUT`. | Oslo: 101 T-bane stations | Fornebubanen unopened (2029); trikk/bus out of v1 | T-bane is metro-mode only; other modes (tram, bus) published by Ruter but not in v1 |
| **Vy regional/commuter (Eastern Norway)** | High-frequency commuter corridors from Oslo (RE10, RE11, R12, R13, R14, R21, L1, L2). Entur GTFS dataset `VY`. | Oslo: Jernbanetorget, Nationaltheatret only | Lillehammer, Eidsvoll, Kongsberg, Asker, Kongsvinger, Moss, Spikkestad, Lillestrøm, Stabekk, Ski, all Oslo Airport corridor stops beyond the two catalog stations | Scope cut at the station-set level: only Jernbanetorget and Nationaltheatret, not the full regional network |
| **Vy long-distance: Bergensbanen** | Oslo to Bergen (6–7 daily departures, 6.5–7.5 hours). Entur GTFS dataset `VY`. | Oslo: Jernbanetorget (Oslo S) only | All intermediate stops (Lillehammer, Voss, etc.); Bergen Railway Station | Long-distance, compulsory reservations; out-reservation verdict |
| **Vy long-distance: Dovrebanen** | Oslo to Trondheim with night service. Entur GTFS dataset `VY`. | Oslo: Jernbanetorget (Oslo S) only | All intermediate stops; Trondheim | Long-distance, compulsory reservations; out-reservation verdict |
| **Flytoget (Oslo Airport express)** | Oslo Airport to Oslo city centre. Entur GTFS dataset `FLY`. | Oslo: Jernbanetorget, Nationaltheatret | Lysaker, Skøyen, Sandvika, Asker, Stabekk, Oslo Airport Station | Walk-up service; only Jernbanetorget/Nationaltheatret in D1; Lysaker outside scope |
| **Go-Ahead Sørlandsbanen: Sørtoget** | Stavanger to Oslo via Kristiansand, Kongsberg, Drammen (30 stops). Entur GTFS dataset `GAB`. | Oslo: Jernbanetorget (Oslo S) only | All intermediate stops | Long-distance, compulsory reservations; out-reservation verdict |
| **Skyss (Bergen Bybanen)** | Light-rail system in Bergen metro area; line 1–2 with shared city centre section (Byparken–Kaigaten–Nonneseter–Bystasjonen). Entur GTFS dataset `SKY`. | Bergen: 35 Bybanen stations | Buses and regional services outside Bybanen | Light rail only; v1 cut is mode + operator |
| **Trondheim, Stavanger, other Norwegian cities** | Entur covers all; not in pipeline | Out of scope | Out of scope | Defer to future country lanes if these regions are added |

---

## 5. Cross-region discoveries from Oslo

| Finding | Effect on Bergen | Notes |
|---|---|---|
| **Entur Journey Planner v3 is the live boarding API.** GTFS is available but adapters should use Journey Planner's `estimatedCalls` with authority/lineCode filtering for real-time. | Bergen adapter confirmed to use Entur Journey Planner v3 for Bybanen (docs/bergen-d1/oracle-clash-report.md H2). Same endpoint, same API shape — no discoveries needed; both adapters converge on this path. | Live path established by Oslo 30 Aug 2026; Bergen confirms it works for Skyss operator |
| **Flytoget does NOT call at any Bergen in-catalog station.** Flytoget operates only in the Oslo-Airport corridor; Bergen has no airport rail link. | No interaction; no verdict needed for Bergen. | Bergen's Bybanen is entirely separate; Flytoget is an Oslo-specific service |
| **Vy long-distance (Bergensbanen, Dovrebanen) calls at Bergen Railway Station (Jernbanetorget), which is NOT a Bybanen station.** Separate infrastructure, separate operator scope. Bergen D1 scope is Bybanen-only; Vy is out by station-set definition. | Bergen adapter must NOT include Bergen Railway Station (the Vy terminus). No Q&A failure — out-of-scope by design, not by hidden verdict. Board-eligibility rule §1: filter stations in, not trains off silently. Bergen's station-set is Bybanen; Vy's station-set is railway; they don't overlap. | Vy Bergensbanen and Arna line out of Bergen D1 oracle; cross-verified with this ledger |
| **Entur NSR StopPlace ids distinguish operator/infrastructure at shared names.** Jernbanetorget has two distinct NSR ids: 58366 (T-bane metro cluster) vs 59872 (Oslo S / railway cluster, Vy + Flytoget). Adapters must query both and merge results with doNotGroup. | Bergen has only one station cluster per operator (Bybanen = Skyss only). No NSR doubling; simpler case. | Key to understanding why Oslo's Jernbanetorget is `doNotGroup` (three operator sections: T-bane, Vy, Flytoget) and Bergen's Byparken is not (single operator: Skyss) |
| **Entur's authority filter is the right shape for boarding-contract filtering.** Operators are distinguished by `serviceJourney.line.authority.id` (RUT:Authority:RUT, VYG:Authority:VY, FLT:Authority:FLT, SKY:Authority:SKY), not by adapter-level stops or GTFS datasetIds. A single stopPlace can host multiple authorities; adapters must filter by authority + mode to get the right services. | Bergen adapter will filter Skyss (SKY:Authority:SKY) at Bybanen stations; if Bergen later expands to include regional trains, the authority-based filtering already handles operator scope correctly. | Confirmed live by Oslo adapter (30 Aug 2026); same pattern scales to Bergen |

---

## 6. To reconcile (future work)

None at this pass. Both Oslo and Bergen oracles are complete; verdicts are recorded. Ledger is ready for Luke (D1 pack) and Jim (adapter) on both cities.

---

## Tim's rulings (30 Aug 2026)

None additional to what's recorded in the individual oracle reports. Vy regional/commuter `in` verdict at Oslo (30 Aug 2026) is documented in docs/oslo-d1/oracle-clash-report.md and incorporated into this ledger as the cross-region national service fact.

---

## Propagation log

| Date | Finding | Effect |
|---|---|---|
| 30 Aug 2026 | Tim approved Vy regional/commuter `in` verdict at Oslo Jernbanetorget/Nationaltheatret (docs/oslo-d1/oracle-clash-report.md Board eligibility section) — same boarding-contract basis as Öresundståg/Krösatågen in Sweden | No change to existing packs (none existed yet); recorded in this ledger for Bergen's consistency: any future regional rail in Bergen catalog owes the same walk-up verdict |
| 27 Sep 2026 | Nico verified Vy long-distance (Bergensbanen, Dovrebanen) have compulsory reservations included in ticket; Go-Ahead Sørtoget has mandatory reservations. All fail test 1. | Out-reservation verdicts recorded in this ledger; no Oslo adapter change (long-distance out of Oslo's v1 scope by oracle); Bergen adapter unchanged (Bergen Railway Station out of Bergen's v1 scope). Both cities' Q&A gates verify Board eligibility section matches adapter filtering; verdicts are honest, not silent. |

---

## License

- **License name:** Norwegian Licence for Open Government Data (NLOD 2.0), as stated on Entur developer open-data pages (timetable / realtime).
- **Redistribution / rehosting:** NLOD allows copy, modify, and redistribute, including commercially, with attribution. Entur requires an `ET-Client-Name` header on API calls (identify the app, not a secret).
- **Commercial use:** Allowed under NLOD 2.0.
- **Attribution:** Name Entur and the data source operator (Ruter, Skyss, Vy, Flytoget, Go-Ahead per service). Do not pretend to be any operator.
- **Terms URL:** https://developer.entur.no/open-data/timetable and https://developer.entur.no/open-data/realtime (category "National journey planning", License: NLOD); https://data.norge.no/nlod/en/2.0 (NLOD text)
- **Confidence:** `clear` — Entur's developer pages explicitly state NLOD for all open-data feeds; both Oslo and Bergen oracle reports confirm NLOD terms.
- **Keyed feeds:** No secret key. `ET-Client-Name` header is mandatory identification (e.g., `next-train-app`).
