# RFC-2026-023: UI Tools — Explorer, External Tools, Context Menu & Rename

---

作者: albert.li
创建时间: 2026-07-29
状态: Proposed
修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 UI-17…19/25/31 与 EXT 能力

---

## 设计原则

> FFS 只提供打开文件、外部工具、上下文操作和批量重命名等能力输入。Commando 必须复用现有 FileContextMenu、Go service 和 frontend platform adapter：
>
> - CSS 变量体系：`--cmd-accent` `--cmd-surface` `--cmd-border` `--cmd-text` 等 `--cmd-*` 令牌
> - 右键菜单复用 `cmd-context-menu` 组件（已存在于 `FileContextMenu.tsx`）
> - 支持深色/浅色主题（`.dark` class）
> - BEM 类名命名：`cmd-*`
> - 所有新组件视觉风格应与现有组件保持一致
>
> **不迁移 FFS 的 wxWidgets 外观。** 上下文菜单、外部工具配置等均以 Commando 设计语言实现。

## 摘要

评审并实现 Commando 文件工具能力：在平台文件管理器定位、自定义外部工具、上下文操作和批量重命名。

## 目标

- [ ] UI-17: 在当前平台文件管理器定位选中项
- [ ] UI-18: 自定义外部工具 — 宏 `%item_path%` etc
- [ ] UI-19: 右键上下文菜单 — 可配置多条命令
- [ ] UI-25: 多文件重命名预览、冲突处理与可恢复执行

## 提案

### Reveal in platform file manager (UI-17)

`packages/ui` 调 typed `revealPath(path)`。Desktop adapter 经 Wails binding 调 Go service；Go 按平台选择原生 API 或受控 executable + argv。UI 不拼 shell command。

### External Tools (UI-18)

用户配置，存于 SyncProfile：

```json
{
    "externalTools": [
        {
            "id": "vscode",
            "label": "Open in VS Code",
            "executable": "code",
            "args": ["%item_path%"]
        },
        {
            "id": "diff",
            "label": "Diff files",
            "executable": "diff",
            "args": ["%item_path%", "%item2_path%"]
        }
    ]
}
```

Go service 校验 tool ID、executable allow policy、展开后的绝对路径和 argv；禁止交给 shell 重新解析。

宏：

| 宏             | 展开                   |
| -------------- | ---------------------- |
| `%item_path%`  | 当前选中文件绝对路径   |
| `%item2_path%` | 对面 pane 对应文件路径 |
| `%left_root%`  | 左根目录               |
| `%right_root%` | 右根目录               |

### Context Menu (UI-19)

右键菜单可配置，默认项：

```
Open in Explorer
Open With...       →
Copy Path
Copy to Clipboard
Exclude from Sync
External Tools     → (用户定义列表)
```

### Rename Tool (UI-25)

批量重命名先定义预览、冲突、撤销和键盘流程，再决定是否新增 `RenameDialog.tsx`：

| 功能 | 说明           |
| ---- | -------------- |
| 查找 | 文本/正则      |
| 替换 | 替换文本       |
| 预览 | 逐文件预览变更 |
| 执行 | 批量重命名     |

## 文件变更

| 文件                                                             | 变更                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `packages/ui/src/components/FileContextMenu.tsx`                 | UI-17/19                                                                         |
| `packages/ui/src/components/sync/ExternalToolsConfig.tsx`        | UI-18                                                                            |
| `packages/ui/src/components/sync/RenameDialog.tsx`               | UI-25                                                                            |
| `apps/desktop/services/` + `apps/desktop/frontend/src/platform/` | 平台操作经 Go service、Wails binding 和 adapter 注入；`packages/ui` 不执行 shell |

---

**状态**: Proposed
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`UI-17`, `UI-18`, `UI-19`, `UI-25`, `UI-31`, `EXT-01`, `EXT-02`, `EXT-03`, `EXT-04`, `EXT-05`, `EXT-06`, `EXT-07`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
Replaced by RFC-034: # RFC-2026-023: UI Tools — Explorer, External Tools, Context Menu & Rename
Status: Deprecated — replaced by RFC-034
