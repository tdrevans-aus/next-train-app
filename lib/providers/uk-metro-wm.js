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
 * Per-stop filtering needs the requested stop's real TfWM GTFS stop_id(s).
 * lib/cities/uk-west-midlands/stations.json now carries these as a `stopIds`
 * array — TfWM's feed keys stop_time_update.stop_id off platform-level ids,
 * one per direction (two per station; three end-of-line stops have only
 * one), not a single station-level id. stopIdsForEntry() reads `stopIds`
 * (falling back to the legacy scalar `stopId` for any entry that still only
 * has that), and buildMetroTrips() matches a trip if its stop_time_update
 * hits ANY of a station's ids, merging both directions into one board.
 * fetchMetroStopBoard() throws MetroStopIdNotCatalogedError only when an
 * entry has neither field populated — same "throw, don't fabricate" contract
 * as MissingTfwmCredentialsError.
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

/** Returns every GTFS stop_id recorded for a catalog entry — the legacy scalar `stopId`
 * plus any platform-level ids in `stopIds` (two per station, one per direction; three
 * end-of-line stops have only one). De-duplicated, order-preserving. */
function stopIdsForEntry(entry) {
  const ids = [];
  if (entry?.stopId) {
    ids.push(String(entry.stopId));
  }
  for (const stopId of entry?.stopIds ?? []) {
    if (stopId && !ids.includes(String(stopId))) {
      ids.push(String(stopId));
    }
  }
  return ids;
}

/** stop_id -> catalog station name, for the region's Metro stops that have one,
 * indexed off both the legacy scalar `stopId` and the `stopIds` platform-id array
 * so a trip terminating at either platform of a station resolves to that station's name. */
function metroNameByStopId(regionId) {
  const map = new Map();
  for (const stop of listMetroStops(regionId)) {
    for (const stopId of stopIdsForEntry(stop)) {
      map.set(stopId, stop.name);
    }
  }
  return map;
}

/**
 * Builds ProviderTrip-shaped rows for a single station from raw TripUpdate
 * entities. There is no static schedule to merge against, so the feed's own
 * StopTimeUpdate time IS both the scheduled and live departure — same as
 * every other realtime-only board in this pipeline (e.g. Glasgow Subway's
 * intended shape once its feed is confirmed).
 *
 * TfWM's GTFS-RT feed keys stop_time_update.stop_id off platform-level stop
 * ids (one per direction — two per station, except three end-of-line stops
 * with a single platform), not a station-level id. `targetStopIds` carries
 * every platform id for the requested station (see stopIdsForEntry()), and a
 * trip matches if its stop_time_update hits ANY of them — merging both
 * directions' departures into one board.
 * @param {object[]} entities
 * @param {string[]} targetStopIds
 * @param {Map<string,string>} nameByStopId
 */
function buildMetroTrips(entities, targetStopIds, nameByStopId) {
  const trips = [];

  for (const entity of entities) {
    const update = entity.tripUpdate;
    const stopTimeUpdates = update?.stopTimeUpdate ?? [];
    if (!stopTimeUpdates.length) {
      continue;
    }

    const index = stopTimeUpdates.findIndex((stu) => targetStopIds.includes(String(stu.stopId ?? "")));
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

  const targetStopIds = stopIdsForEntry(entry);
  if (!targetStopIds.length) {
    throw new MetroStopIdNotCatalogedError(entry);
  }

  const entities = await fetchMetroFeedEntities(appId, appKey);
  const nameByStopId = metroNameByStopId(regionId);
  const trips = buildMetroTrips(entities, targetStopIds, nameByStopId);

  return {
    stationName: entry.name,
    lastUpdate: new Date().toISOString(),
    trips,
  };
}

export { listCatalogStations, resolveMetroEntry };
// Exported for qa/uk-west-midlands-dogfood-gate.mjs's synthetic-feed merge
// test only — not part of the adapter's public board-fetching contract.
export { stopIdsForEntry, metroNameByStopId, buildMetroTrips };
