# RFC-2026-034: UI Consolidation

---

作者: albert.li/AI
创建时间: 2026-07-30
状态: Approved ✅ — reviewed by Linus/Kent/Martin

---

## 摘要

015/020/022/023 合并。大部分已实现。3 个缺口。

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

## 不实现

树总览, 类别筛选, 多目录对, 动作编辑, 空间图, Finder 打开, 外部工具, 批量重命名, 自动关闭。

## 取代

015, 020, 022, 023。Approval 后全部标记 Closed。

---

**状态**: Draft
