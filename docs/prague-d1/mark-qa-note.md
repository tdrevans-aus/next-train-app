# Mark QA note — Prague (Metro A/B/C) flip pre-check, third pass

**Result: GREEN. Flip PR opened.**

Branch: `mark/prague-flip-3` off `origin/master` @ `0b14d5a6` (#497 automatic not-served detection
from the static feed merged). Run window: ~05:45-06:12 UTC (~07:45-08:12 Europe/Prague, weekday
morning peak), 28 Sep 2026. `GOLEMIO_API_KEY` copied from the main checkout's `.env.local`. No
fixes attempted — flagging only, per QA lane rules; this pass found everything green so a flip PR
follows.

## 1. Board eligibility — PASS

`docs/prague-d1/oracle-clash-report.md` "Board eligibility" section: Metro A, B, C all verdict
`in` (open honor-system boarding, pre-boarding validators not gate barriers, no compulsory
reservation, no check-in barrier). No `undecided` rows anywhere in the section. Non-metro modes
(trams, buses, Esko, funicular) are out-of-mode by catalog definition, no verdict owed per
`docs/board-eligibility-rule.md`.

`lib/cities/prague/coverage.json` documents the 5 not-currently-served stations (Flora +
Budějovická/Kačerov/Pankrác/Roztyly) with the DPP "Omezení a mimořádné události" notice reference,
the replacement bus XC routing, and explicit "the app detects this automatically... and will
resume showing live departures the moment the feed does, with no app change needed" language for
both the Flora long-term case and the dated Line C closure.

## 2. Live-only grep — PASS

`lib/providers/prague.js` — board content is built exclusively from the live Golemio response:

```
385  const departures = options.departures ?? (await fetchDepartureBoardsJson(stopIds, options.apiKey));
386  const trips = tripsFromDepartures(departures, catalogEntry.name, now);
```

The only two uses of the static PID GTFS snapshot at request time (`loadPragueStatic()`) are both
side-computations that never populate `trips[]`:

- `computeScheduledCandidates()` (only called when `trips.length === 0`) — feeds `scheduledCandidates`
  and drives `emptyReason: "no-live-predictions"`.
- `computeNotServedToday()` (only called when `computeScheduledCandidates` also found nothing) —
  drives `emptyReason: "not-currently-served"` + `notServedMessage`.

`realtime: "live"` is set unconditionally on every returned board (line 426). No
`MissingGolemioApiKeyError` bypass found — `fetchDepartureBoardsJson` throws before any board is
built when the key is absent (`readGolemioApiKey()` inside `golemioAuthHeaders`).

## 3. `qa/prague-all-stations-live-sweep.mjs` — PASS

`node --env-file=.env.local qa/prague-all-stations-live-sweep.mjs`, ~05:51-06:00 UTC (weekday
morning peak, Europe/Prague). 58 stations, 122 stop_ids, 3 batches/poll, 9 polls over 9 minutes.

- **0 rate-limit (429) errors** across the entire run.
- **Exactly the 5 documented not-currently-served stations** (Budějovická, Flora, Kačerov,
  Pankrác, Roztyly) reported `observedNonEmpty: false` — each carries `notServed: true` in the
  evidence log and is reported by the script as an expected pass, not a coverage gap.
- **Every other station (53/53) had `observedNonEmpty: true`** — at least one non-empty poll
  across the 9-poll run. 16 of those 53 were in a short empty streak at the tail end of the run
  (1-3 minutes, well under the 15-minute/1.5x-headway threshold) — ordinary headway variance
  between polls, not a gap; none reached "uncertain"/"intermittentLong"/"staleGap" severity.
- Script exit: 0 ("ok — every catalog station either had live trips, was a documented
  not-currently-served station, a long intermittent gap backed by evidence-memory, or is still
  within its uncertain window").
- Appended evidence entry `sweep-2026-09-28T05:51:13.460Z` to `docs/prague-d1/live-sweep-log.jsonl`
  (committed with this note).

This is the exact shape the second QA pass (`origin/mark/prague-flip-2`) flagged as a hard fail —
Budějovická/Kačerov/Pankrác/Roztyly showing 18/18 empty polls with `emptyReason: null` and no
coverage-note exclusion. #495/#497 fixed it (automatic `notServed` detection from the static
feed's own per-day calendar, `emptyReason: "not-currently-served"`); this run confirms the fix
holds against a fresh live sweep.

## 4. Rider-facing `/api/board` + `/api/directions`, flip-commit state — PASS

Applied the flip file set locally (registry `status: "live"`, `country-regions.js` cz entry,
`live-city-api.js` MULTI_CITY_IDS, regenerated `city-directions/prague.json` +
`city-manifest.seed.{json,js}`), started a dev server on port 3455 (3400 is Tim's other project —
left untouched), and sampled all 14 stations named in the brief with `GOLEMIO_API_KEY` live and
paced (2s between requests, one station at a time — see the concurrency note below for why paced,
not simultaneous).

- **Latency:** all 14 requests 658ms-1230ms, well under 3s.
- **Counts > 0 where served:** every served station returned >= 1 direction with a populated
  `next` (Kobylisy/Pražského povstání/Chodov/Letňany/Háje all showed real live Line C times
  despite sitting either side of the Line C closure window).
- **Not-served stations carry `emptyReason` + message, and the UI renders it:** Kačerov and Flora
  both returned `emptyReason: "not-currently-served"` on every direction, with a full
  `emptyReasonMessage` (e.g. Kačerov: "No metro service at this station at the moment — Line C
  section closure for track repair (Pražského povstání – Chodov); replacement bus XC runs
  Pražského povstání – Pankrác – Budějovická – Kačerov – Roztyly – Dědinova – Chodov."). The
  `not-served` fixture case in `qa/honest-empty-state.mjs` (part of the green smoke run below)
  proves the client renders this verbatim as the hero's "No service at this station at the
  moment" title + body — this is the same code path, not a parallel one.
- **No self chips:** Muzeum/Můstek/Florenc never offer themselves or each other as a direction.
  Nemocnice Motol/Depo Hostivař/Zličín/Černý Most (line termini) each only offer the single
  opposite-end direction, never their own name.
- **Short-turn chips only where reachable:** Háje offers `C + Letňany` and `C + Chodov` (not
  `C + Pražského povstání`, unreachable from Háje's side); Letňany offers `C + Pražského povstání`
  and `C + Háje` (not `C + Chodov`); Kobylisy (mid-line, north of both short-turn points) offers
  all three of Letňany/Pražského povstání/Háje but correctly not Chodov; Kačerov (inside the
  closed section) only ever offers Letňany/Háje (never the two short-turn termini it can't
  reach), on both of which it correctly carries `not-currently-served`.
- **No bare A/B/C:** every direction across all 14 stations' responses is `<line> + <terminus>` —
  zero bare line-letter chips observed.
- `/api/directions` sampled directly for Muzeum, Kačerov, Háje — matches the `/api/board`
  direction lists exactly.

**Concurrency note (not a blocker, flagged for awareness):** an initial rapid back-to-back sweep
of all 14 stations with no pacing produced real Golemio 429s (each `/api/board` call fetches one
direction at a time via N independent Golemio requests, N = directions at that station, up to 5 at
Muzeum/Florenc/Můstek, with no per-station caching across directions within one request) — the
failing directions were silently dropped from the `entries` array rather than surfacing an error,
because Prague's `fetchDepartureBoardsJson` throws a plain `Error`, not the shared
`FeedUnavailableError` (`lib/providers/gtfs/errors.js`) that `api/board.js`'s all-directions-failed
check specifically looks for — so a total Golemio outage or a missing/invalid key would currently
render as a quietly empty `entries: []` (200 response) rather than the intended 503 "Live times
are temporarily unavailable." Re-tested with 3 concurrent single-station requests (14 simultaneous
Golemio calls in under 1 second, simulating three riders loading different interchange stations at
once) — this realistic burst succeeded with 0 errors, comfortably under Golemio's 15-20/8s budget.
Not treating this as a flip blocker: (a) it reproduces the exact request-multiplication pattern
already shipped and live for every other bespoke-single-station-JSON adapter (Vienna, Washington,
Dublin, Boston) — none of which wrap their fetch errors in `FeedUnavailableError` either, so this
is an existing, accepted architecture choice, not a Prague-specific regression; (b) a realistic
concurrent-user burst passed cleanly. Recorded under "Decisions for Tim" in the PR as a
scalability/observability item worth a follow-up brief, given Golemio's rate limit (20 req/8s) is
tighter and better-documented than the other bespoke adapters' feeds.

## 5. Hub lock / doNotGroup / timezone / terminus mapping / error propagation — PASS

- Hub lock: Muzeum (A x C) never appears as a direction token anywhere in the sampled boards or
  `marketingLabelsForStation` output; `isForbiddenHubProxy`/`HUB_PROXY_FORBIDDEN` also block
  Můstek/Florenc standing in for it. Můstek (A x B) and Florenc (B x C) doNotGroup against Muzeum
  and each other — confirmed in `lib/cities/prague/marketing-directions.js` and exercised by
  `qa/prague-dogfood-gate.mjs`.
- `PRAGUE_TIME_ZONE = "Europe/Prague"` (IANA), used via `Intl`-backed `toLocaleTimeString`/
  `formatClock` — no fixed-offset arithmetic; Europe/Prague DST (CEST/CET) is explicitly called
  out in both the adapter and `marketing-directions.js` file headers as a "do not copy
  Perth/Brisbane/Auckland no-DST handling" warning.
- `mapLineTerminusDestination`/`resolveTerminus` only ever return a name drawn from `LINE_TERMINI`
  or the bare line label — never the raw Golemio `headsign` string — so an unexpected/garbage
  headsign can never leak into a direction chip. Confirmed both by code inspection and by the live
  sample (every direction across 14 stations was `<line> + <known terminus>` or absent, never a
  raw string).
- Golemio errors propagate out of `fetchStationBoard`/`fetchDepartureBoardsJson` as thrown
  exceptions with `.status`/`.retryAfterMs` attached (not swallowed at the adapter level) — see
  the concurrency note above for the one nuance: they propagate as exceptions correctly, but
  `api/board.js`'s per-direction `Promise.all` + `entries.filter((e) => e.data)` converts an
  individual direction's failure into a silent omission rather than a rider-visible error, because
  the thrown error type isn't `FeedUnavailableError`. Not unique to Prague (see above).

## 6. Registry-driven, first city in Czechia — PASS

Applied the flip commit's `lib/cities/country-regions.js` change (`prague: "cz"`,
`cz: "Czechia"`, `"cz"` inserted into `COUNTRY_ORDER` after `"gb-eng"`) and confirmed via
`/api/cities`:

```
{
  "id": "prague", "displayName": "Prague", "status": "live",
  "country": { "id": "cz", "name": "Czechia" },
  "timeZone": "Europe/Prague",
  "bounds": { "minLat": 50, "maxLat": 50.15, "minLng": 14.27, "maxLng": 14.6 },
  "modes": ["metro"], "nearbyEligible": true, "directionsVersion": "8a0be7c6"
}
```

`node qa/country-regions-sync-gate.mjs` and `node qa/live-city-lists-sync.mjs` both pass (42
entries, consistent across registry/live-city-api/manifest). No client-file edit was needed —
`registry-driven-client.mjs`'s Playwright suite (fixture city appears with zero code change,
manifest caching, offline reload, seed fallback, retired-city-id persistence) all passed.

`lib/cities/city-bounds.js` already carried a `prague` box from Jim's flip-follow-through pass
(`minLat: 50.00, maxLat: 50.15, minLng: 14.27, maxLng: 14.60`) — no change needed there.

## Not currently served

- **Flora** (Metro A, between Jiřího z Poděbrad and Želivského): long-term station
  reconstruction, since 2 Feb 2026, until further notice — trains pass through without stopping.
  Confirmed via a fresh GTFS dump (zero metro stop_times reference either platform id, any
  service_id) and 9/9+9/9 clean live Golemio polls across two independent sessions. Replacement:
  nearby trams 10/11/16 (Náměstí Míru), 13 (Jiřího z Poděbrad), 16 (Želivského).
- **Budějovická, Kačerov, Pankrác, Roztyly** (Line C, consecutive): DPP's "Omezení a mimořádné
  události" notice — Metro C bidirectionally suspended Pražského povstání–Chodov, Sat 26 Sep 2026
  04:30 to Mon 28 Sep 2026 23:59, for track repair. Replacement bus XC runs
  Pražského povstání–Pankrác–Budějovická–Kačerov–Roztyly–Dědinova–Chodov. Confirmed against the
  live PID GTFS static snapshot: every trip referencing these four stations' platform ids belongs
  to a service_id whose `calendar.txt` start_date is 2026-09-29 — the current feed period
  genuinely has zero scheduled visits until then.
- **Automatic reopening:** `hasScheduledServiceToday()` re-checks today's active calendar on every
  empty-board request; the moment PID's feed shows a station served again (29 Sep 2026 for the
  four Line C stations; indefinitely for Flora, until PID's own data changes), `emptyReason`
  simply stops being set — no app code change, no date ever hardcoded, no manual re-flip needed.

## Short-turns

Line C carries two genuine short-turns, both promoted to first-class `LINE_TERMINI` chips (not
left as a bare `"C"` fallback): southbound trips terminating early at **Pražského povstání**, and
northbound trips originating at Háje/Opatov and terminating early at **Chodov**. Each chip is
restricted to the stations its trip can actually reach (`isTerminusReachableFromStation`/
`SHORT_TURN_DIRECTION`) — confirmed live in section 4 above (Háje/Letňany/Kobylisy each offer the
correct subset). Lines A and B show no short-turn headsigns in any live sample to date
(`shortTurns: []` remains correct for both, flagged in the adapter's own comments as a
live-sample-of-one rather than an exhaustive schedule audit).

## 7. Gates at flip state — PASS

All run with the flip file set applied locally (status live, country-regions cz entry,
MULTI_CITY_IDS, regenerated city-directions/manifest):

- `node qa/prague-dogfood-gate.mjs` — PASS
- `node qa/live-city-lists-sync.mjs` — PASS (42 live cities consistent)
- `node qa/country-regions-sync-gate.mjs` — PASS (42 entries consistent)
- `node qa/registry-driven-client.mjs` — PASS (Playwright suite, 5/5 cases)
- `node qa/coverage-notes-gate.mjs` — PASS (42 live cities, valid coverage.json)
- `node qa/honest-empty-state.mjs` — PASS (passed inside the `--smoke` run; standalone invocation
  needs a running dev server on :3000, which wasn't up at that moment — not re-run standalone
  since the smoke run already exercises it end-to-end with its own server)
- `node qa/run-all.mjs --smoke` (PLAIN, own dev server, explicit 600000ms timeout) —
  **165 PASS · 0 FAIL · 599s**, full run completed (not truncated/backgrounded)

## 8. Vercel

Per this task's dispatch: the controller has confirmed `GOLEMIO_API_KEY` is present on Vercel
production. I had no Vercel tool access in this session to independently re-verify it myself —
recording the controller's confirmation here as instructed, and flagging that an independent
check before merge is still worthwhile given this is Prague's first live traffic against a
20-requests/8-seconds-per-key feed.

## Decisions for Tim

- **Golemio API ToS commercial-use/redistribution terms were not independently verified**
  (flagged since D1/D2, still open per `docs/prague-d1/jim-handoff.md` and the registry notes) —
  the oracle report's license section recommends Tim review before flip. Not re-resolved this
  pass; recorded here as the standing item.
- **Request-multiplication under concurrent load** (see item 5): `/api/board` fetches Golemio
  once per direction with no per-station caching or pacing, and a failed direction is silently
  dropped rather than surfaced as an error (the adapter throws a plain `Error`, not the shared
  `FeedUnavailableError` that would trigger the 503 path). Not a flip blocker — it's the same
  shape already live for Vienna/Washington/Dublin/Boston, and a realistic 3-station concurrent
  burst (14 simultaneous Golemio calls) passed cleanly — but Golemio's limit is unusually tight and
  well-documented (20 req/8s) relative to those other feeds, so it may be worth a dedicated
  brief post-flip (batch fetchStationBoard per station across directions, and/or wrap Golemio's
  non-2xx responses in `FeedUnavailableError` so an outage reads as "temporarily unavailable"
  rather than a quietly incomplete board).

## Verdict

**GREEN.** All eight checklist items pass against the flip-commit state, live GOLEMIO_API_KEY
traffic during Prague weekday morning peak, and a full `--smoke` run (165/165). Flip PR opened per
`docs/live-flip-checklist.md` — not merged.
