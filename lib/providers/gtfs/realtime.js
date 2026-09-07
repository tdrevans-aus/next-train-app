/**
 * GTFS-Realtime TripUpdates fetch + decode.
 */

import GtfsRealtimeBindings from "../../vendor/gtfs-realtime.mjs";
import { redactUrl } from "./redact-url.js";

/**
 * @param {string} url
 * @param {{ headers?: Record<string,string> }} [options]
 * @returns {Promise<{ entities: object[], fetchedAt: Date }>}
 */
export async function fetchTripUpdates(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? 4000);
  const response = await fetch(url, {
    headers: {
      // Two-value default: TfWM answers only `application/octet-stream` (406s a
      // protobuf-only Accept), while AT and Metlink answer JSON when
      // `application/octet-stream` is present — `decodeFeedMessage` below tolerates
      // that JSON response, so this single header works for both. See
      // qa/gtfs-realtime-accept.mjs for the per-agency compatibility table.
      Accept: "application/x-protobuf, application/octet-stream",
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`GTFS-RT fetch failed (${response.status}) for ${redactUrl(url)}`);
  }

  const buffer = await response.arrayBuffer();
  const feed = decodeFeedMessage(buffer, response.headers.get("content-type"));
  const entities = feed.entity ?? [];

  return {
    entities,
    fetchedAt: new Date(),
    bytes: buffer.byteLength,
  };
}

/**
 * Decode a GTFS-RT FeedMessage from a raw response body, tolerating agencies
 * that answer JSON (plain or AT-style `{ status, response }`-wrapped) even
 * when protobuf was requested. Never lets a JSON body reach `.decode()`,
 * which expects a protobuf wire format and throws opaque errors on JSON.
 * @param {ArrayBuffer} buffer
 * @param {string | null} [contentType]
 * @returns {object} a FeedMessage-shaped object (real or `fromObject`-built)
 */
export function decodeFeedMessage(buffer, contentType) {
  const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;
  const bytes = new Uint8Array(buffer);
  const looksJson = (contentType ?? "").toLowerCase().includes("json") || firstNonWhitespaceByteIsBrace(bytes);

  if (!looksJson) {
    return FeedMessage.decode(bytes);
  }

  const text = new TextDecoder("utf-8").decode(bytes);
  let parsed = JSON.parse(text);
  // AT wraps the real feed in `{ status, response }`; unwrap it if present.
  if (parsed && typeof parsed === "object" && parsed.response && !parsed.header && !parsed.entity) {
    parsed = parsed.response;
  }
  const errMsg = FeedMessage.verify(parsed);
  if (errMsg) {
    throw new Error(`GTFS-RT JSON body did not match FeedMessage shape: ${errMsg}`);
  }
  return FeedMessage.fromObject(parsed);
}

function firstNonWhitespaceByteIsBrace(bytes) {
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];
    // ASCII whitespace: space, tab, newline, CR
    if (byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d) {
      continue;
    }
    return byte === 0x7b; // '{'
  }
  return false;
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
