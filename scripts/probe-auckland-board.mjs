/**
 * Probe Auckland AT rail board without enabling the city.
 * Requires AT_API_KEY. City stays planned.
 *
 *   node scripts/probe-auckland-board.mjs "Waitematā Station"
 *   node scripts/probe-auckland-board.mjs --list
 */
import { loadEnvLocal } from "../lib/load-env-local.js";
import { assertCityLive } from "../lib/providers/registry.js";
import { readAucklandApiKey } from "../lib/providers/gtfs/auth.js";
import {
  fetchStationBoard,
  listCatalogStations,
  AUCKLAND_TIME_ZONE,
} from "../lib/providers/auckland.js";
import { buildNextTrainResponse, pickUpcomingProviderTrips } from "../lib/train-times.js";

loadEnvLocal();

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(JSON.stringify(listCatalogStations().map((s) => s.name), null, 2));
  process.exit(0);
}

const station = args[0];
if (!station) {
  console.error("Usage: node scripts/probe-auckland-board.mjs <station-name>");
  process.exit(1);
}

if (!readAucklandApiKey()) {
  console.error(
    "AT_API_KEY is not set.\n" +
      "Header Ocp-Apim-Subscription-Key. Do not vercel env pull (stubs [SENSITIVE])."
  );
  process.exit(1);
}

const gate = assertCityLive("auckland");
if (gate.ok) {
  console.error("Unexpected: auckland is live — probe expects planned status");
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
    timeZone: AUCKLAND_TIME_ZONE,
  });
  console.log(`Sample direction: ${sampleDestination}`);
  console.log(JSON.stringify({ board, nextTrain: response }, null, 2));
} else {
  console.log(JSON.stringify(board, null, 2));
}
