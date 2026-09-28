# Mark QA note — Prague (Metro A/B/C) flip pre-check

**Result: NOT GREEN. Do not flip. No flip PR opened.**

Branch: `mark/prague-flip` off `origin/master` @ 979c0a9f (#488 adapter, #493 short-turn chips
merged). Run window: ~04:38-05:10 Europe/Prague, 28 Sep 2026 (metro opening -> early service).
GOLEMIO_API_KEY present in local `.env.local` copy. No fixes attempted — flagging only, per QA
lane rules.

## 1. Board eligibility — PASS

`docs/prague-d1/oracle-clash-report.md` "Board eligibility" section: all three metro lines
(A, B, C) verdict `in`, no `undecided` rows. Rationale recorded (open honor-system boarding,
pre-boarding validators not gate barriers, no compulsory reservation/check-in). No excluded
metro services in v1; trams/buses/regional rail/funicular/ferries are out-of-mode by catalog
definition (never called at an in-catalog metro station), so no verdict is owed for them per
`docs/board-eligibility-rule.md`.

## 2. Live-only — PASS

`grep -n "realtime:\|loadGtfsStatic\|stop_times" lib/providers/prague.js`: no departure time is
ever read from static GTFS on the request path (the file header explicitly documents static GTFS
is D2-only, resolved once into `stations.json`, never read at runtime). Board-level
`realtime: "live"` is set unconditionally in `fetchStationBoard()`. `MissingGolemioApiKeyError`
path exists in `lib/providers/gtfs/auth.js` and propagates (no silent fallback) — confirmed by
`prague-dogfood-gate.mjs`'s "missing-key throws surfaced consistently across dogfood/dispatch/
directions/next-train" assertion.

## 3. `qa/prague-all-stations-live-sweep.mjs` — RED

Ran `node --env-file=.env.local qa/prague-all-stations-live-sweep.mjs` for real against the live
Golemio API, starting ~04:38 Europe/Prague (metro just opened, per brief). Full 9-poll, ~9-minute
run completed; evidence appended to `docs/prague-d1/live-sweep-log.jsonl` (committed on this
branch).

**Finding A — the sweep script does not pace requests to Golemio's own documented rate limit
(20 requests / 8 seconds per key).** `sweepOnce()` in `qa/prague-all-stations-live-sweep.mjs`
calls `fetchStationBoard()` once per station, sequentially, with no delay and no batching — even
though the Golemio endpoint accepts up to 100 `ids[]` per request and the adapter already resolves
each station to 2-4 stop_ids. 58 sequential single-station requests every 60-second poll blew
through the rate limit on every poll: 18-29 of 58 stations returned HTTP 429 on 8 of the 9 polls.
The final poll alone had 24/58 stations erroring, which the script correctly treats as a hard
failure (`24/58 station(s) threw an error on the final poll`), but this means the sweep cannot
currently produce clean evidence at all — this is a QA-script gap (should batch stop_ids into
one request per poll, or add pacing/backoff), not a live-feed problem. Flagging for Jim, not
fixing.

**Finding B — Flora is confirmed empty on every clean poll (9/9), and Prague has no
honest-empty-state support at all.** Flora never errored (9/9 clean polls) and returned zero
trips every time — consistent with Jim's independent D2 static-GTFS finding (zero `stop_times`
rows reference either of Flora's platform stop_ids in the 28 Sep 2026 snapshot). But
`lib/providers/prague.js`'s `fetchStationBoard()` never sets `emptyReason` on its return value —
grep confirms `emptyReason` exists in this repo only for `lib/providers/dublin.js` and the shared
`lib/train-times-core.js` plumbing that reads it; Prague's adapter and
`lib/cities/prague/dogfood-next-train.js` never populate or forward it. Per this session's brief
and `docs/jim-brief-dublin-honest-empty-state.md`'s precedent: an empty in-catalog station during
service only passes with `emptyReason: "no-live-predictions"` present on the rider-facing board,
or a coverage-note exclusion (Connolly precedent) if the gap is a genuine, permanent schedule
fact rather than a feed gap. Prague does neither — a rider opening Flora's board today sees a
silently empty board with no explanation. This is a hard fail, same severity class as a hub-lock
violation per this task's brief. Not fixed here; needs either (a) `emptyReason` wired through
Prague's adapter + dogfood/board path, or (b) if Tim/Jim confirm the closure is not transient, a
coverage-note exclusion for Flora.

**Finding C — a contiguous stretch of Line C (Budějovická, Kačerov, Roztyly) was also empty on
every clean poll, plus Pankrác and Petřiny got zero clean polls at all (100% errored, no
evidence).** This run only covered the metro's opening ramp-up (~04:38-04:47 local, first ~9
minutes after service start), not "full service by ~05:30" as the brief anticipated — so these
results are inconclusive, not confirmed permanent gaps: they may simply reflect first trains not
yet having reached the southern end of Line C, compounded by Finding A's rate-limit contamination
wiping out Pankrác/Petřiny's data entirely. Needs a clean re-run (after Finding A is fixed) during
full daytime service before any verdict on these five stations.

52/58 stations were confirmed genuinely live (non-empty at least once across the clean polls
they got), which is a reasonable evidence base for the adapter's live-wiring in general — the
concerns above are specifically about Flora's honest-empty-state gap and the sweep's own rate-limit
handling, not about whether Golemio integration works at all.

## 4. Rider-facing `/api/board` + `/api/directions` — PASS (sampled; see caveat)

To test the actual rider-facing response path (not just `fetchStationBoard()` in isolation), I
made a temporary, uncommitted, local-only edit — `registry.js` `status: "live"` +
`live-city-api.js` `MULTI_CITY_IDS`/typedef — started a dev server, sampled endpoints with 3-5s
pacing between requests to stay under Golemio's rate limit, then reverted both edits before this
note (`git status` on the branch shows only the untracked evidence-log addition; nothing else
changed).

- `/api/board?city=prague&station=<Muzeum|Můstek|Florenc>`: all 200, <1.6s. Response shape is the
  standard multi-direction dogfood board (`entries[].direction`/`.data.next|following|upcoming`),
  not a raw trip list. Florenc showed exactly `B + Zličín`, `B + Černý Most`, `C + Letňany`,
  `C + Pražského povstání`, `C + Háje` — no bare `"B"`/`"C"` chip, no self-referential chip (no
  station ever names itself), no cross-line leak.
- `/api/directions?city=prague&station=Muzeum`: `["A + Nemocnice Motol","A + Depo Hostivař","C +
  Letňany","C + Pražského povstání","C + Háje"]` — correctly omits `C + Chodov` (Muzeum's line-C
  index is north of Chodov, so that short-turn can never reach it).
- `/api/directions?city=prague&station=Pankrác` and `...station=Roztyly`: both return only
  `["C + Letňany","C + Háje"]` — confirmed Pankrác never offers `C + Pražského povstání` and
  Roztyly never offers `C + Chodov`, exactly as the reachability guard intends.
- `/api/directions?city=prague&station=Depo Hostivař` / `Chodov`: neither offers a chip naming
  itself.
- `/api/directions?city=prague&station=Háje`: `["C + Letňany","C + Chodov"]` — correctly omits
  `C + Pražského povstání` (Háje is south of it, boarding there only ever heads north).

Caveat: only sampled a subset of the 11 stations named in the brief (Muzeum, Můstek, Florenc,
Depo Hostivař, Chodov, Háje, Pankrác, Roztyly) due to the same Golemio rate-limit ceiling as
Finding A above — did not additionally sample Letňany, Nemocnice Motol, Zličín, Černý Most.
Dispatch/board timing for these is expected to behave identically (same code path), but wasn't
independently reconfirmed this session.

## 5. Hub lock / doNotGroup — PASS (code + live sample)

`lib/cities/prague/marketing-directions.js`: Muzeum is `PRAGUE_HUB`, never present in any
`LINE_TERMINI` entry; Můstek/Florenc are `HUB_PROXY_FORBIDDEN` and doNotGroup against Muzeum and
each other. Confirmed live above: Florenc's board never offered a Florenc/Můstek/Muzeum chip.
Europe/Prague IANA zone used throughout (`PRAGUE_TIME_ZONE = "Europe/Prague"`), DST-aware per
hazard-pack.md H7 (no Perth/Brisbane-style no-DST copy).

## 6. Terminus mapping / error propagation — PASS

`resolveTerminus()` only ever returns a name already present in `LINE_TERMINI`, so an unexpected
live headsign can never leak into a direction chip (falls back to the bare line label, per file
header). `fetchDepartureBoardsJson()` throws on any non-OK HTTP response rather than returning a
synthetic/empty board — confirmed by the Finding-A 429s propagating as thrown errors in the sweep,
not silent empties.

## 7. Registry-driven client — PASS (checked in flip-commit state, then reverted)

With the temporary local flip edit in place, `directionsFor`/`isMultiCity` correctly recognized
Prague once added to `MULTI_CITY_IDS` (item 4's endpoint tests above ran against this state).
Picker/country-regions wiring is unaffected since Prague adds a new country (Czechia) and that
file was intentionally not touched pre-flip, matching Dublin/Vienna/LA precedent. `coverage.json`
is present and accurate for Metro-only scope, but does not yet mention the two short-turn termini
(Pražského povstání, Chodov) in its rider-facing prose — minor, worth a one-line addition at flip
time, not a blocker on its own given items above already block flip.

Caveat: did not run `write-city-directions.mjs --only=prague` or `write-city-manifest.mjs` this
session (no flip commit was made — reverted the temporary edit before any regeneration), so the
regenerated-artifact gates (`bundled-city-directions.mjs`, `live-city-lists-sync.mjs`'s
seed-matches-script check) were not exercised in the flip-commit state. Re-run these once Findings
A and B are fixed.

## 8. Gates — PASS (current, pre-flip commit state)

- `node qa/prague-dogfood-gate.mjs` — PASS (status-agnostic, synthetic payloads; includes
  short-turn reachability assertions).
- `node qa/live-city-lists-sync.mjs` — PASS (41 live cities consistent; Prague correctly absent,
  still planned).
- `node qa/country-regions-sync-gate.mjs` — PASS (41 entries consistent).
- `node qa/registry-driven-client.mjs` — PASS (all 5 Playwright checks green).
- `node qa/coverage-notes-gate.mjs` — PASS (41 live cities all have valid coverage.json).
- `node qa/run-all.mjs --smoke` (plain, timeout 600000, foreground) — 164 PASS, 0 FAIL, 598s.
  No service-hours flakiness observed.

## Verdict

RED on item 3 (Finding A: sweep script doesn't pace Golemio requests, so it cannot currently
produce clean evidence; Finding B: Flora is a confirmed silent-empty-board hard fail with no
honest-empty-state support in this adapter, same severity as a hub-lock violation per this
session's brief) plus an open, not-yet-reconfirmed question (Finding C: five stations' empty/
error results this run are contaminated by both the rate limit and running only in the metro's
opening minutes, not full service).

Per the QA lane rule: flagging, not fixing. No flip PR opened. Recommend a fresh Jim pass to:
(1) fix `qa/prague-all-stations-live-sweep.mjs` to batch stop_ids (Golemio supports up to 100 per
request) or add pacing/backoff so it respects the documented 20 req/8s limit; (2) decide and wire
either `emptyReason` support for Prague or a coverage-note exclusion for Flora, matching whichever
the Dublin/Connolly precedent implies once Flora's closure is confirmed transient or permanent;
then (3) Mark re-runs the sweep during full daytime service to clear Finding C and re-confirm
Finding B's resolution, before any flip PR is opened.

## Vercel / decisions for Tim

Not checked this session (no Vercel tool available in this run, and the overall result is
already RED so this isn't currently gating). Whoever re-runs this QA pass once Findings A/B/C are
resolved should confirm GOLEMIO_API_KEY is set on Vercel before opening the flip PR — it is a
flip prerequisite either way (Golemio ToS commercial-use review, flagged since D1/D2, is also
still open per jim-handoff.md and should be resolved or explicitly waived by Tim before flip).

## Housekeeping

All dev servers I explicitly started (ports 3777, 3778) and one QA-suite auto-picked port I could
identify and attribute (3801, from one of the individual gate runs) were killed before finishing.
One additional node.exe (PID 79524) was found listening on port 3400 at session end — plausibly
another auto-picked QA-suite dev server left over from one of this session's gate/smoke runs, but
I could not positively attribute its start time/commandline (no wmic/PowerShell available in this
shell) and the environment's own safety classifier refused the taskkill on it ("Interfere With
Workloads"), so I left it running rather than force it. Whoever picks this up next should check
`netstat -ano | grep :3400` and close it if it's confirmed stale.
