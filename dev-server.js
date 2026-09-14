import { readFileSync } from "fs";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  getNextTrainData,
  fetchTripsForStation,
  PERTH_CLUSTER_STATIONS,
} from "./lib/train-times.js";
import {
  FIXTURE_CATALOG,
  getFixtureDirections,
  getFixtureNextTrainData,
  listFixtures,
} from "./lib/fixtures.js";
import { checkRateLimit } from "./lib/api-rate-limit.js";
import { resolveDirectionsForStation } from "./lib/cities/perth/static-directions.js";
import { resolveAllowedStation } from "./lib/api-station-allowlist.js";
import { listCities, assertCityLive, getCity, CITIES } from "./lib/providers/registry.js";
import { isKnownCountry, regionIdsForCountry } from "./lib/cities/country-regions.js";
import { applyCors } from "./lib/api-cors.js";
import { isCityProbeAllowed, fetchDevCityBoard } from "./lib/dev-city-board.js";
import { loadEnvLocal } from "./lib/load-env-local.js";
import {
  getMultiCityDirections,
  getMultiCityNextTrain,
  isMultiCity,
  listMultiCityStations,
  resolveMultiCityStation,
  findNearestStation as findNearestMultiCityStation,
} from "./lib/cities/live-city-api.js";
import { buildNextTrainResponse, pickUpcomingTrips, parseLiveBoardTimestamp, pickUpcomingProviderTrips } from "./lib/train-times-core.js";
import { sendGenericServerError } from "./lib/api-error-response.js";

loadEnvLocal();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTION_FEEDBACK_URL = "https://next-train-app.vercel.app/api/feedback";

app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (/\.js$/i.test(req.path)) {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});
app.use(express.static(join(__dirname, "public")));
app.use("/design", express.static(join(__dirname, "design")));

function readQueryParams(query) {
  const station = query.station;
  const direction = query.direction ?? query.destination;
  const leaveBefore = query.leaveBefore ?? query.leaveBeforeMinutes;
  const refresh = query.refresh ?? query.refreshSeconds;
  const skipTrains = query.skipTrains ?? query.skip;
  const city = query.city ?? "perth";

  if (!station || !direction) {
    return null;
  }

  return {
    city,
    station,
    destination: direction,
    destinationLabel: direction,
    leaveBeforeMinutes: Number(leaveBefore) || DEFAULT_LEAVE_BEFORE_MINUTES,
    refreshSeconds: Number(refresh) || DEFAULT_REFRESH_SECONDS,
    skipTrains: Math.max(0, Math.floor(Number(skipTrains) || 0)),
  };
}

function isMultiCityRequest(query = {}) {
  return isMultiCity(String(query.city || "").toLowerCase());
}

function readFixtureId(query) {
  const fixture = String(query.fixture ?? "").trim().toLowerCase();
  return fixture && FIXTURE_CATALOG[fixture] ? fixture : null;
}

/** QA smoke hammers localhost; skip soft rate-limit on CI dev-server. */
function gateRequest(req, res) {
  if (process.env.CI === "true") {
    return true;
  }
  return checkRateLimit(req, res);
}

app.get("/api/fixtures", (_req, res) => {
  res.json({ fixtures: listFixtures() });
});

app.get("/api/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    service: "next-train-api",
    ts: new Date().toISOString(),
  });
});

app.get("/api/ready", (_req, res) => {
  import("./lib/train-times-server.js")
    .then(async () => {
      const { unzipSync } = await import("./lib/vendor/fflate.mjs");
      if (typeof unzipSync !== "function") {
        res.status(500).json({ ok: false, ready: false, error: "gtfs unzip unavailable" });
        return;
      }
      const station = resolveAllowedStation("Edgewater Stn");
      if (!station) {
        res.status(500).json({ ok: false, ready: false, error: "station allowlist unavailable" });
        return;
      }
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({
        ok: true,
        ready: true,
        service: "next-train-api",
        checks: ["train-times-server", "gtfs-static-cache", "fflate-vendor", "allowlist"],
        ts: new Date().toISOString(),
      });
    })
    .catch((error) => {
      res.status(500).json({ ok: false, ready: false, error: error.message ?? "ready check failed" });
    });
});

app.get("/api/cities", (_req, res) => {
  res.setHeader("Cache-Control", "public, s-maxage=300");
  res.json({
    contractVersion: 1,
    cities: listCities(),
    docs: "docs/multi-city-provider-design.md",
  });
});

app.get("/api/next-train", async (req, res) => {
  if (applyCors(req, res)) {
    return;
  }

  if (!gateRequest(req, res)) {
    return;
  }

  const config = readQueryParams(req.query);
  if (!config) {
    res.status(400).json({ error: "Missing required parameters: station, direction" });
    return;
  }

  if (isMultiCityRequest(req.query)) {
    const station = resolveMultiCityStation(config.city, config.station);
    if (!station) {
      res.status(400).json({ error: "Unknown station" });
      return;
    }
    try {
      const data = await getMultiCityNextTrain(config.city, { ...config, station });
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message ?? "Failed to fetch train times" });
    }
    return;
  }

  const cityGate = assertCityLive(config.city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  const station = resolveAllowedStation(config.station);
  if (!station) {
    res.status(400).json({ error: "Unknown station" });
    return;
  }
  config.station = station;

  const fixtureId = readFixtureId(req.query);
  if (fixtureId) {
    if (fixtureId === "error") {
      res.status(500).json({ error: "Fixture error: simulated API failure" });
      return;
    }

    try {
      const data = getFixtureNextTrainData(fixtureId, config);
      res.json({ ...data, fixture: fixtureId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message ?? "Fixture failed" });
    }
    return;
  }

  try {
    const data = await getNextTrainData(config);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch train times" });
  }
});

app.get("/api/directions", async (req, res) => {
  if (applyCors(req, res)) {
    return;
  }

  if (!gateRequest(req, res)) {
    return;
  }

  if (isMultiCityRequest(req.query)) {
    const station = resolveMultiCityStation(req.query.city, req.query.station);
    if (!station) {
      res.status(400).json({
        error: req.query.station ? "Unknown station" : "Missing station parameter",
      });
      return;
    }
    // Was unguarded (docs/jim-brief-nightly-qa-red.md, 14 Sep 2026): a thrown
    // MissingDarwinTokenError here (no DARWIN_LDB_TOKEN set, e.g. greater-manchester
    // locally/in CI) was an uncaught exception with no process-level handler
    // registered, crashing this whole shared dev-server process mid-suite —
    // the actual root cause of ~15 unrelated nightly "FAIL"s that were really
    // every script queued after whichever one first hit this endpoint. The
    // real production route (api/directions.js) already wraps this same call
    // in try/catch; this mirrors that.
    try {
      const pack = await getMultiCityDirections(req.query.city, station);
      res.json({ directions: pack.directions, source: pack.source });
    } catch (error) {
      sendGenericServerError(res, {
        error,
        fallbackMessage: "Failed to fetch directions",
        city: req.query.city,
        station,
      });
    }
    return;
  }

  const fixtureId = readFixtureId(req.query);

  const station = resolveAllowedStation(req.query.station);
  if (!station) {
    res.status(400).json({
      error: req.query.station ? "Unknown station" : "Missing station parameter",
    });
    return;
  }

  if (fixtureId) {
    res.json({ directions: getFixtureDirections(fixtureId) });
    return;
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    const { directions, source } = resolveDirectionsForStation(station, trips);
    res.json({ directions, source });
  } catch (error) {
    console.error(error);
    const fallback = resolveDirectionsForStation(station, []);
    if (fallback.directions.length) {
      res.json({ directions: fallback.directions, source: fallback.source });
      return;
    }
    res.status(500).json({ error: error.message ?? "Failed to fetch directions" });
  }
});

app.get("/api/destinations", async (req, res) => {
  if (applyCors(req, res)) {
    return;
  }

  if (!gateRequest(req, res)) {
    return;
  }

  if (isMultiCityRequest(req.query)) {
    const station = resolveMultiCityStation(req.query.city, req.query.station);
    if (!station) {
      res.status(400).json({
        error: req.query.station ? "Unknown station" : "Missing station parameter",
      });
      return;
    }
    // Same unguarded-throw bug as /api/directions above (docs/jim-brief-nightly-qa-red.md,
    // 14 Sep 2026) — a rejected getMultiCityDirections() here crashed the
    // whole shared dev-server process with no try/catch. Mirrors
    // api/destinations.js's own handling of this same call.
    try {
      const pack = await getMultiCityDirections(req.query.city, station);
      res.json({ destinations: pack.directions, source: pack.source });
    } catch (error) {
      sendGenericServerError(res, {
        error,
        fallbackMessage: "Failed to fetch destinations",
        city: req.query.city,
        station,
      });
    }
    return;
  }

  const station = resolveAllowedStation(req.query.station);
  if (!station) {
    res.status(400).json({
      error: req.query.station ? "Unknown station" : "Missing station parameter",
    });
    return;
  }

  const fixtureId = readFixtureId(req.query);
  if (fixtureId) {
    res.json({ destinations: getFixtureDirections(fixtureId) });
    return;
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    const { directions, source } = resolveDirectionsForStation(station, trips);
    res.json({ destinations: directions, source });
  } catch (error) {
    console.error(error);
    const fallback = resolveDirectionsForStation(station, []);
    if (fallback.directions.length) {
      res.json({ destinations: fallback.directions, source: fallback.source });
      return;
    }
    res.status(500).json({ error: error.message ?? "Failed to fetch directions" });
  }
});

app.options("/api/feedback", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.status(204).end();
});

app.post("/api/feedback", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const upstream = await fetch(PRODUCTION_FEEDBACK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(req.body || {}),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(text);
  } catch (error) {
    console.warn("Local feedback proxy failed", error);
    res.status(502).json({
      error: "Could not send feedback",
      mailto: "EvansAppStudio@gmail.com",
    });
  }
});

app.get("/api/board", async (req, res) => {
  if (applyCors(req, res)) {
    return;
  }

  if (!gateRequest(req, res)) {
    return;
  }

  const city = req.query?.city ?? "perth";
  let stationName = req.query?.station;
  const lat = req.query?.lat ? parseFloat(req.query.lat) : null;
  const lng = req.query?.lng ? parseFloat(req.query.lng) : null;

  if (!stationName && lat != null && lng != null) {
    stationName = findNearestMultiCityStation(city, lat, lng);
  }

  if (!stationName) {
    res.status(400).json({ error: "Missing required parameter: station" });
    return;
  }

  const cityGate = assertCityLive(city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  const now = new Date();
  const leaveBeforeMinutes = Number(req.query?.leaveBefore) || DEFAULT_LEAVE_BEFORE_MINUTES;
  const refreshSeconds = Number(req.query?.refresh) || DEFAULT_REFRESH_SECONDS;

  const fixtureId = readFixtureId(req.query);
  if (fixtureId) {
    if (fixtureId === "error") {
      res.status(500).json({ error: "Fixture error: simulated API failure" });
      return;
    }

    try {
      const directions = getFixtureDirections(fixtureId);
      const entries = directions.map(direction => {
        const config = {
          city,
          station: stationName,
          destination: direction,
          destinationLabel: direction,
          leaveBeforeMinutes,
          refreshSeconds,
          skipTrains: 0,
          now,
        };
        const data = getFixtureNextTrainData(fixtureId, config);
        return { direction, data };
      });

      res.json({
        stationName: stationName,
        lastUpdated: now.toISOString(),
        entries,
        fixture: fixtureId
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message ?? "Fixture failed" });
    }
    return;
  }

  try {
    if (isMultiCity(city)) {
      const station = resolveMultiCityStation(city, stationName);
      if (!station) {
        res.status(400).json({ error: "Unknown station" });
        return;
      }

      const { directions } = await getMultiCityDirections(city, station);
      
      // Optimized TfL fetch
      if (city === "uk-london-tfl") {
        try {
          const { fetchStopBoard } = await import("./lib/providers/uk-tfl.js");
          const cityData = getCity("uk-london-tfl");
          
          const board = await fetchStopBoard(station);
          const entries = directions.map(direction => {
            const upcoming = pickUpcomingProviderTrips(board.trips || [], direction, now);
            const data = buildNextTrainResponse({
              station: board.stationName,
              destination: direction,
              destinationLabel: direction,
              leaveBeforeMinutes,
              refreshSeconds,
              now,
              lastUpdated: board.lastUpdate ? new Date(board.lastUpdate) : now,
              upcomingTrips: upcoming,
              timeZone: cityData.timeZone,
            });
            return { direction, data };
          });

          res.status(200).json({
            stationName: station,
            lastUpdated: board.lastUpdate || now.toISOString(),
            entries: entries.filter(e => e.data?.next),
          });
          return;
        } catch (error) {
          console.error(`[api/board] TfL optimized fetch failed:`, error.message);
        }
      }

      const entries = await Promise.all(
        directions.map(async (direction) => {
          try {
            const data = await getMultiCityNextTrain(city, {
              station,
              destination: direction,
              leaveBeforeMinutes,
              refreshSeconds,
              now,
            });
            return { direction, data };
          } catch (error) {
            console.warn(`[api/board] Failed to fetch ${direction} for ${station}:`, error.message);
            return null;
          }
        })
      );

      res.status(200).json({
        stationName: station,
        lastUpdated: now.toISOString(),
        entries: entries.filter(Boolean),
      });
      return;
    }

    // Perth
    const station = resolveAllowedStation(stationName);
    if (!station) {
      res.status(400).json({ error: "Unknown station" });
      return;
    }

    const { trips, lastUpdate } = await fetchTripsForStation(station);
    const { directions } = resolveDirectionsForStation(station, trips);

    const entries = directions.map((direction) => {
      const upcoming = pickUpcomingTrips(trips, direction, now);
      const data = buildNextTrainResponse({
        station,
        destination: direction,
        destinationLabel: direction,
        leaveBeforeMinutes,
        refreshSeconds,
        skipTrains: 0,
        now,
        lastUpdated: parseLiveBoardTimestamp(lastUpdate),
        upcomingTrips: upcoming,
        timeZone: "Australia/Perth",
      });
      return { direction, data };
    });

    res.status(200).json({
      stationName: station,
      lastUpdated: lastUpdate || now.toISOString(),
      entries: entries.filter(e => e.data?.next),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch station board" });
  }
});

app.get("/api/city-stations", (req, res) => {
  if (applyCors(req, res)) {
    return;
  }

  if (!gateRequest(req, res)) {
    return;
  }

  const city = req.query.city ?? "";
  const cityGate = assertCityLive(city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  if (!isMultiCity(city)) {
    res.status(400).json({ error: "Station catalog only available for Sydney, Brisbane, Adelaide, and London" });
    return;
  }

  const stations = listMultiCityStations(city).map((entry) => ({
    name: entry.name,
    lat: entry.lat ?? null,
    lng: entry.lng ?? null,
    // docs/jim-brief-no-live-feed-stops-out-of-picker.md: keep this in sync
    // with api/city-stations.js — carried through as-is (listMultiCityStations
    // already defaults it to true when absent).
    liveFeed: entry.liveFeed,
  }));

  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.json({ city, stations });
});

// docs/jim-brief-country-wide-station-picker.md: mirrors api/country-stations.js
// (dev-server.js doesn't auto-route api/*.js — every route is hand-wired here).
let devPerthStationsCache = null;
function loadDevPerthStations() {
  if (devPerthStationsCache) {
    return devPerthStationsCache;
  }
  const perthStationSet = new Set(PERTH_CLUSTER_STATIONS);
  const canonicalPerthStation = PERTH_CLUSTER_STATIONS[0];
  try {
    const rawNames = JSON.parse(readFileSync(join(__dirname, "public", "stations.json"), "utf8"));
    const coords = JSON.parse(readFileSync(join(__dirname, "public", "station-coords.json"), "utf8"));
    const collapsed = [];
    let perthAdded = false;
    for (const name of Array.isArray(rawNames) ? rawNames : []) {
      if (perthStationSet.has(name)) {
        if (!perthAdded) {
          collapsed.push(canonicalPerthStation);
          perthAdded = true;
        }
        continue;
      }
      collapsed.push(name);
    }
    devPerthStationsCache = collapsed.map((name) => ({
      name,
      lat: coords?.[name]?.lat ?? null,
      lng: coords?.[name]?.lng ?? null,
      liveFeed: true,
    }));
  } catch (error) {
    console.error("[dev-server] Could not load Perth catalog for country-stations", error);
    devPerthStationsCache = [];
  }
  return devPerthStationsCache;
}

app.get("/api/country-stations", (req, res) => {
  if (applyCors(req, res)) {
    return;
  }
  if (!gateRequest(req, res)) {
    return;
  }

  const country = String(req.query.country ?? "").trim().toLowerCase();
  if (!isKnownCountry(country)) {
    res.status(400).json({ error: "Unknown country", country });
    return;
  }

  const regions = [];
  const stations = [];
  for (const regionId of regionIdsForCountry(country)) {
    const entry = CITIES.find((c) => c.id === regionId);
    if (!entry || entry.status !== "live") {
      continue;
    }
    let regionStations;
    if (regionId === "perth") {
      regionStations = loadDevPerthStations();
    } else if (isMultiCity(regionId)) {
      regionStations = listMultiCityStations(regionId);
    } else {
      continue;
    }
    if (!regionStations.length) {
      continue;
    }
    const region = { id: regionId, displayName: entry.displayName };
    regions.push(region);
    for (const station of regionStations) {
      stations.push({
        name: station.name,
        lat: station.lat ?? null,
        lng: station.lng ?? null,
        liveFeed: station.liveFeed,
        region,
      });
    }
  }

  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.json({ country, regions, stations });
});

// docs/jim-brief-help-coverage-notes.md: mirrors api/coverage-notes.js so
// public/help-coverage.js's dev-server fallback (bundled file, then this
// route) actually has something to load locally — the bundled
// public/coverage-notes/<city>.json is gitignored and only exists after
// scripts/write-coverage-notes.mjs runs, which most local sessions haven't.
app.get("/api/coverage-notes", (req, res) => {
  if (applyCors(req, res)) {
    return;
  }

  if (!gateRequest(req, res)) {
    return;
  }

  const city = req.query.city ?? "";
  const cityGate = assertCityLive(city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  const file = join(__dirname, "lib", "cities", cityGate.city.id, "coverage.json");
  let notes;
  try {
    notes = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    res.status(404).json({ error: "No coverage notes for this city yet", city: cityGate.city.id });
    return;
  }

  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.json({ region: cityGate.city.id, ...notes });
});

app.get("/api/dev/board", async (req, res) => {
  if (applyCors(req, res)) {
    return;
  }

  if (!isCityProbeAllowed()) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!gateRequest(req, res)) {
    return;
  }

  const city = req.query.city ?? "perth";
  const list = req.query.list === "1" || req.query.list === "true";
  const station = req.query.station;
  const result = await fetchDevCityBoard(city, station, { list });
  res.setHeader("Cache-Control", "no-store");
  res.status(result.status).json(result.body);
});

export default app;

if (process.env.VERCEL !== "1") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Next Train App running at http://localhost:${PORT}`);
    console.log(`Fixture mode: add ?fixture=<name> (see TESTING.md or GET /api/fixtures)`);
  });
}
