/**
 * Cold-start /api/directions gate — docs/jim-brief-cold-start-directions-timeout.md (28 Sep 2026).
 *
 * Symptom: on a freshly started server, the FIRST /api/directions call for a static-join city
 * (GTFS snapshot download+parse over Blob, e.g. Melbourne/Copenhagen/Dublin/Adelaide) could take
 * long enough — Copenhagen measured ~14.3s cold vs ~0.4s warm during this fix's own investigation
 * — to exceed a serverless function's default execution timeout, while every later call against
 * the same warm instance succeeds in well under a second. This gate reproduces the cold path
 * directly (no warm-up requests of any kind before the assertions) rather than trusting a shared,
 * already-warm dev-server the rest of the suite may have touched — qa/helpers/dev-server.mjs's
 * default `ensureDevServer()` attaches to whatever the runner already started, which would defeat
 * the point here, so this always spawns its OWN dedicated instance via
 * `ensureDevServer({ isRunner: true })` regardless of an inherited QA_BASE.
 *
 * Covers the acceptance criteria's named cities (Dublin, Melbourne, Prague) plus Copenhagen,
 * whose cold path (~14-19s measured during this fix's own investigation, the clearest
 * reproduction of the brief's symptom) is the most exposed of any live city: Dublin and Melbourne
 * derive /api/directions from a live GTFS board fetch (cold GTFS snapshot download+parse over
 * Blob, ~2-4s measured), Copenhagen the same but against Rejseplanen's much larger national
 * static feed, and Prague from a static marketing-directions list (no cold GTFS path at all,
 * included so the acceptance criteria's three named cities are all directly covered even though
 * it was never actually at risk). All four are registry `status: "live"`, so no assertCityLive
 * gate stands in the way of hitting the real handler end to end.
 *
 * Usage: node qa/cold-start-directions-gate.mjs
 */
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

// Bounded by vercel.json's api/directions.js maxDuration (30s) — comfortably above every
// measured cold time, comfortably below the platform ceiling this gate exists to stay under.
const COLD_TIMEOUT_MS = 25000;
// Generous warm bound — a warm request should be near-instant (observed <0.5s), but CI machines
// vary; this only needs to catch a regression that makes the *warm* path slow too.
const WARM_TIMEOUT_MS = 5000;

const CASES = [
  { city: "dublin", station: "Abbey Street" },
  { city: "melbourne", station: "Flinders Street" },
  { city: "prague", station: "Muzeum" },
  { city: "copenhagen", station: "København H" },
];

async function timedFetch(path, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    const elapsedMs = Date.now() - start;
    const body = await res.json().catch(() => null);
    return { ok: true, status: res.status, elapsedMs, body };
  } catch (error) {
    const elapsedMs = Date.now() - start;
    return { ok: false, elapsedMs, error };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const child = await ensureDevServer({ isRunner: true });
  const failures = [];

  try {
    for (const { city, station } of CASES) {
      const path = `/api/directions?city=${encodeURIComponent(city)}&station=${encodeURIComponent(station)}`;

      const cold = await timedFetch(path, COLD_TIMEOUT_MS);
      if (!cold.ok) {
        failures.push(
          `${city}: cold /api/directions request errored after ${cold.elapsedMs}ms: ${cold.error?.message ?? cold.error}`
        );
        continue;
      }
      if (cold.status !== 200) {
        failures.push(
          `${city}: cold /api/directions returned HTTP ${cold.status} after ${cold.elapsedMs}ms: ${JSON.stringify(cold.body)}`
        );
        continue;
      }
      if (!Array.isArray(cold.body?.directions) || cold.body.directions.length === 0) {
        failures.push(
          `${city}: cold /api/directions returned 200 but no directions after ${cold.elapsedMs}ms: ${JSON.stringify(cold.body)}`
        );
        continue;
      }
      console.log(`[cold-start-directions-gate] ${city} cold: HTTP 200 in ${cold.elapsedMs}ms (${cold.body.directions.length} directions)`);

      const warm = await timedFetch(path, WARM_TIMEOUT_MS);
      if (!warm.ok || warm.status !== 200) {
        failures.push(
          `${city}: warm /api/directions (immediately after the cold call, same server) failed: status=${warm.status} elapsedMs=${warm.elapsedMs} error=${warm.error?.message ?? ""}`
        );
        continue;
      }
      console.log(`[cold-start-directions-gate] ${city} warm: HTTP 200 in ${warm.elapsedMs}ms`);
    }
  } finally {
    if (child) {
      stopDevServer(child);
    }
  }

  if (failures.length > 0) {
    console.error(`FAIL cold-start-directions-gate:\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    process.exit(1);
  }

  console.log("PASS cold-start-directions-gate: first /api/directions call succeeded within the timeout for every static-join city checked, warm calls stayed fast");
}

main().catch((error) => {
  console.error("FAIL cold-start-directions-gate: unexpected error", error);
  process.exit(1);
});
