/**
 * Verify Mac/iOS test prerequisites for Next Train.
 * Usage: npm run test:ios:preflight
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function commandOutput(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: true,
  });
  return {
    ok: result.status === 0,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

function parseNodeMajor() {
  const match = process.version.match(/^v(\d+)/);
  return match ? Number(match[1]) : 0;
}

function check(label, pass, detail) {
  console.log(`${pass ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

let failed = 0;

console.log("Next Train iOS preflight\n");

if (!check("Repo package.json", fs.existsSync(path.join(ROOT, "package.json")))) failed += 1;

const nodeMajor = parseNodeMajor();
if (!check("Node 22+", nodeMajor >= 22, process.version)) {
  failed += 1;
  console.log("  Fix: nvm install 22 && nvm use");
}

const npm = commandOutput("npm", ["--version"]);
if (!check("npm available", npm.ok, npm.stdout || npm.stderr)) failed += 1;

for (const rel of [
  "node_modules/@capacitor/ios",
  "node_modules/@capacitor-community/admob",
  "node_modules/@capgo/native-purchases",
  "ios/App/CapApp-SPM/Package.swift",
  "ios/App/NextTrainProducts.storekit",
  "public/site-config.json",
]) {
  if (!check(rel, fs.existsSync(path.join(ROOT, rel)))) failed += 1;
}

const xcode = commandOutput("xcodebuild", ["-version"]);
const onMac = process.platform === "darwin";
if (onMac) {
  if (!check("Xcode CLI", xcode.ok, xcode.stdout.split("\n")[0] || xcode.stderr)) failed += 1;
} else {
  check("Xcode CLI (skipped off macOS)", true, process.platform);
}

const sim = commandOutput("xcrun", ["simctl", "list", "devices", "booted"]);
const booted = sim.stdout.split("\n").some((line) => line.includes("(Booted)"));
check("Booted simulator (optional)", booted, booted ? "yes" : "none — start one in Xcode if running Maestro");

const siteConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, "public/site-config.json"), "utf8")
);
if (
  !check(
    "IAP product id",
    siteConfig.adFreeProductId === "com.tdrevans.nexttrain.adfree",
    siteConfig.adFreeProductId
  )
) {
  failed += 1;
}
if (!check("IAP list price", siteConfig.adFreeListPrice === "A$7.99", siteConfig.adFreeListPrice)) {
  failed += 1;
}

const pbxproj = fs.readFileSync(
  path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj"),
  "utf8"
);
if (!check("In-App Purchase capability", pbxproj.includes("com.apple.InAppPurchase"))) failed += 1;

const schemePath = path.join(
  ROOT,
  "ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme"
);
const scheme = fs.existsSync(schemePath) ? fs.readFileSync(schemePath, "utf8") : "";
check(
  "StoreKit scheme config (optional)",
  scheme.includes("NextTrainProducts.storekit"),
  scheme.includes("NextTrainProducts.storekit") ? "linked" : "missing — local IAP sim may need manual scheme"
);


console.log(failed ? `\n${failed} required check(s) failed.` : "\nPreflight OK.");
process.exit(failed ? 1 : 0);
