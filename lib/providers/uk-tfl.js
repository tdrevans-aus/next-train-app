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

/**
 * Dedup key for `fetchStopBoard`'s cross-fetch merge — mode-agnostic (see
 * docs/jim-brief-dlr-dedup-key.md and its 8 Sep 2026 amendment). TfL's `id`/`vehicleId` field is
 * excluded from this key entirely, for two independent reasons proven live:
 *
 *   - DLR's `/Arrivals` feed reuses one `id`/`vehicleId` across every row at a stop, even across
 *     genuinely distinct destinations (confirmed at Abbey Road, 940GZZDLABR: 6 raw rows, 1 shared
 *     `id`, 3 destinations) — a key that relies on `id` to discriminate loses 5 of those 6 trains.
 *   - `id` also is not stable *across which naptanId you query it under* — confirmed live at
 *     Clapham Junction, 8 Sep 2026: matching the same train across the hub fetch (910GCLPHMJ1) and
 *     its folded-in `alsoNaptanIds` fetch (910GCLPHMJC) by line + destination + `expectedArrival`,
 *     every matched pair carried a *different* `id` while every other displayed field (platform
 *     included) was identical. So a key that includes `id` can never collapse the
 *     `alsoNaptanIds` fan-out (PR #344) either — that was a live defect on master (duplicate rows
 *     at every one of the 40 catalog stations with `alsoNaptanIds`) until this fix, because the
 *     previous key folded `id` back in to solve the DLR case and broke fan-out collapsing instead.
 *
 * No single global key can serve both the DLR case (must ignore `id`, discriminate on
 * destination/time) and the Walthamstow Central case (two genuinely distinct Victoria line trains,
 * live-captured 7 Sep 2026, sharing line/destination/platform *and* the same to-the-second
 * departure time, `-2066444382` vs `-411927803`, differing only by `id`) — because `id` is
 * unreliable in exactly the cases where the other fields collide. The resolution is **scoping**,
 * not a smarter single key: see `dedupeTrips` below. This key (line + resolved destination +
 * platform + departure time, no `id`) is only ever compared *within* a scope that `dedupeTrips`
 * establishes — never treated as a global identity on its own.
 */
export function tripDedupKey(trip) {
  return [
    trip.line ?? "",
    trip.destination ?? "",
    trip.platform ?? "",
    trip.liveDeparture.getTime(),
  ].join("|");
}

/**
 * Merges one or more per-fetch trip lists (one list per naptanId `fetchStopBoard` queried — hub
 * plus every `alsoNaptanIds` fold-in) into a single list. Exported (used internally by
 * `fetchStopBoard`) so QA can exercise the exact production dedup path — including the
 * `alsoNaptanIds` fan-out collapse — against synthetic/captured trip lists without live network.
 *
 * Scoping (docs/jim-brief-dlr-dedup-key.md amendment, 8 Sep 2026): `tripDedupKey` is deliberately
 * blind to which physical vehicle a row came from (see that function's doc comment for why `id`
 * can't be trusted), so it must never be used to dedup *within* a single naptanId's response — two
 * rows in one response that happen to share every displayed field but genuinely differ (the
 * Walthamstow Central case) are two real trains, not one duplicated. It is only safe to collapse
 * same-key rows *across* different naptanId fetches for the same stop, where a repeated key means
 * TfL re-delivered the same physical train under a second queried naptanId (the `alsoNaptanIds`
 * fold-in, PR #344).
 *
 * Concretely: for each key, take the *largest* same-key group observed within any single fetch's
 * response. A key that appears once per response it's seen in is the ordinary fan-out duplicate
 * (collapses to 1). A key that appears more than once within one response is TfL reporting that
 * many genuinely distinct trains under it; keeping the largest such group preserves all of them
 * even if a fold-in fetch only echoed some of that group back (or none), and can never
 * under-collapse a true one-train duplicate, because a true duplicate never produces a group larger
 * than 1 in any single response.
 */
export function dedupeTrips(tripLists) {
  const bestGroupByKey = new Map();

  for (const trips of tripLists) {
    const groupsInThisResponse = new Map();
    for (const trip of trips) {
      const key = tripDedupKey(trip);
      if (!groupsInThisResponse.has(key)) {
        groupsInThisResponse.set(key, []);
      }
      groupsInThisResponse.get(key).push(trip);
    }
    for (const [key, group] of groupsInThisResponse) {
      const existing = bestGroupByKey.get(key);
      if (!existing || group.length > existing.length) {
        bestGroupByKey.set(key, group);
      }
    }
  }

  const result = [];
  for (const group of bestGroupByKey.values()) {
    result.push(...group);
  }
  return result;
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
  const perFetchTrips = [];

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
      perFetchTrips.push(entryTrips);
    } catch (error) {
      console.warn(`[TfL] Failed to fetch arrivals for ${naptanId}: ${error.message}`);
    }
  });

  await Promise.all(fetches);

  const trips = dedupeTrips(perFetchTrips);
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

/**
 * Data-driven detection for docs/jim-brief-terminus-no-published-departures.md — never a
 * hardcoded station list. TfL's /Arrivals does not exist in a departures flavour for tube stops
 * (940G), so a train terminating here is published with `destinationName` equal to this
 * station's own name. Every trip's `destination` already went through the same
 * `${lineName} ${destination}`.trim() -> normalizeDestination() pipeline
 * (parseTflArrival/parseTflArrivalDeparture above), so re-running that exact pipeline against
 * "this station's own name" and comparing strings resolves TfL's short-working/group aliasing
 * (e.g. Victoria line trains terminating at Walthamstow Central vs. Seven Sisters) the same way
 * on both sides, with no station-specific logic.
 */
function terminatesAtOwnStation(trip, stationName) {
  const selfDestination = normalizeDestination(`${trip.line || ""} ${stationName}`.trim());
  const tripDestination = normalizeDestination(trip.destination || "");
  if (!selfDestination || !tripDestination) {
    return false;
  }
  return tripDestination.toLowerCase() === selfDestination.toLowerCase();
}

/** Restrict terminating arrivals to the same line as the chosen direction — a station can have
 * more than one line terminating, and an unrelated line's arrivals aren't relevant here. Every
 * offered direction string this codebase generates is built as `${lineName} ${destination}`
 * (see parseTflArrival above and LINE_DESTINATION_GROUPS in train-times-core.js), so the line
 * name is always a literal prefix of the offered direction — checked generically, not by name. */
function lineMatchesDirection(tripLine, destinationFilter) {
  const line = normalizeDestination(tripLine || "").toLowerCase();
  const filter = normalizeDestination(destinationFilter || "").toLowerCase();
  if (!line || !filter) {
    return false;
  }
  return filter === line || filter.startsWith(`${line} `);
}

/**
 * Trips from the *unfiltered* board (not pickUpcomingTrips output) that terminate at this
 * station on the line matching the chosen direction. Passed to buildNextTrainResponse's
 * additive `terminatingTrips` param only when the selected direction resolves zero upcoming
 * trips — see lib/cities/live-city-api.js.
 */
export function findTerminatingArrivals(allTrips, stationName, destinationFilter, now = new Date()) {
  return allTrips.filter(
    (trip) =>
      trip.liveDeparture > now &&
      lineMatchesDirection(trip.line, destinationFilter) &&
      terminatesAtOwnStation(trip, stationName)
  );
}

export function listCatalogStops(regionId = UK_TFL_REGION) {
  return listTflStops(regionId);
}

export { listCatalogStations, resolveTflStop, UK_REGION_IDS };
