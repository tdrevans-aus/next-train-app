/**
 * Probe live next-train for every multi-city hub (local adapters, no HTTP).
 * Usage: node qa/live-region-times-probe.mjs
 */
import { loadEnvLocal } from "../lib/load-env-local.js";
import { MULTI_CITY_IDS, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";

loadEnvLocal();

const HUBS = {
  sydney: "Central",
  brisbane: "Roma Street",
  adelaide: "Adelaide Railway Station",
  "uk-london-tfl": "King's Cross St. Pancras",
  amsterdam: "Centraal Station",
  vancouver: "Waterfront",
  canberra: "Alinga Street",
  "gold-coast": "Helensvale",
  newcastle: "Newcastle Interchange",
};

const MIDDAY_UTC = {
  sydney: "2026-08-27T02:00:00.000Z",
  brisbane: "2026-08-27T02:00:00.000Z",
  adelaide: "2026-08-27T02:30:00.000Z",
  "uk-london-tfl": "2026-08-27T11:00:00.000Z",
  amsterdam: "2026-08-27T10:00:00.000Z",
  vancouver: "2026-08-27T19:00:00.000Z",
  canberra: "2026-08-27T02:00:00.000Z",
  "gold-coast": "2026-08-27T02:00:00.000Z",
  newcastle: "2026-08-27T02:00:00.000Z",
};

async function probeCity(city) {
  const station = HUBS[city];
  const started = Date.now();
  try {
    const pack = await getMultiCityDirections(city, station);
    const chips = pack.directions ?? [];
    if (!chips.length) {
      return { city, station, ok: false, error: "no chips", ms: Date.now() - started };
    }
    const now = new Date(MIDDAY_UTC[city]);
    let lastError = null;
    for (const direction of chips) {
      const data = await getMultiCityNextTrain(city, {
        station,
        destination: direction,
        destinationLabel: direction,
        leaveBeforeMinutes: 10,
        refreshSeconds: 30,
        now,
      });
      const upcoming = Array.isArray(data?.upcoming) ? data.upcoming.length : 0;
      if (data?.next) {
        return {
          city,
          station,
          direction,
          ok: true,
          next: true,
          upcoming,
          ms: Date.now() - started,
        };
      }
      lastError = `empty board (${direction})`;
    }
    return {
      city,
      station,
      direction: chips[0],
      ok: true,
      next: false,
      upcoming: 0,
      error: lastError,
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      city,
      station,
      ok: false,
      error: error.message,
      ms: Date.now() - started,
    };
  }
}

const local = [];
for (const city of MULTI_CITY_IDS) {
  const row = await probeCity(city);
  local.push(row);
  const status = row.ok
    ? row.next
      ? `ok next via ${row.direction} upcoming=${row.upcoming}`
      : `empty ${row.error ?? ""}`
    : `FAIL ${row.error}`;
  console.log(`local ${city}: ${status} (${row.ms}ms)`);
}

const failed = local.filter((row) => !row.ok || !row.next);
if (failed.length) {
  console.error(`\nlive-region-times-probe: ${failed.length} cities without a next train`);
  process.exitCode = 1;
} else {
  console.log("\nlive-region-times-probe: all local adapters returned a next train");
}
