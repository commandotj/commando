# RFC-2026-016: Compare Engine — Content, Symlinks, Tolerance & Parallel

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — CMP-01…06/08/10/13/15 Adopt，CMP-07/09/11/12/14 Adapt，LINK-01…04 Adapt，LINK-05 Defer 转 RFC-014
  修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 CMP 与 LINK 比较能力
- 2026-07-29: 核对代码现状 — CMP-02 Content 原语已在 `internal/sync/engine` 实现，但 `BuildPlan.Options.UseChecksum` 尚未接入；禁止把局部原语写成端到端完成

---

## 摘要

比较引擎已有 Content/SizeOnly、符号链接和时间容差原语，但 CLI 使用的 `sync.BuildPlan` 仍走独立 `fsutil.WalkRoot + entriesEqual` 路径。CMP-02 只有原语完成，端到端 planner 集成未完成。

## 已完成原语

- [x] CMP-01: TimeAndSize（7 类分类）
- [x] CMP-02 primitive: `engine.IsEqual(Content)` 流式二进制相等
- [x] CMP-03: SizeOnly 比较
- [x] CMP-04~06: 符号链接策略 — Exclude / AsLink / Follow
- [x] CMP-08: File time tolerance（可配置秒数）

真实类型（非本 RFC 提议，已在库中，后续设计须以此为准）：

```go
// backend/internal/sync/engine/compare.go
type CompareMode int
const (
    TimeAndSize CompareMode = iota
    Content
    SizeOnly
)

type SymlinkMode int  // engine 自己的类型，独立于 fsutil.SymlinkMode
const (
    SymlinkExclude SymlinkMode = iota
    SymlinkAsLink
    SymlinkFollow
)

type CompareSettings struct {
    ToleranceSec int64
    SymlinkMode  SymlinkMode
    Parallelism  int  // 字段已占位，CMP-10/11 未接入逻辑，本 RFC 范围
}

// backend/internal/sync/engine/equal.go
func IsEqual(a, b Entry, mode CompareMode, settings CompareSettings) (bool, error)

// backend/internal/sync/engine/index.go — 符号链接遍历实际入口
func IndexRoot(root string, matcher filter.Matcher, opts IndexOptions) (Index, error)
// 内部委托 fsutil.Walk(root, fsutil.WalkOptions{SymlinkMode: ...})，
// 不是本 RFC 最初提议的「给 fsutil.WalkRoot 加 SymlinkMode 参数」——
// 真实实现是新增 fsutil.Walk 函数，WalkRoot 保持原样不变。
```

**架构澄清（避免后续实施踩坑）：** `engine.SymlinkMode` 和 `fsutil.SymlinkMode` 是两个独立类型（同名不同包），`engine/index.go` 里的 `toFsutilSymlinkMode` 做转换。新功能若涉及 symlink，不要在 `fsutil.WalkRoot` 上加参数，`WalkRoot` 是底层原语，符号链接策略只在 `fsutil.Walk`/`engine.IndexRoot` 这一层。

## 本 RFC 剩余范围

- [ ] CMP-02 integration: `BuildPlan`/`BuildReport` 的 checksum/content 模式必须调用 `engine.IsEqual(Content)`，不得用 `entriesEqual` 无条件返回 false
- [ ] CMP-07: junction/mount/WSL link 识别
- [ ] CMP-09: FAT DST/时区修正
- [ ] CMP-10: 并行目录遍历（`CompareSettings.Parallelism` 字段已占位，待接入）
- [ ] CMP-11: 并行二进制比较（content 模式）
- [ ] CMP-12: Windows 长路径 >260 支持
- [ ] CMP-13: Unicode 文件名全平台校验（Go 原生 UTF-8，需补充跨平台一致性测试，非新代码）
- [ ] CMP-14: 大小写敏感同步语义与文件系统矩阵
- [ ] LINK-01…05: symlink、mount、junction、WSL link、Google Drive shortcut 分项证据

## 提案（剩余项）

1. **Planner integration**（CMP-02）：`BuildPlan` 和 `BuildReport` 必须消费 `engine.Index`/`engine.Categorize` 的统一比较结果。`Options.UseChecksum=true` 选择 Content mode；禁止保留 second-set `entriesEqual` 分支。
2. **Link class 识别**（CMP-07、LINK-*）：先定义 core 需要的可观察分类，再按平台 build tag（`_windows.go`, `_unix.go` 等）实现封装以隔离平台实现细节。当 `SymlinkFollow` 开启时，遍历必须加入循环检测（Cycle Detection，如基于设备/inode ID 映射），防范链接死循环。
3. **FAT DST 修正**（CMP-09）：检测 FAT 文件系统特征（`mtime` 精度为 2s），跨 DST 边界时自动补偿——**待验证是否为真实需求**：FFS 这条是 Windows FAT32 时代的遗留问题，现代文件系统（APFS/NTFS/ext4）罕见此问题，实施前评估是否仍有真实用户场景，避免为不存在的问题增加复杂度
4. **并行遍历/比较**（CMP-10/11）：`errgroup` 只提供结构化并发与取消传播；每次目录或内容 I/O 前必须从共享 `ResourceBudget` 借 per-device token，且 Token 并发配额须感知介质（SSD 允许高并发，HDD/网络挂载建议单并发防抖动）。结果按路径排序，保证确定性输出。二进制比较（Content mode）引入 `sync.Pool` 缓存复用，实现零拷贝并规避 GC 压力。
5. **长路径**（CMP-12）：Windows `\\?\` 前缀，仅绝对路径场景启用，由平台 FS Adapter 内部闭环转换。
6. **Unicode**（CMP-13）：审计现有路径操作代码确保用 `os.OpenFile` 而非旧 syscall API；这是补测试+审计，不是新实现

## 风险评估

| 风险                               | 概率 | 影响 | 缓解                                         |
| ---------------------------------- | ---- | ---- | -------------------------------------------- |
| 并行遍历顺序不确定导致输出不稳定   | 中   | 中   | 最终输出按路径排序，保证确定性               |
| FAT DST 修正是否为真实需求存疑     | —    | —    | 实施前先验证场景，见提案第 2 条              |
| 长路径 `\\?\` 破坏相对路径         | 中   | 高   | 仅 Windows + 绝对路径时启用                  |
| 符号链接循环引用导致死循环/崩溃    | 低   | 高   | Traversal 引入 device/inode 循环环路检测     |
| 并行遍历造成 HDD 磁头过度抖动/降速 | 中   | 中   | `ResourceBudget` 感知介质类型限制 HDD 并发数 |

## 测试策略

- Content integration: 相同 size/mtime 但内容不同，在 `UseChecksum=true` 时必须生成不同类别/动作
- Content integration: 内容相同但 mtime 不同，在 Content mode 时必须判定 equal
- Regression: 删除 `entriesEqual` 的 `UseChecksum => false` 路径；CLI compare/plan 走同一 engine
- Traversal abstraction (Mocking): 目录遍历和符号链接判断支持 metadata Mock/VFS，使 Link 和 Junction 判定逻辑在 CI 中不依赖系统真实文件操作特权也能进行 95%+ 的断言测试
- Junction/mount: 各平台真实创建 junction/mount 后遍历验证（真实系统测试）
- 并行遍历/比较: 结果与串行一致，仅验证性能不验证语义差异
- 长路径: Windows CI 专项测试（若无 Windows CI，标记跳过并登记技术债）

## 后续工作

与 RFC-017（Sync Variants）对接：changes 模式依赖精确 compare 结果。

---

**状态**: Approved
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`CMP-01`, `CMP-02`, `CMP-03`, `CMP-04`, `CMP-05`, `CMP-06`, `CMP-07`, `CMP-08`, `CMP-09`, `CMP-10`, `CMP-11`, `CMP-12`, `CMP-13`, `CMP-14`, `LINK-01`, `LINK-02`, `LINK-03`, `LINK-04`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
