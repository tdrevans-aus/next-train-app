import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  getNextTrainData,
  fetchTripsForStation,
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
import { listCities, assertCityLive } from "./lib/providers/registry.js";
import { getFoundingStatus, tryClaimFounding } from "./lib/founding-counter.js";
import { applyCors } from "./lib/api-cors.js";
import { isCityProbeAllowed, fetchDevCityBoard } from "./lib/dev-city-board.js";
import { loadEnvLocal } from "./lib/load-env-local.js";
import {
  getLiveAuDirections,
  getLiveAuNextTrain,
  isLiveAuCity,
  listLiveAuStations,
  resolveLiveAuStation,
} from "./lib/cities/live-city-api.js";

loadEnvLocal();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTION_FEEDBACK_URL = "https://next-train-app.vercel.app/api/feedback";

app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
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

function isLiveAuCityRequest(query = {}) {
  return isLiveAuCity(String(query.city || "").toLowerCase());
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

  if (isLiveAuCityRequest(req.query)) {
    const station = resolveLiveAuStation(config.city, config.station);
    if (!station) {
      res.status(400).json({ error: "Unknown station" });
      return;
    }
    try {
      const data = await getLiveAuNextTrain(config.city, { ...config, station });
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

  if (isLiveAuCityRequest(req.query)) {
    const station = resolveLiveAuStation(req.query.city, req.query.station);
    if (!station) {
      res.status(400).json({
        error: req.query.station ? "Unknown station" : "Missing station parameter",
      });
      return;
    }
    const pack = getLiveAuDirections(req.query.city, station);
    res.json({ directions: pack.directions, source: pack.source });
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

  if (isLiveAuCityRequest(req.query)) {
    const station = resolveLiveAuStation(req.query.city, req.query.station);
    if (!station) {
      res.status(400).json({
        error: req.query.station ? "Unknown station" : "Missing station parameter",
      });
      return;
    }
    const pack = getLiveAuDirections(req.query.city, station);
    res.json({ destinations: pack.directions, source: pack.source });
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

app.get("/api/founding-status", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(getFoundingStatus());
});

app.post("/api/founding-claim", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(tryClaimFounding());
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

  if (!isLiveAuCity(city)) {
    res.status(400).json({ error: "Station catalog only available for Sydney, Brisbane, and Adelaide" });
    return;
  }

  const stations = listLiveAuStations(city).map((entry) => ({
    name: entry.name,
    lat: entry.lat ?? null,
    lng: entry.lng ?? null,
  }));

  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.json({ city, stations });
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
