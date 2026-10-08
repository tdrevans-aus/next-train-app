/**
 * Cold + warm /api/board gate — docs/jim-brief-board-maxduration-regression.md (8 Oct 2026).
 *
 * Symptom: api/board.js fans out one getMultiCityNextTrain() per direction. At big hubs
 * (Sydney Central ~10-20 directions, Copenhagen København H 32) each direction used to redo the
 * whole station board (static join, and for Sydney three TfNSW realtime fetches), so the board
 * took 8-34 s and hit the 30 s function cap (504). Fixed by sharing one in-flight board
 * computation per station across directions (lib/cities/{copenhagen,sydney}/dogfood-next-train.js).
 *
 * Always spawns its OWN dev server (nothing warmed beforehand). Targets (Tim, 8 Oct 2026):
 * < 10 s cold, < 3 s warm. Cold bounds here are looser than 10 s only where the shared smoke
 * suite's CPU contention demands it — see each case. Keyed cases SKIP-LIVE without their env key
 * (CI has none); with no key available at all the gate prints SKIP-LIVE and passes rather than
 * failing CI, since it can only measure what it can reach.
 *
 * Usage: node qa/cold-start-board-gate.mjs
 */
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";
import { loadEnvLocal } from "../lib/load-env-local.js";

loadEnvLocal();

const WARM_BOUND_MS = 3000;

const CASES = [
  // Cold ~2-3 s standalone (was 11.6 s, warm 8 s before the shared-board fix); 32 directions.
  { city: "copenhagen", station: "København H", coldBoundMs: 10000, minEntries: 20, requiredEnvKeys: ["REJSEPLANEN_API_KEY"] },
  // Cold ~7.7 s standalone off-Vercel (TfNSW static download+parse dominates), warm ~0 s.
  { city: "sydney", station: "Central", coldBoundMs: 14000, minEntries: 5, requiredEnvKeys: ["TFNSW_API_KEY"] },
];

async function timed(path, timeoutMs) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
    const body = await res.json().catch(() => null);
    return { status: res.status, ms: Date.now() - start, body };
  } catch (error) {
    return { status: 0, ms: Date.now() - start, error };
  }
}

async function main() {
  const available = CASES.filter((c) => c.requiredEnvKeys.every((k) => process.env[k]));
  for (const c of CASES) {
    if (!available.includes(c)) console.log(`SKIP-LIVE (no ${c.requiredEnvKeys.join("/")} in this environment, ${c.city})`);
  }
  if (!available.length) {
    console.log("PASS cold-start-board-gate: SKIP-LIVE for every case (no keys in this environment)");
    return;
  }
  const child = await ensureDevServer({ isRunner: true });
  const failures = [];
  try {
    for (const c of available) {
      const path = `/api/board?city=${encodeURIComponent(c.city)}&station=${encodeURIComponent(c.station)}`;
      let cold = await timed(path, c.coldBoundMs + 5000);
      if (cold.status !== 200 && cold.status !== 0) {
        // one retry for a transient upstream hiccup (429 etc.) — same convention as the directions gate
        await new Promise((r) => setTimeout(r, 2000));
        cold = await timed(path, c.coldBoundMs + 5000);
      }
      const n = cold.body?.entries?.length ?? 0;
      console.log(`[cold-start-board-gate] ${c.city} ${c.station} cold: HTTP ${cold.status} in ${cold.ms}ms (${n} entries)`);
      if (cold.status !== 200) failures.push(`${c.city}: cold board HTTP ${cold.status} ${cold.error?.message ?? ""}`);
      else if (cold.ms > c.coldBoundMs) failures.push(`${c.city}: cold board took ${cold.ms}ms (> ${c.coldBoundMs}ms)`);
      else if (n < c.minEntries) failures.push(`${c.city}: cold board had only ${n} entries (< ${c.minEntries})`);
      if (cold.status !== 200) continue;
      const warm = await timed(path, WARM_BOUND_MS + 5000);
      console.log(`[cold-start-board-gate] ${c.city} ${c.station} warm: HTTP ${warm.status} in ${warm.ms}ms`);
      if (warm.status !== 200 || warm.ms > WARM_BOUND_MS) failures.push(`${c.city}: warm board HTTP ${warm.status} in ${warm.ms}ms (> ${WARM_BOUND_MS}ms)`);
    }
  } finally {
    if (child) stopDevServer(child);
  }
  if (failures.length) {
    console.error(`FAIL cold-start-board-gate:\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`PASS cold-start-board-gate: ${available.length} case(s) under cold/warm bounds`);
}

main().catch((e) => {
  console.error("FAIL cold-start-board-gate: unexpected error", e);
  process.exit(1);
});
