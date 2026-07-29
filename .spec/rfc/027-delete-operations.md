# RFC-2026-027: Delete Operations — Recycle Bin & Versioning

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — SYN-03 Adopt(已有os.Remove), SYN-04~~08/VER-01~~02 Adapt(需平台trash API)
  修改历史:

- 2026-07-29: 依据 Feature Map，承接 SYN-03…08 与 VER 子能力

---

## 摘要

评审 Permanent、系统废纸篓和 Versioning 三类删除结果。现有 `os.Remove` 只证明永久删除原语存在，不代表用户确认、恢复和失败语义完成。

## 目标

- [ ] SYN-04: 删除到回收站（每平台原生 API）
- [ ] SYN-05: Versioning 框架
- [ ] SYN-06: Versioning Timestamp — 路径+时间戳文件名
- [ ] SYN-07: Versioning Replace — 仅保留最新
- [ ] SYN-08: Versioning 宏路径 — `%timestamp%` `%date%` 等

## 提案

### Recycle Bin (SYN-04)

按 build tag 分文件，禁止 shell out：

| 平台    | API                                     | 文件               |
| ------- | --------------------------------------- | ------------------ |
| darwin  | `NSFileManager.trashItemAtURL` via cgo  | `trash_darwin.go`  |
| windows | `SHFileOperation` via `syscall`         | `trash_windows.go` |
| linux   | XDG Trash spec (`$XDG_DATA_HOME/Trash`) | `trash_linux.go`   |

签名：`func Trash(ctx context.Context, path string) error`

平台 API 若不可中断，进入 non-interruptible critical section 后必须等待真实完成；取消只阻止启动下一项。terminal event 必须在平台调用返回后 exactly once 发出。

### Versioning (SYN-05~08)

三种模式由用户选择：

| 模式               | 行为               | 目标文件名                    |
| ------------------ | ------------------ | ----------------------------- |
| Timestamp (SYN-06) | 每次保留，加时间戳 | `file_20260729_143022.ext`    |
| Replace (SYN-07)   | 仅保留最新         | `file.ext`（覆盖）            |
| Macro (SYN-08)     | 用户自定义路径模板 | `{dest}/%date%/%time%/%file%` |

Versioning 目标目录：用户配置，默认 `<syncRoot>/.commando/versions/`。

## 文件变更

| 文件                                                             | 变更                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| `backend/internal/sync/execute/` 或复用 `backend/internal/file/` | 具体归属须先审查现有 package；平台实现使用 build tags |

## 风险

| 风险                    | 缓解                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| 平台 Trash API 不可中断 | ctx-aware 调度 + non-interruptible critical section + 完成后终态 |
| Linux 无标准回收站      | XDG Trash spec 兜底                                              |

---

**状态**: Approved
**最后更新**: 2026-07-29

## Feature Map 追踪

本 RFC 明确拥有：`SYN-03`, `SYN-04`, `SYN-05`, `SYN-06`, `SYN-07`, `SYN-08`, `VER-01`, `VER-02`。

Decision、Status 与 Evidence 以 [FFS Feature Map](../FFS-FEATURE-MAP.md) 为唯一事实源；本 RFC 负责 Commando 设计与验收。
