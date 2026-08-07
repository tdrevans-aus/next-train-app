import { getNextTrainData } from "../lib/train-times.js";

const DEFAULTS = {
  leaveBeforeMinutes: 3,
  refreshSeconds: 30,
};

function readParams(query) {
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
    leaveBeforeMinutes: Number(leaveBefore) || DEFAULTS.leaveBeforeMinutes,
    refreshSeconds: Number(refresh) || DEFAULTS.refreshSeconds,
  };
}

export default async function handler(req, res) {
  const config = readParams(req.query);

  if (!config) {
    res.status(400).json({ error: "Missing required parameters: station, direction" });
    return;
  }

  try {
    const data = await getNextTrainData(config);
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch train times" });
  }
}
