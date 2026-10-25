/**
 * Edinburgh Trams catalog overlay, applied only while the tram switch is on
 * (lib/cities/edinburgh/trams-switch.js).
 *
 * lib/cities/edinburgh/stations.json carries the 22 tram rows (liveFeed true since the 25 Oct 2026
 * flip); with the switch off every catalog consumer sees the rows unchanged. With the switch on, the overlay:
 *  - sets the tram (mode "metro") stops to `liveFeed: true`,
 *  - attaches each stop's Trapeze platform ids as `stopIds`,
 *  - inserts the 23rd stop, Edinburgh Park Station (trams-api.json `addedStop`) - then
 *    withholds it again, see the shared-name bullet,
 *  - never adds York Place (closed 10 Feb 2022) or the depot,
 *  - drops the three tram stops whose printed name resolves to a rail station
 *    (Haymarket, Edinburgh Gateway, Edinburgh Park Station): the API takes a bare name and resolves rail
 *    first, so a rider tapping the tram stop would get the RAIL board (Tim,
 *    24 Oct 2026). Their rail departures are unaffected. Follow-up: a mode or
 *    stop-id parameter through the API and client (docs/edinburgh-trams-d1/jim-handoff.md).
 * The overlay data is lib/cities/edinburgh/trams-api.json. Coverage text for the tram line lives in
 * lib/cities/edinburgh/coverage.json (folded in at the flip; there is no separate tram coverage file).
 *
 * The JSON files are STATIC IMPORTS (`with { type: "json" }`, as
 * lib/cities/sydney/marketing-directions.js does), not a file read of a computed
 * path, so the Vercel bundler (nft) traces them into the function bundle without
 * a vercel.json includeFiles entry.
 */
import overlayJson from "./trams-api.json" with { type: "json" };
import { isEdinburghTramsLive } from "./trams-switch.js";

/** Tram catalogIds withheld from every catalog surface while the switch is on. */
export const TRAM_SHARED_NAME_HIDDEN_CATALOG_IDS = Object.freeze([
  "tram:haymarket",
  "tram:edinburgh-gateway",
  // The bare name "Edinburgh Park Station" resolves to rail EDP (the shared resolver tolerates a
  // trailing "Station"), so the tram stop would show the ScotRail board (Mark, 25 Oct 2026, B1).
  "tram:edinburgh-park-station",
]);

/** @returns {{ apiBase: string, addedStop: object, stops: object[] }} */
export function loadTramsOverlay() {
  return overlayJson;
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
    if (
      stop.catalogId === "tram:edinburgh-park-central" &&
      !TRAM_SHARED_NAME_HIDDEN_CATALOG_IDS.includes(overlay.addedStop.catalogId)
    ) {
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
