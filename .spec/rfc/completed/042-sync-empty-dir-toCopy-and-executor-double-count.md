# RFC-2026-042: 空目录同步计（root cause + 修复）— 排障记录

---

作者: albert.li/AI
创建时间: 2026-08-08
状态: Completed
完成时间: 2026-08-08
父 RFC: [RFC-2026-037](./037-compare-cli-diff-view.md)（UI 展示侧）

---

## 1. 摘要

用户报告两个关联缺陷：

1. **Plan/Diff 视图丢失空目录**：左右根下若有 **空文件夹**（无任何文件，仅目录），`sync plan` 不把它计为 `copy`，Diff 视图也不显示对应行。
2. **执行计数翻倍**：file copy 路径 `result.Copied` 计数 x2（5 个 item 报 `copied: 7`）。

本 RFC 记录完整排障链路、根因、修复与回归测试。

## 2. 根因分析

### 2.1 空目录没进 Plan（规范缺口）

`planner.go` 对 `entry.IsDir` 的处理如下：

| 分支             | 代码路径                | 修复前行为                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------------- |
| 目录已存在于右侧 | `buildChangesPlan` 分支 | 待补（见下）                                                         |
| 目录缺失于右侧   | `planMissingSide` 分支  | `if source.IsDir { return Skip "directory placeholder" }` → **跳过** |

即：左侧有、右侧没有的空目录，被 planner 归为 **Skip**（`"directory placeholder"`）。UI `normalizeCompareResult` → Diff 视图只渲染非 skip 动作，（几乎）100% 不出现该目录行；`toCopy` 也不计入。

### 2.2 CLI 二进制（`apps/desktop/commando`）落后于源码

desktop 的 Go 应用 **将 CLI 二进制直接 embed**（`//go:embed commando` → `materializeEmbeddedCLI()` 落到 user cache 再 spawn）。若打包后源码更新、二进制未重建，运行中的 app 跑的是旧逻辑 → 场景复现：

- CLI 命令行手动验证：新代码 `sync plan` 输出正确含空目录 copy（`isDir: true`）
- desktop app 内仍是旧逻辑 → UI 不显示

### 2.3 修复前路径核实（`planMissingSource` 的空目录）

```go
// 修复前
if source.IsDir { return PlanItem{Action: ActionSkip, Reason: "directory placeholder"} }
// 修复后
if source.IsDir { return PlanItem{Action: ActionCopy, IsDir: true, ...} }
```

## 3. 修复方案

### 3.1 planner：目录缺失 → ActionCopy + IsDir

`planner.go` 两处：

1. `buildChangesPlan` 对 `IsDir`：
    - 右侧存在 → `ActionSkip`（已存在，合理跳过）
    - 右侧缺失 → **`ActionCopy` + `IsDir:true` + Source/Destination**（不再跳过）
2. `planMissingSide`：删除 `source.IsDir → Skip` 分支，改为 `ActionCopy` 的源侧缺失处理（会到 `IsDir` 一同带上），并给所有缺失侧 plan 附加 `IsDir: source.IsDir`。

### 3.2 executor：`IsDir` 走 mkdir

`executor.go` 支持 `ActionCopy + IsDir`：

```go
if item.IsDir {
    os.MkdirAll(item.Destination, 0o755)  // 空目录本体
    result.Copied++
    continue
}
```

（而原有的 copyFileAtomic 路径不变。）

### 3.3 executor：修 double count

`executor.go` 原逻辑：

```go
result.Copied++            // A：copy 成功
...
if VerifyCopies { ... }
result.Copied++            // B：无条件再 +1 → file 报 x2
```

修复：删除 B。仅保留 A（成功即计 1）；verify 尤其路径只在 A 计。

### 3.4 Wails CLI 桥不丢字段

`sync.toMap`（progress）会发 `result` 整体（含 IsDir/filter）。无需改动，但唯一注意：`plan.items` 带 `isDir`，C 端 JSON `sync.PlanItem` 已含该字段（backend `types.go`）——验证已通过。

## 4. 测试计划（已实现）

| 测试                                                    | 位置                                     | 验证                                                       |
| ------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `TestExecute_CopiesMissingEmptyDir`                     | `backend/internal/sync/executor_test.go` | 空目录 mkdir 提交，`Copied==1`                             |
| `TestExecute_FileCopy_CountsEachCopiedFileOnce`（新增） | 同上                                     | file copy 计数 ==1，不 x2（with/without verify 两个 case） |
| planner 空目录 copy（含方向）                           | `planner_test.go`                        | 缺失空目录 → `ActionCopy` + `IsDir`，方向映射透传          |

UI 侧（`packages/ui/src/…`）：

| 测试                                          | 位置                                              | 验证                           |
| --------------------------------------------- | ------------------------------------------------- | ------------------------------ |
| `normalizeCompareResult` 保留空目录 copy item | `common/__tests__/compareReport.test.ts`          | plan items → report items 不丢 |
| `SyncDiffView` 渲染空目录行 + skip 父目录     | `components/sync/__tests__/SyncDiffView.test.tsx` | 行渲染 + counts                |

## 5. 验收标准

1. `go test ./internal/sync/` + `planner_test` 全部通过
2. UI `compareReport`/`SyncDiffView` 测试通过
3. `pnpm dev` + 空目录场景：Diff View 显示空目录 copy 行、统计数量正确
4. 文件同步后计数台报 `copied == 文件数`（不再 x2）

## 6. 风险 / 未决

- **空目录 skip 语义**：右侧已有同目录 → 仍 `ActionSkip>`，符合既有 skip 行为；无行为变化。
- **`buildChangesPlan` 内敌对分支顺序**：若目录同时 fallback 到 plain file compare，保持原样（本文只补 `IsDir` 分支）。
- **持久化/回放**：[RFC-041](./041-plan-persistence-replay-history.md) 已定义 `PlanItem.IsDir`（第 5 节补注），029→041 透传即可，本 RFC 无需另存字段，不阻塞 041。

## 7. 关联修改点

| 文件                                                 | 变更                               |
| ---------------------------------------------------- | ---------------------------------- |
| `backend/internal/sync/planner.go`                   | 目录 → copy（两处 + IsDir 透传）   |
| `backend/internal/sync/executor.go`                  | mkdir 分支 + double count 修复     |
| `backend/internal/sync/types.go`（先决，RFC-041 内） | `PlanItem.IsDir` 字段已存在        |
| `apps/desktop/commando`                              | rebuild → 新的 CLI embed（修复后） |
| `backend/internal/sync/executor_test.go`             | 新增 2 组回归测试                  |
| `packages/ui`（compareReport / SyncDiffView 测试）   | 见 §4                              |

---

**状态**: 已完成（代码 + 测试已落地）
**最后更新**: 2026-08-06
