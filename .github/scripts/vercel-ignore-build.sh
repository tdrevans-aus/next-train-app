#!/usr/bin/env bash
# Vercel "Ignored Build Step" — reuses the same docs-only test as CI (see
# .github/scripts/docs-only.sh and CLAUDE.md's "no suite at all" tier) so
# docs/**, *.md, and .claude/** diffs don't burn a Hobby-plan build/deployment.
#
# Vercel convention: exit 0 = skip the build, exit 1 = proceed with the build.
# Any doubt -> proceed (exit 1), same "run everything" fallback as CI.
set -u

BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$BASE" ]; then
  echo "No previous commit to diff against — building."
  exit 1
fi

git fetch --no-tags --depth=50 origin "$BASE" >/dev/null 2>&1

FILES=$(git diff --name-only "$BASE" HEAD 2>/dev/null)
if [ -z "$FILES" ]; then
  echo "No file diff available — building."
  exit 1
fi

echo "$FILES"
for f in $FILES; do
  case "$f" in
    docs/*|*.md|.claude/*) ;;
    *)
      echo "Non-docs file changed ($f) — building."
      exit 1
      ;;
  esac
done

echo "Docs-only diff — skipping Vercel build."
exit 0
