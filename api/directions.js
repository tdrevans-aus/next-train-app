import { fetchTripsForStation } from "../lib/train-times.js";
import { resolveDirectionsForStation } from "../lib/cities/perth/static-directions.js";
import { applyCors } from "../lib/api-cors.js";
import { checkRateLimit } from "../lib/api-rate-limit.js";
import { resolveAllowedStation } from "../lib/api-station-allowlist.js";
import { assertCityLive } from "../lib/providers/registry.js";
import {
  getMultiCityDirections,
  isMultiCity,
  resolveMultiCityStation,
} from "../lib/cities/live-city-api.js";
import { sendGenericServerError } from "../lib/api-error-response.js";

/**
 * jim-brief-directions-error-messaging: distinguish "retrying could help"
 * from "retrying can never help" without the client needing to know every
 * adapter's error class. lib/providers/* consistently sets `error.name` to
 * the thrown class's own name (see e.g. NetFeedUnconfirmedError,
 * MissingDarwinTokenError) — that name doesn't otherwise survive the HTTP
 * round-trip (the client only ever saw `error.message` before this), so
 * surface a coarse, generic `reason` alongside the existing message rather
 * than leaking internal class names to the browser.
 *
 * Every "Missing*" adapter error (MissingDarwinTokenError,
 * MissingTfwmCredentialsError, MissingPtvCredentialsError,
 * MissingProviderApiKeyError, MissingActGtfsCredentialsError,
 * MissingTflAppKeyError, MissingActGtfsCredentialsError) is an operator
 * config problem, not a rider one. Every other named adapter error thrown
 * unconditionally by design (NetFeedUnconfirmedError,
 * MetrolinkFeedUnconfirmedError, SupertramFeedUnconfirmedError,
 * EdinburghTramsFeedUnverifiedError, GlasgowSubwayFeedUnverifiedError,
 * MetroFeedUnconfirmedError, ...) means this feed will never return data until
 * a real one exists — retrying can't help either. An unnamed/generic Error
 * (network hiccup, transient upstream failure) keeps the existing "try
 * again" treatment. Liverpool City Region's Merseyrail no longer has such
 * an error — see docs/jim-brief-liverpool-merseyrail-via-darwin.md.
 *
 * VasttrafikUnavailableError (lib/providers/vasttrafik.js) is a deliberate
 * exception to the "every other named error is permanent" rule above: it's
 * thrown for a transient live-fetch failure (HTTP error, auth failure,
 * timeout, malformed body) on Göteborg's live-only board (no timetable
 * fallback — docs/jim-brief-goteborg-live-only-no-fallback.md), and retrying
 * once Västtrafik recovers genuinely can help. It must not fall into the
 * generic "feed_unavailable" bucket other named errors get below, so it's
 * excluded before that default and gets the same treatment as an unnamed
 * Error (the "try again" copy).
 *
 * GtfsSnapshotStaleError (lib/providers/gtfs/errors.js,
 * docs/jim-brief-gtfs-snapshot-freshness.md) gets the same exception for the
 * same reason: the shared GTFS static+RT board refused to serve a board it
 * judged stale (calendar coverage lapsed, or realtime trip IDs no longer
 * resolve against the snapshot), and a refresh — the change-driven cron, or
 * the next GitHub Actions run for a large feed — can genuinely fix it.
 */
export function classifyDirectionsError(error) {
  const name = String(error?.name || "");
  if (!name || name === "Error") {
    return undefined;
  }
  if (name.startsWith("Missing")) {
    return "missing_config";
  }
  if (name === "VasttrafikUnavailableError" || name === "GtfsSnapshotStaleError") {
    return undefined;
  }
  return "feed_unavailable";
}

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (!checkRateLimit(req, res)) {
    return;
  }

  const city = req.query?.city ?? "perth";
  const cityGate = assertCityLive(city);
  if (!cityGate.ok) {
    res.status(cityGate.status).json({
      error: cityGate.error,
      city: cityGate.city,
      integration: cityGate.integration,
    });
    return;
  }

  if (isMultiCity(city)) {
    const station = resolveMultiCityStation(city, req.query?.station);
    if (!station) {
      res.status(400).json({
        error: req.query?.station ? "Unknown station" : "Missing station parameter",
      });
      return;
    }
    try {
      const pack = await getMultiCityDirections(city, station);
      res.status(200).json({ directions: pack.directions, source: pack.source });
    } catch (error) {
      sendGenericServerError(res, {
        error,
        fallbackMessage: "Failed to load directions",
        reason: classifyDirectionsError(error),
        city,
        station,
      });
    }
    return;
  }

  const station = resolveAllowedStation(req.query?.station);

  if (!station) {
    res.status(400).json({ error: req.query?.station ? "Unknown station" : "Missing station parameter" });
    return;
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    const { directions, source } = resolveDirectionsForStation(station, trips);
    res.status(200).json({ directions, source });
  } catch (error) {
    const fallback = resolveDirectionsForStation(station, []);
    if (fallback.directions.length) {
      console.warn(`[api/directions] served fallback directions after fetch failure city=${city} station=${station}:`, error);
      res.status(200).json({ directions: fallback.directions, source: fallback.source });
      return;
    }
    sendGenericServerError(res, {
      error,
      fallbackMessage: "Failed to fetch directions",
      reason: classifyDirectionsError(error),
      city,
      station,
    });
  }
}
