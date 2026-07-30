# RFC-2026-035: Compare Flow — CLI Subprocess & Diff View Switch

---

作者: albert.li/AI
创建时间: 2026-07-30
状态: Draft — 待审批

---

## 1. 摘要

定义点击 Compare 按钮后的完整流程：校验根目录 → spawn `commando sync compare` CLI 子进程扫描并生成 plan → 两栏文件浏览视图切换为 diff 视图展示结果。

**CLI-first 是硬约束（RFC-012 §6）**：UI 不直接调用 `internal/sync` Go API，必须通过真实 spawn 的 CLI 子进程，解析其 NDJSON 输出。CLI 是独立可用的产品，UI 只是消费方。

## 2. 现状问题

`packages/ui/src/services/syncApiService.ts` 的 `compareFolders()` 走 `window.syncApi.compare()`——这是 Wails binding 直接调 Go 后端，不经过 CLI 子进程，违反 CLI-first。

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
   commando sync compare --left <L> --right <R> --strategy <id> --progress
  │
  ▼
3. 子进程逐行输出 NDJSON 到 stdout，Wails 后端逐行读取并转发为
   Wails event（runtime.EventsEmit），前端 onProgress 订阅
  │
  ▼
4. 前端收到 "progress" 事件 → dispatch 更新 Redux 进度字段
   前端收到 "result" 事件（终态）→ dispatch 存入 CompareReport
  │
  ▼
5. UI 视图从「浏览态」切换为「diff 态」：
   两栏文件列表内容替换为 diff 视图，每行显示 CAT-*/action，
   支持切回浏览态（不销毁 diff 结果，可来回切换直到下次 Compare 或 Sync 执行）
```

## 4. CLI 契约（补齐 RFC-033 缺口：Compare 侧无 NDJSON 规格）

```
$ commando sync compare --left /a --right /b --strategy mirror-right --progress
{"type":"progress","phase":"scan","side":"left","path":"a.txt","done":12,"total":0}
{"type":"progress","phase":"scan","side":"right","path":"b.txt","done":8,"total":0}
{"type":"progress","phase":"diff","done":45,"total":45}
{"type":"item","relativePath":"a.txt","category":"left-only","action":"copy"}
{"type":"item","relativePath":"c.txt","category":"conflict","action":"conflict"}
{"type":"result","toCopy":3,"toDelete":1,"conflicts":1,"toSkip":40}
```

- `total:0` 在 `scan` 阶段合理（扫描时总数未知，只报累计 `done`）；`diff` 阶段两侧都扫完，`total` 已知
- 与 RFC-033 `sync run --progress` 的 NDJSON 形状保持一致的字段命名（`type`/`done`/`total`），复用同一套前端解析逻辑，不为 Compare 另造一套格式
- 退出码沿用 RFC-012 §4.6 CLI-05：0 成功 / 1 警告（有 conflict/skip）/ 2 错误 / 3 中止

## 5. Wails 子进程桥接

```go
// apps/desktop/services/sync.go
func (s *SyncService) Compare(req CompareRequest) (jobID string, err error) {
    jobID = newJobID()
    cmd := exec.Command(cliPath, "sync", "compare",
        "--left", req.LeftRoot, "--right", req.RightRoot,
        "--strategy", req.StrategyID, "--progress")
    stdout, _ := cmd.StdoutPipe()
    go streamNDJSONAsEvents(jobID, stdout, s.ctx) // 逐行 parse + runtime.EventsEmit
    go cmd.Wait()
    return jobID, cmd.Start()
}
```

**为什么不直接调 Go 函数：** RFC-012 §6 CLI-first——CLI 必须是独立可验证的产品；UI 走 subprocess 保证"UI 能做的事，命令行用户也能做"永远成立，不会出现只有 GUI 才可用的隐藏路径。

## 5a. Compare 可取消（明确语义，不留待定）

**现状缺口：** 现有 `SyncService.Compare()`（`apps/desktop/services/sync.go`）用 `startJob` 包装 `sync.BuildReport`，只在开始/结束各发一次 `"running"`/`"done"` 事件，**中途完全静默**，也没有逐文件进度。`CancelSync(jobID)` 走 `s.runtime.Tasks.Cancel(jobID)`——这是 `context.Context` 取消，对内部函数调用有效，但换成真实 spawn 的 `exec.Command` 子进程后，**光取消 context 不会杀掉子进程**，必须显式终止进程。

**取消实现：**

```go
func (s *SyncService) Compare(req CompareRequest) (jobID string, err error) {
    jobID = newJobID()
    ctx, cancel := context.WithCancel(s.ctx)
    cmd := exec.CommandContext(ctx, cliPath, "sync", "compare",
        "--left", req.LeftRoot, "--right", req.RightRoot,
        "--strategy", req.StrategyID, "--progress")
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

## 8. 风险

| 风险                                                           | 缓解                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Wails 环境下找不到 CLI 二进制路径                              | 打包时把 CLI 一并嵌入 app bundle，启动时解析绝对路径，非 PATH 依赖 |
| 子进程 NDJSON 解析中断（非法行/截断）                          | 逐行 try-parse，单行失败跳过不中止整个流，记录 warning             |
| `viewMode` 与已有 `diffMap`（SyncPane 现有行染色机制）职责重叠 | `diffMap` 废弃，diff 展示逻辑统一收拢进 `SyncDiffView`             |

## 9. 待定

- `SyncDiffView` 具体交互形式（单列表按 CAT 分组？左右并排逐行对照？）— 需要 UX 设计，不在本 RFC 定稿
- 取消 Compare 时子进程如何终止（SIGTERM？现有 `cancelSyncJob` 是否已覆盖 Compare 阶段）

---

**状态**: Draft
**最后更新**: 2026-07-30
