#!/usr/bin/env bash
# Computes statement coverage for a Go package, excluding lines marked
# "// coverage:ignore" (documented-unreachable branches, e.g. TOCTOU races).
# See .spec/rfc/012-sync-module-compare-report.md §6 for the 100% gate policy.
#
# Usage: scripts/coverage.sh <package-path> [min-percent]
set -euo pipefail

pkg="${1:?usage: coverage.sh <package-path> [min-percent]}"
min="${2:-100.0}"

profile="$(mktemp)"
trap 'rm -f "$profile"' EXIT

go test "$pkg" -coverprofile="$profile" -covermode=atomic >/dev/null

pkg_dir="${pkg#./}"
pct=$(go run "$(dirname "$0")/covfilter/main.go" "$profile" "$pkg_dir")

echo "coverage (excluding coverage:ignore lines): ${pct}%"

awk -v pct="$pct" -v min="$min" 'BEGIN { exit !(pct + 0 >= min + 0) }' \
  || { echo "FAIL: ${pct}% < required ${min}%"; exit 1; }
