/**
 * Confirms a built Android App Bundle (AAB) does not contain dev-only assets
 * (docs/jim-brief-gradle-copy-skips-prune.md, docs/jim-brief-gradle-prune-by-variant.md).
 * `android/app/build.gradle`'s `capacitorCopyWebAssets` task re-runs `npx cap copy android` as
 * a `preBuild` dependency on every Gradle build, including release ones, so the packaged assets
 * can pick up dev-only files (`dogfood-origin.json`, `design/`, `lib/cities`, etc.)
 * even after `npm run cap:sync`'s own prune (`scripts/prune-ship-assets.mjs`) already
 * ran and `qa/ship-assets-no-dogfood-origin.mjs` passed — the prune has to happen again
 * as part of the release build itself, which is what this gate protects.
 *
 * The release/debug decision is keyed off Gradle's actual task execution graph
 * (`gradle.taskGraph.whenReady`, checking for `:app:assembleRelease`/`:app:bundleRelease`/
 * `:app:packageRelease` in the graph), not off the literally requested task names — a bare
 * `gradlew :app:bundle`, `gradlew assemble` or `gradlew build` has no "release" substring in
 * what was typed but still executes a release packaging task as a dependency and must still be
 * pruned. The wiring check below fails if the old task-name substring match
 * (`gradle.startParameter.taskNames...contains('release')`) has come back, since that's exactly
 * the mechanism that missed `gradlew :app:bundle`/`assemble`/`build`.
 *
 * Reuses the exact prune list from scripts/prune-ship-assets.mjs (PRUNE_PATHS,
 * PRUNE_GLOB_SUFFIXES) rather than duplicating it, so the two can't drift.
 *
 * Two checks, both offline (never runs Gradle):
 *  1. android/app/build.gradle wiring check — asserts the release prune task exists, is wired
 *     into preBuild, is gated by the task-graph mechanism (not the old task-name substring
 *     match), so the fix can't be silently reverted/dropped/regressed later even when nobody
 *     has a fresh AAB on disk to catch the regression.
 *  2. AAB contents check — reads the AAB zip's central directory (via the vendored fflate) and
 *     fails on any prune-list path under base/assets/public/. Passes trivially with a clear
 *     message when no AAB is present (the normal case in CI, which builds no native artifacts).
 *
 * Usage:
 *   node qa/aab-no-dev-assets.mjs [path/to/app-release.aab]
 * Default search order when no path is given:
 *   android/app/build/outputs/bundle/release/app-release.aab
 *   android/app/release/app-release.aab
 *
 * To see check 1 fail: remove the `pruneShipAssets` task or its `dependsOn`/preBuild wiring
 * from android/app/build.gradle, or restore the old
 * `gradle.startParameter.taskNames.any { it...contains('release') }` task-name substring match
 * in place of the `gradle.taskGraph.whenReady` graph check.
 * To see check 2 fail: with public/dogfood-origin.json present, comment out the prune step in
 * capacitorCopyWebAssets/pruneShipAssets in android/app/build.gradle, run
 * `cd android && gradlew :app:bundleRelease`, then run this script against the resulting AAB.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { PRUNE_PATHS, PRUNE_GLOB_SUFFIXES } from "../scripts/prune-ship-assets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const DEFAULT_CANDIDATES = [
  "android/app/build/outputs/bundle/release/app-release.aab",
  "android/app/release/app-release.aab",
];

const ASSET_PREFIX = "base/assets/public/";

function resolveAabPath(argPath) {
  if (argPath) {
    return path.isAbsolute(argPath) ? argPath : path.join(REPO_ROOT, argPath);
  }
  for (const rel of DEFAULT_CANDIDATES) {
    const abs = path.join(REPO_ROOT, rel);
    if (fs.existsSync(abs)) {
      return abs;
    }
  }
  return null;
}

function listZipEntryNames(buffer) {
  const names = [];
  // filter always returns false so fflate never decompresses entry contents —
  // we only need the names from the central directory, which is fast even on a
  // multi-hundred-MB AAB.
  unzipSync(new Uint8Array(buffer), {
    filter(entry) {
      names.push(entry.name);
      return false;
    },
  });
  return names;
}

function isPruneListViolation(assetRelPath) {
  const normalized = assetRelPath.split(path.sep).join("/");
  if (PRUNE_PATHS.some((p) => normalized === p || normalized.startsWith(`${p}/`))) {
    return true;
  }
  if (PRUNE_GLOB_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return true;
  }
  return false;
}

/**
 * Offline wiring check: android/app/build.gradle must dependsOn a prune step (running
 * scripts/prune-ship-assets.mjs) from capacitorCopyWebAssets/preBuild, gated by Gradle's actual
 * task execution graph (`gradle.taskGraph.whenReady` looking for a release packaging task in
 * the graph) rather than a substring match on the requested task names, so the fix can't be
 * silently dropped or regressed back to the task-name mechanism by a future edit even when no
 * AAB has been built to catch it (docs/jim-brief-gradle-prune-by-variant.md).
 */
function checkGradleWiring() {
  const gradlePath = path.join(REPO_ROOT, "android/app/build.gradle");
  const text = fs.readFileSync(gradlePath, "utf8");

  const hasPruneTask = /prune-ship-assets\.mjs/.test(text);
  const pruneDependsOnCopy =
    /dependsOn\s+['"]capacitorCopyWebAssets['"]/.test(text) && hasPruneTask;
  const preBuildDependsOnPrune = /tasks\.matching[\s\S]*?dependsOn\s+['"]pruneShipAssets['"]/.test(
    text
  );
  const usesTaskGraphDetection = /gradle\.taskGraph\.whenReady/.test(text);
  const usesOldTaskNameSubstringMatch =
    /gradle\.startParameter\.taskNames[\s\S]{0,80}contains\(\s*['"]release['"]\s*\)/i.test(text);

  return {
    ok:
      hasPruneTask &&
      pruneDependsOnCopy &&
      preBuildDependsOnPrune &&
      usesTaskGraphDetection &&
      !usesOldTaskNameSubstringMatch,
    gradlePath,
    hasPruneTask,
    pruneDependsOnCopy,
    preBuildDependsOnPrune,
    usesTaskGraphDetection,
    usesOldTaskNameSubstringMatch,
  };
}

function run() {
  const wiring = checkGradleWiring();
  if (!wiring.ok) {
    console.error(
      `FAIL aab-no-dev-assets: ${path.relative(REPO_ROOT, wiring.gradlePath)} is missing the ` +
        `release prune wiring (a task running scripts/prune-ship-assets.mjs, depending on ` +
        `capacitorCopyWebAssets, wired into preBuild, gated by Gradle's actual task graph). ` +
        `Found: prune task=${wiring.hasPruneTask}, depends on copy=${wiring.pruneDependsOnCopy}, ` +
        `preBuild depends on prune=${wiring.preBuildDependsOnPrune}, uses task-graph detection=` +
        `${wiring.usesTaskGraphDetection}, reverted to old task-name substring match=` +
        `${wiring.usesOldTaskNameSubstringMatch}.`
    );
    process.exit(1);
  }
  console.log(
    `PASS aab-no-dev-assets: ${path.relative(REPO_ROOT, wiring.gradlePath)} wires the release prune into preBuild`
  );

  const argPath = process.argv[2];
  const aabPath = resolveAabPath(argPath);

  if (!aabPath) {
    console.log(
      "PASS aab-no-dev-assets: no AAB present (checked " +
        DEFAULT_CANDIDATES.join(", ") +
        ") — nothing to check. Build a release AAB and re-run to exercise this gate for real."
    );
    return;
  }

  const buffer = fs.readFileSync(aabPath);
  const names = listZipEntryNames(buffer);

  const violations = names
    .filter((name) => name.startsWith(ASSET_PREFIX))
    .map((name) => name.slice(ASSET_PREFIX.length))
    .filter((rel) => rel.length > 0 && isPruneListViolation(rel));

  if (violations.length > 0) {
    console.error(
      `FAIL aab-no-dev-assets: dev-only asset(s) found in ${path.relative(REPO_ROOT, aabPath)}:\n` +
        violations.map((v) => `  ${ASSET_PREFIX}${v}`).join("\n") +
        `\nGradle's capacitorCopyWebAssets task re-copies public/ on every build and must prune ` +
        `dev-only files for release variants — see android/app/build.gradle and ` +
        `scripts/prune-ship-assets.mjs.`
    );
    process.exit(1);
  }

  console.log(
    `PASS aab-no-dev-assets: checked ${path.relative(REPO_ROOT, aabPath)} (${names.length} entries), no dev-only assets under ${ASSET_PREFIX}`
  );
}

run();
