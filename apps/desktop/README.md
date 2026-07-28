# Commando Desktop (Wails 3)

Thin Wails shell. Core logic in `backend/internal/*`; same code powers the `commando` CLI.

## Wails v3 layout (follow the template)

```text
apps/desktop/
  main.go                 application.New + Services + embed
  services/               Go services → backend/internal/*
  frontend/
    index.html            links /style.css (Wails drag chrome)
    public/style.css        --wails-draggable rules only
    public/wails/custom.js  optional hook (empty by default)
    bindings/               wails3 generate bindings (do not edit)
    src/
      main.tsx              mount React after bootstrap
      desktop.css           reset + shared + commando styles
      platform/bootstrap.ts wire bindings → window.fsApi
```

`@commando/ui` is platform-agnostic (uses `window.fsApi`). Wails-specific glue stays in `frontend/src/platform/`.

## Commands

```bash
pnpm setup:desktop   # ensure wails3 CLI (Go tool, not npm)
pnpm dev
pnpm test:go

cd apps/desktop && ../../scripts/wails3.sh dev
../../scripts/wails3.sh generate bindings -ts -clean=true
```

`pnpm dev` builds and launches `bin/Commando Dev.app`. Production stays separate:

```bash
pnpm desktop:package
pnpm desktop:install
```

These commands create `bin/Commando.app`; install copies only production bundle to `/Applications/Commando.app`.
