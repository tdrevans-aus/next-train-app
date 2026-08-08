import {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  getNextTrainData,
} from "../../lib/train-times.js";

function readParams(query) {
  const station = query.station;
  const direction = query.direction ?? query.destination;
  const leaveBefore = query.leaveBefore ?? query.leaveBeforeMinutes;
  const refresh = query.refresh ?? query.refreshSeconds;
  const skipTrains = query.skipTrains ?? query.skip;

  if (!station || !direction) {
    return null;
  }

  return {
    station,
    destination: direction,
    destinationLabel: direction,
    leaveBeforeMinutes: Number(leaveBefore) || DEFAULT_LEAVE_BEFORE_MINUTES,
    refreshSeconds: Number(refresh) || DEFAULT_REFRESH_SECONDS,
    skipTrains: Math.max(0, Math.floor(Number(skipTrains) || 0)),
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
