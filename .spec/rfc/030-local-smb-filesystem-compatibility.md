# RFC-2026-030: Local & SMB Filesystem Compatibility

---

作者: albert.li / AI
创建时间: 2026-07-29
状态: Proposed
修改历史:

- 2026-07-29: 创建 Owner RFC，承接 REM-01

---

## 摘要

本 RFC 负责本地路径和操作系统挂载的 SMB/network share 在 Compare、Plan、Execute、CLI 与 Desktop 中的一致语义。目标是复用现有 Go 文件系统路径，不复制 FreeFileSync 的连接 UI 或远程抽象。

## 架构边界

- 本地路径和已挂载 SMB share 继续走现有 `backend/internal/fsutil`、`sync/engine` 与 executor。
- 不为操作系统已经挂载的路径创建第二套 remote provider。
- 认证、挂载和系统凭证不进入 `packages/ui`；需要产品内挂载时另开平台 service RFC。
- CLI 与 Desktop 消费同一 Go core outcome、取消和错误模型。
- 网络中断、权限变化、case sensitivity、mtime 精度和原子 rename 能力必须按目标文件系统探测或明确降级。

## Task Tracking 追踪

本 RFC 明确拥有 Feature ID：`REM-01`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准。本 RFC 负责形成 Commando 决策和验收证据。

## 评审任务

- [ ] 验证本地路径 Compare/Sync 现有证据。
- [ ] 在 macOS、Windows、Linux 的已挂载 SMB share 上验证扫描、复制、删除和取消。
- [ ] 定义网络中断、重连、权限拒绝和部分写入 outcome。
- [ ] 验证路径大小写、时间精度、symlink 和 atomic replace 差异。
- [ ] 更新 REM-01 Decision、Status 与 Evidence。

## 风险

| 风险                                     | 缓解                                               |
| ---------------------------------------- | -------------------------------------------------- |
| 把 SMB 当成本地磁盘，忽略网络失败        | 网络错误进入 typed outcome；不得静默重试写入       |
| 新建 remote abstraction 复制现有路径逻辑 | 已挂载 share 保持普通路径；只扩展能力探测          |
| 平台挂载流程泄漏进 UI                    | typed Go/Wails platform service；UI 只消费 adapter |

---

**状态**: Proposed
**最后更新**: 2026-07-29
