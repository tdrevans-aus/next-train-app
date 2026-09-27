# Mark QA note - Dublin (city dublin, status planned at review time, flipped live 26 Sep 2026)

Reviewed at origin/master aea925a plus CI evidence from claude/busy-heisenberg-47ovag
(docs/dublin-d1/ci-snapshot-evidence.md, run 36232824869, commit 16e9178, merged PR #460).

## Result: PASS - no blockers.

Note (26 Sep 2026, Jim): this note originally read "Do NOT flip. City stays status: 'planned'"
because at review time the trimmed static snapshot had not yet been published to blob storage and
NTA_API_KEY was unset in the sandbox (item 6/blockers below). Both gaps have since closed: the
snapshot was published to `gtfs/dublin.zip` (docs/dublin-d1/ci-snapshot-evidence.md), the NTA
GTFS-RT v2 trip_ids were confirmed to join it 70/70 (100%, CI run 36236001976, PR #464), and
NTA_API_KEY is set in Vercel production. Tim authorised the flip in chat on 26 Sep 2026
(docs/jim-brief-dublin-flip.md) on the strength of that evidence. The checklist below is otherwise
unchanged from the original pass.

## Checklist

1. Scope cut (Luas Red + Green only). lib/cities/dublin/stations.json lists 67 stations
   (Red 32 / Green 35), matches docs/dublin-d1/published-network.json and the registry note.
   No DART/Dublin Bus/Bus Eireann/Go-Ahead Ireland stations present. PASS.

2. Hub lock (Abbey Street). DUBLIN_HUB = "Abbey Street"; isForbiddenHubProxy() in
   lib/cities/dublin/marketing-directions.js blocks Marlborough / O'Connell - GPO / O'Connell
   Upper / Connolly / Busaras / O'Connell Bridge from standing in for the hub. Abbey Street never
   appears in LINE_TERMINI, so it can never be produced as a direction chip
   (mapLineTerminusDestination). PASS.

3. doNotGroup guards. FORBIDDEN_STATION_TOKENS rejects generic/other-city tokens (City,
   Centre, Downtown, CBD, Dublin, dub, ie, plus other cities' hub strings). Catalog keeps
   O'Connell - GPO / O'Connell Upper / Marlborough as three distinct entries and Tallaght vs
   Saggart vs The Point as distinct Red termini. PASS.

4. Green Line direction-exclusive loop (hazard-pack.md H4a). isDirectionAllowedAtStop()
   correctly restricts O'Connell - GPO / O'Connell Upper to northbound-only and Marlborough to
   southbound-only, falls open (allows) only when the terminus can't be classified - verified by
   qa/dublin-dogfood-gate.mjs (formerly qa/dublin-planned-gate.mjs). PASS.

5. DST. DUBLIN_TIME_ZONE = "Europe/Dublin", sourced from IANA tzdata via the shared
   gtfs/static-cache.js / gtfs/board.js helpers - no hand-rolled fixed-offset logic. Correctly
   flags (in the adapter header and hazard-pack.md H7) that the oracle report's claim of "no
   daylight saving observed since 2024" is wrong/unverified - Ireland's clock-change abolition
   proposal stalled and was never enacted, so Europe/Dublin still observes IST/GMT transitions.
   This is exactly the kind of oracle error the pipeline is supposed to catch downstream, and it
   was caught (by Jim/Luke, not invented here) rather than baked into the adapter. PASS.

6. v1 mode cut / board eligibility (docs/board-eligibility-rule.md).
   - Oracle report's Board eligibility section (docs/dublin-d1/oracle-clash-report.md, lines
     24-48) has all rows decided: Luas Red `in`, Luas Green `in`, DART `out-product` (v2 scope,
     walk-up but deferred), Dublin Bus/Bus Eireann/Go-Ahead Ireland `out-mode` (buses, v1 is rail/
     tram only). No `undecided` rows. PASS.
   - Adapter-level filtering: classifyLuasLineId() returns null for anything that isn't Red/Green
     by short/long name or hex colour, and unclassified trips are dropped from the board
     (trips.filter(trip => trip.lineId != null)) - correctly excludes out-of-scope services
     (buses/DART sharing NTA's national feed) without risking dropping an in-scope Luas trip.
     skipResolvedShareCheck: true is set specifically because the realtime feed carries every
     Irish operator, which is the right mechanism here, not a scope workaround. PASS as designed.
   - Live sampling of /api/board and /api/directions was NOT possible from a Claude sandbox
     (transportforireland.ie and the blob store aren't reachable from there, and NTA_API_KEY isn't
     in any sandbox's .env.local) - this gap was closed by CI instead: the top-level session
     published the trimmed snapshot (run 36232824869, PR #460) and confirmed the live GTFS-RT v2
     join (run 36236001976, PR #464) on a real Actions runner, per
     docs/dublin-d1/ci-snapshot-evidence.md. That evidence, plus NTA_API_KEY being set in Vercel
     production, is what Tim's flip decision rests on.

7. Realtime-only board rule (jim-brief-boston-subway-live-predictions.md, 20 Sep 2026).
   fetchStationBoard() drops every trip lacking RT confirmation (tripHasRealtimeConfirmation)
   before setting realtime: true on the survivors, so board-level realtime can't go stale the way
   Boston's did (schedule-only trips marked live). Confirmed live by the 70/70 RT/static join
   (item 6) - a trip that doesn't join has no stop_time_update to confirm against and is dropped.

8. Response-shape conformance. fetchStationBoard() returns
   { stationName, lastUpdate, trips, realtime, nextServiceDate }, matching the shape other GTFS
   adapters (melbourne.js/adelaide.js) return via the shared gtfs/board.js helpers. PASS.

9. Feed correctness against the verified static snapshot
   (docs/dublin-d1/ci-snapshot-evidence.md, GTFS_LUAS.zip):
   - agency.txt: `10000 | LUAS` - single agency, no cross-operator contamination to filter.
   - routes.txt: `10000 GREEN g a | ... | Green | Parnell - Brides Glen | 0` and
     `10000 RED g a | ... | Red | The Point - Tallaght | 0` - route_short_name is the literal word
     Green/Red. classifyLuasLineId()'s primary match (/\bred\b/ or /\bgreen\b/ against
     foldKey(routeShortName)) matches this directly; the hex-colour fallback isn't even needed.
     The adapter header previously called this classification "UNVERIFIED" - it is now verified
     against the real feed and correct.
   - 128 stops in the trimmed feed vs 67 catalog station names is expected, not a mismatch -
     Luas stops have per-direction/per-platform stop_ids per catalog station; stopIds is an array
     per catalog entry for exactly this reason.
   - Tallaght and Broombridge termini both present per the evidence file, consistent with the
     catalog and LINE_TERMINI.
   - NTA GTFS-RT v2 trip_ids join this feed's trip_ids 70/70 (100%), closing the one remaining
     "not fully confirmable" gap from the original pass.

10. Ledger consistency (docs/country-lane.md). No docs/ireland-ledger.md exists and no country
    lane has run for Ireland - expected, since Dublin is Ireland's first region and Ireland isn't
    a shared/overlapping-region country like UK/Sweden/NL. N/A, not a gap.

## Suites run

- node qa/dublin-planned-gate.mjs (pre-flip) - PASS: "planned/501, adapterReady, D1 pack, 67
  stations (Red 32 / Green 35), hub Abbey Street, doNotGroup pairs enforced, colour+terminus
  direction model, Abbey Street/City never a direction token, Green city-centre loop
  direction-exclusivity guard ..., missing-key and unknown-station both throw without network,
  Perth Australia green".
- node qa/dublin-dogfood-gate.mjs (post-flip, replaces dublin-planned-gate.mjs) - PASS: same
  offline assertions plus live/MULTI_CITY_IDS/dispatch-wiring checks.
- node qa/run-all.mjs --smoke (explicit 600000ms timeout, ran to completion) - passed within the
  suite. Other suite-wide failures observed pre-flip were environmental, not Dublin-related:
  Playwright's headless Chromium binary isn't installed in this sandbox (browserType.launch:
  Executable doesn't exist at /opt/pw-browsers/...), affecting several browser-based scripts
  (route-swipe-keeps-active-route, london-picker-no-duplicate-stops, cold-boot-fetch-coalesce,
  ads-init-after-deferred-load, reset-param-gated, country-wide-picker including its retry); and
  two unrelated cities' dogfood gates hit sandbox network 403s to their own external feeds
  (copenhagen-dogfood-gate.mjs -> rejseplanen.info/labs/GTFS.zip 403; boston-dogfood-gate.mjs ->
  MBTA v3 403). None touch dublin. no-live-feed-stops-gate.mjs passed offline (127 stops, 6
  regions, unaffected).

## Blockers

None. The two non-blocking items from the original pass are now closed:
1. Trimmed static snapshot published to blob storage (`gtfs/dublin.zip`,
   docs/dublin-d1/ci-snapshot-evidence.md).
2. NTA_API_KEY confirmed set in Vercel production; live GTFS-RT v2 / static trip_id join
   confirmed 70/70 (100%) by qa/dublin-rt-join-check.mjs (PR #464).

No background loops or servers were left running from this QA pass.
