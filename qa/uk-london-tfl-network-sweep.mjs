/**
 * Live London TfL network sweep (targeted stops).
 *
 * Usage:
 *   TFL_APP_KEY=... node qa/uk-london-tfl-network-sweep.mjs
 */
import { fetchStopBoard } from "../lib/providers/uk-tfl.js";
import { loadEnvLocal } from "../lib/load-env-local.js";

loadEnvLocal();

const STOPS = [
  { name: "King's Cross St. Pancras", mode: "tube" },
  { name: "Tottenham Court Road", mode: "elizabeth-line" },
  { name: "Canary Wharf", mode: "dlr" },
  { name: "Highbury & Islington", mode: "overground" },
  { name: "Beckenham Junction", mode: "tram" },
  {
    name: "Kew Gardens",
    mode: "tube+overground",
    requireLines: ["District", "Mildmay"],
  },
];

async function main() {
  console.log("uk-london-tfl-network-sweep: probing targeted stops...");
  let failures = 0;

  for (const stop of STOPS) {
    try {
      const board = await fetchStopBoard(stop.name);
      const tripCount = board.trips.length;
      console.log(`  PASS ${stop.name} (${stop.mode}): ${tripCount} trips`);

      if (tripCount === 0) {
        console.warn(`    WARN: No trips found for ${stop.name}. Is it late at night?`);
        continue;
      }

      const lines = [...new Set(board.trips.map((t) => t.line).filter(Boolean))];
      if (lines.length > 0) {
        console.log(`    Lines: ${lines.join(", ")}`);
      } else {
        console.warn(`    WARN: No line names found in trips for ${stop.name}`);
      }

      if (stop.requireLines) {
        for (const req of stop.requireLines) {
          if (!lines.includes(req)) {
            console.error(`  FAIL ${stop.name}: Missing required line ${req}`);
            failures++;
          }
        }
      }
    } catch (error) {
      console.error(`  FAIL ${stop.name} (${stop.mode}): ${error.message}`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\nSweep failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log("\nSweep complete. All targeted stops resolved.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
