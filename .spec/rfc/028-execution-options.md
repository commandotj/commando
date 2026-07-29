# RFC-2026-028: Execution Options — Error Handling, Verify, Fail-safe & Lock

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — SYN-13 Adopt，SYN-09…12/14…19、META-01…05、EXEC-01/02 Adapt
  修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 SYN-09…19、META 与 EXEC 能力
- 2026-07-29: 核对代码现状 — `sync/executor.go` 与 `copy/copy.go` 直接以 `O_TRUNC` 打开目标；核心执行入口不接收 context
- 2026-07-29: 执行审计 — item error 最终返回 `nil` error；Wails 接受 renderer 提交的完整绝对路径 plan；`sync`/`copy` 存在重复复制实现

---

## 摘要

以错误策略、完整复制验证、断电安全、并发、磁盘优化、互斥和 IO 优先级为能力输入，按现有 `copy`、`sync`、`worker.Runner` 重新设计执行策略。

## 目标

- [ ] SYN-09: 错误处理 Stop — 遇错中止
- [ ] SYN-10: 错误处理 Ignore — 继续并汇总
- [ ] SYN-11: Verify copied files — 拷贝后二进制校验
- [ ] SYN-12: Copy locked files (VSS) — Windows Shadow Copy
- [x] SYN-13: 自动创建缺失目录 — 现有原语部分覆盖，仍需端到端验收
- [ ] SYN-14: 保留 mtime/权限/ADS — 元数据保留
- [ ] SYN-15: Fail-safe copy 算法 — 断电不损坏（先写 temp 再 rename）
- [ ] SYN-16: 并行文件操作数 — 每设备可配置
- [ ] SYN-17: 磁盘空间峰值优化 — 执行顺序
- [ ] SYN-18: Lock directories (`*.lock`) — 多实例互斥
- [ ] SYN-19: Background priority — 降低 IO 优先级
- [ ] EXEC-01: Truthful typed Outcome 与 core-owned plan integrity
- [ ] EXEC-02: Context cancellation — 从 CLI/Runner 传播到 walk、compare、copy、delete

## 提案

### Context cancellation (EXEC-02)

所有 P1 heavy operation 必须接受调用者 context：

```go
func BuildPlan(ctx context.Context, leftRoot, rightRoot string, direction Direction, opts Options) (*Plan, error)
func Execute(ctx context.Context, plan *Plan, opts Options) Outcome
func CopyFile(ctx context.Context, source, destination string, opts CopyOptions) error
func Delete(ctx context.Context, target string, mode DeleteMode) error
```

约束：

- Wails/CLI 只能把 `worker.Runner` 提供的 context 向下传递；core 内禁止换成 `context.Background()`。
- walk、content compare 和 copy 循环必须定期检查 `ctx.Err()`；取消不能只在任务开始前检查。
- delete 在产生副作用前立即检查取消。
- fail-safe copy 写 temp 阶段可取消并清理；进入 atomic replace 临界区后必须完成 replace/父目录 flush，再返回 `canceled` outcome，禁止留下半替换目标。
- 每个 job 只产生一个 terminal outcome；`context.Canceled` 映射 `StatusCanceled`，不得混入普通 item error。

### 错误处理 (SYN-09/10)

`executor.go` 新增 `ErrorMode`：

```go
type ErrorMode int
const (
    ErrorStop   ErrorMode = iota  // 遇错中止
    ErrorIgnore                    // 继续，汇总错误
)
```

统一返回：

```go
type Outcome struct {
    Status     Status // success | warning | error | canceled
    Counts     Counts
    ItemErrors []ItemError
    FatalError error
}
```

CLI exit code、Wails terminal event 与结果 UI 必须只映射该 Outcome。

`Outcome` 必须满足：

- `len(ItemErrors) > 0` 时 Status 只能是 warning/error，禁止 success。
- FatalError 非空时 Status 必须为 error；`context.Canceled` 必须为 canceled。
- executor 不得收集错误后固定返回 `nil`，调用者无需重新推断结果。
- CLI、Wails 与 UI 不得各自实现第二套状态归类。

### Core-owned plan integrity (EXEC-01)

renderer 只能提交 opaque `planId` 与允许覆盖的非破坏性 execution options，不得提交可修改的绝对 Source/Destination 或 delete target。

```text
CLI/Desktop request
  → core Prepare
  → PreparedPlan + public PlanView + opaque planId
  → caller confirms planId
  → core ExecutePrepared(planId)
  → revalidate
  → side effects
```

约束：

- core 保存 PreparedPlan；Wails `Execute` 接收 `planId`，不接收 `sync.Plan` body。
- CLI 同进程持有 PreparedPlan；不得序列化后重新信任 stdout JSON。
- 副作用前校验 canonical source/destination 仍位于批准 roots、动作仍符合 strategy、source fingerprint 未变化。
- plan 一次性消费并有过期时间；root/profile/strategy 变化后失效。
- 校验失败返回 typed stale/invalid-plan Outcome，不执行任何 copy/delete。
- 防止 TOCTOU 的 fingerprint 至少包含 file identity、type、size、mtime；启用 Content mode 时包含 content identity。

### 拷贝验证 (SYN-11)

启用验证时必须覆盖完整源文件与目标文件。实现可选流式 byte compare 或全量 cryptographic hash；头尾采样只能命名为 sampling check，不能满足 SYN-11。

### Fail-safe Copy (SYN-15)

同目录创建唯一临时文件，完整写入并 flush，原子替换目标，必要时 flush 父目录。失败后保留可识别恢复状态或显式清理；不得假设临时文件会自动回收。

现有 `sync/executor.go:copyFile` 与 `copy/copy.go` 的目标 `O_TRUNC` 路径必须删除。覆盖已有目标时，任何错误、取消或进程崩溃都不得留下已截断目标。

`backend/internal/copy` 是唯一复制实现。`sync` executor 只调用该能力；删除私有 `sync.copyFile`。P1 调用链必须显式传入 context，禁止内部回退 `context.Background()`。

### 并行控制 (SYN-16)

共享 Go core `ResourceBudget` 管理 per-device/per-host token。`worker.Runner` 管 job 并发；executor 和 remote provider 只借 token，不各建 goroutine pool。

Runner 等待并发 token 时必须 `select` 监听 `ctx.Done()`；排队任务取消后不得再调用 job function。Runner 不得丢弃未被 adapter 消费的 job error。

### VSS (SYN-12)

Windows 特定：`vss_windows.go` 用 `syscall` 调用 Volume Shadow Copy API。
非 Windows：返回 `ErrUnsupported`。

### 保留 mtime/权限 (SYN-14)

```go
func PreserveMeta(src, dst string) error {
    // os.Chtimes(dst, src.mtime)
    // os.Chmod(dst, src.mode)
    // Windows: 扩展属性 (ADS)
}
```

## 文件变更

| 文件                                | 变更                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| `backend/internal/sync/executor.go` | 接受 context；只执行 core-owned PreparedPlan；统一 Outcome |
| `backend/internal/sync/planner.go`  | 接受 context 并传给 walk/compare                           |
| `backend/internal/copy/`            | context-aware copy、进度、验证与 atomic replace            |
| `backend/internal/worker/runner.go` | 统一并发与取消；禁止新增第二套 job manager                 |
| `apps/desktop/services/sync.go`     | 只传 opaque planId；renderer plan 仅用于展示               |

## 风险

| 风险                                  | 缓解                                                       |
| ------------------------------------- | ---------------------------------------------------------- |
| VSS 仅 Windows                        | 编译标记 + 运行时友好错误                                  |
| Fail-safe copy 增加写入与 flush 成本  | 允许显式关闭；开启时所有文件遵守同一安全承诺               |
| replace 临界区收到取消                | 完成原子提交与目录 flush 后返回 canceled                   |
| renderer 篡改绝对路径或 delete target | core-owned PreparedPlan；执行前 canonical containment 校验 |
| plan 与文件状态之间发生 TOCTOU        | source fingerprint 重验；不一致返回 stale plan             |

## 测试策略

- 排队时取消：heavy operation 不启动，terminal outcome 仅一次。
- walk/compare 中取消：快速返回 `context.Canceled`，不进入 execute。
- copy 中取消：原目标保持完整；temp 被清理或留下可识别恢复记录。
- 写入、flush、verify 任一步失败：原目标 byte-for-byte 不变；不得观察到零长度或部分目标。
- replace 临界区取消：目标只能是完整旧版本或完整新版本。
- delete 前取消：目标存在；delete 完成后取消：Outcome 与真实文件状态一致。
- SYN-11：完整源/目标 byte compare 或 cryptographic hash；禁止采样冒充完成。
- 任一 item copy/delete 失败：Outcome 不能是 success，CLI 不能 exit 0。
- 篡改 PlanView 的 Source/Destination 后提交：core 忽略 body 或拒绝；批准 roots 外文件保持不变。
- source 在 prepare 后被替换：返回 stale plan，不执行目标覆盖。
- 静态检查确认 P1 只有一个文件复制 implementation，`sync.copyFile` 不存在。

---

**状态**: Approved
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`SYN-09`, `SYN-10`, `SYN-11`, `SYN-12`, `SYN-13`, `SYN-14`, `SYN-15`, `SYN-16`, `SYN-17`, `SYN-18`, `SYN-19`, `META-01`, `META-02`, `META-03`, `META-04`, `META-05`, `EXEC-01`, `EXEC-02`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
