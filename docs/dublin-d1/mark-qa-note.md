# Mark QA note - Dublin (city dublin, status planned, adapterReady)

Reviewed at origin/master aea925a plus CI evidence from claude/busy-heisenberg-47ovag
(docs/dublin-d1/ci-snapshot-evidence.md, run 36232824869, commit 16e9178, merged PR #460).

## Result: PASS - no blockers. Do NOT flip. City stays status: "planned".

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
   qa/dublin-planned-gate.mjs. PASS.

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
   - Live sampling of /api/board and /api/directions for an `in` service actually appearing and
     an `out-*` service not appearing was NOT possible this session: NTA_API_KEY is unset in this
     sandbox (confirmed absent from .env.local, same as the D1 pack found) and
     gtfsFixtureBlobUrl("dublin") 404s because the trimmed static snapshot has not yet been
     published to blob storage this session - both documented as known, expected D1-stage gaps in
     lib/providers/dublin.js's header and jim-handoff.md, not introduced by this PR. This is a
     real gap, not a pass by default - it is not a blocker for a `planned`-status PR (no rider can
     hit /api/board for a planned city; assertCityLive("dublin") returns 501, verified by the
     gate), but it MUST be re-run once NTA_API_KEY and the published blob fixture both exist,
     before any future flip-eligibility QA pass.

7. Realtime-only board rule (jim-brief-boston-subway-live-predictions.md, 20 Sep 2026).
   fetchStationBoard() drops every trip lacking RT confirmation (tripHasRealtimeConfirmation)
   before setting realtime: true on the survivors, so board-level realtime can't go stale the way
   Boston's did (schedule-only trips marked live). Could not sample this through the actual
   /api/board or /api/directions response path for the same key/blob-gap reason as item 6 - same
   re-verify-before-flip caveat applies.

8. Response-shape conformance. fetchStationBoard() returns
   { stationName, lastUpdate, trips, realtime, nextServiceDate }, matching the shape other GTFS
   adapters (melbourne.js/adelaide.js) return via the shared gtfs/board.js helpers. PASS by
   inspection; not exercised live for the reason above.

9. Feed correctness against the newly-verified static snapshot
   (docs/dublin-d1/ci-snapshot-evidence.md, GTFS_LUAS.zip) - the key new fact for this pass:
   - agency.txt: `10000 | LUAS` - single agency, no cross-operator contamination to filter.
   - routes.txt: `10000 GREEN g a | ... | Green | Parnell - Brides Glen | 0` and
     `10000 RED g a | ... | Red | The Point - Tallaght | 0` - route_short_name is the literal word
     Green/Red. classifyLuasLineId()'s primary match (/\bred\b/ or /\bgreen\b/ against
     foldKey(routeShortName)) matches this directly; the hex-colour fallback isn't even needed.
     The adapter header calls this classification "UNVERIFIED" - it is now verified against the
     real feed and correct.
   - Stop names: the evidence file doesn't dump stops.txt directly, but the brief's "plain e.g.
     Abbey Street" is consistent with the catalog's plain names (no route-branded prefixes);
     resolveCatalogEntry()/findRailStopIdsForName() match by plain name, so joins should work.
     Not fully confirmable end-to-end without the published blob + key (same gap as item 6).
   - 128 stops in the trimmed feed vs 67 catalog station names is expected, not a mismatch -
     Luas stops have per-direction/per-platform stop_ids per catalog station; stopIds is an array
     per catalog entry for exactly this reason.
   - Tallaght and Broombridge termini both present per the evidence file, consistent with the
     catalog and LINE_TERMINI.

10. Ledger consistency (docs/country-lane.md). No docs/ireland-ledger.md exists and no country
    lane has run for Ireland - expected, since Dublin is Ireland's first region and Ireland isn't
    a shared/overlapping-region country like UK/Sweden/NL. N/A, not a gap.

## Suites run

- node qa/dublin-planned-gate.mjs - PASS: "planned/501, adapterReady, D1 pack, 67 stations
  (Red 32 / Green 35), hub Abbey Street, doNotGroup pairs enforced, colour+terminus direction
  model, Abbey Street/City never a direction token, Green city-centre loop direction-exclusivity
  guard ..., missing-key and unknown-station both throw without network, Perth Australia green".
- node qa/run-all.mjs --smoke (explicit 600000ms timeout, ran to completion) - dublin-planned-
  gate.mjs passed within the suite. Other suite-wide failures observed are environmental, not
  Dublin-related: Playwright's headless Chromium binary isn't installed in this sandbox
  (browserType.launch: Executable doesn't exist at /opt/pw-browsers/...), affecting several
  browser-based scripts (route-swipe-keeps-active-route, london-picker-no-duplicate-stops,
  cold-boot-fetch-coalesce, ads-init-after-deferred-load, reset-param-gated,
  country-wide-picker including its retry); and two unrelated cities' dogfood gates hit sandbox
  network 403s to their own external feeds (copenhagen-dogfood-gate.mjs ->
  rejseplanen.info/labs/GTFS.zip 403; boston-dogfood-gate.mjs -> MBTA v3 403). None touch dublin.
  no-live-feed-stops-gate.mjs passed offline (127 stops, 6 regions, unaffected).

## Blockers

None for this PR (adapter stays status: "planned"; no flip requested or performed).

Non-blocking items to close before any future flip-eligibility pass:
1. Publish the trimmed static snapshot to blob storage (scripts/trim-dublin-gtfs.mjs +
   scripts/publish-gtfs-fixture-to-blob.mjs) so gtfsFixtureBlobUrl("dublin") resolves.
2. Obtain NTA_API_KEY (present in Vercel production; absent from this sandbox and .env.local)
   and re-run checklist items 6/7's live sampling of /api/board and /api/directions - confirm an
   `in` Luas trip appears, an `out-*` (bus/DART) trip does not, and realtime: true survives the
   real request path end-to-end, not just fetchStationBoard() in isolation.
3. Confirm the NTA GTFS-RT v2 trip_ids actually join to this GTFS_LUAS.zip's trip_ids (noted as
   unverified in docs/dublin-d1/ci-snapshot-evidence.md) - the other live-data half needing a key.

No background loops or servers were left running from this QA pass.
