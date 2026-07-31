# RFC-2026-038: Sync Execution E2E — Verify, Restore & Re-runnable Plans (Umbrella)

---

作者: albert.li/AI
创建时间: 2026-07-31
状态: Draft — 待审批
类型: **Umbrella RFC**（本文档只定义全貌与完成标准，具体实现拆到子 RFC）

修改历史:

- 2026-07-31: 初稿
- 2026-07-31: §1/§4 修正假「已有」标记；步骤 4–5 依赖 RFC-034 Gap 4

---

## 1. 摘要

目标：把 Compare/Sync 功能补完成一个完整的端到端闭环。用户描述的完整 8 步工作流：

```
1. 选左右目录，left = sync root
2. 点 Compare（流程不可中断，进度条+可取消）
3. Compare 完成 → 展示 diff view
4. 用户批准 → 生成 sync plan
5. 执行 plan
6. verify + 保证可回滚（restorable）
7. 用户确认后清理 restorable 备份
8. 标记完成，但 plan 可重新执行
```

**实现状态（2026-07-31 核实）：**

| 步骤                      | 状态                                                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| 1 选目录                  | ✅ UI `syncRoots`                                                          |
| 2 Compare + 进度          | ⚠️ CLI `plan --progress` ✅；Wails **未 spawn**（RFC-037/034 Gap 4）       |
| 3 diff / plan 预览        | ⚠️ `SyncPlanModal` 有；diff 视图 / `Plan.ID` 缺（037/041）                 |
| 4–5 批准 + 执行           | ❌ Wails `Execute()` 直调 `internal/sync`；无 CLI `run` spawn；无 041 落盘 |
| 6–8 verify/restore/replay | ❌ 本 umbrella 子 RFC 范围                                                 |

**本 umbrella RFC 范围：** 第 6/7/8 步，拆成三份子 RFC（下方 §3）。**第 4–5 步 UI 路径必须先完成 RFC-034 Gap 4**，否则 039/041 对 Desktop 用户是摆设。

## 2. 现状核实（写规格前实测代码，非假设）

- `Options.VerifyCopies bool`（`executor.go:65`）——只验证 copy，delete 完全没有 verify
- `Options.DeleteMethod`：`"permanent"`/`"trash"`/`"versioning"`；`Method` 枚举额外有第四种 `VersionReplace`
- Versioning 实现（`delete/delete_version.go`）：`os.Rename` 到 `{VersionDir}/{name}_{yyyyMMdd_HHmmss}{ext}`
- `Plan`/`ExecuteResult`（`types.go`）：**纯内存，无 ID、无持久化**（RFC-041）
- **Wails 执行路径：** `apps/desktop/services/sync.go` 直调 `sync.Execute`/`BuildReport` — **非** CLI spawn（RFC-034 Gap 4）

**已知 bug（不在本 umbrella 或任何子 RFC 修复范围，已单独登记）：** `executor.go:58` 和 `:74` 对同一次成功 copy 重复执行 `result.Copied++`，计数翻倍。子 RFC 实施时注意不要在此基础上引入回归。

## 3. 子 RFC 分解（一个 concern 一份）

| 子 RFC                                                   | Concern                                     | 依赖                                         |
| -------------------------------------------------------- | ------------------------------------------- | -------------------------------------------- |
| [RFC-2026-039](./039-execute-verify-parity.md)           | Verify 完整覆盖 delete；产出 `Restorable[]` | 无（library）；**UI 验收依赖 RFC-034 Gap 4** |
| [RFC-2026-041](./041-plan-persistence-replay-history.md) | Plan/ExecuteResult 持久化、Replay、历史     | 无（library）；**UI 验收依赖 RFC-034 Gap 4** |
| [RFC-2026-040](./040-restorable-cleanup-restore.md)      | Restorable 清理/撤销                        | 039 + 041；**UI 验收依赖 RFC-034 Gap 4**     |

**为什么 041 先于 040：** 040 的 `CleanupRestorable`/`RestorePath` 按 `Plan.ID` 查询持久化的 `ExecuteResult`，这个持久化机制是 041 定义的。039 产出 `RestoreEntry` 数据本身，041 负责把它连同 `ExecuteResult` 一起落盘。三者审批/实施顺序建议：**039 或 041 先行（互不依赖，可并行），040 最后**。

**已否决的初版设计（记录以防重蹈）：** 最初草稿把 §3（verify）/§4（cleanup/restore）/§5+§6（persist/replay/history）全塞进一份 RFC，且 `ExecuteResult` 只停留在函数返回值层面（不持久化）。三视角 review（Linus/Kent/Martin）指出这导致跨会话数据丢失、"重放"退化为整个重跑、"一个 RFC 一件事"原则被破坏。拆分后见上表。

## 4. 完整数据流（8 步落到具体 RFC，供实施时对照全貌）

```
1. UI: setPaneSyncRoot(left)                                    [已有]
2. UI: compareSync() → Wails spawn `sync plan --progress`       [RFC-037 + RFC-034 Gap 4 — CLI 已有，Wails 未接]
3. UI: SyncPlanModal / SyncDiffView 展示 plan（含 Plan.ID）       [部分已有 + RFC-037 diff + RFC-041 ID]
4. UI: 用户点确认 → runSync() → Wails spawn `sync run --progress` [RFC-034 Gap 4 — 未实现；现直调 Execute]
5. CLI `sync run` → Execute + 自动持久化                         [RFC-041；现仅 library 内 Execute，无落盘]
6. Execute 内 verify 覆盖 copy+delete → Restorable[] 落盘        [RFC-039 + RFC-041]
7. UI: Restorable 清单 → spawn cleanup-restore / restore         [RFC-040]
8. UI: PlanHistoryPanel → spawn list-plans / replay              [RFC-041]
```

**Gate：** 步骤 4–5 在 RFC-034 Gap 4 完成前，039/040/041 的 **UI 端到端验收不得标 Done**（CLI-only 验收除外）。

## 5. CLI-first（三份子 RFC 共同约束，此处统一声明不重复）

RFC-012 §6 定的硬约束：Wails 层是 CLI 的薄层 + UI 外壳，不直接 import `internal/sync` 跑逻辑。所有新增能力必须先有对应 CLI 子命令，Wails 侧用 `exec.CommandContext` spawn 它、解析 stdout。三份子 RFC 各自的 §CLI/Wails 桥接章节都要遵守这条，不单独重复论证。

## 6. Umbrella 完成标准

**前置（非本子 RFC 勾选项，但挡 UI E2E）：** [RFC-034](./034-ui-consolidation.md) **Gap 4**（Wails spawn CLI）完成前，038 步骤 4–8 的 Desktop 验收不得标 Done。

按 umbrella 惯例：**完成标准是三份子 RFC 全部 Approved 并开始 tracking**（不要求代码全部落地才关伞）。

- [ ] RFC-039 Approved
- [ ] RFC-040 Approved
- [ ] RFC-041 Approved

全部勾选后，本 umbrella RFC 状态转 `Completed`，移入 `.spec/rfc/completed/`。

---

**状态**: Draft
**最后更新**: 2026-07-31
