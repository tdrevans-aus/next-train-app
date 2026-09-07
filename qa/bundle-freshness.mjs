/**
 * Bundle-freshness gate — docs/jim-brief-london-overground-empty-direction.md, BLOCKER section
 * (Mark's QA on PR #343).
 *
 * `public/*-bundle.js` files are committed, built artefacts of `web-sources/*.mjs` entrypoints
 * (see the `build:*` scripts in package.json). `public/index.html` loads them directly and
 * `cap:sync` ships them into the Android/iOS apps — nothing else that runs a `lib/`-only QA gate
 * would ever notice if a committed bundle drifted from its source (rebuilt from a stale tree,
 * or edited by hand, or just never rebuilt after a `lib/` change it depends on).
 *
 * That happened for real: PR #343's `public/train-times-bundle.js` was rebuilt from a
 * pre-revert working tree and then never rebuilt again after the real fix landed in `lib/`, so
 * the committed bundle shipped the rejected change and omitted the real one, while every
 * `lib/`-only gate stayed green.
 *
 * This gate rebuilds each bundle in-process with the exact esbuild options its `build:*` npm
 * script uses, into a temp file, and byte-compares the result against the committed file. esbuild
 * is deterministic for these inputs (no timestamps/hashes/absolute paths land in the output —
 * verified by hand: two consecutive builds of the same entrypoint are byte-identical), so an
 * honest mismatch means the committed file is stale.
 *
 * One genuine source of non-determinism was found and is handled explicitly: esbuild embeds each
 * bundled `node_modules` module's path as a source comment (`// node_modules/foo/bar.js`) and as
 * an internal module-registry key, and that path is *relative to the esbuild process's cwd*. This
 * repo runs the QA suite from git worktrees at varying depths under `.claude/worktrees/<agent>/`
 * as well as from the main checkout, so the same bundle rebuilt from two different worktrees can
 * legitimately differ only in how many `../` segments prefix `node_modules/...` — e.g.
 * `node_modules/@capacitor-community/admob/...` vs `../../../node_modules/@capacitor-community/
 * admob/...`. Both are correct builds of the same source; only the depth of the invoking directory
 * differs. `normalizeForComparison` below collapses any run of `(../)+node_modules` down to a
 * bare `node_modules` (and normalizes `\` to `/`) before comparing, which was verified by hand to
 * make an ads-bundle rebuild from a nested worktree match the one committed from the main
 * checkout. This does not weaken the check for the defect this gate exists to catch — a bundle
 * that is stale relative to its `lib/`-sourced logic (the London Overground incident) differs in
 * the actual code, not just in comment path depth, so it still fails after normalization.
 *
 * If normalized byte comparison ever proves unstable for some other reason (e.g. a genuinely
 * non-deterministic esbuild output in a future version), fall back to a weaker identifier check:
 * assert that no committed bundle contains an identifier that no longer exists anywhere in `lib/`
 * (this would have caught `UPCOMING_BOARDING_GRACE_MS` shipping in the stale bundle) and that
 * every identifier the entrypoint's `lib/` dependencies export still appears in the bundle. That
 * check is strictly weaker — it would not catch every possible drift, only drift that changes
 * which identifiers are present — so prefer the normalized byte comparison while it holds.
 *
 * Offline pure-Node gate — no dev server, no network. Usage: node qa/bundle-freshness.mjs
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import esbuild from "esbuild";

// Collapses worktree-depth-dependent `(../)*node_modules` path comments/keys down to a canonical
// form, and normalizes path separators, so two correct builds of the same source from different
// working-directory depths compare equal. See the module doc comment above for why this is safe.
function normalizeForComparison(source) {
  return source.replace(/(?:\.\.[\\/])+node_modules/g, "node_modules").replace(/\\/g, "/");
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

// Mirrors the `build:*` scripts in package.json exactly. Add a new entry here whenever a new
// `build:*` esbuild script is added, or this gate silently stops covering it.
const BUNDLES = [
  {
    name: "build:ads",
    entry: "web-sources/ads-native.mjs",
    outfile: "public/ads-bundle.js",
    globalName: "NextTrainAdsNative",
    external: ["@capacitor/core"],
  },
  {
    name: "build:ad-free",
    entry: "web-sources/ad-free-native.mjs",
    outfile: "public/ad-free-bundle.js",
    globalName: "NextTrainAdFreeNative",
    external: ["@capacitor/core"],
  },
  {
    name: "build:train-times",
    entry: "web-sources/train-times-client.mjs",
    outfile: "public/train-times-bundle.js",
    globalName: "NextTrainTimes",
    external: [],
  },
  {
    name: "build:geo",
    entry: "web-sources/geo-native.mjs",
    outfile: "public/geo-bundle.js",
    globalName: "NextTrainGeo",
    external: ["@capacitor/core"],
  },
  {
    name: "build:analytics",
    entry: "web-sources/analytics-native.mjs",
    outfile: "public/analytics-bundle.js",
    globalName: "NextTrainAnalyticsNative",
    external: ["@capacitor/core"],
  },
];

const tmpDir = mkdtempSync(join(tmpdir(), "bundle-freshness-"));

try {
  for (const bundle of BUNDLES) {
    const entryPath = join(ROOT, bundle.entry);
    const committedPath = join(ROOT, bundle.outfile);

    if (!existsSync(entryPath)) {
      fail(`${bundle.name}: entrypoint ${bundle.entry} does not exist`);
      continue;
    }
    if (!existsSync(committedPath)) {
      fail(`${bundle.name}: committed bundle ${bundle.outfile} does not exist`);
      continue;
    }

    const freshOutfile = join(tmpDir, bundle.outfile.replace(/[\\/]/g, "__"));

    try {
      esbuild.buildSync({
        entryPoints: [entryPath],
        bundle: true,
        format: "iife",
        globalName: bundle.globalName,
        outfile: freshOutfile,
        platform: "browser",
        external: bundle.external,
        logLevel: "silent",
      });
    } catch (error) {
      fail(`${bundle.name}: rebuild failed — ${error.message}`);
      continue;
    }

    const committed = normalizeForComparison(readFileSync(committedPath, "utf8"));
    const fresh = normalizeForComparison(readFileSync(freshOutfile, "utf8"));

    if (committed !== fresh) {
      fail(
        `${bundle.outfile} does not match a fresh rebuild of ${bundle.entry}. ` +
          `Run "npm run ${bundle.name}" and commit the result. ` +
          `(committed ${committed.length} bytes vs fresh ${fresh.length} bytes)`
      );
    } else {
      console.log(`OK   ${bundle.outfile} matches a fresh rebuild of ${bundle.entry}`);
    }
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\nbundle-freshness: ${failures} failing`);
  process.exit(1);
}

console.log("\nbundle-freshness: ok");
