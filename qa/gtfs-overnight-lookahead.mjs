/**
 * When the usual 3-hour board is empty, show the first trains later that night / next morning.
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
