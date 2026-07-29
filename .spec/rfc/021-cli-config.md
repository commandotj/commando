# RFC-2026-021: CLI & Config — Return Codes, Profiles, Schedules & Global Settings

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — CLI-01~~03 Adopt(命令已实现), CLI-04~~12/CFG-01~~05 Adapt, MAC-01~~03 Defer
  修改历史:

- 2026-07-29: 依据 Feature Map，承接 UI-12/13、CLI、CFG 与 MAC 能力

---

## 摘要

在现有 Go CLI 基础上评审 flag 覆盖、稳定退出码、多配置、无 GUI 调度、全局设置、宏和可变路径。CLI 合约按 Commando 的 NDJSON/stdout、stderr diagnostics 和共享 Go core 设计，不复制 FFS 语法。

## 目标

- [ ] UI-12: 保存/加载交互式 SyncProfile
- [ ] UI-13: 保存无人值守 SyncSchedule
- [ ] CLI-04: 目录对覆盖；Commando flag 语法独立设计，不复制 FFS `-DirPair`
- [ ] CLI-05: 返回码 0/1/2/3（成功/警告/错误/中止）
- [ ] CLI-06: 合并多配置文件（多 folder pair）
- [ ] CLI-07: Schedule 无 GUI 运行
- [ ] CFG-01: 全局设置（`~/.commando/settings.json`）
- [ ] CFG-02: 宏展开（`%timestamp%`、环境变量）
- [ ] CFG-03: 可变盘符/卷名路径（`[VOL]\folder`）

## 提案

### 返回码 (CLI-05)

```go
const (
    ExitSuccess = 0  // 完成，无错误
    ExitWarning = 1  // 完成，有警告
    ExitError   = 2  // 完成，有错误
    ExitAbort   = 3  // 用户中止或崩溃
)
```

### 全局设置 (CFG-01)

`~/.commando/settings.json`：

```json
{
    "lastUsedPaths": ["/path1", "/path2"],
    "defaultVariant": "mirror-right",
    "defaultExclude": ["node_modules/**"],
    "recentProfiles": ["/path/.commando/profile.json"]
}
```

### 宏展开 (CFG-02)

| 宏             | 展开              |
| -------------- | ----------------- |
| `%timestamp%`  | `20260729_143022` |
| `%date%`       | `2026-07-29`      |
| `%time%`       | `14:30:22`        |
| `%left_path%`  | 左根目录绝对路径  |
| `%right_path%` | 右根目录绝对路径  |
| `%env:VAR%`    | 环境变量          |

### CLI flag 覆盖 (CLI-04)

```bash
commando sync run --profile path/.commando/profile.json \
  --leftdir /actual/left \
  --rightdir /actual/right \
  --strategy mirror-left
```

## 文件变更

| 文件                                    | 变更               |
| --------------------------------------- | ------------------ |
| `backend/cmd/commando/commands/sync.go` | 新增 flag、返回码  |
| `~/.commando/settings.json`             | 全局配置           |
| `backend/internal/sync/profile.go`      | Profile 读写、合并 |
| `backend/internal/sync/macro.go`        | CFG-02 宏展开      |

---

**状态**: Approved
**最后更新**: 2026-07-29

## Feature Map 追踪

本 RFC 明确拥有：`UI-12`, `UI-13`, `UI-30`, `CLI-01`, `CLI-02`, `CLI-03`, `CLI-04`, `CLI-05`, `CLI-06`, `CLI-07`, `CLI-08`, `CLI-09`, `CLI-10`, `CLI-11`, `CLI-12`, `CFG-01`, `CFG-02`, `CFG-03`, `CFG-04`, `CFG-05`, `MAC-01`, `MAC-02`, `MAC-03`。

Decision、Status 与 Evidence 以 [FFS Feature Map](../FFS-FEATURE-MAP.md) 为唯一事实源；本 RFC 负责 Commando 设计与验收。
