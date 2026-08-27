/**
 * GTFS-Realtime TripUpdates fetch + decode.
 */

import GtfsRealtimeBindings from "../../vendor/gtfs-realtime.mjs";

/**
 * @param {string} url
 * @param {{ headers?: Record<string,string> }} [options]
 * @returns {Promise<{ entities: object[], fetchedAt: Date }>}
 */
export async function fetchTripUpdates(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? 4000);
  const response = await fetch(url, {
    headers: {
      Accept: "application/x-google-protobuf, application/x-protobuf, application/octet-stream",
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`GTFS-RT fetch failed (${response.status}) for ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  const entities = feed.entity ?? [];

  return {
    entities,
    fetchedAt: new Date(),
  };
}

/**
 * Merge multiple TripUpdate entity lists (e.g. Sydney Trains + Metro).
 */
export function mergeTripUpdateEntities(results) {
  const entities = [];
  let fetchedAt = new Date(0);
  for (const result of results) {
    entities.push(...(result?.entities ?? []));
    if (result?.fetchedAt && result.fetchedAt > fetchedAt) {
      fetchedAt = result.fetchedAt;
    }
  }
  return { entities, fetchedAt };
}

/**
 * Build lookup maps from TripUpdate entities.
 * @param {object[]} entities
 * @param {{ resolveTripId?: (trip: object) => string | null }} [options]
 *        resolveTripId: map RT TripDescriptor to static trip_id; return null to skip.
 */
export function indexTripUpdates(entities, options = {}) {
  /** trip_id -> delay seconds (trip-level) */
  const tripDelaySec = new Map();
  /** `${trip_id}:${stop_id}` -> { delaySec, arrivalSec, departureSec } */
  const stopUpdates = new Map();
  const cancelledTrips = new Set();
  const resolveTripId = options.resolveTripId;

  for (const entity of entities) {
    const update = entity.tripUpdate;
    if (!update) {
      continue;
    }

    const descriptor = update.trip ?? {};
    let tripId = descriptor.tripId;
    if (resolveTripId) {
      tripId = resolveTripId(descriptor);
    }
    if (!tripId) {
      continue;
    }

    if (descriptor.scheduleRelationship === 3) {
      cancelledTrips.add(tripId);
    }

    if (update.trip?.delay != null) {
      tripDelaySec.set(tripId, Number(update.trip.delay));
    }

    for (const stu of update.stopTimeUpdate ?? []) {
      const stopId = stu.stopId;
      if (!stopId) {
        continue;
      }
      const key = `${tripId}:${stopId}`;
      const departureSec = stu.departure?.time != null ? Number(stu.departure.time) : null;
      const arrivalSec = stu.arrival?.time != null ? Number(stu.arrival.time) : null;
      const delaySec =
        stu.departure?.delay != null
          ? Number(stu.departure.delay)
          : stu.arrival?.delay != null
            ? Number(stu.arrival.delay)
            : null;
      stopUpdates.set(key, { delaySec, departureSec, arrivalSec });
    }
  }

  return { tripDelaySec, stopUpdates, cancelledTrips };
}
