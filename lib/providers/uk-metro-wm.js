/**
 * West Midlands Metro — TfWM GTFS-RT (not Darwin).
 * Region: uk-west-midlands only.
 * @see docs/uk-coding-brief.md · docs/uk-architecture.md
 *
 * Board builder: TfWM only publishes a GTFS-RT `trip_updates` feed (no
 * static GTFS schedule confirmed for this pack — see
 * docs/uk-west-midlands-d1/oracle-clash-report.md). There is nothing to
 * merge it against via lib/providers/gtfs/realtime-board.js's
 * fetchGtfsRealtimeBoard() (that helper needs a loadStatic() schedule to
 * build trips from; TripUpdates alone only carry stop_id + time deltas, not
 * a schedule). So this fetches + decodes the feed directly with the same
 * shared decoder every other GTFS-RT city adapter uses
 * (lib/providers/gtfs/realtime.js's fetchTripUpdates(), which wraps the
 * vendored gtfs-realtime-bindings protobuf parser — reused here, not
 * forked), then filters each TripUpdate's stopTimeUpdate[] to the requested
 * stop and reads the departure time straight off the feed (there is no
 * separate "scheduled" time source to diff against).
 *
 * Per-stop filtering needs the requested stop's real TfWM GTFS stop_id.
 * lib/cities/uk-west-midlands/stations.json's `stopId` field is `null` for
 * all 35 current Metro entries as of this pass — a catalog data gap (see
 * docs/uk-coding-brief.md: "Key Metro stops by the operator's stop id, not
 * a fake CRS"), not a credentials or feed problem. Rather than guess an id
 * format or silently return an empty board, fetchMetroStopBoard() throws
 * MetroStopIdNotCatalogedError for any resolved entry lacking one — same
 * "throw, don't fabricate" contract as MissingTfwmCredentialsError. Once
 * Luke/catalog populates real stop_ids, no adapter change is needed; the
 * filter below already keys off entry.stopId.
 */
import {
  fetchTripUpdates,
} from "./gtfs/realtime.js";
import {
  listMetroStops,
  listCatalogStations,
  resolveMetroEntry,
} from "./uk/catalog.js";

export const UK_WM_REGION = "uk-west-midlands";
export const TFWM_GTFS_RT_URL = "http://api.tfwm.org.uk/gtfs/trip_updates";

/** GTFS-RT TripDescriptor/StopTimeUpdate ScheduleRelationship enum value for CANCELED. */
const SCHEDULE_RELATIONSHIP_CANCELED = 3;

export class MissingTfwmCredentialsError extends Error {
  constructor() {
    super("TFWM_API_APP_ID and TFWM_API_APP_KEY are not set");
    this.name = "MissingTfwmCredentialsError";
    this.envNames = ["TFWM_API_APP_ID", "TFWM_API_APP_KEY"];
  }
}

/** Network/HTTP failure reaching the TfWM GTFS-RT endpoint — distinct from credentials or parse errors. */
export class MetroFeedFetchError extends Error {
  constructor(cause) {
    super(`West Midlands Metro GTFS-RT feed request failed: ${cause?.message ?? cause}`);
    this.name = "MetroFeedFetchError";
    this.cause = cause;
  }
}

/** The feed responded but the body could not be decoded as a GTFS-RT FeedMessage. */
export class MetroFeedParseError extends Error {
  constructor(cause) {
    super(`West Midlands Metro GTFS-RT feed could not be parsed (malformed protobuf): ${cause?.message ?? cause}`);
    this.name = "MetroFeedParseError";
    this.cause = cause;
  }
}

/** Resolved catalog entry has no GTFS stop_id recorded yet — a catalog gap, not a feed/credentials problem. */
export class MetroStopIdNotCatalogedError extends Error {
  constructor(entry) {
    super(
      `West Midlands Metro catalog entry "${entry?.name}" (${entry?.catalogId ?? "no catalogId"}) has no GTFS ` +
        "stop_id recorded yet, so the TfWM GTFS-RT feed cannot be filtered to this stop. This is a catalog data " +
        "gap (lib/cities/uk-west-midlands/stations.json stopId is null), not a credentials or feed problem."
    );
    this.name = "MetroStopIdNotCatalogedError";
    this.entry = entry;
  }
}

function readTfwmCredentials() {
  const appId = String(process.env.TFWM_API_APP_ID ?? "").trim();
  const appKey = String(process.env.TFWM_API_APP_KEY ?? "").trim();
  if (!appId || !appKey) {
    throw new MissingTfwmCredentialsError();
  }
  return { appId, appKey };
}

export function listCatalogMetroStops(regionId = UK_WM_REGION) {
  return listMetroStops(regionId);
}

/**
 * Fetch + decode the TfWM GTFS-RT trip_updates feed, classifying failures
 * distinctly: a non-2xx/network/timeout failure reaching the endpoint is
 * MetroFeedFetchError; a response that can't be decoded as a GTFS-RT
 * FeedMessage (wrong content, truncated body, TfWM outage returning HTML)
 * is MetroFeedParseError.
 * @param {string} appId
 * @param {string} appKey
 * @returns {Promise<object[]>} TripUpdate entities
 */
async function fetchMetroFeedEntities(appId, appKey) {
  const url = `${TFWM_GTFS_RT_URL}?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`;
  let feed;
  try {
    feed = await fetchTripUpdates(url, { timeoutMs: 6000 });
  } catch (err) {
    // fetchTripUpdates() throws a plain Error("GTFS-RT fetch failed (<status>) ...")
    // for a non-2xx response, and the underlying fetch()/AbortSignal.timeout()
    // throw TypeError/DOMException for network/timeout failures — both are
    // "couldn't reach or read the endpoint", not a malformed-payload case.
    const message = String(err?.message ?? "");
    const isFetchFailure =
      /^GTFS-RT fetch failed/.test(message) ||
      err instanceof TypeError ||
      err?.name === "TimeoutError" ||
      err?.name === "AbortError";
    if (isFetchFailure) {
      throw new MetroFeedFetchError(err);
    }
    // Anything else surfaced here comes from GtfsRealtimeBindings.FeedMessage.decode()
    // rejecting the response body as an invalid protobuf payload.
    throw new MetroFeedParseError(err);
  }
  return feed.entities ?? [];
}

/** stop_id -> catalog station name, for the region's Metro stops that have one. */
function metroNameByStopId(regionId) {
  const map = new Map();
  for (const stop of listMetroStops(regionId)) {
    if (stop.stopId) {
      map.set(String(stop.stopId), stop.name);
    }
  }
  return map;
}

/**
 * Builds ProviderTrip-shaped rows for a single stop from raw TripUpdate
 * entities. There is no static schedule to merge against, so the feed's own
 * StopTimeUpdate time IS both the scheduled and live departure — same as
 * every other realtime-only board in this pipeline (e.g. Glasgow Subway's
 * intended shape once its feed is confirmed).
 * @param {object[]} entities
 * @param {string} targetStopId
 * @param {Map<string,string>} nameByStopId
 */
function buildMetroTrips(entities, targetStopId, nameByStopId) {
  const trips = [];

  for (const entity of entities) {
    const update = entity.tripUpdate;
    const stopTimeUpdates = update?.stopTimeUpdate ?? [];
    if (!stopTimeUpdates.length) {
      continue;
    }

    const index = stopTimeUpdates.findIndex((stu) => String(stu.stopId ?? "") === targetStopId);
    if (index === -1) {
      continue;
    }
    // The requested stop is this trip's own terminus (last StopTimeUpdate) —
    // nothing departs onward from here on this trip, so it isn't a rider-
    // facing departure row.
    if (index === stopTimeUpdates.length - 1) {
      continue;
    }

    const stu = stopTimeUpdates[index];
    const cancelled = update.trip?.scheduleRelationship === SCHEDULE_RELATIONSHIP_CANCELED;

    const terminus = stopTimeUpdates[stopTimeUpdates.length - 1];
    const terminusStopId = terminus?.stopId ? String(terminus.stopId) : null;
    const destination = terminusStopId ? nameByStopId.get(terminusStopId) : null;
    if (!destination) {
      // Can't name this trip's destination (its terminus stop_id isn't in
      // the catalog's stopId map either) — skip rather than show a raw
      // GTFS id as the destination.
      continue;
    }

    const epochSec = stu.departure?.time ?? stu.arrival?.time ?? null;
    if (epochSec == null && !cancelled) {
      continue;
    }
    const liveDeparture = epochSec != null ? new Date(Number(epochSec) * 1000) : null;
    if (!liveDeparture && !cancelled) {
      continue;
    }

    const isoDeparture = liveDeparture ? liveDeparture.toISOString() : undefined;
    trips.push({
      liveDeparture: isoDeparture,
      scheduledDeparture: isoDeparture,
      displayTime: cancelled
        ? "Cancelled"
        : liveDeparture.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/London",
          }),
      destination,
      cancelled,
      status: cancelled ? "Cancelled" : undefined,
    });
  }

  trips.sort((a, b) => {
    if (!a.liveDeparture) return 1;
    if (!b.liveDeparture) return -1;
    return new Date(a.liveDeparture).getTime() - new Date(b.liveDeparture).getTime();
  });
  return trips;
}

/**
 * @param {string} stopIdOrName
 * @param {{ regionId?: string }} [options]
 */
export async function fetchMetroStopBoard(stopIdOrName, options = {}) {
  const regionId = options.regionId ?? UK_WM_REGION;
  const entry = resolveMetroEntry(stopIdOrName, regionId);
  if (!entry) {
    throw new Error(`Unknown Metro stop in ${regionId}: ${stopIdOrName}`);
  }

  // Credentials checked first, unconditionally — same order QA already
  // exercises (uk-west-midlands-dogfood-gate.mjs deletes the env vars and
  // expects MissingTfwmCredentialsError regardless of catalog state).
  const { appId, appKey } = readTfwmCredentials();

  if (!entry.stopId) {
    throw new MetroStopIdNotCatalogedError(entry);
  }

  const entities = await fetchMetroFeedEntities(appId, appKey);
  const nameByStopId = metroNameByStopId(regionId);
  const trips = buildMetroTrips(entities, String(entry.stopId), nameByStopId);

  return {
    stationName: entry.name,
    lastUpdate: new Date().toISOString(),
    trips,
  };
}

export { listCatalogStations, resolveMetroEntry };
