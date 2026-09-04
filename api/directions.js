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
 * MetroGtfsTooLargeError, ...) means this feed will never return data until
 * a real one exists — retrying can't help either. An unnamed/generic Error
 * (network hiccup, transient upstream failure) keeps the existing "try
 * again" treatment. Liverpool City Region's Merseyrail no longer has such
 * an error — see docs/jim-brief-liverpool-merseyrail-via-darwin.md.
 */
export function classifyDirectionsError(error) {
  const name = String(error?.name || "");
  if (!name || name === "Error") {
    return undefined;
  }
  if (name.startsWith("Missing")) {
    return "missing_config";
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
      console.error(error);
      res.status(500).json({
        error: error.message ?? "Failed to load directions",
        reason: classifyDirectionsError(error),
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
    console.error(error);
    const fallback = resolveDirectionsForStation(station, []);
    if (fallback.directions.length) {
      res.status(200).json({ directions: fallback.directions, source: fallback.source });
      return;
    }
    res.status(500).json({
      error: error.message ?? "Failed to fetch directions",
      reason: classifyDirectionsError(error),
    });
  }
}
