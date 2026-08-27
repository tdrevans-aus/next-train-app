/**
 * Probe Stockholm SL Transport board without enabling the city.
 * No API key. City stays planned.
 *
 *   node scripts/probe-stockholm-board.mjs "T-Centralen"
 *   node scripts/probe-stockholm-board.mjs "Stockholm City"
 *   node scripts/probe-stockholm-board.mjs --list
 */
import { loadEnvLocal } from "../lib/load-env-local.js";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  fetchStationBoard,
  listCatalogStations,
  STOCKHOLM_TIME_ZONE,
} from "../lib/providers/stockholm.js";
import { buildNextTrainResponse, pickUpcomingProviderTrips } from "../lib/train-times.js";

loadEnvLocal();

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(JSON.stringify(listCatalogStations().map((s) => s.name), null, 2));
  process.exit(0);
}

const station = args[0];
if (!station) {
  console.error("Usage: node scripts/probe-stockholm-board.mjs <station-name>");
  process.exit(1);
}

const gate = assertCityLive("stockholm");
if (gate.ok) {
  console.error("Unexpected: stockholm is live — probe expects planned status");
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
    timeZone: STOCKHOLM_TIME_ZONE,
  });
  console.log(`Sample direction: ${sampleDestination}`);
  console.log(JSON.stringify({ board, nextTrain: response }, null, 2));
} else {
  console.log(JSON.stringify(board, null, 2));
}
