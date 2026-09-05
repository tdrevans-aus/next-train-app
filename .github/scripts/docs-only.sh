#!/usr/bin/env bash
# Decide whether a CI run's diff is docs-only, so the heavy jobs can no-op.
# Mirrors CLAUDE.md's "no suite at all" tier: docs/**, any *.md, .claude/**.
# Any doubt (no base to diff against, fetch failure) -> not docs-only -> run everything.
set -u
BASE=""
if [ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] && [ -n "${GITHUB_BASE_REF:-}" ]; then
  git fetch --no-tags --depth=1 origin "$GITHUB_BASE_REF" >/dev/null 2>&1 && BASE="origin/$GITHUB_BASE_REF"
elif [ "${GITHUB_EVENT_NAME:-}" = "push" ] && [ -n "${BEFORE_SHA:-}" ] && [ "$BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then
  git fetch --no-tags --depth=1 origin "$BEFORE_SHA" >/dev/null 2>&1 && BASE="$BEFORE_SHA"
fi
if [ -z "$BASE" ]; then
  echo "docs_only=false (no base to diff against)"
  echo "docs_only=false" >> "${GITHUB_OUTPUT:-/dev/null}"
  exit 0
fi
FILES=$(git diff --name-only "$BASE" HEAD)
echo "$FILES"
if [ -z "$FILES" ]; then
  RESULT=false
else
  RESULT=true
  while IFS= read -r f; do
    case "$f" in
      docs/*|*.md|.claude/*) ;;
      *) RESULT=false; break ;;
    esac
  done <<< "$FILES"
fi
echo "docs_only=$RESULT"
echo "docs_only=$RESULT" >> "${GITHUB_OUTPUT:-/dev/null}"
