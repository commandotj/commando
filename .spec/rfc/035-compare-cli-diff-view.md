# RFC-2026-035: Compare Flow — CLI Subprocess & Diff View Switch

---

作者: albert.li/AI
创建时间: 2026-07-30
状态: Draft — 待审批

---

## 1. 摘要

定义点击 Compare 按钮后的完整流程：校验根目录 → spawn `commando sync plan` CLI 子进程扫描并生成 plan → 两栏文件浏览视图切换为 diff 视图展示结果。

**CLI-first 是硬约束（RFC-012 §6）**：UI 不直接调用 `internal/sync` Go API，必须通过真实 spawn 的 CLI 子进程，解析其 NDJSON 输出。CLI 是独立可用的产品，UI 只是消费方。

**命名澄清：** 真实 CLI 子命令叫 `sync plan`，不是 `sync compare`（无此子命令）。"Compare"是 UI 侧的按钮文案/产品语言，`plan`（dry-run 建计划）是它在 CLI 层对应的真实操作——本 RFC 统一用 `plan` 指代 CLI 命令，`Compare` 指代 UI 交互动作，两者说的是同一件事的两个视角，不是两个不同功能。

## 2. 现状问题（已核实 `backend/cmd/commando/commands/sync.go`）

`packages/ui/src/services/syncApiService.ts` 的 `compareFolders()` 走 `window.syncApi.compare()`——这是 Wails binding 直接调 Go 后端（`sync.BuildReport`），不经过 CLI 子进程，违反 CLI-first。

现有 CLI 只有 `sync plan`（一次性 JSON 输出，**无 `--progress` 支持**）和 `sync run`（支持 `--progress`/`--resume`/`--reset`）。`sync plan` 的参数是 `--left`/`--right`/`--direction`（l2r/r2l/both）/`--include`/`--exclude`，**没有 `--strategy` 参数**——策略/变体的概念目前只在 Wails 层的 `SyncRequest.StrategyID`（通过 `strategyID()` 换算成 `Direction`+`DeleteExtraneous`）存在，CLI 侧还是裸的 direction+filter。本 RFC 之前草稿假设的 `--strategy` flag 不存在，需要先在 CLI 补上（或换算逻辑一并搬到 CLI 层），否则 UI 传的策略信息在 spawn 子进程时无处安放。

`syncSlice.ts` 的 `waitForJob()` 只在收到终态（done/error/canceled）时 resolve，中间进度事件被订阅但从未 dispatch 进 Redux——`progressFile`/`progressDone`/`progressTotal` 永远停在初始值，`SyncProgressBar` 显示假进度。

现有 UI 无"结果展示"与"文件浏览"两种视图切换的概念，pane 只有单一浏览态。

## 3. E2E 流程

```
用户点击 Compare
  │
  ▼
1. 前端校验：leftRoot !== rightRoot 且两者都已设置
   （不同则 reject，UI 显示 inline 错误，不发起任何调用）
  │
  ▼
2. Wails 后端 spawn 子进程：
   commando sync plan --left <L> --right <R> --direction <dir> --include <inc> --exclude <exc> --progress
   （--progress 是本 RFC 新增到 planCmd 的 flag，现状没有，见 §4）
  │
  ▼
3. 子进程逐行输出 NDJSON 到 stdout，Wails 后端逐行读取并转发为
   Wails event（runtime.EventsEmit），前端 onProgress 订阅
  │
  ▼
4. 前端收到 "progress" 事件 → dispatch 更新 Redux 进度字段
   前端收到最后一行 plan JSON（终态）→ dispatch 存入 CompareReport
  │
  ▼
5. UI 视图从「浏览态」切换为「diff 态」：
   两栏文件列表内容替换为 diff 视图，每行显示 category/action，
   支持切回浏览态（不销毁 diff 结果，可来回切换直到下次 Compare 或 Sync 执行）
```

## 4. CLI 契约（新增：`sync plan` 目前无 `--progress`，需要补）

**现状（`backend/cmd/commando/commands/sync.go` line 44-53）：** `planCmd` 直接调 `sync.BuildPlan` 后一次性 `json.NewEncoder(os.Stdout).Encode(plan)`，中途完全静默，无进度、无 `--strategy` 参数（只有 `--direction`/`--include`/`--exclude`）。

**新增 `--progress` 后的输出（沿用 `runCmd` 已有的 NDJSON 事件形状，`sync.ProgressFn` 签名不变）：**

```
$ commando sync plan --left /a --right /b --direction both --progress
{"type":"progress","file":"a.txt","action":"scan","done":12,"total":0}
{"type":"progress","file":"b.txt","action":"scan","done":45,"total":45}
{"relativePath":"a.txt","action":"copy","source":"...","destination":"...","reason":"left-newer"}
{"relativePath":"c.txt","action":"conflict","source":"...","destination":"...","reason":"conflict"}
```

- 复用 `sync.ProgressFn`（`func(rel string, act sync.Action, done, total int, err error)`），跟 `run --progress` 是**同一个类型**，不新造一套进度回调签名——`BuildPlan` 需要接受可选 `ProgressFn` 参数（现状不接受，需要改签名）
- 最后仍以完整 `Plan` JSON（`plan.Items[]`，非逐行 `item` 事件）结束，兼容现有 `enc.Encode(plan)` 一次性输出格式，不打散成 NDJSON 逐条 item——**改动最小化**：只加过程进度，不改变终态输出结构
- 退出码沿用 RFC-012 §4.6 CLI-05：0 成功 / 1 警告（有 conflict/skip）/ 2 错误 / 3 中止（Ctrl+C）

**策略/变体参数缺口：** UI 需要传"策略"（如 `mirror-right`），但 `sync plan` 只有裸 `--direction`。两个选项，本 RFC 选 A：

- **A（本 RFC 采用）**：Wails 层在 spawn 子进程前，用现有 `SyncRequest.strategyID()` 换算逻辑（`apps/desktop/services/sync.go` line 126-144）把 `strategyId` 转成 `--direction` + 后续 Execute 阶段需要的 `DeleteExtraneous`，`plan` 阶段只关心 diff 分类不关心删除策略，`--direction` 足够
- B（不采用）：CLI 新增 `--strategy` flag，在 CLI 层重新实现一遍换算逻辑——重复造轮子，两处维护同一份换算表，否决

## 5. Wails 子进程桥接 + 可取消（明确语义，不留待定）

**现状缺口：** 现有 `SyncService.Compare()`（`apps/desktop/services/sync.go` line 99-104）直调 `sync.BuildReport`，`startJob` 包装只在开始/结束各发一次 `"running"`/`"done"` 事件，**中途完全静默**，也没有逐文件进度。`CancelSync(jobID)` 走 `s.runtime.Tasks.Cancel(jobID)`——这是 `context.Context` 取消，对内部函数调用有效，但换成真实 spawn 的 `exec.Command` 子进程后，**光取消 context 不会杀掉子进程**，必须显式终止进程。

**实现（spawn + 取消一并给出，取消是首要需求不是后补）：**

```go
func (s *SyncService) Compare(req SyncRequest) (jobID string, err error) {
    jobID = newJobID()
    ctx, cancel := context.WithCancel(s.ctx)
    direction := req.strategyID().ToDirection() // 复用现有换算逻辑，见 §4 选项 A
    cmd := exec.CommandContext(ctx, s.cliPath, "sync", "plan",
        "--left", req.LeftRoot, "--right", req.RightRoot,
        "--direction", direction, "--progress")
    // exec.CommandContext: ctx 被 cancel 时，Go runtime 自动向子进程发 SIGKILL。
    // 记录 cancel 函数供 CancelSync(jobID) 调用，不新增单独的 kill 逻辑。
    s.jobCancels.Store(jobID, cancel)

    stdout, _ := cmd.StdoutPipe()
    go streamNDJSONAsEvents(jobID, stdout, s.ctx)
    go func() {
        err := cmd.Wait()
        s.jobCancels.Delete(jobID)
        status := "done"
        if ctx.Err() == context.Canceled {
            status = "canceled" // 用户主动取消，非错误
        } else if err != nil {
            status = "error"
        }
        emit(EventSyncProgress, map[string]any{"jobId": jobID, "type": "done", "status": status})
    }()
    return jobID, cmd.Start()
}

func (s *SyncService) CancelSync(jobID string) (map[string]any, error) {
    if cancel, ok := s.jobCancels.Load(jobID); ok {
        cancel.(context.CancelFunc)()
        return map[string]any{"cancelled": true, "jobId": jobID}, nil
    }
    return map[string]any{"cancelled": false, "jobId": jobID}, nil
}
```

`exec.CommandContext` 是标准库对"进程级取消"的原生支持（ctx 取消 → 自动 SIGKILL 子进程），不需要手写信号处理逻辑。取消后 stdout pipe 会因子进程退出而 EOF，`streamNDJSONAsEvents` 的读循环自然结束，不需要额外清理。

**Compare 阶段也要有真实进度事件**（不是现有代码那种"开始/结束各一次"）：CLI `--progress` 输出的 `"progress"` 行（§4 契约）经 `streamNDJSONAsEvents` 逐行转发为 Wails event，前端才有真实数据可显示，不是假进度条。

## 6. 前端状态变更

```typescript
// syncSlice.ts 新增
interface SyncState {
    // ...existing...
    viewMode: "browse" | "diff"; // 新增：pane 显示模式
    compareReport: CompareReport | null;
}
```

```typescript
// compareSync thunk 改为流式 dispatch，不再是一次性 await
export const compareSync = createAsyncThunk(
    "sync/compare",
    async (_, { dispatch, getState, rejectWithValue }) => {
        // ...校验 leftRoot/rightRoot...
        const { jobId } = await window.syncApi.compare(request);
        return new Promise((resolve, reject) => {
            window.syncApi.onProgress(payload => {
                if (payload.jobId !== jobId) return;
                if (payload.type === "progress") {
                    dispatch(progressUpdated(payload)); // 关键修复：中间事件要 dispatch
                    return;
                }
                if (payload.type === "result") {
                    resolve(payload.report);
                }
            });
        });
    }
);
```

`compareSync.fulfilled` reducer 里，除了存 `plan`/`report`，额外设置 `state.viewMode = "diff"`。

## 7. Diff 视图具体规格（`SyncDiffView.tsx`，新建）

**数据来源：** `CompareReport.items[]`（`CompareReportItem{relativePath, action, from, to, reason}`），`action` 取值 `copy | delete | skip | conflict`。

**布局：单一表格，一行一个 `relativePath`，不做左右并排双栏（并排对照适合逐字节文本 diff，这里是文件级别的存在性/新旧差异，单列表更直接，且已有 `VirtualizedTable` 组件可直接复用，不需要新建虚拟滚动逻辑）：**

| 列   | 内容             | 说明                                                                                           |
| ---- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 路径 | `relativePath`   | 复用现有文件名列样式（图标+名称）                                                              |
| 动作 | 图标+文字徽章    | `copy`→蓝色"复制"箭头图标；`delete`→红色垃圾桶图标；`skip`→灰色短横线；`conflict`→黄色警告三角 |
| 方向 | `from`/`to` 推导 | `from` 以 leftRoot 开头 → "→"（左到右）；以 rightRoot 开头 → "←"；delete 类展示"✕"不显示方向   |
| 原因 | `reason`         | 灰色小字，如 "left-newer"、"right-only"                                                        |

**分组与筛选（不是分页，是可折叠分组）：**

- 默认按 `action` 分 4 组，组头显示数量：`将复制 (12)` / `将删除 (3)` / `冲突 (1)` / `跳过 (40，默认折叠)`
- `skip` 组默认折叠（不是不显示——用户需要能确认"为什么这些没变化"，但默认收起避免大列表刷屏，对齐现有 `CompareReport.toSkip` 统计口径）
- `conflict` 组永远置顶展开（S-04 铁律：conflict 永不自动执行，必须让用户先看见）

**行为：**

- 点击一行 → 展开显示 `from`/`to` 完整绝对路径 + `reason` 全文（不截断）
- 顶部保留原有 `SyncSummaryStrip` 统计条（toCopy/toDelete/conflicts/toSkip 数字），点击数字可跳转滚动到对应分组
- 底部操作栏：`返回浏览` 按钮（切 `viewMode` 回 `"browse"`，不丢弃 `compareReport`，再次进入 diff 视图仍可看到上次结果直到下次 Compare）+ `执行同步` 按钮（有 conflict 时禁用或需二次确认，对齐 S-04）

**明确不做（本 RFC 范围外，避免过度设计）：**

- 不做逐字节文本 diff 高亮（不是文本编辑器类比较，是文件级同步工具）
- 不做拖拽调整同步方向（单文件方向覆盖是 RFC-012 §4.1 UI-15，独立范围）
- 不做搜索/过滤框（列表用现有 `VirtualizedTable` 排序即可满足当前需求，量大后再评估）

## 8. 文件变更

| 文件                                               | 职责                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/ui/src/components/sync/SyncDiffView.tsx` | 新建：§7 规格的单列表 diff 展示，复用 `VirtualizedTable`                 |
| `packages/ui/src/components/sync/SyncPane.tsx`     | 按 `viewMode` 条件渲染 `SyncDiffView` 或原有文件列表                     |
| `packages/ui/src/app/syncSlice.ts`                 | `viewMode` 状态 + `progressUpdated` reducer + `compareSync` 改流式       |
| `apps/desktop/services/sync.go`                    | Compare 改为 spawn CLI 子进程 + `exec.CommandContext` 取消 + NDJSON 转发 |
| `backend/cmd/commando/commands/sync.go`            | `compare` 子命令加 `--progress` NDJSON 输出（若未实现，需核实现状）      |

**切回浏览态：** 用户点击"返回浏览"或发起新的 Compare 才切换 `viewMode` 回 `"browse"`；Sync 执行完成后同样切回浏览态并刷新两侧目录内容。

## 9. 风险

| 风险                                                                 | 缓解                                                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Wails 环境下找不到 CLI 二进制路径                                    | 打包时把 CLI 一并嵌入 app bundle，启动时解析绝对路径，非 PATH 依赖                                                        |
| 子进程 NDJSON 解析中断（非法行/截断）                                | 逐行 try-parse，单行失败跳过不中止整个流，记录 warning                                                                    |
| `viewMode` 与已有 `diffMap`（SyncPane 现有行染色机制）职责重叠       | `diffMap` 废弃，diff 展示逻辑统一收拢进 `SyncDiffView`                                                                    |
| `exec.CommandContext` 取消后子进程留下的部分写入的 stdout 缓冲未读完 | `streamNDJSONAsEvents` 读循环遇 EOF 自然退出，不需要额外 flush 逻辑；Compare 阶段本身只读不写用户数据，取消无副作用需清理 |

## 10. 待定

- **实施顺序**：`sync.BuildPlan` 需先改签名接受 `ProgressFn`（现状不接受，`planCmd` 需要新增 `--progress` flag 并接线），这是本 RFC 其余部分的前置阻塞项，须在 Wails 桥接（§5）开工前完成
- Diff 视图分组的折叠状态是否需要持久化（下次打开还记得上次哪些组展开/折叠）——非阻塞，可后续迭代加

---

**状态**: Draft
**最后更新**: 2026-07-30
