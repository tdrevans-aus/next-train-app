/**
 * Offline guard against QA scripts hardcoding `http://localhost:3000` instead
 * of reading BASE from qa/helpers/dev-server.mjs.
 *
 * docs/jim-brief-qa-port-per-worktree.md (13 Sep 2026): a sweep found 67 of
 * qa/*.mjs's ~84 browser scripts hardcoding the literal port even though the
 * runner now picks a free port per invocation and exports it as QA_BASE —
 * those 67 would have kept hitting :3000 regardless, defeating the whole
 * fix. This gate exists so that regression cannot come back one script at a
 * time.
 *
 * What it does (no network, no dev server — pure static text scan):
 *   Fails if any *.mjs file directly under qa/, other than
 *   qa/helpers/dev-server.mjs itself, contains the literal string
 *   "localhost:3000" outside a comment.
 *
 * qa/helpers/dev-server.mjs is the one legitimate owner of that literal (the
 * documented fallback for a script run standalone against a hand-started
 * `node dev-server.js` on :3000, see its header comment).
 *
 * Usage: node qa/no-hardcoded-qa-port.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = __dirname;
const THIS_FILE = path.join(QA_DIR, "no-hardcoded-qa-port.mjs");
const OFFENDING_LITERAL = "localhost:3000";

// Strip comments before scanning, same approach as lib-bare-import-gate.mjs —
// doc comments (this file's own header above, run-all.mjs's usage notes)
// routinely reference the literal as prose, and that must not be mistaken
// for a script still hardcoding it.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function listTopLevelScripts() {
  return fs
    .readdirSync(QA_DIR)
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => path.join(QA_DIR, name))
    .filter((file) => file !== THIS_FILE);
}

function findViolations() {
  const violations = [];
  for (const file of listTopLevelScripts()) {
    const source = stripComments(fs.readFileSync(file, "utf8"));
    if (source.includes(OFFENDING_LITERAL)) {
      const lineNo = source.split("\n").findIndex((line) => line.includes(OFFENDING_LITERAL)) + 1;
      violations.push({ file: path.relative(path.resolve(QA_DIR, ".."), file), lineNo });
    }
  }
  return violations;
}

function run() {
  const violations = findViolations();

  if (violations.length > 0) {
    console.error(
      `FAIL no-hardcoded-qa-port: ${violations.length} qa script(s) hardcode "${OFFENDING_LITERAL}" instead of importing BASE from qa/helpers/dev-server.mjs:`
    );
    for (const v of violations) {
      console.error(`  ${v.file}:${v.lineNo}`);
    }
    console.error(
      "\nImport BASE (`import { BASE } from \"./helpers/dev-server.mjs\";`) and use `${BASE}/...` " +
        "instead of the literal — see docs/jim-brief-qa-port-per-worktree.md. Without this, the " +
        "script keeps hitting :3000 regardless of the free port the runner picked for this run, " +
        "and can silently test a different worktree's server."
    );
    process.exit(1);
  }

  console.log(
    `PASS no-hardcoded-qa-port: no qa script hardcodes "${OFFENDING_LITERAL}" outside qa/helpers/dev-server.mjs`
  );
}

run();
