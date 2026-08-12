/**
 * Run Android JVM unit tests (cross-platform gradlew wrapper).
 * Skips gracefully when Java/Gradle is not available (local dev without Android SDK).
 * Usage: node qa/run-android-unit.mjs
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.resolve(__dirname, "..", "android");
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

const javaProbe = spawnSync("java", ["-version"], {
  stdio: "ignore",
  shell: process.platform === "win32",
});

if (javaProbe.error || javaProbe.status !== 0) {
  console.log("SKIP — Android unit tests (Java not installed locally). CI runs these on ubuntu-latest.");
  process.exit(0);
}

const result = spawnSync(gradle, [":app:testDebugUnitTest", "--no-daemon"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
