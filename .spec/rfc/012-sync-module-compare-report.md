# RFC-2026-012: Go Sync Module — Compare Report & Strategy-Driven Plan

---

作者: albert.li / AI
创建时间: 2026-07-27
修改历史:

- 2026-07-27: 初稿 — RFC-first；冻结未评审的 sync 半成品代码 by AI

---

## 摘要

本 RFC 定义 Commando 双栏同步功能的 **Go 模块边界**：比较（Compare）在 Go 中生成**可导出的策略驱动报告**（from → to、action、reason），UI 只展示与确认，不在 TypeScript 中实现策略或 diff 逻辑。执行（Execute）复用已有文件复制/删除能力。

**规则：本 RFC 批准前，不得合并或继续扩展 sync 相关实现代码。**

## 背景

### 问题描述

1. 用户需要 FreeFileSync 式工作流：左右设 sync root → 选策略 → Compare → 查看报告 → Sync。
2. 当前存在**无 RFC 的半成品**（`backend/internal/sync/*` 扩展、`CompareReport`、TS `syncSlice` 改动），策略在 Go/TS 两侧重复，Wails bindings 未更新，UI 未展示 from→to，导出未接通。
3. 现有 RFC 无专用 sync 文档：RFC-010 提到 MoziEngine（同步引擎），RFC-006 覆盖复制/移动/删除，**不覆盖 compare/report/strategy**。

### 现状分析

| 层    | 现状                                                                                    |
| ----- | --------------------------------------------------------------------------------------- |
| Go    | `github.com/systembug/commando/internal/sync` — 自研 `BuildPlan`（mtime/size），~200 行 |
| Wails | `apps/desktop/services/sync.go` — `Compare` / `Plan` / `Execute` 异步 job               |
| UI    | `syncSlice` + `SyncPlanModal` — 策略常量在 TS，`compare` 经 `window.syncApi`            |
| CLI   | `backend/cmd/commando sync plan` — JSON 输出 plan                                       |

**缺口：** 无正式报告 schema、无导出规范、无策略单一来源、planner 功能弱（无 checksum 并行、mirror 语义曾不完整）。

### 业务驱动

- 同步是 Commando 核心差异化（双栏 + 策略比较）。
- 报告必须可审计、可导出（给用户或支持排查）。
- 逻辑必须在 Go：**可测试、可 CLI 复用、Wails UI 薄封装**。

## 目标

### 主要目标

- [ ] **G1** 策略与 compare/plan **仅在 Go module**（`internal/sync`）定义
- [ ] **G2** Compare 返回 `CompareReport`：每项含 `from`、`to`、`action`、`reason`、`relativePath`
- [ ] **G3** 支持导出报告：`json` | `csv` | `text`
- [ ] **G4** UI 只传 `strategyId` + roots + options，渲染报告，不推导 action
- [ ] **G5** Execute 使用 report 内嵌 `Plan`，委托现有 copy/delete 实现

### 成功标准

- Compare 五策略与 FreeFileSync 语义一致（mirror/update × 方向 + two-way）
- 报告导出文件可被 CLI 与 Desktop 生成且内容一致
- `go test ./internal/sync/...` 覆盖各策略与导出格式
- UI 测试仅 mock `window.syncApi`，无策略单元测试重复
- **零** TypeScript 中的 `direction` / `deleteExtraneous` 策略映射表

### 非目标（v1）

- 网络 rsync / SSH 同步
- 块级增量（CDC/rsync 协议）
- 实时 watch 同步
- 冲突自动合并 UI（仅标记 conflict，用户后续处理）

## 提案

### 解决方案概述

```
┌─────────────┐     strategyId      ┌──────────────────────────────┐
│  React UI   │ ──────────────────► │  Wails SyncService           │
│  (薄客户端)  │ ◄── CompareReport ── │  Compare / ExportReport /    │
└─────────────┘                     │  Execute                     │
                                    └──────────────┬───────────────┘
                                                   │
                                    ┌──────────────▼───────────────┐
                                    │  internal/sync (Go module)   │
                                    │  ├─ strategy.go            │
                                    │  ├─ planner.go  (diff)       │
                                    │  ├─ report.go                │
                                    │  ├─ export.go                │
                                    │  └─ executor.go → copy/del  │
                                    └──────────────────────────────┘
```

### 第三方库评估

| 库                                                              | 用途                                   | 结论                      |
| --------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [go-fs-diff / fsdt](https://github.com/stefanpenner/go-fs-diff) | 两目录 diff → 操作列表；JSON/tree 输出 | **推荐用于 planner 底层** |
| [msync](https://github.com/osmontero/msync)                     | `--plan`、checksum、mtime、delete      | 备选 planner；CLI 导向    |
| [csync](https://github.com/otuschhoff/csync)                    | 并行执行、dry-run、回调                | 备选 executor             |
| gokrazy/rsync, jcp                                              | 网络 rsync                             | **拒绝** — 场景不符       |
| mirusync, syncr                                                 | SSH/云双向                             | **拒绝**                  |

**推荐组合（v1）：**

1. **Planner：** `go-fsdt` 生成树 diff → Commando `strategy` 层映射为 `PlanItem`
2. **Executor：** 复用 `internal/` 现有文件复制（Luban 线 / `sync.Execute` 薄封装），不引入 msync 执行路径除非 benchmark 证明必要

### 策略表（单一来源：`internal/sync/strategy.go`）

| strategyId     | direction     | deleteExtraneous | 语义                                     |
| -------------- | ------------- | ---------------- | ---------------------------------------- |
| `mirror-right` | left-to-right | true             | 左为准；复制到右；删右侧多余             |
| `update-right` | left-to-right | false            | 左→右更新；不删右侧独有                  |
| `mirror-left`  | right-to-left | true             | 右为准；复制到左；删左侧多余             |
| `update-left`  | right-to-left | false            | 右→左更新                                |
| `two-way`      | bidirectional | false            | 较新侧胜出；同 mtime 不同内容 → conflict |

`ListStrategies()` 供 UI 填充下拉；**label/description 可由 Go 提供英文默认值，UI 用 i18n key 覆盖展示**。

### CompareReport Schema

```go
type CompareReport struct {
    Strategy    Strategy     `json:"strategy"`
    LeftRoot    string       `json:"leftRoot"`
    RightRoot   string       `json:"rightRoot"`
    GeneratedAt string       `json:"generatedAt"` // RFC3339 UTC
    Items       []ReportItem `json:"items"`
    ToCopy      int          `json:"toCopy"`
    ToDelete    int          `json:"toDelete"`
    Conflicts   int          `json:"conflicts"`
    ToSkip      int          `json:"toSkip"`
    Plan        Plan         `json:"plan"` // Execute 用
}

type ReportItem struct {
    RelativePath string `json:"relativePath"`
    Action       Action `json:"action"` // copy | delete | skip | conflict
    From         string `json:"from"`   // 源绝对路径；delete 时为待删路径
    To           string `json:"to"`     // 目标绝对路径；delete/conflict 可为空或对侧路径
    Reason       string `json:"reason"`
}
```

### 导出格式

| format | 内容                                              |
| ------ | ------------------------------------------------- |
| `json` | 完整 `CompareReport`                              |
| `csv`  | `relativePath,action,from,to,reason`（跳过 skip） |
| `text` | 人类可读：策略摘要 + 每项 from→to                 |

### Wails API（`SyncService`）

| 方法             | 输入                                                    | 输出                      | 说明                       |
| ---------------- | ------------------------------------------------------- | ------------------------- | -------------------------- |
| `Compare`        | `SyncRequest{leftRoot, rightRoot, strategyId, options}` | `jobId` → `CompareReport` | 异步，事件 `sync:progress` |
| `ExportReport`   | `{report, filePath, format}`                            | `{filePath}`              | 同步写盘                   |
| `Execute`        | `Plan` + `Options`                                      | `jobId` → `ExecuteResult` | 异步                       |
| `ListStrategies` | —                                                       | `[]Strategy`              | 同步                       |
| `CancelSync`     | `jobId`                                                 | —                         | 已有                       |

`SyncRequest` **必须**含 `strategyId`；`direction` 字段标记 **deprecated**，仅 CLI 向后兼容。

### UI 契约

- `syncSlice` 存 `report: CompareReport | null`，`plan` 取自 `report.plan`
- `SyncPlanModal` 每行显示：`action` | `relativePath` | `from → to` | `reason`
- 工具栏：Compare、Export report（选格式/路径）、Sync（确认后 Execute）
- **删除** `SYNC_STRATEGY_DELETE_EXTRANEOUS` 等 TS 策略推导

### CLI 对齐

```bash
commando sync compare --left L --right R --strategy update-right --format json
commando sync export  --report report.json --out report.csv --format csv
commando sync run     --report report.json
```

## 影响分析

### 对现有系统的影响

- **正面：** 策略单一来源；CLI/Desktop 一致；可导出审计
- **负面：** 需回滚或重做未评审半成品；需 `wails3 generate` 更新 bindings

### 兼容性

- 旧 `SyncRequest` 仅含 `direction`：Go 侧 `strategyID()` 映射默认策略（过渡期），下一大版本移除

### 性能

- 大目录 compare 在后台 goroutine（已有 job 模型）
- `go-fsdt` accurate/checksum 模式按需开启 `useChecksum`

## 风险评估

| 风险                         | 概率 | 影响 | 缓解                                |
| ---------------------------- | ---- | ---- | ----------------------------------- |
| go-fsdt API 变更             | 低   | 中   | pin 版本；adapter 层                |
| 策略语义与 FreeFileSync 偏差 | 中   | 高   | .fixture 集成测试                   |
| 半成品代码与 RFC 冲突        | 高   | 中   | **批准前冻结；按本 RFC 重做或回滚** |
| Wails binding 遗漏           | 中   | 低   | checklist + 手工 smoke              |

## 实施计划

### 阶段 0 — 治理（本 RFC 合并前）

- [ ] 评审并批准 RFC-2026-012
- [ ] 冻结 sync 相关 PR；不继续堆叠未评审代码

### 阶段 1 — Go module

- [ ] 引入 `go-fsdt`（或选定库）adapter
- [ ] 重写 `planner.go` + 策略层
- [ ] `report.go` / `export.go` 按 schema 定稿
- [ ] 单元 + 集成测试（五策略 + 三导出格式）

### 阶段 2 — Wails 服务

- [ ] 更新 `SyncService` API
- [ ] 重新生成 bindings
- [ ] `syncApi.ts` / `window.syncApi` 类型

### 阶段 3 — UI

- [ ] `syncSlice` 仅消费 `CompareReport`
- [ ] `SyncPlanModal` from→to + Export
- [ ] 移除 TS 策略逻辑

### 阶段 4 — CLI & 文档

- [ ] `commando sync compare|export|run`
- [ ] 更新 `backend/README.md`

## 测试策略

### 用例（摘录）

- mirror-right：仅右存在 → delete；仅左存在 → copy
- update-right：仅右存在 → skip
- two-way：左新 → copy to right；同 mtime 不同 size → conflict
- export json/csv/text 字段完整
- Execute dry-run 不改盘

### 验收

- Desktop：Compare → 模态框见 from→to → Export 生成文件 → Sync 执行
- CLI：`sync compare` 与 Desktop 同 roots/strategy 输出一致 plan 计数

## 相关 RFC

- RFC-2025-010：MoziEngine / 主进程同步职责（本 RFC 在 Wails+Go 栈落地）
- RFC-2025-006：文件复制执行（Execute 依赖）
- RFC-2024-005：双栏文件管理 UI

## 后续工作

- RFC：冲突解决 UI（用户选 left/right/merge）
- RFC：checksum 默认策略与性能
- 可选：将 `internal/sync` 抽为独立 `github.com/systembug/commando-sync` module

## 附录

### 参考资料

- [go-fs-diff](https://github.com/stefanpenner/go-fs-diff)
- [msync](https://github.com/osmontero/msync)
- [FreeFileSync](https://freefilesync.org/manual.php?topic=synchronization-settings) 策略语义对照

### 半成品代码处置（批准前）

以下改动**未经 RFC**，实施时须按本 RFC 重做或回滚：

- `backend/internal/sync/strategy.go`, `report.go`, `export.go`, `report_test.go`
- `backend/internal/sync/planner.go`（mirror delete 修复）
- `apps/desktop/services/sync.go`（ExportReport, ListStrategies）
- `packages/shared/types/SyncTypes.ts`（CompareReport）
- `packages/ui/src/app/syncSlice.ts`, `constants/sync.ts`, `syncApiService.ts`

---

**状态**: Proposed
**最后更新**: 2026-07-27
**下次评审**: TBD
