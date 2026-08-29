import { applyCors } from "../lib/api-cors.js";
import { runGtfsRefresh } from "../lib/gtfs-refresh.js";

/**
 * Cheap liveness for uptime monitors — no Transperth, no rate limit.
 * Synthetic train checks should hit /api/next-train separately.
 *
 * Also doubles as the GTFS refresh cron target (vercel.json "crons").
 * The Hobby plan caps a deployment at 12 Serverless Functions and this
 * project is already at that limit, so the refresh job lives in
 * lib/gtfs-refresh.js and is dispatched from here instead of its own
 * api/cron/*.js file. Vercel's own cron trigger is the only caller that
 * sends Authorization: Bearer $CRON_SECRET, so this never fires for a
 * normal health check.
 */
export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"];
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const report = await runGtfsRefresh();
    res.status(report.ok ? 200 : 500).json(report);
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
