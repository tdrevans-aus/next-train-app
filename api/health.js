import { applyCors } from "../lib/api-cors.js";

/**
 * Cheap liveness for uptime monitors — no Transperth, no rate limit.
 * Synthetic train checks should hit /api/next-train separately.
 *
 * Also doubles as the GTFS refresh cron target (vercel.json "crons").
 * The Hobby plan caps a deployment at 12 Serverless Functions and this
 * project is already near that limit, so the refresh job lives in
 * lib/gtfs-refresh.js and is dispatched from here instead of its own
 * api/cron/*.js file. Vercel's own cron trigger is the only caller that
 * sends Authorization: Bearer $CRON_SECRET, so this never fires for a
 * normal health check.
 *
 * IMPORTANT: do not statically import lib/gtfs-refresh.js at the top
 * level. That module graph (fflate, city trims, Blob) OOMs Hobby cold
 * starts on plain GET. Load it only inside the cron auth branch.
 */
// memory + maxDuration are set in vercel.json's "functions" block instead
// of here - a `memory` field in this in-file config export is silently
// ignored by the Vercel Node builder (confirmed by inspecting the actual
// deployed .vc-config.json, which had no "memory" key despite this export
// declaring one); only vercel.json's functions.<path>.memory took effect.
export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"];
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const { runGtfsRefresh } = await import("../lib/gtfs-refresh.js");
    const report = await runGtfsRefresh();
    console.log("gtfs-refresh:", JSON.stringify(report));
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
