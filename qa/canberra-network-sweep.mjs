/**
 * D6 — Live Canberra light-rail sweep. Not a CI gate.
 *   npm run sweep:canberra
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  CANBERRA_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../lib/providers/canberra.js";
import { marketingLabelsForStation } from "../lib/cities/canberra/marketing-directions.js";
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
  const live = assertCityLive("canberra");
  if (live?.ok !== true) {
    throw new Error("assertCityLive(canberra) must pass");
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
    if ((board.trips ?? []).some((trip) => /bus |woden|edinburgh|city south|commonwealth park/i.test(trip.destination))) {
      anomalies.push({ station: station.name, check: "C1", detail: "board leaked bus or Stage 2A" });
    }
  }

  mkdirSync(join(ROOT, "qa/reports"), { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(ROOT, "qa/reports", `canberra-sweep-${timestamp}.json`);
  writeFileSync(reportPath, `${JSON.stringify({ timeZone: CANBERRA_TIME_ZONE, anomalies, results }, null, 2)}\n`);
  console.log(`canberra-network-sweep: ${anomalies.length} anomalies → ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
