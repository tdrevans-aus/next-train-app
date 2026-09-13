#!/usr/bin/env bash
# docs/jim-brief-qa-port-per-worktree.md, acceptance criterion 1.
#
# Proves two `node qa/run-all.mjs --smoke`-style runs started within seconds
# of each other, from two different checkouts, each get their own free port,
# each spawn their own dev-server.js, and each serve their own checkout's
# public/ — the exact failure mode from the 13 Sep 09:37-09:58 incident
# (six worktrees' smoke runs all landing on one shared :3000).
#
# "or equivalent" per the brief: rather than requiring an actual second git
# worktree (expensive to set up just to re-run this), this builds a throwaway
# second checkout ("worktree B") alongside the real one ("worktree A"),
# differs a marker in worktree B's public/index.html, starts both dev
# servers via the same helper the runner uses (qa/helpers/dev-server.mjs,
# called the same way run-all.mjs calls it: `ensureDevServer({isRunner:true})`),
# and asserts each BASE serves its own marker.
#
# Usage: bash qa/.parallel-smoke-proof.sh   (run from the repo root or qa/)
# Not registered in run-all.mjs; not part of any QA tier. Re-run any time to
# reproduce criterion 1.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLONE_DIR="$REPO_ROOT/.tmp-proof-worktree-b"
MARKER="QA-PROOF-WORKTREE-B-MARKER"

cleanup() {
  rm -rf "$CLONE_DIR"
  rm -f "$REPO_ROOT/.tmp-proof-a.json" "$REPO_ROOT/.tmp-proof-b.json"
}
trap cleanup EXIT

echo "[proof] building throwaway second checkout at $CLONE_DIR"
rm -rf "$CLONE_DIR"
mkdir -p "$CLONE_DIR"
cp -r "$REPO_ROOT/lib" "$CLONE_DIR/lib"
cp -r "$REPO_ROOT/public" "$CLONE_DIR/public"
cp -r "$REPO_ROOT/design" "$CLONE_DIR/design"
cp -r "$REPO_ROOT/api" "$CLONE_DIR/api"
cp "$REPO_ROOT/dev-server.js" "$CLONE_DIR/dev-server.js"
cp "$REPO_ROOT/package.json" "$CLONE_DIR/package.json"
mkdir -p "$CLONE_DIR/qa/helpers"
cp "$REPO_ROOT/qa/helpers/dev-server.mjs" "$CLONE_DIR/qa/helpers/dev-server.mjs"

# Differ a marker in worktree B's index.html so we can tell the two apart.
sed -i "s#<head>#<head>\n    <!-- ${MARKER} -->#" "$CLONE_DIR/public/index.html"
grep -q "$MARKER" "$CLONE_DIR/public/index.html" || {
  echo "[proof] FAIL: could not insert marker into clone's index.html" >&2
  exit 1
}
grep -q "$MARKER" "$REPO_ROOT/public/index.html" && {
  echo "[proof] FAIL: marker leaked into worktree A's index.html" >&2
  exit 1
}

start_run() {
  local root="$1" label="$2" outfile="$3"
  node --input-type=module -e "
    import { pathToFileURL } from 'url';
    import fs from 'fs';
    const [, root, label, outfile, marker] = process.argv;
    const helperUrl = pathToFileURL(root + '/qa/helpers/dev-server.mjs').href;
    // Property access on the namespace object (not destructuring) so BASE
    // reflects the live binding ensureDevServer mutates, the same way a
    // static \`import { BASE } from ...\` in a real qa script does.
    const mod = await import(helperUrl);
    const child = await mod.ensureDevServer({ isRunner: true });
    const res = await fetch(mod.BASE + '/');
    const html = await res.text();
    fs.writeFileSync(outfile, JSON.stringify({ label, base: mod.BASE, hasMarker: html.includes(marker) }));
    // Keep this process alive briefly so both runs overlap in time, then stop.
    await new Promise((r) => setTimeout(r, 1500));
    mod.stopDevServer(child);
  " "$root" "$label" "$outfile" "$MARKER"
}

echo "[proof] starting worktree A and worktree B runs within the same second, in parallel"
start_run "$REPO_ROOT" "A" "$REPO_ROOT/.tmp-proof-a.json" &
PID_A=$!
start_run "$CLONE_DIR" "B" "$REPO_ROOT/.tmp-proof-b.json" &
PID_B=$!
wait "$PID_A" "$PID_B"

A_JSON="$(cat "$REPO_ROOT/.tmp-proof-a.json")"
B_JSON="$(cat "$REPO_ROOT/.tmp-proof-b.json")"
echo "[proof] worktree A: $A_JSON"
echo "[proof] worktree B: $B_JSON"

A_BASE="$(node -e "console.log(JSON.parse(process.argv[1]).base)" "$A_JSON")"
B_BASE="$(node -e "console.log(JSON.parse(process.argv[1]).base)" "$B_JSON")"
A_MARKER="$(node -e "console.log(JSON.parse(process.argv[1]).hasMarker)" "$A_JSON")"
B_MARKER="$(node -e "console.log(JSON.parse(process.argv[1]).hasMarker)" "$B_JSON")"

FAIL=0
if [ "$A_BASE" = "$B_BASE" ]; then
  echo "[proof] FAIL: both runs picked the same base ($A_BASE)" >&2
  FAIL=1
fi
if [ "$A_MARKER" != "false" ]; then
  echo "[proof] FAIL: worktree A's server served worktree B's marker" >&2
  FAIL=1
fi
if [ "$B_MARKER" != "true" ]; then
  echo "[proof] FAIL: worktree B's server did not serve its own marker" >&2
  FAIL=1
fi

if [ "$FAIL" = "0" ]; then
  echo "[proof] PASS: distinct ports ($A_BASE vs $B_BASE), each serving its own checkout's public/"
else
  exit 1
fi
