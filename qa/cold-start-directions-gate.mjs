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
 * Covers the acceptance criteria's named cities (Dublin, Melbourne, Prague): Dublin and Melbourne
 * derive /api/directions from a live GTFS board fetch (cold GTFS snapshot download+parse over
 * Blob, ~2-4s measured), Prague from a static marketing-directions list (no cold GTFS path at
 * all, included so the acceptance criteria's three named cities are all directly covered even
 * though it was never actually at risk). All three are registry `status: "live"`, so no
 * assertCityLive gate stands in the way of hitting the real handler end to end.
 *
 * Copenhagen is deliberately NOT covered here (removed 28 Sep 2026, Mark's QA note on PR #504):
 * its cold path measured 14.3-18.7s in this fix's own investigation but 21.6-25s across Mark's
 * standalone runs (his own fresh-server measurement: 24.7s), failing 2 of 3 runs against a single
 * global 25s bound — Rejseplanen's national static feed is simply too large and too variable for
 * a tight per-case bound right now. A separate Jim pass is trimming Copenhagen's snapshot
 * (docs/jim-brief-copenhagen-snapshot-trim.md); that PR re-adds a Copenhagen case here with its
 * own tight bound once the trim lands, rather than this gate carrying a loose, flaky one meanwhile.
 *
 * Each case gets its OWN cold bound (~2x its measured cold time) rather than one global bound —
 * exactly the shape a global bound got wrong for Copenhagen: a bound loose enough for the slowest
 * city is needlessly loose for the fastest, and a bound tight enough for the fastest can flake on
 * the slowest.
 *
 * Usage: node qa/cold-start-directions-gate.mjs
 */
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

// Generous warm bound — a warm request should be near-instant (observed <0.5s), but CI machines
// vary; this only needs to catch a regression that makes the *warm* path slow too.
const WARM_TIMEOUT_MS = 5000;

const CASES = [
  // Cold measured ~3.9s locally, ~3.9s in this fix's investigation — bound ~2x.
  { city: "dublin", station: "Abbey Street", coldTimeoutMs: 8000 },
  // Cold measured ~1.8-2.5s locally — bound ~2x the higher end.
  { city: "melbourne", station: "Flinders Street", coldTimeoutMs: 5000 },
  // Static marketing-directions list, no GTFS cold path — cold measured ~0.01s, generous floor.
  { city: "prague", station: "Muzeum", coldTimeoutMs: 3000 },
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
    for (const { city, station, coldTimeoutMs } of CASES) {
      const path = `/api/directions?city=${encodeURIComponent(city)}&station=${encodeURIComponent(station)}`;

      const cold = await timedFetch(path, coldTimeoutMs);
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
