/**
 * FB-23 Phase 4 — native/widget route snapshot + commute-only reminders.
 * Usage: node qa/fb-23-phase-4-native.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.resolve(__dirname, "..", "android");
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

const javaProbe = spawnSync("java", ["-version"], {
  stdio: "ignore",
  shell: process.platform === "win32",
});

if (javaProbe.error || javaProbe.status !== 0) {
  console.log("SKIP — FB-23 phase 4 native (Java not installed locally). CI runs these on ubuntu-latest.");
  process.exit(0);
}

const result = spawnSync(
  gradle,
  [
    ":app:testDebugUnitTest",
    "--no-daemon",
    "--tests",
    "com.tdrevans.nexttrain.JourneySelectorTest",
    "--tests",
    "com.tdrevans.nexttrain.CommuteScheduleTest",
    "--tests",
    "com.tdrevans.nexttrain.NextCommutePreviewTest",
  ],
  {
    cwd: androidDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  }
);

if (result.status === 0) {
  console.log("PASS — FB-23 phase 4 native (Android unit)");
} else {
  console.error("FAIL — FB-23 phase 4 native (Android unit)");
  process.exitCode = result.status ?? 1;
}
