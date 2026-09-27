# Dublin (Luas Red + Green) — pre-flip QA note

**Verdict: RED. Do not flip. No PR opened.**

Run by Mark on `mark/dublin-flip-5` (cut from `origin/master` @ `7f53668`, PR #483 merged),
27 Sep 2026, in an isolated worktree. This is the fifth QA pass (`mark/dublin-flip-4` was RED on
missing flip follow-through — `MULTI_CITY_IDS`, dispatch cases, the dogfood module, none of which
existed yet). All of that follow-through **is now done and correct** — see the green items below.
But a genuine, reproducible, rider-facing correctness bug was found this pass, live, in the
flip-commit state, via the rider-facing endpoint sampling the checklist requires — not from
calling `fetchStationBoard()` in isolation. Per the brief: flag, don't fix.

## Blocking finding — terminus stations show a phantom "arrival as departure" direction chip

`lib/providers/dublin.js`'s `fetchStationBoard()` filters out arrivals with `isTerminatingAtStation`
at line 214:

```js
rawTrips = rawTrips.map((trip) => {
  const lineId = classifyLuasLineId({ routeShortName: trip.routeShortName, routeLongName: trip.routeLongName });
  const terminus = lineId ? resolveTerminus(trip.destination, lineId) : null;
  const destination = lineId ? mapLineTerminusDestination(trip.destination, lineId) : trip.destination;
  return { ...trip, lineId, terminus, destination, realtime: true };   // line 199-200: trip.destination is OVERWRITTEN here
});
...
rawTrips = rawTrips.filter((trip) => !isTerminatingAtStation(trip.destination, stationName));  // line 214: filters the ALREADY-OVERWRITTEN value
```

`trip.destination` is the raw GTFS headsign (e.g. `"Tallaght"`) right up until the `.map()` at
lines 193-201, which overwrites it with the marketing label (`"Red + Tallaght"`) computed by
`mapLineTerminusDestination`. The `isTerminatingAtStation` filter at line 214 then runs against
that **already-mapped label**, not the raw headsign. Inside
`lib/cities/dublin/marketing-directions.js`'s `isTerminatingAtStation` (line 230),
`canonicalStationName("Red + Tallaght")` can never resolve (the catalog only has plain names like
`"Tallaght"`), so it falls back to comparing the whole compound string `"Red + Tallaght"` against
the plain station name `"Tallaght"` — which never matches. **The guard the code comments describe
("a trip whose terminus is the station being viewed is an arrival, not a departure — never a
boardable direction from here") never actually fires whenever `resolveTerminus` successfully
resolves a terminus — which is exactly the case that matters.**

**Confirmed live**, not just by static reading. Sampling `/api/board?city=dublin&station=Tallaght`
in the flip-commit state (registry `status: "live"`, `dublin` in `MULTI_CITY_IDS`, dispatch wired)
during a genuine feed gap at Tallaght (`emptyReason: "no-live-predictions"` on both directions)
showed **two** direction entries: `"Red + The Point"` (correct — the real outbound direction from
the terminus) and **`"Red + Tallaght"`** (wrong — a self-referencing "direction towards the station
you're standing in", which can never be a real boardable service). Direct inspection of
`board.scheduledCandidates` at Tallaght (`node --env-file=.env.local`, importing
`fetchStationBoard` directly) showed this is not a one-off: roughly half of every polled candidate
list at Tallaght is `{"destination":"Red + Tallaght","terminus":"Tallaght","lineId":"red"}` —
every arriving Red trip whose headsign is `"Tallaght"` passes straight through the broken filter.
Also reproduced via `/api/directions?city=dublin&station=Tallaght` →
`{"directions":["Red + Tallaght","Red + The Point"]}`. The Green Line's own two termini
(Broombridge, Brides Glen) did **not** show this in a handful of live samples, but that is
consistent with sampling luck (the bug only manifests when a self-terminating trip happens to be
live-confirmed or, worse, is in `scheduledCandidates` — which by construction includes every
scheduled trip, so it is guaranteed to surface at every terminus during any feed gap, not just
Tallaght's) — the code path is identical regardless of line/terminus, there is nothing
Red-specific about the bug itself.

**Why this slipped through `qa/dublin-dogfood-gate.mjs`:** the gate unit-tests the guard directly
— `isTerminatingAtStation("Tallaght", "Tallaght") === true` (line ~201 of the gate) — using the
**raw** station name on both sides, which is exactly the case the guard *does* handle correctly.
It never exercises `fetchStationBoard()` end-to-end with realistic per-trip label mapping, so it
never observes that the real pipeline calls the guard with the mapped label, not the raw name.
This is the same class of gap the brief's realtime-marker checklist item warns about generally: a
guard can look correct called in isolation and still be broken in the actual response path.

**Not a cross-city pattern** — checked. `lib/providers/adelaide.js` uses the same
`isTerminatingAtStation` shape but never overwrites `trip.destination` with a marketing label
before calling it (Adelaide's directions come from a separate static
`marketingLabelsForStation` lookup, not a per-trip label computed in the adapter), so Adelaide's
raw headsign survives to the filter untouched. This is a Dublin-specific regression introduced by
its new per-trip "colour + terminus" label computation, not a shared library bug.

**Rider impact:** at every terminus station (Tallaght, and — per the code, though not directly
observed live — The Point, Broombridge, Brides Glen; Saggart is moot, already filtered for a
different reason), a rider sees an extra, permanently-nonsensical direction card
(`"Red + Tallaght"` while standing at Tallaght) alongside the real one. It will never show a real
departure (nothing genuinely runs "towards Tallaght" from Tallaght), so in the common case it just
shows as a second, permanently-empty "no live predictions" card — confusing but not itself unsafe.
The severity bar for this checklist is walk-up-service correctness on the board; a fabricated
non-service direction is the mirror image of a real hard-fail (silently missing service) and
belongs in the same bucket rather than being waved through as cosmetic, especially since it is
guaranteed to reproduce at every terminus during every feed gap once this ships live.

**Suggested fix shape (not applied — flag, don't fix):** capture the trip's raw headsign before
the `.map()` overwrites `destination` (e.g. `rawDestination: trip.destination`) and call
`isTerminatingAtStation(rawDestination, stationName)` at line 214, not the mapped label. A fresh
Jim dispatch should also add a regression case to `qa/dublin-dogfood-gate.mjs` that exercises
`fetchStationBoard()` (or an equivalent full-pipeline call) with a synthetic arriving trip whose
headsign equals the viewed station's own name, asserting it does not appear in `trips` or
`scheduledCandidates` — the current gate's direct-call assertion on `isTerminatingAtStation` alone
is insufficient and should stay only as a supplementary check, not the only one.

## Everything else checked this pass — green

Recorded for whoever re-runs this after the fix; none of this needs re-doing unless the fix
touches it.

1. **Board eligibility (docs/dublin-d1/oracle-clash-report.md)** — no `undecided` rows. Six
   verdicts recorded: Luas Red `in`, Luas Green `in`, DART `out-product`, buses `out-mode`,
   Connolly `out-feed`, Saggart `out-feed` — all with evidence and dates. Adapter-level filtering
   matches: `classifyLuasLineId()` returns `null` (drops the trip) for anything not Red/Green by
   name or hex colour, so a stray DART/bus trip on a shared `stop_id` never reaches a rider.
   Sampled boards at Abbey Street, Tallaght, Sandyford, Busáras, Marlborough, Rialto, Red Cow were
   Luas-only in every entry (`lineId` red/green only). Direct `/api/board` calls for Connolly and
   Saggart both return `{"error":"Unknown station"}` — correctly excluded from the catalog.

2. **Live-only, no static-as-live-time** — GREEN. Confirmed by code (no `stop_times` read as a
   rider-facing time; `realtime: true` is backed by `tripHasRealtimeConfirmation()`, which drops
   any trip the RT feed didn't confirm) and by the live sample: every sampled board entry's
   `data.next.realtime === true` at all 7 required stations, board-level `realtime: true`
   throughout the actual `/api/board`/`/api/directions` response path (not just the isolated
   adapter), matching docs/jim-brief-boston-subway-live-predictions.md's lesson.

3. **Live cross-check against the real NTA feed:**
   - `node qa/verify-dublin-gtfs-snapshot.mjs` → **ok** (published snapshot 465,806 bytes, 2
     routes Red/Green route_type 0, 1 agency LUAS, 128 distinct stops).
   - `node --env-file=.env.local qa/dublin-rt-join-check.mjs` → **ok, 59/59 (100%)** Luas
     TripUpdates resolved against the snapshot (well above the 20-trip judgeable threshold — this
     was run during Sunday daytime service, ~15:05 Europe/Dublin, unlike the previous pass's
     midnight sample).
   - `node --env-file=.env.local qa/dublin-all-stations-live-sweep.mjs`, run **twice** as
     instructed:
     - **Run 1** (contaminated — I accidentally ran two sweep instances concurrently against the
       live feed at once, which triggered NTA 429s throughout): still finished `ok`, 4 stations
       flagged "uncertain" (empty with the honest signal but under their own headway threshold):
       Tallaght (headway 7min, empty 3min), The Point (headway 5min, empty 0min), Parnell (12min,
       11min), Trinity (12min, 11min).
     - **Run 2** (clean, single instance, ≥10 min after run 1): **ok**, only 2 stations still
       "uncertain" — Parnell (headway 12min, empty 10min) and Trinity (headway 12min, empty 0min).
       Both are the Green loop's merge points (see hazard-pack.md H4a) with a genuinely long
       12-minute headway; neither reached its own 1.5×-headway fail threshold in either run. Not a
       blocker per the brief ("an 'uncertain' station is not RED").

4. **Rider-facing `/api/board` and `/api/directions`, sampled directly** (dev server in the
   flip-commit state: registry `status: "live"`, `dublin` added to `MULTI_CITY_IDS` +
   `MultiCityId` typedef in `lib/cities/live-city-api.js`, `country-regions.js`/`city-bounds.js`
   entries, regenerated `public/city-directions/dublin.json` and
   `public/city-manifest.seed.{json,js}`):
   - All 7 required stations (Abbey Street, Tallaght, Sandyford, Busáras, Marlborough, Rialto, Red
     Cow) responded in well under 3s (worst case 3.2s on a cold cache for Abbey Street; every
     other call 0.24-0.74s). An initial `curl`-based check misreported Busáras as "Unknown
     station" — that was a `curl --data-urlencode` Latin-1 mis-encoding of "á" on this shell
     (`%E1` instead of `%C3%A1`), not an app bug; a `fetch()`/`encodeURIComponent()` call resolved
     it correctly and returned a normal board.
   - **Green loop exclusivity, confirmed live**: Marlborough → `["Green + Brides Glen"]` only;
     O'Connell - GPO / O'Connell Upper → `["Green + Broombridge"]` only; Trinity/Parnell (merge
     points) → both directions valid, matching whichever the poll caught. No cross-contamination
     observed.
   - **Red trunk showing both branch termini, confirmed live**: Belgard (the actual fork point) →
     `["Red + Saggart","Red + Tallaght","Red + The Point"]` — all three. Red Cow's own snapshot at
     poll time only carried `Red + Tallaght`/`Red + The Point` (no live Saggart-bound trip in that
     particular window — a frequency/timing artefact, not a defect; Fortunestown/Citywest
     Campus/Cheeverstown/Fettercairn, all downstream of the fork on the Saggart branch, each showed
     `["Red + Saggart"]` live). Belgard is sufficient to demonstrate the direction model resolves
     both branches correctly.
   - Saggart and Connolly both correctly return `{"error":"Unknown station"}` on `/api/board` and
     `/api/directions` — confirmed excluded, not silently degraded.
   - `emptyReason: "no-live-predictions"` was observed live (Tallaght, during a genuine feed gap;
     see the blocking finding above for the accompanying phantom-chip defect it exposes).

5. **Hub lock, Europe/Dublin (IANA), doNotGroup** — GREEN, matches
   `docs/dublin-d1/hazard-pack.md` H1/H4/H6 exactly. `DUBLIN_HUB = "Abbey Street"`,
   `isForbiddenHubProxy()` rejects Marlborough/O'Connell - GPO/O'Connell Upper/Connolly/Busáras/
   O'Connell Bridge standing in for the hub. `DUBLIN_TIME_ZONE = "Europe/Dublin"` (IANA
   identifier, no hand-rolled offset table). doNotGroup pairs (Abbey Street vs the Green cluster;
   O'Connell - GPO vs O'Connell Upper; Tallaght vs Saggart; Red Cow vs Kingswood vs Belgard) all
   hold as distinct catalog entries.

6. **Registry-driven manifest** — GREEN, sampled in the flip-commit state.
   `GET /api/cities` returned dublin with `status: "live"`, `country: {id: "ie", name: "Ireland"}`,
   `bounds` (the existing `lib/cities/city-bounds.js` box, unchanged), `modes: ["light_rail"]`,
   `directionsVersion` populated, `nearbyEligible: true` — 42 total live cities, 13 countries.
   `node qa/registry-driven-client.mjs` → **ok** (fixture city zero-code-change test, manifest
   cache-survives-offline test, seed-cities-with-no-network test, saved-journey-keeps-cityId
   test all pass — this gate is city-agnostic and doesn't depend on the flip state).
   `lib/cities/dublin/coverage.json` correctly lists Luas-only coverage, with Connolly/Saggart/
   DART/buses as `notCovered` and rider-facing alternative-station copy ("use Busaras" /
   "use Fortunestown"). Station catalog: 65 total (Red 30, Green 35) — matches 67 minus Connolly
   and Saggart. All 65 stations carry real `lat`/`lng` (better than the Copenhagen precedent noted
   in the previous QA pass, which shipped with none).

7. **Gates at flip state** (registry `status: "live"`, dispatch wired, manifest regenerated):
   - `node qa/dublin-dogfood-gate.mjs` in the **pre-flip** (current, `status: "planned"`) state →
     **PASS**. Note: this gate's own docstring says Dublin "stays planned... only the flip changes
     this" and explicitly asserts `assertCityLive("dublin").ok === false` / `status === "planned"`
     — so it is **expected and by design** to fail once `status` actually flips to `"live"`
     (confirmed: it does fail in the flip-commit state, `Error: assertCityLive(dublin) must
     fail`). **This gate itself needs updating as part of the real flip commit** (same as every
     other city's pre-flip → post-flip gate transition, e.g. Chicago/Boston/Vienna) — flagging
     this explicitly since the brief's flip file-set list didn't mention it, but a flip PR that
     leaves this gate unedited will break `qa/run-all.mjs --smoke` on master permanently. Not
     itself a blocker for a fix-and-retry, just a checklist item for the next pass.
   - `node qa/live-city-lists-sync.mjs` → **ok**, 42 live cities consistent (in flip-commit state).
   - `node qa/country-regions-sync-gate.mjs` → **ok**, 42 entries consistent (in flip-commit
     state).
   - `node qa/registry-driven-client.mjs` → **ok** (see item 6).
   - `node qa/honest-empty-state.mjs` → **ok** — both the offline `buildNextTrainResponse`
     additive-`emptyReason` test and the browser fixture test (renders only for the
     all-directions-empty live-gap case, never for no-service/partial-gap/feed-error) pass.
   - `node qa/run-all.mjs --smoke` (plain, no `--env-file`), run in the flip-commit state →
     **159 PASS, 2 FAIL**:
     - `dublin-dogfood-gate.mjs` — expected failure, see above (pre-flip-only gate, needs updating
       as part of the actual flip commit, not evidence of an app defect).
     - `melbourne-dogfood-gate.mjs` — **unrelated to Dublin.** Failure message: "live end-to-end
       check failed: legacy hub-bound label request (Eaglemont towards Flinders Street) must
       return a non-null next train — this is the production regression from #439". This branch
       never touched any Melbourne file; this is either a live-feed flake or a pre-existing tracked
       regression (the failure message itself references issue #439) independent of this QA pass.
       Flagging for visibility, not claiming it as a Dublin finding.
     - `no-live-feed-stops-gate.mjs` (the brief's noted local flake) passed cleanly this run, no
       retry needed.

## What needs to happen before the next QA pass

A fresh Jim dispatch (bug-fix mode, pointed at this note) needs to fix the `isTerminatingAtStation`
call-site bug in `lib/providers/dublin.js` (capture the raw headsign before the marketing-label
overwrite at lines 193-201, use it at line 214) and add a regression test to
`qa/dublin-dogfood-gate.mjs` that exercises the full `fetchStationBoard()` pipeline (not just the
guard function in isolation) with a synthetic trip whose headsign matches the viewed station.
While there, also update `qa/dublin-dogfood-gate.mjs`'s own `status === "planned"` /
`assertCityLive(...).ok === false` assertions so the gate doesn't self-destruct the moment the
real flip commit lands (item 7 above).

Once that's landed, re-run this full checklist — items 3/4 in particular need to be re-sampled
live post-fix to confirm no terminus station shows a self-referencing direction chip anymore.

## Housekeeping

The flip file set (registry.js `status: "live"`, `country-regions.js`/`city-bounds.js` Ireland
entries, `live-city-api.js` `MULTI_CITY_IDS`, regenerated `city-directions`/`city-manifest.seed`
files) was built and exercised live in this worktree to run the checklist above, then **fully
reverted** (`git checkout --` on every touched file) before this note was written — nothing but
this note is committed on `mark/dublin-flip-5`. No flip PR opened. Dev server (port 3000) and both
background QA scripts (the sweep, the smoke suite) were run to completion and confirmed exited;
`netstat` shows nothing listening on 3000/3001-3010/3411 at time of writing.
