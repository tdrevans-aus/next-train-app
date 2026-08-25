/**
 * Remove dev-only files from Capacitor-copied web assets (D-05).
 * Cap sync does not delete stale paths when sources move out of public/.
 * Usage: node scripts/prune-ship-assets.mjs
 */
import fs from "fs";
import path from "path";

const roots = [
  "android/app/src/main/assets/public",
  "ios/App/App/public",
];

const prunePaths = ["design", "site-config.example.json", "lib/cities"];
const pruneGlobs = [".mjs", ".ts", ".map"];

function rmrf(target) {
  if (!fs.existsSync(target)) {
    return false;
  }
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

for (const root of roots) {
  if (!fs.existsSync(root)) {
    continue;
  }

  for (const rel of prunePaths) {
    const target = path.join(root, rel);
    if (rmrf(target)) {
      console.log(`pruned ${target}`);
    }
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }
    if (pruneGlobs.some((suffix) => entry.name.endsWith(suffix))) {
      const target = path.join(root, entry.name);
      fs.unlinkSync(target);
      console.log(`pruned ${target}`);
    }
  }
}
