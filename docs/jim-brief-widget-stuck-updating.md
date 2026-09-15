# Jim brief — Android widget stuck on "…" (Updating) with a pinned train

**Lane:** bug-fix / product mode. `tim-review: no` unless the fix changes widget copy.
**Lane lock:** none (`android/`, `web-sources/`, possibly `api/`). Leave no background loops,
pollers or dev servers; run suites with explicit `timeout: 600000` and tail output in the
foreground if backgrounded.

## Symptom (Tim, 15 Sep 2026, Samsung phone, app 3.0.1 / versionCode 25)

With a train pinned, the home-screen widget shows the label "NEXT TRAIN" and three large teal
dots, nothing else. Tapping it opens the app at the pinned train correctly. Leaving and
returning to the home screen changes nothing; removing and re-adding the widget changes
nothing. Screenshot at 20:42 local.

## What the dots are (controller triage, read-only)

- `WidgetUiBuilder.compactPrimary()` maps the primary string `"Updating…"` to `"…"`; drawn at
  primary size on the small widget that is the "three dots".
- `"Updating…"` is set by `CommuteScheduleSnapshot.applyStaleWhileFetching()` (~line 256) with
  secondary `"Fetching next train…"`, i.e. the stale-while-fetching face. The small layout
  doesn't show the secondary line, so the rider sees only the dots.
- So the widget entered the fetching state and never left it: the refresh (`CommuteRefreshService`
  / `WidgetDataService` → `NextTrainApiClient.fetchNextTrain(station, direction, leaveBefore,
  cityId)` → `GET /api/next-train`) either throws, returns something the snapshot code rejects,
  or never runs to completion, and nothing clears `staleWhileFetching`.
- Server check 15 Sep 21:00 local: a widget-shaped request for Perth
  (`/api/next-train?station=Perth Underground Stn&direction=Byford&leaveBefore=10`) returns 200
  with a full `next` object, so the API is not down. Tim's pinned route is not yet known —
  **first step is to ask which station/direction/city is pinned and replay that exact request.**

## Things that changed server-side this weekend that the old APK still talks to

- `/api/next-train` gained an optional `nextServiceDate` field (#381), only when `upcoming` is
  empty. Check the Android JSON parsing tolerates unknown fields and an empty `upcoming`.
- Sydney's catalog and direction chips changed (#394, #396) — if the pinned route is Sydney, the
  stored `direction` label may no longer match a chip and the API may return no `next`.
- UK catalogs grew (#382–#387); a pinned UK route whose station now has a doNotGroup twin could
  resolve differently.
- The picker's region persistence changed (#383, #392) — check whether the widget reads the
  pinned journey's `cityId` from settings the same way the app does after those changes; a
  missing/empty `cityId` makes the API default to Perth, which for a non-Perth route yields an
  "Unknown station" error → exception → stuck fetching.

## Fix

1. Reproduce with Tim's route (from the controller) against production; then in the emulator
   with the same settings JSON. Capture logcat for `NextTrainWidget*`/`CommuteRefresh*`.
2. Fix the root cause. Whatever it is, also fix the state machine: a failed or exceptioned fetch
   must never leave `staleWhileFetching` set indefinitely — after `STALE_FETCH_VISIBLE_MS`
   (45 s, `CommuteSchedule`) the face must fall back to the last good snapshot or to a clear
   error face ("Couldn't update — tap to open"), and the next scheduled refresh must retry.
3. Add an Android unit test for the state machine (fetch throws → face recovers after the
   visible window) and, if the cause was API-shape, a QA script in the smoke tier asserting the
   widget's parsing path accepts the current `/api/next-train` shape for one route per live city.

## Acceptance criteria

1. Tim's route renders a countdown on the widget within one refresh cycle on the emulator; the
   old 3.0.1 APK behaviour is explained in the PR body.
2. Unit test proves the recovery path; `android-unit` CI green; `node qa/run-all.mjs --smoke`
   green.
3. If the fix is Android-side it rides into release 3.0.2 (`docs/jim-brief-release-3.0.2.md`);
   coordinate with the controller before the release PR merges.

## Process

Worktree from current master; copy this brief in; commit, push; PR "Widget: recover from a
stuck Updating state and fix <root cause>".

## Addendum (15 Sep 2026, 21:10 local) — Tim's routes and the replay results

Tim's pinned route: **West Bromwich to Wolverhampton** (West Midlands Metro tram; `uk-west-midlands`).
He then re-pinned four other routes in England (rail) and the widget stayed on the dots every time.

Controller replays of the widget's exact request shape against production:

- `city=greater-manchester&station=Manchester Piccadilly&direction=Blackpool North (Northern)&leaveBefore=10`
  → HTTP 200, full `next` object. **The server serves UK rail to a widget-shaped request.**
- `city=uk-west-midlands&station=Birmingham New Street&direction=Bournemouth (CrossCountry)`
  → HTTP 200, `next: null` (nothing in the horizon; a legitimate empty answer).
- `city=uk-west-midlands&station=West Bromwich` → **"Unknown station"** even on `/api/board`:
  Metro stops are `liveFeed: false` and unresolvable server-side, so Tim's original route can
  never load — that one is expected to fail, but the widget must say so, not sit on dots.

Conclusions for the investigation:

1. The stuck-forever face is the primary bug regardless of cause: an unservable route (Metro)
   left the widget on "Updating…" with no recovery. Fix the state machine first (brief step 2).
2. For the four rail routes, the server answers, so look on the phone: what `cityId`, `station`
   and `direction` the widget actually sends for a journey created in the 3.0.1 app (log the URL
   in debug), whether `WidgetDataService` treats `next: null` as a failure, whether a failure in
   one refresh leaves the service or its alarm dead for later routes, and whether the widget
   ever re-reads settings after the rider re-pins. Reproduce in the emulator with the 3.0.1
   APK's exact settings JSON, then on the current build.
3. Also check the small layout: with `staleWhileFetching` the secondary line is hidden, so the
   rider sees only "…". Consider showing "Updating" in words on the small size.

## Addendum 2 (15 Sep 2026, 21:20 local) — Australia works, UK doesn't; prime suspect

Tim switched the pinned route back to an Australian one and the widget rendered normally. So:
same phone, same APK, same server → the difference is per-city handling in the native code.

- `journey.optString("cityId")` is passed through everywhere (CommuteSchedule, CommuteStripScheduler,
  JourneyPinHelper, LeaveReminderScheduler, NearbyPinHelper), and the app writes
  `journey.cityId` (journey-model.js:366), so the city id itself reaches the request.
- **Prime suspect: `PerthTime.java` hard-codes `ZoneId.of("Australia/Perth")`** and is used by
  the classes listed in the grep above for "now", active-hours windows, day words and
  countdown maths. A Europe/London journey evaluated in Perth time is 7–8 h off: the refresh may
  decide it is outside the journey's active window (idle path), compute a negative or absurd
  minutes-until that the snapshot rejects, or loop between "stale" and "fetching". Sydney/Brisbane
  are only 2 h off Perth, which may be why Australian routes still look fine. Verify by pinning a
  UK route in the emulator with the device clock set to UK time vs Perth time, and by replacing
  the fixed zone with the journey's city timezone (the registry carries `timeZone` per city and
  `/api/next-train` returns ISO instants; pass the zone through the settings JSON if the native
  side lacks it).
- Also confirm `WidgetDataService`/`CommuteScheduleSnapshot` handle the API's ISO `departure`
  with the city zone rather than `PerthTime.zone()` when producing `trainClock`.

Fix this properly (city timezone everywhere the widget/reminders compute local time), not by
special-casing the UK. The recovery-from-stuck-fetching fix (brief step 2) still stands.
