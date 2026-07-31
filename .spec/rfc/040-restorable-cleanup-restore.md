# RFC-2026-040: Restorable — Cleanup & Restore After Sync

---

作者: albert.li/AI
创建时间: 2026-07-31
状态: Draft — 待审批
父 RFC: [RFC-2026-038](./038-sync-execution-verify-restore-replan.md)（umbrella）
依赖: [RFC-2026-039](./039-execute-verify-parity.md)（Restorable 清单来自 verify 覆盖）、[RFC-2026-041](./041-plan-persistence-replay-history.md)（`ExecuteResult` 持久化，本 RFC 按 `Plan.ID` 查询依赖它）

修改历史:

- 2026-07-31: 初稿
- 2026-07-31: API 返回 `error`；§6 清理确认 UI 规格

---

## 1. 摘要

RFC-039 让 versioning 删除产生可校验的备份文件；本 RFC 定义这些备份之后怎么处理——用户确认同步没问题 → 清理；用户发现同步错了 → 撤销恢复。两条路径缺一不可，否则 restorable 是单向安全网，形同虚设。

## 2. 依赖前提

本 RFC 依赖 RFC-041 的 `ExecuteResult.Restorable` 持久化（`.commando/plans/{id}.result.json`）。**RFC-039** 负责在 Execute 时填充 `Restorable[]`。

**前置 gate：** RFC-034 Gap 4（Wails spawn）；无 spawn 时 UI 步骤 7 不可验收。

```go
type RestoreEntry struct {
    RelativePath string `json:"relativePath"`
    OriginalPath string `json:"originalPath"` // 被删除/覆盖前的原路径
    BackupPath   string `json:"backupPath"`   // versioning/VersionReplace 备份的实际路径
}
```

## 3. Go API

```go
// internal/sync/restore.go（新增）

// CleanupRestorable loads the persisted ExecuteResult for planID and
// permanently deletes every backup it lists. Irreversible (RFC-012 S-05).
func CleanupRestorable(leftRoot, planID string) (cleaned int, errs []string, err error) {
    result, loadErr := LoadExecuteResult(leftRoot, planID)
    if loadErr != nil {
        return 0, nil, loadErr // plan 不存在 vs 读盘失败 — 调用方可区分
    }
    for _, e := range result.Restorable {
        if rmErr := os.Remove(e.BackupPath); rmErr != nil {
            errs = append(errs, fmt.Sprintf("%s: %v", e.BackupPath, rmErr))
            continue
        }
        cleaned++
    }
    return cleaned, errs, nil
}

// RestorePath undoes delete backups. relPath == "" restores all entries.
func RestorePath(leftRoot, planID, relPath string) (restored int, errs []string, err error) {
    result, loadErr := LoadExecuteResult(leftRoot, planID)
    if loadErr != nil {
        return 0, nil, loadErr
    }
    for _, e := range result.Restorable {
        if relPath != "" && e.RelativePath != relPath {
            continue
        }
        if err := os.Rename(e.BackupPath, e.OriginalPath); err != nil {
            errs = append(errs, fmt.Sprintf("%s: %v", e.RelativePath, err))
            continue
        }
        restored++
    }
    return restored, errs, nil
}
```

## 4. CLI（唯一执行入口，CLI-first）

```
commando sync cleanup-restore --plan-id <id> --left <leftRoot>
commando sync restore --plan-id <id> --left <leftRoot> [--path <relPath>]
```

退出码：0 全部成功 / 1 部分失败（`errs` 非空但 `cleaned`/`restored` > 0）/ 2 全部失败。

## 5. Wails 桥接（CLI-first：spawn 子进程，不直调 Go 函数）

| CLI 命令                                                | Wails 方法                                           |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `sync cleanup-restore --plan-id <id> --left <L>`        | `SyncService.CleanupRestorable(leftRoot, planID)`    |
| `sync restore --plan-id <id> --left <L> [--path <rel>]` | `SyncService.RestorePath(leftRoot, planID, relPath)` |

两者均 **RFC-034 Gap 4** spawn，解析 stdout JSON（同 RFC-037 §5）。

## 6. UI

| 文件                                                  | 变更                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/ui/src/components/sync/RestorablePanel.tsx` | 新建：Execute 完成后展示 `Restorable` 清单，"清理全部"/"撤销全部"/逐条撤销           |
| `packages/ui/src/services/syncApiService.ts`          | 新增 `cleanupRestorable(leftRoot, planId)`/`restorePath(leftRoot, planId, relPath?)` |

**交互（RFC-038 步骤 7 — 已定，非待定）：** `CleanupRestorable` 不可逆，UI **必须**二次确认：

- 组件：`RestorableConfirmDialog`（或在 `RestorablePanel` 内嵌）
- 文案：显示将永久删除的备份数量 + `planId` 短 ID
- 主按钮：`确认清理`（destructive 样式）；次按钮：`取消`
- 勾选：`我了解此操作不可撤销`（对齐 RFC-012 S-05）
- `RestorePath` 单条撤销：无需勾选；`撤销全部` 需一次确认（非 destructive 样式）

## 7. 测试计划

| 测试名                                                          | 验证什么                                                |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| `TestCleanupRestorable_LoadsFromPersistedResult`                | 传 `planID` 不传清单本身，函数自己加载持久化结果并清理  |
| `TestCleanupRestorable_RemovesAllBackups`                       | 清理后 `VersionDir` 下对应文件全部不存在                |
| `TestCleanupRestorable_PartialFailure_ReportsErrsKeepsCleaning` | 某个备份文件已被外部删除，其余仍正常清理，不中止        |
| `TestCleanupRestorable_UnknownPlanID_ReturnsError`              | `err != nil` 且 `cleaned==0`；非 panic                  |
| `TestRestorePath_SingleEntry_LeavesOthersIntact`                | 传 `relPath` 只撤销一条，其余 `Restorable` 条目不受影响 |
| `TestRestorePath_EmptyPath_RestoresAll`                         | 不传 `relPath` 时全部撤销                               |
| `TestRestorePath_MovesBackupToOriginal`                         | 撤销后原路径恢复文件内容，备份路径不再存在              |
| CLI                                                             | `TestCLICleanupRestore_ExitCodeReflectsPartialFailure`  | 部分失败时退出码为 1 |

## 8. 待定

- 清理/撤销后是否更新 `PlanSummary` 状态字段（可撤销/已清理）— 交给 041 迭代

---

**状态**: Draft
**最后更新**: 2026-07-31
