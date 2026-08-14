import { applyCors } from "../lib/api-cors.js";
import { resolveAllowedStation } from "../lib/api-station-allowlist.js";
import { unzipSync } from "../lib/vendor/fflate.mjs";

// Load server stack (Perth live + GTFS fallback) — fails at import if deploy bundle is broken.
import "../lib/train-times-server.js";

/**
 * Readiness for uptime monitors — loads GTFS/fflate + allowlist, no Transperth call.
 * Pair with /api/health (platform up) and synthetic /api/next-train (live data path).
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

  if (typeof unzipSync !== "function") {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ ok: false, ready: false, error: "gtfs unzip unavailable" });
    return;
  }

  const station = resolveAllowedStation("Edgewater Stn");
  if (!station) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ ok: false, ready: false, error: "station allowlist unavailable" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    ready: true,
    service: "next-train-api",
    checks: ["train-times-server", "gtfs-static-cache", "fflate-vendor", "allowlist"],
    ts: new Date().toISOString(),
  });
}
