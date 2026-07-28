# AGENTS.md

Guide for AI agents working on **Commando** — folder sync tool (FreeFileSync-style).

## Product

- **What:** dual-pane folder sync between two local paths
- **Stack:** Go backend + Wails 3 desktop + React UI (pnpm monorepo)
- **CLI-first:** `commando` CLI and desktop share the same Go core

## Monorepo layout

```text
commando-react/
├── backend/                 Go module (NOT named "go/")
│   ├── go.mod               module github.com/systembug/commando
│   ├── cmd/commando/        CLI entry
│   └── internal/            sync, copy, file, drive, worker, fsutil
├── apps/desktop/            Wails app (thin Go adapter + Vite frontend)
├── packages/ui/             @commando/ui — React UI
├── packages/shared/         @commando/shared — TS types/constants (npm only)
├── legacy/electron/         archived Electron code — do not extend
├── go.work                  links backend + apps/desktop
├── Makefile                 Go tasks (called by pnpm)
└── bin/commando             CLI build output
```

## Go conventions (Rust analogy)

| Go                    | Rust equivalent     |
| --------------------- | ------------------- |
| **module** (`go.mod`) | **crate**           |
| **package** (folder)  | **mod**             |
| **go.work**           | **Cargo workspace** |

- Module path: `github.com/systembug/commando` — never import as `go/...` or `backend/...`
- Private code: `backend/internal/*`
- Binaries: `backend/cmd/<name>/`
- Heavy work: `backend/internal/worker` — never block Wails binding thread

## npm conventions

- `packages/` = **npm only** — no Go, no `package.json` in `backend/`
- Go commands: root `pnpm` → `Makefile` → `go`

## Commands

```bash
pnpm install
pnpm setup:desktop          # → scripts/ensure-desktop-tools.sh (wails3 via go install)
pnpm cli:install          # → make cli-install
pnpm cli                  # → make cli
pnpm test:go              # → make test-go
pnpm dev                  # Wails desktop (http://127.0.0.1:5189)
```

### Desktop tooling (`wails3`)

`wails3` is **not an npm package**. It is installed with:

```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0-alpha2.119
```

The binary lands in `$(go env GOPATH)/bin/wails3`. pnpm/turbo shells often omit
`GOPATH/bin` from `PATH`, so bare `wails3` fails with `command not found` even
when the binary exists.

**Always invoke via** `scripts/wails3.sh` (or `pnpm setup:desktop` first).
The wrapper adds `GOPATH/bin` to `PATH`, auto-installs if missing, and is used by
`apps/desktop/package.json`, `build/config.yml`, and `Makefile`.

Go tasks live in `Makefile`. pnpm is the entry point; make runs the Go toolchain.

## Where to change things

| Task                     | Location                                                           |
| ------------------------ | ------------------------------------------------------------------ |
| Sync engine / strategies | `backend/internal/sync/`                                           |
| CLI commands             | `backend/cmd/commando/commands/`                                   |
| Wails IPC adapters       | `apps/desktop/services/`                                           |
| React UI                 | `packages/ui/src/`                                                 |
| Shared TS types          | `packages/shared/types/`                                           |
| Wails TS bindings        | `apps/desktop/frontend/bindings/` (regenerate after Go API change) |

## Regenerate Wails bindings

```bash
../../scripts/wails3.sh generate bindings -ts -clean=true
```

(Run from `apps/desktop`, or `pnpm generate` from repo root.)

## Do not

- Add Go under `packages/`
- Add `package.json` under `backend/`
- Rename `backend/` back to `go/`
- Add new code under `legacy/electron/`
- Block Wails service methods with long sync/copy — use `worker.Runner` + events
- Commit secrets or run destructive git commands without user request

## Module replace (local dev)

```go
// apps/desktop/go.mod
replace github.com/systembug/commando => ../../backend
```

## Quality gates

```bash
pnpm test:go
pnpm --filter @commando/ui test
go build ./apps/desktop
```
