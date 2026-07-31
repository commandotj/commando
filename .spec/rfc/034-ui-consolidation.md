# RFC-2026-034: UI Consolidation

---

作者: albert.li/AI
创建时间: 2026-07-30
状态: Approved — In Progress
父 RFC: 无（合并 015/020/022/023）

修改历史:

- 2026-07-30: 初稿
- 2026-07-31: Gap 4 — Wails CLI bridge（038/039/041 的 architectural gate）

---

## 摘要

015/020/022/023 合并。**4 个缺口**（Gap 1–4）。大部分 UI 壳已存在。

## 已实现

SyncPane, SyncRootBar, SyncToolbar, SyncPlanModal, SyncSummaryStrip, SyncLegend, SyncStatusBar, FileContextMenu, VirtualizedTable, DeviceBar, PathBreadcrumb, Theme/i18n, Redux state, Wails bridge。

## Gap 1: 设置面板

`SyncSettingsPanel.tsx`

**Toolbar 可见**: strategy dropdown, compare button, sync button  
**Expander "More options"**: 比较模式, 删除策略, 错误处理, include/exclude filter  
**验证**: 非法 glob → 内联错误 (Martin)  
**Kent**: 常用放外面，高级收起来

## Gap 2: 进度流 + 取消

Wire `onProgress` → Redux → `SyncStatusBar.tsx`

```
ProgressEvent: { type, jobId, file?, action?, done, total, bytesPerSecond?, error? }
terminal: exactly once (done | error | canceled)
```

**Linus**: 取消按钮可见，调 `cancelSyncJob(jobId)`  
**Kent**: 显示文件名 + 速度，不用 spinner  
**Martin**: UI 先 subscribe 再 start job。unsubscribe on unmount

## Gap 3: 结果面板

`SyncResultPanel.tsx`

```
✅ Copied: 5  ⚠️ Skipped: 2  ❌ Errors: 1
a.txt   copied    OK
b.txt   skipped   locked
```

**Kent**: 不 auto-dismiss。手动关闭。  
**Martin**: 映射 `ExecuteResult` 字段。

## Gap 4: Wails CLI bridge（**P1.5 硬 gate — 挡 037/038/039/041**）

**问题（2026-07-31 核实）：** `apps/desktop/services/sync.go` 的 `Compare()`/`Plan()`/`Execute()`/`ListStrategies()` 仍 **直接 import** `internal/sync`（`BuildReport`/`Execute`）。RFC-038 §5 与 RFC-037 要求 CLI-first spawn，但代码未落地。后果：

- RFC-039 的 verify、RFC-041 的自动落盘若只接在 CLI `sync run`/`replay` 上，**UI 触发的 sync 永远绕开**。
- 038 §4 标 `[已有] spawn sync run` 为**假**——必须在本 Gap 完成前，子 RFC 不得标 UI 路径已验收。

**约束（与 RFC-012 §6 / RFC-038 §5 一致）：**

| Wails 方法                          | 必须 spawn                              | 禁止                             |
| ----------------------------------- | --------------------------------------- | -------------------------------- |
| `Compare` / `Plan`                  | `commando sync plan … --progress`       | 直调 `BuildReport` / `BuildPlan` |
| `Execute`                           | `commando sync run … --progress`        | 直调 `sync.Execute`              |
| `ListPlans` / `ReplayPlan`          | `sync list-plans` / `sync replay`       | 直调 planstore                   |
| `CleanupRestorable` / `RestorePath` | `sync cleanup-restore` / `sync restore` | 直调 restore 包                  |

`ListStrategies()` 可保留直调（只读元数据，无副作用）。

**实现要点：**

- 共享 `streamNDJSONAsEvents` + `SyncProgressPayload`（RFC-037 §5）；`run`/`plan`/`replay` 同一 NDJSON 契约。
- `exec.CommandContext` + `jobCancels` map；`CancelSync` 杀子进程（RFC-037 §5）。
- 打包时解析 CLI 绝对路径（非 PATH 依赖）。

**验收：**

| 测试                                     | 断言                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `TestCompare_SpawnsRealSubprocess`       | mock `execCommand`，参数含 `sync plan … --progress`                    |
| `TestExecute_SpawnsRealSubprocess`       | 参数含 `sync run`，**不**调用 `sync.Execute`                           |
| `TestExecute_NoDirectInternalSyncImport` | 静态分析 / 编译约束：`sync.go` 业务路径无 `internal/sync` Execute 调用 |

**依赖：** Gap 4 是 RFC-037 Compare 桥接、RFC-038 步骤 4–5、RFC-041 Wails 方法的 **前置 gate**。Gap 2（Redux 进度）可与 Gap 4 并行，但无 Gap 4 则进度事件来源仍是假 `startJob`。

## 不实现

树总览, 类别筛选, 多目录对, 动作编辑, 空间图, Finder 打开, 外部工具, 批量重命名, 自动关闭。

## 取代

015, 020, 022, 023。Approval 后全部标记 Closed。

---

**状态**: In Progress — Approved；Gap 1/2/3/4 待完成（**Gap 4 挡 038 子 RFC 的 UI 验收**）

**最后更新**: 2026-07-31
