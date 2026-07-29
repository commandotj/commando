# RFC-2026-026: Remote — SFTP & FTP Transfers

---

作者: albert.li
创建时间: 2026-07-29
状态: Proposed
修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 REM-02/03/06/07
- REM-04 (Google Drive) 与 REM-05 (MTP) 已在 RFC-2026-014

---

## 摘要

在本地路径能力基础上评审 SFTP、FTP/FTPS、远程缓存和并行传输。协议 provider 必须适配 Commando core，不复制 FFS 连接或缓存模型。

## 目标

- [ ] REM-02: SFTP — 原生 SSH/SFTP 客户端
- [ ] REM-03: FTP / FTPS — 原生 FTP 客户端
- [ ] REM-06: 远程列表缓存 — 增量 delta
- [ ] REM-07: 远程并行传输 — 可配置

## 提案

### SFTP (REM-02)

SSH transport 候选为 Go 扩展模块 `golang.org/x/crypto/ssh`；它不是标准库，也不实现 SFTP 协议。SFTP protocol client 尚未选型。进入 `Under Review` 前必须分别登记并验证 SSH transport 与 SFTP client 的版本、维护状态、context/cancellation 能力和许可证，不得以未声明的 `sftp.Client` 类型预设依赖。

实现复用 RFC-2026-014 的 `remote.Provider` 与 provider-owned `remote.Entry`。协议 client 留在 provider 内部，不泄漏到 sync engine。

连接配置存于远程 profile：

```json
{
    "type": "sftp",
    "host": "server.example.com",
    "port": 22,
    "auth": "key", // key | password | agent
    "keyFile": "~/.ssh/id_rsa",
    "remotePath": "/backup"
}
```

### FTP/FTPS (REM-03)

使用 `github.com/jlaffaye/ftp`。

FTPS: `ftp.DialWithTLS`。FTP: `ftp.Dial`（明文，警告）。

### Remote Cache (REM-06)

```go
type RemoteCache struct {
    mu        sync.Mutex
    entries   map[string][]Entry
    ttl       time.Duration
    lastSync  map[string]time.Time
}

func (c *RemoteCache) Invalidate(path string) {
    // 变更后清除缓存
}

func (c *RemoteCache) Refresh(ctx context.Context, path string) error
```

### Parallel Transfer (REM-07)

远程操作从共享 `ResourceBudget` 借 per-host/per-device token。不得在 job、executor、provider 各建独立 pool 造成乘法并发。

## 文件变更

| 文件                       | 变更                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| `backend/internal/remote/` | 复用 RFC-2026-014 的 `Provider`/`Entry`；保持为不依赖 `sync/engine` 的叶子包 |

## 风险

| 风险              | 缓解                                              |
| ----------------- | ------------------------------------------------- |
| FTP 明文密码      | 仅 FTPS 默认；明文 FTP 警告用户                   |
| SSH key 管理      | 支持 agent forwarding + key file                  |
| SSH/SFTP 依赖失配 | transport 与 protocol client 分开选型、登记并验证 |
| 缓存返回陈旧数据  | generation + invalidation + 可观察 refresh error  |
| 远程取消无效      | 所有网络 API 接受 context                         |

---

**状态**: Proposed
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`REM-02`, `REM-03`, `REM-06`, `REM-07`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
