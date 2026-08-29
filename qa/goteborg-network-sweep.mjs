/**
 * D6 — Live Göteborg Västtrafik sweep (Trafiklab GTFS Regional vt). Not a CI gate.
 * Needs TRAFIKLAB_API_KEY. Board is schedule-only (no TripUpdates for vt) — the
 * sweep records `realtime: false` honestly instead of failing on it.
 *   npm run sweep:goteborg
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getCity } from "../lib/providers/registry.js";
import {
  GOTEBORG_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../lib/providers/goteborg.js";
import {
  ALLOWED_LINE_CODES,
  marketingLabelsForStation,
} from "../lib/cities/goteborg/marketing-directions.js";
import { loadEnvLocal } from "../lib/load-env-local.js";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED = new Set(ALLOWED_LINE_CODES.map((code) => String(code)));

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
  const entry = getCity("goteborg");
  if (entry?.adapterReady !== true) {
    throw new Error("goteborg adapterReady must be true before sweeping");
  }
  // Deliberately no assertCityLive: this sweep runs pre-flip while planned.

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
  let realtimeBoards = 0;
  for (const station of stations) {
    const labels = marketingLabelsForStation(station.name);
    let board;
    try {
      board = await fetchStationBoard(station.name);
    } catch (error) {
      anomalies.push({ station: station.name, check: "S6", detail: String(error?.message ?? error) });
      continue;
    }
    if (board.realtime === true) {
      // Not an anomaly — but worth noticing: Trafiklab would have started
      // publishing TripUpdates for vt. Recorded so a human can revisit RT.
      realtimeBoards += 1;
    }
    results.push({
      station: station.name,
      tripCount: board.trips?.length ?? 0,
      realtime: board.realtime === true,
      labels,
    });
    for (const trip of board.trips ?? []) {
      if (!ALLOWED.has(String(trip.routeShortName ?? "").trim())) {
        anomalies.push({
          station: station.name,
          check: "C1",
          detail: `board leaked non-v1 line ${trip.routeShortName} → ${trip.destination}`,
        });
        break;
      }
    }
    if ((board.trips ?? []).some((trip) => /to city|inbound|outbound|centralstationen/i.test(trip.destination))) {
      anomalies.push({ station: station.name, check: "C7", detail: "board leaked forbidden destination string" });
    }
  }

  mkdirSync(join(ROOT, "qa/reports"), { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(ROOT, "qa/reports", `goteborg-sweep-${timestamp}.json`);
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        timeZone: GOTEBORG_TIME_ZONE,
        scheduleOnly: realtimeBoards === 0,
        realtimeBoards,
        anomalies,
        results,
      },
      null,
      2
    )}\n`
  );
  console.log(
    `goteborg-network-sweep: ${anomalies.length} anomalies, ${realtimeBoards} realtime boards (expect 0 — schedule-only) → ${reportPath}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
