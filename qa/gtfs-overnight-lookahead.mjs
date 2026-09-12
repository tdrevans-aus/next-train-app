/**
 * When the usual 3-hour board is empty, show the first trains later that night / next morning.
 *
 * Same class of risk as the old brussels-planned-gate.mjs (docs/jim-brief-brussels-gate-pinned-
 * clock.md): a frozen `now` below plus a REAL network fetch (`lib/providers/amsterdam.js`'s
 * `fetchStationBoard` -> `loadGtfsStatic` against a live blob-fixture URL, then a live OVapi
 * TripUpdates fetch via `getMultiCityNextTrain`) is a time bomb that would fail once Amsterdam's
 * published calendar rolls past this pin. Established 12 Sep 2026: it is NOT currently a live
 * landmine, because this script is fully excluded from every `qa/run-all.mjs` tier — smoke,
 * release, AND the untiered full/nightly glob — via `RUNNER_EXCLUDE` in qa/run-all.mjs (added
 * 7 Sep 2026 alongside Amsterdam's retirement from release 1,
 * docs/jim-brief-release-1-scope-cut.md: "drop any that live-probe the agency"). It only runs if
 * someone executes `node qa/gtfs-overnight-lookahead.mjs` directly by hand.
 *
 * Left as a live/manual-only reference script rather than rebuilt against an offline fixture
 * (unlike Brussels): `lib/providers/amsterdam.js` is a retired-city adapter outside this brief's
 * authorised paths (qa/, qa/fixtures/, .github/workflows/qa-nightly.yml), and — unlike Brussels,
 * which blocks every PR — this script cannot block anything as long as it stays out of
 * `RUNNER_EXCLUDE`. Do not remove it from `RUNNER_EXCLUDE` without also converting it to a local
 * fixture (qa/fixtures/brussels/gtfs-static/ + its README is the pattern to follow).
 *
 * Usage: node qa/gtfs-overnight-lookahead.mjs
 */
import { fetchStationBoard } from "../lib/providers/amsterdam.js";
import { getMultiCityNextTrain } from "../lib/cities/live-city-api.js";

const overnight = new Date("2026-08-27T22:54:00.000Z");
const board = await fetchStationBoard("Centraal Station", { now: overnight });
const clocks = board.trips.slice(0, 5).map((trip) => `${trip.displayTime} ${trip.destination}`);

if (board.trips.length < 3) {
  console.error("gtfs-overnight-lookahead: expected first-wave trips at 00:54 Amsterdam", clocks);
  process.exit(1);
}
if (!clocks.some((row) => /^05:2[0-9]/.test(row))) {
  console.error("gtfs-overnight-lookahead: missing first-wave ~05:24 metro", clocks);
  process.exit(1);
}

const next = await getMultiCityNextTrain("amsterdam", {
  station: "Centraal Station",
  destination: "M52 + Station Zuid",
  destinationLabel: "M52 + Station Zuid",
  leaveBeforeMinutes: 10,
  refreshSeconds: 30,
  now: overnight,
});

if (next?.next?.displayTime !== "05:24") {
  console.error(`gtfs-overnight-lookahead: expected M52 next 05:24, got ${next?.next?.displayTime}`);
  process.exit(1);
}

console.log("gtfs-overnight-lookahead: ok", clocks.slice(0, 3).join(", "));
