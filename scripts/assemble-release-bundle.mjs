/**
 * assembleReleaseBundle via Gradle wrapper (Windows or Unix).
 * Generates the .aab file for Play Store upload.
 */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const android = join(root, "android");
const isWin = process.platform === "win32";
const wrapper = join(android, isWin ? "gradlew.bat" : "gradlew");

if (!existsSync(wrapper)) {
  console.error("Missing Gradle wrapper");
  process.exit(1);
}

console.log("Building Android App Bundle (release)...");
const result = spawnSync(wrapper, [":app:bundleRelease"], {
  cwd: android,
  stdio: "inherit",
  shell: isWin,
});
process.exit(result.status ?? 1);
