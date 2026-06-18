#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
STAGED=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -z "$STAGED" ]; then
  exit 0
fi

# JS/TS/MD/CSS: prettier (workspace-aware)
JS_FILES=$(echo "$STAGED" | grep -E '\.(ts|tsx|js|mjs|cjs|md|css)$' || true)
if [ -n "$JS_FILES" ]; then
  echo "$JS_FILES" | xargs npx -y prettier --write --ignore-unknown
fi

# PHP: rector + pint
PHP_FILES=$(echo "$STAGED" | grep -E '\.php$' || true)
if [ -n "$PHP_FILES" ]; then
  echo "$PHP_FILES" | xargs "$ROOT/vendor/bin/rector" process
  echo "$PHP_FILES" | xargs "$ROOT/vendor/bin/pint"
fi

# Re-stage formatted files
echo "$STAGED" | xargs git add
