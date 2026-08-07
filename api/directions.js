import { fetchTripsForStation, uniqueDestinations } from "../lib/train-times.js";
import { applyCors } from "../lib/api-cors.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  const station = req.query?.station;

  if (!station) {
    res.status(400).json({ error: "Missing station parameter" });
    return;
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    res.status(200).json({ directions: uniqueDestinations(trips) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch directions" });
  }
}
