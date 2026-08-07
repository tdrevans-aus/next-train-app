import { getNextTrainData } from "../../lib/train-times.js";

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

export async function handler(event) {
  const config = readParams(event.queryStringParameters ?? {});

  if (!config) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required parameters: station, direction" }),
    };
  }

  try {
    const data = await getNextTrainData(config);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message ?? "Failed to fetch train times" }),
    };
  }
}
