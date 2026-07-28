# Deprecated Electron (Node)

Archived Electron app. **Do not add new code here.**

## Layout

```text
legacy/electron/
  main/              former src/main
  preload/           former src/preload
  config/            electron-vite, builder, tsconfigs
  build-assets/      icons, entitlements (former build/)
  resources/         runtime assets (former resources/)
  types/             legacy-only type shims
```

## Active stack

| Layer         | Location           |
| ------------- | ------------------ |
| Go core + CLI | `backend/`         |
| Wails desktop | `apps/desktop/`    |
| React UI      | `packages/ui/`     |
| Shared TS     | `packages/shared/` |

## Running (archival only)

From repo root, if electron deps are installed:

```bash
cd legacy/electron/config
npx electron-vite dev -c electron.vite.config.ts
```

Renderer now lives in `packages/ui/`; the old `src/renderer` tree was removed.
