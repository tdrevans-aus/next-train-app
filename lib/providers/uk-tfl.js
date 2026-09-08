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
  stationOffersDestination,
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
 * TfL's raw `lineName` for the Elizabeth line is the literal string "Elizabeth line" — the only
 * rail-mode lineName TfL's `/Line/Mode/...` metadata emits with a trailing " line" word (confirmed
 * live 8 Sep 2026 against every tube/DLR/elizabeth-line/overground/tram lineName TfL currently
 * emits — the five Overground line names Mildmay, Windrush, Weaver, Lioness, Suffragette (and
 * Liberty) do not end in "line", nor does "Waterloo & City" or any tube line — see
 * docs/jim-brief-elizabeth-heathrow-normalization.md). Every parsed Elizabeth-line trip therefore
 * carried a stray " line" token that made it un-matchable against the catalog's offered
 * "Elizabeth ..." directions. `lineNameToId` already strips this for URL construction; mirror it
 * here for the display/matching path so both stay in sync without duplicating the regex's intent.
 */
function stripLineNameSuffix(lineName) {
  return String(lineName || "").trim().replace(/\s+line$/i, "").trim();
}

/**
 * Fallback dedup key for `fetchStopBoard`'s cross-fetch merge, used only for trips with no
 * trustworthy `vehicleId` (see `dedupeTrips` below) — mode-agnostic (see
 * docs/jim-brief-dlr-dedup-key.md and its two 8 Sep 2026 amendments). TfL's `id` field is excluded
 * from this key entirely, for two independent reasons proven live:
 *
 *   - DLR's `/Arrivals` feed reuses one `id`/`vehicleId` across every row at a stop, even across
 *     genuinely distinct destinations (confirmed at Abbey Road, 940GZZDLABR: 6 raw rows, 1 shared
 *     `id`, 3 destinations) — a key that relies on `id` to discriminate loses 5 of those 6 trains.
 *   - `id` also is not stable *across which naptanId you query it under* — confirmed live at
 *     Clapham Junction, 8 Sep 2026: matching the same train across the hub fetch (910GCLPHMJ1) and
 *     its folded-in `alsoNaptanIds` fetch (910GCLPHMJC) by line + destination + `expectedArrival`,
 *     every matched pair carried a *different* `id` while every other displayed field (platform
 *     included) was identical.
 *
 * No single key built from these displayed fields alone can serve both the DLR case (must ignore
 * `id`, discriminate on destination/time) and the Walthamstow Central case (two genuinely distinct
 * Victoria line trains, live-captured 7 Sep 2026, sharing line/destination/platform *and* the same
 * to-the-second departure time, `-2066444382` vs `-411927803`, differing only by `id`) — because
 * `id` is unreliable in exactly the cases where the other fields collide. `dedupeTrips` resolves
 * the DLR/Walthamstow tension by never comparing this key *within* a single naptanId's response,
 * only *across* responses — see that function's doc comment for why, and for `vehicleId`, which
 * (per AMENDMENT 2) supersedes this key entirely whenever TfL attaches a trustworthy one.
 */
export function tripDedupKey(trip) {
  return [
    trip.line ?? "",
    trip.destination ?? "",
    trip.platform ?? "",
    trip.liveDeparture.getTime(),
  ].join("|");
}

/** Same physical train reported twice (same vehicleId, or same composite key within one
 * response's echo-consistent group) — the existing "prefer the earlier liveDeparture on a
 * genuine collision" rule. */
function earlierDeparture(a, b) {
  return a.liveDeparture.getTime() <= b.liveDeparture.getTime() ? a : b;
}

/**
 * TfL's per-row `vehicleId` is the strong physical-train identity (docs/jim-brief-dlr-dedup-key.md
 * AMENDMENT 2): live-tested 8 Sep 2026 at Clapham Junction, the *set* of vehicleIds the hub fetch
 * (910GCLPHMJ1) reports for a same-key collision group is identical to the set the folded fetch
 * (910GCLPHMJC) reports, even though every row's `id` differs between the two — see
 * qa/fixtures/uk-london-tfl/fanout-dedup-arrivals.json's 4-way same-key Stratford group. So
 * `vehicleId` is stable across which naptanId you query, unlike `id`.
 *
 * It is not universally trustworthy, though: DLR's `/Arrivals` feed reuses ONE shared vehicleId
 * across rows to genuinely different destinations (Abbey Road, 7 Sep 2026: "6 raw rows, 1 unique
 * id, 1 unique vehicleId") — there, vehicleId is exactly as unreliable as `id`, for the same
 * reason. A vehicleId attached to more than one distinct destination anywhere in the merge is
 * therefore a shared/placeholder value, not a per-train identity, and is excluded from this path —
 * detected structurally from the data, not by special-casing DLR by mode name.
 */
function findPollutedVehicleIds(tripLists) {
  const destinationsByVehicleId = new Map();
  for (const trips of tripLists) {
    for (const trip of trips) {
      if (!trip.vehicleId) {
        continue;
      }
      if (!destinationsByVehicleId.has(trip.vehicleId)) {
        destinationsByVehicleId.set(trip.vehicleId, new Set());
      }
      destinationsByVehicleId.get(trip.vehicleId).add(trip.destination);
    }
  }
  const polluted = new Set();
  for (const [vehicleId, destinations] of destinationsByVehicleId) {
    if (destinations.size > 1) {
      polluted.add(vehicleId);
    }
  }
  return polluted;
}

/**
 * Merges one or more per-fetch trip lists (one list per naptanId `fetchStopBoard` queried — hub
 * plus every `alsoNaptanIds` fold-in) into a single list. Exported (used internally by
 * `fetchStopBoard`) so QA can exercise the exact production dedup path — including the
 * `alsoNaptanIds` fan-out collapse — against synthetic/captured trip lists without live network.
 *
 * Two independent mechanisms, per docs/jim-brief-dlr-dedup-key.md's 8 Sep 2026 AMENDMENT 2:
 *
 * 1. **Trips with a trustworthy `vehicleId`** (present, and not flagged by
 *    `findPollutedVehicleIds`) are collapsed by that identity directly — both *within* a single
 *    response (TfL hedging an unconfirmed platform by duplicating one physical train's prediction
 *    under both candidate platforms — the Walthamstow Central "4x Victoria Walthamstow
 *    Central@05:10" case Mark found: 2 real vehicles, each reported under both platforms because
 *    neither had been assigned yet) and *across* fetches (the `alsoNaptanIds` fan-out, PR #344).
 *    Since `vehicleId` is a real per-train identity rather than a guess, this is a plain
 *    collapse-by-identity, not a group-size heuristic, and it makes `platform` correctly weak: a
 *    vehicle isn't duplicated just because TfL reported two different platform guesses for it.
 *
 * 2. **Trips with no trustworthy `vehicleId`** (DLR, structurally — or any row TfL doesn't attach
 *    one to) have no identifier stable across fetches, so "the same train seen twice" and "two
 *    distinct trains, one per fetch" are genuinely indistinguishable — any counting rule here is a
 *    guess. Never dedup *within* one response (a same-key collision there is always genuine
 *    distinct trains, per the Walthamstow/DLR reasoning above `tripDedupKey`). *Across* responses,
 *    compare each key's per-response group sizes: if every response that saw the key reports the
 *    *same* count, that's consistent with pure fan-out echo (collapse to one response's group). If
 *    the counts disagree — the case that broke the previous "keep the largest group" heuristic,
 *    where 3 distinct trains split 2-and-1 across two fetches undercounted to 2 — there is no way
 *    to tell how many of the smaller group are new trains versus echoes, so every row from every
 *    response is kept. This errs toward a possible duplicate rather than a silently dropped train
 *    (docs/board-eligibility-rule.md: a vanished walk-up service is the worse failure).
 */
export function dedupeTrips(tripLists) {
  const pollutedVehicleIds = findPollutedVehicleIds(tripLists);
  const hasTrustworthyVehicleId = (trip) =>
    Boolean(trip.vehicleId) && !pollutedVehicleIds.has(trip.vehicleId);

  // Mechanism 1: collapse-by-vehicleId, across both scopes at once (a Map naturally does this —
  // every trip sharing a vehicleId collapses to one, regardless of which response(s) it came from).
  const byVehicleId = new Map();
  // Mechanism 2 candidates: trips with no trustworthy vehicleId, grouped by tripDedupKey within
  // each response (never collapsed within a response — see doc comment above).
  const perResponseCompositeGroups = []; // array of Map<key, trip[]>, one Map per response

  for (const trips of tripLists) {
    const groupsInThisResponse = new Map();
    for (const trip of trips) {
      if (hasTrustworthyVehicleId(trip)) {
        const existing = byVehicleId.get(trip.vehicleId);
        byVehicleId.set(trip.vehicleId, existing ? earlierDeparture(existing, trip) : trip);
        continue;
      }
      const key = tripDedupKey(trip);
      if (!groupsInThisResponse.has(key)) {
        groupsInThisResponse.set(key, []);
      }
      groupsInThisResponse.get(key).push(trip);
    }
    perResponseCompositeGroups.push(groupsInThisResponse);
  }

  // Gather, per composite key, the list of per-response groups that saw it at all.
  const compositeGroupsByKey = new Map();
  for (const groupsInThisResponse of perResponseCompositeGroups) {
    for (const [key, group] of groupsInThisResponse) {
      if (!compositeGroupsByKey.has(key)) {
        compositeGroupsByKey.set(key, []);
      }
      compositeGroupsByKey.get(key).push(group);
    }
  }

  const compositeResult = [];
  for (const groups of compositeGroupsByKey.values()) {
    const sizes = groups.map((g) => g.length);
    const allResponsesAgree = sizes.every((size) => size === sizes[0]);
    if (allResponsesAgree) {
      // Every response that reported this key reported the same count — consistent with pure
      // echo (including the ordinary single-response, single-group case). Take one group.
      compositeResult.push(...groups[0]);
    } else {
      // Disagreement: can't tell echoes from genuinely-additional trains only visible via one
      // fetch — keep everything (see doc comment above).
      for (const group of groups) {
        compositeResult.push(...group);
      }
    }
  }

  return [...byVehicleId.values(), ...compositeResult];
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
 *
 * @param {string} [stationName] the catalog's own display name for this stop (matches a key in
 *   public/city-directions/<regionId>.json) — used only for the towards-vs-destinationName
 *   catalog-driven preference below (docs/jim-brief-elizabeth-heathrow-normalization.md).
 *   Optional and defaulted to null for existing callers/tests that don't need it; when absent, no
 *   override is attempted and behaviour is unchanged from before that fix.
 */
export function parseTflArrival(arrival, now = new Date(), regionId = UK_TFL_REGION, stationName = null) {
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
  const lineName = stripLineNameSuffix(String(arrival.lineName || arrival.lineId || "").trim());
  const rawFullDestination = lineName ? `${lineName} ${destination}`.trim() : destination;
  // Normalize at parse time (matching lib/providers/perth.js) so a raw "Rail Station" /
  // "Underground Station" / "(London)" suffix never reaches the board — see
  // docs/jim-brief-london-overground-empty-direction.md, acceptance criterion 3.
  let fullDestination = normalizeDestination(rawFullDestination) || rawFullDestination;

  // Catalog-driven preference (docs/jim-brief-elizabeth-heathrow-normalization.md defect 2): for
  // some branches (Piccadilly's Heathrow loop) `towards` carries a branch-loop label ("Heathrow
  // via T4 Loop") rather than the terminal name, and the `via` strip above — load-bearing for
  // genuine cases like "Grange Hill via Woodford" — collapses it to bare "Heathrow", which no
  // station offers as a direction. Only when `towards` was actually used (never the
  // compassOrUnknown branch, which already prefers destinationName) AND the towards-derived form
  // doesn't resolve to an offered direction at this station AND a destinationName-derived form
  // does, prefer destinationName instead. This is checked against the catalog's own data, not a
  // hardcoded list of terminal names, so it fixes the class (any `towards` branch-loop label that
  // discards information the `via` strip needs) rather than special-casing Heathrow. When neither
  // form resolves, the original towards-derived destination is kept (safe degradation).
  if (!compassOrUnknown && destinationName && stationName) {
    const towardsResolves = stationOffersDestination(stationName, fullDestination, regionId);
    if (!towardsResolves) {
      const altDestination = stripLondonDisambiguationPrefix(destinationName, regionId);
      const altRawFullDestination = lineName ? `${lineName} ${altDestination}`.trim() : altDestination;
      const altFullDestination = normalizeDestination(altRawFullDestination) || altRawFullDestination;
      if (stationOffersDestination(stationName, altFullDestination, regionId)) {
        fullDestination = altFullDestination;
      }
    }
  }

  const displayTime = liveDeparture.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: UK_TIME_ZONE,
  });

  const trip = providerTripToInternal({
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
  // Attached after providerTripToInternal (whose field whitelist lives in
  // lib/train-times-core.js, deliberately untouched by this fix — see
  // docs/jim-brief-dlr-dedup-key.md's "AMENDMENT 2") so `dedupeTrips` can use TfL's per-row
  // `vehicleId` as a physical-train identity without changing the shared internal trip shape
  // that pickUpcomingTrips/buildNextTrainResponse/other providers all rely on. Undefined for
  // ArrivalDepartures-sourced trips (parseTflArrivalDeparture), which carry no vehicleId.
  trip.vehicleId = arrival.vehicleId ? String(arrival.vehicleId) : undefined;
  return trip;
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
    const trip = parseTflArrival(row, now, regionId, entry.name);
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
