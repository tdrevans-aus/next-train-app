/**
 * Throwaway probe — London terminus sweep (docs/mark-brief-london-terminus-sweep.md).
 * Live TfL sweep, NOT a committed gate. Paced to avoid 429s; distinguishes a 429 from a
 * genuine empty board.
 *
 * Usage: node qa/uk-london-terminus-sweep-probe.mjs
 */
import fs from "node:fs";
import { fetchStopBoard } from "../lib/providers/uk-tfl.js";
import { pickUpcomingTrips } from "../lib/train-times-core.js";
import { loadEnvLocal } from "../lib/load-env-local.js";

loadEnvLocal();

const TFL_APP_KEY = String(process.env.TFL_APP_KEY ?? "").trim();
if (!TFL_APP_KEY) {
  console.error("TFL_APP_KEY not set; aborting.");
  process.exit(1);
}

const stopsData = JSON.parse(
  fs.readFileSync(new URL("../lib/cities/uk-london-tfl/stops.json", import.meta.url), "utf8")
).stops;
const stopByName = new Map(stopsData.map((s) => [s.name, s]));

const dirs = JSON.parse(
  fs.readFileSync(new URL("../public/city-directions/uk-london-tfl.json", import.meta.url), "utf8")
);
const stationNames = new Set(Object.keys(dirs));

// Derive terminus candidates: station S is a candidate when some direction string in the
// catalog is "<Line> S" and S is itself a key in the file (per brief).
const termini = new Set();
for (const list of Object.values(dirs)) {
  for (const D of list) {
    for (const S of stationNames) {
      if (D.length > S.length && D.endsWith(S) && D[D.length - S.length - 1] === " ") {
        termini.add(S);
      }
    }
  }
}

const CANDIDATES = [...termini].sort();
console.log(`Derived ${CANDIDATES.length} terminus candidates.\n`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rawFetchWithRetry(path, attempt = 0) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.tfl.gov.uk${path}${sep}app_key=${encodeURIComponent(TFL_APP_KEY)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 429) {
    if (attempt >= 3) {
      return { rateLimited: true };
    }
    const backoff = 2000 * (attempt + 1);
    console.warn(`    [429] backing off ${backoff}ms for ${path}`);
    await sleep(backoff);
    return rawFetchWithRetry(path, attempt + 1);
  }
  if (!response.ok) {
    return { error: `HTTP ${response.status}` };
  }
  return { rows: await response.json() };
}

// Signature 2: placeholder timing — 3+ rows sharing a destination whose timeToStation values
// all fall within a few seconds of each other.
function detectPlaceholderTiming(rows) {
  const byDest = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const dest = String(row.destinationName || "").trim();
    const tts = row.timeToStation;
    if (!dest || !Number.isFinite(tts)) continue;
    if (!byDest.has(dest)) byDest.set(dest, []);
    byDest.get(dest).push(tts);
  }
  const findings = [];
  for (const [dest, values] of byDest) {
    if (values.length < 3) continue;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max - min <= 5) {
      findings.push({ dest, count: values.length, min, max });
    }
  }
  return findings;
}

const results = [];

async function probeStation(name) {
  const entry = stopByName.get(name);
  const naptanId = entry?.naptanId ?? "???";
  const modes = entry?.modes ?? [];
  const row = {
    name,
    naptanId,
    naptanPrefix: naptanId.slice(0, 4),
    modes: modes.join(","),
    directionsOffered: dirs[name] ?? [],
    directionsReachable: [],
    directionsUnreachable: [],
    signaturePlaceholder: [],
    rawRowCount: null,
    boardTripCount: null,
    error: null,
    rateLimited: false,
  };

  // Raw /Arrivals fetch — universal across modes, used for signature 2 & 3 diagnostics
  // regardless of which endpoint the adapter itself routes to.
  const raw = await rawFetchWithRetry(`/StopPoint/${encodeURIComponent(naptanId)}/Arrivals`);
  if (raw.rateLimited) {
    row.rateLimited = true;
  } else if (raw.error) {
    row.error = `raw: ${raw.error}`;
  } else {
    row.rawRowCount = Array.isArray(raw.rows) ? raw.rows.length : 0;
    row.signaturePlaceholder = detectPlaceholderTiming(raw.rows);
  }

  await sleep(450);

  // Adapter board fetch — exercises the actual endpoint-routing fix (ArrivalDepartures for
  // NR-backed Overground, Arrivals otherwise) and pickUpcomingTrips per offered direction.
  try {
    const board = await fetchStopBoard(name);
    row.boardTripCount = board.trips.length;
    for (const direction of row.directionsOffered) {
      const trips = pickUpcomingTrips(board.trips, direction);
      if (trips.length > 0) {
        row.directionsReachable.push(direction);
      } else {
        row.directionsUnreachable.push(direction);
      }
    }
  } catch (error) {
    row.error = (row.error ? row.error + "; " : "") + `board: ${error.message}`;
  }

  return row;
}

async function main() {
  for (const name of CANDIDATES) {
    process.stdout.write(`Probing ${name}... `);
    const row = await probeStation(name);
    results.push(row);
    if (row.rateLimited) {
      console.log("RATE LIMITED (skipped, not counted as a finding)");
    } else if (row.error) {
      console.log(`ERROR: ${row.error}`);
    } else {
      console.log(
        `raw=${row.rawRowCount} board=${row.boardTripCount} unreachable=[${row.directionsUnreachable.join(", ")}] placeholder=${row.signaturePlaceholder.length}`
      );
    }
    await sleep(600);
  }

  fs.writeFileSync(
    new URL("../qa/.terminus-sweep-results.json", import.meta.url),
    JSON.stringify(results, null, 2)
  );
  console.log("\nWrote qa/.terminus-sweep-results.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
