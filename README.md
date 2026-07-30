# Commando

Folder sync tool (FreeFileSync-style). **CLI-first Go core**, Wails desktop UI, pnpm monorepo.

## Workspace layout

```text
backend/               Go module github.com/commandotj/commando (no package.json)
apps/desktop/          Wails 3 shell (@commando/desktop)
packages/ui/           @commando/ui
packages/shared/       @commando/shared
legacy/electron/       archived Electron app
```

**Rule:** `packages/` = npm only. Go lives in `backend/`; root `pnpm` scripts call `Makefile`.

## Quick start

```bash
pnpm install
pnpm setup:desktop      # installs wails3 CLI if missing (Go tool, not npm)
pnpm cli:install
commando sync plan --left /a --right /b --direction both
pnpm dev
```

## CLI

```bash
commando ls [path]
commando drives
commando copy <src...> --dest <dir>
commando sync plan --left <path> --right <path> [--direction l2r|r2l|both]
commando sync run  --left <path> --right <path> [--dry-run]
```

## Development (pnpm → make for Go)

```bash
pnpm dev              # Wails + Vite http://127.0.0.1:5189 (see ws/prj/port.md)
pnpm setup:desktop    # ensure wails3 CLI is installed (Go, not npm)
pnpm test             # UI tests (turbo)
pnpm test:go          # make test-go
pnpm cli              # make cli → ./bin/commando
pnpm cli:install      # make cli-install
pnpm desktop:build    # make desktop
pnpm desktop:package  # build apps/desktop/bin/Commando.app
pnpm desktop:install  # install production app to /Applications/Commando.app
```

`go.work` links `./backend` and `./apps/desktop`.
