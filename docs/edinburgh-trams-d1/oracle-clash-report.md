# Edinburgh Trams oracle clash report (re-scope)

**Written by:** Nico, research lane · **Date:** 24 Oct 2026
**Brief:** `docs/nico-brief-edinburgh-trams-rescope.md` · **Tracker row:** `docs/expansion-tracker/cities.csv`, "Edinburgh · Trams" (currently Blocked, "TfE real-time API shut")
**Read first:** `docs/united-kingdom-ledger.md`, `docs/edinburgh-d1/` (Edinburgh already live on National Rail, #307), `docs/board-eligibility-rule.md`
**Scope:** research only. No code, no catalog, no tracker edits. The API was not called by me; the controller probe in the brief (24 Oct 2026, 08:04 UTC) is the evidence for every real-time statement below.

---

## 0. Recommendation

Neither stop condition fires. The terms are not public, so I cannot show they forbid use in a paid app, and the API is plausibly the council's own tracker supplier rather than clearly not official. The brief's "terms not public" case is therefore not a stop.

Two options, and my pick:

- **Option A (pick): re-scope to To Do, Luke.** Luke packs the trams from the official 23-stop list and the API probe, and treats two items as gates in front of Mark's flip, not as pack blockers: (1) Tim reads the terms in the Trapeze developer portal under his own subscription and confirms, in writing, that display in a paid app and onward relay are permitted; (2) a realtime sampling test (section 2) passes. Pack work is reversible; the licence only matters at the flip.
- **Option B: keep Blocked, Viv outreach first** to Trapeze / City of Edinburgh Council before any pack work. I don't pick this because the outreach answer is needed at the flip anyway, and holding the pack until a reply arrives adds a round-trip without changing what gets built.

Two corrections to the tracker row before Luke starts: the row says "22 stops" and the official line has **23**; and "TfE real-time API shut" is true of the old Transport for Edinburgh API but stale as a reason, because the council's replacement is the Trapeze-run tracker API that the probe hit.

---

## 1. What the probe establishes (evidence, not re-run)

- Operator `EDT`, service `T50`, fleet `ET2xx`. Tram stops come back from `POST /stops/GetFilteredStops` (stoptypes `PLT`/`MET`) as NaPTAN `9400ZZED…` plus the Newhaven extension `9400ZZTWWJ…`, platform suffix 1 or 2.
- `GET /stops/StopEvents` returns one object (`time`, `atcocode`, `smscode`, `name`, `events[]`), not an array. v1.1 and v1.2 returned identical results.
- Events carry `sched`, `pred` and `departuretime` (a countdown in seconds, or null). Observed:
  - Haymarket 1 (`-> Newhaven`): sched 08:05, `departuretime` 85. Next three events: `departuretime` null.
  - Haymarket 2 (`-> Edinburgh Airport`): 08:09 / 08:19 / 08:30 with `pred` "08:30" / 08:36.
  - Edinburgh Airport 1: 08:10 with `pred` 567 s; 08:37 with `pred` "08:39".
  - Newhaven 1: four events, destination/sched/pred all null.
  - York Place: 0 events.
- Sched times read as UTC: at 08:04 UTC a tram scheduled "08:05" was 85 s away. One sample only.

---

## 2. Real-time quality (question 1)

**What the feed does.** It carries genuine live data for some events: a countdown in seconds (Haymarket 1), and a predicted time that moves off schedule (Airport 1: 08:37 scheduled, 08:39 predicted). Most events are null.

**What null means.** Not defined in any public source I could reach. The most likely reading is "no prediction for this event", not "on time" and not "schedule-only". I cannot confirm the schedule-only reading from the probe. Treat null as "no live data" until the sampling test says otherwise.

**The ambiguous case.** Haymarket 2 at 08:30 has `pred` "08:30", equal to sched. That could be a real on-time prediction or the schedule echoed back. The probe cannot tell them apart. This is the single most important test, because a schedule echo passed off as live would breach "live times only, no timetable fallback".

**Time zone.** The probe reads sched as UTC. That is consistent with one sample. It needs a second sample against a known clock time before the adapter converts to Europe/London.

**Coverage cap.** `maxEvents=4` with a 60-minute lookahead truncates a 7–10 minute headway (about six trams per direction per hour). The cap is a query choice, not a feed fault, but a board built on it will look sparser than the line is.

**Is this the official live source?** Not verified. Two indirect pointers only:
- The council's Edinburgh Travel Tracker API (council news, 13 Sep 2024) is the successor to the closed Transport for Edinburgh Open Data API, and the council says its on-street trackers show real-time information. Trams are not named in that article.
- The Lothian "Bus & Tram" app listing describes real-time tram arrivals, but names no data source.

I could not confirm that the T50 predictions the probe returned are the same data the Edinburgh Trams or Lothian apps display.

**Verdict on "live times only, no timetable fallback".** Passes conditionally, and the adapter has to enforce it:
1. Show a countdown or predicted time only when `departuretime` or a `pred` value is present.
2. Never render `sched` as a departure time.
3. When an event has no live value, drop it from the board, and when a stop has none at all, show "No live predictions for this stop right now" (honest-empty-state rule, 27 Sep 2026). Do not substitute timetable times.
4. Where `pred` equals `sched`, the adapter cannot tell live from echo. Until the sampling test resolves that, the adapter should not present equal-to-schedule predictions as live.

**Sampling test before flip (for Jim or Mark, not run by me).** Poll every 1–2 minutes for at least one peak hour at Haymarket 1 and 2, Edinburgh Airport 1, Picardy Place and Newhaven 2 (the Newhaven 1 nulls need a second platform to compare). Check that: countdowns fall between polls; events disappear as trams depart; `pred` values move off `sched` when trams run late; equal-to-schedule values do not persist across a disruption; and a known tram's arrival matches the time zone assumption. Compare against a person at a stop or the Lothian app. This test also belongs in the all-stations live sweep that every GTFS-RT flip requires.

---

## 3. Terms and licence (question 2)

**Public terms: none found.**
- Trapeze developer portal (`devportal-public.trapezegroupazure.co.uk`): home page only. It says you "need to sign up to acquire keys" to see or use an API. No APIs are named on the public page, and no terms, licence, rate limits, attribution or acceptable-use text appear. The `apim-public.trapezegroupazure.co.uk` gateway in the brief was not fetched.
- Council Travel Tracker site (`edinburghtraveltracker.com`): an "API Keys" navigation label with no linked content. Links only to the council privacy policy and a contact form. No terms, licence or attribution.
- Council news item, 13 Sep 2024 (the Edinburgh Magazine copy was updated 29 Jul 2026): "Integrating open access to Edinburgh Travel Tracker API, developers and third parties will be able to use data from the displays for their own apps and services." It gives no licence, no API launch date, and no operative clause. It says the council will "monitor and fine-tune the service".
- Transport for Edinburgh Open Data API page: "The Transport for Edinburgh Open Data API is closed", pointing to the council Travel Tracker API. No date, no trams, no terms.

**Licence fields** (per `docs/nico-research-sources.md` §2):
- **License name:** none stated publicly. The governing terms are the subscription terms in the Trapeze portal, which Tim accepted and which I could not read.
- **Redistribution / rehosting:** unclear. The council's "for their own apps and services" sentence is the only public signal and is not an operative clause. Relay to our own users through the Next Train API is not stated either way. Third-party onward distribution is not stated.
- **Commercial use:** unclear. The council sentence points toward third-party apps, but says nothing about paid apps.
- **Attribution:** none found for the tracker API. The "Open Government Licence v3.0" attribution I came across belongs to a different council dataset (tramlines mapping) and should not be applied here.
- **Terms URL:** none public. Portal sign-in required.
- **Confidence:** `not found` for the API licence; `unclear` on the commercial and redistribution questions. Do not record "allowed" for anything until Tim has read the portal terms.
- **Keyed feed:** yes (`Ocp-Apim-Subscription-Key`, env var `EDINBURGH_BUSTRACKER_KEY`). The key agreement, not any public licence, governs use. I have not seen, requested or written the key.

**Questions for Viv to put to Trapeze (`ccuk@trapezegroup.com`, the address from the brief; I could not verify it on a public page):**
1. Does the "NRT Open API Edinburgh CEC Bus tracker Open Interface" subscription permit showing predictions to end users in a paid consumer app (iOS and Android)?
2. Does it permit passing the data on to our own users through our server (a relay API), and to third parties? Is onward redistribution of any kind excluded?
3. Is the tram data (operator EDT, service T50) within the subscription's scope, and is it the same feed that powers the Edinburgh Trams and Lothian apps and the stop displays?
4. What does `departuretime: null` mean: no prediction for that event, or scheduled only? What is the time zone of `sched` and `pred` (UTC or local)?
5. What are the rate limits per key, per second and per day, and what is the overage or throttling behaviour?
6. Can the key be used from a hosted production server (rather than a single named application), and does it need IP allow-listing?
7. Is v1.2 the supported version? What notice is given before v1.1 is retired? Is there an SLA or an outage contact?
8. What attribution wording, if any, do City of Edinburgh Council or Edinburgh Trams Ltd require when their data is shown in a third-party app?
9. Who at the council owns the licence decision for commercial reuse, and is Trapeze able to confirm it in writing?

---

## 4. Network and stop order (question 3)

**Official stop list** (23 stops, Airport to Newhaven, from the Edinburgh Trams stop listing as summarised by search; the `edinburghtrams.com/stops` page returned 404 on fetch, so confidence is `medium` until Luke checks the official map):

| # | Stop | Note |
|---|---|---|
| 1 | Edinburgh Airport | terminus |
| 2 | Ingliston Park & Ride | |
| 3 | Gogarburn | |
| 4 | Edinburgh Gateway | beside NR Edinburgh Gateway (see section 5) |
| 5 | Gyle Centre | |
| 6 | Edinburgh Park Central | |
| 7 | Edinburgh Park Station | beside NR Edinburgh Park; NR side unverified |
| 8 | Bankhead | |
| 9 | Saughton | |
| 10 | Balgreen | |
| 11 | Murrayfield Stadium | |
| 12 | Haymarket | tram stop; NR Haymarket is separate |
| 13 | West End | separate stop from Princes Street |
| 14 | Princes Street | |
| 15 | St Andrew Square | |
| 16 | Picardy Place | Newhaven extension |
| 17 | McDonald Road | |
| 18 | Balfour Street | |
| 19 | Foot of the Walk | |
| 20 | The Shore | |
| 21 | Port of Leith | |
| 22 | Ocean Terminal | |
| 23 | Newhaven | terminus |

**Naming checks:**
- "West End – Princes Street" is not the official naming. The list has **West End** and **Princes Street** as two separate stops, both on the line.
- **Picardy Place** is confirmed as the current eastern-centre stop.
- **York Place: closed.** The stop was permanently closed on 10 Feb 2022 (one source says 9 Feb) to make way for the Newhaven extension. Picardy Place replaced it when the extension opened on 7 Jun 2023. The probe's zero events at York Place is therefore a closed stop still present in the API, not a feed fault. Exclude it from the catalog and do not treat it as a live gap.
- **Edinburgh Park** has two tram stops, Park Central and Park Station. The existing pack lists only Park Central.

**Static GTFS: not verified.** The tracker says "no static GTFS", and I could not confirm otherwise:
- Transitland operator page for Edinburgh Trams (`o-gcvw-edinburghtrams`): no feeds listed.
- Transitland DFT Bus Open Data feed `f-bus~dft~gov~uk` (last fetched 18 hours before my check; latest version fetched 22 Oct 2026, not yet imported): the operator list I could read shows about 100 operators and no Edinburgh Trams. The list may be truncated, so this is not proof of absence. It is also not the "T50 route confirmed" that `docs/edinburgh-d1/oracle-clash-report.md` records.
- Mobility Database: the search page does not return results through the fetch tool, so it could not be used.

**Stop order without a static feed.** The official 23-stop list above is the working order. Luke should confirm it against the official map, and against the API's Service Timetable or Stop Timetable operation for the T50 (not tested in this run; the brief lists both as available). Until then, keep the stop order marked unverified.

**Shape.** The T50 is a single line with one operator, so the stop catalog is a single point-to-point line with no branches. No Gyle Centre or Ingliston short-working is evidenced; see section 7.

---

## 5. Fit with live Edinburgh (question 4)

**Recommendation: trams join the existing Edinburgh city as a second mode**, the Dublin Luas or Copenhagen Metro pattern, not a new city. Reasons: Edinburgh is already live with National Rail, the trams are the same city's transport, and the interchanges with rail are real walk links that a rider expects to see in one picker.

**Interchanges:**

- **Haymarket.** The tram stop and NR Haymarket (HYM) are both real and both in play. The existing pack says "Trams: none" at Haymarket. That is wrong: the T50 calls there (probe: Haymarket 1 and 2). Same printed name, different mode: apply the doNotGroup pattern used for same-name pairs elsewhere (e.g. Greater Manchester's Altrincham and Eccles), not a merged board.
- **Edinburgh Gateway.** Tram stop beside NR Edinburgh Gateway (CRS **EGY** per a Wikipedia summary; not verified against a National Rail source). Connected by a covered footbridge. ScotRail serves the NR station. If the NR station enters the catalog, every service calling there owes a board-eligibility verdict; ScotRail is `in` on the Edinburgh record already, but the Gateway calls are not yet recorded.
- **Edinburgh Park.** Tram stops Park Central and Park Station. The NR Edinburgh Park station is not in the Edinburgh catalog and its existence, CRS and service were not verified here. Keep it out of the rail side for v1 unless Tim decides otherwise.
- **Waverley.** **There is no Waverley tram stop on the official list.** The existing `docs/edinburgh-d1/` pack's "Edinburgh Waverley Tram Stop" and its doNotGroup for Waverley-vs-trams are not supported by the stop list. The nearest tram stops are St Andrew Square and Princes Street, reached by a walk from Waverley. So Waverley has no tram hub-lock. Luke should drop the Waverley tram stop and the doNotGroup that depends on it; the walk link is an interchange note, not a board.

**Ledger and region propagation (not edited here; for Luke and Tim):**
- `docs/united-kingdom-ledger.md` §1 table, §4 coverage bullet, and the parked-modes table all describe Edinburgh Trams as "no confirmed real-time" and "parked". Those need updating if the re-scope goes ahead.
- Six regions, including Edinburgh, flag all `mode: metro` stops `liveFeed: false` (ledger propagation log, 7 Sep 2026). The tram stops must be flipped to live when the feed is confirmed, and the picker rule (no Coming Soon in picker, 27 Sep) applies: trams go into the picker in the flip commit, not before.

---

## 6. Board eligibility (question 5)

Per `docs/board-eligibility-rule.md` §3, verdicts are owed for every rail or tram service calling at an in-catalog station.

| Service | Calls at | Walk-up boardable? | Check-in or barrier? | Verdict | Evidence |
|---|---|---|---|---|---|
| **EDT T50 tram** | all 23 stops (Airport to Newhaven) | Yes: contactless tap-on, no reservation | No (tap-on validators only, no check-in) | `in` | Edinburgh Trams accessibility and FAQ pages, as cited in `docs/edinburgh-d1/oracle-clash-report.md`; not re-fetched this run |
| ScotRail at Edinburgh Gateway (EGY) | only if the NR station is catalogued | Yes (ScotRail `in`, as recorded in `docs/edinburgh-d1/`) | No | `in` (carried, not re-verified) | `docs/edinburgh-d1/oracle-clash-report.md` |
| NR Edinburgh Park | not in catalog | not assessed | not assessed | **owed if catalogued** | none |

**Other operators at tram stops:** the probe and the official list show one tram operator (EDT, one line). I have **not** verified this against the API's Stop Services operation, so the sentence "No services other than the in-scope operator call at any in-catalog station — verified" cannot yet be written. Luke or Jim should check Stop Services at the 23 stops before the section is closed.

**No `undecided` rows are needed** for trams. The tram verdict is `in`, conditional on the live-only display policy in section 2, which is a display rule, not a verdict.

---

## 7. Direction model (question 6)

- **Termini:** Edinburgh Airport (west) and Newhaven (east). The API spells the destinations "Newhaven" and "Edinburgh Airport" (probe), so use those strings as the destination match.
- **Short-workings:** none found. I found no evidence of current short-workings to Gyle Centre, Ingliston or Picardy Place. The 2022 temporary terminus at St Andrew Square and the York Place terminus were both closed-era arrangements. Verify with the Service Timetable that every T50 runs end to end before the direction model is locked.
- **Through-stops:** the probe shows trams towards both termini leaving from Haymarket, so Haymarket is a through-stop, not a terminus.
- **Label:** standard line-plus-terminus model, as in `docs/edinburgh-d1/jim-handoff.md` (T50 is point-to-point, not a loop, so Glasgow Subway's loop problem does not apply).

---

## 8. Corrections to the existing Edinburgh pack (for Luke, not edited here)

1. **No Waverley tram stop** on the official list. The "Edinburgh Waverley Tram Stop" entry and the Waverley doNotGroup for trams should be removed (section 5).
2. **Haymarket has a tram stop.** The "Trams: none" cell is wrong.
3. **23 stops, not 22** (the tracker row says 22).
4. **"T50 route confirmed" on the DFT BODS feed** could not be reproduced (section 4). Treat the static-feed claim as unverified until the zip is downloaded and checked for EDT/T50.
5. **Edinburgh Park** has two tram stops; the pack lists one.
6. **Stop order** is marked `stationOrderVerified: false` in the pack and should stay that way until the official map or the API Service Timetable confirms it.

---

## 9. Open risks (ranked)

1. **Terms unseen (flip blocker).** Commercial use in a paid app, onward relay and attribution are not public. This is the gate that matters at flip, and Tim can close it from the portal.
2. **Null and echo semantics.** Null may not mean "no prediction", and `pred` equal to `sched` may be a schedule echo. The sampling test in section 2 must pass before the adapter displays a time as live.
3. **Time zone of sched and pred.** Probe-based and single-sample. A second sample against a known clock is required.
4. **Feed provenance.** Not confirmed that this is the official Edinburgh Trams data, and not confirmed that it covers the tram operator's own live times. The probe does show EDT T50 data.
5. **Static GTFS and stop order.** No verified static tram feed. Stop order comes from a single search-summarised list.
6. **Key and rate limits.** Unknown whether the key may be used from a hosted production server, and what the per-day cap is. Cache policy would follow the Darwin 20 s server cache pattern if permitted.
7. **Stale stop in the API.** York Place still answers with zero events. Excluded from catalog, but the adapter should not treat zero events at a closed stop as an outage.

---

## 10. Sources

- Brief and probe evidence: `docs/nico-brief-edinburgh-trams-rescope.md` (controller probe, 24 Oct 2026)
- Existing Edinburgh pack: `docs/edinburgh-d1/oracle-clash-report.md`, `docs/edinburgh-d1/jim-handoff.md`
- Ledger: `docs/united-kingdom-ledger.md`
- Board eligibility rule: `docs/board-eligibility-rule.md`
- Research sources: `docs/nico-research-sources.md`
- Tracker row: `docs/expansion-tracker/cities.csv`, line 342
- Transitland operator, Edinburgh Trams: <https://www.transit.land/places/United%20Kingdom/Edinburgh> (operator `o-gcvw-edinburghtrams`, no feeds listed)
- Transitland DFT BODS feed: <https://www.transit.land/feeds/f-bus~dft~gov~uk> (page read; no Edinburgh Trams visible in the operator list read)
- Mobility Database: <https://mobilitydatabase.org/> (search not usable from fetch)
- Trapeze developer portal: <https://devportal-public.trapezegroupazure.co.uk/> (sign-in required; no terms public)
- City of Edinburgh Council, Transport trackers news: <https://www.edinburgh.gov.uk/news/article/14063/transport-trackers-are-go-in-edinburgh>
- Edinburgh Travel Tracker: <https://www.edinburghtraveltracker.com/> (no terms; "API Keys" label only)
- Transport for Edinburgh Open Data API (closed): <https://tfe-opendata.readme.io/>
- Edinburgh Magazine, travel trackers (13 Sep 2024; updated 29 Jul 2026): <https://edinburghmagazine.com/new-digital-travel-trackers-go-live-in-edinburgh-real-time-info-at-your-fingertips>
- Edinburgh Trams York Place closure: <https://edinburghtrams.com/news/closure-york-place-stop-marks-tram-project-milestone>; Picardy Place opening per britishtramsonline.co.uk news (search summary)
- Edinburgh Trams stop listing (search summary; `edinburghtrams.com/stops` returned 404): <https://edinburghtrams.com/stop/edinburgh-gateway> and related search results
- Edinburgh Gateway station (CRS EGY, per Wikipedia summary): <https://en.wikipedia.org/wiki/Edinburgh_Gateway_station>
- Lothian Bus & Tram app listing (describes real-time tram times; source not named): <https://apps.apple.com/app/id6468092588>
- Traveline Scotland app listing: <https://apps.apple.com/us/app/id6476774576>
- Bustimes.org Edinburgh Trams operator page: <https://bustimes.org/operators/edinburgh-trams> (returned HTTP 403 on fetch; not used)

**License:** Open items only. Confidence `not found` for the tracker API licence; `unclear` on commercial use and redistribution. No licence or terms text is quoted here as operative, because none was found.
