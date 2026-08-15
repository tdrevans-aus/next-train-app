/**
 * Patch ship gate — reminders / hotfix uploads only (not full pre-release).
 *
 * Usage:
 *   npm run test:patch-ship
 *   node qa/patch-ship-gate.mjs
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SYNTAX_FILES = [
  "public/leave-reminders.js",
  "public/journey-detail.js",
  "public/template-wizard.js",
];

function runStep(label, command, args) {
  process.stdout.write(`→ ${label} … `);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
  });
  const code = result.status ?? 1;
  if (code === 0) {
    console.log("PASS");
    return;
  }
  console.log(`FAIL (exit ${code})`);
  if (result.stdout?.trim()) {
    console.log(result.stdout.trim());
  }
  if (result.stderr?.trim()) {
    console.log(result.stderr.trim());
  }
  process.exit(code);
}

function checkSyntax(file) {
  process.stdout.write(`→ syntax ${file} … `);
  const result = spawnSync("node", ["--check", file], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    console.log("FAIL");
    process.stderr?.write(result.stderr ?? "");
    process.exit(1);
  }
  console.log("PASS");
}

async function main() {
  console.log("Patch ship gate (2.2.x hotfix)\n");

  for (const file of SYNTAX_FILES) {
    checkSyntax(file);
  }

  runStep("pre-upload-check", "node", ["qa/pre-upload-check.mjs"]);

  await ensureDevServer();
  try {
    runStep("reminders permission gate", "node", ["qa/reminders-permission-gate.mjs"]);
  } finally {
    await stopDevServer();
  }

  console.log("\nPatch ship gate passed.");
  console.log("Next: npm run cap:sync → signed AAB → Mark device checklist (TESTING.md § Patch ship gate).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
