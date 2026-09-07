/**
 * London TfL rail modes — Unified API only (no Darwin, no buses).
 * Region id: uk-london-tfl. NOT live until registry flip.
 * @see docs/jim-brief-uk-london-tfl.md
 */
import { providerTripToInternal, normalizeDestination } from "../train-times-core.js";
import {
  listTflStops,
  listCatalogStations,
  resolveTflStop,
  resolveTflStops,
  isKnownOfferedDestinationName,
  UK_REGION_IDS,
} from "./uk/catalog.js";

export const UK_TFL_REGION = "uk-london-tfl";
export const UK_TIME_ZONE = "Europe/London";
export const TFL_API_BASE = "https://api.tfl.gov.uk";

/** TfL rail modes for this region — not buses. */
export const TFL_RAIL_MODE_NAMES = new Set([
  "tube",
  "overground",
  "elizabeth-line",
  "dlr",
  "tram",
]);

/** Trailing station-type qualifiers TfL appends to some destinationNames, stripped before the
 * "London " prefix check below so a suffixed raw name (e.g. "London Liverpool Street Rail
 * Station") is judged on the same terms as a clean one. */
const STATION_TYPE_SUFFIX_RE = /\s+(Underground Station|DLR Station|Rail Station|Tram Stop|Station)$/i;

/**
 * TfL emits a leading "London " disambiguation prefix on some National-Rail-flavoured
 * destination names (e.g. "London Liverpool Street", "London Euston") that this region's
 * offered-direction catalog does not always echo verbatim — see
 * docs/jim-brief-london-station-name-prefix.md. Four catalog stations legitimately begin with
 * "London " (London Bridge, London City Airport, London Euston, London Fields), so a blanket
 * strip would corrupt those. Only strip when the bare remainder is itself a name the region's
 * direction catalog uses undecorated as a destination somewhere (`isKnownOfferedDestinationName`)
 * and the "London "-prefixed form is not — catalog-driven, not a hardcoded station list.
 */
function stripLondonDisambiguationPrefix(rawName, regionId) {
  const trimmed = String(rawName || "").trim();
  if (!trimmed) {
    return trimmed;
  }
  const withoutTypeSuffix = trimmed.replace(STATION_TYPE_SUFFIX_RE, "").trim();
  const match = /^London\s+(\S.*)$/i.exec(withoutTypeSuffix);
  if (!match) {
    return trimmed;
  }
  const remainder = match[1].trim();
  if (!remainder) {
    return trimmed;
  }
  const remainderKnown = isKnownOfferedDestinationName(remainder, regionId);
  const fullKnown = isKnownOfferedDestinationName(withoutTypeSuffix, regionId);
  if (remainderKnown && !fullKnown) {
    return trimmed.replace(/^London\s+/i, "").trim();
  }
  return trimmed;
}

export class MissingTflAppKeyError extends Error {
  constructor() {
    super("TFL_APP_KEY is not set");
    this.name = "MissingTflAppKeyError";
    this.envName = "TFL_APP_KEY";
  }
}

function readTflAppKey() {
  const key = String(process.env.TFL_APP_KEY ?? "").trim();
  if (!key) {
    throw new MissingTflAppKeyError();
  }
  return key;
}

async function tflFetch(path) {
  const key = readTflAppKey();
  const sep = path.includes("?") ? "&" : "?";
  const url = `${TFL_API_BASE}${path}${sep}app_key=${encodeURIComponent(key)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`TfL API ${response.status} for ${path}`);
  }
  return response.json();
}

/**
 * Exported (in addition to being used internally by fetchStopBoard) so QA can exercise the
 * parse/normalize path against a checked-in fixture of raw arrivals without hitting the live
 * API or needing TFL_APP_KEY (qa/uk-london-tfl-direction-match.mjs).
 */
export function parseTflArrival(arrival, now = new Date(), regionId = UK_TFL_REGION) {
  const modeName = String(arrival.modeName ?? "").toLowerCase();
  if (!TFL_RAIL_MODE_NAMES.has(modeName)) {
    return null;
  }
  if (modeName === "bus" || modeName === "river-bus" || modeName === "coach") {
    return null;
  }

  let liveDeparture = null;
  if (arrival.expectedArrival) {
    liveDeparture = new Date(arrival.expectedArrival);
  } else if (Number.isFinite(arrival.timeToStation)) {
    liveDeparture = new Date(now.getTime() + Number(arrival.timeToStation) * 1000);
  }
  if (!liveDeparture || Number.isNaN(liveDeparture.getTime())) {
    return null;
  }

  const towards = String(arrival.towards || "").trim();
  const destinationName = String(arrival.destinationName || "").trim();
  const compassOrUnknown =
    !towards ||
    /^(northbound|southbound|eastbound|westbound)$/i.test(towards) ||
    /check front of train/i.test(towards);
  const rawDestination = compassOrUnknown ? destinationName || towards || "Unknown" : towards;
  const destination = stripLondonDisambiguationPrefix(rawDestination, regionId);
  const lineName = String(arrival.lineName || arrival.lineId || "").trim();
  const rawFullDestination = lineName ? `${lineName} ${destination}`.trim() : destination;
  // Normalize at parse time (matching lib/providers/perth.js) so a raw "Rail Station" /
  // "Underground Station" / "(London)" suffix never reaches the board — see
  // docs/jim-brief-london-overground-empty-direction.md, acceptance criterion 3.
  const fullDestination = normalizeDestination(rawFullDestination) || rawFullDestination;

  const displayTime = liveDeparture.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: UK_TIME_ZONE,
  });

  return providerTripToInternal({
    scheduledDeparture: liveDeparture,
    scheduledDisplayTime: displayTime,
    liveDeparture,
    displayTime,
    platform: arrival.platformName || undefined,
    destination: fullDestination,
    line: lineName,
    id: arrival.id || arrival.vehicleId || `${lineName}-${liveDeparture.getTime()}`,
    cancelled: false,
    status: lineName || modeName,
  });
}

/** naptanId prefix used by National-Rail-backed stops (Overground/Elizabeth line). */
const NR_BACKED_NAPTAN_PREFIX = "910G";

/**
 * `/StopPoint/{id}/Arrivals` has no usable timing for services *originating* at a terminus on
 * these lines — it reports them arriving in ~2 seconds, a placeholder, not a real prediction
 * (docs/jim-brief-london-overground-empty-direction.md, "CORRECTION" section). Route the
 * National-Rail-backed Overground stops to `/StopPoint/{id}/ArrivalDepartures` instead, which
 * carries real `scheduledTimeOfDeparture` / `estimatedTimeOfDeparture`. Not used for tube/DLR/tram
 * (`/Departures` 404s there, and `/Arrivals` timings are already correct — `towards` is populated).
 */
function usesArrivalDepartures(entry) {
  return (
    String(entry.naptanId || "").startsWith(NR_BACKED_NAPTAN_PREFIX) &&
    (entry.modes ?? []).includes("overground")
  );
}

/** "Mildmay" -> "mildmay", "Elizabeth line" -> "elizabeth", "Hammersmith & City" -> "hammersmith-and-city". */
function lineNameToId(lineName) {
  return String(lineName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+line$/i, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");
}

/**
 * Parses a row from `/StopPoint/{id}/ArrivalDepartures`. Unlike `/Arrivals`, this entity carries
 * no `modeName`/`lineId`/`id` of its own — the line is known from the query (`lineIds=`) rather
 * than the response, so it's passed in. Rows with no departure field are trains *terminating* at
 * this station, not boardable departures in any offered direction — they are dropped, matching
 * the terminus-handling verdict in docs/jim-brief-london-overground-empty-direction.md.
 */
export function parseTflArrivalDeparture(row, lineName, now = new Date(), regionId = UK_TFL_REGION) {
  const departureIso = row.estimatedTimeOfDeparture || row.scheduledTimeOfDeparture;
  if (!departureIso) {
    return null;
  }
  const liveDeparture = new Date(departureIso);
  if (Number.isNaN(liveDeparture.getTime())) {
    return null;
  }

  const destinationName = String(row.destinationName || "").trim();
  const destination = stripLondonDisambiguationPrefix(destinationName || "Unknown", regionId);
  const rawFullDestination = lineName ? `${lineName} ${destination}`.trim() : destination;
  const fullDestination = normalizeDestination(rawFullDestination) || rawFullDestination;

  const displayTime = liveDeparture.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: UK_TIME_ZONE,
  });

  return providerTripToInternal({
    scheduledDeparture: liveDeparture,
    scheduledDisplayTime: displayTime,
    liveDeparture,
    displayTime,
    platform: row.platformName || undefined,
    destination: fullDestination,
    line: lineName,
    id: `${row.naptanId}-${row.destinationNaptanId}-${departureIso}-${lineNameToId(lineName)}`,
    cancelled: false,
    status: lineName || "overground",
  });
}

async function fetchEntryTrips(entry, now, regionId) {
  if (usesArrivalDepartures(entry)) {
    try {
      const trips = [];
      for (const lineName of entry.lines ?? []) {
        const lineId = lineNameToId(lineName);
        const rows = await tflFetch(
          `/StopPoint/${encodeURIComponent(entry.naptanId)}/ArrivalDepartures?lineIds=${encodeURIComponent(lineId)}`
        );
        for (const row of Array.isArray(rows) ? rows : []) {
          const trip = parseTflArrivalDeparture(row, lineName, now, regionId);
          if (trip) {
            trips.push(trip);
          }
        }
      }
      return trips;
    } catch (error) {
      console.warn(
        `[TfL] ArrivalDepartures failed for ${entry.naptanId}, falling back to Arrivals: ${error.message}`
      );
      // fall through to /Arrivals below
    }
  }

  const arrivals = await tflFetch(`/StopPoint/${encodeURIComponent(entry.naptanId)}/Arrivals`);
  const rows = Array.isArray(arrivals) ? arrivals : [];
  const trips = [];
  for (const row of rows) {
    const trip = parseTflArrival(row, now, regionId);
    if (trip) {
      trips.push(trip);
    }
  }
  return trips;
}

/**
 * @param {string} stopIdOrName ATCO / naptanId or catalog name
 * @param {{ regionId?: string, now?: Date }} [options]
 */
export async function fetchStopBoard(stopIdOrName, options = {}) {
  const regionId = options.regionId ?? UK_TFL_REGION;
  const entries = resolveTflStops(stopIdOrName, regionId);
  if (entries.length === 0) {
    throw new Error(`Unknown TfL stop in ${regionId}: ${stopIdOrName}`);
  }

  const now = options.now ?? new Date();
  const allTripsMap = new Map();

  // A dedupe pass folds platform-level TfL StopPoints (dropped from the
  // picker/catalog) into their surviving hub row's alsoNaptanIds — arrivals
  // are fetched for the hub *and* every folded-in id so a board never loses
  // trains that only ever posted against a platform id. See
  // docs/jim-brief-london-tram-duplicate-stops.md.
  //
  // The endpoint choice (ArrivalDepartures vs Arrivals) is a per-entry
  // decision (usesArrivalDepartures depends on the entry's naptanId prefix
  // and modes — see docs/jim-brief-london-overground-empty-direction.md), so
  // each folded-in id is fetched using *its owning entry's* endpoint, not a
  // single flattened id set.
  const idsToFetch = new Map(); // naptanId -> owning entry
  for (const entry of entries) {
    if (!idsToFetch.has(entry.naptanId)) {
      idsToFetch.set(entry.naptanId, entry);
    }
    for (const alsoId of entry.alsoNaptanIds ?? []) {
      if (!idsToFetch.has(alsoId)) {
        idsToFetch.set(alsoId, entry);
      }
    }
  }

  const fetches = [...idsToFetch].map(async ([naptanId, owningEntry]) => {
    try {
      const fetchEntry = { ...owningEntry, naptanId };
      const entryTrips = await fetchEntryTrips(fetchEntry, now, regionId);
      for (const trip of entryTrips) {
        const existing = allTripsMap.get(trip.id);
        if (!existing || trip.liveDeparture < existing.liveDeparture) {
          allTripsMap.set(trip.id, trip);
        }
      }
    } catch (error) {
      console.warn(`[TfL] Failed to fetch arrivals for ${naptanId}: ${error.message}`);
    }
  });

  await Promise.all(fetches);

  const trips = Array.from(allTripsMap.values());
  trips.sort((a, b) => a.liveDeparture.getTime() - b.liveDeparture.getTime());

  return {
    stationName: entries[0].name,
    naptanId: entries[0].naptanId, // Primary naptan
    naptanIds: entries.map((e) => e.naptanId),
    regionId,
    mode: "tfl",
    lastUpdate: now.toISOString(),
    trips,
  };
}

export function listCatalogStops(regionId = UK_TFL_REGION) {
  return listTflStops(regionId);
}

export { listCatalogStations, resolveTflStop, UK_REGION_IDS };
