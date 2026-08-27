/**
 * D6 — Live Stockholm SL Transport sweep. Anomaly report, not a CI gate.
 * City stays planned. No API key.
 *
 *   npm run sweep:stockholm
 *   node qa/stockholm-network-sweep.mjs --station="T-Centralen"
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  STOCKHOLM_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../lib/providers/stockholm.js";
import { marketingLabelsForStation } from "../lib/cities/stockholm/marketing-directions.js";
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
  const live = assertCityLive("stockholm");
  if (live?.ok === true) {
    throw new Error("assertCityLive(stockholm) must fail — city stays planned");
  }

  const args = parseArgs(process.argv.slice(2));
  let stations = listCatalogStations().filter((row) => row.siteId);
  if (args.station) {
    stations = stations.filter((row) => row.name.toLowerCase() === args.station.toLowerCase());
  }
  if (args.limit) {
    stations = stations.slice(0, args.limit);
  }

  const anomalies = [];
  const results = [];
  console.log(`stockholm-network-sweep: ${stations.length} stations (${STOCKHOLM_TIME_ZONE})`);

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
    if ((board.trips?.length ?? 0) === 0) {
      anomalies.push({ station: station.name, check: "S6", detail: "no trips" });
    }
    if ((board.trips ?? []).some((trip) => /stockholm central|stockholm c\b|britomart/i.test(trip.destination))) {
      anomalies.push({ station: station.name, check: "C2", detail: "board leaked Stockholm Central" });
    }
  }

  const reportDir = join(ROOT, "qa/reports");
  mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(ROOT, "qa/reports", `stockholm-sweep-${timestamp}.json`);
  writeFileSync(reportPath, `${JSON.stringify({ timeZone: STOCKHOLM_TIME_ZONE, anomalies, results }, null, 2)}\n`);
  console.log(`stockholm-network-sweep: ${anomalies.length} anomalies → ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
