import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  getNextTrainData,
  fetchTripsForStation,
  uniqueDestinations,
} from "./lib/train-times.js";
import {
  FIXTURE_CATALOG,
  getFixtureDirections,
  getFixtureNextTrainData,
  listFixtures,
} from "./lib/fixtures.js";
import { checkRateLimit } from "./lib/api-rate-limit.js";
import { resolveAllowedStation } from "./lib/api-station-allowlist.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, "public")));

function readQueryParams(query) {
  const station = query.station;
  const direction = query.direction ?? query.destination;
  const leaveBefore = query.leaveBefore ?? query.leaveBeforeMinutes;
  const refresh = query.refresh ?? query.refreshSeconds;
  const skipTrains = query.skipTrains ?? query.skip;

  if (!station || !direction) {
    return null;
  }

  const allowedStation = resolveAllowedStation(station);
  if (!allowedStation) {
    return { error: "Unknown station" };
  }

  return {
    station: allowedStation,
    destination: direction,
    destinationLabel: direction,
    leaveBeforeMinutes: Number(leaveBefore) || DEFAULT_LEAVE_BEFORE_MINUTES,
    refreshSeconds: Number(refresh) || DEFAULT_REFRESH_SECONDS,
    skipTrains: Math.max(0, Math.floor(Number(skipTrains) || 0)),
  };
}

function readFixtureId(query) {
  const fixture = String(query.fixture ?? "").trim().toLowerCase();
  return fixture && FIXTURE_CATALOG[fixture] ? fixture : null;
}

app.get("/api/fixtures", (_req, res) => {
  res.json({ fixtures: listFixtures() });
});

app.get("/api/next-train", async (req, res) => {
  if (!checkRateLimit(req, res)) {
    return;
  }

  const config = readQueryParams(req.query);
  if (!config) {
    res.status(400).json({ error: "Missing required parameters: station, direction" });
    return;
  }

  if (config.error) {
    res.status(400).json({ error: config.error });
    return;
  }

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
  if (!checkRateLimit(req, res)) {
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
    res.json({ directions: getFixtureDirections(fixtureId) });
    return;
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    res.json({ directions: uniqueDestinations(trips) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch directions" });
  }
});

app.get("/api/destinations", async (req, res) => {
  if (!checkRateLimit(req, res)) {
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
    res.json({ destinations: uniqueDestinations(trips) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch directions" });
  }
});

export default app;

if (process.env.VERCEL !== "1") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Next Train App running at http://localhost:${PORT}`);
    console.log(`Fixture mode: add ?fixture=<name> (see TESTING.md or GET /api/fixtures)`);
  });
}
