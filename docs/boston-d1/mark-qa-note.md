# Mark QA note — Boston (`boston`) live-flip request

**Date:** 2026-09-20
**Verdict: RED — do not flip.** Two blocking findings below (board-eligibility rule, and
missing flip-follow-through). Everything else checked green.

## What was checked

| Check | Result | Evidence |
|---|---|---|
| `node qa/boston-planned-gate.mjs` | PASS | `boston-planned-gate: ok (planned/501, adapterReady, D1 pack, 125 stations, hub Park Street, doNotCollapse pairs enforced ..., Perth Australia green)` |
| `node qa/run-all.mjs --smoke` | PASS | 144 PASS · 0 FAIL · 554s (full log tailed; `boston-planned-gate.mjs PASS` present, no other city regressed) |
| DST edge cases | PASS | `BOSTON_TIME_ZONE = "America/New_York"` (real IANA zone, not a fixed-offset hack) — file header explicitly flags "HAS DST … do not copy Perth/Brisbane no-DST" and the shared `gtfs/board.js` DST handling is already exercised by other DST cities in the smoke tier. |
| Hub-lock / doNotGroup | PASS | Park Street locked as the Red×Green hub; Downtown Crossing, Gov't Center, State, South Station, North Station, Haymarket all kept as separate stop-places — asserted directly by `boston-planned-gate.mjs`'s "doNotCollapse pairs enforced" and "hub Park Street" lines, matching `hazard-pack.md` H1/H2/H6. |
| v1 mode cut (subway/rapid-transit only) | PASS (mechanically) — see flag below | `BOSTON_ROUTE_TYPES = ["0","1"]` plus an exact GTFS `route_id` allow-list (`MBTA_ROUTE_ID_TO_LINE`) correctly admits only Red/Orange/Blue/Green-B/C/D/E/Mattapan and excludes Commuter Rail (`"2"`), bus (`"3"`), ferry (`"4"`) at parse time — matches the oracle report's stated cut. |
| Response-shape conformance | PASS | `fetchStationBoard` returns `{ stationName, lastUpdate, trips, realtime: false }`, the same shape used by other schedule-only planned cities (e.g. Copenhagen); `realtime: false` is accurate since no MBTA V3 predictions path is wired. |
| Ledger-consistency check (`docs/country-lane.md`) | N/A | No `docs/united-states-ledger.md` (or equivalent) exists, and none is required: MBTA is a standalone, single-agency feed with no other US region currently in the pipeline overlapping it (Washington/Chicago/BART are separate agencies, untouched, per `jim-handoff.md`) — same "segregated networks" category as AU/NZ/CA, which `docs/country-lane.md` explicitly exempts. |
| Live MBTA feed reachability | N/A by design | The adapter never calls `api-v3.mbta.com` — it is schedule-only static GTFS (`lib/providers/boston.js` file header, confirmed by reading the code). No `MBTA_API_KEY` (or similar) is read from `.env.local`, and none is required for the current code path — `MissingMbtaApiKeyError` exists only for a future live-realtime path that isn't wired. This matches the D1 pack's explicit instruction not to register a key. Flagging for visibility, not as a fail: a live subway flip shipping with **no real-time predictions at all** (schedule-only) is a materially different rider experience than every other city's live boards — worth Tim's eyes before flip, even though it's the documented, deliberate D1/D2 design. |

## Blocking finding 1 — Board eligibility section missing (`docs/board-eligibility-rule.md`)

`docs/boston-d1/oracle-clash-report.md` has **no "Board eligibility" section at all** — not even
the required "No services other than the in-scope operator call at any in-catalog station —
verified" sentence for an empty case. Per the rule (§5, Mark's checklist item 1) this alone is a
blocking gate before any flip-PR, independent of everything else being green.

It's not an empty case here, either. §6 of the rule is explicit that **a second rail network
sharing an in-catalog station is not automatically `out-mode`** — that's the exact "recurred
three times" mistake the rule calls out (Öresundståg/Krösatågen, Vy/Flytoget, S-tog/DSB). Boston
has the same shape:

- **South Station** and **North Station** are both in-catalog subway stops (Red Line / Green &
  Orange respectively — confirmed in `lib/cities/boston/stations.json`).
- MBTA **Commuter Rail** also calls at both. Commuter Rail is walk-up boardable (tickets sold
  on-train or at kiosks/machines, no compulsory seat reservation) and has no check-in/security
  barrier at these stations — i.e. it appears to pass both walk-up tests in §2 of the rule.
- The adapter currently drops all Commuter Rail rows silently and unconditionally at parse time
  (`BOSTON_ROUTE_TYPES = ["0","1"]` excludes GTFS route_type `"2"`), and the D1 pack's
  justification for this is written as a mode cut ("No … Commuter Rail" in `jim-handoff.md`,
  `hazard-pack.md`), not as a tested walk-up/check-in verdict.

This is the task's named hard-fail case: **a walk-up service silently missing from an in-catalog
station's board**, same severity as a hub-lock violation. It may well resolve to a legitimate
`out-product` verdict (Commuter Rail is a materially different fare/ticketing product and a much
lower-frequency service than subway — that's a real candidate reason under §3), but that
determination and Tim's sign-off don't exist yet. Per the rule this has to go back to Nico/Luke to
add the Board eligibility section (with a real tested verdict for Commuter Rail at South
Station/North Station, and confirmation that Silver Line BRT is legitimately `out-mode` as a
genuinely different vehicle type) before this can be re-QA'd for flip.

## Blocking finding 2 — flip follow-through not done (per this task's own guardrails)

Per the flip-PR guardrails: before opening a flip PR I must confirm Jim has already done the
code-side flip follow-through — a `*-dogfood-gate.mjs` replacing the `*-planned-gate.mjs`, a
dogfood module, and the `live-city-api.js` dispatch switch-cases. `docs/boston-d1/jim-handoff.md`
states explicitly this was **not** done, by design, at D2:

> "Follow-through NOT done, by design: no dogfood module, no `live-city-api.js` dispatch wiring,
> no `*-dogfood-gate.mjs`."

Only `qa/boston-planned-gate.mjs` exists; there is no `boston-dogfood-gate.mjs`. Per the flip
instructions this must be flagged back rather than opening an incomplete flip PR (the explicit
Helsinki #164 precedent).

## Not blocking, but worth carrying forward

- Route classification is flagged by Jim as "unverified against a live payload" — a D2 caveat,
  not something Mark can resolve without a live V3 payload; the GTFS static feed load during
  `qa/run-all.mjs --smoke` exercised real MBTA GTFS data end-to-end today and both gates passed,
  which is reasonable confirmatory evidence but not the same as verifying against `api-v3.mbta.com`.

## Suites run

- `node qa/boston-planned-gate.mjs` — PASS
- `node qa/run-all.mjs --smoke` (foreground, 600000ms timeout, output to file, read after
  completion) — 144 PASS · 0 FAIL · 554s
- No background processes or sleep/poll loops were left running; confirmed nothing listening on
  :3000 after the run.

## Recommendation

Do not flip. Route back to Nico/Luke for a Board eligibility section covering Commuter Rail at
South Station/North Station (and Silver Line BRT's out-mode status), and to Jim for the
dogfood-gate/dispatch follow-through — both need to land before Mark can re-run this checklist
green.

---

## Second pass — 2026-09-20

Re-QA against `origin/master` at commit `7c8594c` (PR #414, "Boston: flip follow-through +
Commuter Rail on shared-station boards"), run against the **live** MBTA static GTFS feed and the
**live, unauthenticated** MBTA V3 predictions API (`api-v3.mbta.com`) — no `MBTA_API_KEY` needed
or set. `npm ci` run fresh in this worktree (`node_modules` was missing). No env vars copied — none
required.

### Blocking finding 1 (board eligibility) — RESOLVED

`docs/boston-d1/oracle-clash-report.md` now carries a `## Board eligibility` section with a
verdict row for every service named in the first-pass finding: MBTA Commuter Rail (`in`), Amtrak
Acela/Northeast Regional/Lake Shore Limited (`out-reservation`), CapeFlyer (`in`, but unserved by
the feed — recorded, not silent), MBTA Ferry (`out-mode`), Silver Line (`out-mode`). No
`undecided` rows. `qa/boston-dogfood-gate.mjs` asserts the section exists and enumerates these
same five services (lines 118-125 of the gate).

I sampled the live boards directly rather than trusting the gate alone:

| Station | Subway rows | Commuter Rail rows (live) | Amtrak/Ferry/Silver Line rows |
|---|---|---|---|
| South Station | 48 | 1 (`Fairmount Line + Fairmount`, live V3 prediction) | 0 — none possible, allow-list only contains MBTA CR route ids |
| North Station | 84 | 0 at sample time (see amber below) | 0 |
| Park Street (hub, not CR-eligible) | 48 | 0 (correctly never CR-eligible) | 0 |

Confirmed directly against `api-v3.mbta.com/routes?filter[type]=2`: the live route list is
`CR-Fairmount, CR-NewBedford, CR-Fitchburg, CR-Worcester, CR-Franklin, CR-Greenbush,
CR-Haverhill, CR-Kingston, CR-Lowell, CR-Needham, CR-Newburyport, CR-Providence, CR-Foxboro` — no
Amtrak, no CapeFlyer, confirming the registry note ("CapeFlyer is `in` but NOT served by
api-v3.mbta.com... a feed gap, not a decision") is accurate, and `COMMUTER_RAIL_ROUTES` in
`lib/cities/boston/marketing-directions.js` correctly excludes `CR-Foxboro` (Foxboro Event
Service, non-standard/game-day product) from the allow-list, so it can never render even though
MBTA files it under route_type 2.

**Amber — not a fail:** at sample time (Sat 20 Sep, ~13:44-13:54 America/New_York), North Station
showed **zero** live Commuter Rail departures even though the GTFS schedule has real outbound
trips at 14:15/14:20/14:30. Direct inspection of `api-v3.mbta.com/predictions` showed MBTA was
only publishing arrival-only predictions (`departure_time: null`, terminating inbound trains) at
that moment — no outbound prediction existed yet for a departure ~20-30 minutes out. South
Station's single live departure (`Fairmount Line + Fairmount`, direction 0) only became visible
~3 minutes before its own departure. This is consistent with `fetchCommuterRailTrips`'s documented
design (`docs/board-eligibility-rule.md`'s "no live times, no board" — never fabricate from
static schedule) and is a real characteristic of MBTA's own V3 prediction horizon for
terminus-originating Commuter Rail trips, not an adapter defect — the same code path is what
produced South Station's correct live row. Flagging for Tim's awareness: CR boards at these five
stations can look sparse for 15-30 minute stretches even when service exists shortly, which is a
materially different rider experience from the subway rows on the same board (always populated
from the static schedule). Not a hard fail — no walk-up service was silently dropped; the feed
itself simply hadn't published a prediction yet, same as MBTA's own website would show at that
moment.

### Blocking finding 2 (flip follow-through) — PARTIALLY RESOLVED, new blocking gap found

The dogfood-gate/module/dispatch bundle Jim was asked to land is done and verified:
- `lib/cities/boston/dogfood-next-train.js` exists (`listBostonDogfoodStations`,
  `getBostonDogfoodDirections`, `getBostonDogfoodNextTrain`).
- `boston` dispatch cases exist in `lib/cities/live-city-api.js` (`directionsFor` line 220,
  `getMultiCityNextTrain` line 611) and return identical chips to the dogfood harness
  (`qa/boston-dogfood-gate.mjs` lines 264-269 assert this directly).
- `qa/boston-dogfood-gate.mjs` replaces the retired `qa/boston-planned-gate.mjs`, is registered in
  `qa/run-all.mjs`'s smoke tier, and passes: `node qa/boston-dogfood-gate.mjs` → `boston-dogfood-gate:
  ok (...)`.
- Boston correctly stays `status: "planned"` and is deliberately **not** yet in
  `MULTI_CITY_IDS`/journey-model's persisted lists/`brisbane-dogfood.js`'s mount map — exactly the
  documented "safe ahead of flip" shape, asserted by the gate itself (line 97:
  `isMultiCity("boston") === false`).

**New finding, blocking the flip PR:** Boston is the **first United States city** to reach this
stage, and the flip-commit surface is larger than the "three lists" this task (and CLAUDE.md)
describe. I read `qa/live-city-lists-sync.mjs` (the gate that actually enforces this, registered
in the smoke tier) directly rather than relying on the summary — it checks **eight** independent
copies of "which cities are live," not three:

1. `lib/cities/live-city-api.js` `MULTI_CITY_IDS` — flagged, ready to add "boston".
2. `public/app.js` `NEARBY_MULTI_CITY_IDS` — **not flagged anywhere**, needs "boston" added.
3. `public/app.js` `LIVE_CITY_IDS` — **not flagged anywhere**, needs "boston" added.
4. `public/city-session.js` `MULTI_CITY_IDS` — **not flagged anywhere**, needs "boston" added.
5. `public/city-session.js` picker `COUNTRIES` — **no "United States" country entry exists at
   all** (confirmed: zero matches for "boston" in `public/city-session.js`). Every other live
   city's country (Australia/England/Finland/Norway/Scotland/Sweden/Wales) already has a picker
   entry, built up over each country's own onboarding; Boston has none.
6. `public/city-session.js` `CITY_BOUNDS` — same gap, and **cannot be mechanically derived**:
   `lib/cities/boston/stations.json` carries no `lat`/`lng` on any of its 125 stations (confirmed
   by reading the catalog directly), so there is no data in the D1/D2 pack to compute a bounding
   box from, unlike every other city's `CITY_BOUNDS` entry.
7. `public/journey-model.js` `PERSISTED_CITY_IDS` — flagged, ready to add "boston".
8. `public/journey-model.js` `PERSISTED_COUNTRY_IDS` — flagged for the city list, but the country
   id itself ("us"?) doesn't exist anywhere yet either, because item 5 doesn't exist.

Items 2-6 and 8's country id were never flagged by Jim's handoff or the registry notes (which only
name the three items in item 1/7 as "deliberately deferred to the status-flip commit"). Per this
task's own guardrail — "If that's missing, flag it back rather than opening an incomplete PR" (the
Helsinki #164 precedent) — I'm treating this as a blocking gap rather than authoring the missing
picker/country/bounding-box content myself: the country display name, region label placement, and
especially the `CITY_BOUNDS` geographic box are content/data decisions that need real Boston-area
coordinates and a Jim/Luke call, not something QA should fabricate. Flipping `status` to `"live"`
without these would fail `qa/live-city-lists-sync.mjs` immediately (registered in the smoke tier),
so it isn't a style nitpick — it would break smoke on `main`.

### Everything else re-checked green

| Check | Result | Evidence |
|---|---|---|
| `node qa/boston-dogfood-gate.mjs` | PASS | `boston-dogfood-gate: ok (planned/501, dispatch switch-cases wired ahead of flip, ..., 125 stations, hub Park Street, live MBTA Commuter Rail predictions ..., CR-Foxboro excluded, Amtrak/ferry/Silver Line verdicts match adapter filtering, Perth Australia green)` |
| `node qa/run-all.mjs --smoke` (foreground, 600000ms timeout, output to file) | PASS | 145 PASS · 0 FAIL · 582s; `boston-dogfood-gate.mjs PASS · 11s` present; no other city regressed |
| DST edge cases | PASS (unchanged from first pass) | `America/New_York`, real IANA zone |
| Hub-lock / doNotGroup | PASS (unchanged) | Park Street lock, doNotCollapse pairs enforced by the gate |
| v1 mode cut | PASS (unchanged) | `BOSTON_ROUTE_TYPES` + exact route_id allow-list for subway; Commuter Rail is now a **separate, live, additively-scoped** path per the resolved Board eligibility verdict — does not reopen the subway mode cut |
| Response-shape conformance | PASS | `fetchStationBoard` still returns `{ stationName, lastUpdate, trips, realtime: false }`; Commuter Rail rows are shape-compatible with subway rows (same trip fields) so no UI change needed |
| Ledger-consistency check | N/A (unchanged) | No `docs/united-states-ledger.md`; MBTA is a standalone single-agency feed, no overlapping US region in the pipeline |
| Direction model — Commuter Rail extension | AMBER (Tim review, not a fail) | `mapCommuterRailDestination` in `lib/cities/boston/marketing-directions.js` extends the memo's line+terminus pattern (which only covers subway) to Commuter Rail using each route's own two known termini, e.g. `"Framingham/Worcester Line + Worcester"` / `"...+ South Station"` — reads sensibly, follows the established pattern exactly, never fabricates a raw headsign. `direction-model-memo.md` §3 has no Commuter Rail guidance at all ("Commuter Rail out of this city" — written when CR was out-of-scope); flagging per the task's instruction, not failing it. |
| No live-times-no-fallback rule | PASS | `fetchCommuterRailTrips` only builds a row from a prediction with a non-null `departure_time`; network/parse failures resolve to `[]` (confirmed by reading the function and by the North Station amber above — a real gap in the live feed produced zero rows, not a fabricated one) |

### Suites run

- `node qa/boston-dogfood-gate.mjs` — PASS
- `node qa/run-all.mjs --smoke` (foreground, 600000ms timeout, output redirected to a file, read
  after completion) — 145 PASS · 0 FAIL · 582s
- Manual live-board sampling against `api-v3.mbta.com` (South Station, North Station, Park
  Street) and `api-v3.mbta.com/routes?filter[type]=2` — see evidence above
- No background processes or sleep/poll loops left running; dev server for the smoke run exited
  with the suite; confirmed no other listener left on :3000/:56300 afterward

### Verdict: AMBER-GREEN on QA content, RED on flip-readiness — no flip PR this pass

Every item on Mark's standing checklist (board eligibility, DST, hub-lock, v1 mode cut,
response-shape, ledger-consistency) is green, and both blocking findings from the first pass are
resolved on the merits. But a **new, mechanical blocker** was found while verifying the flip
commit would actually be self-consistent: Boston is a first-in-country flip and the picker
country/`CITY_BOUNDS`/two more `MULTI_CITY_IDS` copies were never prepared, and `CITY_BOUNDS`
can't be built at all without station coordinates the D1/D2 pack never captured. Per this task's
own guardrail, this goes back rather than shipping an incomplete flip PR. **No flip PR opened
this pass.**

Recommended next step (for Jim, not Mark): add `lat`/`lng` to
`lib/cities/boston/stations.json` (or otherwise source a Boston-area bounding box), add a "United
States" entry to `public/city-session.js`'s `COUNTRIES` picker (region `boston`, `comingSoon:
false` since this lands in the same commit as the flip) plus its `CITY_BOUNDS` box, and add
"boston" to `public/app.js`'s `NEARBY_MULTI_CITY_IDS`/`LIVE_CITY_IDS` and
`public/city-session.js`'s own `MULTI_CITY_IDS` — then re-request Mark QA. Everything else in this
note stands; a second re-QA pass should only need to re-verify `qa/live-city-lists-sync.mjs` and
re-run smoke once those are in place.
