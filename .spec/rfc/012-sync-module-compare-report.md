# RFC-2026-012: Commando ↔ FreeFileSync 1:1 全功能对标

---

作者: albert.li / AI
创建时间: 2026-07-27
状态: **Proposed** — 未批准前禁止实施
修改历史:

- 2026-07-27: 初稿
- 2026-07-28: v3 — FFS 14.x 全功能 1:1；§4 验收表
- 2026-07-28: v3.1 — 治理闸门、批准清单、冻结范围、已决/待决
- 2026-07-28: v3.2 — §2.1 模块目录、依赖、各包 API、UI 映射、编排流
- 2026-07-28: v3.3 — §7 完整测试计划（金字塔、golden、矩阵、CI、手工）
- 2026-07-28: v3.5 — §2.2 四阶段管线定型（Prescan / DryRun / Execute / Verify）；API 与 §7.12.15 对齐
- 2026-07-28: v3.5 — §2.2 四阶段流水线；§1.1 防丢失规则；§7.12.15 流水线测试
- 2026-07-28: v3.6 — code review：§3.4 Update-changes delete 行为转 OQ-05（未经 FFS 实测不得实现）；§4 表头加 traceability.json 权威声明
- 2026-07-28: v3.7 — 功能保持 FFS 1:1，命名去 FFS 化：`GuiConfig`→`SyncProfile`，`BatchConfig`→`SyncSchedule`；新增 §3.7 定义 SyncProfile/db/lock 存于 `<syncRoot>/.commando/` 而非 `~/.commando`
- 2026-07-28: v3.8 — Linus/Kent/Fowler 三视角 review 落地：①§6 里程碑改 **CLI-first**，UI 移至 M3+；②新增 §2.1.3.1 CLI NDJSON+流式输出契约；③修复 §0.4 A-04 引用错误（§11→§12）；④修复 `plan.BuildReport` 违反依赖表直接 import database 的矛盾，改由 `variant.ApplyChanges` 内部封装；⑤§3.4 四张动作表全部补「来源」列（实测/文档/推断），标出未验证行；⑥新增 §3.7.1 SyncProfile 双侧不一致冲突规则
- 2026-07-28: v3.9 — §12 待决事项 OQ-01…05 **全部关闭**：OQ-01→A 全做（SYN-16/20 不降级）；OQ-02→独立 RFC（REM-04/05 拆出，§4.8 标 🔀，§9.1 登记去向）；OQ-03→每平台原生 API + Go build tag 分文件（`execute/trash_{darwin,windows,linux}.go`，禁止 shell out），SYN-04 更新；OQ-04→保留现有 UI，M0 不扩写；OQ-05→维持「实机录制确认」，§3.4 对应两行保留 🔴 待验证。A-04 可勾选
- 2026-07-28: v3.10 — OQ-02 拆出的 RFC 编号回填：创建 **RFC-2026-014**（`014-remote-provider-gdrive-mtp.md`，Google Drive/MTP 完整规格），§9.1、§12 OQ-02、§10 相关 RFC 表全部替换「编号待定」为实际编号
- 2026-07-28: v3.11 — **文件系统层先行 + 逐包 100% 覆盖率门禁**：新增 §1.2 定义 `internal/fsutil`（独立于 sync，M0 第一交付单元，扶正现有 `fsutil/walk.go`，不迁入 engine）；§2.1.2 依赖表加 `fsutil` 单向依赖行；§6 M0 拆解为 `fsutil→filter→engine→variant→plan` 严格顺序，每包 100% 覆盖率未达标禁止开下一包；§7.3/§7.7/§7.8 同步补 fsutil 测试项与 CI 覆盖率强制脚本
- 2026-07-28: v3.12 — **RFC 只写功能规格，砍掉审批仪式**：删除原 §0 治理闸门整节（G-01…G-05、生命周期图、0.4 checklist），保留其中有信息量的部分（现有代码处置表、开工前提清单）合并进摘要；删除原 §15 批准清单整节；§11/§12 标题去掉「批准前锁定/关闭」措辞，内容不变；`internal/fsutil` 明确现在就可开工，不受 sync 语义部分限制

---

## 摘要

Commando 双栏同步模块必须与 **FreeFileSync（FFS）14.x 行为 1:1 对标**。本文是 sync 域的**唯一权威规格**；实施、PR、测试均以 §4 验收表为准。

**对标版本：** FreeFileSync **14.x**（含 FFS 13+ changes-based Update）

**完成定义：** §4 每一项 ✅ + `Completed`

**当前状态：** `Proposed` — RFC 先批准，再开始写 sync 语义相关代码（`internal/fsutil` 除外，见 §1.2，它不含 sync 语义，不受此限制）。

**批准前受影响的现有代码，各自怎么处理：**

| 路径                                 | 处置                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `backend/internal/sync/*`            | 批准后按 §6 重写                                                        |
| `backend/internal/fsutil/walk.go`    | 现在就可以扶正为独立底层包（§1.2），补测试至 100%，不迁入 `sync/engine` |
| `apps/desktop/services/sync.go`      | 批准后对齐 §3 API                                                       |
| `packages/ui/src/**/sync*`           | 批准后对齐 §4.1（M3 里程碑）                                            |
| `packages/ui/src/constants/sync.ts`  | 批准后删除策略表                                                        |
| `packages/shared/types/SyncTypes.ts` | 批准后对齐 §3 schema                                                    |

**开工前提：** §4 全量 1:1 范围与 M0–M6 工作量确认；§3 数据模型与 §3.4 动作表确认无误；FFS 14.x golden 录制环境备好（Windows/macOS 各一台）；§12 争议点已决定（v3.9 起全部已定）；RFC-2025-010 标 `Deprecated`（ROADMAP 登记）。

---

## 1. 设计原则

1. **FFS 行为为准** — Commando 语义与 FFS 官方手册/论坛一致；有歧义时以 FFS 14.x 实际行为为准（录 fixture）。
2. **两层模型** — Compare（分类）与 Sync（变体→动作）分离，与 FFS 相同。
3. **双轨同步方向** — 同时支持：
    - **Differences-based**（left-only / right-only / left-newer / right-newer / equal / conflict）
    - **Changes-based**（create / update / delete × left/right，依赖 `sync.ffs_db` 等价物）
4. **逻辑在 Go** — UI/CLI 薄客户端；策略、分类、DB、执行均在 `internal/sync`。
5. **零 TS 策略** — `ListStrategies()` + 完整设置由 Go 提供。
6. **防数据丢失** — 同步必须经过 **Prescan → Dry-run → Execute → Verify** 四阶段流水线（§2.2）；禁止跳过；删除/覆盖前须有用户确认与可选 versioning。
7. **文件系统层先行** — `internal/fsutil`（独立于 `internal/sync`）是全部实施的**第一个交付单元**，不含任何 sync 语义（不知道"两侧对比"是什么），只提供 stat/walk/symlink 解析等原语；`engine` 在其上加 Compare 语义。见 §1.2、§6 M0 顺序。

### 1.2 `internal/fsutil` — 文件系统抽象层（M0 第一交付单元）

**定位：** 不属于 `internal/sync`，是比 sync 更底层的通用文件系统包，`engine`（Compare/Categorize）与 `execute`（copy/delete/move）**都**可能复用，不锁死在 sync 一个消费者身上。

**现状：** `backend/internal/fsutil/walk.go` 已有雏形（`WalkRoot`/`Entry`/`shouldSkip`），扶正为正式包，不迁入 `sync/engine`（纠正 §0.3 旧表述）。

**范围（M0 边界，只做这些，不做 sync 语义）：**

| 符号                                                                 | 职责                                                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `type Entry`                                                         | RelPath, AbsPath, IsDir, Size, ModTime, symlink 目标（新增，当前雏形缺失）                     |
| `func Walk(root string, opts WalkOptions) (map[string]Entry, error)` | 目录遍历建索引；`WalkOptions` 含 symlink 模式（Exclude/AsLink/Follow，供 §4.2 CMP-04…06 使用） |
| `func Stat(path string) (Entry, error)`                              | 单文件/目录元数据                                                                              |
| `func SameInode(a, b string) (bool, error)`                          | 两路径是否指向同一底层文件（供 PS-04 用）                                                      |
| `func FreeSpace(path string) (uint64, error)`                        | 磁盘可用空间（供 PS-05 用）                                                                    |

**明确不做（属于 `engine`/`filter`，不得越界实现在 fsutil）：** 两侧对比、Category 分类、include/exclude 规则匹配——`shouldSkip` 硬编码 `node_modules`/`.git` 排除逻辑需在 M0 迁出到 `filter.DefaultRules()`（§4.5 FLT-04），fsutil 只管"怎么读文件系统"，不管"该不该读这个文件"。

**测试门禁：** `internal/fsutil` 100% 语句覆盖率，M0 第一个 CI 强制项（见 §6）。

### 1.1 防数据丢失（非协商）

| 规则     | 说明                                                                      |
| -------- | ------------------------------------------------------------------------- |
| **S-01** | 未通过 **Prescan** → 禁止 DryRun / Execute                                |
| **S-02** | **Prescan** 与 **DryRun** 均不得修改用户文件系统状态                      |
| **S-03** | **Execute** 前 UI 必须展示完整 Plan；用户显式确认（FFS 预览等价）         |
| **S-04** | `conflict` 行 **永不** 自动 Execute                                       |
| **S-05** | 默认删除处理：**Versioning** 或 **Recycle Bin**；`Permanent` 须二次确认   |
| **S-06** | 启用 **Verify** 时：单文件 copy 后校验失败 → 记错、可选删除半成品目标文件 |
| **S-07** | Copy 使用 **临时文件 + rename**（FFS fail-safe）；目标侧不出现半截文件    |
| **S-08** | 根路径 overlap / 相同 → Prescan **硬拒绝**                                |
| **S-09** | 磁盘空间不足（Prescan 估算）→ **硬拒绝** Execute                          |
| **S-10** | 并发同 folder pair → `sync.commando_lock` 互斥                            |
| **S-11** | Execute 中止（错误/Cancel）→ 已完成的项不回滚自动；报告已执行项供人工恢复 |
| **S-12** | DB 仅在 **Verify 通过且 Execute 成功** 后更新（changes 模式）             |

---

## 2. 架构

```
┌─────────────────────────────────────────────────────────────┐
│ UI (React) — 复刻 FFS 主对话框能力                           │
│  folder pair · compare · filters · sync settings · grid     │
│  tree · legend · per-file override · progress · results     │
└───────────────────────────┬─────────────────────────────────┘
                            │ Wails SyncService
┌───────────────────────────▼─────────────────────────────────┐
│ internal/sync/                                               │
│  prescan/         只读校验 · 空间 · overlap · lock           │
│  engine/          index · compare · categorize · diff          │
│  database/        <root>/.commando/sync.commando_db（≈ sync.ffs_db，见 §3.7） │
│  variant/         Mirror · Update · TwoWay · Custom            │
│                   differences + changes 双模式                 │
│  filter/          include/exclude · defaults                   │
│  plan/            PlanItem · ReportItem                        │
│  execute/         copy · delete · move · versioning · verify   │
│  job/             progress · cancel · lock · parallel ops      │
│  config/          SyncProfile / SyncSchedule（.commando-profile.json / .commando-schedule.json） │
│  realtime/        RealtimeSync 等价                             │
│  remote/          SFTP · FTP/FTPS · Google Drive · MTP · SMB   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 同步管线：Prescan → Dry-Run → Execute → Verify

**同步是危险操作。** Commando 将 FFS Compare + Synchronize 拆为 **四阶段**，每阶段独立 API、可测、可审计、可阻断。

```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐
│ 1 Prescan│───►│ 1.1 Dry-Run  │───►│ 2 Execute│───►│ 3 Verify │
│ 安全+建Plan│    │ 模拟执行路径  │    │ 真写盘    │    │ 二进制校验 │
└──────────┘    └──────────────┘    └──────────┘    └──────────┘
     │                 │                  │                │
     ▼                 ▼                  ▼                ▼
 prescan/          execute/           execute/         execute/
 + plan.BuildReport  Runner           Runner           verify.go
 PrescanReport      DryRun=true        DryRun=false     (+ DB commit)
```

| 阶段            | API                                     | 写盘？ | 输出                              | UI / FFS                   |
| --------------- | --------------------------------------- | ------ | --------------------------------- | -------------------------- |
| **1 Prescan**   | `sync.Prescan(ctx, req)`                | **否** | `plan.PrescanReport`（含 `Plan`） | Compare 按钮 ≈ FFS Compare |
| **1.1 Dry-Run** | `sync.DryRun(ctx, plan, opts)`          | **否** | `execute.DryRunResult`            | 预览执行 / CLI `--dry-run` |
| **2 Execute**   | `sync.Execute(ctx, plan, opts)`         | **是** | `execute.Result`                  | Synchronize                |
| **3 Verify**    | `sync.Verify(ctx, plan, result, vopts)` | **否** | `execute.VerifyResult`            | Verify copied files        |

**`Compare` 别名（M0）：** `Compare` → `Prescan`；下一大版本删除 `Compare`。

**阶段边界（禁止混淆）：**

- Prescan **≠** Dry-Run：前者只建 Plan；后者走 Execute 分支但不写盘
- `PrescanRequest` **禁止** 携带 `ExecuteOptions`
- `DryRun` 要求 `opts.DryRun == true`；`Execute` 要求 `opts.DryRun == false`

#### 2.2.1 Phase 1 — Prescan（安全校验 + 建 Plan）

**子步骤（同一 API 内顺序执行）：**

1. **安全校验**（任一 Error → 返回 `PrescanReport{OK:false}`，不建 Plan）

| 检查 ID | 内容                                     | 失败级别 |
| ------- | ---------------------------------------- | -------- |
| PS-01   | 左右根存在且可读                         | Error    |
| PS-02   | 左右根不相同                             | Error    |
| PS-03   | 无路径嵌套 overlap（`/a` vs `/a/b`）     | Error    |
| PS-04   | 两侧非同一 inode（symlink 解析后）       | Error    |
| PS-05   | 估算 copy 字节 ≤ 目标卷可用空间 × 1.05   | Error    |
| PS-06   | 估算 delete 数量与 versioning 目标可写   | Error    |
| PS-07   | 获取 `sync.commando_lock`（或返回 busy） | Error    |
| PS-08   | 过滤器不会排除 100% 文件                 | Warning  |
| PS-09   | 远程根可达（REM 路径）                   | Error    |

2. **建 Plan** — `plan.BuildReport(req)`：`Index` + `BuildDiff` + `variant` → `Plan` + `Items[]`

**`Prescan` 编排：** `prescan.RunChecks(req)` → 失败则返回；通过则 `plan.BuildReport(req)` → `PrescanReport`。

**保证：** 不 `create` / `write` / `delete` / `rename` 用户数据；可读 DB；DB 更新仅在 Verify 通过后（S-12）。

```go
type PrescanReport struct {
    OK          bool
    Errors      []string
    Warnings    []string
    Stats       PrescanStats   // fileCount, bytesToCopy, bytesToDelete, freeBytes
    Plan        plan.Plan
    Items       []plan.ReportItem
    GeneratedAt time.Time
}
```

#### 2.2.2 Phase 1.1 — Dry-Run（模拟 Execute）

**输入：** `plan.Plan`（来自 Prescan）+ `ExecuteOptions`（`DryRun` **必须为 true**）  
**输出：** `execute.DryRunResult`

- 与 `Execute` **相同** 的 copy/delete/move 分支；写盘前返回
- 统计 `WouldCopy` / `WouldDelete` / `WouldMove` / `WouldSkip`
- 可选：预检目标目录 `W_OK`；失败记入 `Errors`
- **不** 调用 Verify（无真实拷贝）

```go
type DryRunResult struct {
    WouldCopy, WouldDelete, WouldMove, WouldSkip int
    Errors []string
    Items  []DryRunItem
}
```

#### 2.2.3 Phase 2 — Execute

- 仅处理 `copy` / `delete` / `move`；`skip` / `conflict` 跳过
- Copy：`dst.tmp` → `rename(dst)`（S-07）
- Delete：versioning/recycle → remove（SYN-04…08）
- `ErrorPolicy`：`Stop`（默认）或 `Ignore`
- 进度 → `job.ProgressEvent`；**不** 在此阶段更新 DB（S-12）

#### 2.2.4 Phase 3 — Verify

- **仅** 校验 `Result.Copied` 中成功的 `copy`/`move` 行
- size 相等；`VerifyOptions.Enabled` 时二进制 hash 相等（SYN-11）
- 全部通过 → `database.Store.UpdateAfterSync`（S-12）
- 失败 → `VerifyResult.Errors[]`；`ExecuteResult.Verified=false`

```go
type VerifyOptions struct {
    Enabled     bool
    CompareMode engine.CompareMode // 默认 Content
    Parallelism int
}
type VerifyResult struct {
    Checked, Passed, Failed int
    Errors []VerifyError
}
```

#### 2.2.5 UI / Wails 绑定

| UI 动作           | Phase       | Wails                              |
| ----------------- | ----------- | ---------------------------------- |
| Compare           | 1           | `Prescan(req)`                     |
| Sync 预览（可选） | 1.1         | `DryRun(plan, {dryRun:true})`      |
| Synchronize       | 2           | `Execute(plan, opts)`              |
| 设置开启          | 3           | `Verify(plan, result, verifyOpts)` |
| 一键 Sync         | 1→1.1?→2→3? | `RunPipeline` 或 UI 串联           |

`syncSlice`：`prescanReport` | `dryRunResult` | `executeResult` | `verifyResult`

### 2.1 模块目录与 API 规格

**根模块：** `github.com/systembug/commando/internal/sync`  
**底层依赖：** `github.com/systembug/commando/internal/fsutil`（§1.2，独立包，非 sync 子包，`engine`/`execute` 均可直接 import）  
**规则：** 子包之间 **禁止循环依赖**；`remote` 仅被 `engine` / `execute` 调用；Wails/CLI **只 import 根包 `sync`**；`fsutil` 不 import 任何 `sync` 符号（依赖方向单向向下）。

#### 2.1.1 目录树

```
backend/internal/fsutil/        # 独立于 sync，M0 第一交付单元（§1.2）
├── walk.go                # Walk, Entry（现有雏形扶正）
├── stat.go                 # Stat, SameInode
└── space.go                 # FreeSpace

backend/internal/sync/
├── doc.go                 # 包文档
├── api.go                 # Prescan / DryRun / Execute / Verify / RunPipeline
├── errors.go              # 哨兵错误
│
├── prescan/
│   ├── report.go          # PrescanReport, PrescanStats
│   ├── checks.go          # PS-01…09 各项检查（PS-04/05 委托 fsutil.SameInode/FreeSpace）
│   └── space.go           # 磁盘空间估算
│
├── engine/
│   ├── entry.go           # Entry（包装 fsutil.Entry + sync 专属字段）, IndexOptions
│   ├── index.go           # Index, IndexRoot（委托 fsutil.Walk，叠加 filter.Matcher 过滤）
│   ├── compare.go         # CompareMode, Equal, CompareSettings
│   ├── categorize.go      # Category, Categorize
│   └── diff.go            # DiffOp, BuildDiff
│
├── filter/
│   ├── rules.go           # FilterRules, DefaultRules
│   └── matcher.go         # Matcher, Match(path) bool
│
├── database/
│   ├── store.go           # Store interface, Open, Snapshot
│   ├── record.go          # FileRecord, ChangeKind
│   └── detect.go          # DetectChanges, DetectMoves
│
├── variant/
│   ├── id.go                # VariantID, DirectionMode
│   ├── definition.go        # Variant, CustomRules, Preset
│   ├── differences.go       # ApplyDifferences
│   ├── changes.go           # ApplyChanges
│   └── registry.go          # ListVariants, ResolveVariant
│
├── plan/
│   ├── types.go           # Plan, PlanItem, Action, CompareReport, ReportItem
│   ├── build.go           # BuildPlan, BuildReport
│   ├── override.go        # ApplyOverrides（单文件手动方向）
│   └── export.go          # ExportReport, ExportFormat
│
├── execute/
│   ├── runner.go          # Execute, ExecuteOptions
│   ├── copy.go            # copyFile（委托 internal/copy）
│   ├── delete.go          # deleteFile（permanent / recycle / versioning）
│   ├── move.go            # moveFile
│   ├── verify.go          # VerifyCopy
│   ├── versioning.go      # VersioningPolicy
│   ├── trash_darwin.go    # macOS Trash API（OQ-03，build tag darwin）
│   ├── trash_windows.go   # SHFileOperation FOF_ALLOWUNDO（build tag windows）
│   └── trash_linux.go     # XDG Trash spec ~/.local/share/Trash（build tag linux）
│
├── job/
│   ├── manager.go         # Manager, Start, Cancel
│   ├── progress.go        # ProgressEvent
│   └── lock.go            # AcquireLock, ReleaseLock（<root>/.commando/sync.commando_lock，见 §3.7）
│
├── config/
│   ├── profile.go         # SyncProfile（保存的同步配置，功能等价 FFS .ffs_gui，命名不照抄）
│   ├── schedule.go        # SyncSchedule（无人值守作业，功能等价 FFS .ffs_batch，命名不照抄；避免与 job 包的 job.ID/job.Manager 混淆）
│   └── io.go              # LoadProfile, SaveProfile, LoadSchedule, SaveSchedule
│
├── realtime/
│   ├── watcher.go         # Watcher, Run
│   └── config.go          # RealtimeConfig（≈ .ffs_real）
│
└── remote/
    ├── fs.go              # RemoteFS interface（List/Stat/Open）
    ├── local.go           # LocalFS
    ├── sftp.go
    ├── ftp.go
    ├── gdrive.go
    └── mtp.go
```

#### 2.1.2 依赖方向

```
                    ┌─────────┐
                    │  sync   │  api.go（门面）
                    └────┬────┘
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │  plan   │    │  job    │    │ config  │
    └────┬────┘    └────┬────┘    └─────────┘
         │              │
         ▼              ▼
    ┌─────────┐    ┌─────────┐
    │ variant │    │ execute │──► internal/copy
    └────┬────┘    └────┬────┘
         │              │
    ┌────┴────┐         │
    ▼         ▼         ▼
┌────────┐ ┌──────────┐ ┌────────┐
│ engine │ │ database │ │ remote │
└───┬────┘ └──────────┘ └───┬────┘
    │                       │
    ▼                       │
┌────────┐                  │
│ filter │◄─────────────────┘（remote 列表经 filter）
└────────┘

realtime ──► config + job（触发 batch）
```

| 从                | 可 import                                                | 禁止 import                                       |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------- |
| `sync`（根）      | 所有子包 + `internal/fsutil`                             | —                                                 |
| `plan`            | `engine`, `variant`, `filter`                            | `execute`, `job`, `database`                      |
| `variant`         | `engine`, `database`, `plan/types`                       | `execute`                                         |
| `engine`          | `internal/fsutil`, `filter`, `remote`                    | `variant`, `plan`, `execute`                      |
| `execute`         | `plan`, `remote`, `internal/copy`, `internal/fsutil`     | `variant`                                         |
| `database`        | `engine`, `internal/fsutil`                              | `variant`, `execute`                              |
| `job`             | `plan`, `execute`                                        | `variant`                                         |
| `config`          | `plan`, `variant`, `filter`                              | `execute`                                         |
| `realtime`        | `config`, `job`                                          | `engine`                                          |
| `remote`          | 标准库 + 第三方协议库 + `internal/fsutil`（local.go 用） | 其他 sync 子包                                    |
| `internal/fsutil` | 仅标准库                                                 | **任何 `sync` 子包**（单向依赖，fsutil 是最底层） |

#### 2.1.3 根包 `sync` 公开 API（Wails / CLI 唯一入口）

```go
// api.go — Wails / CLI 唯一入口

func Prescan(ctx context.Context, req PrescanRequest) (*plan.PrescanReport, error)
func DryRun(ctx context.Context, plan plan.Plan, opts execute.ExecuteOptions) (*execute.DryRunResult, error)
func Execute(ctx context.Context, plan plan.Plan, opts execute.ExecuteOptions) (*execute.Result, error)
func Verify(ctx context.Context, plan plan.Plan, result *execute.Result, vopts execute.VerifyOptions) (*execute.VerifyResult, error)

func Compare(ctx context.Context, req PrescanRequest) (*plan.PrescanReport, error) // 别名 → Prescan，待删
func ExportReport(report *plan.PrescanReport, path string, format plan.ExportFormat) error
func ListVariants() []variant.Variant
func ListCompareModes() []engine.CompareMode
func RunPipeline(ctx context.Context, req PipelineRequest) (*PipelineResult, error) // 可选串联 1→1.1→2→3
func StartJob(ctx context.Context, kind JobKind, fn JobFunc) (job.ID, error)
func CancelJob(id job.ID) error
// LoadSyncProfile / SaveSyncProfile / LoadSyncSchedule / SaveSyncSchedule …
```

```go
type PrescanRequest struct {
    LeftRoot, RightRoot string
    VariantID           variant.VariantID
    Direction           variant.Direction
    CompareMode         engine.CompareMode
    CompareSettings     engine.CompareSettings
    Filter              filter.FilterRules
    VariantMode         variant.Mode
    Overrides           []plan.ItemOverride
    // 禁止 ExecuteOptions — Prescan 永不写盘
}

type PipelineRequest struct {
    Prescan   PrescanRequest
    Execute   execute.ExecuteOptions
    Verify    execute.VerifyOptions
    RunDryRun bool // 是否执行 Phase 1.1
}
```

**废弃（M0 移除）：** `StrategyID`, `BuildPlan(left, right, direction, opts)`, TS `SYNC_STRATEGY_*`。

#### 2.1.3.1 CLI 输出契约：NDJSON + 流式（CLI-first 核心约束）

**CLI 是 M0–M2 主要交付形态（见 §6），必须能在大目录树上实时看到进度，不能等 Compare/Execute 全部跑完才吐结果。** Go API 本身（`Prescan`/`Execute` 等）签名不变，仍是一次性返回完整结构体；流式行为在 **CLI 命令层**通过订阅 `job.ProgressEvent` 实现，两者不冲突：

- **stdout 每行一个 JSON 对象**（[NDJSON](http://ndjson.org/)），非缓冲的单个大 JSON blob
- 每行必带 `"type"` 字段区分：`"progress"`（单条 `job.ProgressEvent`）、`"item"`（单条 `plan.ReportItem`，Compare 阶段边扫描边吐）、`"result"`（终态汇总，含 `counts`，一次性、放最后一行）、`"error"`（非致命单项错误，不中止流）
- 进程内部：CLI 命令 goroutine 调 `sync.Prescan`/`sync.Execute` 前，先向 `job.Manager.Subscribe` 注册回调，回调里把 `ProgressEvent`/`ReportItem` 序列化成一行 JSON 立即 flush 到 stdout；API 调用返回后再吐最后一行 `"result"`
- **`--json` 单发模式**（向后兼容旧脚本）：不开流式，等价于把所有 NDJSON 行收集后合并成 §7.2.2 那种单个 `expected.json`-like 结构一次性打印；`--json` 与默认流式模式互斥
- `commando sync export`（CLI-03）不流式——导出是终态文件写入，一次性完整输出

```
$ commando sync compare --left L --right R --variant mirror
{"type":"item","relativePath":"a.txt","category":"left-only","action":"copy"}
{"type":"progress","phase":"prescan","current":120,"total":500,"path":"b/c.txt"}
{"type":"item","relativePath":"b/c.txt","category":"equal","action":"skip"}
{"type":"result","counts":{"toCopy":1,"toDelete":0,"conflicts":0,"toSkip":1}}
```

**测试要求：** §7.12.12 CLI 测试须新增 `TestCLISyncCompare_NDJSONStreaming`（断言 stdout 逐行可独立 `json.Unmarshal`，且 `"result"` 行必为最后一行）；不得只测 `--json` 单发模式。

#### 2.1.4 子包公开 API 摘要

##### `engine`

| 符号                                                                                            | 说明                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `type Entry`                                                                                    | RelPath, AbsPath, IsDir, Size, ModTime, FileID? |
| `type Index map[string]Entry`                                                                   | 一侧根目录索引                                  |
| `func IndexRoot(ctx, root, filter.Matcher, IndexOptions) (Index, error)`                        | 遍历建索引                                      |
| `type CompareMode`                                                                              | `TimeAndSize`, `Content`, `SizeOnly`            |
| `type CompareSettings`                                                                          | ToleranceSec, SymlinkMode, Parallelism          |
| `type SymlinkMode`                                                                              | `Exclude`, `AsLink`, `Follow`                   |
| `func Equal(a, b Entry, mode CompareMode, settings CompareSettings) (bool, error)`              | 文件相等                                        |
| `type Category`                                                                                 | `LeftOnly` … `Conflict`, `TypeMismatch`         |
| `func Categorize(left, right *Entry, mode CompareMode, settings) (Category, string /*reason*/)` | 归入 CAT-*                                      |
| `type DiffOp`                                                                                   | RelPath, Category, Left, Right, Reason          |
| `func BuildDiff(leftIdx, rightIdx Index) []DiffOp`                                              | 并集 diff                                       |

##### `filter`

| 符号                                         | 说明                                     |
| -------------------------------------------- | ---------------------------------------- |
| `type FilterRules`                           | Include, Exclude []string                |
| `func DefaultRules() FilterRules`            | FFS 默认排除项                           |
| `type Matcher interface`                     | `Match(relPath string, isDir bool) bool` |
| `func NewMatcher(rules FilterRules) Matcher` | include 且非 exclude                     |

##### `database`

| 符号                                                                                   | 说明                                |
| -------------------------------------------------------------------------------------- | ----------------------------------- |
| `type Store interface`                                                                 | Load, Save, UpdateAfterSync         |
| `func Open(path string) (Store, error)`                                                | `sync.commando_db`                  |
| `type Change`                                                                          | RelPath, Kind ChangeKind, Side Side |
| `func DetectChanges(store Store, leftIdx, rightIdx engine.Index) ([]Change, error)`    | CHG-*                               |
| `func DetectMoves(changes []Change, leftIdx, rightIdx engine.Index) ([]Change, error)` | CHG-08                              |

##### `variant`

| 符号                                                                                                      | 说明                                                                                         |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `type VariantID`                                                                                          | `mirror`, `update`, `two-way`, `custom`, + 预设 `mirror-right` 等                            |
| `type Mode`                                                                                               | `Differences`, `Changes`                                                                     |
| `type Variant`                                                                                            | ID, Label, Description, Mode, Direction, Rules                                               |
| `type SyncAction`                                                                                         | 对应 §3.3 ACT-*                                                                              |
| `func ApplyDifferences(diffs []engine.DiffOp, v Variant, ctx ApplyContext) []plan.PlanItem`               | 无 DB                                                                                        |
| `func ApplyChanges(dbPath string, left, right engine.Index, v Variant, ctx ApplyContext) []plan.PlanItem` | 内部完成 `database.Open` + `DetectChanges` + `DetectMoves`，对 `plan` 层隐藏 `database` 符号 |
| `func ListVariants() []Variant`                                                                           | UI 下拉                                                                                      |
| `func ResolveVariant(id VariantID) (Variant, error)`                                                      |                                                                                              |

##### `plan`

| 符号                                                                               | 说明                                                                    |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `type Action`                                                                      | `copy`, `delete`, `skip`, `conflict`, `move`                            |
| `type PlanItem`                                                                    | RelativePath, Action, Source, Destination, Reason, Category, SyncAction |
| `type Plan`                                                                        | LeftRoot, RightRoot, Variant, Items, counts                             |
| `type CompareReport`                                                               | Strategy/Variant, roots, GeneratedAt, Items, Plan, counts               |
| `type ItemOverride`                                                                | RelativePath, Action SyncAction                                         |
| `func BuildReport(req CompareRequest) (*CompareReport, error)`                     | 编排入口                                                                |
| `func ApplyOverrides(plan *Plan, overrides []ItemOverride)`                        | UI-15                                                                   |
| `func ExportReport(report *CompareReport, w io.Writer, format ExportFormat) error` |                                                                         |

##### `execute`

| 符号                                                                                      | 说明                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `type ExecuteOptions`                                                                     | DryRun, DeleteHandling, Verify, Parallelism, ErrorPolicy |
| `type DeleteHandling`                                                                     | `Permanent`, `RecycleBin`, `Versioning`                  |
| `type Result`                                                                             | Copied, Deleted, Moved, Skipped, Errors                  |
| `func Execute(ctx context.Context, plan plan.Plan, opts ExecuteOptions) (*Result, error)` |                                                          |
| `func ExecuteItem(ctx context.Context, item plan.PlanItem, opts ExecuteOptions) error`    | 单项                                                     |

##### `job`

| 符号                                                        | 说明                                        |
| ----------------------------------------------------------- | ------------------------------------------- |
| `type ID string`                                            | jobId                                       |
| `type ProgressEvent`                                        | JobID, Phase, Current, Total, Path, Message |
| `type Manager`                                              | Start, Cancel, Subscribe                    |
| `func AcquireLock(root string) (release func(), err error)` | `sync.commando_lock`                        |

##### `config`

| 符号                                                           | 说明                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `type SyncProfile`                                             | FolderPairs[], CompareSettings, Variant, Filter, Overrides |
| `type SyncSchedule`                                            | SyncProfile + RunOptions（无 UI、返回码）                  |
| `type FolderPair`                                              | LeftRoot, RightRoot, Label                                 |
| `func LoadProfile / SaveProfile / LoadSchedule / SaveSchedule` | JSON（见 §4.6 CFG-01 起，不做 FFS XML 兼容层）             |

##### `realtime`

| 符号                                           | 说明                        |
| ---------------------------------------------- | --------------------------- |
| `type RealtimeConfig`                          | WatchPaths, Command, IdleMs |
| `type Watcher`                                 | Run(ctx), Stop()            |
| `func NewWatcher(cfg RealtimeConfig) *Watcher` |                             |

##### `remote`

| 符号                                                      | 说明                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| `type RemoteFS interface`                                 | `Root() string`, `Walk(ctx, Matcher) (engine.Index, error)` |
| `func NewLocal(path string) RemoteFS`                     |                                                             |
| `func NewSFTP(cfg SFTPConfig) (RemoteFS, error)`          |                                                             |
| `func NewFTP(cfg FTPConfig) (RemoteFS, error)`            |                                                             |
| `func NewGoogleDrive(cfg GDriveConfig) (RemoteFS, error)` |                                                             |
| `func NewMTP(cfg MTPConfig) (RemoteFS, error)`            |                                                             |

#### 2.1.5 Wails 层（`apps/desktop/services/sync.go`）

| 方法                                  | 委托                                             |
| ------------------------------------- | ------------------------------------------------ |
| `Compare(SyncRequest)`                | `Prescan` → `sync.Compare`                       |
| `Execute(Plan, opts)`                 | `sync.Execute` → `sync.Verify`（若 opts.Verify） |
| `Prescan(SyncRequest)`                | `sync.Prescan`（可选单独暴露）                   |
| `Verify(Plan, result)`                | `sync.Verify`                                    |
| `ExportReport`                        | `sync.ExportReport`                              |
| `ListVariants`                        | `sync.ListVariants`                              |
| `ListCompareModes`                    | `sync.ListCompareModes`                          |
| `CancelSync(jobId)`                   | `sync.CancelJob`                                 |
| `LoadSyncProfile` / `SaveSyncProfile` | `sync.LoadSyncProfile` / `Save`                  |
| `RunSchedule(path)`                   | `config.LoadSchedule` + `sync.Execute`           |

**Wails 禁止：** import `engine` / `variant` 子包；仅 `github.com/systembug/commando/internal/sync`。

#### 2.1.6 UI 模块（`packages/ui/src/`）

| 路径                                        | 职责                    | §4 项    |
| ------------------------------------------- | ----------------------- | -------- |
| `components/sync/SyncPane.tsx`              | 双栏 + 网格             | UI-01    |
| `components/sync/SyncToolbar.tsx`           | Compare / Sync / Export | UI-02,06 |
| `components/sync/SyncSettingsDialog.tsx`    | F8 同步设置             | UI-04    |
| `components/sync/CompareSettingsDialog.tsx` | 比较设置                | UI-03    |
| `components/sync/FilterDialog.tsx`          | Include/Exclude         | UI-05    |
| `components/sync/SyncPlanModal.tsx`         | 预览 + from→to          | UI-07    |
| `components/sync/SyncTreePanel.tsx`         | 树形总览                | UI-08    |
| `components/sync/SyncCategoryFilter.tsx`    | 类别筛选                | UI-09    |
| `components/sync/SyncProgressModal.tsx`     | 进度                    | UI-20,21 |
| `components/sync/SyncResultDialog.tsx`      | 结果                    | UI-22    |
| `components/sync/SyncLegend.tsx`            | 7 类着色                | UI-11    |
| `components/sync/MultiRenameDialog.tsx`     | 批量重命名              | UI-25    |
| `app/syncSlice.ts`                          | report/plan/job 状态    | —        |
| `services/syncApiService.ts`                | `window.syncApi` 薄封装 | —        |
| ~~`constants/sync.ts`~~                     | **删除**                | DEC-06   |

#### 2.1.7 编排流（`plan.BuildReport` 伪代码）

```go
// plan 包禁止 import database（§2.1.2 依赖表）；changes 模式下的 DB 读取
// 封装在 variant.ApplyChanges 内部完成，BuildReport 本身不碰 database 符号。
func BuildReport(req CompareRequest) (*CompareReport, error) {
    // 纯建 Plan；由 Prescan 在 prescan.RunChecks 通过后调用（不写盘）
    matcher := filter.NewMatcher(req.Filter)
    leftIdx, _ := engine.IndexRoot(ctx, req.LeftRoot, matcher, opts)
    rightIdx, _ := engine.IndexRoot(ctx, req.RightRoot, matcher, opts)
    diffs := engine.BuildDiff(leftIdx, rightIdx)

    v, _ := variant.ResolveVariant(req.VariantID)
    var items []plan.PlanItem
    switch v.Mode {
    case variant.Differences:
        items = variant.ApplyDifferences(diffs, v, ctx)
    case variant.Changes:
        // variant.ApplyChanges 内部自行 database.Open/DetectChanges/DetectMoves，
        // plan 层只传路径，不导入 database 包
        items = variant.ApplyChanges(dbPath(req), leftIdx, rightIdx, v, ctx)
    }
    plan := plan.Assemble(req.LeftRoot, req.RightRoot, v, items)
    plan.ApplyOverrides(req.Overrides)
    return plan.AsReport(time.Now().UTC()), nil
}
```

#### 2.1.8 测试包布局

```
backend/internal/sync/
├── engine/*_test.go
├── variant/*_test.go          # 表驱动：§3.4 每张表一行 case
└── testdata/ffs_reference/    # FFS 14.x golden（§7.1）
    └── mirror-l2r/right-newer/
        ├── left/
        ├── right/
        └── expected.json
```

---

## 3. 核心数据模型

### 3.1 Compare 类别（Time + Size 模式）

| ID       | 类别          | 条件                  |
| -------- | ------------- | --------------------- |
| `CAT-01` | left-only     | 仅左有                |
| `CAT-02` | right-only    | 仅右有                |
| `CAT-03` | left-newer    | 两侧有，左 mtime 新   |
| `CAT-04` | right-newer   | 两侧有，右 mtime 新   |
| `CAT-05` | equal         | mtime + size 相同     |
| `CAT-06` | conflict      | mtime 相同，size 不同 |
| `CAT-07` | type-mismatch | 一侧文件一侧目录      |

Content 模式：`equal` / `different-content`  
Size 模式：`equal` / `different-size`

### 3.2 Changes 类别（DB 模式）

| ID       | 变更         | 说明                       |
| -------- | ------------ | -------------------------- |
| `CHG-01` | create-left  | 左新增（相对上次 sync）    |
| `CHG-02` | create-right | 右新增                     |
| `CHG-03` | update-left  | 左修改                     |
| `CHG-04` | update-right | 右修改                     |
| `CHG-05` | delete-left  | 左删除                     |
| `CHG-06` | delete-right | 右删除                     |
| `CHG-07` | conflict     | 双侧修改同一文件           |
| `CHG-08` | move         | 检测到的移动（需 file ID） |

### 3.3 同步动作（FFS 可循环动作全集）

| ID       | 动作                                                 |
| -------- | ---------------------------------------------------- |
| `ACT-01` | Copy new item to left                                |
| `ACT-02` | Copy new item to right                               |
| `ACT-03` | Update left item                                     |
| `ACT-04` | Update right item                                    |
| `ACT-05` | Delete left item                                     |
| `ACT-06` | Delete right item                                    |
| `ACT-07` | Do nothing                                           |
| `ACT-08` | Leave as unresolved conflict                         |
| `ACT-09` | Move（优化：create+delete，需 DB + delete 动作启用） |

### 3.4 预设变体默认动作表（Differences 模式，无 DB）

> **来源标注约定：** 🟢实测（FFS 14.x golden 已录制）· 🟡文档（FreeFileSync 官方手册/论坛，未实机验证）· 🔴推断（RFC 作者按常识猜测，**批准前必须转 OQ 并关闭**，见 §12）。表中任何一行标 🔴 都视为不具约束力，禁止据此实现，直到转为 OQ 并关闭或补 golden 升级为 🟢。

#### Mirror（左 → 右）

| 类别        | 动作                                      | 来源                   |
| ----------- | ----------------------------------------- | ---------------------- |
| left-only   | Copy new item to right                    | 🟡文档                 |
| right-only  | Delete right item                         | 🟡文档                 |
| left-newer  | Update right item                         | 🟡文档                 |
| right-newer | **Update right item**（左赢，覆盖较新右） | 🟡文档                 |
| equal       | Do nothing                                | 🟡文档                 |
| conflict    | Update right item                         | 🔴推断，需 golden 验证 |

#### Update（左 → 右，FFS 13 前 differences 模式 — 保留兼容）

| 类别        | 动作                         | 来源                                             |
| ----------- | ---------------------------- | ------------------------------------------------ |
| left-only   | Copy new item to right       | 🟡文档                                           |
| right-only  | Do nothing                   | 🟡文档                                           |
| left-newer  | Update right item            | 🟡文档                                           |
| right-newer | Do nothing                   | 🟡文档（T-SEM-01 关键用例，已入 §7.12.6 golden） |
| equal       | Do nothing                   | 🟡文档                                           |
| conflict    | Leave as unresolved conflict | 🟡文档                                           |

#### Update（FFS 13+ changes 模式，**默认**，需 DB）

| 变更         | 动作                         | 来源              |
| ------------ | ---------------------------- | ----------------- |
| create-left  | Copy to right                | 🟡文档            |
| update-left  | Update right                 | 🟡文档            |
| delete-left  | **Do nothing** on right      | 🔴推断，**OQ-05** |
| create-right | **Do nothing**               | 🟡文档            |
| update-right | **Do nothing**               | 🟡文档            |
| delete-right | **Do nothing**（不重新拷回） | 🔴推断，**OQ-05** |
| conflict     | Unresolved                   | 🟡文档            |

> ⚠️ **OQ-05（待验证，批准前必须关闭）：** 上表 `delete-left`/`delete-right` 行为为**推断**，非从 FFS 14.x 实测录制。Update 变体对「源侧删除」是否传播到目标侧、还是保留目标侧文件不动，需用 FFS 14.x 实机录制 golden fixture 确认（见 §7.2.3 SOP），确认前禁止实现此表。关闭方式同 §12。

#### Two-way（changes 模式，**必须 DB**）

双向传播 create/update/delete；双侧修改 → conflict；用户可逐文件选手动方向。**来源：🟡文档**（FFS Two-way 定性描述明确；create/update/delete 六种组合的逐格动作表本 RFC **尚未列出**，M2 实施前须补全表并逐行标来源，禁止仅凭"双向传播"四字实现）。

### 3.5 Custom 变体

用户对 **每个 Compare 类别** 或 **每个 Change 类型（L/R × create/update/delete）** 独立指定 `ACT-*`。  
UI：点击动作图标循环 — 与 FFS F8 一致。

### 3.6 数据库文件

| FFS                            | Commando                                             |
| ------------------------------ | ---------------------------------------------------- |
| `sync.ffs_db`                  | `.commando/sync.commando_db`（格式可不同，语义 1:1） |
| `sync.ffs_lock`                | `.commando/sync.commando_lock`                       |
| `.ffs_gui`（存于用户选定路径） | `.commando/profile.json`（**SyncProfile**，见下）    |
| 每 folder pair 两侧各一份      | 同                                                   |

### 3.7 SyncProfile 存放位置

**SyncProfile 跟随 sync root，不进全局 `~/.commando` 配置目录。**

- 路径：`<leftRoot>/.commando/profile.json` **与** `<rightRoot>/.commando/profile.json`，两侧各存一份
- 与 `sync.commando_db` / `sync.commando_lock` 同放 `.commando/` 子目录，不直接散落在 sync root 根部
- 两侧各存一份的原因：任一侧目录被单独移动/复制/挂载，仍能在该侧原地找到自己的同步配置，无需依赖另一侧存在——与 `commando_db` 双份存放策略一致
- `~/.commando` **仅** 存跨 profile 的全局设置（CFG-01 全局设置项、最近打开列表等），不存具体某对目录的同步配置
- `SyncSchedule`（`.commando-schedule.json`，原 BatchConfig）用户可自由选路径（供任务计划程序/cron 调用），不强制跟随 sync root

#### 3.7.1 两侧 SyncProfile 不一致时的冲突规则

两份 profile 各自独立存放，必然出现「用户只改了左侧 filter，没同步改右侧」「只在一侧打开过一次 app，右侧 profile 从未创建」等情况。**规则（对齐 S-04 conflict 永不自动执行的精神）：**

| 场景                 | 处理                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 仅一侧存在 profile   | 以存在的一侧为准，静默复制到另一侧（写入而非静默丢弃）                                                                                                                                       |
| 两侧都存在且内容相同 | 正常使用，无提示                                                                                                                                                                             |
| 两侧都存在但内容不同 | **不自动选择、不静默合并**；UI 提示"两侧配置不一致"，展示 diff，用户显式选一侧或手动合并后保存；CLI 模式下 `--profile-conflict=left\|right\|abort`（默认 `abort`，非交互环境下拒绝静默猜测） |
| 两侧都不存在         | 走 UI-01 正常新建流程                                                                                                                                                                        |

**理由：** SyncProfile 冲突和 Two-way 文件冲突（CHG-07）性质相同——数据不一致时静默选一方等于隐藏用户的真实意图，必须显式暴露。

## 4. 全功能清单（1:1 验收表）

状态图例：⬜ 未做 · 🟡 部分 · ✅ 完成 · 🔀 已拆出至独立 RFC（不删除条目，保留行号+去向登记）

> ⚠️ **状态列以 `testdata/traceability.json`（§7.4）为唯一权威来源，M0 起由 CI 校验生成，禁止手工改状态列。** PR 若手改状态列而无对应 golden/单元测试提交，视为无效，CI 应拒绝。

### 4.1 主界面与工作流

| ID    | FreeFileSync 功能                | 验收标准                                             | 状态 |
| ----- | -------------------------------- | ---------------------------------------------------- | ---- |
| UI-01 | 选择左/右文件夹                  | 浏览 + 路径输入 + 历史                               | ⬜   |
| UI-02 | Compare 按钮                     | 触发比较，填充网格                                   | 🟡   |
| UI-03 | 比较设置入口                     | 等价 F8 Compare 页                                   | ⬜   |
| UI-04 | 同步设置入口                     | 等价 F8 Sync 页                                      | ⬜   |
| UI-05 | 过滤器入口                       | Include/Exclude 对话框                               | ⬜   |
| UI-06 | Synchronize 按钮                 | 预览后执行                                           | 🟡   |
| UI-07 | 同步预览（逐行动作）             | 每文件显示动作箭头                                   | 🟡   |
| UI-08 | 树形总览面板                     | 目录树 + 统计                                        | ⬜   |
| UI-09 | 类别筛选器                       | 按 CAT/CHG 过滤网格                                  | ⬜   |
| UI-10 | 同步统计栏                       | 文件数/字节/操作计数                                 | 🟡   |
| UI-11 | 图例/着色                        | 7+ 类别颜色与 FFS 一致                               | 🟡   |
| UI-12 | 保存/加载同步配置（SyncProfile） | `.commando-profile.json`，功能等价 FFS `.ffs_gui`    | ⬜   |
| UI-13 | 保存无人值守作业（SyncSchedule） | `.commando-schedule.json`，功能等价 FFS `.ffs_batch` | ⬜   |
| UI-14 | 多 Folder Pair                   | 单配置多对目录                                       | ⬜   |
| UI-15 | 单文件手动改方向                 | 右键/图标循环动作                                    | ⬜   |
| UI-16 | 文件夹批量改方向                 | 对子树应用                                           | ⬜   |
| UI-17 | 双击打开资源管理器               | `explorer /select` 等价                              | ⬜   |
| UI-18 | 自定义外部工具                   | 宏 `%item_path%` `%item2_path%` 等                   | ⬜   |
| UI-19 | 右键上下文菜单                   | 可配置多条命令                                       | ⬜   |
| UI-20 | 比较进度对话框                   | 大目录扫描进度                                       | ⬜   |
| UI-21 | 同步进度对话框                   | 总进度 + 当前文件 + ETA                              | ⬜   |
| UI-22 | 结果对话框                       | 成功/警告/错误统计                                   | ⬜   |
| UI-23 | 完成后行为                       | 自动关闭/保持打开                                    | ⬜   |
| UI-24 | LastSyncs.log                    | 最近 N 次同步日志                                    | ⬜   |
| UI-25 | 多文件重命名工具                 | FFS 13+ Rename 窗口                                  | ⬜   |
| UI-26 | 空间分布树                       | 目录树显示大小/文件数                                | ⬜   |

### 4.2 比较（Compare）

| ID     | 功能                         | 验收              | 状态 |
| ------ | ---------------------------- | ----------------- | ---- |
| CMP-01 | Compare by time and size     | 默认；7 类        | 🟡   |
| CMP-02 | Compare by content           | 二进制相等        | ⬜   |
| CMP-03 | Compare by size only         | 仅 size           | ⬜   |
| CMP-04 | 符号链接 Exclude             | 跳过              | ⬜   |
| CMP-05 | 符号链接 As link             | 拷贝链接本身      | ⬜   |
| CMP-06 | 符号链接 Follow              | 遍历目标          | ⬜   |
| CMP-07 | 识别 junction/mount/WSL link | 同 FFS 列表       | ⬜   |
| CMP-08 | File time tolerance 2s       | 可配置；`-1`=无限 | ⬜   |
| CMP-09 | FAT DST/时区修正             | 元数据编码方案    | ⬜   |
| CMP-10 | 并行目录遍历                 | 多请求并行        | ⬜   |
| CMP-11 | 并行二进制比较               | content 模式      | ⬜   |
| CMP-12 | 长路径 >260                  | Windows 支持      | ⬜   |
| CMP-13 | Unicode 文件名               | 全平台            | ⬜   |

### 4.3 同步变体（Sync Variants）

| ID     | 功能                                 | 验收                | 状态 |
| ------ | ------------------------------------ | ------------------- | ---- |
| VAR-01 | Mirror（differences，无 DB）         | §3.4 动作表         | 🟡   |
| VAR-02 | Update（differences，遗留）          | §3.4 动作表         | ❌   |
| VAR-03 | Update（changes，FFS 13+，**默认**） | §3.4 + DB           | ❌   |
| VAR-04 | Two-way（changes）                   | DB 必须             | ❌   |
| VAR-05 | Custom（differences）                | 每类可选 ACT        | ⬜   |
| VAR-06 | Custom（changes）                    | 每 CHG 可选 ACT     | ⬜   |
| VAR-07 | 变体切换不丢过滤器                   | 配置持久化          | ⬜   |
| VAR-08 | Mirror 可 swap 左右                  | 等价 FFS 交换文件夹 | ⬜   |

### 4.4 同步高级选项

| ID     | 功能                        | 验收                                                                                                                                                        | 状态 |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| SYN-01 | Use database file           | 读写 `sync.commando_db`                                                                                                                                     | ❌   |
| SYN-02 | Detect moved files          | DB + file ID；fallback copy+delete                                                                                                                          | ❌   |
| SYN-03 | 删除：Permanent             | `os.Remove`                                                                                                                                                 | 🟡   |
| SYN-04 | 删除：Recycle Bin           | 每平台原生 API，见 OQ-03：macOS Trash API / Windows `SHFileOperation` / Linux XDG Trash spec；`execute/trash_<GOOS>.go` 按 build tag 分文件，禁止 shell out | ⬜   |
| SYN-05 | 删除：Versioning            | 见 SYN-06–08                                                                                                                                                | ⬜   |
| SYN-06 | Versioning Timestamp        | 路径+时间戳文件名                                                                                                                                           | ⬜   |
| SYN-07 | Versioning Replace          | 仅保留最新                                                                                                                                                  | ⬜   |
| SYN-08 | Versioning 宏路径           | `%timestamp%` `%date%` 等                                                                                                                                   | ⬜   |
| SYN-09 | 错误处理 Stop               | 遇错中止                                                                                                                                                    | ⬜   |
| SYN-10 | 错误处理 Ignore             | 继续并汇总                                                                                                                                                  | ⬜   |
| SYN-11 | Verify copied files         | 拷贝后二进制校验                                                                                                                                            | ⬜   |
| SYN-12 | Copy locked files (VSS)     | Windows Shadow Copy                                                                                                                                         | ⬜   |
| SYN-13 | 自动创建缺失目录            | mkdir -p                                                                                                                                                    | 🟡   |
| SYN-14 | 保留 mtime/权限/ADS         | NTFS 扩展属性                                                                                                                                               | ⬜   |
| SYN-15 | Fail-safe copy 算法         | 断电不损坏                                                                                                                                                  | ⬜   |
| SYN-16 | 并行文件操作数              | 每设备可配置                                                                                                                                                | ⬜   |
| SYN-17 | 磁盘空间峰值优化            | 执行顺序                                                                                                                                                    | ⬜   |
| SYN-18 | Lock directories (`*.lock`) | 多实例互斥                                                                                                                                                  | ⬜   |
| SYN-19 | Background priority         | 降低 IO 优先级                                                                                                                                              | ⬜   |
| SYN-20 | 邮件同步报告                | 可选集成                                                                                                                                                    | ⬜   |

### 4.5 过滤器

| ID     | 功能                     | 验收                                                   | 状态 |
| ------ | ------------------------ | ------------------------------------------------------ | ---- |
| FLT-01 | Include 列表（默认 `*`） | 至少匹配一条                                           | ⬜   |
| FLT-02 | Exclude 列表             | 不匹配任一条                                           | ⬜   |
| FLT-03 | 通配符 `*` `?`           | 相对路径                                               | ⬜   |
| FLT-04 | 默认排除系统项           | `$Recycle.Bin` `System Volume Information` `thumbs.db` | ⬜   |
| FLT-05 | 目录匹配→子项全匹配      | FFS 规则                                               | ⬜   |
| FLT-06 | 网格右键快速排除         | 加入 exclude                                           | ⬜   |
| FLT-07 | 路径分隔符提示 `\`       | 仅目录                                                 | ⬜   |
| FLT-08 | Exclude 覆盖 Include     | 优先级                                                 | ⬜   |

### 4.6 配置与 CLI

| ID     | 功能                        | 验收                                    | 状态 |
| ------ | --------------------------- | --------------------------------------- | ---- |
| CLI-01 | `commando sync compare`     | 逐行 NDJSON 输出，见 §2.1.3.1           | 🟡   |
| CLI-02 | `commando sync run`         | 执行 plan/schedule；NDJSON 进度流       | 🟡   |
| CLI-03 | `commando sync export`      | json/csv/text（终态一次性文件，非流式） | 🟡   |
| CLI-04 | `-leftdir` `-rightdir` 覆盖 | 同 FFS                                  | ⬜   |
| CLI-05 | 返回码 0/1/2/3              | 成功/警告/错误/中止                     | ⬜   |
| CLI-06 | 合并多配置文件              | 多 folder pair                          | ⬜   |
| CLI-07 | Schedule 无 GUI 运行        | 无弹窗阻塞                              | ⬜   |
| CFG-01 | 全局设置 XML 等价           | `GlobalSettings.xml` 项                 | ⬜   |
| CFG-02 | 宏展开                      | `%timestamp%` 环境变量                  | ⬜   |
| CFG-03 | 可变盘符/卷名路径           | `\folder` `[VOL]\folder`                | ⬜   |

### 4.7 RealtimeSync

| ID     | 功能                              | 验收          | 状态 |
| ------ | --------------------------------- | ------------- | ---- |
| RTS-01 | 监控目录变更                      | OS 文件事件   | ⬜   |
| RTS-02 | 目录可用时触发                    | USB 插入      | ⬜   |
| RTS-03 | Idle time 防抖                    | 可配置        | ⬜   |
| RTS-04 | 执行 command line                 | 触发 batch    | ⬜   |
| RTS-05 | `.commando_real` 配置             | ≈ `.ffs_real` | ⬜   |
| RTS-06 | `%change_path%` `%change_action%` | 环境变量      | ⬜   |
| RTS-07 | 作为服务运行                      | 开机/用户登录 | ⬜   |

### 4.8 远程与云

| ID     | 功能                | 验收                                     | 状态 |
| ------ | ------------------- | ---------------------------------------- | ---- |
| REM-01 | 本地 + SMB 网络共享 | 已有路径                                 | 🟡   |
| REM-02 | SFTP                | 原生客户端                               | ⬜   |
| REM-03 | FTP / FTPS          | 原生客户端                               | ⬜   |
| REM-04 | Google Drive        | ~~直接 API~~ **已拆出**（OQ-02，见 §9）  | 🔀   |
| REM-05 | MTP 设备            | ~~手机/相机~~ **已拆出**（OQ-02，见 §9） | 🔀   |
| REM-06 | 远程列表缓存        | 增量 delta                               | ⬜   |
| REM-07 | 远程并行传输        | 可配置                                   | ⬜   |

### 4.9 报告与导出

| ID     | 功能                   | 验收                  | 状态 |
| ------ | ---------------------- | --------------------- | ---- |
| RPT-01 | CompareReport json     | from/to/action/reason | 🟡   |
| RPT-02 | Export csv             | 标准列                | 🟡   |
| RPT-03 | Export text            | 人类可读              | 🟡   |
| RPT-04 | 同步会话 HTML/文本日志 | 可选                  | ⬜   |

---

## 5. Commando 当前致命偏差（必须修复）

| #    | 偏差                              | FFS 正确行为                                |
| ---- | --------------------------------- | ------------------------------------------- |
| D-01 | `update-*` 在 right-newer 仍 copy | **Do nothing**                              |
| D-02 | `two-way` 用 mtime，无 DB         | **changes + sync.ffs_db**                   |
| D-03 | 无 Custom 变体                    | 必须支持                                    |
| D-04 | 无 Compare by content/size        | 必须三种比较模式                            |
| D-05 | 硬编码 exclude 隐藏文件           | 应用 FLT 默认 + 用户规则                    |
| D-06 | 五策略 ID 代替 FFS 变体模型       | 改为 Mirror/Update/TwoWay/Custom + 方向模式 |
| D-07 | TS 侧策略常量                     | 删除，Go 唯一来源                           |
| D-08 | 无单文件方向覆盖                  | UI-15 必须                                  |
| D-09 | 无 moved file 检测                | SYN-02 必须                                 |
| D-10 | Update FFS13 未实现 changes 语义  | VAR-03 必须                                 |

**现有 `mirror-right` 等 ID 可保留为 Custom 预设快捷方式，但不得替代完整变体系统。**

---

## 6. 实施路线（顺序 only，不削减范围）

全部 §4 条目完成才算 **RFC-012 Done**。

**交付形态：CLI-first。** `internal/sync` 引擎 + `commando sync` CLI 子命令是 M0–M2 的主要交付形态；Wails/UI 是**后装的薄客户端**，UI 任务往后排到 M3+，不在早期里程碑抢先实现（避免引擎语义未稳定前 UI 先绑死错误假设）。CLI 与 Wails 调用同一套 `internal/sync` 根包 API（§2.1.3），互不阻塞对方实现，但 CLI 先行验证引擎正确性。

**交付顺序：文件系统层先行，逐包 100% 覆盖率门禁。** 不是"整个 M0 写完再测"，而是**每个包必须先达到 100% 语句覆盖率，CI 才放行下一个包开工**，严格按依赖方向自底向上（`internal/fsutil` 最底层，其余包依 §2.1.2 依赖表顺序）：

```
fsutil (100%) → filter (100%) → engine (100%) → variant (100%) → plan (100%)
                                                                       ↓
                                    database (100%) ⇄ execute (100%) ←┘
```

| 顺序 | 包                | 覆盖率门禁                   | 说明                                                      |
| ---- | ----------------- | ---------------------------- | --------------------------------------------------------- |
| 0a   | `internal/fsutil` | **100%** 语句覆盖率，CI 强制 | M0 第一个交付单元（§1.2）；不含任何 sync 语义             |
| 0b   | `filter`          | **100%**                     | 依赖 fsutil 已 100%；FLT-01…08                            |
| 0c   | `engine`          | **100%**                     | 依赖 fsutil+filter 已 100%；CMP-01/07 + Category 分类     |
| 0d   | `variant`         | **100%**                     | 依赖 engine 已 100%；VAR-01/02（differences 模式，无 DB） |
| 0e   | `plan`            | **100%**                     | 依赖 variant 已 100%；BuildReport 编排                    |

**任何一包覆盖率 < 100% 时，禁止开始下一包的实现 PR**（CI 校验 `go test -coverprofile` 并 fail build）；例外情况（不可达分支如 OS 特定错误路径）须在代码内 `// coverage: 不可达，原因……` 注释 + PR 描述说明，不允许静默豁免。

| 里程碑 | 范围                                                                                                    | 依赖 |
| ------ | ------------------------------------------------------------------------------------------------------- | ---- |
| M0     | 治理：废弃旧 planner；§0 表 5 包按上表顺序逐一 100% 覆盖率交付（无 CLI/UI，纯 Go 单元+golden）          | —    |
| M1     | CMP-01–07 + VAR-01–02 + FLT-01–08 已随 M0 完成；本阶段加 **CLI-01–03（NDJSON 输出，见 §2.1.3）**        | M0   |
| M2     | SYN-01–03,09–13 + VAR-03–04 + DB（`database`/`execute` 同样 100% 门禁）+ **CLI-04–07 + CFG-01–03 全项** | M1   |
| M3     | UI-01–16,20–22 + SYN-04–08,11 + VAR-05–06（UI 首次进场）                                                | M2   |
| M4     | CMP-02–03,08–12 + SYN-02,14–17                                                                          | M3   |
| M5     | RTS 全项 + REM-02–07 + UI-23–26                                                                         | M4   |
| M6     | SYN-12,18–20 + 平台高级（VSS/DST/ADS）                                                                  | M5   |

---

## 7. 测试计划

**原则：** 测试先行（Kent）；**FFS 14.x golden 为语义权威**；§4 每项至少一条自动化或登记的手工用例。

### 7.1 测试金字塔

```
                    ┌─────────────┐
                    │ 手工 FFS    │  教程 7 场景 + 探索
                    │ 对照验收    │
                    └──────┬──────┘
               ┌───────────┴───────────┐
               │  Desktop E2E (可选)   │  Playwright / 手工脚本
               └───────────┬───────────┘
          ┌────────────────┴────────────────┐
          │  Go 集成：BuildReport + Execute   │  临时目录真 FS
          └────────────────┬────────────────┘
     ┌─────────────────────┴─────────────────────┐
     │  FFS Golden：testdata/ffs_reference/*       │  与 FFS Preview 1:1
     └─────────────────────┬─────────────────────┘
┌──────────────────────────┴──────────────────────────┐
│  单元：engine · filter · variant · database · plan   │
└─────────────────────────────────────────────────────┘
          ┌─────────────────────┐
          │  UI 组件 + syncSlice │  mock window.syncApi
          └─────────────────────┘
```

### 7.2 Golden Fixture 规范

#### 7.2.1 目录结构

```
backend/internal/sync/testdata/ffs_reference/
├── README.md                    # 录制 SOP + FFS 版本号
├── manifest.json                # 全部 case 索引
└── <case-id>/                   # 例：mirror-l2r/cat-right-newer
    ├── meta.json                # 变体、比较模式、filter、FFS 版本
    ├── left/                    # 左树根文件
    ├── right/                   # 右树根文件
    ├── db/                      # 可选：上次 sync 后 DB 快照（changes 模式）
    └── expected.json            # 期望 PlanItem 列表
```

#### 7.2.2 `expected.json` Schema

```json
{
    "ffsVersion": "14.10",
    "variant": "mirror",
    "direction": "left-to-right",
    "variantMode": "differences",
    "compareMode": "time-and-size",
    "items": [
        {
            "relativePath": "a.txt",
            "category": "right-newer",
            "action": "copy",
            "from": "/abs/left/a.txt",
            "to": "/abs/right/a.txt",
            "syncAction": "update-right-item",
            "reason": "mirror: left wins"
        }
    ],
    "counts": { "toCopy": 1, "toDelete": 0, "conflicts": 0, "toSkip": 0 }
}
```

路径在测试中 **规范化** 为相对根（不硬编码绝对路径）。

#### 7.2.3 Golden 录制 SOP（批准前可做，不算实现）

1. 在 FFS 14.x 建 `left/` `right/`，设 Compare + Sync 变体
2. Compare → 记录 Preview 每行（路径、类别、动作、方向）
3. 写入 `expected.json`
4. PR 仅含 `testdata/`，不含 Commando 引擎代码
5. `manifest.json` 登记 `case-id` → §4 ID 映射

### 7.3 按模块测试矩阵

| 包         | 测试类型       | 文件                    | 覆盖重点                                                 |
| ---------- | -------------- | ----------------------- | -------------------------------------------------------- |
| `fsutil`   | 单元，**100%** | `walk_test.go`          | 遍历、隐藏文件、symlink 存在性（不做过滤语义，纯读取）   |
| `fsutil`   | 单元，**100%** | `stat_test.go`          | `Stat`/`SameInode` 边界（不存在路径、同一 inode 硬链接） |
| `fsutil`   | 单元，**100%** | `space_test.go`         | `FreeSpace` 返回值合理性（tempdir 挂载点）               |
| `engine`   | 单元           | `index_test.go`         | 遍历、exclude、symlink 三模式                            |
| `engine`   | 单元           | `compare_test.go`       | 3 比较模式、tolerance 2s                                 |
| `engine`   | 单元           | `categorize_test.go`    | CAT-01…07 边界                                           |
| `engine`   | 单元           | `diff_test.go`          | 并集、only-left/right                                    |
| `filter`   | 单元           | `matcher_test.go`       | include/exclude、目录传播规则 FLT-05                     |
| `variant`  | 表驱动         | `differences_test.go`   | §3.4 每张预设表 **每行一例**                             |
| `variant`  | 表驱动         | `changes_test.go`       | §3.4 Update/Two-way changes 表                           |
| `variant`  | 表驱动         | `custom_test.go`        | 自定义 ACT 组合                                          |
| `database` | 单元+集成      | `store_test.go`         | 读写 round-trip                                          |
| `database` | 集成           | `detect_test.go`        | CHG-01…08、move 检测                                     |
| `plan`     | 单元           | `build_test.go`         | BuildReport 编排                                         |
| `plan`     | 单元           | `override_test.go`      | UI-15 覆盖                                               |
| `plan`     | 单元           | `export_test.go`        | RPT-01…03 json/csv/text                                  |
| `execute`  | 集成           | `runner_test.go`        | dry-run / 真执行 tempdir                                 |
| `execute`  | 集成           | `versioning_test.go`    | SYN-05…08                                                |
| `execute`  | 集成           | `verify_test.go`        | SYN-11                                                   |
| `job`      | 单元           | `manager_test.go`       | 取消、进度事件                                           |
| `job`      | 集成           | `lock_test.go`          | 双实例互斥 SYN-18                                        |
| `config`   | 单元           | `io_test.go`            | 存取 round-trip CFG-*                                    |
| `realtime` | 集成           | `watcher_test.go`       | 变更触发（短超时）RTS-*                                  |
| `remote`   | 集成           | `*_test.go`             | mock server / skip if no creds REM-*                     |
| `sync`     | 集成           | `api_test.go`           | CompareRequest 端到端                                    |
| `sync`     | **Golden**     | `ffs_reference_test.go` | 遍历 manifest 全 case                                    |

### 7.4 §4 功能 ID → 测试用例映射（摘录）

| §4 ID     | 测试 ID     | 类型        | 描述                                      |
| --------- | ----------- | ----------- | ----------------------------------------- |
| CMP-01    | T-CMP-01    | golden+unit | time+size 七类分类                        |
| CMP-02    | T-CMP-02    | golden      | content 模式不同内容                      |
| CMP-03    | T-CMP-03    | golden      | size-only 模式                            |
| CMP-04…06 | T-CMP-04…06 | unit        | symlink exclude/as/follow                 |
| VAR-01    | T-VAR-01    | golden      | Mirror differences 全表                   |
| VAR-02    | T-VAR-02    | golden      | Update differences（含 right-newer skip） |
| VAR-03    | T-VAR-03    | golden+db   | Update changes + DB                       |
| VAR-04    | T-VAR-04    | golden+db   | Two-way + delete 传播                     |
| VAR-05…06 | T-VAR-05…06 | unit        | Custom 规则                               |
| FLT-01…08 | T-FLT-*     | unit        | 过滤器规则                                |
| SYN-01…02 | T-SYN-01…02 | integration | DB + moved files                          |
| SYN-04…05 | T-SYN-04…05 | integration | recycle + versioning                      |
| SYN-11    | T-SYN-11    | integration | verify after copy                         |
| UI-02,07  | T-UI-02     | RTL         | SyncPlanModal 显示 from→to                |
| UI-15     | T-UI-15     | RTL+unit    | override 反映到 plan                      |
| CLI-01…05 | T-CLI-*     | integration | cobra 子命令 + 返回码                     |
| RTS-01…04 | T-RTS-*     | integration | watcher 触发                              |
| REM-02…03 | T-REM-*     | integration | SFTP/FTP mock                             |
| RPT-01…03 | T-RPT-*     | unit        | 导出格式字段                              |

**完整映射表：** 实施 M0 时生成 `testdata/traceability.json`（§4 ID ↔ 测试 ID），CI 校验无遗漏。

### 7.5 关键语义用例（必须通过，防 D-01…D-10）

| 用例 ID  | 场景                          | 期望                      |
| -------- | ----------------------------- | ------------------------- |
| T-SEM-01 | Update L→R，right-newer       | **skip**（非 copy）       |
| T-SEM-02 | Mirror L→R，right-newer       | copy 左→右（左赢）        |
| T-SEM-03 | Mirror L→R，right-only        | delete right              |
| T-SEM-04 | Update L→R，right-only        | skip                      |
| T-SEM-05 | Two-way，delete-left（有 DB） | delete right              |
| T-SEM-06 | Two-way，双侧修改同文件       | conflict                  |
| T-SEM-07 | conflict 行 Execute           | skipped                   |
| T-SEM-08 | equal 行                      | skip，不出现在 export csv |
| T-SEM-09 | overlap 根路径                | Compare 拒绝              |
| T-SEM-10 | Update changes：删源不删备    | 备侧文件保留              |

### 7.6 UI / 前端测试

| 范围             | 工具 | 文件                                          |
| ---------------- | ---- | --------------------------------------------- |
| `syncSlice`      | Jest | `app/__tests__/syncSlice.test.ts`             |
| `SyncPlanModal`  | RTL  | `components/__tests__/SyncPlanModal.test.tsx` |
| `SyncToolbar`    | RTL  | Compare/Export/Sync 按钮状态                  |
| `syncRoots`      | Jest | 双根校验、相同路径拒绝                        |
| `syncApiService` | Jest | mock `window.syncApi`，无策略逻辑             |
| 设置对话框       | RTL  | M3 新增                                       |

**禁止：** TS 测试里断言 `mirror-right` 策略推导逻辑（必须在 Go golden）。

### 7.7 里程碑测试门禁

**M0 内部逐包门禁（见 §6 顺序图）：** `fsutil`→`filter`→`engine`→`variant`→`plan` 严格按序，每包 **100% 覆盖率**验证通过才能开下一包 PR；`prescan` 依赖 `plan.BuildReport`，是 M0 最后完成的子包。

| 里程碑        | 合并条件                                                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0**        | `fsutil`/`filter`/`engine`/`variant`/`plan`/`prescan` 各 **100%** 覆盖率（缺一不可，见 §6 顺序）；**§7.12.15 Prescan+Dry-run 测试**；T-SEM-01…04 golden；CMP-01 golden ≥10 cases；T-VAR-01,02 |
| **M1**        | CLI-01–03 集成测试；NDJSON 流式测试 `TestCLISyncCompare_NDJSONStreaming`（§2.1.3.1）                                                                                                          |
| **M2**        | +`database`+`execute`（同样 100% 门禁）；T-SEM-05,06,10；VAR-03,04 golden；CLI-04–07                                                                                                          |
| **M3**        | UI RTL 全绿；T-UI-02,15                                                                                                                                                                       |
| **M4**        | CMP-02,03；SYN-02,14–17                                                                                                                                                                       |
| **M5**        | +`realtime`+`remote` mock；RTS-*, REM-02,03                                                                                                                                                   |
| **M6**        | SYN-12 平台测试（Windows VSS 可选 skip）                                                                                                                                                      |
| **Completed** | §4 全 ✅；`traceability.json` 无缺口；教程 7 场景手工签字                                                                                                                                     |

### 7.8 CI 流水线

```yaml
# 概念 — 写入 .github/workflows 时按此实现

fsutil-coverage-gate:
    # M0 第一道门：fsutil 必须 100% 才允许 filter/engine 等上层包的 PR 合并
    - go test ./backend/internal/fsutil/... -coverprofile=fsutil.out -covermode=atomic
    - go tool cover -func=fsutil.out | tail -1 | grep -q "100.0%" || exit 1

sync-package-coverage-gate:
    # M0 内，每个已交付子包（filter/engine/variant/plan/prescan，M2 起加 database/execute）逐一验证 100%
    - for pkg in filter engine variant plan prescan; do
      go test ./backend/internal/sync/$pkg/... -coverprofile=$pkg.out -covermode=atomic;
      go tool cover -func=$pkg.out | tail -1 | grep -q "100.0%" || exit 1;
      done

sync-go-unit:
    - go test ./backend/internal/sync/... -count=1 -race

sync-go-golden:
    - go test ./backend/internal/sync/... -run FFSReference -count=1

sync-ui:
    - pnpm --filter @commando/ui test -- --testPathPattern=sync

sync-lint:
    - go vet ./backend/internal/fsutil/... ./backend/internal/sync/...
    - npm run typecheck

# 门禁：PR 触及 internal/fsutil 或 internal/sync 任一子包，该包覆盖率 < 100% 直接 fail（例外见 §6 注释豁免规则）
# 门禁：PR 触及 internal/sync 必须 golden 全过
# 门禁：traceability.json 校验 §4 每项 ≥1 测试 ID
```

本地命令：

```bash
go test ./backend/internal/fsutil/... -coverprofile=/tmp/fsutil.out && go tool cover -func=/tmp/fsutil.out
go test ./backend/internal/sync/... -run FFSReference -v
go test ./backend/internal/sync/... -race -count=1
pnpm --filter @commando/ui test -- --testPathPattern=sync
```

### 7.9 手工验收清单

[FFS 官方教程](https://freefilesync.org/tutorials.php) — 每项在 Commando 录屏或签字：

| #    | 教程场景                | §4 项         | 手工 |
| ---- | ----------------------- | ------------- | ---- |
| H-01 | Folder Comparison       | UI-02, CMP-01 | ⬜   |
| H-02 | Mirror Synchronization  | VAR-01        | ⬜   |
| H-03 | Two Way Synchronization | VAR-04        | ⬜   |
| H-04 | Batch Jobs              | CLI-07, CFG-* | ⬜   |
| H-05 | Task Scheduling         | CLI + RTS     | ⬜   |
| H-06 | RealTimeSync            | RTS-*         | ⬜   |
| H-07 | External Applications   | UI-18         | ⬜   |

**发布前：** H-01…07 全 ⬜→✅。

### 7.10 性能与压力（非阻塞，M4+ 记录 baseline）

| 场景              | 指标     | 记录                |
| ----------------- | -------- | ------------------- |
| 10 万文件 compare | 完成时间 | `docs/sync-perf.md` |
| 1 GB 单文件 copy  | 吞吐     | 同上                |
| 并行度 4 vs 16    | 对比     | SYN-16              |

### 7.11 回归政策

- 修改 `variant/` 或 `engine/categorize.go` → **必须**更新或新增 golden
- golden 与 FFS 冲突 → **以 FFS 为准**，改 Commando
- 删除 golden case → PR 说明 + 负责人批准
- `expected.json` 变更 → PR 描述含 FFS 截图或 Preview 导出

### 7.12 具体测试用例目录（可执行规格）

**约定：**

- 时间戳：`T0=1700000000` `T1=1700000100` `T2=1700000200` `T3=1700000300`（秒，UTC）
- 文件行：`path size=N mtime=Tx content="..."`（目录写 `dir/`）
- 测试函数名 **必须与下表 `test` 列一致**（`go test -run` 可直接筛选）
- `action`：`copy` | `delete` | `skip` | `conflict` | `move`
- `category`：§3.1 / §3.2 小写连字符

#### 7.12.1 `engine` — `categorize_test.go`

| test                               | Given（单对文件）               | Expect category               |
| ---------------------------------- | ------------------------------- | ----------------------------- |
| `TestCategorize_LeftOnly`          | left:`x.txt` 10,T1；right:无    | `left-only`                   |
| `TestCategorize_RightOnly`         | left:无；right:`x.txt` 10,T1    | `right-only`                  |
| `TestCategorize_Equal`             | 两侧 `x.txt` 10,T1              | `equal`                       |
| `TestCategorize_LeftNewer`         | left 10,T2；right 10,T1         | `left-newer`                  |
| `TestCategorize_RightNewer`        | left 10,T1；right 10,T2         | `right-newer`                 |
| `TestCategorize_Conflict`          | left 10,T1；right 20,T1         | `conflict`                    |
| `TestCategorize_TypeMismatch`      | left:`d/` dir；right:`d` file   | `type-mismatch`               |
| `TestCategorize_ContentEqual`      | mode=content；相同 bytes        | `equal`                       |
| `TestCategorize_ContentDifferent`  | mode=content；`a` vs `b`        | `different-content`           |
| `TestCategorize_SizeOnlyEqual`     | mode=size；10 vs 10，mtime 不同 | `equal`                       |
| `TestCategorize_SizeOnlyDifferent` | mode=size；10 vs 11             | `different-size`              |
| `TestCategorize_Tolerance2s`       | mtime 差 1s、size 同            | `equal`                       |
| `TestCategorize_ToleranceExceed`   | mtime 差 3s、size 同            | `left-newer` 或 `right-newer` |

#### 7.12.2 `engine` — `index_test.go`

| test                         | Given 树                             | Expect Index keys        |
| ---------------------------- | ------------------------------------ | ------------------------ |
| `TestIndex_SkipsGit`         | `left/.git/config` + `left/a.txt`    | 仅 `a.txt`               |
| `TestIndex_SkipsNodeModules` | `left/node_modules/x` + `left/a.txt` | 仅 `a.txt`               |
| `TestIndex_SymlinkExclude`   | symlink 模式=Exclude                 | 不含 link 项             |
| `TestIndex_SymlinkAsLink`    | `link -> target`                     | 含 `link`，不遍历 target |
| `TestIndex_SymlinkFollow`    | `link -> sub/`                       | 含 `sub/file`            |

#### 7.12.3 `filter` — `matcher_test.go`

| test                                       | Rules               | Path             | Expect                |
| ------------------------------------------ | ------------------- | ---------------- | --------------------- |
| `TestFilter_DefaultExcludesRecycleBin`     | default             | `$Recycle.Bin/x` | false                 |
| `TestFilter_IncludeStar`                   | include `*`         | `any/x.txt`      | true                  |
| `TestFilter_ExcludeSubfolder`              | exclude `\temp\`    | `temp/x`         | false                 |
| `TestFilter_ExcludeSubfolderKeepsChildren` | exclude `\temp\`    | `temp/sub/x`     | false（FFS 目录传播） |
| `TestFilter_IncludeSubfolderOnly`          | include `\data\*\\` | `data/x`         | false；`data/sub/x`   | true |

#### 7.12.4 Golden — `manifest.json`（M0 首批 24 case）

```json
{
    "ffsVersion": "14.10",
    "cases": [
        "mirror-l2r/left-only",
        "mirror-l2r/right-only",
        "mirror-l2r/left-newer",
        "mirror-l2r/right-newer",
        "mirror-l2r/equal",
        "mirror-l2r/conflict",
        "update-l2r/left-only",
        "update-l2r/right-only",
        "update-l2r/left-newer",
        "update-l2r/right-newer",
        "update-l2r/equal",
        "update-l2r/conflict",
        "mirror-r2l/left-only",
        "mirror-r2l/right-only",
        "update-r2l/left-only",
        "update-r2l/right-only",
        "two-way-changes/create-left",
        "two-way-changes/create-right",
        "two-way-changes/delete-left",
        "two-way-changes/delete-right",
        "two-way-changes/update-left",
        "two-way-changes/update-right",
        "two-way-changes/both-modified",
        "two-way-changes/first-sync-fill"
    ]
}
```

**Runner：** `TestFFSReference/<case-id>` in `ffs_reference_test.go`

#### 7.12.5 Golden 用例定义 — Mirror L→R（differences）

##### `mirror-l2r/left-only`

```
left/only.txt     size=5 mtime=T1 content="hello"
right/            (empty)
```

`meta.json`: `{ "variant":"mirror", "direction":"left-to-right", "variantMode":"differences" }`

`expected.json` items:

```json
[
    {
        "relativePath": "only.txt",
        "category": "left-only",
        "action": "copy",
        "syncAction": "copy-new-item-to-right",
        "countsContribution": "toCopy"
    }
]
```

##### `mirror-l2r/right-only`

```
left/             (empty)
right/extra.txt   size=3 mtime=T1 content="bye"
```

```json
[
    {
        "relativePath": "extra.txt",
        "category": "right-only",
        "action": "delete",
        "syncAction": "delete-right-item",
        "countsContribution": "toDelete"
    }
]
```

##### `mirror-l2r/left-newer`

```
left/newer.txt    size=10 mtime=T2 content="AAAAAA"
right/newer.txt   size=10 mtime=T1 content="AAAAAA"
```

```json
[
    {
        "relativePath": "newer.txt",
        "category": "left-newer",
        "action": "copy",
        "syncAction": "update-right-item"
    }
]
```

##### `mirror-l2r/right-newer`（**T-SEM-02 关键**）

```
left/win.txt      size=10 mtime=T1 content="from-left"
right/win.txt     size=10 mtime=T2 content="from-right"
```

```json
[
    {
        "relativePath": "win.txt",
        "category": "right-newer",
        "action": "copy",
        "syncAction": "update-right-item",
        "note": "mirror: left wins — overwrites newer right"
    }
]
```

##### `mirror-l2r/equal`

```
left/same.txt     size=4 mtime=T1 content="data"
right/same.txt    size=4 mtime=T1 content="data"
```

```json
[{ "relativePath": "same.txt", "category": "equal", "action": "skip" }]
```

##### `mirror-l2r/conflict`

```
left/c.txt        size=10 mtime=T1
right/c.txt       size=20 mtime=T1
```

```json
[
    {
        "relativePath": "c.txt",
        "category": "conflict",
        "action": "copy",
        "syncAction": "update-right-item"
    }
]
```

#### 7.12.6 Golden 用例定义 — Update L→R（differences）

##### `update-l2r/right-newer`（**T-SEM-01 关键**）

```
left/old.txt      size=10 mtime=T1
right/old.txt     size=10 mtime=T2
```

```json
[
    {
        "relativePath": "old.txt",
        "category": "right-newer",
        "action": "skip",
        "syncAction": "do-nothing"
    }
]
```

##### `update-l2r/right-only`

```
left/             (empty)
right/keep.txt    size=1 mtime=T1
```

```json
[{ "relativePath": "keep.txt", "category": "right-only", "action": "skip" }]
```

##### `update-l2r/conflict`

```
left/c.txt        size=10 mtime=T1
right/c.txt       size=20 mtime=T1
```

```json
[
    {
        "relativePath": "c.txt",
        "category": "conflict",
        "action": "conflict",
        "syncAction": "leave-unresolved-conflict"
    }
]
```

（`update-l2r/left-only`、`left-newer`、`equal` 与 mirror 同类但 action 按 §3.4 Update 表 — 各写入 `expected.json`）

#### 7.12.7 Golden — Two-way（changes，含 `db/`）

##### `two-way-changes/first-sync-fill`

```
left/a.txt        size=1 mtime=T1
right/b.txt       size=1 mtime=T1
db/               (empty — 首次 sync)
```

```json
[
    {
        "relativePath": "a.txt",
        "change": "create-left",
        "action": "copy",
        "direction": "to-right"
    },
    {
        "relativePath": "b.txt",
        "change": "create-right",
        "action": "copy",
        "direction": "to-left"
    }
]
```

##### `two-way-changes/delete-left`（**T-SEM-05**）

```
# db 记录上次 sync 后 left 有 x.txt；当前 left 无 x.txt，right 仍有
db/snapshot.json  → 上次两侧均有 x.txt
left/             (empty)
right/x.txt       size=1 mtime=T0
```

```json
[
    {
        "relativePath": "x.txt",
        "change": "delete-left",
        "action": "delete",
        "target": "right/x.txt"
    }
]
```

##### `two-way-changes/both-modified`（**T-SEM-06**）

```
db/               → 上次 T0 两侧 same.txt 相同
left/same.txt     size=10 mtime=T2 content="LEFT"
right/same.txt    size=10 mtime=T3 content="RIGHT"
```

```json
[{ "relativePath": "same.txt", "change": "conflict", "action": "conflict" }]
```

（其余 `two-way-changes/*` case 按 CHG 表各一份 fixture — M2 补齐）

#### 7.12.8 `execute` — `runner_test.go`（真 FS，`t.TempDir()`）

| test                                | Plan input          | Execute opts | After FS assert                     |
| ----------------------------------- | ------------------- | ------------ | ----------------------------------- |
| `TestExecute_Copy_CreatesFile`      | copy `a.txt` L→R    | dryRun=false | `right/a.txt` 存在，bytes 相等      |
| `TestExecute_Copy_PreservesMtime`   | copy 带 T1          |              | `right/a.txt` mtime == T1           |
| `TestExecute_Delete_RemovesFile`    | delete `right/x`    |              | `right/x` 不存在                    |
| `TestExecute_DryRun_NoMutation`     | 任意 plan           | dryRun=true  | 两侧不变                            |
| `TestExecute_Conflict_Skipped`      | 含 conflict 行      |              | conflict 未复制；`Result.Skipped++` |
| `TestExecute_Versioning_Timestamp`  | delete + versioning |              | `revisions/.../x.txt.<ts>` 存在     |
| `TestExecute_RecycleBin`            | delete + recycle    | darwin       | 文件在 Trash（或 skip darwin CI）   |
| `TestExecute_Verify_FailsOnCorrupt` | copy + verify       | 篡改 dst     | `Result.Errors` 非空                |

#### 7.12.9 `plan` — `export_test.go`

| test                        | Input report    | Command          | Assert output contains               |
| --------------------------- | --------------- | ---------------- | ------------------------------------ |
| `TestExport_JSON_RoundTrip` | 2 items         | ExportFormatJSON | `"toCopy":1`；反序列化相等           |
| `TestExport_CSV_Header`     | 1 copy          | CSV              | `relativePath,action,from,to,reason` |
| `TestExport_CSV_SkipsEqual` | 1 skip + 1 copy | CSV              | 仅 1 数据行                          |
| `TestExport_Text_FromTo`    | 1 copy          | text             | `from:` 与 `to:` 行                  |

#### 7.12.10 `sync` — `api_test.go`

| test                           | Request                         | Expect error | Expect report         |
| ------------------------------ | ------------------------------- | ------------ | --------------------- |
| `TestCompare_OverlapRoots`     | left=`/a` right=`/a/b`          | non-nil      | —                     |
| `TestCompare_SameRoot`         | left==right                     | non-nil      | —                     |
| `TestCompare_MirrorRightNewer` | golden `mirror-l2r/right-newer` | nil          | items[0].action==copy |
| `TestCompare_UpdateRightNewer` | golden `update-l2r/right-newer` | nil          | items[0].action==skip |

#### 7.12.11 UI — Jest/RTL（`packages/ui`）

| test file                | test name                                         | Setup                | Assert                                                  |
| ------------------------ | ------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| `syncSlice.test.ts`      | `compare fulfilled stores report and opens modal` | mock Compare→report  | `state.report` 非空；`planModalOpen===true`             |
| `syncSlice.test.ts`      | `rejects compare when roots equal`                | leftRoot===rightRoot | thunk rejected；error 含 i18n key                       |
| `SyncPlanModal.test.tsx` | `renders from arrow to for copy row`              | report 1 copy item   | 屏显 `from` 路径 + `→` + `to` 路径                      |
| `SyncPlanModal.test.tsx` | `hides skip rows or grays out`                    | 含 skip              | 按产品设计（与 FFS 一致：默认显示 equal 灰）            |
| `SyncToolbar.test.tsx`   | `sync disabled without compare`                   | plan null            | Sync 按钮 disabled                                      |
| `SyncToolbar.test.tsx`   | `calls ListVariants not hardcoded constants`      | mount                | `syncApi.listVariants` 被调；无 `SYNC_STRATEGY_OPTIONS` |
| `syncRoots.test.ts`      | `canCompare false when same path`                 |                      | `canCompare===false`                                    |

#### 7.12.12 CLI — `sync_cmd_test.go`

| test                               | Command                                                                            | Exit | Stdout/文件 assert      |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ---- | ----------------------- |
| `TestCLISyncCompare_JSON`          | `commando sync compare --left L --right R --variant mirror --direction l2r --json` | 0    | 合法 JSON；`items` 数组 |
| `TestCLISyncCompare_MissingRoot`   | 缺 `--left`                                                                        | 非 0 | stderr 提示             |
| `TestCLISyncExport_CSV`            | `export --report r.json --out o.csv`                                               | 0    | `o.csv` 存在；有 header |
| `TestCLISyncRun_DryRun`            | `run --report r.json --dry-run`                                                    | 0    | FS 不变                 |
| `TestCLISyncRun_ReturnCodeWarning` | 执行有 skip 的 warning                                                             | 1    | 对齐 FFS 返回码         |

#### 7.12.13 `ffs_reference_test.go` 实现契约

```go
func TestFFSReference(t *testing.T) {
    manifest := loadManifest(t, "testdata/ffs_reference/manifest.json")
    for _, caseID := range manifest.Cases {
        t.Run(caseID, func(t *testing.T) {
            dir := filepath.Join("testdata/ffs_reference", caseID)
            meta := loadMeta(t, filepath.Join(dir, "meta.json"))
            expected := loadExpected(t, filepath.Join(dir, "expected.json"))

            left := filepath.Join(dir, "left")
            right := filepath.Join(dir, "right")
            got, err := sync.Prescan(testContext(), buildRequest(meta, left, right))
            require.NoError(t, err)

            assertReportMatches(t, expected, got, left, right)
        })
    }
}
```

`assertReportMatches` 规则：

1. `len(got.Items)` == `len(expected.items)`（skip 行是否包含 — 与 `expected` 一致）
2. 每项：`relativePath`, `action`, `category` 精确相等
3. `from`/`to` 规范化为 `{leftRoot}/{rel}` / `{rightRoot}/{rel}`
4. `counts` 与 `expected.counts` 相等

#### 7.12.14 `traceability.json`（M0 创建，CI 校验）

```json
{
    "VAR-01": ["mirror-l2r/left-only", "mirror-l2r/right-only", "..."],
    "VAR-02": ["update-l2r/right-newer", "..."],
    "T-SEM-01": ["update-l2r/right-newer"],
    "T-SEM-02": ["mirror-l2r/right-newer"]
}
```

CI：`go test ./internal/sync/... -run TestTraceabilityComplete` 验证 §4 每项 ≥1 测试引用。

#### 7.12.15 安全流水线 — 具名测试（**防数据丢失，M0 起必做**）

##### `prescan/checks_test.go`

| test                                 | Given                           | Expect                                         |
| ------------------------------------ | ------------------------------- | ---------------------------------------------- |
| `TestPrescan_PS01_LeftRootMissing`   | left=`/no/such`                 | `OK=false`；`Errors` 含 `unreadable left root` |
| `TestPrescan_PS01_RightRootMissing`  | right 不存在                    | 同上                                           |
| `TestPrescan_PS02_SameRoot`          | left==right                     | `OK=false`；`Errors` 含 `same root`            |
| `TestPrescan_PS03_OverlapNested`     | left=`/tmp/a` right=`/tmp/a/b`  | `OK=false`；`Errors` 含 `overlap`              |
| `TestPrescan_PS04_SameInode`         | right 为 left 的 symlink        | `OK=false`                                     |
| `TestPrescan_PS05_InsufficientSpace` | plan 需 1GB；目标卷 free=100MB  | `OK=false`；`Errors` 含 `insufficient space`   |
| `TestPrescan_PS05_SufficientSpace`   | 需 1MB；free=10MB               | `OK=true`                                      |
| `TestPrescan_PS07_LockBusy`          | 另一 goroutine 持有 lock        | `OK=false`；`busy`                             |
| `TestPrescan_PS08_AllExcluded`       | filter 排除 `*`                 | `OK=true`；`Warnings` 非空                     |
| `TestPrescan_Stats_Accurate`         | left 2 files 100B；right 1 file | `Stats.fileCount`/`bytesToCopy` 与手工一致     |

##### `plan/build_test.go` — Dry-run 不变性（**1.1**）

| test                                     | Given                                             | Assert                                                                        |
| ---------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `TestDryRun_NoFilesystemMutation`        | 完整 left/right 树；`DryRun(plan, {DryRun:true})` | 前后 `filepath.Walk` 哈希和相等                                               |
| `TestPrescan_NoFilesystemMutation`       | 完整树；`Prescan(req)`                            | 同上（Prescan 亦零写盘）                                                      |
| `TestDryRun_PlanMatchesExecutePreview`   | 同一 `req`                                        | `Compare` 的 `plan.Items` == `Execute` 干跑路径解析的 items（action/from/to） |
| `TestDryRun_LockNotHeldAfterCompare`     | Compare 完成                                      | lock 文件已释放（若 Prescan 获取）                                            |
| `TestDryRun_ConflictNeverInExecuteQueue` | report 含 conflict                                | `Items` 中 conflict 的 `action==conflict`；无 copy/delete                     |

##### `execute/runner_test.go` — Execute（**2**）

| test                                        | Given                       | After assert                                         |
| ------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| `TestExecute_Copy_AtomicNoPartialFile`      | 大文件 copy；模拟中断前检查 | 目标路径无 `.tmp` 残留；要么完整要么不存在           |
| `TestExecute_Copy_TempThenRename`           | copy `a.txt`                | 曾存在 `a.txt.tmp`（可用 hook 断言）；最终仅 `a.txt` |
| `TestExecute_Delete_VersioningBeforeRemove` | delete + versioning         | `revisions/...` 有备份；原路径已删                   |
| `TestExecute_Delete_RecycleNotPermanent`    | recycle 模式                | 原路径不存在；Trash 可查（平台 skip）                |
| `TestExecute_Conflict_NeverTouchesFiles`    | plan 含 conflict+copy       | conflict 路径两侧内容不变                            |
| `TestExecute_StopOnError_NoFurtherItems`    | 第 2 项故意失败             | 第 3 项未执行；`Result.Errors` 含第 2 项             |
| `TestExecute_DryRunTrue_NoMutation`         | `opts.DryRun=true`          | 同 `TestDryRun_NoFilesystemMutation`                 |
| `TestExecute_DBNotUpdatedBeforeVerify`      | changes 模式                | Execute 后 DB 仍为旧快照；Verify 后才更新            |

##### `execute/verify_test.go` — Verify（**3**）

| test                                   | Given                          | Expect                                           |
| -------------------------------------- | ------------------------------ | ------------------------------------------------ |
| `TestVerify_Copy_SizeMatch`            | 正常 copy                      | `OK=true`                                        |
| `TestVerify_Copy_HashMatch`            | `opts.Verify=true`             | `OK=true`；hash 相等                             |
| `TestVerify_Copy_HashMismatch`         | 拷贝后篡改 dst 1 byte          | `OK=false`；`Failures[0].path` 正确              |
| `TestVerify_Failure_RemovesPartialDst` | `opts.VerifyRemoveOnFail=true` | 失败项 dst 被删除（可配置，默认 false + 仅报错） |
| `TestVerify_DBUpdatedOnlyOnSuccess`    | changes + 全部通过             | `database` 快照更新                              |
| `TestVerify_DBNotUpdatedOnFailure`     | 一项 verify 失败               | DB **不变**（S-12）                              |

##### `sync/pipeline_test.go` — 端到端四阶段

| test                                         | Steps                          | Assert                                                          |
| -------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| `TestPipeline_FullCycle_MirrorL2R`           | Prescan→Compare→Execute→Verify | 最终 `right` 镜像 `left`；`VerifyReport.OK`                     |
| `TestPipeline_PrescanFail_BlocksCompare`     | overlap roots                  | `Compare` 返回 error；FS 不变                                   |
| `TestPipeline_CompareThenAbort_NoExecute`    | 仅 Compare                     | FS 不变                                                         |
| `TestPipeline_VerifyFail_DBUnchanged`        | Execute OK；篡改文件后 Verify  | `verified=false`；DB 旧                                         |
| `TestPipeline_Update_RightNewer_NoOverwrite` | update + right-newer           | Compare skip；Execute 后 right 内容 **不变**（T-SEM-01 端到端） |

##### UI — 安全确认

| test                                                              | Assert                       |
| ----------------------------------------------------------------- | ---------------------------- |
| `SyncToolbar.test.tsx` `sync requires prior compare`              | 无 report 时 Sync disabled   |
| `SyncConfirmDialog.test.tsx` `shows delete count warning`         | plan.toDelete>0 显示警告文案 |
| `SyncConfirmDialog.test.tsx` `permanent delete requires checkbox` | SYN-05 二次确认              |

#### 7.12.16 `traceability.json` 补充（流水线）

```json
{
    "S-01": [
        "TestPrescan_PS02_SameRoot",
        "TestPipeline_PrescanFail_BlocksCompare"
    ],
    "S-02": [
        "TestDryRun_NoFilesystemMutation",
        "TestPrescan_NoFilesystemMutation"
    ],
    "S-06": ["TestVerify_Copy_HashMismatch"],
    "S-07": ["TestExecute_Copy_TempThenRename"],
    "S-12": [
        "TestVerify_DBNotUpdatedOnFailure",
        "TestExecute_DBNotUpdatedBeforeVerify"
    ],
    "SYN-11": ["TestVerify_Copy_HashMatch"]
}
```

---

## 8. 第三方库政策（1:1 模式）

| 领域                | 政策                                   |
| ------------------- | -------------------------------------- |
| Compare/Sync 语义   | **自研**，表驱动，FFS 对照测试         |
| SFTP/FTP/GDrive/MTP | 可用成熟 Go 客户端（实现 REM-*）       |
| VSS                 | 平台 API / 可选库                      |
| 禁止                | 用简化语义冒充 FFS（如 mtime two-way） |

---

## 9. 明确不在 Commando 复制的 FFS 周边

| 条目                    | 原因             |
| ----------------------- | ---------------- |
| FFS 安装程序广告        | 非产品功能       |
| Donation Edition 许可证 | 商业授权模型不同 |
| Business/reseller 门户  | 非技术功能       |

### 9.1 已拆出至独立 RFC（非「不做」，仅不在本 RFC 范围内）

| 条目                  | §4 原 ID | 去向             |
| --------------------- | -------- | ---------------- |
| Google Drive 远程存储 | REM-04   | **RFC-2026-014** |
| MTP 设备（手机/相机） | REM-05   | **RFC-2026-014** |

**其余 §4 全部在本 RFC 范围内。**

---

## 10. 相关 RFC

| RFC          | 关系                                                          |
| ------------ | ------------------------------------------------------------- |
| RFC-2025-006 | 文件 copy/delete 原语                                         |
| RFC-2025-005 | 双栏 UI 容器                                                  |
| RFC-2025-010 | **Deprecated**                                                |
| RFC-2026-013 | 独立                                                          |
| RFC-2026-014 | 子 RFC — REM-04/REM-05（Google Drive/MTP）从本 RFC OQ-02 拆出 |

---

## 11. 已决事项

| ID     | 决策                                             | 理由                           |
| ------ | ------------------------------------------------ | ------------------------------ |
| DEC-01 | **1:1 全功能**，非 MVP                           | 产品定位：FFS 克隆             |
| DEC-02 | Compare/Sync **自研**表驱动                      | 语义必须可控；FFS golden 测试  |
| DEC-03 | DB 文件：`sync.commando_db`                      | 对标 `sync.ffs_db`；格式可不同 |
| DEC-04 | 保留 `mirror-right` 等作 **Custom 预设快捷方式** | UI 便利；不替代 Variant 系统   |
| DEC-05 | REM-* 可用第三方 Go 客户端                       | SFTP/FTP 等不自研协议          |
| DEC-06 | 逻辑 **仅在 Go**；TS 零策略                      | 与 RFC-2025-006 服务边界一致   |
| DEC-07 | **四阶段流水线** Prescan→Dry-run→Execute→Verify  | 防数据丢失；可测试             |

## 12. 争议点决定

| ID    | 问题                                                                                        | 决定                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-01 | FFS Donation 特性（并行 sync、邮件报告）是否 1:1？                                          | **全做**。SYN-16（并行文件操作数）、SYN-20（邮件同步报告）与 §4 其余条目同等级别，M6 前须全部 ✅                                                                                                                                                                                                                                                                                                                                            |
| OQ-02 | Google Drive / MTP 优先级                                                                   | **拆出独立 RFC**。REM-04（Google Drive）、REM-05（MTP）从本 RFC §4.8 移除范围，已另立 **RFC-2026-014**（`.spec/rfc/014-remote-provider-gdrive-mtp.md`），本 RFC §9.1 已登记；REM-01/02/03/06/07（本地/SMB/SFTP/FTP/缓存/并行传输）保留在本 RFC                                                                                                                                                                                              |
| OQ-03 | 回收站删除用什么 API                                                                        | **每平台原生 API，按 Go build tag 分文件实现**：macOS 用 Trash API（Foundation/`NSWorkspace` 层，经 cgo 或 Wails runtime 绑定调用）；Windows 用 `SHFileOperation`（`FOF_ALLOWUNDO`）；Linux 用 XDG Trash spec（`~/.local/share/Trash`）。**禁止用 shell out 到 `osascript`/`explorer` 等外部进程**——三份实现放 `execute/trash_darwin.go` / `trash_windows.go` / `trash_linux.go`，`go build` 按平台自动选择，不用运行时 `runtime.GOOS` 分支 |
| OQ-04 | 现有 uncommitted sync UI 是否回滚？                                                         | **保留，不扩写**。现有 UI 代码不动，等 UI 里程碑按 §4.1 全部重写替换                                                                                                                                                                                                                                                                                                                                                                        |
| OQ-05 | §3.4 Update-changes 表 `delete-left`/`delete-right → Do nothing` 是否为 FFS 14.x 实际行为？ | **需实机录制确认**。用 FFS 14.x 实机录制 golden fixture（§7.2.3 SOP）确认该行为，确认前 §3.4 对应两行维持 🔴推断标注，禁止实现                                                                                                                                                                                                                                                                                                              |

## 13. 影响分析

| 维度    | 影响                                                      |
| ------- | --------------------------------------------------------- |
| 代码量  | `internal/sync` 从 ~300 行 → 估计 15k–30k 行（含 remote） |
| 工期    | M0–M6 多里程碑；全 §4 完成 = RFC `Completed`              |
| UI      | Sync 工具栏/模态/设置对话框大幅扩展                       |
| RFC-006 | Execute 委托 `internal/copy`；需扩展 versioning/verify    |
| 测试    | 必须 FFS golden；CI 时间增加                              |
| 风险    | 见 §14；最大风险是未 RFC 先行导致语义漂移（已用 §0 封堵） |

## 14. 风险评估

| 风险                       | 概率 | 影响 | 缓解                                   |
| -------------------------- | ---- | ---- | -------------------------------------- |
| 范围过大延期               | 高   | 高   | 里程碑可并行人力；§4 状态透明          |
| FFS 行为文档 vs 实际不一致 | 中   | 高   | golden 从 FFS 14.x **实测**录制        |
| Two-way/Update DB 复杂     | 高   | 高   | M2 专里程碑；先 differences 再 changes |
| 远程协议维护负担           | 中   | 中   | 成熟库 + 独立 `remote/` 包             |
| 半成品与 RFC 冲突          | 高   | 中   | §0.3 冻结 + M0 重写                    |

## 15. 参考资料

- [FreeFileSync Manual](https://freefilesync.org/manual.php)
- [Comparison Settings](https://freefilesync.org/manual.php?topic=comparison-settings)
- [Synchronization Settings](https://freefilesync.org/manual.php?topic=synchronization-settings)
- [FFS 13 Update variant changes](https://freefilesync.org/)
- [Video Tutorials](https://freefilesync.org/tutorials.php)
- [.spec/ROADMAP.md](../ROADMAP.md) — RFC 生命周期

---

| 字段              | 值                                                                               |
| ----------------- | -------------------------------------------------------------------------------- |
| **状态**          | `Proposed`                                                                       |
| **版本**          | v3.12                                                                            |
| **最后更新**      | 2026-07-28                                                                       |
| **§4 实现完成度** | ~8%（实施未开始；现有代码不视为验收）                                            |
| **下一动作**      | `internal/fsutil` 可立即开工；其余 sync 子包待状态转 `Approved` 后按 §6 顺序开工 |
