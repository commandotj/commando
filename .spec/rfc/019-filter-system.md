# RFC-2026-019: Filter System — Include/Exclude Glob

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — Backend 6 items Adopt (100%覆盖), FFSFLT-01~~06 Reject (doublestar取代), FLT-09~~11 Defer, UI items移交UI RFC
  修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 UI-05、FLT 与 FFSFLT 能力
- 2026-07-29: 核对代码现状 — FLT-01/02/03/04/05/08 已在 `internal/sync/filter` 完成（100% 覆盖率），本 RFC 收窄为 FLT-06/07（UI 层，未做）。修正设计段以匹配真实类型签名。想法来自 FFS（克隆功能意图），实现和 UI 不抄 FFS，走 Commando 自己的 React/Wails3/Go 风格。

---

## 摘要

Backend 过滤能力（include/exclude + doublestar `**` glob）已完成，见「已完成」。本 RFC 剩余范围是 UI 层集成：网格右键快速排除（FLT-06）、路径分隔符跨平台展示（FLT-07）。

## 已完成（`backend/internal/sync/filter/`，100% 覆盖率）

- [x] FLT-01: Include 列表（默认 `**`）
- [x] FLT-02: Exclude 列表
- [x] FLT-03: 通配符 `*` `?` `**`（doublestar 语义）
- [x] FLT-04: 默认排除系统项（`$Recycle.Bin`、`System Volume Information`、`thumbs.db`、`.git`、`node_modules`、隐藏文件）
- [x] FLT-05: 目录整树排除（`temp/**`）
- [x] FLT-08: Exclude 覆盖 Include 优先级

真实实现（非本 RFC 提议，已在库中）：

```go
// backend/internal/sync/filter/rules.go
type FilterRules struct {
    Include []string
    Exclude []string
}
func DefaultRules() FilterRules { /* $Recycle.Bin/**, node_modules/**, .git/**, .*/** 等 */ }

// backend/internal/sync/filter/matcher.go
type Matcher interface {
    Match(relPath string, isDir bool) bool
}
func NewMatcher(rules FilterRules) Matcher
```

Include 优先判定 + Exclude 覆盖，通配符匹配委托现有 `github.com/bmatcuk/doublestar/v4`；该依赖已在当前实现中验证。

## 本 RFC 范围：UI 集成

- [ ] UI-05: Commando 原生过滤规则入口与编辑体验
- [ ] FLT-06: 网格右键快速排除 — 在文件列表行右键菜单加"从同步中排除"，写入 Exclude 规则并持久化到 SyncProfile
- [ ] FLT-07: 路径分隔符统一展示为 `/` — `fsutil.Entry.RelativePath` 已保证内部统一用 `/`；本项是 UI 展示层确认（Windows 用户看到的路径分隔符是否需要本地化显示，待设计）

## 提案（FLT-06/07，现代 React 组件风格，非 FFS UI 复刻）

FFS 是右键上下文菜单加一条"Exclude via filter"。Commando 用什么交互形式待定——不直接照抄 FFS 菜单项文案/位置，按 Commando 现有文件列表组件（`packages/ui/src/components/`）的交互模式设计，具体待补。

## 文件变更（仅 FLT-06/07 剩余范围）

| 文件                                             | 变更                                       |
| ------------------------------------------------ | ------------------------------------------ |
| `packages/ui/src/components/FileContextMenu.tsx` | FLT-06：加排除菜单项（组件已存在，待确认） |
| `packages/ui/src/app/syncSlice.ts`               | FLT-06：排除规则写入状态 + 持久化          |
| `packages/shared/types/SyncTypes.ts`             | FilterRules DTO                            |
| `backend/internal/sync/filter/`                  | 权威规则校验与匹配                         |
| `backend/internal/sync/profile.go`               | profile 持久化；若保留该边界               |
| `apps/desktop/services/sync.go`                  | filter/profile Wails adapter               |
| `apps/desktop/frontend/src/platform/syncApi.ts`  | generated binding 转 shared contract       |
| contract tests                                   | UI 编辑结果与 Go matcher 行为一致          |

## 风险

| 风险                         | 缓解                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| doublestar `**` 性能         | 已用于生产代码，未见性能问题；大规模场景待 M4 §7.10 性能基线验证  |
| 默认排除隐藏文件影响用户数据 | 仅排除 `.git`/`node_modules` 等已知目录，不排除用户自定义隐藏文件 |

---

**状态**: Approved
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`UI-05`, `FLT-01`, `FLT-02`, `FLT-03`, `FLT-04`, `FLT-05`, `FLT-06`, `FLT-07`, `FLT-08`, `FLT-09`, `FLT-10`, `FLT-11`, `FFSFLT-01`, `FFSFLT-02`, `FFSFLT-03`, `FFSFLT-04`, `FFSFLT-05`, `FFSFLT-06`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
