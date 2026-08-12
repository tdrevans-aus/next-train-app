/**
 * Probe Sydney TfNSW GTFS rail + metro board without enabling the city in the app.
 *
 * Requires TFNSW_API_KEY in the environment (register at https://opendata.transport.nsw.gov.au/).
 *
 * Usage:
 *   TFNSW_API_KEY=... node scripts/probe-sydney-board.mjs Central
 *   TFNSW_API_KEY=... node scripts/probe-sydney-board.mjs Town Hall
 *   node scripts/probe-sydney-board.mjs --list
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { readTfnswApiKey, MissingProviderApiKeyError } from "../lib/providers/gtfs/auth.js";
import {
  fetchStationBoard,
  listCatalogStations,
  SYDNEY_TIME_ZONE,
} from "../lib/providers/sydney.js";
import { buildNextTrainResponse, pickUpcomingProviderTrips } from "../lib/train-times.js";

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(JSON.stringify(listCatalogStations().map((s) => s.name), null, 2));
  process.exit(0);
}

const station = args[0];
if (!station) {
  console.error("Usage: TFNSW_API_KEY=... node scripts/probe-sydney-board.mjs <station-name>");
  console.error("       node scripts/probe-sydney-board.mjs --list");
  process.exit(1);
}

if (!readTfnswApiKey()) {
  console.error(
    "TFNSW_API_KEY is not set.\n" +
      "Register at https://opendata.transport.nsw.gov.au/ and export the key:\n" +
      "  export TFNSW_API_KEY=<your-key>   (bash)\n" +
      "  $env:TFNSW_API_KEY=\"<your-key>\"  (PowerShell)"
  );
  process.exit(1);
}

const gate = assertCityLive("sydney");
if (gate.ok) {
  console.error("Unexpected: sydney is live — probe expects planned status");
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
      timeZone: SYDNEY_TIME_ZONE,
    });

    console.log(`Sample direction: ${sampleDestination}`);
    console.log(JSON.stringify({ board, nextTrain: response }, null, 2));
  } else {
    console.log(JSON.stringify(board, null, 2));
  }
} catch (err) {
  if (err instanceof MissingProviderApiKeyError) {
    console.error(err.message);
    process.exit(1);
  }
  console.error(err?.message ?? err);
  process.exit(1);
}
