#!/usr/bin/env bash
# Pre-commit gate: for every Go package touched by staged changes that opts
# into strict coverage (marked by a ".coverage-required" file containing the
# required percentage), run scripts/coverage.sh against it.
#
# A package not marked with .coverage-required is untouched by this gate —
# see .spec/rfc/012-sync-module-compare-report.md §6 for which packages are
# expected to carry the marker and in what order.
#
# Written for bash 3.2 (macOS system default) — no mapfile, no associative
# arrays.
set -euo pipefail

cd "$(dirname "$0")/.."

changed_dirs="$(git diff --cached --name-only --diff-filter=ACM -- '*.go' \
  | sed -n 's#^backend/##p' \
  | xargs -n1 dirname 2>/dev/null \
  | sort -u || true)"

if [ -z "$changed_dirs" ]; then
  exit 0
fi

failed=0

for dir in $changed_dirs; do
  marker="$dir/.coverage-required"
  if [ ! -f "$marker" ]; then
    continue
  fi

  min="$(tr -d '[:space:]' < "$marker")"
  echo "Checking coverage gate for ./$dir (requires ${min}%)..."
  if ! bash scripts/coverage.sh "./$dir/..." "$min"; then
    failed=1
  fi
done

exit "$failed"
