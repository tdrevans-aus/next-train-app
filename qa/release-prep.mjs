/**
 * Play AAB release prep — cap:sync, then pre-upload gates, then smoke, then summary.
 *
 * Order matters (docs/jim-brief-release-prep-sync-before-gates.md): `pre-upload-check` and the
 * web smoke suite both read the *synced* Android assets in
 * `android/app/src/main/assets/public/`, and `cap:sync` is what produces those assets (it ends
 * with `scripts/prune-ship-assets.mjs`). So `cap:sync` must run first, or those gates validate
 * whatever the previous sync left on disk — including stale/leaked files a fresh sync would have
 * pruned — rather than what will actually ship.
 *
 * Usage: npm run release:prep
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/**
 * Ordered release-prep steps, in the order they must run: `cap:sync` first (it produces the
 * synced assets), then every step that reads those assets. Exported so
 * qa/release-prep-step-order-gate.mjs can assert on the real step list instead of regex-matching
 * this file's source.
 */
export const STEPS = [
  { label: "cap:sync", command: "npm", args: ["run", "cap:sync"] },
  { label: "pre-upload-check", command: "node", args: ["qa/pre-upload-check.mjs"] },
  { label: "web smoke suite", command: "node", args: ["qa/run-all.mjs", "--smoke"] },
];

/**
 * The smoke suite's own captured stdout is one line per script (plus a short tail for any
 * FAIL/KNOWN-RED) followed by a "--- Summary ---" block — already short. But across ~140
 * scripts that's still long to scroll on a failure; keep only the failing scripts' blocks plus
 * the summary so the one real FAIL isn't buried.
 */
function filterSmokeOutput(text) {
  const lines = text.split("\n");
  const summaryIdx = lines.findIndex((line) => line.startsWith("--- Summary ---"));
  const bodyLines = summaryIdx === -1 ? lines : lines.slice(0, summaryIdx);
  const summaryLines = summaryIdx === -1 ? [] : lines.slice(summaryIdx);

  const blocks = [];
  let current = null;
  for (const line of bodyLines) {
    if (/^→ /.test(line)) {
      if (current) blocks.push(current);
      current = /\s(FAIL|KNOWN-RED)\b/.test(line) ? [line] : null;
    } else if (current) {
      current.push(line);
    }
  }
  if (current) blocks.push(current);

  const filteredBody = blocks.map((block) => block.join("\n")).join("\n");
  return [filteredBody, summaryLines.join("\n")].filter((part) => part.trim()).join("\n\n");
}

function runStep(label, command, args, { filterOutput } = {}) {
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
  const stdout = filterOutput ? filterOutput(result.stdout ?? "") : result.stdout;
  if (stdout?.trim()) {
    console.log(stdout.trim());
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

function main() {
  console.log("Release prep — cap:sync, then pre-upload-check, then web smoke suite\n");

  for (const step of STEPS) {
    const filterOutput = step.label === "web smoke suite" ? filterSmokeOutput : undefined;
    runStep(step.label, step.command, step.args, { filterOutput });
  }

  const gradle = readBuildGradle();

  console.log(`
Next Train — release prep OK (assets synced first, then checked)
  versionName: ${gradle.versionName}
  versionCode: ${gradle.versionCode}
  applicationId: ${gradle.applicationId}
  AAB: android/app/build/outputs/bundle/release/app-release.aab
    (build with: cd android && ./gradlew :app:bundleRelease)
  Reminder: bump versionCode before upload; archive mapping.txt if minify on
`);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main();
}
