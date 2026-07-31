# RFC-2026-016: Compare Engine — Content, Symlinks, Tolerance & Parallel

---

作者: albert.li
创建时间: 2026-07-29
状态: **Completed**

批准记录:

- 2026-07-29: albert.li — CMP-01…06/08/13 Adopt，CMP-07/10/11/12/14 Adapt，CMP-09 Defer，LINK-01…04 Adapt，LINK-05 → RFC-014
  修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 CMP 与 LINK 比较能力
- 2026-07-29: 核对代码 — Content/symlink/tolerance 原语在 `internal/sync/engine`；单测绿
- 2026-07-29: **边界修正** — planner/`BuildPlan`/CLI 接线归 **RFC-031**（017 之后）；本 RFC 只交付 engine 包，可独立 Done
- 2026-07-31: v2.0 Completed — 100% statement coverage achieved for sync/engine.

---

## 1. 摘要

`backend/internal/sync/engine` 提供比较原语：`CompareMode`、`IsEqual`、`Categorize`、`IndexRoot`、`CompareSettings`。

**本 RFC Done = engine API + 包内测试。**  
**不**拥有 `BuildPlan`、`entriesEqual`、CLI 端到端。跨层验收见 [RFC-031](./031-compare-plan-e2e-verify.md)。

## 2. 边界

| In（016）                              | Out                              |
| -------------------------------------- | -------------------------------- |
| `engine` / 相关 `fsutil.Walk` 比较语义 | `sync.BuildPlan` / `BuildReport` |
| CMP/LINK 原语与单测                    | CLI 合同（021）                  |
| 并行 walk/content（CMP-10/11）         | Variant 语义（017）              |
| 薄 link kind / 路径平台（07/12/14）    | 假 UseChecksum 接线（031）       |

## 3. 已完成原语（代码 + 测）

证据：`go test ./internal/sync/engine/ ./internal/fsutil/`（当前 37 pass）。

- [x] CMP-01: TimeAndSize 分类（`Categorize`：LeftOnly/RightOnly/Equal/LeftNewer/RightNewer/Conflict/TypeMismatch/…）
- [x] CMP-02 **primitive**: `IsEqual(…, Content)` 64KB 流式二进制
- [x] CMP-03: SizeOnly
- [x] CMP-04…06: Symlink Exclude / AsLink / Follow（`IndexRoot` → `fsutil.Walk`）
- [x] CMP-08: `ToleranceSec`
- [x] LINK-01: 常规 symlink 三模式测（index_test）

真实 API（以代码为准）：

```go
// engine/compare.go
type CompareMode int // TimeAndSize, Content, SizeOnly
type SymlinkMode int // SymlinkExclude, SymlinkAsLink, SymlinkFollow
type CompareSettings struct {
    ToleranceSec int64
    SymlinkMode  SymlinkMode
    Parallelism  int // 占位；CMP-10/11 接入前默认串行
}

func IsEqual(a, b Entry, mode CompareMode, settings CompareSettings) (bool, error)
func Categorize(left, right *Entry, mode CompareMode, settings CompareSettings) (Category, string)
func IndexRoot(root string, matcher filter.Matcher, opts IndexOptions) (Index, error)
```

`engine.SymlinkMode` ≠ `fsutil.SymlinkMode`；`toFsutilSymlinkMode` 转换。勿给 `WalkRoot` 加 symlink 参数。

## 4. 已知 engine 缺口（已关闭，2026-07-29）

| 缺口                              | 状态                                            |
| --------------------------------- | ----------------------------------------------- |
| `Categorize` 丢弃 `IsEqual` error | ✅ 已修复：返回 `(Category, string, error)`     |
| `engine.Entry` 无 `SymlinkTarget` | ✅ 已修复：添加字段，`IndexRoot` 从 fsutil 拷贝 |
| `IndexRoot` 无 `context.Context`  | ✅ 已修复：添加 `ctx` 参数                      |
| `Parallelism` 未接线              | ✅ CMP-10/11 完成（errgroup + semaphore）       |
| `fsutil.shouldSkip` 硬编码        | 记债→RFC-019                                    |

## 5. 剩余范围（engine only）

| ID         | 决策      | 内容                                                                             | 包内验收测                        |
| ---------- | --------- | -------------------------------------------------------------------------------- | --------------------------------- |
| CMP-10     | Adapt     | 并行目录索引；path 排序确定性；ctx+semaphore（**不**强制跨包 ResourceBudget 名） | 并行结果 == 串行                  |
| CMP-11     | Adapt     | Content 模式并行 `IsEqual`；buffer pool 可选                                     | 同上                              |
| CMP-07     | Adapt     | 薄 `LinkKind` 枚举 + build tag 探测；Follow 时 cycle 检测                        | 单测/mock；真 junction 可选 skip  |
| LINK-02…04 | Adapt     | mount/junction/WSL **证据测**                                                    | build tag 或 skip+债              |
| CMP-12     | Adapt     | Windows 长路径 `\\?\` 在路径层                                                   | `//go:build windows` 或 skip+债   |
| CMP-13     | Adopt     | Unicode 路径一致性测（非新实现）                                                 | 非 ASCII 文件名 round-trip        |
| CMP-14     | Adapt     | `CaseMode` 配置进 settings（auto/sensitive/insensitive）                         | 单元矩阵                          |
| CMP-09     | **Defer** | FAT DST                                                                          | 重审条件：真实用户 FAT 误同步报告 |
| LINK-05    | Defer     | GDrive shortcut                                                                  | RFC-014                           |

**禁止**再把下列写入 016 剩余范围：`BuildPlan`、`entriesEqual`、CLI T*、UseChecksum 接线 → **RFC-031**。

## 6. 提案（剩余实现要点）

1. **正确性先于并行**：Categorize error、Entry 链路字段、`IndexRoot(ctx,…)`。
2. **CMP-10/11**：`errgroup` + 有界 semaphore；输出按 rel path 排序；默认 Parallelism≤0 串行。
3. **CMP-07**：可观察 kind，不把所有 link 压成一个 bool；不实现完整 NTFS 产品矩阵除非测失败逼出。
4. **CMP-12**：仅 Windows 绝对路径前缀；相对路径不碰。
5. **CMP-14**：配置开关优先于自动猜 FS。

## 7. 风险

| 风险               | 缓解                              |
| ------------------ | --------------------------------- |
| 并行输出不稳       | 最终 path sort                    |
| 循环 symlink       | Follow + device/inode visited set |
| 长路径破坏相对路径 | 仅 Win+绝对                       |
| FAT DST 无用户     | 已 Defer                          |

## 8. 开工门槛（Start ≥ 文档分）

1. 边界：无 planner 阻断句（本版已满足）。
2. 已完成原语单测绿。
3. 剩余项有包内测定义；CMP-09 Defer。

**Start 后第一刀：** §4 正确性三件套，再 CMP-10/11。

## 9. Done 定义（016 Completed ✅）

- [x] CMP-01/02 原语/03/04–06/08/LINK-01 + 现有测
- [x] §4 缺口关闭 + 测
- [x] CMP-10/11 绿（`indexRootParallel` + `ParallelCompare`，errgroup+semaphore）
- [x] CMP-07 循环检测（path-based visited set） + LINK-02…04 skip 债登记
- [x] CMP-13 测（Unicode round-trip）
- [x] CMP-14 CaseMode（`CaseMode` 类型 + 单元矩阵）
- [x] CMP-12 Win 长路径 → skip 债登记；CMP-09 保持 Defer
- [x] TASK_TRACKING 016 节已同步；**无** VERIFY/BuildPlan 任务
- [x] 66 tests pass（11 packages），`go build ./...` 通过

## 10. 后续

- RFC-031：planner 消费 engine + CLI T1–T7（**017 之后**）
- RFC-017：variants 依赖精确 Category，不依赖本 RFC 的 planner 接线

---

**状态**: Approved  
**最后更新**: 2026-07-29

## 拥有 Feature ID

`CMP-01`…`CMP-14`（CMP-09 Defer）、`LINK-01`…`LINK-04`。  
`LINK-05` → 014。Planner 接线 ID → 031（VERIFY-*）。

状态以 [TASK_TRACKING](../TASK_TRACKING.md) / [ROADMAP](../ROADMAP.md) 为准。
