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
 */
export async function ensureDevServer() {
  if (await probeDevServer()) {
    return null;
  }

  const child = spawn("node", ["dev-server.js"], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  let log = "";
  child.stdout?.on("data", (chunk) => {
    log += chunk;
  });
  child.stderr?.on("data", (chunk) => {
    log += chunk;
  });

  for (let i = 0; i < 40; i++) {
    if (await probeDevServer()) {
      return child;
    }
    await sleep(250);
  }

  child.kill();
  throw new Error(
    `Dev server did not become ready on ${BASE} within 10s. Output:\n${log.slice(0, 800)}`
  );
}

export function stopDevServer(child) {
  if (child && !child.killed) {
    child.kill();
  }
}
