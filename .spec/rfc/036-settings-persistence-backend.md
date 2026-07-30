# RFC-2026-036: Settings Persistence — Go Backend

---

作者: albert.li/AI
创建时间: 2026-07-30
状态: Draft

---

## 摘要

Settings 当前存 localStorage（前端 only）。迁移到 Go backend `~/.commando/settings.json`，通过 Wails binding 读写。

## 当前状态

- `services/settingsService.ts` — localStorage GET/SET
- `syncSlice` — loads defaults, no restore on startup
- No Go config service

## 目标

1. Go config service: read/write `~/.commando/settings.json`
2. Wails binding: frontend calls Go to load/save
3. Startup: load saved settings into Redux
4. Settings modal: save on change, not just on close

## 文件

| 文件                                            | 变更                                     |
| ----------------------------------------------- | ---------------------------------------- |
| `backend/internal/config/settings.go`           | 新增: Load/Save JSON config              |
| `apps/desktop/services/config.go`               | 新增: Wails service for settings         |
| `apps/desktop/frontend/src/platform/syncApi.ts` | 新增: loadSettings/saveSettings bindings |
| `packages/ui/src/services/settingsService.ts`   | 改为调 Wails binding                     |

## Settings 结构

```json
{
    "locale": "en-US",
    "theme": "dark",
    "sync": {
        "useChecksum": false,
        "deleteExtraneous": false,
        "dryRun": false,
        "resume": false,
        "errorMode": "ignore",
        "deleteMethod": "permanent"
    }
}
```

---

**状态**: Draft
