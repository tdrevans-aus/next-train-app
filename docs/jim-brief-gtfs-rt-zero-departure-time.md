# Jim brief — shared GTFS-RT: departure.time = 0 treated as a real timestamp (epoch 1970 departures)

**Lane:** bug-fix / product mode. **Scope:** shared lib/providers/gtfs/ (no city lock; touches every GTFS-RT city — Melbourne, Adelaide, Sydney, Brisbane, Helsinki, Oslo, Stockholm family, Copenhagen, Boston, Dublin, LA…). **Date:** 27 Sep 2026. **tim-review:** no.

## Symptom (found by Jim during docs/jim-brief-dublin-connolly-realtime-gap.md, evidence in docs/dublin-d1/jim-handoff.md, 27 Sep entry)
A live Brides Glen (Dublin) trip returned `liveDeparture: "1970-01-01T00:00:00.000Z"` while its `scheduledDeparture` was correct. Hypothesis: the GTFS-RT protobuf decodes an absent `StopTimeEvent.time` as `0`, and lib/providers/gtfs/realtime.js `indexTripUpdates()` / lib/providers/gtfs/board.js `collectTripsForServiceDay()` treat `rtStop.departureSec === 0` as a real absolute time instead of "absent, fall back to schedule + delaySec". Any feed sending delay-only stopTimeUpdates (common in NTA, HSL, Entur, Trafiklab…) can hit this.

## Fix
- Treat `time` of 0/undefined/null as absent for both arrival and departure events; use `delay` when present; otherwise use the static scheduled time plus the trip-level delay if any. Same for arrival. Keep `realtime: true` semantics as they are (a delay-only update still counts as live confirmation — do not change `tripHasRealtimeConfirmation`-style rules in any adapter).
- Add a guard that no emitted departure/arrival can be before 2000-01-01; if one would be, drop that stop update and log once (never a 1970 time to a rider).
- Unit test in the gtfs helper tests (or a new qa/gtfs-rt-zero-time-gate.mjs, offline, synthetic protobuf-shaped objects): time=0 + delay=120 → scheduled+120 s; time=0 no delay → scheduled; time=real → real; arrival-only update → departure falls back correctly.

## Acceptance
1. New gate green; `node qa/run-all.mjs --smoke` green (known local flake no-live-feed-stops-gate — re-run alone if only failure).
2. Live spot-check on a dev server for one station in each of Dublin (Sandyford or Brides Glen), Melbourne (Flinders Street) and Helsinki (Rautatientori): no departure before today's date in any response; trip counts unchanged vs master within live noise.
3. PR title: "GTFS-RT: treat StopTimeEvent.time = 0 as absent (epoch-1970 departures)". Link this brief and the Dublin handoff entry.
