# RFC-2026-017: Sync Variants — Changes Mode, Two-way, Custom & Swap

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — VAR-01/02 Adopt(已实现), VAR-03~08 Adapt(需DB支持后实现)
  修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 VAR-03…08
- 2026-07-29: 核对代码现状 — `planBidirectional` 仅按 `ModTimeUnix` 选择较新侧，尚无上次成功同步快照；该行为不得作为 VAR-04 完成证据

---

## 摘要

以 FFS 的 Update/Two-way/Custom 为能力输入，评审 Commando 所需同步语义。现有 Mirror/Update 代码是基线，不因 FFS 默认值自动重写。

## 背景

### 问题描述

当前 `backend/internal/sync/strategy.go` 实现了 Mirror 和 Update（differences 模式），但缺少：

- **changes 模式**（FFS 13+ 默认）— 基于数据库变更检测，而非每次全量比较
- **Two-way** — 双向传播变更的协作同步
- **Custom** — 用户对每种类别指定动作
- **变体切换** — 切换时不丢过滤器配置
- **Mirror swap** — 一键交换左右方向

`StrategyTwoWay` 名称虽已存在，`planner.go:planBidirectional` 仍只比较两侧 mtime。它无法区分删除、单侧修改、双侧修改与时钟偏差，因此只是无状态 differences heuristic，不是 VAR-04 changes/two-way 语义。

### 范围

VAR-01（Mirror differences）和 VAR-02（Update differences）已实现。本 RFC 覆盖 VAR-03~08。

## 依赖

**VAR-03（Update changes）和 VAR-04（Two-way）依赖同步数据库（SYN-01），由 RFC-018（Sync DB & Execution）提供。** VAR-05/07/08 无 DB 依赖，可独立实现。

## 目标

- [ ] VAR-03: Update (changes, FFS 13+, default) — 基于 DB 变更传播
- [ ] VAR-04: Two-way (changes) — 双向同步，DB 必须
- [ ] VAR-05: Custom (differences) — 每类别可配置动作
- [ ] VAR-06: Custom (changes) — 每变更类型可配置动作
- [ ] VAR-07: 变体切换不丢过滤器 — 配置持久化
- [ ] VAR-08: Mirror swap 左右 — 在 Commando 双栏模型中安全交换 source/target

## 提案

### 架构

扩展 `backend/internal/sync/strategy.go`：

```go
// Variant 描述同步变体的完整配置
type Variant struct {
    ID          StrategyID
    Mode        VariantMode     // differences | changes
    CustomMap   map[Category]Action  // VAR-05/06: 用户自定义动作映射
}

type VariantMode int
const (
    VariantDifferences VariantMode = iota  // 无 DB
    VariantChanges                          // 需 DB
)
```

### 变体动作表

#### VAR-03: Update (changes, FFS 13+ 默认)

基于 `engine.ChangesCategory`（CHG-01~08）决定动作：

| 变更         | 动作                      |
| ------------ | ------------------------- |
| create-left  | Copy to right             |
| update-left  | Update right              |
| delete-left  | Do nothing (OQ-05 待确认) |
| create-right | Do nothing                |
| update-right | Do nothing                |
| delete-right | Do nothing                |
| conflict     | Unresolved                |

⚠️ **OQ-05**：delete-left/delete-right 行为需 FFS 14.x golden 验证，验证前禁止实现。

#### VAR-04: Two-way

双向传播 create/update/delete。双侧修改同一文件 → conflict。
M2 实施前须补全 6 种变更组合的逐格动作表并经 golden 验证。
动作必须由 RFC-018 的上次成功同步快照与当前双侧状态共同导出；禁止继续用“mtime 较新侧覆盖较旧侧”作为 Two-way 决策。

#### VAR-05/06: Custom

UI 必须基于 Commando 现有同步预览和批量选择设计动作编辑；不得预设 F8 页面或图标循环。

- VAR-05: 7 类 Compare 类别各指定动作
- VAR-06: 8 类 Change 类型各指定动作

#### VAR-07: 变体切换

切换变体时，filter 配置（FLT-01~08）保持不变。配置存储于 `.commando/profile.json`。

#### VAR-08: Mirror swap

交换左右目录时必须重新计算方向、删除策略和预览。具体 API 由现有 `sync.Strategy` 数据结构评审决定，不预设 `Swap()` 签名。

### 包边界

当前 `Category`、`Action`、`Strategy` 与 planner 都在根包 `sync`。本 RFC 先保持 flat package，避免 `sync → sync/variant → sync` import cycle。只有在独立 leaf model package 获批后，才可拆 `variant` 子包。

### 文件变更

| 文件                                      | 变更                                 |
| ----------------------------------------- | ------------------------------------ |
| `backend/internal/sync/strategy.go`       | Variant 类型，Swap 方法              |
| `backend/internal/sync/variant_update.go` | VAR-03 动作表；保持根 package        |
| `backend/internal/sync/variant_twoway.go` | VAR-04 动作表；保持根 package        |
| `backend/internal/sync/variant_custom.go` | VAR-05/06 自定义映射；保持根 package |
| `backend/internal/sync/planner.go`        | 接入 variants 动作表                 |

## 影响分析

### 兼容性

VAR-03/04 依赖 RFC-018 数据库，在 DB 就绪前返回错误"changes mode requires database"。VAR-05/07/08 无新增依赖，可独立上线。

## 风险评估

| 风险                               | 概率 | 影响 | 缓解                              |
| ---------------------------------- | ---- | ---- | --------------------------------- |
| OQ-05 未关闭导致 delete 行为不确定 | 中   | 高   | golden 验证前实现标记为实验性     |
| Custom 变体 UI 复杂度高            | 中   | 中   | M3 优先 UI 实现，CLI 用 flag 覆盖 |

## 实施计划

1. VAR-08: Swap 方法 — 无依赖，可立即实现
2. VAR-05: Custom (differences) — 扩展 `Strategy` 结构体
3. VAR-07: 变体切换 — profile 持久化
4. VAR-03/04: 依赖 DB 就绪后实现（RFC-018）
5. VAR-06: Custom (changes) — 最后，依赖 DB

## 测试策略

- 同一基线后左改、右改、左删、右删、双侧同改、双侧冲突分别生成确定动作。
- 双侧 mtime 被人工调换时，changes 结果仍由 snapshot 差异决定。
- 无可用数据库时 VAR-04 返回 `changes mode requires database`，禁止静默回退到 mtime。

## 后续工作

- RFC-018: Sync DB 提供 changes 模式所需数据库
- RFC-021: CLI & Config 接入变体选择 flag

---

**状态**: Approved
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`CMP-15`, `VAR-01`, `VAR-02`, `VAR-03`, `VAR-04`, `VAR-05`, `VAR-06`, `VAR-07`, `VAR-08`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
