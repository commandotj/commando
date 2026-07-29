# RFC-2026-021: CLI & Config — Return Codes, Profiles, Schedules & Global Settings

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — CLI-01…03 Adopt（命令骨架已有，端到端未完成），CLI-04…12/CFG-01…05 Adapt，MAC-01…03 Defer
  修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 UI-12/13、CLI、CFG 与 MAC 能力
- 2026-07-29: 核对代码现状 — 当前 sync CLI 输出 pretty JSON、仅 exit 1、未知 direction 静默变成 bidirectional；CLI-11 不具备 NDJSON event contract，CLI-01…03 只有命令骨架

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
- [ ] CLI-11: NDJSON stdout event contract；禁止 pretty/multiline JSON
- [ ] CLI-12: stderr diagnostics 与稳定 progress/done/error/canceled 事件
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

退出码只能由 RFC-028 `Outcome.Status` 映射一次。item error、验证失败或部分失败不得因 Go error 为 `nil` 返回 `ExitSuccess`。

### NDJSON 与诊断 (CLI-11/12)

stdout 每行必须是一个完整 JSON object，不缩进，不混入日志：

```json
{"v":1,"type":"progress","jobId":"01...","phase":"copy","completed":3,"total":10}
{"v":1,"type":"item_error","jobId":"01...","path":"a.txt","code":"copy_failed","message":"disk full"}
{"v":1,"type":"done","jobId":"01...","status":"error","counts":{"copied":3,"failed":1}}
```

约束：

- `v`、`type`、`jobId`、terminal `status` 为稳定字段；新增字段必须向后兼容。
- stdout 只允许协议事件；面向人的解释、堆栈和调试日志写 stderr。
- 一个 job 恰好一个 terminal event：`done`、`error` 或 `canceled`。
- `sync plan` 也输出单行 plan event；禁止 `json.Encoder.SetIndent`。

### 输入校验

- Cobra handler 使用 `RunE` 返回 typed error；禁止在子命令内调用 `os.Exit`。
- `--direction` 仅接受 `l2r|left-to-right|r2l|right-to-left|both|bidirectional`；未知值返回 usage error。
- destructive `sync run` 必须显式指定 `--strategy` 或加载包含 strategy 的 profile。不得用拼写错误、空值或默认分支进入 Two-way。
- Two-way 在 RFC-018 database gate 未完成时返回 `changes mode requires database`，禁止 fallback 到 mtime。

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

| 文件                                    | 变更                                                        |
| --------------------------------------- | ----------------------------------------------------------- |
| `backend/cmd/commando/commands/sync.go` | 新增 flag、返回码                                           |
| `backend/cmd/commando/commands/root.go` | 顶层统一映射 typed error/Outcome；删除 handler 内 `os.Exit` |
| `~/.commando/settings.json`             | 全局配置                                                    |
| `backend/internal/sync/profile.go`      | Profile 读写、合并                                          |
| `backend/internal/sync/macro.go`        | CFG-02 宏展开                                               |

## 测试策略

- 每行 stdout 可独立 `json.Unmarshal`；任何 stderr 文本不进入 stdout。
- success/warning/error/canceled 分别得到 exit 0/1/2/3。
- 单个 copy/delete item 失败时 terminal status 非 success。
- 表驱动测试覆盖全部合法 direction/strategy 与 typo、空值、大小写错误。
- 未显式 strategy 的 destructive run 拒绝执行。
- CLI compare/plan/run 使用同一 core plan，禁止命令层复制业务逻辑。

---

**状态**: Approved
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`UI-12`, `UI-13`, `UI-30`, `CLI-01`, `CLI-02`, `CLI-03`, `CLI-04`, `CLI-05`, `CLI-06`, `CLI-07`, `CLI-08`, `CLI-09`, `CLI-10`, `CLI-11`, `CLI-12`, `CFG-01`, `CFG-02`, `CFG-03`, `CFG-04`, `CFG-05`, `MAC-01`, `MAC-02`, `MAC-03`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
