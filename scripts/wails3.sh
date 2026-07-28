#!/usr/bin/env bash
# Resolves and bootstraps the Wails v3 CLI for Commando desktop workflows.
#
# Why this exists:
# - wails3 is installed via `go install` into $(go env GOPATH)/bin
# - pnpm/turbo/Volta shells often do NOT include GOPATH/bin in PATH
# - Wails dev config and Taskfiles spawn nested `wails3` subprocesses
#
# Usage: scripts/wails3.sh <wails3-args...>
# Example: scripts/wails3.sh dev -config ./apps/desktop/build/config.yml

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VERSION_FILE="${SCRIPT_DIR}/tool-versions.env"

if [[ -f "${VERSION_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${VERSION_FILE}"
fi

WAILS3_VERSION="${WAILS3_VERSION:-v3.0.0-alpha2.119}"
WAILS3_MODULE="github.com/wailsapp/wails/v3/cmd/wails3@${WAILS3_VERSION}"

if ! command -v go >/dev/null 2>&1; then
  cat >&2 <<EOF
commando: Go is required but 'go' was not found in PATH.

Install Go 1.25+ and ensure 'go' is on PATH, then retry:
  pnpm setup:desktop
  pnpm dev
EOF
  exit 1
fi

GOPATH_BIN="$(go env GOPATH)/bin"
WAILS3="${GOPATH_BIN}/wails3"

install_wails3() {
  echo "commando: installing wails3 ${WAILS3_VERSION} → ${GOPATH_BIN}"
  if ! go install "${WAILS3_MODULE}"; then
    cat >&2 <<EOF
commando: failed to install wails3 ${WAILS3_VERSION}.

Try manually:
  go install ${WAILS3_MODULE}
  export PATH="\$(go env GOPATH)/bin:\$PATH"
EOF
    exit 1
  fi
}

if [[ ! -x "${WAILS3}" ]]; then
  install_wails3
fi

# Re-exec if GOPATH/bin is not first on PATH (nested wails3/task subprocess safety).
export PATH="${GOPATH_BIN}:${PATH}"
export COMMANDO_REPO_ROOT="${REPO_ROOT}"
export COMMANDO_WAILS3="${WAILS3}"

exec "${WAILS3}" "$@"
