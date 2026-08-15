/**
 * Run Android JVM unit tests (cross-platform gradlew wrapper).
 * Skips gracefully when Java/Gradle is not available (local dev without Android SDK).
 *
 * Usage:
 *   node qa/run-android-unit.mjs           # full suite
 *   node qa/run-android-unit.mjs --widget  # widget logic only (pre-release gate)
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.resolve(__dirname, "..", "android");
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const widgetOnly = process.argv.includes("--widget");

const javaProbe = spawnSync("java", ["-version"], {
  stdio: "ignore",
  shell: process.platform === "win32",
});

if (javaProbe.error || javaProbe.status !== 0) {
  console.log("SKIP — Android unit tests (Java not installed locally). CI runs these on ubuntu-latest.");
  process.exit(0);
}

const gradleArgs = [":app:testDebugUnitTest", "--no-daemon"];
if (widgetOnly) {
  gradleArgs.push("--tests", "com.tdrevans.nexttrain.WidgetUiBuilder*");
  gradleArgs.push("--tests", "com.tdrevans.nexttrain.CommuteScheduleTest");
}

const result = spawnSync(gradle, gradleArgs, {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
