# RFC-2026-037: Compare Flow — CLI Subprocess & Diff View Switch

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

**唯一权威 payload 类型：`SyncProgressPayload`（`packages/shared/types/SyncTypes.ts:85-96`，已存在，不新造）：**

```typescript
export interface SyncProgressPayload {
    jobId?: string;
    type?: string; // "progress" | "done" —— 现状只有这两个值，没有第三个 "result"
    status?: string; // type=done 时: "done" | "error" | "canceled"
    result?: unknown; // type=done 时装终态数据
    error?: string;
    file?: string; // type=progress 时的当前文件
    action?: SyncAction;
    done?: number;
    total?: number;
}
```

**新增 `--progress` 后的 CLI 输出（每行是一个 `SyncProgressPayload` 的 JSON 序列化，跟 Wails event 走的是同一个类型，不是两套）：**

```
$ commando sync plan --left /a --right /b --direction both --progress
{"type":"progress","file":"a.txt","action":"scan","done":12,"total":0}
{"type":"progress","file":"b.txt","action":"scan","done":45,"total":45}
{"type":"done","status":"done","result":{"leftRoot":"/a","rightRoot":"/b","items":[...],"toCopy":3,"toDelete":1,"conflicts":1,"toSkip":40}}
```

- 复用 `sync.ProgressFn`（`func(rel string, act sync.Action, done, total int, err error)`），跟 `run --progress` 是**同一个类型**，不新造一套进度回调签名——`BuildPlan` 需要接受可选 `ProgressFn` 参数（现状不接受，需要改签名）
- **只有最后一行**是 `type:"done"`，其余全是 `type:"progress"`——`streamNDJSONAsEvents`（§5）靠这个字段区分，不是靠"是不是最后一行"这种位置猜测。`result` 字段装完整 `Plan`（`CompareReport` 的 `plan` 部分），不单独发 per-item `{"relativePath":...}` 行
- 退出码沿用 RFC-012 §4.6 CLI-05：0 成功 / 1 警告（有 conflict/skip）/ 2 错误 / 3 中止（Ctrl+C）

**策略/变体参数缺口，具体换算路径（已核实，非假设）：**

`SyncRequest{StrategyID, Direction, ...}` 两个字段并存，`strategyID()`（`apps/desktop/services/sync.go:126-144`）已定义权威顺序：`StrategyID` 非空则直接用，否则从 `Direction`+`DeleteExtraneous` 推导——**`StrategyID` 是唯一权威输入，`Direction` 字段是历史 fallback，不是并列的第二输入源**。

反向换算（`StrategyID` → CLI `--direction` 参数）**不需要新写函数**：`sync.ResolveStrategy(id)` 已存在（`backend/internal/sync/strategy.go`），每个 `Strategy` 记录自带 `Direction` 字段（如 `StrategyMirrorRight` → `DirectionLeftToRight`）。CLI 侧 `parseDirection()`（`backend/cmd/commando/commands/sync.go:180`）本身兼容 `Direction` 的原始值（`"left-to-right"` 等），不要求 `l2r` 缩写——因此 Wails 层拿到 `strategy, _ := sync.ResolveStrategy(req.strategyID())` 后，`string(strategy.Direction)` 可直接作为 `--direction` 参数值，全程零新增代码，只是调用现有函数。

`plan` 阶段只关心 diff 分类不关心删除策略，`DeleteExtraneous` 不需要传给 `plan`（只在后续 `run` 阶段用）。

## 5. Wails 子进程桥接 + 可取消（明确语义，不留待定）

**现状缺口：** 现有 `SyncService.Compare()`（`apps/desktop/services/sync.go` line 99-104）直调 `sync.BuildReport`，`startJob` 包装只在开始/结束各发一次 `"running"`/`"done"` 事件，**中途完全静默**，也没有逐文件进度。`CancelSync(jobID)` 走 `s.runtime.Tasks.Cancel(jobID)`——这是 `context.Context` 取消，对内部函数调用有效，但换成真实 spawn 的 `exec.Command` 子进程后，**光取消 context 不会杀掉子进程**，必须显式终止进程。

**实现（spawn + 取消一并给出，取消是首要需求不是后补）：**

```go
func (s *SyncService) Compare(req SyncRequest) (jobID string, err error) {
    jobID = newJobID()
    ctx, cancel := context.WithCancel(s.ctx)
    strategy, err := sync.ResolveStrategy(req.strategyID()) // 已存在，见 §4
    if err != nil {
        cancel()
        return "", err
    }
    cmd := exec.CommandContext(ctx, s.cliPath, "sync", "plan",
        "--left", req.LeftRoot, "--right", req.RightRoot,
        "--direction", string(strategy.Direction), "--progress")
    // exec.CommandContext: ctx 被 cancel 时，Go runtime 自动向子进程发 SIGKILL。
    // 记录 cancel 函数供 CancelSync(jobID) 调用，不新增单独的 kill 逻辑。
    s.jobCancels.Store(jobID, cancel)

    stdout, _ := cmd.StdoutPipe()
    sawDone := &atomic.Bool{}
    go streamNDJSONAsEvents(jobID, stdout, s.ctx, sawDone) // 见下方状态机说明
    go func() {
        err := cmd.Wait()
        s.jobCancels.Delete(jobID)
        if sawDone.Load() {
            return // CLI 自己已经发过 type:"done"（正常完成路径），不重复发
        }
        // 子进程被杀/异常退出、没能写出自己的 type:"done" 行 —— Wails 层兜底补发一次终态事件
        status := "error"
        if ctx.Err() == context.Canceled {
            status = "canceled"
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

**`streamNDJSONAsEvents` 状态机（不是无脑转发，明确写出判断逻辑）：**

**Go 侧缺口：** 现有 Go 代码全程用裸 `map[string]any` 手搓事件 payload（`apps/desktop/services/sync.go` 各处 `emit(EventSyncProgress, map[string]any{...})`），**没有对应 `SyncProgressPayload` Go struct**。本 RFC 新增一个，字段跟 TS 类型（`packages/shared/types/SyncTypes.ts:85-96`）逐一对齐，两边手动保持同步（现有代码库没有 Go↔TS 类型自动生成机制，是已知的现状约束，不在本 RFC 解决）：

```go
// apps/desktop/services/sync.go 新增（本 RFC 新增类型，现状不存在）
type SyncProgressPayload struct {
    JobID  string `json:"jobId,omitempty"`
    Type   string `json:"type,omitempty"`   // "progress" | "done"
    Status string `json:"status,omitempty"` // type=done 时: done | error | canceled
    Result any    `json:"result,omitempty"`
    Error  string `json:"error,omitempty"`
    File   string `json:"file,omitempty"`
    Action string `json:"action,omitempty"`
    Done   int    `json:"done,omitempty"`
    Total  int    `json:"total,omitempty"`
}
```

```go
// streamNDJSONAsEvents 逐行读 stdout，每行反序列化为 SyncProgressPayload
// 并原样转发为 Wails event。sawDone 用于告知调用方"CLI 是否已经自己
// 发过终态行"，避免 cmd.Wait() 之后重复补发一次 type:"done"。
func streamNDJSONAsEvents(jobID string, stdout io.Reader, ctx context.Context, sawDone *atomic.Bool) {
    scanner := bufio.NewScanner(stdout)
    for scanner.Scan() {
        var payload SyncProgressPayload
        if err := json.Unmarshal(scanner.Bytes(), &payload); err != nil {
            continue // 单行解析失败跳过，不中止整个流（见 §9 风险表）
        }
        payload.JobID = jobID
        if payload.Type == "done" {
            sawDone.Store(true)
        }
        emit(EventSyncProgress, payload)
    }
    // scanner 遇 EOF 或截断行自然结束；截断的半行 JSON 会在 Unmarshal
    // 失败分支被跳过，不 emit——具体行为需 §9a 的
    // TestStreamNDJSONAsEvents_PartialLineOnKill_NoCorruptEvent 验证
}
```

**判定规则（唯一权威，其余小节引用这里不重复定义）：** `payload.Type == "done"` 是终态的唯一标志，不存在其他判断方式（不是"最后一行"、不是"stdout 关闭"）。`§4` CLI 侧和这里的 Go 侧、以及 `§6` 前端侧，三处对"什么是终态"的判断必须都是这一条规则，不能各自为政。

**Compare 阶段也要有真实进度事件**（不是现有代码那种"开始/结束各一次"）：CLI `--progress` 输出的 `"progress"` 行（§4 契约）经 `streamNDJSONAsEvents` 逐行转发为 Wails event，前端才有真实数据可显示，不是假进度条。

## 6. 前端状态变更

**`viewMode` 放 `fileManagerSlice`，不放 `syncSlice`：** `viewMode` 描述的是"两个 pane 现在显示什么"，跟现有 `activePane`（哪个 pane 有焦点）是同一种状态形状——都是全局的、影响 pane 渲染方式的状态，不是 sync 操作本身的进度/结果数据。`FileManagerState.panes` 是全局共享结构（非各 pane 独立 state），`viewMode` 跟着放这里符合现有模式。`compareReport`（sync 操作的结果数据本身）留在 `syncSlice`，两者职责不同不要混。

```typescript
// fileManagerSlice.ts 新增
interface FileManagerState {
    panes: [PaneState, PaneState];
    activePane: 0 | 1;
    viewMode: "browse" | "diff"; // 新增：两栏统一显示模式
}
```

```typescript
// syncSlice.ts 新增
interface SyncState {
    // ...existing...
    compareReport: CompareReport | null;
}
```

```typescript
// compareSync thunk 改为流式 dispatch，不再是一次性 await
// payload 类型统一用 SyncProgressPayload（packages/shared/types/SyncTypes.ts），
// 判定规则与 §5 streamNDJSONAsEvents 完全一致：type==="done" 才是终态，
// 没有第三种 type 值，不存在 payload.report 这个字段（是 payload.result）
export const compareSync = createAsyncThunk(
    "sync/compare",
    async (_, { dispatch, rejectWithValue }) => {
        // ...校验 leftRoot/rightRoot...
        const { jobId } = await window.syncApi.compare(request);
        return new Promise<CompareReport>((resolve, reject) => {
            window.syncApi.onProgress((payload: SyncProgressPayload) => {
                if (payload.jobId !== jobId) return;
                if (payload.type === "progress") {
                    dispatch(progressUpdated(payload));
                    return;
                }
                if (payload.type === "done") {
                    if (payload.status === "error" || payload.error) {
                        reject(new Error(payload.error ?? "Compare failed"));
                        return;
                    }
                    if (payload.status === "canceled") {
                        reject(new Error("Compare canceled"));
                        return;
                    }
                    resolve(payload.result as CompareReport);
                }
            });
        });
    }
);
```

`compareSync.fulfilled` reducer 存 `compareReport`（`syncSlice`）；同一 thunk 内额外 `dispatch(setViewMode("diff"))`（`fileManagerSlice` 的新 action），两个 slice 各自更新自己的状态，不互相直接改对方的 state。

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
- 底部操作栏：`返回浏览` 按钮（`dispatch(setViewMode("browse"))`，不丢弃 `compareReport`，再次进入 diff 视图仍可看到上次结果直到下次 Compare）+ `执行同步` 按钮（有 conflict 时禁用或需二次确认，对齐 S-04）

**明确不做（本 RFC 范围外，避免过度设计）：**

- 不做逐字节文本 diff 高亮（不是文本编辑器类比较，是文件级同步工具）
- 不做拖拽调整同步方向（单文件方向覆盖是 RFC-012 §4.1 UI-15，独立范围）
- 不做搜索/过滤框（列表用现有 `VirtualizedTable` 排序即可满足当前需求，量大后再评估）

## 8. 文件变更

| 文件                                               | 职责                                                                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/components/sync/SyncDiffView.tsx` | 新建：§7 规格的单列表 diff 展示，复用 `VirtualizedTable`                                                                                                       |
| `packages/ui/src/components/sync/SyncPane.tsx`     | 按 `fileManagerSlice.viewMode` 条件渲染 `SyncDiffView` 或原有文件列表                                                                                          |
| `packages/ui/src/app/fileManagerSlice.ts`          | `viewMode` 状态 + `setViewMode` action                                                                                                                         |
| `packages/ui/src/app/syncSlice.ts`                 | `compareReport` 状态 + `progressUpdated` reducer + `compareSync` 改流式                                                                                        |
| `apps/desktop/services/sync.go`                    | 新增 `SyncProgressPayload` struct（现状不存在）+ Compare 改为 spawn CLI 子进程 + `exec.CommandContext` 取消 + `streamNDJSONAsEvents` 状态机（§5）+ NDJSON 转发 |
| `backend/cmd/commando/commands/sync.go`            | `planCmd` 加 `--progress` flag + `sync.BuildPlan` 接受 `ProgressFn`                                                                                            |

**切回浏览态：** 用户点击"返回浏览"或发起新的 Compare 才 `dispatch(setViewMode("browse"))`；Sync 执行完成后同样切回浏览态并刷新两侧目录内容。

## 9. 风险

| 风险                                                                                                      | 缓解                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Wails 环境下找不到 CLI 二进制路径                                                                         | 打包时把 CLI 一并嵌入 app bundle，启动时解析绝对路径，非 PATH 依赖                                                                    |
| 子进程 NDJSON 解析中断（非法行/截断）                                                                     | 逐行 try-parse，单行失败跳过不中止整个流，记录 warning                                                                                |
| `fileManagerSlice.viewMode` 与已有 `diffMap`（SyncPane 现有行染色机制）职责重叠                           | `diffMap` 废弃，diff 展示逻辑统一收拢进 `SyncDiffView`                                                                                |
| `viewMode`（fileManagerSlice）与 `compareReport`（syncSlice）分属两个 slice，切换视图与数据到达顺序需一致 | `compareSync.fulfilled` 内先 dispatch syncSlice 存数据，同步再 dispatch fileManagerSlice 切视图，同一事件循环内完成，不产生中间态闪烁 |
| `exec.CommandContext` 取消后子进程留下的部分写入的 stdout 缓冲未读完                                      | `streamNDJSONAsEvents` 读循环遇 EOF 自然退出，不需要额外 flush 逻辑；Compare 阶段本身只读不写用户数据，取消无副作用需清理             |

## 9a. 测试计划（TDD 前置，非事后补测）

| 层    | 测试名                                                                                        | 验证什么                                                                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI   | `TestPlanCmd_ProgressFlag_EmitsNDJSONLines`                                                   | `sync plan --progress` stdout 每行可独立 `json.Unmarshal` 成 `SyncProgressPayload` 形状；仅最后一行 `type=="done"`，其余全是 `type=="progress"`                                       |
| CLI   | `TestPlanCmd_ProgressFlag_DonePayloadContainsFullPlan`                                        | 终态行的 `result` 字段反序列化后等于 `sync.BuildPlan` 的返回值（字段一一对应，不丢数据）                                                                                              |
| CLI   | `TestPlanCmd_NoProgressFlag_UnchangedOutput`                                                  | 不传 `--progress` 时行为与现状完全一致（一次性裸 JSON，无 NDJSON 包装），回归保护                                                                                                     |
| CLI   | `TestBuildPlan_NilProgressFn_NoPanic`                                                         | `ProgressFn` 传 `nil`（现有调用方式）不崩，向后兼容                                                                                                                                   |
| Wails | `TestCompare_SpawnsRealSubprocess`                                                            | mock 包级 `execCommand` 变量，断言调用参数含 `["sync","plan","--left",...,"--progress"]`（不是直调 `sync.BuildReport`）                                                               |
| Wails | `TestCompare_ResolveStrategyError_ReturnsEarlyNoSpawn`                                        | `req.strategyID()` 是非法值时 `ResolveStrategy` 报错，`execCommand` 未被调用（断言 mock 调用次数为 0）                                                                                |
| Wails | `TestCancelSync_KillsRunningSubprocess`                                                       | 取消后子进程进程号不再存在（非 zombie），且仅收到一次 `type:"done"` 事件（验证 §5 修复的重复终态 bug 不再发生）                                                                       |
| Wails | `TestCancelSync_UnknownJobID_ReturnsFalseNoError`                                             | 取消一个不存在的 jobID 不 panic，返回 `cancelled:false`                                                                                                                               |
| Wails | `TestStreamNDJSONAsEvents_NormalCompletion_NoDoubleTerminalEvent`                             | CLI 自己发出 `type:"done"` 正常退出时，`cmd.Wait()` 之后的 goroutine 不再补发第二个终态事件（`sawDone` 标志生效）                                                                     |
| Wails | `TestStreamNDJSONAsEvents_PartialLineOnKill_NoCorruptEvent`                                   | **需先手工验证真实行为再定断言**：SIGKILL 子进程时 stdout 可能截断半行 JSON，确认 `json.Unmarshal` 失败分支正确跳过该行、不 emit 半成品 payload——先跑一次确认真实截断点在哪，再写断言 |
| Redux | `progressUpdated reducer 合并 SyncProgressPayload 到 progressFile/progressDone/progressTotal` | 修复 task #6 的核心断言：确认这三个字段真的被更新，不再停留在初始值                                                                                                                   |
| Redux | `compareSync 解析 payload.type==="done" 时用 payload.result 而非 payload.report`              | 防止字段名再度漂移回上一版编造的 `.report`                                                                                                                                            |
| Redux | `compareSync.fulfilled 触发 fileManagerSlice setViewMode("diff")`                             | 验证视图切换真的发生，且跨 slice 触发路径正确                                                                                                                                         |
| Redux | `setViewMode("browse") 把 fileManagerSlice.viewMode 设回 browse`                              | 验证切回逻辑，防止卡死在 diff 态                                                                                                                                                      |
| UI    | `SyncDiffView 渲染 conflict 组永远展开且置顶`                                                 | S-04 铁律的 UI 层验证，防止未来重构悄悄破坏这条安全规则                                                                                                                               |
| UI    | `SyncDiffView skip 组默认折叠`                                                                | §7 分组行为回归保护                                                                                                                                                                   |

**门禁：** 本 RFC 涉及的新增/修改文件（`SyncDiffView.tsx` + 修改的 `sync.go`×2 + `syncSlice.ts` + `fileManagerSlice.ts`）比照 RFC-012 §6 的逐包覆盖率纪律，Go 侧新增代码需要 100%（`.coverage-required` 标记同已完成的 `fsutil`/`filter`/`engine`），前端侧至少覆盖上表列出的每一条。

## 10. 待定

- **实施顺序**：`sync.BuildPlan` 需先改签名接受 `ProgressFn`（现状不接受，`planCmd` 需要新增 `--progress` flag 并接线），这是本 RFC 其余部分的前置阻塞项，须在 Wails 桥接（§5）开工前完成
- Diff 视图分组的折叠状态是否需要持久化（下次打开还记得上次哪些组展开/折叠）——非阻塞，可后续迭代加

---

**状态**: Draft
**最后更新**: 2026-07-30
