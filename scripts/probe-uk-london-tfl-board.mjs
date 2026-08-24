/**
 * Manual TfL probe (dev machine only). No Darwin.
 *   TFL_APP_KEY=... node scripts/probe-uk-london-tfl-board.mjs "King's Cross"
 *   node scripts/probe-uk-london-tfl-board.mjs --list
 */
import { MissingTflAppKeyError, fetchStopBoard, listCatalogStops } from "../lib/providers/uk-tfl.js";

const args = process.argv.slice(2);
let list = false;
let stop = "";

for (const arg of args) {
  if (arg === "--list") {
    list = true;
  } else if (!arg.startsWith("--")) {
    stop = arg;
  }
}

if (list) {
  const rows = listCatalogStops();
  console.log(`uk-london-tfl stops (${rows.length}):`);
  for (const row of rows) {
    console.log(`  ${row.naptanId}  ${row.name}`);
  }
  process.exit(0);
}

if (!stop) {
  console.error("Usage: probe-uk-london-tfl-board.mjs <stop name> | --list");
  process.exit(1);
}

try {
  const board = await fetchStopBoard(stop);
  console.log(JSON.stringify(board, null, 2));
} catch (error) {
  if (error instanceof MissingTflAppKeyError) {
    console.error("TFL_APP_KEY is not set — register at https://api-portal.tfl.gov.uk/");
    process.exit(1);
  }
  throw error;
}
