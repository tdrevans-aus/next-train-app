# Mark QA note — Bergen flip attempt, 28 Sep 2026

**Result: RED. Do not flip.** Item 2 (live-only check) fails: Bergen's only mode (Bybanen light
rail) never returns `realtime: true` from Entur's `estimatedCalls` for any observed call, across a
90-minute forward window and a 9-minute/9-poll live sweep, while the same-authority (SKY) Skyss
**buses** at the same stop-place, and Oslo's already-live T-bane at the same time of day, both show
the large majority of calls `realtime: true`. In practice, every Bybanen board is schedule-derived,
honestly labelled "Scheduled" per row, but never confirmed live-tracked. This does not meet "every
mode on the board is built from live data, not a schedule" (docs/jim-brief-boston-subway-live-
predictions.md, the check added 20 Sep 2026). Flip-state code changes I made to test the rider-
facing endpoints have been reverted; `master`'s `planned` state is untouched. No flip PR opened.

Branch: `mark/bergen-flip` (from `origin/master` @ 979c0a9f). Env: copied `.env.local`. No lane
lock needed (Mark). Nothing left running: dev server (PORT=3801, self-started) stopped; no
background loops; `netstat` confirms nothing listening on 3000/3801 at the end of this session.

## Checklist results

### 1. Board eligibility — PASS
`docs/bergen-d1/published-network.json`'s `boardEligibility.verdicts` has no `undecided` row:
Bybanen `in`; Skyss regional bus `out-mode` (mode cut, even where co-located with a Bybanen
stop-place); Vy Bergensbanen and Vy Arna line `out-scope` (Bergen Railway Station, NSR:StopPlace:
59983, is a confirmed-distinct stop-place from every Bybanen stop — no verdict owed, board-
eligibility rule §1). Confirmed against the *raw* Entur response at Bergen busstasjon
(NSR:StopPlace:62356): the same `estimatedCalls` response that includes Bybanen line 1/2 tram
calls also includes Skyss bus lines (FB50, 460, 610, 12, 67, 50E …) and a non-Skyss coach operator
(`NWY:Authority:...`) — `lib/providers/bergen.js`'s `classifyLine()` correctly filters all of these
out (`authority !== SKY:Authority:SKY` or `transportMode !== "tram"`), so no bus row would ever
reach a sampled board at Bergen busstasjon or Nesttun terminal despite genuine stop-place
co-location. `qa/bergen-dogfood-gate.mjs` also asserts the Board eligibility section's presence
and verdict text — PASS.

### 2. Live-only check — **FAIL (blocking)**
Confirmed live (not fixture) against the real Entur endpoint at 2026-09-28 ~05:13-05:50
Europe/Oslo (Bybanen running per the sweep — see item 3):

- `lib/providers/bergen.js`'s `mapEstimatedCall` sets `realtime: call.realtime === true` per trip
  (same as Oslo's identical line: `realtime: call.realtime === true`), and neither adapter drops
  a call whose `realtime` is `false` — this **matches Oslo's actual behaviour exactly** (Oslo's own
  comment: "Does not filter on `call.realtime`: `estimatedCalls` already blends scheduled and
  realtime-confirmed calls, and this adapter has never filtered non-realtime calls out of the
  board"). So the brief's framing ("confirm Bergen drops non-realtime calls exactly as Oslo does")
  doesn't hold — Oslo doesn't drop them either; both correctly *keep* every call and carry an honest
  per-trip flag instead. This part is fine and consistent.
- `aimedDepartureTime` is never shown labelled as live: when `call.realtime` is `false`,
  `expectedDepartureTime` (Entur's own field) already equals `aimedDepartureTime` upstream, and the
  rider-facing pipeline (`lib/train-times-core.js` `enrichTripTiming`) forces
  `status: "Scheduled"` whenever `trip.realtime === false`, never running it through the
  on-time/delayed diff — confirmed live at `/api/board?city=bergen&station=Bergen%20busstasjon`
  (tested against the flip-commit code state, reverted after): every row correctly showed
  `"status":"Scheduled","realtime":false`. **No mislabelling** — this half of item 2 passes.
- **The actual failure:** every single Bybanen call is `realtime:false`. Direct query of
  `NSR:StopPlace:62356` (Bergen busstasjon) with `numberOfDepartures:100, timeRange:5400`:
  **71 total calls, 25 tram (Bybanen) calls, 0/25 `realtime:true`.** In the same response, Skyss
  **buses** at the same stop-place (`SKY:Authority:SKY`, `transportMode: bus`, e.g. line 460, 610,
  12) mostly show `realtime:true`. Calibration against Oslo (already live, same time of day, same
  Entur platform): `NSR:StopPlace:58366` (Jernbanetorget T-bane) same window: **31 metro calls,
  27/31 `realtime:true`.** This rules out "too early in service, no vehicle dispatched yet" as the
  explanation (Oslo's metro gets live tracking within minutes of the same 05:xx start-of-day
  window) — Bybanen specifically does not appear to have live vehicle-position tracking wired into
  Entur's SIRI ET feed at all, only static schedule projected through `estimatedCalls`.
- This is exactly the open, unconfirmed item flagged in `docs/bergen-d1/jim-handoff.md` item 3
  ("SIRI VM/vehicle-positions for the SKY dataset — not checked this pass ... confirm live before
  assuming Bergen has (or lacks) the same real-time granularity Oslo does") — now checked, and the
  answer looks like **lacks**, at least for the tram mode specifically (buses under the same
  authority do get live tracking).
- Per the checklist's own framing ("If Bergen shows scheduled calls as live, that is RED") the
  letter of that specific test is technically not tripped (nothing is mislabelled) — but the
  substance of the 20 Sep 2026 Boston-precedent rule ("every mode on the board is built from live
  data, not a schedule") is not met: the one and only mode on this board is, empirically, never
  live. I'm treating this as the same severity as a mislabelling failure rather than papering over
  it with the letter of the older wording, per the spirit of "no live times, no region."
- **Not conclusively proven permanent from one morning's sample** — recommend a second sweep at a
  different time of day (midday/peak, not service-start) before treating "Bybanen has no SIRI VM"
  as settled fact, but the Oslo comparison at the *same* time of day is strong evidence it isn't a
  start-of-service artifact.

### 3. `qa/bergen-all-stations-live-sweep.mjs` — PASS (with a caveat noted, see below)
Ran live during Bergen service hours (~05:06-05:15 Europe/Oslo, Bybanen running):
all 33/33 catalog stations returned trips on every poll (9 polls/9 min), total trips per poll rose
287->346 - genuine live movement through the window. `docs/bergen-d1/live-sweep-log.jsonl` appended
(one run entry, all 33 stations `observedNonEmpty: true`). No `staleGap`, no `intermittentLong`, no
`uncertain`, no errors.
- **Jim's noted gap** (fallback headway, no honest-empty-state distinction): evaluated — acceptable
  as designed. Unlike Dublin, Bergen's adapter queries one blended live endpoint rather than joining
  a separate static schedule against an independently-lossy GTFS-RT feed, so an empty response here
  genuinely means "no call in the window," not "the RT layer silently dropped a stop the static
  layer still has" — the Dublin honest-empty-state problem doesn't have the same shape here. The
  fallback headway (20 min, generous, never used against the one real run since nothing went
  empty) is a reasonable placeholder given D1 is hand-transcribed timetables, not GTFS-derived.
  Not a gap I'm blocking on, but flag for whoever eventually re-runs this at a different time of
  day: the item-2 finding above (Bybanen apparently never live-tracked) means "had live trips"
  and "was schedule-only" are not actually distinguished by this sweep — it only checks trip
  *count*, not the `realtime` flag per trip. Worth adding a `realtime`-aware assertion to this
  sweep (or a new one) given item 2's finding, so a future run doesn't pass silently on schedule
  times as it just did here.

### 4. Rider-facing `/api/board` + `/api/directions` — PASS for shape/timing, see item 2 for content
Tested against the **flip-commit code state** (registry `status: "live"`, `live-city-api.js`
`MULTI_CITY_IDS` + typedef, `country-regions.js` `bergen: "no"` row, regenerated
`public/city-directions/bergen.json` and `public/city-manifest.seed.{json,js}` - all built
locally, verified, then **reverted**, not committed, because of the item-2 fail) — dev server on
an explicit free port (`PORT=3801`), `QA_BASE`/`QA_ATTACH` pattern honoured, foreground, no
background loops left running.

| Station | http | time |
|---|---|---|
| Bergen busstasjon (hub) | 200 | 1.9s (cold) |
| Byparken | 200 | 0.64s |
| Kaigaten | 200 | 0.65s |
| Nonneseter | 200 | 1.5s |
| Kronstad | 200 | 0.71s |
| Nesttun terminal | 200 | 0.66s |
| Bergen lufthavn Flesland | 200 | 0.64s |
| Fyllingsdalen terminal | 200 | 0.65s |

All well under 3s (cold and warm). Bergen busstasjon's response carried all 4 expected direction
entries (`1 + Byparken`, `1 + Bergen lufthavn Flesland`, `2 + Kaigaten`, `2 + Fyllingsdalen
terminal`), each with `data.next` populated (trip counts > 0) — no self-terminus chips seen at
Byparken/Kaigaten in the sampled responses. Hub never appeared as a destination token. Per-trip
`realtime` field reaches the JSON honestly (see item 2). No board-level top-level `realtime`
boolean exists in this response shape (`{stationName, lastUpdated, entries:[{direction,data}]}`)
- confirmed this is **not Bergen-specific**: `api/board.js`'s multi-city path has never carried
one for *any* city (Oslo included); the per-trip flag is what `lib/train-times-core.js` threads
through instead. Not treating the absence of a top-level flag as a new gap since it's pre-existing
and repo-wide, but noting it since the checklist explicitly asks for "board-level realtime."

### 5. Names / doNotGroup — PASS
`resolveCatalogEntry("Sletten senter")` -> `Sletten`; `resolveCatalogEntry("Bergen lufthavn")` ->
`Bergen lufthavn Flesland` (both asserted in `qa/bergen-dogfood-gate.mjs`, both live-confirmed:
the raw Entur response at Bergen busstasjon prints tram destination `"Bergen lufthavn"`, which the
adapter maps to the D1 print `"Bergen lufthavn Flesland"` in the chip — seen live in the actual
board dump above). doNotGroup pairs all hold as distinct catalog entries: Bergen busstasjon vs
Bergen stasjon (confirmed distinct NSR ids, latter never resolves as a Bybanen station); Nesttun
terminal vs Nesttun sentrum; Skjold vs Skjoldskiftet; Kokstad/Kokstadflaten/Birkelandsskiftet.
Byparken vs Kaigaten never merge (single-line termini, ~150m apart). Europe/Oslo via IANA,
confirmed no `Europe/Bergen` string anywhere in the adapter or registry entry.

### 6. Registry-driven client (built, tested, then reverted) — PASS in the built state
With the flip-state changes applied locally (before reverting): `/api/cities` manifest listed
`bergen` live under Norway with bounds (`CITY_BOUNDS.bergen`, pre-existing ahead of flip),
`modes: ["light_rail"]`; `country-regions.js` needed exactly one new row, `bergen: "no"` — mirrors
Oslo's existing `oslo: "no"` row, both regions correctly mapping to the same Norway country id
(no separate mapping needed, single `COUNTRY_NAMES.no = "Norway"` entry already covers both).
`lib/cities/bergen/coverage.json` rider prose: Bybanen only; Skyss buses and Bergen railway
station explicitly called out as not covered (`qa/bergen-dogfood-gate.mjs` asserts this).

### 7. Gates at flip state — PASS (offline/gate tier; see item 2 for the live-content caveat)
- `node qa/bergen-dogfood-gate.mjs` — PASS.
- `node qa/bergen-all-stations-live-sweep.mjs` (live, `--env-file=.env.local`) — PASS, see item 3.
- Did not re-run `qa/live-city-lists-sync.mjs`, `qa/country-regions-sync-gate.mjs`,
  `qa/registry-driven-client.mjs`, `qa/coverage-notes-gate.mjs`, or the full
  `qa/run-all.mjs --smoke` against the flip-state changes as a committed diff, since item 2's
  finding means those changes are not being committed or opened as a PR this pass — no point
  landing a full green smoke run against code that's being reverted. Happy to re-run all of these
  once item 2 is resolved (either a later sweep confirms Bybanen realtime does turn true at some
  point, or Tim/Jim decide the schedule-derived board is acceptable for this rider surface anyway
  and documents that explicitly, similar to Goteborg's "boards are schedule-only until Trafiklab
  publishes vt TripUpdates" standing caveat).

## Ledger consistency (docs/norway-ledger.md)
- Stop ownership (S2): "all Bybanen stations belong to Bergen" — trivially holds, no shared/
  boundary stations exist between Oslo and Bergen. No contradiction.
- No adapter verdict contradicts a ledger verdict: Vy Bergensbanen/Arna out-scope at Bergen
  (ledger S3/S5) matches the adapter's SKY-authority-only filter exactly.
- **Minor, non-blocking staleness**: the ledger (S2, S4) still says "Bergen: 35 Bybanen stations"
  and "Bystasjonen" in a couple of rows — Luke's D1 pack (dated after the ledger) corrected this to
  33/9/27 and "Bergen busstasjon". This is a documentation lag in the ledger, not a station-
  ownership contradiction (the ledger's ownership claim is a blanket "all Bybanen stations ->
  Bergen," not a per-station count), so I'm not blocking on it, but flagging for a ledger sync per
  CLAUDE.md's "cross-region discoveries propagate to the ledger" rule — the *next* Nico/Luke touch
  on this country should pick it up.

## Hub-lock override (open question for Tim, unresolved either way)
Luke's pack (and the registry entry) locks **Bergen busstasjon** over the oracle report's original
**Byparken** pick — Line 2 never calls at Byparken, confirmed by both the D1 PDFs and Wikipedia's
independent transcription; Byparken and Kaigaten are confirmed-distinct NSR stop-places
(NSR:StopPlace:30859/62130 per hazard-pack.md). I did not need to adjudicate this for the QA pass
since the flip isn't proceeding, but flagging it here so it isn't lost: if/when this pack does
flip, this override still needs Tim's explicit sign-off or veto, per jim-handoff.md's open item 1.

## What I did not do
Did not open a flip PR (item 2 is RED). Did not touch `master`. Did not commit or push the
flip file set. Did not run the full non-smoke `qa/run-all.mjs`. Did not independently confirm
whether Bybanen's `realtime` flag ever turns `true` at a different time of day (peak service) —
recommended as the next step before re-attempting this flip.

## Recommendation
1. Someone (Jim, in a fresh D2-style pass, or a scheduled recheck) re-runs the live sweep at a
   different time of day (e.g. Bergen midday/peak, not right at service start) and separately logs
   the raw per-call `realtime` flag (not just trip count) to settle whether Bybanen ever gets SIRI
   VM/live tracking through Entur, or whether this is a structural, permanent gap for this operator
   in Entur's data.
2. If it's structural: either (a) treat Bergen the same way Goteborg was treated — flip live with an
   explicit, rider-visible standing caveat that boards are schedule-only (same shape as Goteborg's
   "boards are schedule-only until Trafiklab publishes vt TripUpdates"), which is Tim's call to
   make explicitly rather than something I decide unilaterally as fully green; or (b) hold the flip
   until Skyss/Entur wire live tram tracking. I'm not picking between these — flagging for Tim/the
   controller session.
3. Once a decision is made, the flip file set I built and tested (registry status, `live-city-
   api.js` MULTI_CITY_IDS/typedef, `country-regions.js` `bergen: "no"` row, regenerated
   `public/city-directions/bergen.json` + `public/city-manifest.seed.{json,js}`) is straightforward
   to reproduce - none of it needed rework, only the underlying data-quality question blocked this
   pass.
