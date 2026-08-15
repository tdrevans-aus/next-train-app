/**
 * Run web QA scripts with one command.
 *
 * Usage:
 *   node qa/run-all.mjs              # full suite
 *   node qa/run-all.mjs --smoke      # fast gate (~2–5 min)
 *   node qa/run-all.mjs --release    # smoke + pin/leave gates (~5–8 min) — CI on main
 *   node qa/run-all.mjs --no-native  # full web only (no Maestro / native CDP tail)
 *   node qa/run-all.mjs --list       # list scripts in suite
 *
 * CI (GITHUB_ACTIONS): per-script timeouts (3–6 min), QA_VERBOSE=1 streams logs,
 * 30s heartbeats, and dev-server is always spawned fresh on :3000.
 * Override all script limits with QA_SCRIPT_TIMEOUT_MS.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDevServer, stopDevServer, REPO_ROOT } from "./helpers/dev-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Exit 1 = expected good (repro did not fire / delay not seen). */
const EXIT_INVERT_PASS = new Set([
  "custom-template-delay-repro.mjs",
  "done-double-tap-repro.mjs",
]);

const SMOKE_SCRIPTS = [
  "stickiness-coaches-logic.mjs",
  "fremantle-claremont-direction.mjs",
  "smoke-browser.mjs",
  "smoke-11-13.mjs",
  "reminders-dialog.mjs",
  "reminders-permission-gate.mjs",
  "template-wizard-coach-overlap.mjs",
  "journey-detail-footer-above-ad.mjs",
  "nearby-content-above-ad.mjs",
  "static-page-above-ad.mjs",
  "dialog-above-ad.mjs",
  "onboarding-not-on-overlay.mjs",
  "onboarding-scrim-dismiss.mjs",
];

/** Smoke + ship gates not in smoke — main-branch CI tier (FB-33 QA-P2-09). */
const RELEASE_EXTRA_SCRIPTS = [
  "leave-by-preferred-gate.mjs",
  "pin-swipe-notify.mjs",
];

const RELEASE_SCRIPTS = [
  ...SMOKE_SCRIPTS,
  ...RELEASE_EXTRA_SCRIPTS.filter((name) => !SMOKE_SCRIPTS.includes(name)),
];

const RUNNER_EXCLUDE = new Set([
  "run-all.mjs",
  "pre-upload-check.mjs",
  "pre-release.mjs",
]);

/** Native/device scripts run last so they do not disturb each other. */
const NATIVE_TAIL_SCRIPTS = [
  "reminders-permission-native-cdp.mjs",
  "run-maestro.mjs",
];

function listFullScripts() {
  const all = fs
    .readdirSync(__dirname)
    .filter((name) => name.endsWith(".mjs") && !RUNNER_EXCLUDE.has(name))
    .sort();
  const tail = NATIVE_TAIL_SCRIPTS.filter((name) => all.includes(name));
  const rest = all.filter((name) => !tail.includes(name));
  return [...rest, ...tail];
}

function parseArgs(argv) {
  const smoke = argv.includes("--smoke");
  const release = argv.includes("--release");
  const list = argv.includes("--list");
  const noNative = argv.includes("--no-native");
  return { smoke, release, list, noNative };
}

function resolveScripts({ smoke, release, noNative }) {
  let scripts;
  if (smoke) {
    scripts = SMOKE_SCRIPTS;
  } else if (release) {
    scripts = RELEASE_SCRIPTS;
  } else {
    scripts = listFullScripts();
  }
  if (noNative) {
    scripts = scripts.filter((name) => !NATIVE_TAIL_SCRIPTS.includes(name));
  }
  return scripts;
}

function isCiVerbose() {
  return process.env.CI === "true" || process.env.QA_VERBOSE === "1";
}

/** Per-script ceiling in CI so one stuck Playwright run cannot burn the whole job. */
const HEAVY_SCRIPT_TIMEOUT_MS = {
  "smoke-browser.mjs": 6 * 60 * 1000,
  "smoke-11-13.mjs": 4 * 60 * 1000,
  "pin-swipe-notify.mjs": 4 * 60 * 1000,
  "leave-by-preferred-gate.mjs": 3 * 60 * 1000,
};

function getScriptTimeoutMs(scriptName) {
  const override = Number(process.env.QA_SCRIPT_TIMEOUT_MS);
  if (Number.isFinite(override) && override > 0) {
    return override;
  }
  if (process.env.CI !== "true") {
    return 0;
  }
  return HEAVY_SCRIPT_TIMEOUT_MS[scriptName] ?? 3 * 60 * 1000;
}

function killScriptChild(child) {
  if (!child || child.killed) {
    return;
  }
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, "SIGKILL");
      return;
    } catch {
      // Fall through to direct child kill.
    }
  }
  child.kill("SIGKILL");
}

function runScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  const timeoutMs = getScriptTimeoutMs(scriptName);
  const verbose = isCiVerbose();

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn("node", [scriptPath], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      detached: process.platform !== "win32",
    });

    let output = "";
    let timedOut = false;

    const append = (chunk) => {
      output += chunk;
      if (verbose) {
        process.stderr.write(`[${scriptName}] ${chunk}`);
      }
    };

    child.stdout?.on("data", append);
    child.stderr?.on("data", append);

    let heartbeat = null;
    if (verbose && timeoutMs > 0) {
      heartbeat = setInterval(() => {
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        const limitSec = Math.round(timeoutMs / 1000);
        console.error(`[qa] ${scriptName} still running (${elapsedSec}s / ${limitSec}s)`);
      }, 30_000);
    }

    let timer = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        killScriptChild(child);
      }, timeoutMs);
    }

    child.on("close", (code, signal) => {
      if (timer) {
        clearTimeout(timer);
      }
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      resolve({
        scriptName,
        code: timedOut ? 124 : (code ?? 1),
        output,
        timedOut,
        signal,
        elapsedMs: Date.now() - startedAt,
        timeoutMs,
      });
    });
  });
}

function classifyResult(scriptName, code, { timedOut = false, timeoutMs = 0 } = {}) {
  if (timedOut) {
    const limitSec = Math.round(timeoutMs / 1000);
    return { status: "FAIL", note: `timeout after ${limitSec}s` };
  }

  if (EXIT_INVERT_PASS.has(scriptName)) {
    if (code === 1) {
      return { status: "PASS*", note: "exit 1 = expected good" };
    }
    if (code === 0) {
      return { status: "FAIL", note: "exit 0 = repro or unexpected pass" };
    }
  }

  if (code === 0) {
    return { status: "PASS", note: "" };
  }
  return { status: "FAIL", note: `exit ${code}` };
}

function tailOutput(text, maxLines = 8) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length <= maxLines) {
    return lines.join("\n");
  }
  return lines.slice(-maxLines).join("\n");
}

async function main() {
  const { smoke, release, list, noNative } = parseArgs(process.argv.slice(2));
  const scripts = resolveScripts({ smoke, release, noNative });

  if (list) {
    const label = smoke
      ? "Smoke scripts:"
      : release
        ? "Release scripts:"
        : noNative
          ? "Full scripts (no native tail):"
          : "Full scripts:";
    console.log(label);
    for (const name of scripts) {
      const invert = EXIT_INVERT_PASS.has(name) ? " (PASS* on exit 1)" : "";
      console.log(`  ${name}${invert}`);
    }
    return;
  }

  const needsServer = scripts.some((name) => name !== "stickiness-coaches-logic.mjs");
  let serverChild = null;

  if (needsServer) {
    serverChild = await ensureDevServer({ force: process.env.CI === "true" });
    if (serverChild) {
      console.log("Started dev-server.js on http://localhost:3000\n");
    } else {
      console.log("Using existing server on http://localhost:3000\n");
    }
  }

  if (isCiVerbose()) {
    console.log(
      `[qa] suite=${smoke ? "smoke" : release ? "release" : noNative ? "full-no-native" : "full"} scripts=${scripts.length} ci=true\n`
    );
  }

  const results = [];
  const started = Date.now();

  for (const scriptName of scripts) {
    const limitSec = getScriptTimeoutMs(scriptName);
    const limitLabel = limitSec > 0 ? ` (limit ${Math.round(limitSec / 1000)}s)` : "";
    process.stdout.write(`→ ${scriptName}${limitLabel} … `);
    const { code, output, timedOut, timeoutMs, elapsedMs } = await runScript(scriptName);
    const { status, note } = classifyResult(scriptName, code, { timedOut, timeoutMs });
    const elapsedSec = Math.round(elapsedMs / 1000);
    results.push({ scriptName, status, code, note, elapsedSec });
    console.log(`${status}${note ? ` (${note})` : ""} · ${elapsedSec}s`);
    if (status === "FAIL" && output.trim()) {
      console.log(tailOutput(output, timedOut ? 20 : 8));
      console.log("");
    }
  }

  if (serverChild) {
    stopDevServer(serverChild);
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const passStar = results.filter((r) => r.status === "PASS*").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const elapsedSec = Math.round((Date.now() - started) / 1000);

  console.log("\n--- Summary ---");
  const suiteLabel = smoke
    ? "smoke"
    : release
      ? "release"
      : noNative
        ? "full (no native)"
        : "full";
  console.log(
    `Suite: ${suiteLabel} · ${pass} PASS · ${passStar} PASS* · ${fail} FAIL · ${elapsedSec}s`
  );
  console.log("");

  for (const row of results) {
    const pad = row.scriptName.padEnd(36);
    console.log(`${pad} ${row.status}${row.note ? `  ${row.note}` : ""}`);
  }

  if (fail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
