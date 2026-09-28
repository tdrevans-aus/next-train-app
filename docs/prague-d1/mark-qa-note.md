# Mark QA note — Prague (Metro A/B/C) flip pre-check, second pass

**Result: NOT GREEN. Do not flip. No flip PR opened.**

Branch: `mark/prague-flip-2` off `origin/master` @ 138dcd53 (#495 Flora fix / paced sweep / honest
empty state merged). Run window: ~06:07-06:25 Europe/Prague, 28 Sep 2026 (weekday morning peak,
claimed 2-4 min headways). `GOLEMIO_API_KEY` present in local `.env.local` copy, sourced from the
main checkout. No fixes attempted — flagging only, per QA lane rules.

## 1. Board eligibility — PASS

`docs/prague-d1/oracle-clash-report.md` "Board eligibility" section: all three metro lines (A, B,
C) verdict `in`, no `undecided` rows anywhere in the section. Rationale recorded (open honor-system
boarding, pre-boarding validators not gate barriers, no compulsory reservation/check-in). No
excluded metro services in v1; non-metro modes are out-of-mode by catalog definition, no verdict
owed per `docs/board-eligibility-rule.md`.

## 2. Live-only grep — PASS

`lib/providers/prague.js`: `emptyReason` is set only from `computeScheduledCandidates()` (a static
GTFS side-computation, never board content):

```
330  let emptyReason = null;
331  let scheduledCandidates = null;
332  if (trips.length === 0) {
333    scheduledCandidates =
334      "scheduledCandidates" in options
335        ? options.scheduledCandidates
336        : await computeScheduledCandidates(stopIds, catalogEntry.name, now, options.horizonMinutes);
337    if (Array.isArray(scheduledCandidates) && scheduledCandidates.length > 0) {
338      emptyReason = "no-live-predictions";
339    }
340  }
```

Actual `trips[]` content (`mapDepartureToTrip`/`tripsFromDepartures`, lines 175-236) is built
exclusively from the live Golemio `departures[]` response — no static GTFS field ever populates a
`liveDeparture`/`displayTime`. `realtime: "live"` is set unconditionally (line 347). No
`MissingGolemioApiKeyError` bypass found.

## 3. `qa/prague-all-stations-live-sweep.mjs` — RED (hard fail)

Ran `node --env-file=.env.local qa/prague-all-stations-live-sweep.mjs` for real against the live
Golemio API, ~06:15-06:24 Europe/Prague (full weekday morning service, well past opening
ramp-up). 57 stations, 120 stop_ids, 3 batches/poll, 9 polls over 9 minutes.

- 0 rate-limit (429) errors across the entire run — Finding A from the first pass is confirmed
  fixed.
- Script exit: 0 ("ok"). 18 stations were in a continuous empty streak at the end of the run but
  most (14 of 18) had at least one non-empty poll earlier in the run (`nonEmptyPolls > 0` in the
  evidence log) — not a coverage problem, just short local gaps inside a 2-4 min headway window.
  Full list and per-station non-empty counts appended to `docs/prague-d1/live-sweep-log.jsonl`
  this run (`sweep-2026-09-28T04:15:33.804Z`).

But four stations — Budějovická, Kačerov, Pankrác, Roztyly — were empty on every single poll
(0/9) this run, AND were also empty on every single poll (0/9) in the committed prior run
(`sweep-2026-09-28T03:42:30.594Z`, Jim's ~05:42 sweep). That is 18/18 polls empty across two
independent runs, ~30 minutes apart, both during confirmed weekday peak service on Line C (all
four are Line C stations). `docs/prague-d1/live-sweep-log.jsonl` shows `nonEmptyPolls: 0`,
`observedNonEmpty: false` for all four in both entries — there is no non-empty observation for
these four stations anywhere in the evidence log. Per this session's brief: "a station empty on
every poll needs a coverage-note exclusion instead (Connolly precedent)" — this is exactly that
shape, and it is a hard fail, same severity as a hub-lock violation, regardless of the sweep
script's own exit code (it reports these as "uncertain" only because its 9-minute runtime cap is
shorter than the 15-minute/1.5x-headway threshold needed to call it a `staleGap` on a single run —
but two separate runs already agree).

Confirmed this is not a QA-script artifact — checked directly against the adapter and the raw
Golemio API:

```
$ node --env-file=.env.local -e "fetchStationBoard('Kačerov')..."
Kačerov trips: 0 emptyReason: null scheduledCandidates: 0
Pankrác trips: 0 emptyReason: null scheduledCandidates: 0
Budějovická trips: 0 emptyReason: null scheduledCandidates: 0
Roztyly trips: 0 emptyReason: null scheduledCandidates: 0
```

`emptyReason` is `null` for all four — the honest-empty-state fix does not cover this case,
because the static-schedule side-computation (`computeScheduledCandidates`) also finds zero
candidates for them right now (`scheduledCandidates: 0`, not the `null`/failed-load sentinel —
the static load succeeded, it just found nothing to schedule near "now" for these four stop_ids
either). A rider opening any of these four stations' boards today sees a silently empty board with
no explanation — exactly the failure mode the honest-empty-state rule exists to prevent, and it
currently slips through because Prague's static-coverage gate only checks "does this station have
>= 1 stop_time ever" (which Kačerov/Pankrác/Budějovická/Roztyly presumably pass, being real,
long-standing Line C stations), not "does the static schedule expect anything right now."

Ruled out a stop-id/mapping bug directly against the raw HTTP response (not just the adapter):

```
$ curl .../departureboards?ids[]=U228Z101P&ids[]=U228Z102P  (Kačerov's own stopIds from stations.json)
{ "stops": [{ "stop_id": "U228Z101P", "stop_name": "Kačerov", ... },
             { "stop_id": "U228Z102P", "stop_name": "Kačerov", ... }],
  "departures": [], "infotexts": [] }
```

The queried stop_ids correctly resolve to Kačerov by name (not a mismatched/wrong id), HTTP 200,
no `infotexts` explaining a closure — Golemio itself is reporting zero live departures for a real,
correctly-identified station during claimed 2-4 min-headway peak service. This is the same shape
as the Flora finding (`docs/jim-brief-prague-flora-sweep-empty-state.md`) — a real, current
zero-service gap or a static/live data mismatch for these four stop_ids specifically — not
something Mark can resolve by re-running QA. It needs the same investigation Flora got: a direct
GTFS `stop_times.txt` dump for these four stop_ids to determine whether this is (a) a genuine
current service gap (coverage-note exclusion, Connolly/Flora precedent) or (b) a stop_id
resolution bug distinct from the id-by-name check already done for Flora (fix the mapping).

Stations.json entries for the four (for whoever picks this up):
```
Budějovická: ["U50Z101P","U50Z102P"]
Kačerov:     ["U228Z101P","U228Z102P"]
Pankrác:     ["U385Z101P","U385Z102P"]
Roztyly:     ["U601Z101P","U601Z102P"]
```

The 8 other stations Jim's 05:40 sweep left "uncertain" (Háje, Hůrka, Invalidovna, Kobylisy,
Malostranská, Nemocnice Motol, Nové Butovice, Rajská zahrada) did resolve this run — all eight
show `observedNonEmpty: true` in both the prior and this run's evidence-log entries. Only the four
above remain unresolved, and unresolved now means "confirmed empty across 18/18 polls over two
independent runs," not "needs more time."

## Items 4-8 — not re-run this session

Given item 3 is a hard fail (same severity class as a hub-lock violation per this task's brief),
and the QA lane rule is flag-not-fix with no partial flip, I stopped here rather than re-running
the rider-facing `/api/board`/`/api/directions` sampling, the registry-driven-client checks, and
the full gate suite a second time. The first pass (`origin/mark/prague-flip`,
`docs/prague-d1/mark-qa-note.md` on that branch) already found items 4-8 green in the pre-#495
state; none of #495's changes (Flora removal, sweep pacing, honest-empty-state wiring, static-
coverage gate) plausibly regress hub-lock/doNotGroup/terminus-mapping/registry-wiring, so I'd
expect them to still pass, but they were not re-verified in this session and should not be assumed
green without a fresh run once item 3 is fixed.

## Verdict

RED. Budějovická, Kačerov, Pankrác, and Roztyly are confirmed empty on every poll across two
independent live sweeps (18/18 polls, ~30+ minutes apart, weekday peak service), with
`emptyReason` null (no honest-empty-state coverage for this case) and no infotext or stop-id
explanation. This is Connolly-shape per this session's brief and a hard fail. Not fixed here —
needs a fresh Jim pass to determine whether this is a genuine current service gap (coverage-note
exclusion, Flora precedent) or a data/mapping issue distinct from Flora's already-ruled-out
stop-id-by-name check, then a third Mark QA pass re-running the full checklist (items 3-8) before
any flip PR.

## Vercel / decisions for Tim

Not checked this session — result is already RED so this isn't currently gating. Golemio API ToS
commercial-use review (flagged since D1/D2, still open per jim-handoff.md) also still needs Tim's
sign-off before flip, independent of this finding.

## Housekeeping

No dev server or background process was started this session (only direct `node -e`/script
invocations against the adapter and the live Golemio API — no `run-all.mjs`/dev-server launch was
needed to reach the RED verdict). No background loops or listening ports left behind.
