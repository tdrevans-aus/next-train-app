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
 * Each case gets its OWN cold bound (generously above its measured standalone cold time) rather
 * than one global bound — exactly the shape a global bound got wrong for Copenhagen: a bound
 * loose enough for the slowest city is needlessly loose for the fastest, and a bound tight enough
 * for the fastest can flake on the slowest. The per-case bounds are looser than a plain 2x of the
 * standalone measurement (see the CASES comments) because this gate's own dedicated dev-server
 * still competes for CPU with the dozens of other gates a real --smoke run executes concurrently
 * — a 5000ms melbourne bound flaked inside an actual --smoke run (aborted at 5010ms, 28 Sep 2026)
 * despite every standalone run measuring under 3s.
 *
 * CI env-key gating (28 Sep 2026, web-qa failure on this PR): the CI runner has no
 * NTA_API_KEY/VIC_OPENDATA_API_KEY, so Dublin/Melbourne's fresh dev server 500'd with
 * MissingNtaApiKeyError/MissingProviderApiKeyError before this gate could measure anything —
 * Prague passed in 5ms because its /api/directions response is a static marketing-directions
 * list that never calls the live board at all, so it needs no key regardless of environment.
 * Each case below declares the env key(s) its OWN /api/directions call actually needs — NOT
 * necessarily a city's full registry envKeys, which describes the whole adapter (Prague's
 * registry entry lists GOLEMIO_API_KEY for its live board, but /api/directions never reaches
 * that code path, so its case here correctly needs none). A case whose key(s) are unset in
 * process.env prints the same SKIP-LIVE convention the service-hours gates use
 * (qa/helpers/service-hours.mjs) and is skipped rather than failing the whole gate — this keeps
 * the gate honest about what it actually exercised in a given environment instead of pretending
 * a 500 from a missing credential is the cold-start bug it exists to catch. Prague is kept
 * deliberately keyless so at least one case always runs the real fresh-server path in CI even
 * with zero keys configured; the gate fails outright if every case ends up skipped.
 *
 * Usage: node qa/cold-start-directions-gate.mjs
 */
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";
import { loadEnvLocal } from "../lib/load-env-local.js";

// Load .env.local into THIS process's env (same file the spawned dev-server.js loads for
// itself) so the requiredEnvKeys check below sees the same keys the server will actually have
// — local runs see a real key and exercise the case; CI (no .env.local file) sees none and
// skips, matching what the server would 500 on anyway.
loadEnvLocal();

// Generous warm bound — a warm request should be near-instant (observed <0.5s), but CI machines
// vary; this only needs to catch a regression that makes the *warm* path slow too.
const WARM_TIMEOUT_MS = 5000;

const CASES = [
  // Cold measured ~3.5-3.9s standalone. Live GTFS board fetch (NTA GTFS-RT) needs NTA_API_KEY.
  // Bound is generous, not a tight 2x, because this gate spawns its own dedicated dev-server
  // but still runs alongside dozens of concurrent smoke-suite gates competing for the same CPU —
  // a 5000ms bound flaked here under exactly that load (melbourne aborted at 5010ms in a real
  // --smoke run, 28 Sep 2026) even though every standalone run measured well under 3s.
  { city: "dublin", station: "Abbey Street", coldTimeoutMs: 12000, requiredEnvKeys: ["NTA_API_KEY"] },
  // Cold measured ~1.8-2.5s standalone, but see the dublin comment above for why the bound is
  // this much looser than a plain 2x — CPU contention from the rest of the smoke suite running
  // concurrently, not variance in this city's own cold path. Live GTFS board fetch (VIC Open
  // Data) needs VIC_OPENDATA_API_KEY.
  {
    city: "melbourne",
    station: "Flinders Street",
    coldTimeoutMs: 12000,
    requiredEnvKeys: ["VIC_OPENDATA_API_KEY"],
  },
  // Static marketing-directions list, no GTFS cold path — cold measured ~2-13ms standalone.
  // No key needed: /api/directions never calls the live Golemio board for Prague, so this case
  // is deliberately keyless and must never be skipped (see file header). Bound still has real
  // margin (not just 2x a near-zero number) for the same smoke-suite-contention reason as above.
  { city: "prague", station: "Muzeum", coldTimeoutMs: 5000, requiredEnvKeys: [] },
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
  let ranCount = 0;
  let skippedCount = 0;

  try {
    for (const { city, station, coldTimeoutMs, requiredEnvKeys } of CASES) {
      const missingKey = (requiredEnvKeys ?? []).find((key) => !process.env[key]);
      if (missingKey) {
        skippedCount += 1;
        console.log(`SKIP-LIVE (no ${missingKey} in this environment, ${city})`);
        continue;
      }
      ranCount += 1;

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

  if (ranCount === 0) {
    console.error(
      `FAIL cold-start-directions-gate: every case was skipped (${skippedCount} of ${CASES.length}) — no environment key ` +
        "was available for any case, so this gate exercised nothing. Prague's case is deliberately " +
        "keyless and must never skip; if it did, something changed about what it needs a key for."
    );
    process.exit(1);
  }

  if (failures.length > 0) {
    console.error(`FAIL cold-start-directions-gate:\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    process.exit(1);
  }

  console.log(
    `PASS cold-start-directions-gate: first /api/directions call succeeded within the timeout for ` +
      `${ranCount} of ${CASES.length} case(s) checked (${skippedCount} skipped for missing env keys), warm calls stayed fast`
  );
}

main().catch((error) => {
  console.error("FAIL cold-start-directions-gate: unexpected error", error);
  process.exit(1);
});
