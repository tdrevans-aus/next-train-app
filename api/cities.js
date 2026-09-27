import { applyCors } from "../lib/api-cors.js";
import { buildCityManifest } from "../lib/cities/city-manifest.js";

/**
 * City manifest — the server-side source of truth for "which cities exist" that the
 * client used to bake into seven hand-maintained list copies
 * (docs/jim-brief-registry-driven-client.md). contractVersion 2: every live city carries
 * displayName/country/timeZone/bounds/modes/nearbyEligible/directionsVersion, plus a
 * `countries` picker tree. No upstream calls — pure registry/static-data plumbing.
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.status(200).json(buildCityManifest());
}
