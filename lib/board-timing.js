/**
 * Opt-in per-phase timing (BOARD_TIMING=1). Off by default; logs one JSON line per phase so
 * `vercel logs` can table where a cold board spends its time. No behaviour change when unset.
 */
const ON = process.env.BOARD_TIMING === "1";
const BOOT = Date.now();

export function timingEnabled() {
  return ON;
}

export function tlog(phase, ms, extra = {}) {
  if (!ON) return;
  console.log(
    JSON.stringify({
      bt: phase,
      ms: Math.round(ms),
      upMs: Math.round(process.uptime() * 1000),
      sinceBoot: Date.now() - BOOT,
      region: process.env.VERCEL_REGION,
      ...extra,
    })
  );
}

export async function timed(phase, fn, extra) {
  if (!ON) return fn();
  const t = performance.now();
  try {
    return await fn();
  } finally {
    tlog(phase, performance.now() - t, extra);
  }
}
