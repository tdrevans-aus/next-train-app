/**
 * London: full-network destination reconciliation probe (throwaway data-gathering script for
 * docs/mark-brief-london-destination-reconciliation.md). Not registered in qa/run-all.mjs -- it
 * needs TFL_APP_KEY and live network, same reason qa/uk-london-terminus-sweep-probe.mjs is
 * unregistered.
 *
 * For every station in public/city-directions/uk-london-tfl.json: fetch raw TfL rows through the
 * SAME endpoint the adapter would choose (mirrors lib/providers/uk-tfl.js's usesArrivalDepartures
 * and fetchStopBoard's alsoNaptanIds folding), parse them through the adapter's own parse
 * functions plus normalizeDestination, and record whether each offered direction matches an
 * upcoming parsed trip.
 *
 * Writes qa/.london-destination-reconciliation-raw.json (untracked scratch -- full raw dump) for
 * the report-writing pass to read back without re-hitting the API.
 *
 * Usage: node qa/london-destination-reconciliation-probe.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadEnvLocal } from "../lib/load-env-local.js";
import {
  parseTflArrival,
  parseTflArrivalDeparture,
  TFL_API_BASE,
} from "../lib/providers/uk-tfl.js";
import { resolveTflStops } from "../lib/providers/uk/catalog.js";
import { pickUpcomingTrips } from "../lib/train-times-core.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

loadEnvLocal();

const REGION_ID = "uk-london-tfl";
const NR_BACKED_NAPTAN_PREFIX = "910G";

function usesArrivalDepartures(entry) {
  return (
    String(entry.naptanId || "").startsWith(NR_BACKED_NAPTAN_PREFIX) &&
    (entry.modes ?? []).includes("overground")
  );
}

function lineNameToId(lineName) {
  return String(lineName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+line$/i, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");
}

function readTflAppKey() {
  const key = String(process.env.TFL_APP_KEY ?? "").trim();
  if (!key) {
    throw new Error("TFL_APP_KEY is not set");
  }
  return key;
}

const APP_KEY = readTflAppKey();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let requestCount = 0;
let retry429Count = 0;

async function rateLimitedFetch(path) {
  const delay = 450 + Math.random() * 150;
  await sleep(delay);
  const sep = path.includes("?") ? "&" : "?";
  const url = `${TFL_API_BASE}${path}${sep}app_key=${encodeURIComponent(APP_KEY)}`;
  requestCount++;
  let attempt = 0;
  const backoffs = [2000, 4000, 6000];
  for (;;) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (response.status === 429) {
      retry429Count++;
      if (attempt >= backoffs.length) {
        throw new Error(`429 (gave up after ${attempt} retries) for ${path}`);
      }
      await sleep(backoffs[attempt]);
      attempt++;
      continue;
    }
    if (!response.ok) {
      throw new Error(`TfL API ${response.status} for ${path}`);
    }
    return response.json();
  }
}

const directionsByStation = JSON.parse(
  readFileSync(join(ROOT, "public", "city-directions", "uk-london-tfl.json"), "utf8")
);
const LIMIT = Number(process.env.PROBE_LIMIT ?? 0);
const allStationNames = Object.keys(directionsByStation);
const stationNames = LIMIT > 0 ? allStationNames.slice(0, LIMIT) : allStationNames;

console.log(`${stationNames.length} catalog stations to probe.`);
console.log(`Window: ${new Date().toISOString()} (local: ${new Date().toString()})`);

// Cache raw fetches by naptanId+endpoint(+line) so folded alsoNaptanIds / repeated ids across
// stations are only ever fetched once.
const arrivalsCache = new Map(); // naptanId -> rows
const adCache = new Map(); // `${naptanId}|${lineId}` -> rows
const failedIds = new Set(); // naptanId (or naptanId|lineId) this run could not fetch

async function fetchArrivalsCached(naptanId) {
  if (arrivalsCache.has(naptanId)) return arrivalsCache.get(naptanId);
  try {
    const rows = await rateLimitedFetch(`/StopPoint/${encodeURIComponent(naptanId)}/Arrivals`);
    const list = Array.isArray(rows) ? rows : [];
    arrivalsCache.set(naptanId, list);
    return list;
  } catch (error) {
    console.warn(`  [Arrivals FAIL] ${naptanId}: ${error.message}`);
    failedIds.add(naptanId);
    arrivalsCache.set(naptanId, []);
    return [];
  }
}

async function fetchArrivalDeparturesCached(naptanId, lineName) {
  const lineId = lineNameToId(lineName);
  const key = `${naptanId}|${lineId}`;
  if (adCache.has(key)) return adCache.get(key);
  try {
    const rows = await rateLimitedFetch(
      `/StopPoint/${encodeURIComponent(naptanId)}/ArrivalDepartures?lineIds=${encodeURIComponent(lineId)}`
    );
    const list = Array.isArray(rows) ? rows : [];
    adCache.set(key, list);
    return list;
  } catch (error) {
    console.warn(`  [ArrivalDepartures FAIL] ${naptanId} (${lineName}): ${error.message}`);
    failedIds.add(key);
    adCache.set(key, []);
    return [];
  }
}

const stationResults = {};
const naptanPrefixOf = (id) => String(id || "").slice(0, 4);

let stationIndex = 0;
for (const stationName of stationNames) {
  stationIndex++;
  const entries = resolveTflStops(stationName, REGION_ID);
  if (entries.length === 0) {
    stationResults[stationName] = { error: "unresolved in catalog", directions: directionsByStation[stationName] };
    continue;
  }

  // Mirror fetchStopBoard's idsToFetch folding.
  const idsToFetch = new Map();
  for (const entry of entries) {
    if (!idsToFetch.has(entry.naptanId)) idsToFetch.set(entry.naptanId, entry);
    for (const alsoId of entry.alsoNaptanIds ?? []) {
      if (!idsToFetch.has(alsoId)) idsToFetch.set(alsoId, entry);
    }
  }

  const rawRows = [];
  const allTripsMap = new Map();

  for (const [naptanId, owningEntry] of idsToFetch) {
    const fetchEntry = { ...owningEntry, naptanId };
    if (usesArrivalDepartures(fetchEntry)) {
      for (const lineName of owningEntry.lines ?? []) {
        const rows = await fetchArrivalDeparturesCached(naptanId, lineName);
        for (const row of rows) {
          rawRows.push({
            naptanId,
            naptanPrefix: naptanPrefixOf(naptanId),
            endpoint: "ArrivalDepartures",
            lineName,
            modeName: "overground",
            towards: null,
            destinationName: row.destinationName ?? null,
            timingField: row.estimatedTimeOfDeparture ? "estimatedTimeOfDeparture" : "scheduledTimeOfDeparture",
            timingValue: row.estimatedTimeOfDeparture || row.scheduledTimeOfDeparture || null,
          });
          const trip = parseTflArrivalDeparture(row, lineName, new Date(), REGION_ID);
          if (trip) {
            const existing = allTripsMap.get(trip.id);
            if (!existing || trip.liveDeparture < existing.liveDeparture) {
              allTripsMap.set(trip.id, trip);
            }
          }
        }
      }
    } else {
      const rows = await fetchArrivalsCached(naptanId);
      for (const row of rows) {
        rawRows.push({
          naptanId,
          naptanPrefix: naptanPrefixOf(naptanId),
          endpoint: "Arrivals",
          lineName: row.lineName ?? row.lineId ?? null,
          modeName: row.modeName ?? null,
          towards: row.towards ?? null,
          destinationName: row.destinationName ?? null,
          timingField: "timeToStation",
          timingValue: row.timeToStation ?? null,
        });
        const trip = parseTflArrival(row, new Date(), REGION_ID);
        if (trip) {
          const existing = allTripsMap.get(trip.id);
          if (!existing || trip.liveDeparture < existing.liveDeparture) {
            allTripsMap.set(trip.id, trip);
          }
        }
      }
    }
  }

  const trips = Array.from(allTripsMap.values());
  const now = new Date();
  const directions = directionsByStation[stationName] ?? [];
  const directionResults = {};
  for (const direction of directions) {
    const upcoming = pickUpcomingTrips(trips, direction, now);
    directionResults[direction] = {
      matchedCount: upcoming.length,
      timings: upcoming.map((t) => t.liveDeparture.getTime()),
    };
  }

  stationResults[stationName] = {
    naptanIds: [...idsToFetch.keys()],
    rawRowCount: rawRows.length,
    parsedTripCount: trips.length,
    rawRows,
    parsedDestinations: trips.map((t) => t.destination),
    directions: directionResults,
  };

  if (stationIndex % 25 === 0) {
    console.log(`  ...${stationIndex}/${stationNames.length} stations probed (${requestCount} requests so far, ${retry429Count} 429s)`);
  }
}

console.log(`\nDone. ${requestCount} total requests, ${retry429Count} 429 retries hit, ${failedIds.size} ids/lines gave up.`);

const output = {
  capturedAt: new Date().toISOString(),
  requestCount,
  retry429Count,
  failedIds: [...failedIds],
  stations: stationResults,
};

writeFileSync(join(ROOT, "qa", ".london-destination-reconciliation-raw.json"), JSON.stringify(output));
console.log("Wrote qa/.london-destination-reconciliation-raw.json");

