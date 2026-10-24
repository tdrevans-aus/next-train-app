# Edinburgh Trams hazard pack (H1-H7)

Evidence: `docs/edinburgh-trams-d1/oracle-clash-report.md` (Nico, 24 Oct 2026; Tim approved Option A the same day),
`docs/united-kingdom-ledger.md`, and the live Edinburgh pack `docs/edinburgh-d1/`. The API was not called by this
pack; every real-time statement rests on the controller probe recorded in the report (24 Oct 2026, 08:04 UTC).
No GTFS was fetched. Trams are added to the **existing** live Edinburgh city as a second mode (report section 5),
so cross-mode rows below are within one region and need no ledger boundary ruling.

## H1 - parent + child

- **Tram stops are platform-level in the API.** `GetFilteredStops` (stoptypes `PLT`/`MET`) returns NaPTAN
  `9400ZZED...` codes (Newhaven extension: `9400ZZTWWJ...`) with a platform suffix 1 or 2. So each of the 23 stops
  has up to two API stop ids (one per direction). Whether a parent/station record exists above them is **not
  verified**; Jim collapses the platform pair into one catalog stop and keeps the pair in `stopIds`.
- **Sources for each doNotGroup (all in `published-network.json` `doNotGroup`):**

| Pair | Decision | Source |
|---|---|---|
| Haymarket tram vs NR Haymarket (HYM) | doNotGroup, walk interchange | report section 5; probe shows T50 calls at Haymarket 1 and 2 |
| Edinburgh Gateway tram vs NR Edinburgh Gateway (EGY) | doNotGroup, covered footbridge | report section 5; already in `lib/cities/edinburgh/tram-directions.js` |
| Edinburgh Park Station tram vs NR Edinburgh Park (EDP) | doNotGroup (near-identical names) | report section 5; NR EDP already catalogued 13 Sep 2026 (supersedes the report's "keep out of rail side") |
| Edinburgh Park Central vs Edinburgh Park Station (both tram) | distinct stops, never collapse | report section 4 (two stops, sequence 6 and 7) |

- **No Waverley tram stop.** The official 23-stop list has none. The old `edinburgh-d1` "Edinburgh Waverley Tram
  Stop" and its Waverley-vs-trams doNotGroup are removed (report sections 5 and 8). Princes Street and St Andrew
  Square are walk-from-Waverley notes, not hub-locks.

## H2 - clash surface

The feed itself is the clash: genuine live values exist (countdown seconds at Haymarket 1; Airport 1 pred 08:39 vs
sched 08:37) alongside many nulls and one equal-to-schedule `pred` (Haymarket 2, 08:30). Report section 2.

- Null `departuretime`/`pred` = treat as "no live data" until flip gate G2 says otherwise.
- `pred == sched` = cannot be told from a schedule echo; **not shown as live** until G2 resolves it.
- Policy for the adapter is recorded in `published-network.json` `displayPolicy`. "Live times only, no timetable
  fallback" holds: `sched` is never rendered as a departure.

## H3 - thin / event / overlay

None found. Headway about 7-10 minutes (about six trams per direction per hour). The API query cap
`maxEvents=4` with a 60-minute lookahead truncates this, so a board built on it looks sparser than the line really
is; this is a query choice, not a feed fault (report section 2). Jim should test whether a larger cap is accepted.

## H4 - branches

No branches. T50 is a single point-to-point line, one operator (EDT). Unlike Glasgow Subway it is not a loop. The
only same-name nodes are the cross-mode pairs in H1.

## H5 - nested short turns

None evidenced (no current Gyle Centre, Ingliston or Picardy Place short-workings). The 2022 St Andrew Square
temporary terminus and the York Place terminus were closed-era arrangements. **Unconfirmed**: verify with the API
Service Timetable that every T50 runs end to end before the direction model is locked (flip gate G5).

## H6 - inner city

There is **no tram hub-lock**. Waverley is not served by a tram stop. The Edinburgh inner-city hub-lock stays the
National Rail one (Edinburgh Waverley, EDB) in the live pack, untouched. Trams add a walk-link note only:
Waverley to St Andrew Square / Princes Street. The tram line's inner section reads Haymarket, West End, Princes
Street, St Andrew Square, Picardy Place (west to east). West End and Princes Street are two separate stops; "West
End - Princes Street" is not the official name.

**York Place is closed** (10 Feb 2022; replaced by Picardy Place on 7 Jun 2023). It still answers `StopEvents` with
0 events. It is excluded from the catalog; the adapter must not treat zero events at it, or at any stop, as an
outage on its own.

## H7 - DST and time

Europe/London with DST. The probe read `sched` as **UTC** (a tram scheduled "08:05" was 85 s away at 08:04 UTC,
while the UK was on BST). Hazards:

1. **The DST change is tomorrow (Sun 25 Oct 2026, 02:00 BST to 01:00 GMT).** After that, UTC and local clock time
   are identical until late March 2027, so a second sample taken in that window **cannot** discriminate UTC from
   local. A discriminating sample is only possible during BST. The adapter should therefore parse `sched`/`pred`
   as UTC (per the probe) and convert to Europe/London explicitly, and Mark should confirm the conversion from a
   BST-period sample or a vendor statement (Viv question 4 in the report), not from winter samples.
2. `sched`/`pred` are bare `HH:MM` strings with no date. Handle the midnight rollover (late-evening request, early
   events) and a `pred` that crosses midnight past its `sched`.
3. `departuretime` is a countdown in seconds and does not depend on the zone; prefer it where present.

## Flip gates (in front of Mark's flip, not in front of this pack)

| Gate | What | Owner |
|---|---|---|
| G1 | Tim reads the Trapeze portal terms under his subscription and confirms **in writing** that display in a paid app and onward relay through our server are permitted. No licence text is quoted as operative anywhere in this pack. | Tim |
| G2 | Realtime sampling test: poll every 1-2 min for at least one peak hour at Haymarket 1 and 2, Edinburgh Airport 1, Picardy Place and Newhaven 2. Countdowns fall between polls; events vanish on departure; `pred` moves off `sched` when late; equal-to-schedule values do not persist across a disruption; a known tram matches the zone assumption; compare with a person at a stop or the Lothian app. | Jim / Mark |
| G3 | Provenance: confirm (Viv question 3) the T50 data is the feed behind the Edinburgh Trams / Lothian apps and stop displays. | Viv / Tim |
| G4 | Stop Services check at all 23 stops: no operator other than EDT/T50 calls. Until done, the "no other services call - verified" sentence cannot be written. | Jim |
| G5 | Stop order and end-to-end running confirmed against the API Service/Stop Timetable or the official map. | Jim |
| G6 | All-stations live sweep passes (part of every GTFS-RT flip); rate limit and production-server key use confirmed (Viv questions 5 and 6). | Mark |

Tram stops stay `liveFeed: false` in the catalog until the flip commit; trams enter the picker in the flip commit,
not before (no Coming Soon in picker, 27 Sep 2026).

## Ledger and propagation (not edited here)

`docs/united-kingdom-ledger.md` section 1 table (Edinburgh row), section 4 coverage bullet and the parked-modes
table all say Edinburgh Trams is "no confirmed real-time" / parked. They need updating once the re-scope lands
(controller/Jim's call; outside this lane's write set). Also stale: the DFT BODS "T50 route confirmed" claim
(unreproduced) and the 22-vs-23 stop count in the live catalog (22 tram stops; Edinburgh Park Station missing).

## What I did not do

No API call, no key read or written, no GTFS fetch, no edit to `lib/`, `qa/`, the ledger or the tracker, no
invention of NaPTAN ids or of coordinates for Edinburgh Park Station, no timetable fallback.
