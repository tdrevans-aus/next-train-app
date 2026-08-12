import { applyCors } from "../lib/api-cors.js";

/**
 * Cheap liveness for uptime monitors — no Transperth, no rate limit.
 * Synthetic train checks should hit /api/next-train separately.
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

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    service: "next-train-api",
    ts: new Date().toISOString(),
  });
}
