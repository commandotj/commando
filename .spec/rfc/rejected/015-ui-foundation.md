# RFC-2026-015: UI Foundation — Folder Selection & Compare/Sync Settings

---

作者: albert.li
创建时间: 2026-07-29
状态: Rejected — replaced by RFC-034
修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 UI-01…04、UI-28/29/34
- 2026-07-31: Rejected，内容并入 RFC-2026-034（UI Consolidation）

---

## 设计原则

> FFS 只证明目录选择、设置入口等能力有用户价值。Commando 交互必须从现有双栏工作流、组件体系、键盘操作和无障碍需求重新设计：
>
> - CSS 变量体系：`--cmd-accent` `--cmd-surface` `--cmd-border` `--cmd-text` 等 `--cmd-*` 令牌
> - 使用现有组件模式：Ant Design / tanstack-table 表格、Radix Icons、SplitterLayout 布局
> - 支持深色/浅色主题（`.dark` class）
> - BEM 类名命名：`cmd-*`
> - 对话框、按钮、进度条等 UI 基元复用 `commando.css` 中已有的类
>
> **不迁移 FFS 的 wxWidgets 外观。** 所有新组件视觉风格应与 `SyncPane.tsx`、`SyncToolbar.tsx` 等现有组件保持一致。

## 摘要

评审并实现 Commando 基础同步工作流：左右目录选择、比较设置和同步设置。入口形态、信息架构与导航从现有双栏工作流推导。

## 目标

- [ ] UI-01: 选择左/右文件夹 — 浏览 + 路径输入 + 历史
- [ ] UI-03: 在当前任务上下文中查看和修改比较设置
- [ ] UI-04: 在预览/执行前查看和修改同步策略

## 提案

### Folder Selection (UI-01)

现有 `packages/ui/src/components/PathBreadcrumb.tsx` 扩展：

- 路径输入框（可直接粘贴路径）
- 浏览按钮 → 系统原生目录选择对话框
- 历史下拉（最近 20 条，存 `localStorage`）
- 快速访问：桌面、文档、下载

### Compare Settings capability (UI-03)

必须覆盖下列设置。具体使用 inline panel、popover、drawer 或 dialog，由 Commando 工作流原型与可访问性验证决定：

| 设置                                   | 映射 RFC  |
| -------------------------------------- | --------- |
| 比较模式（time&size / content / size） | CMP-01~03 |
| 符号链接策略                           | CMP-04~06 |
| 文件时间容差（秒）                     | CMP-08    |
| 并行度                                 | CMP-10    |

### Sync Settings capability (UI-04)

必须覆盖下列设置；不预设独立页面或 dialog：

| 设置                            | 映射 RFC  |
| ------------------------------- | --------- |
| 同步变体                        | VAR-01~08 |
| 删除策略（perm/bin/versioning） | SYN-03~08 |
| 错误处理（stop/ignore）         | SYN-09/10 |
| 验证拷贝                        | SYN-11    |

## 文件变更

| 文件                                            | 变更                                                  |
| ----------------------------------------------- | ----------------------------------------------------- |
| `packages/ui/src/components/PathBreadcrumb.tsx` | 历史、浏览按钮                                        |
| `packages/shared/types/SyncTypes.ts`            | 比较/同步设置 DTO                                     |
| `backend/internal/sync/`                        | 校验并消费设置；保持 CLI/Desktop 共用                 |
| `apps/desktop/services/sync.go`                 | 薄 Wails adapter；目录选择另用 typed platform service |
| `apps/desktop/frontend/src/platform/`           | generated bindings 转共享 UI contract                 |
| `packages/ui/src/app/syncSlice.ts`              | 只管理 UI draft/loaded settings                       |
| `packages/ui/src/components/sync/`              | 组件形态由 UX 评审决定                                |
| contract tests                                  | Go DTO ↔ Wails binding ↔ shared TS 字段一致           |

---

**状态**: Rejected — replaced by RFC-034
**最后更新**: 2026-07-31

## Task Tracking 追踪

本 RFC 明确拥有：`UI-01`, `UI-02`, `UI-03`, `UI-04`, `UI-06`, `UI-28`, `UI-29`, `UI-34`。

Feature ID 与实施状态以 [TASK TRACKING](../../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../../ROADMAP.md) 为准。

**Replaced by [RFC-2026-034](../034-ui-consolidation.md)** — 内容并入 UI Consolidation，本 RFC 不再单独维护。
