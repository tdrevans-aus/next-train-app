/**
 * Manual Darwin probe (dev machine only). Reads DARWIN_LDB_TOKEN from the
 * environment or .env.local.
 *
 *   node scripts/probe-uk-board.mjs --region=uk-west-midlands --list
 *   node scripts/probe-uk-board.mjs "Birmingham New Street" --region=uk-west-midlands
 *   node scripts/probe-uk-board.mjs --crs=ELP          # raw CRS, bypasses region catalogs
 *   node scripts/probe-uk-board.mjs --crs=ELP,LVC,MRF  # several, one summary line per trip
 *
 * --crs asks Darwin directly for that station code, whatever any region
 * catalog says about it. Use it to establish what Darwin actually serves
 * before deciding how a catalog should model a station.
 */
import { loadEnvLocal } from "../lib/load-env-local.js";
import {
  fetchDepartureBoard,
  fetchStationBoard,
  listCatalogStations,
} from "../lib/providers/uk-darwin.js";

loadEnvLocal();

const args = process.argv.slice(2);
let regionId = "uk-west-midlands";
let list = false;
let station = "";
let rawCrs = "";

for (const arg of args) {
  if (arg === "--list") {
    list = true;
  } else if (arg.startsWith("--region=")) {
    regionId = arg.slice("--region=".length);
  } else if (arg.startsWith("--crs=")) {
    rawCrs = arg.slice("--crs=".length);
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

if (rawCrs) {
  const codes = rawCrs
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  for (const crs of codes) {
    const board = await fetchDepartureBoard({ crs, numRows: 15 });
    console.log(`== ${crs} ${board.stationName ?? ""} — ${board.trips.length} trips (Darwin lastUpdate ${board.lastUpdate ?? "?"})`);
    for (const t of board.trips) {
      const time = t.scheduledDisplayTime ?? t.displayTime ?? "";
      const plat = t.platform ? `plat ${t.platform}` : "no plat";
      console.log(`  ${time}  ${t.destination}  |  ${t.operator ?? "(no operator)"}  |  ${plat}  |  ${t.status ?? ""}`);
    }
  }
  process.exit(0);
}

if (!station) {
  console.error(
    "Usage: probe-uk-board.mjs <CRS or name> [--region=uk-west-midlands] | --list [--region=...] | --crs=ELP[,LVC,...]"
  );
  process.exit(1);
}

const board = await fetchStationBoard(station, { regionId });
console.log(JSON.stringify(board, null, 2));
