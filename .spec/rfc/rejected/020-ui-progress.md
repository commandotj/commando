# RFC-2026-020: UI Progress — Compare/Sync Dialogs & Results

---

作者: albert.li
创建时间: 2026-07-29
状态: Rejected — replaced by RFC-034
修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 UI-20…23
- 2026-07-31: Rejected，内容并入 RFC-2026-034（UI Consolidation）

---

## 设计原则

> FFS 只提供进度、取消、结果反馈的能力输入。Commando 必须基于现有 worker event、Wails adapter 和 React 组件重新设计任务体验：
>
> - CSS 变量体系：`--cmd-accent` `--cmd-surface` `--cmd-border` `--cmd-text` 等 `--cmd-*` 令牌
> - 使用现有组件模式：Ant Design / tanstack-table 表格、Radix Icons、SplitterLayout 布局
> - 支持深色/浅色主题（`.dark` class）
> - BEM 类名命名：`cmd-*`
> - 对话框、按钮、进度条等 UI 基元复用 `commando.css` 中已有的类（如 `.cmd-dialog-content`、`.cmd-progress`、`.cmd-btn`）
>
> **不迁移 FFS 的 wxWidgets 外观。** 所有新组件视觉风格应与 `SyncPane.tsx`、`SyncToolbar.tsx` 等现有组件保持一致。

## 摘要

设计 Commando 的比较/同步任务反馈：渐进进度、取消、终态结果和完成后行为。是否使用 dialog 由用户流程决定。

## 目标

- [ ] UI-20: 比较进度对话框 — 大目录扫描进度
- [ ] UI-21: 同步进度对话框 — 总进度 + 当前文件 + ETA
- [ ] UI-22: 结果对话框 — 成功/警告/错误统计
- [ ] UI-23: 完成后行为 — 自动关闭/保持打开

## 提案

### Compare Progress (UI-20)

CLI 与 UI 共享 Go core outcome，但使用不同 adapter。UI 延续现有 `sync-progress` Wails event，不新增第二套事件名。

```json
{
    "jobId": "...",
    "type": "progress",
    "phase": "compare",
    "scanned": 1500,
    "total": 5000,
    "currentPath": "dir/file.txt"
}
```

### Sync Progress (UI-21)

```json
{
    "jobId": "...",
    "type": "progress",
    "phase": "execute",
    "copied": 42,
    "total": 200,
    "currentFile": "data.bin",
    "etaSeconds": 135
}
```

ETA 计算：滑动窗口平均速度 × 剩余文件数。

### Results Dialog (UI-22)

| 区域 | 内容                         |
| ---- | ---------------------------- |
| 成功 | ✅ Copied: 42, Deleted: 5    |
| 警告 | ⚠️ Skipped: 3 (locked files) |
| 错误 | ❌ Errors: 1 (see log)       |
| 详情 | 展开列表每个文件结果         |
| 操作 | 查看日志 / 关闭              |

### Post-Action (UI-23)

| 行为             | 实现                                 |
| ---------------- | ------------------------------------ |
| 自动关闭结果面板 | React timer 关闭 modal；不得退出应用 |
| 保持打开         | 留结果面板，用户手动关               |

### 任务与订阅契约

- `worker.Runner` 是唯一 job lifecycle owner；sync core 接受 `context.Context` 与 reporter。
- UI 必须先建立订阅再启动任务，或使用可查询/await 的 `JobHandle`，避免快速任务丢终态。
- `onProgress` 必须返回 unsubscribe；component unmount 清理监听。
- terminal event exactly once：`success | warning | error | canceled`。
- `canceled` 不得当作成功并以 `undefined` resolve。
- 统一 `Outcome` 映射 Wails、CLI exit code 与 Result UI。

## 文件变更

| 文件                                                       | 变更                                             |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `packages/ui/src/components/sync/SyncProgressModal.tsx`    | UI-21                                            |
| `packages/ui/src/components/sync/CompareProgressModal.tsx` | UI-20                                            |
| `packages/ui/src/components/sync/ResultDialog.tsx`         | UI-22                                            |
| `apps/desktop/services/sync.go`                            | Wails Events 推送进度                            |
| `apps/desktop/frontend/src/platform/syncApi.ts`            | typed event + unsubscribe adapter                |
| `packages/ui/src/services/syncApiService.ts`               | 先订阅后启动、终态与取消语义                     |
| `backend/internal/worker/runner.go`                        | 可取消排队、panic/error 终态、唯一生命周期 owner |

---

**状态**: Rejected — replaced by RFC-034
**最后更新**: 2026-07-31

## Task Tracking 追踪

本 RFC 明确拥有：`UI-10`, `UI-20`, `UI-21`, `UI-22`, `UI-23`。

Feature ID 与实施状态以 [TASK TRACKING](../../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../../ROADMAP.md) 为准。

**Replaced by [RFC-2026-034](../034-ui-consolidation.md)** — 内容并入 UI Consolidation，本 RFC 不再单独维护。
