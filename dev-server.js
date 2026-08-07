import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getNextTrainData, fetchTripsForStation, uniqueDestinations } from "./lib/train-times.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, "public")));

function readQueryParams(query) {
  const station = query.station;
  const direction = query.direction ?? query.destination;
  const leaveBefore = query.leaveBefore ?? query.leaveBeforeMinutes;
  const refresh = query.refresh ?? query.refreshSeconds;

  if (!station || !direction) {
    return null;
  }

  return {
    station,
    destination: direction,
    destinationLabel: direction,
    leaveBeforeMinutes: Number(leaveBefore) || 3,
    refreshSeconds: Number(refresh) || 30,
  };
}

app.get("/api/next-train", async (req, res) => {
  const config = readQueryParams(req.query);
  if (!config) {
    res.status(400).json({ error: "Missing required parameters: station, direction" });
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
  const station = req.query.station;
  if (!station) {
    res.status(400).json({ error: "Missing station parameter" });
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
  const station = req.query.station;
  if (!station) {
    res.status(400).json({ error: "Missing station parameter" });
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
  });
}
