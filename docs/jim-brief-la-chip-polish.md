# Jim brief — Los Angeles chip polish: time-aware empty reason + a real-feed reachability gate

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. Acquire the lane lock:
the controller checked on 25 Oct 2026 and it was free. **Date:** 25 Oct 2026. **tim-review:** no.
**Input:** Mark's PASS note on #531 (https://github.com/tdrevans-aus/next-train-app/pull/531#issuecomment-6392494414),
recommendations 2 and 3. LA stays `planned`.

## 1. Time-aware per-direction empty reason

`board.scheduledDestinationsToday` (#531) is a **whole-day** check. Real feed today: 1 A trip ends at
Monrovia and 2 at APU/Citrus College, but those chips are offered at 37 and 41 stations. After the last
such trip has passed a station, the chip still says `no-live-predictions` ("No live predictions for this
stop right now"), which implies a train is coming.

**Rule:** for a chip with zero upcoming live rows:
- `no-live-predictions` only if a scheduled departure **from this station** to that terminus **remains
  later today**, after `now`, within the service day. Include previous-service-day 24:00+ trips, using the
  shared builder's semantics from #526.
- Otherwise `not-currently-served`.

Keep the board-level `not-currently-served` pass-through and the calendar-unknown fallback (old
behaviour). No new rider copy. Chips stay static. Don't hide chips by time of day, because the bundled
directions JSON is per station.

## 2. Reachability gate against the real feed

The 110-station reachability check in `qa/los-angeles-dogfood-gate.mjs` builds trips from the
hand-written `OBSERVED_TERMINALS` table and compares the output with that same table. It's close to a
tautology. It also calls `staticDirectionsForStopIds`, not the dogfood function, so it stayed green
when Mark broke the dogfood union.

**Replace or extend it:** for every catalog station, take each trip's last stop straight from the static
feed's `stop_times`, excluding trips that terminate at that station. Assert that its terminus label is
among the chips the **dogfood function** offers for that station.

Run it against the static data the gate already loads. If that means the real `gtfs_rail.zip`, follow the
repo's existing pattern for static data in gates, and keep CI network rules and Blob-transfer limits.
Check how the other dogfood gates source static data. Mark's manual run found 0 unreachable.

## QA

- Offline fixture cases:
  - a short-turn chip after its last trip of the day gives `not-currently-served`;
  - before it, `no-live-predictions`;
  - a 24:30 previous-day trip counts as remaining at 00:10.
- Mutation-check each new assertion, and confirm the real-feed reachability check goes red when the
  dogfood union is broken.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground).
- Live probe if it's LA service hours (05:00–24:00 PDT): A+Monrovia at a station its only trip has
  already passed gives `not-currently-served`. `SWIFTLY_API_KEY` is in the main checkout's `.env.local`.
  Never print it, and stay under 180 requests per 15 min.

Open a PR that links this brief and leave no background loops running.
