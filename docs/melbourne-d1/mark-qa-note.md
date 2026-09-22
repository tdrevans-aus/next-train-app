# Melbourne — Mark QA note (flip check on PR #435)

Date: 2026-09-22. Branch checked: `melbourne-gtfs-rt-adapter` (PR #435, commit `0c55ad8`).
Verdict: **RED — do not flip.** One hard-fail (live GTFS-RT feed unreachable with the current
`VIC_OPENDATA_API_KEY`, reproduced live during this QA pass), everything else green.

## Headline finding (hard fail)

`lib/providers/registry.js`'s notes field, `qa/melbourne-dogfood-gate.mjs`'s file header, and
`docs/melbourne-d1/jim-handoff.md`'s "Flip follow-through" section all assert that
`VIC_OPENDATA_API_KEY` was **"confirmed working (HTTP 200) 22 Sep 2026"** with live coverage
across all 16 running Metro line groups and all 13 V/Line route_ids. I copied the live
`VIC_OPENDATA_API_KEY` from `.env.local` into the worktree and called both real endpoints
directly (never printed the key value, deleted the copy afterwards):

| Endpoint | Result |
| --- | --- |
| `.../gtfs/realtime/v1/metro/trip-updates` (header `KeyID`) | **HTTP 401**, 660-byte SOAP fault `fault:MessageBlocked` |
| `.../gtfs/realtime/v1/vline/trip-updates` (header `KeyID`) | **HTTP 401**, same SOAP fault |
| Metro endpoint with `Ocp-Apim-Subscription-Key` header (per the OpenAPI-file discrepancy noted in `open-data-key-401-evidence.md`) | **HTTP 401**, same fault |
| Metro endpoint with `?subscription-key=` query param | **HTTP 401**, same fault |

This is byte-for-byte the same gateway-level `fault:MessageBlocked` response recorded as the
**pre-existing, unresolved blocker** in `docs/melbourne-d1/open-data-key-401-evidence.md` (20 Sep
2026) — i.e. whatever "22 Sep" fix unblocked this for whoever wrote the registry/gate notes is not
reproducible now, with the key actually in `.env.local`. Running the registered gate directly with
the key set confirms this is not a fluke:

```
$ VIC_OPENDATA_API_KEY=<redacted> node qa/melbourne-dogfood-gate.mjs
ovapi-tripupdates fetch ms=151 bytes=0 entities=0 outcome=error
Error: GTFS-RT fetch failed (401) for https://api.opendata.transport.vic.gov.au/.../metro/trip-updates
    at fetchTripUpdates (lib/providers/gtfs/realtime.js:29:11)
    ...
    at qa/melbourne-dogfood-gate.mjs:255:25
```

The gate crashes (uncaught exception, non-zero exit) rather than failing an assertion cleanly —
worth a small robustness fix on its own (the live end-to-end block should catch and report a
clear failure, not let `fetchTripUpdates` throw straight out of the script), but that's secondary
to the real problem: **the feed is not live for this city right now, contradicting the pack's own
claim that it is.**

Note the blind spot this creates: `qa/melbourne-dogfood-gate.mjs` only runs its live section
`if (readVicOpenDataApiKey())` — CI and `qa/run-all.mjs --smoke` never carry the secret, so the
gate reports green (`melbourne-dogfood-gate.mjs PASS`, confirmed in this run's smoke log) whether
the feed actually works or not. **This PR cannot be judged live-ready from smoke/CI output alone**
— it requires exactly the manual key-in-hand check this dispatch asked for, which is what caught
this.

Per `jim-handoff.md`'s own instruction: *"Stop and report if the 401 persists once a key is
confirmed correct... this is exactly the kind of Nico-to-Viv escalation this pipeline exists for
if the portal itself is the blocker rather than the key value."* Recommend exactly that: re-verify
the key against the portal's own account page character-for-character (as
`open-data-key-401-evidence.md` did on 20 Sep), and if it still matches, escalate to Transport
Victoria (`PTdataprogram@transport.vic.gov.au`) rather than re-attempting a code fix — this reads
as a portal-side gateway/subscription-activation problem, not a header/casing bug (the adapter's
`vicOpenDataAuthHeaders()` sends exactly `KeyID: <key>`, matching the documented casing).

## Everything else — green

All of the following pass and are unaffected by the live-feed finding above:

### Registry / status hygiene
- `status: "planned"` in `lib/providers/registry.js` — correct, unchanged by this PR (this is not
  itself a flip PR; the flip is contingent on the above being resolved).
- `assertCityLive("melbourne")` → `{ ok: false, status: 501 }` — confirmed by the gate.
- No second city id (`mel`/`ptv`/`vic`/`au`) registered — confirmed by the gate's loop over
  `["mel", "ptv", "vic", "au"]`.
- `envKeys` lists `VIC_OPENDATA_API_KEY` only; the retired `PTV_DEVID` is gone.
- `lib/providers/ptv/client.js` (105 lines) removed in this diff — old HMAC path fully retired,
  not left wired alongside the new one, per Tim's "supersedes, does not extend" instruction.

### Flip-follow-through wiring (correctly staged, correctly NOT yet flipped)
- Dogfood module (`lib/cities/melbourne/dogfood-next-train.js`) and the `melbourne` dispatch
  switch-cases in `lib/cities/live-city-api.js`'s `directionsFor`/`getMultiCityNextTrain` are
  wired ahead of the flip, as the pack's "Flip commit — exact edits" section says is safe
  (production gates on `assertCityLive()`, not list membership).
- Confirmed **NOT** yet added (correctly deferred to the flip commit): `MULTI_CITY_IDS` /
  `MultiCityId` typedef in `live-city-api.js`, `NEARBY_MULTI_CITY_IDS`/`LIVE_CITY_IDS` in
  `public/app.js`, `brisbane-dogfood.js`'s `MULTI_CITY_IDS`/`available` map, `journey-model.js`'s
  `PERSISTED_CITY_IDS`/`PERSISTED_COUNTRY_IDS`. `isMultiCity("melbourne") === false` asserted by
  the gate.
- Picker entry is still `comingSoon: true` (`public/city-session.js:29`).
- `CITY_BOUNDS.melbourne` and `country-regions.js`'s `melbourne: "au"` are already in place
  (piggybacking on the existing Australia country plumbing) — correct per the pack.
- `lib/cities/melbourne/coverage.json` reads correctly: 17 named Metro lines + 11 V/Line
  services at their correct shared stations, Albury/Warrnambool and trams/buses/SkyBus explicitly
  listed under `notCovered`.

### `qa/melbourne-dogfood-gate.mjs` (offline sections — the only sections runnable without a
working key)
- D1 pack presence (all 8 required files), `published-network.json` city/status/17-line-count.
- Board eligibility section present, "No `undecided` rows remain" recorded, all of
  Shepparton/Bairnsdale/Swan Hill/Albury/Warrnambool named.
- 220-station catalog: every station has lat/lng, ≥1 GTFS stopId, falls inside
  `CITY_BOUNDS.melbourne`; Jolimont/Jolimont-MCG alias present; `resolveCatalogEntry` resolves by
  printed name and GTFS alias, rejects an unknown name.
- Direction-label gate assertions (a)–(d), all pass:
  - (a) terminus never blank on Sunbury/Cranbourne/Pakenham (blank-destination fallback still
    names the line).
  - (b) "via City Loop" appears only at Flinders Street/Southern Cross/Flagstaff/Melbourne
    Central/Parliament, never at Frankston/Richmond/Caulfield/Malvern.
  - (c) suffix derived per-trip via `buildLoopTripIdSet` (stop-sequence signal), not per-line —
    a trip resolved as loop-calling shows it, one that isn't doesn't, even at an eligible station.
  - (d) "Metro Tunnel" never appears in a Sunbury/Cranbourne/Pakenham label, even when the raw
    headsign contains it.
- V/Line eligibility filtering: Albury/Warrnambool (`ABY`/`WBL`) excluded; Geelong, Ballarat,
  Bendigo, Seymour, Traralgon, Echuca, Ararat, Maryborough, Shepparton, Bairnsdale, Swan Hill all
  allowed; V/Line labels always prefixed `V/Line …` so they can't collapse into a Metro row at
  Southern Cross.
- `fetchStationBoard("Not A Real Station")` throws before any network call; missing-key throws
  `MissingProviderApiKeyError` before any fetch — both confirmed offline, no network needed.
- Dogfood station list is exactly the 220 D1 names, Flinders Street present.

### Ledger / country-lane
Australia has no `docs/australia-ledger.md` and no country lane (AU/NZ/CA are explicitly excluded
from the country-lane rule in `docs/country-lane.md`) — no ledger-consistency check applies here.

### Oracle report / v1 mode cut / hub-lock (`docs/melbourne-d1/oracle-clash-report.md`,
`hazard-pack.md`)
- v1 mode cut matches code: Metro Trains suburban rail (17 named groups incl. Stony Point,
  Racecourse special-events-only) + walk-up V/Line at shared stations; trams, buses, SkyBus,
  V/Line long-distance beyond the walk-up set, coaches, interstate, Airport Rail, Suburban Rail
  Loop all recorded out.
- Hub-lock / doNotGroup: Flinders Street vs Town Hall vs Federation Square (not a station) vs
  State Library vs Melbourne Central vs Parliament vs Flagstaff vs Southern Cross Metro vs
  Southern Cross V/Line vs North Melbourne vs Arden vs Union vs Richmond — all present in
  `hazard-pack.md` H1/H2/H4, all consistent with the code's `CITY_LOOP_STATIONS` /
  `VIA_CITY_LOOP_SUFFIX_STATIONS` sets and the station catalog. Union's line correction
  (Belgrave/Lilydale, not Pakenham/Cranbourne — Tim's decision item 5) is reflected in the pack
  and not contradicted by the code (direction-labels.js has no per-line station membership to
  contradict it; that lives in `published-network.json`/`stations.json`, which include Union
  between Chatham and Box Hill per the pack).
- DST (H7): `MELBOURNE_TIME_ZONE = "Australia/Melbourne"` is used consistently in
  `fetchStationBoard`/`loadMelbourneMetroStatic`/`loadMelbourneVlineStatic`/dogfood next-train —
  no hardcoded UTC offset, no reuse of the no-DST Perth/Brisbane/Adelaide assumption the hazard
  pack specifically warns against.

### Board eligibility rule (docs/board-eligibility-rule.md) — both required checks
1. Oracle-report-equivalent (`hazard-pack.md`, which supersedes the oracle report's original
   table per its "SECOND PASS" note) has a Board eligibility section with **no `undecided` rows**
   — confirmed by both direct reading and the gate's regex assertion.
2. Adapter's filtering matches verdicts: `isVlineTripAllowed()` returns `false` only for
   `ABY`/`WBL` (the two `out-reservation` verdicts) and `true` for every other V/Line code
   including the reclassified Shepparton/Bairnsdale/Swan Hill (`in`) — verified directly against
   the gate's own table of 11 `in` codes. **Could not sample a live board to confirm an `in`
   service actually appears and an `out-reservation` one doesn't**, because the feed is
   unreachable (see headline finding) — this is the one board-eligibility sub-check left
   unconfirmed live, blocked on the same 401.

### Realtime-everywhere rule (docs/jim-brief-boston-subway-live-predictions.md, added 20 Sep 2026)
- `fetchStationBoard()` filters every trip through `tripHasRealtimeConfirmation()` before setting
  `realtime: true`; nothing scheduled-only reaches the returned board. This is correct in the
  code, but **I could not sample the actual `/api/board`/`/api/directions` response path live**
  (the explicit ask in this dispatch and in my own checklist) because the feed 401s — so this is
  verified in the adapter's isolated logic only, not end-to-end, exactly the gap that rule was
  written to close for Boston. Cannot be called green until the feed itself is reachable.

### Response-shape conformance
- `fetchStationBoard()`'s return shape (`stationName`, `lastUpdate`, `trips[]`, `realtime`,
  `nextServiceDate`) matches the shape every other AU static-join adapter returns, and every
  rider-facing API route (`api/board.js`, `api/directions.js`, `api/next-train.js`,
  `api/destinations.js`, `api/city-stations.js`) gates on `assertCityLive()` first — confirmed by
  grep, all six route handlers call it — so Melbourne correctly 501s across the whole rider-facing
  surface right now, matching its `planned` status.

## Mechanical gates run

| Command | Result |
| --- | --- |
| `node qa/melbourne-dogfood-gate.mjs` (no key, as CI/smoke run it) | PASS (green, but see blind-spot note above) |
| `node qa/melbourne-dogfood-gate.mjs` (real key from `.env.local` set) | **CRASHES** — uncaught 401 from `fetchTripUpdates` |
| `node qa/live-city-lists-sync.mjs` | PASS — 36 live cities consistent, melbourne correctly absent |
| `node qa/coverage-notes-gate.mjs` | PASS — 36 live cities all have valid coverage.json |
| `node qa/country-regions-sync-gate.mjs` | PASS — 40 entries match the picker's 40 regions |
| `node qa/run-all.mjs --smoke` (timeout 600000ms, foreground, full run to completion) | PASS — 150 PASS, 0 FAIL, 586s |

## What I did not do / could not do

- Did not sample `/api/board`, `/api/directions`, `/api/next-train` against a running dev server
  for Flinders Street / Southern Cross / Melbourne Central / Richmond / Footscray / Dandenong /
  Frankston / Sunbury as the dispatch asked — pointless while the underlying feed 401s (every one
  would either 501 as `planned`, correctly, or throw the same GTFS-RT fetch error if temporarily
  wired live for testing) and not worth the extra dev-server session on this finding. Re-run this
  block once the 401 is resolved.
- Did not cross-check a live Metro trip-updates protobuf decode against a board — same reason, no
  reachable feed.
- Did not touch `.env.local` beyond copying it in and deleting the copy at the end (never
  printed the key value in any output, including this note).
- No background processes, dev servers, or poll loops left running — verified `netstat` shows no
  listeners on 3000/53856 and `ps -ef` shows no leftover node/dev-server or loop processes at the
  end of this session (one of my own polling loops for the smoke-suite background task was
  confirmed to have exited cleanly on its own before I finished).

## Recommendation

No flip PR. This is exactly the "if anything is red: no flip PR" case. Filing this note only,
on a docs-only branch off `melbourne-gtfs-rt-adapter`. Suggest routing back to Jim with:
(1) re-verify the key character-for-character against the portal account page right now, since
the code's own claim of a working key on 22 Sep 2026 does not reproduce; (2) if it still matches,
this is a Nico→Viv portal-side escalation (`PTdataprogram@transport.vic.gov.au`), not a code fix;
(3) separately, make the gate's live section fail with a clear assertion message instead of
letting the raw fetch exception propagate, so a future "key present but broken" case reads as a
QA failure rather than a crash.

