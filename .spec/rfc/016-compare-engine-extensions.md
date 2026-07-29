# RFC-2026-016: Compare Engine — Content, Symlinks, Tolerance & Parallel

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — CMP-01~~06/08/10/13/15 Adopt(实现完成), CMP-07/09/11/12/14 Adapt(部分实现), LINK-01~~04 Adapt, LINK-05 Defer转RFC-014
  修改历史:

- 2026-07-29: 依据 Feature Map，承接 CMP 与 LINK 比较能力
- 2026-07-29: 核对代码现状 — CMP-02/03（Content/SizeOnly）、CMP-04/05/06（符号链接三策略）、CMP-08（tolerance）已在 `internal/sync/engine` 完成并测试。本 RFC 收窄为 CMP-07/09/10/11/12/13。修正架构提案以匹配真实类型/函数签名（避免与已有 `SymlinkMode`/`fsutil.Walk` 重复定义）。想法来自 FFS，实现走 Commando 自己的 Go 风格，不照抄。

---

## 摘要

比较引擎的核心分类（CMP-01）、内容/大小比较（CMP-02/03）、符号链接三策略（CMP-04…06）、时间容差（CMP-08）已有实现。本 RFC 还需评审 LINK-01…05、CMP-07/09…14；“已有”必须由跨平台测试证据确认。

## 已完成（`backend/internal/sync/engine/`，100% 覆盖率）

- [x] CMP-01: TimeAndSize（7 类分类）
- [x] CMP-02: Content 比较 — 流式二进制相等（64KB 分块）
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

## 本 RFC 范围：CMP-07/09…14、LINK-01…05

- [ ] CMP-07: junction/mount/WSL link 识别
- [ ] CMP-09: FAT DST/时区修正
- [ ] CMP-10: 并行目录遍历（`CompareSettings.Parallelism` 字段已占位，待接入）
- [ ] CMP-11: 并行二进制比较（content 模式）
- [ ] CMP-12: Windows 长路径 >260 支持
- [ ] CMP-13: Unicode 文件名全平台校验（Go 原生 UTF-8，需补充跨平台一致性测试，非新代码）
- [ ] CMP-14: 大小写敏感同步语义与文件系统矩阵
- [ ] LINK-01…05: symlink、mount、junction、WSL link、Google Drive shortcut 分项证据

## 提案（剩余项）

1. **Link class 识别**（CMP-07、LINK-*）：先定义 core 需要的可观察分类，再按平台 build tag 实现；不得把所有 link 类型压成一个未经验证的 bool。
2. **FAT DST 修正**（CMP-09）：检测 FAT 文件系统特征（`mtime` 精度为 2s），跨 DST 边界时自动补偿——**待验证是否为真实需求**：FFS 这条是 Windows FAT32 时代的遗留问题，现代文件系统（APFS/NTFS/ext4）罕见此问题，实施前评估是否仍有真实用户场景，避免为不存在的问题增加复杂度
3. **并行遍历/比较**（CMP-10/11）：`errgroup` 只提供结构化并发与取消传播；每次目录或内容 I/O 前必须从共享 `ResourceBudget` 借 per-device token，不得在 compare 层自建 pool。结果按路径排序，保证确定性输出
4. **长路径**（CMP-12）：Windows `\\?\` 前缀，仅绝对路径场景启用
5. **Unicode**（CMP-13）：审计现有路径操作代码确保用 `os.OpenFile` 而非旧 syscall API；这是补测试+审计，不是新实现

## 风险评估

| 风险                             | 概率 | 影响 | 缓解                            |
| -------------------------------- | ---- | ---- | ------------------------------- |
| 并行遍历顺序不确定导致输出不稳定 | 中   | 中   | 最终输出按路径排序，保证确定性  |
| FAT DST 修正是否为真实需求存疑   | —    | —    | 实施前先验证场景，见提案第 2 条 |
| 长路径 `\\?\` 破坏相对路径       | 中   | 高   | 仅 Windows + 绝对路径时启用     |

## 测试策略

- Junction/mount: 各平台真实创建 junction/mount 后遍历验证
- 并行遍历/比较: 结果与串行一致，仅验证性能不验证语义差异
- 长路径: Windows CI 专项测试（若无 Windows CI，标记跳过并登记技术债）

## 后续工作

与 RFC-017（Sync Variants）对接：changes 模式依赖精确 compare 结果。

---

**状态**: Approved
**最后更新**: 2026-07-29

## Feature Map 追踪

本 RFC 明确拥有：`CMP-01`, `CMP-02`, `CMP-03`, `CMP-04`, `CMP-05`, `CMP-06`, `CMP-07`, `CMP-08`, `CMP-09`, `CMP-10`, `CMP-11`, `CMP-12`, `CMP-13`, `CMP-14`, `LINK-01`, `LINK-02`, `LINK-03`, `LINK-04`。

Decision、Status 与 Evidence 以 [FFS Feature Map](../FFS-FEATURE-MAP.md) 为唯一事实源；本 RFC 负责 Commando 设计与验收。
