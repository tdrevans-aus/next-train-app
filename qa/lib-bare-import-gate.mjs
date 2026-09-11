/**
 * Offline guard against the recurring "bare npm import breaks in Vercel's
 * deployed bundle" defect class (docs/jim-brief-gtfs-refresh-cron-crash.md,
 * 11 Sep 2026). Confirmed on a real Vercel preview deployment (not just
 * locally — locally Node always resolves from the repo-root node_modules
 * regardless, which is exactly why this class of bug ships green): a file
 * that is NOT physically under api/ but is reachable (via relative imports,
 * static or dynamic) from an api/*.js entry point throws
 * ERR_MODULE_NOT_FOUND at runtime if it has a bare (npm package) import
 * specifier. `fflate` (August 2026) and `@vercel/blob` (this incident) are
 * two instances; this gate exists so a third doesn't ship silently.
 *
 * What it does (no network, no execution — pure static text scan):
 *  1. Starting from every api/*.js file, follow relative import specifiers
 *     ("./x", "../x", static or `import(...)`) to build the set of files
 *     actually reachable from a deployed function.
 *  2. For every reachable file NOT under api/, collect its own import
 *     specifiers and flag any that are neither relative nor a Node.js
 *     built-in module (optionally "node:"-prefixed) — i.e. a bare npm
 *     package import.
 *  3. Fail with the offending file:specifier pairs if any are found.
 *
 * The fix for a genuine finding is almost never "vendor it" (weigh the cost
 * — @vercel/blob alone pulls in six transitive deps) — usually the right
 * shape is: import the package in a file under api/ (which CAN resolve
 * bare npm imports) and pass what's needed down as a parameter, the way
 * lib/gtfs-refresh.js's `putImpl` and lib/providers/gtfs/snapshot-manifest.js's
 * `writeManifest({ putImpl })` do.
 *
 * Usage: node qa/lib-bare-import-gate.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Module from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(REPO_ROOT, "api");

const BUILTINS = new Set(Module.builtinModules);

// Matches: `from "spec"`, `import "spec"`, `import(...)"spec"...)` — string
// literal specifiers only (template literals / computed specifiers are not
// analyzable offline and are deliberately out of scope: none of this
// codebase's actual api/lib imports use them).
const IMPORT_SPEC_RE = /\bfrom\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|^\s*import\s+["']([^"']+)["']/gm;

// Strip comments before scanning — JSDoc prose routinely mentions import
// specifiers as text (this file's own doc comments below do), and that must
// not be mistaken for a real import.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function specifiersIn(source) {
  const specs = [];
  let m;
  const code = stripComments(source);
  IMPORT_SPEC_RE.lastIndex = 0;
  while ((m = IMPORT_SPEC_RE.exec(code))) {
    specs.push(m[1] || m[2] || m[3]);
  }
  return specs;
}

function isRelative(spec) {
  return spec.startsWith("./") || spec.startsWith("../");
}

function isBuiltin(spec) {
  const bare = spec.startsWith("node:") ? spec.slice("node:".length) : spec;
  return BUILTINS.has(bare);
}

function resolveRelative(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.js`, `${base}.mjs`, path.join(base, "index.js"), path.join(base, "index.mjs")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null; // e.g. resolves inside node_modules via a relative-looking alias, or missing — not this gate's concern
}

function listApiEntries() {
  return fs
    .readdirSync(API_DIR)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(API_DIR, f));
}

function walkReachable(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(file, "utf8");
    for (const spec of specifiersIn(source)) {
      if (!isRelative(spec)) continue;
      const resolved = resolveRelative(file, spec);
      if (resolved && !seen.has(resolved)) {
        queue.push(resolved);
      }
    }
  }
  return seen;
}

function findViolations(reachableFiles) {
  const violations = [];
  for (const file of reachableFiles) {
    if (file.startsWith(API_DIR + path.sep)) continue; // api/ itself can resolve bare npm imports
    const source = fs.readFileSync(file, "utf8");
    for (const spec of specifiersIn(source)) {
      if (isRelative(spec) || isBuiltin(spec)) continue;
      violations.push({ file: path.relative(REPO_ROOT, file), spec });
    }
  }
  return violations;
}

function run() {
  const entries = listApiEntries();
  const reachable = walkReachable(entries);
  const violations = findViolations(reachable);

  if (violations.length > 0) {
    console.error(`FAIL lib-bare-import-gate: ${violations.length} bare npm import(s) reachable from api/*.js but not under api/:`);
    for (const v of violations) {
      console.error(`  ${v.file}: "${v.spec}"`);
    }
    console.error(
      "\nThese resolve fine locally (repo-root node_modules) but throw ERR_MODULE_NOT_FOUND in " +
        "Vercel's deployed bundle — see docs/jim-brief-gtfs-refresh-cron-crash.md. Either vendor " +
        "the package into lib/vendor/ (only for small, zero-dependency packages — weigh the cost, " +
        "e.g. @vercel/blob was NOT vendored for this reason), or import it from a file under api/ " +
        "and pass what's needed down as a parameter (see lib/gtfs-refresh.js's `putImpl`)."
    );
    process.exit(1);
  }

  console.log(`PASS lib-bare-import-gate: ${reachable.size} files reachable from api/*.js, no bare npm imports outside api/`);
}

run();
