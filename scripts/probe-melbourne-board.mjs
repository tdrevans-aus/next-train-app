/**
 * Probe Melbourne PTV metro board without enabling the city in the app.
 *
 * Requires PTV_DEVID and PTV_API_KEY in the environment.
 *
 * Usage:
 *   PTV_DEVID=... PTV_API_KEY=... node scripts/probe-melbourne-board.mjs "Flinders Street"
 *   node scripts/probe-melbourne-board.mjs --list
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { readPtvCredentials, MissingPtvCredentialsError } from "../lib/providers/ptv/client.js";
import {
  fetchStationBoard,
  listCatalogStations,
  MELBOURNE_TIME_ZONE,
} from "../lib/providers/melbourne.js";
import { buildNextTrainResponse, pickUpcomingProviderTrips } from "../lib/train-times.js";

const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(JSON.stringify(listCatalogStations().map((s) => s.name), null, 2));
  process.exit(0);
}

const station = args[0];
if (!station) {
  console.error("Usage: PTV_DEVID=... PTV_API_KEY=... node scripts/probe-melbourne-board.mjs <station-name>");
  console.error("       node scripts/probe-melbourne-board.mjs --list");
  process.exit(1);
}

const { devid, apiKey } = readPtvCredentials();
if (!devid || !apiKey) {
  console.error(
    "PTV_DEVID and PTV_API_KEY are not set.\n" +
      "Email APIKeyRequest@ptv.vic.gov.au with subject: PTV Timetable API – request for key\n" +
      "Then export:\n" +
      "  export PTV_DEVID=<devid> PTV_API_KEY=<key>   (bash)\n" +
      "  $env:PTV_DEVID=\"<devid>\"; $env:PTV_API_KEY=\"<key>\"  (PowerShell)"
  );
  process.exit(1);
}

const gate = assertCityLive("melbourne");
if (gate.ok) {
  console.error("Unexpected: melbourne is live — probe expects planned status");
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
      timeZone: MELBOURNE_TIME_ZONE,
    });

    console.log(`Sample direction: ${sampleDestination}`);
    console.log(JSON.stringify({ board, nextTrain: response }, null, 2));
  } else {
    console.log(JSON.stringify(board, null, 2));
  }
} catch (err) {
  if (err instanceof MissingPtvCredentialsError) {
    console.error(err.message);
    process.exit(1);
  }
  console.error(err?.message ?? err);
  process.exit(1);
}
