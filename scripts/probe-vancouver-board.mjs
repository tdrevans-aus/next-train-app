/**
 * Probe Vancouver SkyTrain board. TRANSLINK_API_KEY required for GTFS-RT v3.
 *
 *   node scripts/probe-vancouver-board.mjs Waterfront
 *   node scripts/probe-vancouver-board.mjs --list
 */
import { loadEnvLocal } from "../lib/load-env-local.js";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  fetchStationBoard,
  listCatalogStations,
  VANCOUVER_TIME_ZONE,
} from "../lib/providers/vancouver.js";
import { buildNextTrainResponse, pickUpcomingProviderTrips } from "../lib/train-times.js";

loadEnvLocal();

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(JSON.stringify(listCatalogStations().map((s) => s.name), null, 2));
  process.exit(0);
}

const station = args[0];
if (!station) {
  console.error("Usage: node scripts/probe-vancouver-board.mjs <station-name>");
  process.exit(1);
}

const gate = assertCityLive("vancouver");
if (!gate.ok) {
  console.error("Unexpected: vancouver is not live");
  process.exit(1);
}

const board = await fetchStationBoard(station);
console.log(`Station: ${board.stationName}`);
console.log(`Last update: ${board.lastUpdate}`);
console.log(`Trips: ${board.trips.length}\n`);

if (board.trips.length === 0) {
  console.log("No upcoming trips.");
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
    timeZone: VANCOUVER_TIME_ZONE,
  });
  console.log(`Sample direction: ${sampleDestination}`);
  console.log(JSON.stringify({ tripCount: board.trips.length, sample: board.trips.slice(0, 8), nextTrain: response }, null, 2));
} else {
  console.log(JSON.stringify(board.trips.slice(0, 8), null, 2));
}
