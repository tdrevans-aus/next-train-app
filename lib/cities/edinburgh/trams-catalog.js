/**
 * Edinburgh Trams catalog overlay, applied only while the tram switch is on
 * (lib/cities/edinburgh/trams-switch.js).
 *
 * lib/cities/edinburgh/stations.json is deliberately left exactly as it was
 * (22 tram stops, all `liveFeed: false`), so with the switch off every catalog
 * consumer sees the same bytes as before. With the switch on, the overlay:
 *  - flips the tram (mode "metro") stops to `liveFeed: true`,
 *  - attaches each stop's Trapeze platform ids as `stopIds`,
 *  - inserts the 23rd stop, Edinburgh Park Station (trams-api.json `addedStop`),
 *  - never adds York Place (closed 10 Feb 2022) or the depot,
 *  - drops the two tram stops whose printed name is also a rail station
 *    (Haymarket, Edinburgh Gateway): the API takes a bare name and resolves rail
 *    first, so a rider tapping the tram stop would get the RAIL board (Tim,
 *    24 Oct 2026). Their rail departures are unaffected. Follow-up: a mode or
 *    stop-id parameter through the API and client (docs/edinburgh-trams-d1/jim-handoff.md).
 * The overlay data is lib/cities/edinburgh/trams-api.json.
 *
 * The JSON files are STATIC IMPORTS (`with { type: "json" }`, as
 * lib/cities/sydney/marketing-directions.js does), not a file read of a computed
 * path, so the Vercel bundler (nft) traces them into the function bundle without
 * a vercel.json includeFiles entry.
 */
import overlayJson from "./trams-api.json" with { type: "json" };
import coverageTramsJson from "./coverage-trams.json" with { type: "json" };
import { isEdinburghTramsLive } from "./trams-switch.js";

/** Tram catalogIds withheld from every catalog surface while the switch is on. */
export const TRAM_SHARED_NAME_HIDDEN_CATALOG_IDS = Object.freeze(["tram:haymarket", "tram:edinburgh-gateway"]);

/** @returns {{ apiBase: string, addedStop: object, stops: object[] }} */
export function loadTramsOverlay() {
  return overlayJson;
}

/**
 * Coverage notes for /api/coverage-notes?city=edinburgh. Returns the SAME object
 * when the switch is off (the committed coverage.json, byte-identical to master).
 * @param {object} notes parsed lib/cities/edinburgh/coverage.json
 * @param {{ tramsLive?: boolean }} [options]
 */
export function applyEdinburghTramsCoverage(notes, options = {}) {
  const live = options.tramsLive ?? isEdinburghTramsLive();
  return live ? { ...coverageTramsJson } : notes;
}

/** The overlay row (platform ids) for a tram catalog entry, by catalogId or name. */
export function tramOverlayFor(entryOrName) {
  const overlay = loadTramsOverlay();
  const catalogId = typeof entryOrName === "object" ? entryOrName?.catalogId : null;
  const name = typeof entryOrName === "string" ? entryOrName : entryOrName?.name;
  return (
    overlay.stops.find((s) => catalogId && s.catalogId === catalogId) ??
    overlay.stops.find((s) => String(s.name).toLowerCase() === String(name ?? "").toLowerCase()) ??
    null
  );
}

/**
 * @param {object[]} stops the `stops` array of lib/cities/edinburgh/stations.json
 * @param {{ tramsLive?: boolean }} [options] defaults to the registry switch
 * @returns {object[]} the SAME array (identity) when the switch is off
 */
export function applyEdinburghTramsToStops(stops, options = {}) {
  const live = options.tramsLive ?? isEdinburghTramsLive();
  if (!live) {
    return stops;
  }
  const overlay = loadTramsOverlay();
  const out = [];
  for (const stop of stops) {
    if (stop.mode !== "metro") {
      out.push(stop);
      continue;
    }
    if (TRAM_SHARED_NAME_HIDDEN_CATALOG_IDS.includes(stop.catalogId)) {
      continue;
    }
    const row = tramOverlayFor(stop);
    const stopIds = row ? [row.towardsNewhaven, row.towardsAirport].filter(Boolean) : [];
    out.push({ ...stop, liveFeed: true, stopIds });
    if (stop.catalogId === "tram:edinburgh-park-central") {
      const added = overlay.addedStop;
      const addedRow = tramOverlayFor(added);
      out.push({
        ...added,
        stopIds: addedRow ? [addedRow.towardsNewhaven, addedRow.towardsAirport].filter(Boolean) : [],
        liveFeed: true,
      });
    }
  }
  return out;
}
