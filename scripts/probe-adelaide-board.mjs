/**
 * Probe Adelaide GTFS rail board without enabling the city in the app.
 *
 * Usage:
 *   node scripts/probe-adelaide-board.mjs Adelaide
 *   node scripts/probe-adelaide-board.mjs Goodwood
 *   node scripts/probe-adelaide-board.mjs --list
 */
import { assertCityLive } from "../lib/providers/registry.js";
import {
  fetchStationBoard,
  listCatalogStations,
  ADELAIDE_TIME_ZONE,
} from "../lib/providers/adelaide.js";
import { buildNextTrainResponse, pickUpcomingProviderTrips } from "../lib/train-times.js";

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(JSON.stringify(listCatalogStations().map((s) => s.name), null, 2));
  process.exit(0);
}

const station = args[0];
if (!station) {
  console.error("Usage: node scripts/probe-adelaide-board.mjs <station-name>");
  console.error("       node scripts/probe-adelaide-board.mjs --list");
  process.exit(1);
}

const gate = assertCityLive("adelaide");
if (gate.ok) {
  console.error("Unexpected: adelaide is live — probe expects planned status");
  process.exit(1);
}

console.log(`City gate (expected 501): ${gate.status} — ${gate.error}\n`);

const board = await fetchStationBoard(station);
console.log(`Station: ${board.stationName}`);
console.log(`Last update: ${board.lastUpdate}`);
console.log(`Trips (all directions): ${board.trips.length}\n`);

if (board.trips.length === 0) {
  console.log("No upcoming trips — try another station or time of day.");
  process.exit(0);
}

const sampleDestination = board.trips[0].destination;
const upcoming = pickUpcomingProviderTrips(board.trips, sampleDestination);

if (upcoming.length > 0) {
  const response = buildNextTrainResponse({
    station: board.stationName,
    destination: sampleDestination,
    destinationLabel: sampleDestination,
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
    skipTrains: 0,
    lastUpdated: new Date(board.lastUpdate),
    upcomingTrips: upcoming,
    timeZone: ADELAIDE_TIME_ZONE,
  });

  console.log(`Sample direction: ${sampleDestination}`);
  console.log(JSON.stringify({ board, nextTrain: response }, null, 2));
} else {
  console.log(JSON.stringify(board, null, 2));
}
