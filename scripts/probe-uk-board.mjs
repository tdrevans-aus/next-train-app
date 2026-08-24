/**
 * Manual Darwin probe (dev machine only).
 *   DARWIN_LDB_TOKEN=... node scripts/probe-uk-board.mjs --region=uk-west-midlands --list
 */
import {
  fetchStationBoard,
  listCatalogStations,
} from "../lib/providers/uk-darwin.js";

const args = process.argv.slice(2);
let regionId = "uk-west-midlands";
let list = false;
let station = "";

for (const arg of args) {
  if (arg === "--list") {
    list = true;
  } else if (arg.startsWith("--region=")) {
    regionId = arg.slice("--region=".length);
  } else if (!arg.startsWith("--")) {
    station = arg;
  }
}

if (list) {
  const rows = listCatalogStations(regionId);
  console.log(`${regionId} rail stations (${rows.length}):`);
  for (const row of rows) {
    console.log(`  ${row.crs}  ${row.name}`);
  }
  process.exit(0);
}

if (!station) {
  console.error("Usage: probe-uk-board.mjs <CRS or name> | --list [--region=uk-west-midlands]");
  process.exit(1);
}

const board = await fetchStationBoard(station, { regionId });
console.log(JSON.stringify(board, null, 2));
