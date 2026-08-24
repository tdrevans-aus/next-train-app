/**
 * D6 — Live Adelaide network sweep (every catalog station).
 * Anomaly report, not a CI gate. Public GTFS+GTFS-R (no key). Excluded from qa/run-all.mjs.
 *
 *   npm run sweep:adelaide
 *   node qa/adelaide-network-sweep.mjs --station="Adelaide Railway Station"
 *
 * Writes qa/reports/adelaide-sweep-<timestamp>.json
 * H7: Australia/Adelaide DST. City stays planned.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  ADELAIDE_TIME_ZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../lib/providers/adelaide.js";
import { marketingLabelsForStation } from "../lib/cities/adelaide/marketing-directions.js";

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

function adelaideParts(date) {
  const dtf = new Intl.DateTimeFormat("en-AU", {
    timeZone: ADELAIDE_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    weekday: parts.weekday,
    clock: `${parts.hour}:${parts.minute}`,
    tzName: parts.timeZoneName,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const live = assertCityLive("adelaide");
  if (!live || live.ok !== true) {
    throw new Error("assertCityLive(adelaide) must pass — city is live");
  }

  let stations = listCatalogStations();
  if (args.station) {
    stations = stations.filter((row) => row.name.toLowerCase() === args.station.toLowerCase());
  }
  if (args.limit) {
    stations = stations.slice(0, args.limit);
  }

  const clock = adelaideParts(new Date());
  const anomalies = [];
  const results = [];

  console.log(
    `adelaide-network-sweep: ${stations.length} stations, ${clock.weekday} ${clock.clock} ${clock.tzName} (${ADELAIDE_TIME_ZONE})`
  );

  for (const station of stations) {
    const labels = marketingLabelsForStation(station.name);
    let board;
    try {
      board = await fetchStationBoard(station.name);
    } catch (error) {
      anomalies.push({
        station: station.name,
        code: "S1",
        detail: String(error?.message || error),
      });
      results.push({ station: station.name, ok: false, labels });
      continue;
    }
    const trips = board.trips ?? [];
    if (trips.length === 0) {
      anomalies.push({
        station: station.name,
        code: "S2",
        detail: "empty board",
      });
    }
    if (/tram|bus/i.test(JSON.stringify(trips.slice(0, 3)))) {
      anomalies.push({
        station: station.name,
        code: "S6",
        detail: "non-train mode leaked onto rail board",
      });
    }
    results.push({
      station: station.name,
      ok: true,
      tripCount: trips.length,
      labels,
    });
  }

  const outDir = join(ROOT, "qa/reports");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `adelaide-sweep-${stamp}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        city: "adelaide",
        timeZone: ADELAIDE_TIME_ZONE,
        clock,
        stationCount: stations.length,
        anomalyCount: anomalies.length,
        anomalies,
        results,
      },
      null,
      2
    )
  );

  console.log(`adelaide-network-sweep: ${anomalies.length} anomalies → ${outPath}`);
  if (anomalies.length) {
    for (const row of anomalies.slice(0, 20)) {
      console.log(`  ${row.code} ${row.station}: ${row.detail}`);
    }
  }
}

await main();
