/**
 * Probe Canberra GTFS light rail board without enabling the city in the app.
 *
 * Usage:
 *   ACT_GTFS_BASIC=... node scripts/probe-canberra-board.mjs Gungahlin
 *   node scripts/probe-canberra-board.mjs City
 *   node scripts/probe-canberra-board.mjs --list
 */
import { assertCityLive } from "../lib/providers/registry.js";
import {
  fetchStationBoard,
  listCatalogStations,
  CANBERRA_TIME_ZONE,
} from "../lib/providers/canberra.js";
import { MissingActGtfsCredentialsError } from "../lib/providers/gtfs/auth.js";
import { buildNextTrainResponse, pickUpcomingProviderTrips } from "../lib/train-times.js";

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(JSON.stringify(listCatalogStations().map((s) => s.name), null, 2));
  process.exit(0);
}

const station = args[0];
if (!station) {
  console.error("Usage: node scripts/probe-canberra-board.mjs <station-name>");
  console.error("       node scripts/probe-canberra-board.mjs --list");
  process.exit(1);
}

const gate = assertCityLive("canberra");
if (gate.ok) {
  console.error("Unexpected: canberra is live — probe expects planned status");
  process.exit(1);
}

console.log(`City gate (expected 501): ${gate.status} — ${gate.error}\n`);

try {
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
      timeZone: CANBERRA_TIME_ZONE,
    });

    console.log(`Sample direction: ${sampleDestination}`);
    console.log(JSON.stringify({ board, nextTrain: response }, null, 2));
  } else {
    console.log(JSON.stringify(board, null, 2));
  }
} catch (error) {
  if (error instanceof MissingActGtfsCredentialsError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
