/**
 * Ensure local dev server is running for Playwright QA.
 */
import { spawn } from "child_process";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const BASE = "http://localhost:3000";
export const DEV_PORT = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/**
 * Start dev-server.js if nothing is listening on :3000.
 * Returns child process if we spawned it, else null.
 * @param {{ force?: boolean }} [options] — CI sets force so we never attach to a stray :3000.
 */
export async function ensureDevServer({ force = false } = {}) {
  if (force && (await probeDevServer())) {
    throw new Error(
      `${BASE} is already in use; CI expected a clean runner (set QA_VERBOSE=1 for logs).`
    );
  }
  if (!force && (await probeDevServer())) {
    return null;
  }

  const verbose = process.env.CI === "true" || process.env.QA_VERBOSE === "1";
  if (verbose) {
    console.error(`[qa] starting dev-server.js on ${BASE}${force ? " (CI force)" : ""}`);
  }

  const child = spawn("node", ["dev-server.js"], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
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

  for (let i = 0; i < 40; i++) {
    if (await probeDevServer()) {
      if (verbose) {
        console.error(`[qa] dev-server ready on ${BASE}`);
      }
      return child;
    }
    await sleep(250);
  }

  killDevServer(child);
  throw new Error(
    `Dev server did not become ready on ${BASE} within 10s. Output:\n${log.slice(0, 800)}`
  );
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
