/**
 * Run web QA scripts with one command.
 *
 * Usage:
 *   node qa/run-all.mjs              # full suite
 *   node qa/run-all.mjs --smoke      # fast gate (~2–5 min)
 *   node qa/run-all.mjs --list       # list scripts in suite
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

const RUNNER_EXCLUDE = new Set(["run-all.mjs", "pre-upload-check.mjs"]);

function listFullScripts() {
  return fs
    .readdirSync(__dirname)
    .filter((name) => name.endsWith(".mjs") && !RUNNER_EXCLUDE.has(name))
    .sort();
}

function parseArgs(argv) {
  const smoke = argv.includes("--smoke");
  const list = argv.includes("--list");
  return { smoke, list };
}

function runScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  return new Promise((resolve) => {
    const child = spawn("node", [scriptPath], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      output += chunk;
    });

    child.on("close", (code) => {
      resolve({ scriptName, code: code ?? 1, output });
    });
  });
}

function classifyResult(scriptName, code) {
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
  const { smoke, list } = parseArgs(process.argv.slice(2));
  const scripts = smoke ? SMOKE_SCRIPTS : listFullScripts();

  if (list) {
    console.log(smoke ? "Smoke scripts:" : "Full scripts:");
    for (const name of scripts) {
      const invert = EXIT_INVERT_PASS.has(name) ? " (PASS* on exit 1)" : "";
      console.log(`  ${name}${invert}`);
    }
    return;
  }

  const needsServer = scripts.some((name) => name !== "stickiness-coaches-logic.mjs");
  let serverChild = null;

  if (needsServer) {
    serverChild = await ensureDevServer();
    if (serverChild) {
      console.log("Started dev-server.js on http://localhost:3000\n");
    } else {
      console.log("Using existing server on http://localhost:3000\n");
    }
  }

  const results = [];
  const started = Date.now();

  for (const scriptName of scripts) {
    process.stdout.write(`→ ${scriptName} … `);
    const { code, output } = await runScript(scriptName);
    const { status, note } = classifyResult(scriptName, code);
    results.push({ scriptName, status, code, note });
    console.log(status + (note ? ` (${note})` : ""));
    if (status === "FAIL" && output.trim()) {
      console.log(tailOutput(output));
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
  console.log(
    `Suite: ${smoke ? "smoke" : "full"} · ${pass} PASS · ${passStar} PASS* · ${fail} FAIL · ${elapsedSec}s`
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
