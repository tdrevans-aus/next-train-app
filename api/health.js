import { applyCors } from "../lib/api-cors.js";
import { getStaleCityReport } from "../lib/providers/gtfs/staleness-registry.js";

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
 *
 * IMPORTANT: "@vercel/blob" is imported here (a file under api/), NOT
 * inside lib/gtfs-refresh.js. Confirmed on a real Vercel preview deploy
 * (docs/jim-brief-gtfs-refresh-cron-crash.md, 11 Sep 2026): a bare npm
 * import in a file under lib/ throws ERR_MODULE_NOT_FOUND in the deployed
 * bundle even though the same package resolves fine from a file under
 * api/ - this is what crashed the cron on every run since 4 Sep. `put` is
 * passed into runGtfsRefresh() as `putImpl` rather than gtfs-refresh.js
 * importing the package itself.
 */
// maxDuration is set in vercel.json's "functions" block instead of here.
//
// This function is also pinned to region "syd1" in vercel.json's
// functions["api/health.js"] block (docs/jim-brief-canberra-refresh-region.md,
// 13 Sep 2026). The Canberra GTFS refresh (below) downloads from
// www.transport.act.gov.au, which sits behind Cloudflare; Cloudflare serves
// a managed JS challenge (403, `cf-mitigated: challenge`) to this project's
// default US egress (iad1) but returns 200 from syd1. Pinning the whole
// function - rather than only the fetch - is the only way to change which
// region Vercel actually runs it in. Side effect: the UptimeRobot liveness
// check now also runs from Sydney instead of the US - fine, same platform,
// just noted here so it isn't a surprise later.
//
// Function memory/CPU is NOT settable via vercel.json on this project, at
// all - confirmed on a real deployment (docs/jim-brief-vercel-memory-not-
// applied.md, 13 Sep 2026): `vercel deploy` prints "Provided `memory`
// setting in vercel.json is ignored on Active CPU billing" and
// `vercel inspect --json` on the resulting deployment showed every
// function, including this one, at memorySize 2048 regardless of what
// vercel.json requested. This project runs on Fluid Compute / Active CPU
// billing, where memory is a project-wide dashboard setting, not a
// per-function vercel.json override: Settings -> Functions -> Advanced
// Settings -> Function CPU, choosing Standard (2 GB / 1 vCPU, the current
// default) or Performance (4 GB / 2 vCPUs). A vercel.json "memory" key was
// removed from this project's functions block because it was silently
// inert - do not re-add one.
export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"];
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const [{ put }, { runGtfsRefresh }] = await Promise.all([
      import("@vercel/blob"),
      import("../lib/gtfs-refresh.js"),
    ]);
    const report = await runGtfsRefresh({ putImpl: put });
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
  // stale: cities whose GTFS static snapshot the shared board join has
  // judged stale on this instance (docs/jim-brief-gtfs-snapshot-freshness.md)
  // — calendar coverage lapsed, or too few realtime trip IDs resolve against
  // the snapshot. Per-instance (resets on cold start), same scope as
  // static-cache.js's TTL cache; not a substitute for checking the cron log.
  res.status(200).json({
    ok: true,
    service: "next-train-api",
    ts: new Date().toISOString(),
    stale: getStaleCityReport(),
  });
}
