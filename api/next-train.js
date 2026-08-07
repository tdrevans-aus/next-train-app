import { getNextTrainData } from "../lib/train-times.js";

const DEFAULTS = {
  leaveBeforeMinutes: 3,
  refreshSeconds: 30,
};

function readParams(url) {
  const params = url.searchParams;
  const station = params.get("station");
  const direction = params.get("direction") ?? params.get("destination");
  const leaveBefore = params.get("leaveBefore") ?? params.get("leaveBeforeMinutes");
  const refresh = params.get("refresh") ?? params.get("refreshSeconds");

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

export default async function handler(request) {
  const config = readParams(new URL(request.url));

  if (!config) {
    return Response.json(
      { error: "Missing required parameters: station, direction" },
      { status: 400 }
    );
  }

  try {
    const data = await getNextTrainData(config);
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message ?? "Failed to fetch train times" },
      { status: 500 }
    );
  }
}
