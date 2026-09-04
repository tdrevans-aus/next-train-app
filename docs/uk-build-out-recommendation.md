# UK build-out — where we are, what traini.ac is (and isn't), what to do next

**For:** Tim
**From:** top-level session
**Date:** 4 Sep 2026
**Prompted by:** a Copilot thread proposing traini.ac as the Merseyrail feed for Ellesmere Port
**Related:** `docs/jim-brief-liverpool-merseyrail-via-darwin.md` · `docs/uk-architecture.md` · `docs/country-lane.md` · `docs/expansion-tracker/{cities,countries}.csv`

---

## 1. The Ellesmere Port answer in one line

Merseyrail is already in Darwin. Probed from this repo on 4 Sep 2026 with the token we already hold: Ellesmere Port, Liverpool Central and Moorfields all return live Merseyrail boards with platforms and delay status. The Liverpool pack's "no feed" verdict came from looking for a GTFS-RT endpoint (the tram lens) for what is a National Rail operator. Jim's brief fixes it with a small adapter change. No new feed, no new licence, no new dependency.

## 2. Where the UK stands today

Twenty UK regions are registered in `lib/providers/registry.js`. Ground truth, 4 Sep 2026:

| Status | Regions |
|---|---|
| **Live (5)** | West Midlands, London TfL, East Midlands, West of England, Liverpool City Region |
| **Planned, adapter + D1 pack built, no QA note (15)** | Greater Manchester, London & South East NR, West Yorkshire, South Yorkshire, North East, South Wales, Rest of Wales, Rest of Scotland, Glasgow, Edinburgh, Solent, Thames Valley, Southwest, Cumbria, Greater Anglia |
| **Oracle report only (1)** | Leftover England |

Three things stand out:

1. **The stated blocker on all 15 planned regions is stale.** Every one of their registry `integration` strings says "DARWIN_LDB_TOKEN not set — account-level blocker." The token has existed since 2 Sep. Nothing about Darwin blocks them any more. What actually stands between each of them and a flip is a Mark QA pass. This is a QA backlog, not a feed problem.
2. **The UK country ledger still does not exist.** `docs/united-kingdom-ledger.md` is referenced 42 times across `docs/` and `lib/` as "overdue," and the Countries sheet lists it as required before the next NR region. Twelve NR regions were built after that rule was adopted without it. The Merseyrail mistake is exactly the kind of cross-region fact a ledger's Provider-decision section would have prevented: "Darwin covers every TOC, including concessions such as Merseyrail" is one sentence that would have saved a week of wrong verdicts.
3. **The tram/metro layers are the genuine `out-product` gaps, and they are unrelated to Merseyrail.** West Midlands Metro (TfWM key, FB-48 open), Metrolink, Supertram, NET, Tyne and Wear Metro, Glasgow Subway, Edinburgh Trams are all non-Darwin and each needs its own feed or a schedule-only build. These are the real "second feed" question for the UK. Merseyrail never was.

The working tree currently has an uncommitted change renaming the picker country from "England" to "United Kingdom" and adding the 15 planned regions as Coming Soon rows (`public/city-session.js`, `qa/region-selection.mjs`). That is consistent with everything above and I have not touched it.

## 3. traini.ac — what it is, and its place in our design

**What it is.** A no-auth, CORS-open REST aggregator over Network Rail's TRUST/TD/VSTP feeds and Darwin Push Port, published by an anonymous GitHub org (`trainiac-hq`). Verified 4 Sep 2026: `api.traini.ac/api/departures/ELP` does return a live Merseyrail board. Documented limits: 120 units per minute per client IP (a departures call costs 3), 20 concurrent queries across all clients, 429/503 on breach. Licence text is a bare "© Network Rail and RDG, used under their open data licences." No terms of service, no SLA, no named operator.

**Its place in our design: none in the request path.** Recommendation is to not adopt it, for these reasons in order of weight:

- **It solves a problem we do not have.** The one gap it was proposed for is covered by Darwin, which we already pay nothing for, already have a token for, and already have a hardened adapter and 84-gate QA suite around.
- **The rate limit is per IP, and our server is one IP.** 120 units/min ÷ 3 = 40 departure boards per minute for the whole app across every user in Britain. Darwin gives us ~5M calls per four weeks. traini.ac would be the first thing to fall over at any real user count.
- **Licensing chain.** Network Rail's open data licence permits redistribution, but we would be a downstream of an anonymous redistributor with no terms, no contact, and no agreement with us. The registry already carries "OpenLDBWS/RDM redistribution terms unclear" as an open item on every UK region. Adding a second, murkier chain does not help close the first.
- **Two feeds are two truths.** In the same minute, Darwin showed Ellesmere Port's 07:18 as "→ Liverpool Central" and traini.ac showed it as "→ Chester." Both are defensible readings of a Wirral Line loop working, but a rider sees one board, and we would be choosing between sources per station. That is a correctness surface we would own forever.
- **The advice that led here was wrong on its central fact** ("Merseyrail does not appear in Darwin"). That should lower confidence in the rest of that thread's claims, including "Darwin is incomplete for branch lines," which is not our experience anywhere in the UK build.

**Where it could earn a place later, if at all:** as a QA oracle only. Nico or Mark could cross-check a region's Darwin board against traini.ac's for the same CRS at the same minute, the way we cross-check GTFS against printed maps elsewhere. It never becomes something the app calls. If we ever need what Darwin genuinely does not give us (a timetable window beyond two hours, train positions, TRUST-level movement data), the answer is Network Rail's own open data feeds or Realtime Trains' API under our own account, not an anonymous proxy.

## 4. What to do next, in order

1. **Jim: Merseyrail via Darwin** (`docs/jim-brief-liverpool-merseyrail-via-darwin.md`). Small, unblocks Ellesmere Port for go-live, and discharges the rescope handoff's rewiring check at the same time. Lane lock checked free today.
2. **Mark: re-QA Liverpool City Region** on the 98-station catalog with Merseyrail live. The rescope addendum already demanded this pass; it now has a second reason.
3. **Nico: run the UK country lane and write `docs/united-kingdom-ledger.md`.** Country-scoped brief, not a region. Contents per `docs/country-lane.md`, plus these UK-specific items that are currently scattered or wrong: Darwin covers all TOCs including concessions; the explicit list of non-Darwin layers and their feed status; stop ownership for the known boundary clashes (Walsden WDN/WAD, Tamworth, Peterborough/LNER, Falkirk High and the Glasgow-vs-Edinburgh split, Chester as a Wirral Line terminus in Liverpool's catalog vs Rest of Wales/Cheshire); national verdicts (Eurostar `out-checkin`, Caledonian Sleeper and Night Riviera `out-reservation`, LNER's unreserved-carriage walk-up policy); and the Darwin redistribution-terms answer, resolved once instead of carried as an open item on 20 regions. This should land before any further NR region flips, which is what the standing retrofit rule already says.
4. **One sweep of the 15 planned regions' registry text** to remove the stale "DARWIN_LDB_TOKEN not set" blocker, so the registry stops misdescribing why they are not live. Trivial; can ride with item 1 or the ledger PR.
5. **Mark: QA-and-flip sweep of the planned NR regions**, one at a time, in tester-demand order. Suggested: Greater Manchester, London & South East NR, West Yorkshire, South Yorkshire, North East, then Solent, Thames Valley, Greater Anglia, South Wales, Southwest, Cumbria, Rest of Wales. Scotland (Glasgow, Edinburgh, Rest of Scotland) waits for the ledger to settle the Falkirk High conflict. Each produces a one-line flip PR for you, as now.
6. **Leftover England last**, after Solent and Thames Valley are live, so it is a genuine residual rather than a dump.
7. **Tram/metro layers by demand and key availability**, as a separate track: West Midlands Metro first (key request already open), then Metrolink/Supertram/NET/Tyne and Wear as schedule-only builds or when a feed is confirmed. These are the honest second-feed decisions for the UK.

Darwin quota check for item 5: `docs/uk-architecture.md` and `docs/uk-provider-design.md` both specify a 15–30 s server-side `(crs, filterCrs)` cache as the thing that keeps us under Darwin's 5M calls per four weeks. **It has never been built** — `lib/providers/uk-darwin.js` contains no cache today; every board request is a Darwin call. Five regions are live on that basis. Add it (a small Jim brief) before the flip sweep passes about ten live regions, and before any store-listing push in the UK.
