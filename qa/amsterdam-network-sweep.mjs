/**
 * D6 — Live Amsterdam GVB metro sweep. Not a CI gate.
 *   npm run sweep:amsterdam
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  AMSTERDAM_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../lib/providers/amsterdam.js";
import { marketingLabelsForStation } from "../lib/cities/amsterdam/marketing-directions.js";
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
  const live = assertCityLive("amsterdam");
  if (live?.ok !== true) {
    throw new Error("assertCityLive(amsterdam) must pass");
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
  for (const station of stations) {
    const labels = marketingLabelsForStation(station.name);
    let board;
    try {
      board = await fetchStationBoard(station.name);
    } catch (error) {
      anomalies.push({ station: station.name, check: "S6", detail: String(error?.message ?? error) });
      continue;
    }
    results.push({ station: station.name, tripCount: board.trips?.length ?? 0, labels });
    if ((board.trips ?? []).some((trip) => /amsterdam centraal|schiphol/i.test(trip.destination))) {
      anomalies.push({ station: station.name, check: "C2", detail: "board leaked NS/Schiphol" });
    }
  }

  mkdirSync(join(ROOT, "qa/reports"), { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(ROOT, "qa/reports", `amsterdam-sweep-${timestamp}.json`);
  writeFileSync(reportPath, `${JSON.stringify({ timeZone: AMSTERDAM_TIME_ZONE, anomalies, results }, null, 2)}\n`);
  console.log(`amsterdam-network-sweep: ${anomalies.length} anomalies → ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
