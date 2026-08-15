#!/usr/bin/env node
/**
 * One-shot Mac setup for Next Train iOS builds.
 * Usage: npm run setup:mac
 *
 * Fixes the usual Vijay blockers:
 * - node/npm missing from PATH (nvm not loaded)
 * - Node too old for Capacitor 8 (needs 22+)
 * - Xcode SPM errors from opening before npm install + cap sync
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const REQUIRED_NODE_MAJOR = 22;
const SPM_PLUGIN_PATHS = [
  "node_modules/@capacitor-community/admob",
  "node_modules/@capacitor/geolocation",
  "node_modules/@capgo/native-purchases",
  "node_modules/@sentry/capacitor",
];

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.warn(`! ${message}`);
}

function parseNodeMajor(version) {
  const match = String(version).match(/^v?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed (exit ${result.status ?? "unknown"})`);
  }
}

function checkNode() {
  const major = parseNodeMajor(process.version);
  if (major < REQUIRED_NODE_MAJOR) {
    fail(
      `Node ${process.version} is too old. Capacitor 8 needs Node ${REQUIRED_NODE_MAJOR}+.\n` +
        "Run:\n" +
        "  export NVM_DIR=\"$HOME/.nvm\" && . \"$NVM_DIR/nvm.sh\"\n" +
        "  nvm install 22\n" +
        "  nvm use 22\n" +
        "Then retry from ~/Projects/next-train-app:\n" +
        "  npm run setup:mac",
    );
  }
  ok(`Node ${process.version}`);
}

function checkWorkingDirectory() {
  const pkgPath = path.join(ROOT, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fail("Run this from the next-train-app repo root (where package.json lives).");
  }
  ok(`Repo root: ${ROOT}`);
}

function npmInstall() {
  console.log("\nInstalling npm dependencies…");
  run("npm", ["install"]);
  ok("npm install completed");
}

function verifySpmPluginPaths() {
  const missing = SPM_PLUGIN_PATHS.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length) {
    fail(
      "npm install finished but Capacitor plugin folders are missing:\n" +
        missing.map((p) => `  - ${p}`).join("\n") +
        "\nIf npm install was interrupted, delete node_modules and rerun:\n" +
        "  rm -rf node_modules && npm run setup:mac",
    );
  }
  ok("CapApp-SPM plugin paths present in node_modules");
}

function capSyncIos() {
  console.log("\nSyncing web assets + Capacitor iOS project…");
  run("npm", ["run", "cap:sync:ios"]);
  ok("cap:sync:ios completed");
}

function printNextSteps() {
  console.log(`
Next steps:
  1. npx cap open ios
  2. In Xcode: App target → Signing → Team + bundle id com.tdrevans.nexttrain
  3. If Xcode still shows a red package error: File → Packages → Reset Package Caches,
     then File → Packages → Resolve Package Versions
  4. Pick a simulator or device → Run

If npm was "command not found" before this script, load nvm in every new terminal:
  export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use
(.nvmrc in this repo selects Node 22 automatically.)
`);
}

console.log("Next Train — Mac iOS setup\n");

checkWorkingDirectory();
checkNode();
npmInstall();
verifySpmPluginPaths();
capSyncIos();
printNextSteps();
