/**
 * D6 — Live Wellington network sweep. Anomaly report, not a CI gate.
 * City is live. Needs METLINK_API_KEY.
 *
 *   npm run sweep:wellington
 *   node qa/wellington-network-sweep.mjs --station="Wellington Station"
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import { readMetlinkApiKey } from "../lib/providers/gtfs/auth.js";
import {
  WELLINGTON_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../lib/providers/wellington.js";
import { loadEnvLocal } from "../lib/load-env-local.js";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const out = { station: null, limit: null };
  for (const arg of argv) {
    if (arg.startsWith("--station=")) {
      out.station = arg.slice("--station=".length);
    } else if (arg.startsWith("--limit=")) {
      out.limit = Number(arg.slice("--limit=".length));
    }
  }
  return out;
}

async function main() {
  const live = assertCityLive("wellington");
  if (live?.ok !== true) {
    throw new Error("assertCityLive(wellington) must pass — city is live");
  }
  if (!readMetlinkApiKey()) {
    throw new Error("METLINK_API_KEY is not set");
  }

  const args = parseArgs(process.argv.slice(2));
  let stations = listCatalogStations();
  if (args.station) {
    stations = stations.filter((row) => row.name.toLowerCase() === args.station.toLowerCase());
  }
  if (args.limit) {
    stations = stations.slice(0, args.limit);
  }

  const anomalies = [];
  const results = [];
  console.log(`wellington-network-sweep: ${stations.length} stations (${WELLINGTON_TIME_ZONE})`);

  for (const station of stations) {
    let board;
    try {
      board = await fetchStationBoard(station.name);
    } catch (error) {
      anomalies.push({ station: station.name, check: "S6", detail: String(error?.message ?? error) });
      continue;
    }
    results.push({ station: station.name, tripCount: board.trips?.length ?? 0 });
    if ((board.trips?.length ?? 0) === 0) {
      anomalies.push({ station: station.name, check: "S6", detail: "no trips" });
    }
  }

  const reportDir = join(ROOT, "qa/reports");
  mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(reportDir, `wellington-sweep-${timestamp}.json`);
  writeFileSync(reportPath, `${JSON.stringify({ timeZone: WELLINGTON_TIME_ZONE, anomalies, results }, null, 2)}\n`);
  console.log(`wellington-network-sweep: ${anomalies.length} anomalies → ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
