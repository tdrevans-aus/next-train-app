/**
 * Ensure local dev server is running for Playwright QA.
 *
 * docs/jim-brief-qa-port-per-worktree.md (13 Sep 2026): before this, every
 * local QA run defaulted to :3000 and attached to whatever answered there —
 * six concurrent `--smoke` runs from six worktrees all tested one worktree's
 * code through one shared server. The runner (qa/run-all.mjs) now picks a
 * free port per invocation and never attaches locally unless the user opts
 * in explicitly.
 */
import { spawn } from "child_process";
import http from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * QA_BASE (e.g. http://localhost:3101) moves the whole helper — probe, spawn
 * and the BASE every script imports — off :3000.
 *
 * - Under the runner (qa/run-all.mjs), QA_BASE is chosen fresh per run (a
 *   free port, unless QA_ATTACH=1 + an explicit QA_BASE ask to reuse one)
 *   and exported into process.env before any script is spawned, so every
 *   child inherits it and resolves the same BASE at its own module load.
 * - Run directly (`node qa/foo.mjs`, no runner involved), QA_BASE is
 *   normally unset, so BASE falls back to http://localhost:3000 — the
 *   "hand-started `node dev-server.js` on 3000" workflow keeps working.
 */
export let BASE = resolveInitialBase();
export let DEV_PORT = Number(new URL(BASE).port) || 3000;

function resolveInitialBase() {
  return (process.env.QA_BASE || "http://localhost:3000").replace(/\/$/, "");
}

function setBase(base) {
  BASE = base.replace(/\/$/, "");
  DEV_PORT = Number(new URL(BASE).port) || 3000;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Bind to port 0, read what the OS handed back, release it immediately. */
function pickFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

export function probeDevServer() {
  return new Promise((resolve) => {
    const req = http.get(BASE, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function spawnDevServer(force) {
  const verbose = process.env.CI === "true" || process.env.QA_VERBOSE === "1";
  if (verbose) {
    console.error(`[qa] starting dev-server.js on ${BASE}${force ? " (CI force)" : ""}`);
  }

  const child = spawn("node", ["dev-server.js"], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    // QA hammers this dev-server with many scripts against one long-lived
    // process; always bypass its soft rate limit (dev-server.js checks
    // CI==="true"), not just when the outer run is GitHub Actions CI.
    env: { ...process.env, CI: "true", PORT: String(DEV_PORT) },
    detached: process.platform !== "win32",
  });

  let log = "";
  child.stdout?.on("data", (chunk) => {
    log += chunk;
    if (verbose) {
      process.stderr.write(`[dev-server] ${chunk}`);
    }
  });
  child.stderr?.on("data", (chunk) => {
    log += chunk;
    if (verbose) {
      process.stderr.write(`[dev-server] ${chunk}`);
    }
  });

  return { child, getLog: () => log };
}

async function waitUntilReady(child, getLog) {
  for (let i = 0; i < 40; i++) {
    if (await probeDevServer()) {
      if (process.env.CI === "true" || process.env.QA_VERBOSE === "1") {
        console.error(`[qa] dev-server ready on ${BASE}`);
      }
      return child;
    }
    await sleep(250);
  }

  killDevServer(child);
  throw new Error(
    `Dev server did not become ready on ${BASE} within 10s. Output:\n${getLog().slice(0, 800)}`
  );
}

/**
 * Start dev-server.js.
 * Returns child process if we spawned it, else null (attached to an
 * already-live server).
 *
 * @param {{ force?: boolean, isRunner?: boolean }} [options]
 *   - force: CI sets this so we never attach to a stray server — throws if
 *     the target port is already busy. Behaviour unchanged by this file.
 *   - isRunner: only qa/run-all.mjs passes this. It means "pick a fresh free
 *     port for this whole suite run and never attach", unless the user
 *     explicitly opted into reuse with QA_ATTACH=1 + QA_BASE set. Individual
 *     scripts (including ones invoked as children of the runner) must NOT
 *     pass this — they keep the old "attach if BASE already answers, else
 *     spawn on BASE" behaviour, which is what lets a runner-spawned script
 *     attach to the runner's own freshly-picked port.
 */
export async function ensureDevServer({ force = false, isRunner = false } = {}) {
  if (isRunner && !force) {
    const userAskedToReuse = process.env.QA_ATTACH === "1" && Boolean(process.env.QA_BASE);
    if (!userAskedToReuse) {
      const port = await pickFreePort();
      setBase(`http://localhost:${port}`);
      process.env.QA_BASE = BASE;
      const { child, getLog } = spawnDevServer(force);
      return waitUntilReady(child, getLog);
    }
    // Fall through: explicit QA_ATTACH + QA_BASE reuse request behaves like
    // the default single-script path below (attach if live, else spawn on
    // the requested BASE).
  }

  if (force && (await probeDevServer())) {
    throw new Error(
      `${BASE} is already in use; CI expected a clean runner (set QA_VERBOSE=1 for logs).`
    );
  }
  if (!force && (await probeDevServer())) {
    return null;
  }

  const { child, getLog } = spawnDevServer(force);
  return waitUntilReady(child, getLog);
}

function killDevServer(child) {
  if (!child || child.killed) {
    return;
  }
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, "SIGKILL");
      return;
    } catch {
      // Fall through.
    }
  }
  child.kill("SIGKILL");
}

export function stopDevServer(child) {
  killDevServer(child);
}
