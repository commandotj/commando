# RFC-2026-022: UI Panels — Tree Overview, Category Filter, Direction & Multi-pair

---

作者: albert.li
创建时间: 2026-07-29
状态: Proposed
修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接同步工作区与多目录对能力

---

## 设计原则

> FFS 只提供目录概览、类别筛选、多目录对和动作编辑等能力输入。Commando 必须从现有双栏结构和虚拟化表格重新设计：
>
> - CSS 变量体系：`--cmd-accent` `--cmd-surface` `--cmd-border` `--cmd-text` 等 `--cmd-*` 令牌
> - 使用现有组件模式：Ant Design / tanstack-table 表格、Radix Icons、SplitterLayout 布局
> - 支持深色/浅色主题（`.dark` class）
> - BEM 类名命名：`cmd-*`
> - 所有新组件视觉风格应与 `SyncPane.tsx`、`SyncToolbar.tsx` 等现有组件保持一致
>
> **不迁移 FFS 的 wxWidgets 外观。** 树形总览、类别筛选器等面板均以 Commando 设计语言实现，无需模仿 FFS 的具体 UI 风格。

## 摘要

评审 Commando 同步工作区需要的概览、筛选、多目录对、方向编辑和空间信息。不得预设 FFS 面板布局。

## 目标

- [ ] UI-08: 在大结果集中按目录理解变更范围与统计
- [ ] UI-09: 按比较/变更类别收窄结果集
- [ ] UI-14: 多 Folder Pair — 单配置多对目录
- [ ] UI-15: 单文件显式修改动作并立即看到后果
- [ ] UI-16: 文件夹批量改方向 — 对子树应用
- [ ] UI-26: 空间分布树 — 目录树显示大小/文件数

## 提案

### Directory overview requirements (UI-08)

用户必须能查看目录层级、大小、文件数和待执行动作数，并与虚拟化结果表保持选择同步。位置、展开模式和视觉形态由响应式工作区设计决定。

```
📁 src/          (1.2 MB, 34 files)
├── 📁 components/  (800 KB, 12 files)
└── 📁 utils/       (400 KB, 22 files)
```

展开/折叠与右侧同步网格联动。

### Category filter requirements (UI-09)

必须显示每类计数、支持多选组合、键盘操作和清除条件；不得假设顶部按钮栏。

### Multi Folder Pair (UI-14)

SyncProfile 支持多个 `{left, right}` 对：

```json
{
    "folderPairs": [
        { "left": "/a", "right": "/b", "variant": "mirror-right" },
        { "left": "/c", "right": "/d", "variant": "two-way" }
    ]
}
```

CLI: `commando sync run --profile pairs.json` 逐个执行。

### Direction Change (UI-15/16)

动作编辑必须显式显示 source、destination、delete/overwrite 风险和受影响数量。交互可以是 context action、inspector 或批量工具；不得用隐藏图标循环作为规格。

### Space Distribution Tree (UI-26)

展示各目录占比和容量影响；复用 UI-08 数据，不复制其他产品面板。

## 文件变更

| 文件                                                 | 变更                                         |
| ---------------------------------------------------- | -------------------------------------------- |
| `packages/ui/src/components/sync/TreeOverview.tsx`   | UI-08/26                                     |
| `packages/ui/src/components/sync/CategoryFilter.tsx` | UI-09                                        |
| `packages/ui/src/components/sync/FolderPairList.tsx` | UI-14                                        |
| `packages/ui/src/components/FileContextMenu.tsx`     | UI-15/16 扩展                                |
| `packages/shared/types/SyncTypes.ts`                 | FolderPair、PlanOverride、CategoryFilter DTO |
| `backend/internal/sync/`                             | 多目录对 plan、override 校验和执行语义       |
| `apps/desktop/services/sync.go`                      | 薄 Wails adapter                             |
| `apps/desktop/frontend/src/platform/syncApi.ts`      | generated binding adapter                    |
| contract tests                                       | 多目录对、override、类别计数跨层一致         |

---

**状态**: Proposed
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`UI-07`, `UI-08`, `UI-09`, `UI-11`, `UI-14`, `UI-15`, `UI-16`, `UI-26`, `UI-27`, `UI-32`, `UI-33`, `UI-35`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
Replaced by RFC-034: # RFC-2026-022: UI Panels — Tree Overview, Category Filter, Direction & Multi-pair
Status: Deprecated — replaced by RFC-034
