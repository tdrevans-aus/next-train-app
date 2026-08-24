/**
 * West Midlands Metro — TfWM GTFS-RT (not Darwin).
 * Region: uk-west-midlands only.
 * @see docs/uk-coding-brief.md · docs/uk-architecture.md
 */
import {
  listMetroStops,
  listCatalogStations,
  resolveMetroEntry,
} from "./uk/catalog.js";

export const UK_WM_REGION = "uk-west-midlands";
export const TFWM_GTFS_RT_URL = "http://api.tfwm.org.uk/gtfs/trip_updates";

export class MissingTfwmCredentialsError extends Error {
  constructor() {
    super("TFWM_API_APP_ID and TFWM_API_APP_KEY are not set");
    this.name = "MissingTfwmCredentialsError";
    this.envNames = ["TFWM_API_APP_ID", "TFWM_API_APP_KEY"];
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
 * @param {string} stopIdOrName
 * @param {{ regionId?: string }} [options]
 */
export async function fetchMetroStopBoard(stopIdOrName, options = {}) {
  const regionId = options.regionId ?? UK_WM_REGION;
  const entry = resolveMetroEntry(stopIdOrName, regionId);
  if (!entry) {
    throw new Error(`Unknown Metro stop in ${regionId}: ${stopIdOrName}`);
  }

  const { appId, appKey } = readTfwmCredentials();
  const url = `${TFWM_GTFS_RT_URL}?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`;

  void url;
  throw new Error(
    "West Midlands Metro GTFS-RT board builder not implemented yet — catalog + credentials check only"
  );
}

export { listCatalogStations, resolveMetroEntry };
