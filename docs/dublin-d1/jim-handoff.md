Dublin D1 + research pack. City stays **planned** until Jim wires testers live. All other cities' live-gates untouched — this pack only writes inside `docs/dublin-d1/`. **assertCityLive("dublin") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip dublin live from this pack. Do not invent city=dub, city=ie, or merge into a national multi-city Irish feed.

Drop later (Jim D2): `qa/fixtures/dublin/published-network.json`. Research pack is `docs/dublin-d1/`: `published-network.json`, `oracle-clash-report.md`, `hazard-pack.md`, `direction-model-memo.md`, `jim-handoff.md` (this file).

D1 = official **Luas Network Map** PNG (DatoCMS asset 225949/1784119177, linked from https://www.luas.ie/luas-map/), hand-transcribed from the rendered image by this pack — the oracle report explicitly deferred station-array transcription to this step. **Not generated from GTFS.** Do not use GTFS to build stations[].

**Static GTFS source corrected 26 Sep 2026** (`docs/jim-brief-dublin-luas-source-fix.md`,
`docs/dublin-d1/luas-static-source.md`): the NTA's national `GTFS_All.zip` does **not** contain
Luas — filtering it for "luas" only matches Dublin Bus routes that name Luas stops as points of
interest, not actual tram service (route_type 0). Luas's real static feed is the dedicated
`https://www.transportforireland.ie/transitData/Data/GTFS_LUAS.zip` (no key, verified via
Transitland and the Mobility Database). `scripts/trim-dublin-gtfs.mjs` now points at this URL
(overridable via `DUBLIN_GTFS_URL`) and keeps its tram routes (route_type 0 or 900) directly
rather than filtering by name, since the source feed should already be Luas-only.
`qa/verify-dublin-gtfs-snapshot.mjs` fails the publish if the result ever holds more than 4
routes or any non-tram route_type. **License:** CC BY 4.0 — "Contains Irish Government Data
licensed under a Creative Commons Attribution 4.0 International (CC BY 4.0) licence." Attribution
is required wherever this data is served; no UI copy has been added for this in this pack.

Two colour lines, no printed route numbers: **Red** — two southwestern branches forking at **Belgard** (Saggart via Fettercairn/Cheeverstown/Citywest Campus/Fortunestown, 29 stops end-to-end; Tallaght via Cookstown/Hospital, 27 stops end-to-end; 24-stop common trunk east to The Point) — **32 unique stops total**. **Green** — Broombridge to Brides Glen, **35 unique stops**, including a **one-way city-centre loop** between Parnell and Trinity. **67 unique Luas stops total** across both lines.

Hub lock **Abbey Street** (Red trunk, between Jervis and Busáras; confirmed by dot position on the map). Not Connolly (Red only, DART interchange, no Green access). Green interchange (Marlborough / O'Connell - GPO / O'Connell Upper) is a **~200 m walk**, not a shared platform.

**Sharpest hazard in this pack — read before D5:** the Green Line's Parnell↔Trinity loop is direction-exclusive, not a simple branch. `O'Connell - GPO` and `O'Connell Upper` are served **northbound only** (towards Broombridge); `Marlborough` is served **southbound only** (towards Brides Glen). If the product's station/board model assumes every stop has both directions, these three stops will need a design decision, not a default — flagged as an open §3 question for Tim in `direction-model-memo.md`. Full detail and evidence in `hazard-pack.md` H4a and the `cityCentreLoop` object in `published-network.json`.

**Second hazard:** the oracle report's Red Line terminus claim ("Terminates Malahide or Howth") is **factually wrong** — those are DART termini, not Luas. Not carried into this pack's files; flagged in `hazard-pack.md` "What the oracle report didn't have" in case it resurfaces when DART (v2) is picked up.

**Third hazard:** the oracle report's DST claim ("no daylight saving observed since 2024") is unverified and likely wrong — Ireland's clock-change abolition proposal stalled at EU level and was never enacted. Recommend Jim use the IANA identifier `Europe/Dublin` directly (tzdata handles the real rule) rather than any hand-rolled fixed-offset table. See `hazard-pack.md` H7.

C2/C3: (1) Separate city dublin, agency Luas (Keolis/NTA). Do not invent city=dub/ie. (2) Lock Abbey Street. (3) Luas Red+Green only — no DART (v2), no bus (out of mode), no premetro. (4) doNotGroup Abbey Street vs Marlborough/O'Connell-GPO/O'Connell Upper; O'Connell-GPO vs O'Connell Upper; Tallaght vs Saggart; Red Cow vs Kingswood vs Belgard. (5) No printed route numbers — colour-only branding, gtfsRouteIdsIfKnown left empty for Jim to verify against the real NTA feed in D2, do not invent.

**Live boards: NTA GTFS-RT v2 keyed later — not a D1 blocker.** Portal https://developer.nationaltransport.ie/. Header `x-api-key`. This pack made no keyed calls and did not paste a key. D1 stays planned. assertCityLive("dublin") must fail.

§3 rec: colour + terminus (`Red + Tallaght`, `Red + Saggart`, `Green + Broombridge`, `Green + Brides Glen`). Abbey Street is a hub stop string, never a direction token. Hold D5 on the Parnell/Trinity direction-exclusive question above. Jim owns D2–D6. When Jim wires, testers can pick city id **dublin**. Do not flip from this pack — that's Jim/Mark's job once QA is green.

## Publishing the Luas GTFS static snapshot (added, docs/jim-brief-dublin-blob-publish-action.md)

`lib/providers/dublin.js` reads its static Luas-only GTFS from
`gtfsFixtureBlobUrl("dublin")` (the shared next-train-gtfs Vercel Blob store), and that path has
never been published — publishing needs `BLOB_READ_WRITE_TOKEN` (network access to Vercel Blob)
and Claude sandboxes have neither. A one-click GitHub Action now does it instead:
`.github/workflows/publish-gtfs-snapshot.yml`.

**Two GitHub repo secrets Tim must add** (Settings → Secrets and variables → Actions → New
repository secret), copied from the same-named Vercel project env vars:

- `BLOB_READ_WRITE_TOKEN` — required. Without it the workflow fails immediately with a clear
  "secret not set" error rather than a cryptic upload failure.
- `NTA_API_KEY` — not required for this workflow (Dublin's static `GTFS_LUAS.zip`
  download from transportforireland.ie needs no key; only the *realtime* NTA GTFS-RT v2 feed
  does). Wired into the workflow's env anyway in case a future trim step needs it. Safe to add
  or skip.

**To publish (one click):** GitHub → Actions tab → "Publish GTFS snapshot" workflow → "Run
workflow" → `city: dublin` → Run. It runs `scripts/trim-dublin-gtfs.mjs` (dedicated Luas GTFS
feed, trimmed to a small local fixture), publishes the trimmed zip via
`scripts/publish-gtfs-fixture-to-blob.mjs dublin`, then runs
`qa/verify-dublin-gtfs-snapshot.mjs` (a standalone check — `qa/gtfs-live-blob-snapshot-integrity.mjs`
only covers `status: "live"` cities, and Dublin stays `planned`) to confirm the published blob is
a real, non-empty snapshot whose `stops.txt` actually contains Luas stops. The workflow is
`workflow_dispatch`-only — it never runs on a schedule or on push, and has no effect until someone
runs it from the Actions tab.

Once published, `gtfsFixtureBlobUrl("dublin")` resolves to real data and Dublin's D2 static-data
dependency is unblocked, ahead of (not instead of) the separate live-flip QA gate.

## Realtime/static trip_id join check (added 26 Sep 2026)

Mark's offline QA note (`mark/dublin-qa-note`) flagged one thing it couldn't prove: whether NTA
GTFS-RT v2 TripUpdates `trip_id`s actually join to the published Luas snapshot's `trip_id`s. If
they don't, the live board comes back empty even though everything else is wired correctly.
Sandboxes can't reach NTA or the blob store to check this directly (`NTA_API_KEY` exists only in
Vercel and, since 26 Sep 2026, as a GitHub Actions secret) — see
`docs/jim-brief-dublin-rt-join-check.md`.

`qa/dublin-rt-join-check.mjs` closes that gap: it fetches the published snapshot
(`lib/providers/dublin.js`'s `loadDublinStatic()`) and the live NTA TripUpdates feed (same URL,
`ntaAuthHeaders`/`readNtaApiKey` from `lib/providers/gtfs/auth.js`, and `fetchTripUpdates` +
`indexTripUpdates` from `lib/providers/gtfs/realtime.js` — no reimplemented fetch/decode logic),
and reports:

- total TripUpdates in the feed;
- how many of those are countable as Luas specifically — trip descriptors carry `route_id`, and
  the published snapshot's route_ids are Luas-only, so a match is tellable; if no TripUpdate in
  the feed carries a `route_id` at all, it falls back to counting over *all* TripUpdates and says
  so explicitly, since NTA's feed spans every Irish operator and untellable-route counting would
  otherwise be meaningless;
- how many of the countable pool resolve against the snapshot's `trips.txt`, and the resulting
  share;
- 5 sample matched and 5 sample unmatched `trip_id`s, for manual inspection.

It fails (non-zero exit) if the resolved share is below
`STALE_RESOLVED_SHARE_THRESHOLD` (`lib/providers/gtfs/board.js`, currently 0.5) once the countable
pool is at least `STALE_MIN_JUDGABLE_TRIP_UPDATES` (currently 20) — the same thresholds
`buildBoardForStops`'s runtime staleness check uses, so a red run here means the live board would
genuinely come back empty or near-empty against the currently published snapshot.

With no `NTA_API_KEY` set, it exits 0 and prints `skipped: no key` — safe in a local smoke run.
It is **not** registered in `qa/run-all.mjs` (it needs real network + a real key neither sandboxes
nor the default CI job have); instead it's wired into
`.github/workflows/publish-gtfs-snapshot.yml`, added as a step after the existing
`verify-dublin-gtfs-snapshot.mjs` check, for `city: dublin` runs, using the `NTA_API_KEY` GitHub
Actions secret. That workflow also gained a `check_only` boolean input (default `false`): set it
to skip the trim + publish steps and just re-run the verify + join-check steps against whatever is
already published — useful to re-prove the join after Vercel Blob has been touched, or on demand,
without republishing.

This check does not flip Dublin live and does not change `lib/providers/dublin.js`'s behaviour —
it only tells us, from CI, whether the join Mark's offline QA couldn't reach actually resolves.

## Connolly real-time gap — resolved as branch B (filtered), 27 Sep 2026

`docs/jim-brief-dublin-connolly-realtime-gap.md`, off Mark's `mark/dublin-flip-3` RED note
(`fetchStationBoard("Connolly")` returns 0 trips on every poll while all 66 other stations are
non-empty). Investigated live during Dublin Sunday daytime service (Luas running,
~08:45-08:57 Europe/Dublin, `NTA_API_KEY` real key, `.env.local`), across three separate polls of
the full `api.nationaltransport.ie/gtfsr/v2/TripUpdates` feed (~1,300-1,400 entities,
~9,000+ stopTimeUpdates each):

- Both Connolly stop_ids (`8220GA00423`/`8220GA00424`, from the published snapshot's `stops.txt`)
  never appeared in any stopTimeUpdate, in any poll. A direct trip-level check (live-confirmed
  trip `5858_2528`, static sequence `… George's Dock → Connolly → Busáras …`) showed the live
  array skipping straight from George's Dock to Busáras — Connolly's slot is simply absent, not
  aliased under a different id (both neighbours resolve correctly under their own ids).
- Ruled out "RT omits terminal stops" (Connolly is common-trunk, never a Red terminus) and
  ordinary single-poll noise (every *other* stop that showed 0 coverage in a given poll was one
  direction of a same-name pair, with the paired id covered in the same poll — Connolly is the
  only stop where both ids were absent every time).
- Did not find a specific NTA developer-portal known-issue notice naming Connolly (no web-fetch
  tool available in this session to search developer.nationaltransport.ie directly) — the
  evidence above is decisive on its own regardless.
- **Branch A (alias fix) ruled out** — this is a genuine, permanent feed gap (branch B), not a
  resolvable-by-aliasing id mismatch.

**Applied branch B**, per `docs/board-eligibility-rule.md`: removed Connolly from
`lib/cities/dublin/stations.json` (67 → 66 stations, Red 32 → 31), added a `notCovered` entry +
rider copy to `lib/cities/dublin/coverage.json` ("Connolly Luas stop — no real-time data from the
NTA feed; use Busáras"), appended dated Corrections to `hazard-pack.md` (H4) and
`oracle-clash-report.md` (Board eligibility, new `out-feed` verdict row) — existing lines
untouched. Connolly is never a Red terminus (termini are Saggart/Tallaght/The Point,
`published-network.json`), so there was no "trip terminating at Connolly" chip to preserve on
upstream boards. Updated `qa/dublin-dogfood-gate.mjs` (66 stations, 31 Red, asserts Connolly is
absent from the catalog/dogfood list and present in `coverage.json`'s `notCovered`) and added
`qa/dublin-all-stations-live-sweep.mjs` (all 66 catalog stations return >= 1 trip in one sweep
during live service; skips gracefully with no key or outside service hours; one bounded retry,
past the 20s TripUpdates cache TTL, for a station empty on the first poll, since a low-frequency
terminus can legitimately have no imminent stopTimeUpdate pushed yet — confirmed live this
session with Brides Glen, which went empty → non-empty across two polls ~2 minutes apart with no
code change, a materially different shape from Connolly's permanent, every-poll, every-trip
zero). Full live sweep result: 66/66 stations >= 1 trip (122 trips total in the passing poll).
Dublin stays `status: "planned"` — this is not a flip.

**Separate issue noticed, not fixed here (out of this brief's scope):** while investigating
Brides Glen's transient empty poll, one live trip (`5858_1372` at Brides Glen) came back with
`liveDeparture: "1970-01-01T00:00:00.000Z"` (`displayTime: "01:00"`) instead of a real time, while
`scheduledDeparture`/`scheduledDisplayTime` were correct (`09:15`). This looks like
`lib/providers/gtfs/realtime.js`'s `indexTripUpdates()`/`lib/providers/gtfs/board.js`'s
`collectTripsForServiceDay()` treating a decoded protobuf `departure.time` of `0` (a plausible
default value for an unset int64 field, not truly absent) as `!= null` and using it as a real
Unix timestamp, rather than falling back to `delaySec`. Not Dublin-specific — any adapter reading
`rtStop.departureSec` the same way could hit this whenever a real feed sends a delay-only
stopTimeUpdate with no absolute time. Did not investigate or fix further (shared `gtfs/` code,
outside this brief's Connolly scope) — flagging for a dedicated brief.

## Flip follow-through (Jim, 27 Sep 2026) — appended, not rewritten

Closed every gap in `docs/dublin-d1/mark-qa-note.md`'s RED verdict. Dublin stays
`status: "planned"` — this is not a flip.

**Station coordinates.** All 67 catalog stations in `lib/cities/dublin/stations.json` now carry
real `lat`/`lng`, sourced by name-matching against the published NTA GTFS snapshot's `stops.txt`
(`gtfs/dublin.zip`, same blob `qa/verify-dublin-gtfs-snapshot.mjs` checks). **Every one of the 67
matched** — the GTFS snapshot's 128 stop rows collapse to exactly 67 distinct `stop_name` values, a
1:1 match against the catalog once these printed-name differences are accounted for (GTFS uses a
more abbreviated form than the catalog's full printed name in 7 cases): `Abbey St.` (catalog
`Abbey Street`), `Citywest` (`Citywest Campus`), `Broadstone` (`Broadstone - University`), `Mayor
Square` (`Mayor Square - NCI`), `O'Connell Upr.` (`O'Connell Upper`), `Leopardstown`
(`Leopardstown Valley`), `Ballyogan` (`Ballyogan Wood`). No station required a guessed coordinate
and none is exempted the way Chicago's State/Lake was.

**Real bug found and fixed while sourcing those coordinates.** `lib/providers/dublin.js`'s
`resolveStopIds()` only ever tried a station's canonical catalog `name` against the published
static snapshot, never its `aliases` — so every one of the 7 abbreviated-name stations above threw
`Unknown Dublin station` against the real feed, including **Abbey Street, one of this brief's own
three required check stations**. Two of the seven (`Broadstone - University`/`Mayor Square - NCI`)
already carried a matching alias in the catalog and still failed, proving the alias fallback
genuinely didn't exist rather than just being incomplete. Fixed by trying each catalog alias in
turn after the canonical name misses, and added the missing alias for the other 5 stations
(`Abbey St.`, `Citywest`, `O'Connell Upr.`, `Leopardstown`, `Ballyogan`). Confirmed against the
real feed post-fix: `node scripts/write-city-directions.mjs --only=dublin` no longer logs any
`Unknown Dublin station` warning for any of the 67 (down from 7), and `fetchStationBoard` resolves
Abbey Street/Tallaght/Sandyford directly (see PR description for the live evidence).

**Live-service-hours caveat.** This session's live verification ran at 01:29 Europe/Dublin
(2026-09-27), after last trams (~00:30) — every real-feed sample above returned a well-formed
empty board (`trips: [], realtime: true, nextServiceDate: "2026-09-28"`), not an error. The RT
fetch itself succeeded (173 TripUpdates entities, ~1.9s). Re-running during Dublin daytime service
hours would be the way to see actual non-empty per-direction trip counts; that's Mark's to redo
against this branch same as his RED note flagged for the RT-join sample size.

## Red Cow intermittent empty board — investigated, classified 2b (feed behaviour), NOT fixed (27 Sep 2026)

Brief: docs/jim-brief-dublin-red-cow-intermittent-gap.md. Mark's RED note on mark/dublin-flip-4
(docs/dublin-d1/mark-qa-note.md) found Red Cow's board empty while all 65 other stations had
trips, reproduced 4 times, and distinguished it from the permanent Connolly gap (#478) because Red
Cow works sometimes.

### Method

Foreground polling loop (scratch-poll-red-cow.mjs, not committed — scratch), no background
process, run to completion in two blocking batches (15 + 15 iterations, ~33s apart on average
including fetch time, well past the 20s TripUpdates cache TTL): Red Cow plus two controls
(Kingswood, Kylemore — the Red-trunk neighbours either side, per the brief). One live NTA
GTFS-RT v2 TripUpdates fetch per poll, shared across all three stations. Per poll, per station:
resolved static stop_ids (via the same resolveCatalogEntry + findRailStopIdsForName path
lib/providers/dublin.js uses), how many realtime stopTimeUpdates named each stop_id, static
stop_times.txt row count at those ids, and fetchStationBoard()'s resulting board size. Total run:
31 polls (poll 0 + batches of 15+15) spanning 08:35:43-08:52:23 UTC (~09:35-09:52 Europe/Dublin,
Sunday, Luas running) — a bit over 15 minutes end to end, well past the 20s cache window on every
single poll.

### Confirmed the stop_id resolution is correct (rules out the 2a alias-fold hypothesis)

Red Cow resolves to 8230GA00353/8230GA00354. Cross-checked directly against the static stops.txt
rows: both stop_ids have stop_name: "Red Cow", no parent_station. This is exact name matching, not
a fuzzy/alias hit — Red Cow has no aliases in the catalog and none are needed. Kingswood ->
8230GA00350/8230GA00351 (stop_name: "Kingswood"), Kylemore -> 8220GA00356/8220GA00357, both
likewise confirmed correct. No id in the 8230GA0035x block is ambiguous between stations. Static
stop_times.txt row counts for Red Cow (1261) are in the same order of magnitude as Kingswood
(1298) and Kylemore (1261) — Red Cow is scheduled exactly as often as its neighbours; this is not
a horizon/nextServiceDate issue either (all three had staticRows > 1000 throughout, i.e. plenty of
scheduled trips inside the 180-minute board horizon at every single poll).

### Poll table (summary; full 31-poll log kept in scratch, not committed)

| Poll range | Time (UTC) | Red Cow rtHits (353,354) | Red Cow board | Kingswood board | Kylemore board |
|---|---|---|---|---|---|
| 0-8 (9 polls, ~08:35:43-08:40:36, ~5 min) | | (0,0) every poll | 0 (empty) every poll | 3 every poll | 1 every poll |
| 9-29 (21 polls, ~08:41:09-08:51:48, ~10.5 min) | | (1,0) every poll | 1 every poll | 3 every poll | 1 every poll |
| 30 (final, 08:52:21) | | (0,0) | 0 (empty) | 3 | 0 (empty) |

Kingswood (control) never once had an empty board across all 31 polls, and never went below 3
trips. Kylemore (control) was non-empty for 30/31 polls, then also went empty at poll 30 — the
same instant Red Cow did, while Kingswood was unaffected. For every empty-board poll, the raw
TripUpdates snapshot (scratch-snapshots/poll-N-<Station>.json) shows matchingEntities: [] —
literally no entity in the ~1650-1800-entity feed carried a stopTimeUpdate naming that station's
stop_ids at that instant, not even one with schedule_relationship SKIPPED/NO_DATA that our
indexTripUpdates() was silently mishandling. Entity counts stayed in the normal 1644-1801 range
throughout (no truncated-fetch signature, no HTTP anomaly) — feed size didn't correlate with the
gap.

### Classification: 2b — feed behaviour, not our code

- Not 2a (adapter/helper bug). Stop_id resolution is exactly right (verified against stops.txt by
  name, not by our own fuzzy match); horizon/static-schedule counts are normal and in line with
  the two controls; indexTripUpdates() correctly finds zero matching entities because there
  genuinely are zero in the raw feed at those polls, not because it's dropping SKIPPED/NO_DATA
  rows it shouldn't (there were no such rows to drop — the stop simply isn't mentioned by any
  trip's stopTimeUpdate array); no cache/truncation artifact (entity counts normal, fetches >=30s
  apart, past the 20s TTL every time).
- Not 2c (real-world gap/diversion). Kingswood, immediately adjacent on the same Red trunk, had a
  stable 3-trip board on literally every poll across the full 15+ minutes — the Red Line was
  running normally throughout. Red Cow itself got a real hit on stop 353 for 21 straight polls
  (9-29) before reverting to empty at poll 30, and Kylemore — a different station entirely — also
  went empty at that exact same poll while Kingswood didn't. A genuine service gap/diversion
  doesn't explain two different, non-adjacent-in-time stations going empty at the same single
  poll while a third stays fully served throughout.
- 2b (feed behaviour) fits the evidence: NTA's TripUpdates feed intermittently omits a given
  stop's stopTimeUpdate row for some trips passing through it, for periods of several minutes at a
  time, independent of whether the line is actually running there (Kingswood being the outlier
  that never dropped out in this 15-minute window doesn't mean it never does — Connolly's PR #478
  precedent already showed this feed's per-stop coverage is uneven station to station). This
  matches the brief's suspected mechanism: the feed likely carries a limited look-ahead window of
  stopTimeUpdate rows per trip, and which stops fall inside that window shifts poll to poll.

### Options for Tim (per the brief; no product change made, no PR opened)

1. Make the empty state honest. When a catalog station's board is empty but the static schedule
   says service should be running (nextServiceDate resolves to today, i.e. this isn't an
   overnight/pre-service gap), show "No live Luas predictions for this stop right now" instead of
   a blank board indistinguishable from "nothing scheduled." Rider-facing copy/UX change ->
   tim-review: yes per the bug-fix lane. Recommended — this is genuinely intermittent (Red Cow
   flipped from empty to 1-trip to empty again inside 17 minutes), so filtering it out like
   Connolly would be wrong (a permanently-absent station is a different problem from a station
   that is intermittently under-reported by the feed but is definitely served), and holding all of
   Dublin for this is disproportionate to a feed artifact that self-resolves within single-digit
   minutes and doesn't stop other stations from displaying correctly.
2. Filter Red Cow out like Connolly. Wrong per the brief's own steer and this evidence: Red Cow
   got a real, correctly-attributed live trip in 21 of 31 polls — removing an in-scope Red trunk
   stop because of a transient reporting gap would make the catalog materially less useful for
   exactly the riders most likely to want it (Red Cow is a trunk stop every westbound Red tram
   calls at, not a low-frequency terminus).
3. Hold Dublin until NTA confirms coverage. Disproportionate for a self-resolving,
   station-varying feed characteristic that (per Connolly's earlier finding and this one) appears
   to be a normal property of this feed rather than a fixable defect on NTA's side to "confirm" —
   there's no reason to expect a support ticket would change the feed's look-ahead window
   behaviour, and this would stall the whole city over something option 1 handles honestly.

Recommendation: option 1. It's a UX/copy change (not silently dropping a real station), it matches
the walk-up board-eligibility rule in spirit (the station stays in-catalog and shown, just with an
honest "nothing live right now" state instead of an indistinguishable blank), and it generalises
past Red Cow to any station this feed characteristic affects next — which per the poll-30
Kylemore result could be any of them, not just Red Cow.

No code changed as a result of this investigation (per the brief: 2b/2c means report, don't fix).
Status stays planned. No PR opened.

## Saggart filtered (permanent, out-feed); Rialto confirmed intermittent, kept in (27 Sep 2026)

Brief: docs/jim-brief-dublin-saggart-rialto-gaps.md, off Mark's QA of PR #481.

**Alias check (done first, per the brief).** Fetched one live NTA GTFS-RT v2 TripUpdates snapshot
(2,148 entities, Sunday ~13:54 Europe/Dublin, Luas running) alongside the published static snapshot.
Joined each entity's `trip.tripId` to the static `trips.txt` → `routes.txt` to classify 29 trips as
Red via `classifyLuasLineId`, then collected every stop_id named in those trips' `stopTimeUpdate`
arrays: 53 distinct stop_ids, **all 53 present in the static snapshot's `stops.txt`** — zero RT-only
Red stop_ids found outside the static snapshot. Result: **no mapping/alias problem** — nothing to fix
in the trim/alias layer; Saggart's and Rialto's static stop_ids are simply never (Saggart) or rarely
(Rialto) named in a live `stopTimeUpdate`, not present under some other unmapped id.

**Saggart** — confirmed PERMANENT, same Connolly shape. Mark's QA already found 20/20 polls empty
over 15 min (45s apart) while Fortunestown/Citywest Campus (same branch, same headway) carried 2-6
trips every poll. Corroborated independently this session: foreground 6-poll/45s loop, same three
stations, Sunday ~13:04-13:09 Europe/Dublin — Saggart empty 6/6 (`emptyReason: "no-live-predictions"`
every poll), Fortunestown 6/6 non-empty (3-4 trips), Citywest Campus 6/6 non-empty (3-5 trips).
Filtered per docs/board-eligibility-rule.md: removed from `lib/cities/dublin/stations.json` (66 → 65
catalog stations, Red 31 → 30), `notCovered` entry + rider copy added to `lib/cities/dublin/
coverage.json`, dated Corrections appended to `hazard-pack.md` and `oracle-clash-report.md`'s Board
eligibility section (`out-feed` verdict). Because Saggart is a printed Red Line terminus name in
`lib/cities/dublin/marketing-directions.js`'s `LINE_TERMINI.red` list (independent of catalog
membership), the "Red + Saggart" direction chip keeps appearing at every upstream Red stop — verified
`mapLineTerminusDestination("Saggart", "red") === "Red + Saggart"` still resolves after the catalog
removal (asserted in `qa/dublin-dogfood-gate.mjs`). `qa/dublin-dogfood-gate.mjs`'s station/Red counts
updated to 65/30.

**Rialto** — CONFIRMED intermittent, not permanent; left in the catalog. The automated 3-poll sweep
(30s apart) had shown it empty on every poll, the same shape reported for Saggart, but Mark flagged
it as "not deep-dived" and asked for independent confirmation before any filtering decision. Ran a
dedicated foreground 10-poll/60s loop (well past the 20s TripUpdates cache TTL) against controls
Fatima and Suir Road, Sunday ~12:54-13:04 UTC (~13:54-14:04 Europe/Dublin):

| Poll | Rialto trips | Fatima trips | Suir Road trips |
|---|---|---|---|
| 1 | 6 | 4 | 4 |
| 2 | 6 | 4 | 4 |
| 3 | 6 | 4 | 4 |
| 4 | 6 | 4 | 4 |
| 5 | 6 | 4 | 4 |
| 6 | 5 | 3 | 4 |
| 7 | 6 | 3 | 5 |
| 8 | 6 | 4 | 4 |
| 9 | 7 | 3 | 5 |
| 10 | 7 | 3 | 0 (`no-live-predictions`) |

Rialto: 10/10 polls non-empty (5-7 trips each). Fatima: 10/10 non-empty (3-4 trips each). Suir Road:
9/10 non-empty, one honest-empty-state poll (the same transient-gap shape documented for Red Cow/
Kylemore above). Rialto's original empty appearance in the 3-poll sweep was a momentary feed-gap
sighting, not a permanent per-station coverage hole — no coverage.json change, no catalog removal.
It stays covered by the honest empty state (PR #481) for any future brief poll where the feed
genuinely has nothing to say.

**Sweep threshold (Mark's recommendation, applied).** `qa/dublin-all-stations-live-sweep.mjs` is now
headway-aware: for each catalog station it derives the scheduled headway from the static snapshot's
`stop_times.txt` for the current service-day hour (median gap between consecutive scheduled
departures at that stop within the hour window; falls back to 20 minutes when fewer than two rows
are found), and fails a station only when its empty run spans >= 1.5x that headway (polls spaced at
max(30s, headway/4), capped so the whole run stays <= 20 minutes) — an empty poll with
`emptyReason: "no-live-predictions"` inside that window passes, same as the honest-empty-state rule
elsewhere. This replaces the previous fixed 3-poll/30s-apart/3-consecutive-empty threshold, which is
exactly what mis-flagged Rialto (a station that resolves to non-empty on essentially every longer
poll) as a stale gap on a narrower window.

Status stays `planned`. Scratch poll scripts used for this investigation
(`scratch-alias-check.mjs`, `scratch-poll-rialto.mjs`, `scratch-poll-saggart.mjs`,
`scratch-marlborough.mjs`, `scratch-poll-marlborough.mjs`) were run in the repo root, are not
committed, and are deleted after this entry was written.

**Separate finding, noticed while validating the new sweep, NOT fixed here (out of this brief's
scope).** The first full 65-station sweep run under the new headway-aware threshold (pre-dating
the 9-minute runtime cap, run at the then-current 20-minute cap) failed on **Marlborough**
(Green Line, southbound-only direction-exclusive interchange stop, hazard-pack.md H4a) —
continuously empty (`emptyReason: "no-live-predictions"` every poll) for the entire 20-minute run
while all other 64 stations had genuine coverage at some point. A dedicated 5-poll/45s follow-up
check immediately afterwards showed Marlborough recovering (empty on polls 1-3, non-empty on polls
4-5, ~1-2 trips), while controls O'Connell - GPO/Trinity/Parnell stayed non-empty throughout — so
this is the same transient-feed-gap shape as Red Cow/Kylemore/Rialto, not a permanent Connolly/
Saggart-style hole, just a longer-than-usual one (~20-24 minutes) against Marlborough's own fairly
low ~12-minute scheduled headway (1.5x threshold ~18 min). Not investigated further or filtered —
out of this brief's Saggart/Rialto scope — but worth a dedicated look given Marlborough is one of
the three direction-exclusive Green loop stops this pack already flags as its sharpest hazard.
A re-run of `qa/dublin-all-stations-live-sweep.mjs` a few minutes later (under the corrected
9-minute runtime cap) passed cleanly with Marlborough non-empty throughout, and flagged Tallaght as
"uncertain" (empty the whole 9-minute run, headway 7min, but the run ended before reaching its own
1.5x/~10.5min threshold) rather than failing it — exactly the graceful "re-run to confirm" behaviour
the new threshold rule is designed to produce for a borderline case, not a hard failure.

## Correction, 27 Sep 2026 (Jim, docs/jim-brief-dublin-sweep-evidence-memory.md) — sweep gained evidence memory; Broombridge is a long intermittent gap, not permanent

Mark's QA-6 note (`docs/dublin-d1/mark-qa-note.md`, run on `mark/dublin-flip-6`) found **Broombridge**
(the Green Line's northern terminus) continuously empty across 24/24 polls over ~11 minutes
(~16:21-16:30 Europe/Dublin: 18 automated polls plus a 6-poll foreground corroboration against
Cabra, its immediate Green neighbour, which stayed non-empty every poll on the same headway) —
the exact shape the sweep uses to flag Connolly/Saggart as permanent. Mark correctly flagged it
rather than filtering it himself, and correctly noted it needed a verdict, not an assumption.

It is not permanent. Earlier the same day (~16:00 Europe/Dublin, during PR #484's flip-commit
rider-path live check), Broombridge returned `Green + Brides Glen` with a real trip (`next` not
null) — i.e. non-empty, less than half an hour before Mark's 24-empty-poll window began. A single
sweep run's own 1.5x-headway threshold (Broombridge's own headway is ~5min, so its threshold is
~7.5min; 11 minutes empty clears it) cannot distinguish "empty this run, but working fine earlier
today" from "never once worked" — that distinction needs evidence across runs, not just within
one.

`qa/dublin-all-stations-live-sweep.mjs` now keeps that evidence: every run appends a JSONL record
to `docs/dublin-d1/live-sweep-log.jsonl` (per-station headway, poll counts, and whether it was
ever seen non-empty that run). A station continuously empty for >= 1.5x its own headway in the
current run is classified `intermittent-long` (passes, honest-empty-state signal still required)
if it has been observed non-empty in any run logged within the last 7 days — Broombridge's case,
seeded into the log from the evidence above — and only classified permanent (fails) if it has
never once been observed non-empty in that window, which remains true for Connolly/Saggart (both
already filtered out of the catalog, so the sweep no longer polls them at all, but their seed
entries stay in the log for the record).

Per the brief: **Broombridge is not filtered.** It stays in `lib/cities/dublin/stations.json` (65
stations, unchanged) and keeps appearing as the `Green + Broombridge` terminus chip at every
upstream Green stop — this is a feed-availability characteristic honest-empty-state (PR #481)
already covers correctly, not a per-station coverage hole like Connolly/Saggart.
`lib/cities/dublin/coverage.json`'s intermittent-gap note is updated to say this plainly (some
stops, including termini such as Broombridge, can go 10+ minutes without live predictions) and
now names Red Cow, Kylemore, Marlborough, Rialto and Broombridge as the five stations already
observed in this shape, each confirmed non-empty earlier or later the same day (27 Sep 2026).
`docs/live-flip-checklist.md` §9 is corrected to say permanent means "never observed non-empty
across runs" rather than "empty this run" — the wording that led to Mark's understandable
first-pass PERMANENT classification here.
