#!/usr/bin/env bash
# Decide which CI jobs a diff can possibly affect, so the flaky browser jobs only run on changes
# that touch what they test. Emits docs_only, run_web, run_pin, run_android to $GITHUB_OUTPUT.
#
# Fail-safe: no base to diff against, an empty diff, or a file no rule recognises -> run everything.
#
# What each job exercises (5 Sep 2026):
#   web-qa  (run-all --smoke)   browser smoke of public/ + every city gate via dev-server/api/lib.
#                               Skippable only for prose, native (android/ios), store/design assets,
#                               and workflow files.
#   pin-qa  (run-all --pin)     Perth-fixture journey/pin behaviour in the browser: public/*.js,
#                               api/, core lib/, lib/cities/perth + live-city-api.js, the pin QA
#                               scripts and helpers. Other cities' adapters, catalogs, direction
#                               JSON and gates cannot reach it.
#   android-unit                Kotlin widget tests after `cap sync` copies public/ in.
set -u
out="${GITHUB_OUTPUT:-/dev/null}"
emit() { echo "docs_only=$1 run_web=$2 run_pin=$3 run_android=$4"; printf 'docs_only=%s\nrun_web=%s\nrun_pin=%s\nrun_android=%s\n' "$1" "$2" "$3" "$4" >> "$out"; }

BASE=""
if [ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] && [ -n "${GITHUB_BASE_REF:-}" ]; then
  git fetch --no-tags --depth=1 origin "$GITHUB_BASE_REF" >/dev/null 2>&1 && BASE="origin/$GITHUB_BASE_REF"
elif [ "${GITHUB_EVENT_NAME:-}" = "push" ] && [ -n "${BEFORE_SHA:-}" ] && [ "$BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then
  git fetch --no-tags --depth=1 origin "$BEFORE_SHA" >/dev/null 2>&1 && BASE="$BEFORE_SHA"
fi
if [ -z "$BASE" ]; then echo "no base to diff against"; emit false true true true; exit 0; fi

FILES=$(git diff --name-only "$BASE" HEAD)
echo "$FILES"
if [ -z "$FILES" ]; then emit false true true true; exit 0; fi

docs_only=true; web=false; pin=false; android=false
while IFS= read -r f; do
  case "$f" in
    docs/*|*.md|.claude/*) continue ;;
  esac
  docs_only=false
  # --- web smoke: everything except native, assets and workflows ---
  case "$f" in
    android/*|ios/*|store-assets/*|design/*|.github/*|qa/run-android-unit.mjs|qa/maestro/*|patches/*) ;;
    *) web=true ;;
  esac
  # --- android unit ---
  case "$f" in
    android/*|public/*|web-sources/*|patches/*|capacitor.config.*|package.json|package-lock.json|qa/run-android-unit.mjs) android=true ;;
  esac
  # --- pin gates: known-irrelevant first, then known-relevant, else fail-safe ---
  case "$f" in
    android/*|ios/*|store-assets/*|design/*|.github/*|patches/*|scripts/*|config/*|qa/fixtures/*|qa/maestro/*) ;;
    lib/providers/*|lib/cities/uk/*|lib/cities/uk-*|public/city-directions/*|qa/run-android-unit.mjs) ;;
    lib/cities/perth/*) pin=true ;;
    lib/cities/live-city-api.js)
      # Jim's adapter PRs add a dispatch switch-case per city here. That cannot reach Perth-fixture
      # pin behaviour unless the changed lines mention perth; smoke still covers the file's syntax.
      if git diff -U0 "$BASE" HEAD -- "$f" | grep -E '^[+-][^+-]' | grep -qi perth; then pin=true; fi ;;
    lib/cities/*) ;;                                  # another city's adapter/catalog/dogfood module
    qa/*-gate.mjs|qa/*-line-map-conformance.mjs|qa/*-direction-match.mjs|qa/*-attribution.mjs|qa/uk-*.mjs|qa/*-mark-probes.mjs) ;;
    qa/run-all.mjs)
      # Registering a new city gate only adds `"<name>.mjs",` lines to the suite lists. Anything else
      # (runner logic, timeouts, the pin script list) is pin-relevant.
      if git diff -U0 "$BASE" HEAD -- "$f" | grep -E '^[+-][^+-]' | grep -vqE '^[+-][[:space:]]*"[a-z0-9-]+\.mjs",?[[:space:]]*$'; then pin=true; fi ;;
    qa/pin-*.mjs|qa/leave-by-preferred-gate.mjs|qa/helpers/*) pin=true ;;
    qa/*) ;;                                          # other single-purpose QA scripts
    public/*|api/*|lib/*|web-sources/*|dev-server.js|vercel.json|package.json|package-lock.json) pin=true ;;
    *) echo "unclassified for pin: $f -> run"; pin=true ;;
  esac
done <<< "$FILES"
emit "$docs_only" "$web" "$pin" "$android"
