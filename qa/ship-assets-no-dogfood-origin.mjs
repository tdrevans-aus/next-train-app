/**
 * D-06 (docs/dwayne-security-review-play-3.0.0.md): `public/dogfood-origin.json` is gitignored
 * but present on dev machines for LAN dogfooding, so `npx cap sync`/`cap copy` bundles it into
 * the release web assets, disclosing an internal LAN origin in shipped AABs/IPAs.
 * `scripts/prune-ship-assets.mjs` (run at the end of the `cap:sync`/`cap:sync:ios` npm scripts)
 * must delete it from the synced assets dir. This gate is offline: it doesn't run `cap sync`
 * itself (no Android/iOS toolchain assumed), it only checks whatever synced assets dirs already
 * exist on disk — safe to run in CI where neither exists (passes trivially) and useful locally
 * right after a real `npm run cap:sync`.
 *
 * To see this gate fail: comment out the "dogfood-origin.json" entry in
 * scripts/prune-ship-assets.mjs's `prunePaths`, run `npm run cap:sync`, then this gate.
 *
 * Usage: node qa/ship-assets-no-dogfood-origin.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const SYNCED_ASSET_ROOTS = [
  "android/app/src/main/assets/public",
  "ios/App/App/public",
];

function run() {
  const violations = [];
  let checked = 0;

  for (const rel of SYNCED_ASSET_ROOTS) {
    const root = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(root)) {
      continue;
    }
    checked += 1;
    const target = path.join(root, "dogfood-origin.json");
    if (fs.existsSync(target)) {
      violations.push(path.relative(REPO_ROOT, target));
    }
  }

  if (violations.length > 0) {
    console.error(
      `FAIL ship-assets-no-dogfood-origin: dogfood-origin.json found in synced release assets:\n` +
        violations.map((v) => `  ${v}`).join("\n") +
        `\nThis leaks an internal LAN origin into shipped builds. Run scripts/prune-ship-assets.mjs` +
        ` (already wired into npm run cap:sync / cap:sync:ios).`
    );
    process.exit(1);
  }

  console.log(
    checked === 0
      ? "PASS ship-assets-no-dogfood-origin: no synced assets dir present (nothing to check — run after `npm run cap:sync` for a real check)"
      : `PASS ship-assets-no-dogfood-origin: checked ${checked} synced assets dir(s), no dogfood-origin.json present`
  );
}

run();
