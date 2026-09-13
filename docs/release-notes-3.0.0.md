# Release notes — 3.0.0 (versionCode 24)

**Date:** 10 September 2026
**Previous release:** 2.5.7 (23)

**Why MAJOR:** `docs/release-versioning.md` reserves a major bump for "public launch, second city,
breaking API". This release is the first two at once — public launch, and the app going from a Perth
app with a handful of extras to a **33-city** departure board across five countries.

---

## Play release notes (short form, for the Console)

```
3.0.0 (24) — 33 cities
- Now covering Australia, the UK, Sweden, Finland and Norway
- Faster, more reliable live boards
- Many fixes to direction and destination accuracy
```

---

## What's in it

### Coverage — 33 live cities

| Country | Cities / regions |
|---|---|
| Australia | Perth, Sydney, Brisbane, Adelaide, Canberra, Gold Coast, Newcastle |
| United Kingdom | 20 regions — London TfL, London & South East National Rail, West Midlands, Greater Manchester, Liverpool City Region, Greater Anglia, West Yorkshire, South Yorkshire, East Midlands, North East, West of England, Southwest, Cumbria, South Wales, Rest of Wales, Glasgow, Edinburgh, Rest of Scotland, Solent, Thames Valley |
| Sweden | Stockholm, Göteborg, Malmö, Uppsala |
| Finland | Helsinki |
| Norway | Oslo |

**Retired in the release-1 scope cut** (`efefad1`): Auckland, Wellington, Amsterdam, Rotterdam,
Vancouver. These were tester-live but did not meet the bar for a public release; the decision and
reasoning are in `docs/feature-backlog.md` FB-67 and the 7 Sep backlog decisions (`ac5a586`).

### Direction and destination accuracy

The bulk of the work since 2.5.7. A rider can only catch a train they can select, so most of these
are "the train was running and you couldn't pick it" defects:

- **London catalog coverage** (#353) — 357 directions added across 80 stations. Acton Town offered
  no Piccadilly option at all despite being a Piccadilly interchange; Farringdon offered one
  direction against thirteen running. Short workings are folded onto their canonical direction
  rather than cluttering the picker.
- **Sydney City Circle** (#354, FB-62) — Macarthur offered **no direction at all**, and
  Campbelltown/Revesby only the outbound option. T2, T3 and T8 now carry a city-bound
  `City Circle` chip.
- **London Overground terminus directions** (#343), **Tube termini** now show arrivals and explain
  rather than saying "No upcoming trains" (#348), **Elizabeth line and Piccadilly Heathrow T4/T5**
  unreachable directions fixed (#351), **trip dedup** dropping and duplicating trains fixed (#350),
  TfL's leading "London " destination prefix stripped (#346), platform-level Tramlink stops deduped
  out of the picker (#344).
- **Göteborg** live-only board with no timetable fallback (`f4de41f`), and missing
  `displayTime`/`scheduledDisplayTime` fixed (`99965ca`).
- Stops with no live feed leave the picker and Near me while staying in the catalog (`643da2d`).

### Reliability

- **Production sweep** (#355, FB-64) — an hourly check across every live city that catches a silent
  outage in a city nobody is looking at. Written after a manual sweep found four cities down that
  every offline gate had passed.
- **GTFS static snapshots** — change-driven refresh plus runtime staleness detection (`b827fbb`).
- **Cold-boot fetch coalescing** (#349) — concurrent `fetchNextTrain()` triggers no longer stack up.
- Upcoming departures raised from 8 to 12 per direction (#345).
- West Midlands Metro 406 fixed by restoring the two-value GTFS-RT Accept header (`4a2abc0`).

### Journeys and routes

- A saved Route is no longer hijacked by another journey's schedule or pin (`e02e5e3`).
- The Time to station slider stays usable through late and missed leave phases (`45a21a0`).

---

## Known issues at ship

- **FB-61** — a small number of stations offer a direction chip the line never serves (London Abbey
  Road, Stockholm Abrahamsberg, Oslo Ammerud). Fix in progress at time of writing.
- **FB-63** — Oslo hub boards fetch a fixed departure window, so a line can be absent from a busy
  stop's board.
- **Newcastle** — the published GTFS snapshot needs republishing with real upstream data.

---

## Upgrade / build notes

Bumped in this release:

| File | Change |
|---|---|
| `android/app/build.gradle` | `versionCode` 23 → 24, `versionName` 2.5.7 → 3.0.0 |
| `package.json` | 2.5.7 → 3.0.0 |
| `public/site-config.json` | `appVersion` 3.0.0, `appVersionCode` 24 |

Run `npm run cap:sync` before the Android release build.

**Note:** `docs/release-versioning.md` lists `public/site-config.example.json` as carrying an
`appVersion` field. It does not, and did not before this release — the table is stale rather than
the file being wrong.

Tag after merge: `v3.0.0`.
