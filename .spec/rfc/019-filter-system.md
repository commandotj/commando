# RFC-2026-019: Filter System — Include/Exclude Glob

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — Backend matcher 原语 Adopt，端到端 planner/CLI 集成 Adapt，FFSFLT-01…06 Reject（doublestar 取代），FLT-09…11 Defer，UI items 移交 UI RFC
  修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 UI-05、FLT 与 FFSFLT 能力
- 2026-07-29: 核对代码现状 — FLT-01/02/03/04/05/08 matcher 原语与单元测试存在，但 `BuildPlan` 直接调用 `fsutil.WalkRoot`，CLI compare 未消费 matcher；禁止标记端到端完成

---

## 摘要

Backend matcher 原语（include/exclude + doublestar `**` glob）已存在，但未接入 `BuildPlan`/`BuildReport`/CLI。用户可观察过滤能力仍未完成。UI 层另含快速排除（FLT-06）与路径展示（FLT-07）。

## 已完成原语（`backend/internal/sync/filter/`）

- [ ] FLT-01: Include 列表（matcher 原语已有；planner/CLI 集成未做）
- [ ] FLT-02: Exclude 列表（matcher 原语已有；planner/CLI 集成未做）
- [ ] FLT-03: 通配符 `*` `?` `**`（matcher 原语已有；非法 pattern 必须显式报错）
- [ ] FLT-04: 默认排除系统项（规则已有；CLI compare 未消费）
- [ ] FLT-05: 目录整树排除（matcher 原语已有；CLI compare 未消费）
- [ ] FLT-08: Exclude 覆盖 Include 优先级（matcher 原语已有；端到端未验收）

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

## P1 planner/CLI 集成

`BuildPlan`/`BuildReport` 必须消费统一 `engine.IndexRoot(root, matcher, opts)` 结果，禁止继续走绕过 filter 的第二套 `fsutil.WalkRoot` 路径。

- CLI profile/flags 解析出 `FilterRules`，由 core 校验后构建 matcher。
- 非法 glob 返回 typed configuration error；不得吞掉 `doublestar.Match` error 后当作“不匹配”。
- 相同 filter、root 与 compare settings 在 CLI/Desktop 产生相同 plan。
- filter 必须在 plan 前生效；被排除项目不得进入 copy/delete/conflict 计数。

## 本 RFC 范围：UI 集成

- [ ] UI-05: Commando 原生过滤规则入口与编辑体验
- [ ] FLT-06: 网格右键快速排除 — 在文件列表行右键菜单加"从同步中排除"，写入 Exclude 规则并持久化到 SyncProfile
- [ ] FLT-07: 路径分隔符统一展示为 `/` — `fsutil.Entry.RelativePath` 已保证内部统一用 `/`；本项是 UI 展示层确认（Windows 用户看到的路径分隔符是否需要本地化显示，待设计）

## 提案（FLT-06/07，现代 React 组件风格，非 FFS UI 复刻）

FFS 是右键上下文菜单加一条"Exclude via filter"。Commando 用什么交互形式待定——不直接照抄 FFS 菜单项文案/位置，按 Commando 现有文件列表组件（`packages/ui/src/components/`）的交互模式设计，具体待补。

## 文件变更

| 文件                                             | 变更                                       |
| ------------------------------------------------ | ------------------------------------------ |
| `packages/ui/src/components/FileContextMenu.tsx` | FLT-06：加排除菜单项（组件已存在，待确认） |
| `packages/ui/src/app/syncSlice.ts`               | FLT-06：排除规则写入状态 + 持久化          |
| `packages/shared/types/SyncTypes.ts`             | FilterRules DTO                            |
| `backend/internal/sync/filter/`                  | 权威规则校验与匹配                         |
| `backend/internal/sync/planner.go`               | 接入 `engine.IndexRoot` 与 matcher         |
| `backend/cmd/commando/commands/sync.go`          | profile/flag 传入 FilterRules              |
| `backend/internal/sync/profile.go`               | profile 持久化；若保留该边界               |
| `apps/desktop/services/sync.go`                  | filter/profile Wails adapter               |
| `apps/desktop/frontend/src/platform/syncApi.ts`  | generated binding 转 shared contract       |
| contract tests                                   | UI 编辑结果与 Go matcher 行为一致          |

## 风险

| 风险                        | 缓解                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| doublestar `**` 性能        | 已用于生产代码，未见性能问题；大规模场景待 M4 §7.10 性能基线验证                                |
| 默认规则遗漏隐藏用户数据    | 现有 `.*/**` 与 `.*` 会排除全部隐藏路径；P1 前必须明确产品决策、展示生效规则并允许 profile 覆盖 |
| matcher 存在但 planner 绕过 | P1 integration test 从 CLI 输出断言排除项不进入 plan                                            |
| 非法 glob 被静默忽略        | profile/CLI 加载时校验并返回 typed error                                                        |

---

**状态**: Approved
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`UI-05`, `FLT-01`, `FLT-02`, `FLT-03`, `FLT-04`, `FLT-05`, `FLT-06`, `FLT-07`, `FLT-08`, `FLT-09`, `FLT-10`, `FLT-11`, `FFSFLT-01`, `FFSFLT-02`, `FFSFLT-03`, `FFSFLT-04`, `FFSFLT-05`, `FFSFLT-06`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
