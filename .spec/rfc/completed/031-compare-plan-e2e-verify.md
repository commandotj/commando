# RFC-2026-031: Compare ↔ Plan E2E Verify

---

作者: albert.li/AI
创建时间: 2026-07-29
状态: Proposed

修改历史:

- 2026-07-29: 从 RFC-016 拆出联调验收。016 只交付 engine；本 RFC 验证 engine + planner + CLI 合在一起。

---

## 摘要

RFC-016 交付 compare engine 原语（`IndexRoot` / `IsEqual` / `Categorize`）。  
Planner（`BuildPlan` / `BuildReport`）与 CLI 是否消费这些原语，**不是 016 的 Done 条件**。

本 RFC 单独负责：

1. **接线验收**：planner 已改为调用 engine（无第二套 `entriesEqual`）
2. **CLI 端到端测**：`commando sync plan|compare` 证明 Content / TimeAndSize / symlink / tolerance 行为正确

一 RFC 独立可收。不完成 016 的剩余 engine 项也能先开本 RFC 的接线子集；全绿需 016 相关原语已在。

## 动机

- 016 曾把 `BuildPlan` 集成写成自身阻断项 → 伪依赖、结不了
- 规则：**一 RFC 能独立 Done**；跨层合拢用 **verify RFC**
- 现况：`BuildPlan` 仍 `fsutil.WalkRoot` + `entriesEqual`；`UseChecksum=true` 恒 `false`（假 Content）

## 范围

### In

| ID        | 内容                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| VERIFY-01 | `BuildPlan`/`BuildReport` 只经 `engine.IndexRoot` + `engine.Categorize`/`IsEqual` |
| VERIFY-02 | 删除 `entriesEqual` 及任何 second-set 相等逻辑                                    |
| VERIFY-03 | `Options.UseChecksum=true` → `CompareMode.Content`                                |
| VERIFY-04 | TimeAndSize 路径带 `ToleranceSec`（与 engine 一致）                               |
| VERIFY-05 | SymlinkMode 从 plan options 传入 `IndexRoot`（Exclude/AsLink/Follow）             |
| VERIFY-06 | CLI：`sync plan` / compare 与库路径同一 core（无桌面旁路）                        |
| VERIFY-07 | 集成测试清单（见下）全绿                                                          |

### Out（别的 RFC）

| 项                         | Owner   |
| -------------------------- | ------- |
| Content/并行/link 原语实现 | RFC-016 |
| Variant/Two-way 语义       | RFC-017 |
| Filter 规则语义            | RFC-019 |
| 退出码/NDJSON 合同         | RFC-021 |
| Execute/fail-safe          | RFC-028 |

## 依赖与优先级

| 依赖                  | 要求                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **RFC-017 Completed** | **P1 顺序：本 RFC 在 017 之后实施/验收**（plan 语义先稳定，再接线+联调）                               |
| RFC-016               | Content / TimeAndSize / Symlink / Tolerance **原语**可调用（单测绿；016 可与 017 并行，不挡 016 Done） |
| 共享 core             | CLI 与 Desktop 同一 `sync.BuildPlan`（CORE-02）；本 RFC 只验 CLI 路径                                  |

ROADMAP P1 顺序：**… → 017 → 031 → 018 → …**  
016 未完成 CMP-10/11/12 等 **不阻塞** VERIFY-01…07。  
**不得**在 017 未完成时把 031 标 Completed。

## 验收测试（Done 门槛）

全部为 **自动化** `go test` 和/或 CLI 子进程测；不等 Windows CI / junction 特权。

| #   | 场景                                      | 期望                                     |
| --- | ----------------------------------------- | ---------------------------------------- |
| T1  | 同 size、同 mtime、内容不同 + UseChecksum | plan 含 copy/不同类；**不得** skip       |
| T2  | 同内容、mtime 不同 + Content              | equal → skip                             |
| T3  | UseChecksum=false，time+size 默认         | 与改前回归一致（容差内 equal）           |
| T4  | 容差内 mtime 差                           | TimeAndSize → skip                       |
| T5  | SymlinkExclude                            | link 不进 plan 路径集                    |
| T6  | 源码无 `entriesEqual`                     | grep/编译期保证                          |
| T7  | CLI `commando sync plan`（或等价）T1 场景 | 退出成功且 stdout/报告与库 plan 一致动作 |

## 提案

1. Planner 重构为 engine 消费者；Options → `CompareMode` / `CompareSettings` / `IndexOptions` 显式映射。
2. 错误：`IsEqual` I/O 失败必须 fail plan，不得当 “not equal”。
3. 测放在 `backend/internal/sync/`（BuildPlan）+ `backend/cmd/commando/` 或 `sync` CLI 集成测。
4. 本 RFC **Completed** 当 T1–T7 全绿；016 可已 Completed 或仍 Approved——互不绑架。

## 风险

| 风险                    | 缓解                   |
| ----------------------- | ---------------------- |
| 接线时改爆 Two-way 语义 | T3 回归 + 017 后续收紧 |
| CLI 与库分叉            | T7 强制同一 BuildPlan  |

## 文件变更（预期）

| 路径                                     | 变更                         |
| ---------------------------------------- | ---------------------------- |
| `backend/internal/sync/planner.go`       | 接 engine；删 `entriesEqual` |
| `backend/internal/sync/planner_test.go`  | T1–T6                        |
| `backend/cmd/commando/...` 或 CLI 集成测 | T7                           |
| `backend/internal/sync/types.go`         | Options 映射文档化（若需）   |

## 与 016 的边界

```
RFC-016 Done  = engine 包 API + 单测
RFC-031 Done  = planner+CLI 消费 engine + T1–T7
```

016 正文不得再写 “BuildPlan 未接则 016 未完成”。  
本 RFC 是跨层 **verify**，不是 engine 功能扩展。

---

**状态**: Proposed  
**最后更新**: 2026-07-29

## 追踪

- Feature / 任务：[TASK_TRACKING.md](../TASK_TRACKING.md) § RFC-031
- 优先级 / 列表：[ROADMAP.md](../ROADMAP.md)
- 上游原语：[RFC-016](./016-compare-engine-extensions.md)
