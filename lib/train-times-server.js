/**
 * Server-only next-train: live board first, then Transperth GTFS when quiet.
 * Do not import from the browser train-times-bundle.
 */

import {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  DEFAULT_TIME_ZONE,
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
  getNextTrainData as getLiveNextTrainData,
} from "./train-times.js";
import { fetchPerthScheduledBoard } from "./cities/perth/schedule-fallback.js";

export {
  DEFAULT_LEAVE_BEFORE_MINUTES,
  DEFAULT_REFRESH_SECONDS,
  getLiveNextTrainData,
};

export async function getNextTrainData(config) {
  const live = await getLiveNextTrainData(config);
  if (live?.next) {
    return { ...live, scheduleSource: "live" };
  }

  const scheduled = await fetchPerthScheduledBoard(config.station);
  if (!scheduled?.trips?.length) {
    return { ...live, scheduleSource: "live-empty" };
  }

  const now = config.now ?? new Date();
  const upcomingTrips = pickUpcomingProviderTrips(
    scheduled.trips,
    config.destination,
    now
  );

  return {
    ...buildNextTrainResponse({
      station: scheduled.stationName,
      destination: config.destination,
      destinationLabel: config.destinationLabel ?? config.destination,
      leaveBeforeMinutes: config.leaveBeforeMinutes,
      refreshSeconds: config.refreshSeconds,
      skipTrains: config.skipTrains ?? 0,
      now,
      lastUpdated: null,
      upcomingTrips,
      timeZone: config.timeZone ?? DEFAULT_TIME_ZONE,
    }),
    scheduleSource: "gtfs-static",
  };
}
