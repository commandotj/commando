#!/usr/bin/env bash
# Build commando CLI for desktop embed + dev PATH fallback.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="${ROOT}/bin/commando"
EMBED="${ROOT}/apps/desktop/commando"

mkdir -p "${ROOT}/bin"
(cd "${ROOT}/backend" && go build -o "${BIN}" ./cmd/commando)
cp "${BIN}" "${EMBED}"
chmod +x "${EMBED}"
echo "commando CLI: ${BIN}"
