/**
 * Does every catalog station resolve against a snapshot's stops?
 *
 * Uppsala/Malmö (and Göteborg) resolve catalog names against the static snapshot's stops at request
 * time (`findRailStopIdsForName`, no committed stop_ids). When a refresh republishes a snapshot whose
 * feed dropped or renamed those stops, every station request 500s ("Unknown Uppsala station") while
 * /api/directions and /api/city-stations stay green. On 22 Nov 2026 the Trafiklab `ul` feed lost all
 * rail routes; the refresh published a rail-less snapshot and Uppsala was down until 24 Nov
 * (docs/jim-brief-uppsala-unknown-station-after-refresh.md).
 *
 * Used by scripts/publish-gtfs-snapshot-to-blob.mjs BEFORE it overwrites the published blob (fail the
 * unit, keep the old blob) and by qa/snapshot-catalog-resolution-gate.mjs (offline, on fixtures).
 */

import { findRailStopIdsForName } from "./static-cache.js";

/**
 * @param {Array<Record<string,string>>} stops parsed stops.txt rows of the snapshot
 * @param {Array<{ name: string, stopIds?: string[] }>} catalogStations
 * @returns {string[]} names of catalog stations with no matching stop in the snapshot
 */
export function unresolvedCatalogStations(stops, catalogStations) {
  const stopIds = new Set(stops.map((stop) => stop.stop_id));
  const unresolved = [];
  for (const entry of catalogStations) {
    if (entry.stopIds?.length) {
      if (!entry.stopIds.some((id) => stopIds.has(id))) {
        unresolved.push(entry.name);
      }
      continue;
    }
    if (findRailStopIdsForName({ stops }, entry.name).length === 0) {
      unresolved.push(entry.name);
    }
  }
  return unresolved;
}

/**
 * Throws a descriptive Error when the stripped snapshot is unusable: no trips, or any catalog
 * station unresolvable.
 * `resolution: "none"` is for cities whose catalog does not resolve by GTFS stop name/stopId (Göteborg
 * keys on vasttrafikStopAreaGids): only the non-empty trips/stops check applies.
 * @param {{ city: string, trips: unknown[], stops: Array<Record<string,string>>, catalogStations: Array<{name:string}>, resolution?: "name"|"none" }} p
 */
export function assertSnapshotResolvesCatalog({ city, trips, stops, catalogStations, resolution = "name" }) {
  if (!trips.length || !stops.length) {
    throw new Error(
      `${city}: stripped snapshot has ${trips.length} trips and ${stops.length} stops - the upstream feed ` +
        `no longer carries the routes this adapter keeps. Refusing to publish; the existing blob is left in place.`
    );
  }
  if (resolution === "none") {
    return;
  }
  const missing = unresolvedCatalogStations(stops, catalogStations);
  if (missing.length) {
    throw new Error(
      `${city}: ${missing.length}/${catalogStations.length} catalog stations do not resolve against the new ` +
        `snapshot's stops (${missing.join(", ")}). Refusing to publish; the existing blob is left in place.`
    );
  }
}
