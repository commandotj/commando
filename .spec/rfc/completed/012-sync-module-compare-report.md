# RFC-2026-012: FreeFileSync 能力目录与 Commando 决策追踪

---

作者: albert.li / AI
创建时间: 2026-07-27
状态: **Completed**

修改历史:

- 2026-07-27: 初稿
- 2026-07-28: v3–v3.13，形成 FFS 14.x 对标规格与实现草案
- 2026-07-29: v4，按评审重构为能力目录与决策追踪章程；删除“行为 1:1”权威定义；设计所有权移交领域 RFC
- 2026-07-29: v4.1，173 项能力全部绑定现存 Owner RFC；新增 RFC-029/030；子 RFC 增加精确 Feature ID 所有权索引
- 2026-07-29: v4.2，明确 CLI sync engine first；ROADMAP P1 固定为本地路径 compare/plan/execute/CLI 闭环
- 2026-07-29: v4.3，删除 FFS-FEATURE-MAP；ROADMAP 管优先级/RFC 状态，TASK_TRACKING 管原子实施任务
- 2026-07-29: v4.4，审计现有 P1 代码；记录错误假成功、非安全覆盖、mtime Two-way、孤立 filter/checksum、浅层取消、可篡改执行计划、CLI 合约和 Go module 路径缺口
- 2026-07-29: v4.5，P1 顺序对齐 ROADMAP（031 在 017 后）；checksum/planner 接线归 RFC-031；CORE 验收与 012 Done 分离
- 2026-07-29: **v5 Completed（伞）** — 领域 RFC 014–031 均已打开并登记 ROADMAP；012 不再占 P1 实现序号。CORE-01/02/03 迁 TASK 卫生项，不挡 016。归档 `rfc/completed/`。

---

## 1. 摘要

RFC-012 只回答三个问题：

1. FreeFileSync 14.10 提供哪些可观察能力？
2. Commando 对每项能力选择 `Adopt`、`Adapt`、`Reject` 还是 `Defer`？
3. 哪个领域 RFC 负责按 Commando 现有架构完成设计与验收？

权威追踪由 [ROADMAP.md](../ROADMAP.md) 与 [TASK_TRACKING.md](../TASK_TRACKING.md) 共同组成：ROADMAP 管优先级、RFC 状态和跨 RFC gate；TASK_TRACKING 管稳定 Feature ID 与原子实施任务。RFC-012 不定义 Go API、包目录、数据库格式、任务框架、CLI 协议或 UI 布局。

**核心原则：克隆能力意图，不复制 FFS 设计。**

FFS 是发现成熟功能需求的参考产品，不是 Commando 的架构、行为或视觉规范。FFS 的窗口结构、F8 页面、颜色、动作循环、文件格式、命令语法和内部数据模型均无默认约束力。

## 2. 目标与非目标

### 2.1 目标

- 固定 FreeFileSync **14.10**、采集日期 **2026-07-29** 的能力快照。
- 覆盖官方 Manual、FAQ、版本/edition 功能表公开能力。
- 每项能力都有稳定 ID、官方来源、平台/edition 限制、Commando 决策、Owner RFC、实现状态和验收证据。
- 先完成库存，再在领域 RFC 中评审产品价值和 Commando 原生设计。
- 保持领域 RFC、ROADMAP、TASK_TRACKING 三者状态一致。

### 2.2 非目标

- 不承诺 FFS 行为、UI、配置文件或命令行的 1:1 兼容。
- 不把 FFS golden output 当作 Commando 产品需求。
- 不在本 RFC 设计代码包、类型、API 或组件。
- 不因 FFS 存在某功能而自动决定 Commando 必须实现。
- 不以“现代皮肤”包装 FFS 原交互。

### 2.3 交付顺序：CLI sync engine first

RFC-012 第一交付目标不是 Desktop UI，也不是 remote/RealtimeSync，而是可独立验证的本地路径 CLI sync engine：

```text
commando CLI
  → compare
  → deterministic plan
  → safe execute
  → progress / terminal outcome
```

P1 必须满足：

1. CLI 与 Desktop 共用同一 Go core；P1 验收不依赖 Wails 或 React；Go module 路径统一为 `github.com/commandotj/commando`。
2. Compare、filter、variant、sync database、copy、delete 与 execution safety 形成单一数据流；禁止 `sync` 与 `copy` 各自维护文件复制实现。
3. Content/checksum 原语在 RFC-016；**CLI `BuildPlan` 接入 engine 的端到端验收在 RFC-031**（P1 顺序：017 之后）。局部 `IsEqual` 不得标端到端完成。
4. `context.Context` 取消传播到遍历、比较、复制与删除；不得只在任务开始前检查一次。
5. stdout 输出稳定 NDJSON 机器协议，stderr 输出诊断；成功、警告、错误、取消使用稳定退出码；未知 enum/flag 必须报错，禁止静默降级到 Two-way。
6. Mirror、Update、Two-way 的 destructive 行为有 golden/integration tests；Two-way 不得用纯 mtime 冒充 changes/database 语义。
7. 复制采用完整 fail-safe/verify 语义；锁、部分失败与恢复结果可观察；任何 item error 都不得返回 success。
8. Desktop 只能按 core 签发的 opaque plan ID 执行；renderer 不得提交可自由修改 Source/Destination 的执行计划。

P1 Owner RFC（顺序见 ROADMAP）：012 → 016 → 019 → 030 → 017 → **031** → 018 → 027 → 028 → 021。  
RFC-012 负责跨 RFC gate、追踪一致性与 `CORE-*`；不拥有各领域实现细节。

UI workspace、progress dialog、file tools、HTML/email report、RealtimeSync、remote provider、distribution/localization 不阻塞 P1；按 ROADMAP P2/P3 推进。

## 3. 能力追踪模型

追踪责任分开，禁止复制同一状态：

| 文档               | 唯一责任                                                     |
| ------------------ | ------------------------------------------------------------ |
| `ROADMAP.md`       | P1/P2/P3、RFC lifecycle、跨 RFC gate、交付顺序               |
| `TASK_TRACKING.md` | 稳定 Feature ID、原子任务、To do/In Progress/Done、验收证据  |
| Owner RFC          | 官方来源、Adopt/Adapt/Reject/Defer 决策、Commando 设计与风险 |

删除能力时保留 Feature ID tombstone。不得在 ROADMAP、TASK_TRACKING 和 Owner RFC 同时维护相同状态字段。

### 3.1 决策定义

| 决策         | 含义                                       |
| ------------ | ------------------------------------------ |
| `Unreviewed` | 已入库存，尚未做 Commando 产品决策         |
| `Adopt`      | 用户问题真实，现有 Commando 设计可直接承载 |
| `Adapt`      | 保留能力意图，按 Commando 工作流重新设计   |
| `Reject`     | 不符合产品方向；必须记录理由               |
| `Defer`      | 有价值但非当前阶段；必须记录重审条件       |

任务状态与产品决策独立。已有代码不代表产品决策正确；决定 `Reject` 也不等于删除 Feature ID。

### 3.2 来源规则

- 功能存在性优先使用 FreeFileSync 官方 Manual 与 FAQ。
- 精确行为只有领域 RFC 明确需要兼容时才录 golden。
- `14.x` 不是可验收版本；新增上游版本先建立差异清单，再决定是否更新快照。
- 论坛只能解释歧义，不能单独证明能力完整性。
- 每个合并请求只能通过测试或人工验收证据把 TASK_TRACKING 任务改为 `Done`，不能只改图标。

## 4. Commando 设计基线

领域 RFC 必须先审查现有代码，再提出设计。当前基线：

| 层             | 既有边界                                                                       |
| -------------- | ------------------------------------------------------------------------------ |
| Go core        | `backend/internal/*`；CLI 与 Desktop 共享                                      |
| 后台任务       | `backend/internal/worker.Runner` 统一并发、取消、生命周期                      |
| Wails adapter  | `apps/desktop/services/*` 保持薄层；重活不得阻塞 binding goroutine             |
| Desktop events | Wails service 发事件；`apps/desktop/frontend/src/platform/*` 适配生成 bindings |
| Shared UI      | `packages/ui` 不直接导入 Wails bindings；经注入的 platform API 工作            |
| Shared types   | `packages/shared` 只放 npm 类型/常量，不放 Go                                  |
| CLI            | 官方 Go/Cobra CLI 直接调用同一 core；stdout 数据、stderr 诊断                  |

### 4.1 强制架构护栏

1. Go module 权威路径是 `github.com/commandotj/commando`；`backend/go.mod`、Desktop require/replace 和全部 import 必须一致。旧 module path 不得作为兼容别名长期保留。
2. 不新增第二套 task/job manager。需要 progress、subscription 或结果缓存时扩展 `worker.Runner` 或在 Wails adapter 建立薄事件桥。
3. Go 包依赖必须是 DAG。共享 plan/action 数据放无上游依赖的叶子包，禁止 `plan → variant → plan`。
4. `packages/ui` 不新增 `shellService`、Wails import 或平台命令。平台能力经 Go service + generated binding + frontend adapter 注入。
5. 平台特性使用 Go build tags 或明确 provider interface；不把 shell command 当跨平台 API。
6. P1 文件复制只允许一个 core implementation；planner/executor、CLI 与 Desktop 必须复用它。
7. renderer 只持有 plan view 与 opaque plan ID；绝对 Source/Destination、delete target 和 source fingerprint 由 core 保存并在副作用前验证。
8. UI 先定义用户任务、信息层级、键盘/无障碍与响应式行为，再选择组件。不得从 FFS 截图反推布局。
9. 数据安全能力必须按完整承诺验收；采样读取不得宣称“完整复制验证”，小文件绕过不得宣称“fail-safe”。

### 4.2 现有 P1 代码审计结论

| 缺口                                              | 当前证据                                                              | Owner   |
| ------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| item error 被收集后仍返回 `nil` error             | `sync.Execute` 最终固定 `return result, nil`                          | RFC-028 |
| 覆盖目标先 `O_TRUNC`                              | `sync/executor.go` 与 `copy/copy.go` 均直接打开目标                   | RFC-028 |
| Two-way 仅依据 mtime                              | `planner.go:planBidirectional`                                        | RFC-017 |
| checksum/content 未接入 planner（假 UseChecksum） | `entriesEqual(UseChecksum)` 固定返回 false                            | RFC-031 |
| context 未进入 walk/compare/copy/delete           | `BuildPlan`/`Execute` 无 context；Wails 只在入口检查                  | RFC-028 |
| filter 原语未接入 CLI compare                     | `BuildPlan` 直接调用 `fsutil.WalkRoot`，绕过 `engine.IndexRoot`       | RFC-019 |
| renderer 可提交任意绝对 Source/Destination plan   | Wails `Execute(plan)` 直接交给 core                                   | RFC-028 |
| CLI 输出、退出码与输入校验不符合机器协议          | pretty JSON、单一 exit 1、未知 direction 静默变成 bidirectional       | RFC-021 |
| Go module 路径与仓库架构约定不一致                | 审计时使用旧 module path；现已迁移到 `github.com/commandotj/commando` | RFC-012 |

上述缺口关闭前，现有代码只能视为 prototype。局部单元测试、`go vet` 或 race test 通过不能作为 P1 完成证据。

## 5. 领域 RFC 所有权

| 能力域                                 | Owner RFC | 设计责任                                                         |
| -------------------------------------- | --------- | ---------------------------------------------------------------- |
| Google Drive / MTP provider            | RFC-014   | 远程 provider、认证、设备能力                                    |
| UI 基础工作流                          | RFC-015   | 目录选择、比较/同步设置入口                                      |
| Compare engine                         | RFC-016   | 比较原语、symlink、时间容差、并行、平台路径（不含 planner 接线） |
| Sync variants                          | RFC-017   | Mirror/Update/Two-way/Custom 产品语义                            |
| Compare↔Plan E2E verify                | RFC-031   | BuildPlan 消费 engine；CLI T1–T7；**017 之后**                   |
| Sync database                          | RFC-018   | 状态快照、变更与移动检测                                         |
| Filters                                | RFC-019   | 规则模型与 Commando 原生编辑体验                                 |
| Progress / Result UX                   | RFC-020   | 任务进度、取消、终态结果                                         |
| CLI / Config                           | RFC-021   | CLI 合约、profile、schedule、宏                                  |
| Sync workspace                         | RFC-022   | 多目录对、概览、筛选、方向编辑                                   |
| File tools                             | RFC-023   | 打开、外部工具、上下文操作、批量重命名                           |
| Reports                                | RFC-024   | 会话日志、历史、通知                                             |
| Realtime automation                    | RFC-025   | watch、debounce、service                                         |
| SFTP / FTP                             | RFC-026   | 远程协议 provider                                                |
| Delete / Versioning                    | RFC-027   | Permanent、Trash、Versioning                                     |
| Execution safety                       | RFC-028   | 错误策略、验证、fail-safe、锁、元数据                            |
| Platform / distribution / localization | RFC-029   | 平台支持、安装、edition、语言与非功能指标                        |
| Local / mounted SMB compatibility      | RFC-030   | 本地路径、已挂载网络路径与平台文件系统差异                       |

Owner RFC 拥有来源事实、Commando 决策、设计和验收；实施状态只在 TASK_TRACKING 维护。

## 6. 子 RFC 必备结构

每个领域 RFC 在进入 `Under Review` 前必须包含：

1. 对应 TASK_TRACKING Feature ID。
2. 用户问题与生产场景。
3. 当前 Commando 代码、数据流和缺口。
4. 至少两个正交方案。
5. 推荐方案及拒绝其他方案的理由。
6. 数据所有权、状态转换和失败语义。
7. Wails/Go/React 边界与向后兼容分析。
8. CLI、Desktop 与适用平台的验收。
9. 数据安全、取消、重试与恢复策略。
10. 明确说明未采用哪些 FFS 设计。

不得用“等价 FFS 页面”“与 FFS 颜色一致”“类 FFS”代替设计。

## 7. 工作流

```text
官方来源采集
  → TASK_TRACKING 建立稳定 Feature ID
  → Owner RFC 审查现有 Commando
  → Adopt / Adapt / Reject / Defer
  → ROADMAP 更新 RFC 状态与优先级
  → 实现与测试
  → TASK_TRACKING 更新任务状态与证据
```

### 7.1 伞 Completed 定义（v5）

**012 = Completed** 当且仅当（**已满足 2026-07-29**）：

1. 能力目录/决策/Owner 模型已写入本章程与 ROADMAP/TASK_TRACKING；
2. 全部领域 Owner RFC 已**打开并登记** ROADMAP（含 014–031，无 TBD Owner）；
3. P1 实现顺序不再以 012 为第 1 项；实现从 016 起。

**不等待：** 任一领域 RFC 代码落地、CORE-01 rename、P1 全绿。

**CORE-\***：工程卫生，TASK_TRACKING 追踪；**不**作为 012 未完成理由，**不**挡 016 Start。

## 8. 验收清单

### 8.1 012 Start / CORE-01

- [ ] ROADMAP P1 含 031，顺序 017→031。
- [x] `backend/go.mod`、Desktop require/replace、Go import 全部使用 `github.com/commandotj/commando`。
- [ ] `go test` / `go build` 在 rename 后绿。

### 8.2 012 Completed（治理）

- [ ] TASK_TRACKING 覆盖 Adopt/Adapt 原子任务；Reject/Defer 在 Owner RFC 有理由。
- [ ] 无 `TBD`/非 RFC Owner；含 RFC-031 所有权行。
- [ ] 子 RFC 无“行为/UI 1:1”约束；引用 Commando 数据流。
- [ ] ROADMAP 数量、比例、链接机械检查通过。

### 8.3 CORE-02 / CORE-03（可晚于 012 Completed 登记 Done）

- [ ] CLI/Desktop 共用单一 compare/copy/execute，无重复 unsafe copy。
- [ ] renderer 不能提交可篡改绝对路径 plan。
- [ ] P1 顺序上各 gate 有 CLI destructive/integration 证据（CORE-03）。
- [ ] Go 包依赖 DAG 无环。

## 9. 参考

- [FreeFileSync 14.10](https://freefilesync.org/)
- [FreeFileSync Manual](https://freefilesync.org/manual.php)
- [FreeFileSync FAQ / Feature Comparison](https://freefilesync.org/faq.php)
- [ROADMAP](../ROADMAP.md)
- [TASK TRACKING](../TASK_TRACKING.md)
