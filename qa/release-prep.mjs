/**
 * Play AAB release prep — pre-upload gates, smoke, cap:sync, summary.
 * Usage: npm run release:prep
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function runStep(label, command, args) {
  process.stdout.write(`→ ${label} … `);
  const useShell = process.platform === "win32" && (command === "npm" || command === "npx");
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: useShell,
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

function readBuildGradle() {
  const gradlePath = path.join(ROOT, "android/app/build.gradle");
  const text = fs.readFileSync(gradlePath, "utf8");
  const applicationId = text.match(/applicationId\s+"([^"]+)"/)?.[1];
  const versionCode = text.match(/versionCode\s+(\d+)/)?.[1];
  const versionName = text.match(/versionName\s+"([^"]+)"/)?.[1];
  return { applicationId, versionCode, versionName };
}

console.log("Release prep\n");

runStep("pre-upload-check", "node", ["qa/pre-upload-check.mjs"]);
runStep("web smoke suite", "node", ["qa/run-all.mjs", "--smoke"]);
runStep("cap:sync", "npm", ["run", "cap:sync"]);

const gradle = readBuildGradle();

console.log(`
Next Train — release prep OK
  versionName: ${gradle.versionName}
  versionCode: ${gradle.versionCode}
  applicationId: ${gradle.applicationId}
  AAB: android/app/build/outputs/bundle/release/app-release.aab
    (build with: cd android && ./gradlew :app:bundleRelease)
  Reminder: bump versionCode before upload; archive mapping.txt if minify on
`);
