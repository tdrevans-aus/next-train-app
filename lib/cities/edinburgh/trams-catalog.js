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
 *  - never adds York Place (closed 10 Feb 2022) or the depot.
 * The overlay data is lib/cities/edinburgh/trams-api.json.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { isEdinburghTramsLive } from "./trams-switch.js";

const OVERLAY_PATH = join(dirname(fileURLToPath(import.meta.url)), "trams-api.json");

let overlayCache = null;

/** @returns {{ apiBase: string, addedStop: object, stops: object[] }} */
export function loadTramsOverlay() {
  if (!overlayCache) {
    overlayCache = JSON.parse(readFileSync(OVERLAY_PATH, "utf8"));
  }
  return overlayCache;
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
