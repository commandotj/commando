# RFC-2026-025: RealtimeSync — File Watcher, Idle Debounce & Service

---

作者: albert.li
创建时间: 2026-07-29
状态: Proposed
修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 RTS 能力

---

## 摘要

以目录变更触发、可用性触发、空闲防抖和后台运行为能力输入，设计 Commando 自动化。配置与服务模型按 Go/Wails/目标平台重新评审。

## 目标

- [ ] RTS-01: 监控目录变更 — OS 文件事件
- [ ] RTS-02: 目录可用时触发 — USB 插入
- [ ] RTS-03: Idle time 防抖 — 可配置
- [ ] RTS-04: 触发同一 Go sync core；外部程序仅作显式扩展
- [ ] RTS-05: 保存 Commando RealtimeProfile；不复制 `.ffs_real`
- [ ] RTS-06: `%change_path%` `%change_action%` — 环境变量
- [ ] RTS-07: 作为服务运行 — 开机/用户登录

## 提案

### File Watcher (RTS-01)

候选使用 `github.com/fsnotify/fsnotify`。它是第三方跨平台库，不是 Go 标准库；进入评审前验证递归目录、rename、overflow 和目标平台行为。

```go
type Watcher interface {
    Run(ctx context.Context, emit func(Event) error) error
}
```

### Directory Available (RTS-02)

监听用户配置的 sync roots 与平台卷挂载事件，不扫描语言工具链目录。
macOS: fsnotify 当前使用 kqueue；默认不递归，必须逐目录注册并评估 file-descriptor budget。FSEvents 只能作为另一个待验证 provider。
Linux: `inotify` on `/mnt` `/media`。
Windows: `RegisterDeviceNotification`。

### Idle Debounce (RTS-03)

变更事件累积，等待 idle 时间（默认 10s）无新事件后触发。

```go
type Debouncer struct {
    timer *time.Timer
    idle  time.Duration
}
```

### Config (RTS-05)

配置保存 typed profile reference 与 argv，不保存拼接 shell command：

```json
{
    "folders": [{ "left": "/a", "right": "/b" }],
    "idleTimeSec": 10,
    "executable": "commando",
    "args": ["sync", "run", "--profile", "%profile_path%"],
    "runAsService": true
}
```

### Environment Variables (RTS-06)

执行 command 前设置：

| 变量            | 值                                |
| --------------- | --------------------------------- |
| `change_path`   | 触发变更的文件路径                |
| `change_action` | CREATE / MODIFY / DELETE / RENAME |

默认直接调用同一 Go sync core + `worker.Runner`，无需启动子进程。确需外部程序时使用 executable + argv；禁止 shell string。执行期间暂停或合并新事件，完成后恢复监控。

### Service Mode (RTS-07)

| 平台    | 方式                                      |
| ------- | ----------------------------------------- |
| darwin  | launchd plist → `~/Library/LaunchAgents/` |
| linux   | systemd user service                      |
| windows | Windows Service API                       |

## 文件变更

| 文件                                               | 变更                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| `backend/cmd/commando/commands/`                   | 复用现有 `commando` CLI，新增 watch/automation 子命令；不新增第二个 binary |
| `backend/internal/realtimesync/watcher.go`         | RTS-01                                                                     |
| `backend/internal/realtimesync/debounce.go`        | RTS-03                                                                     |
| `backend/internal/realtimesync/service_darwin.go`  | RTS-07                                                                     |
| `backend/internal/realtimesync/service_linux.go`   | RTS-07                                                                     |
| `backend/internal/realtimesync/service_windows.go` | RTS-07                                                                     |

### 生命周期与背压

- `Run(ctx, emit)` 必须支持取消、递归新增目录、root unavailable/recovered 事件。
- 事件队列必须定义上限、coalescing 和 overflow 后全量 rescan。
- 同一 profile 同时最多一个 sync；后续事件合并为一次 pending run。
- shutdown 等待 watcher、debouncer 和运行中的 worker 安全退出。

---

**状态**: Proposed
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`RTS-01`, `RTS-02`, `RTS-03`, `RTS-04`, `RTS-05`, `RTS-06`, `RTS-07`, `RTS-08`, `RTS-09`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
