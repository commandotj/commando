# RFC-2026-018: Sync Database — `sync.commando_db` & Moved File Detection

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — DB-01~03 Adapt(核心设计待定), 需Approved RFC-012后实现
  修改历史:

- 2026-07-29: 依据 Feature Map，承接 SYN-01/02 与 DB 子能力

---

## 摘要

评审 Commando 是否需要持久化同步快照，以支持 changes 模式和移动检测。SQLite、文件名、单份/双份存储均是待决设计，不从 FFS 数据库布局继承。

## 目标

- [ ] SYN-01: Use database file — 读写 `.commando/sync.commando_db`
- [ ] SYN-02: Detect moved files — DB + file ID，fallback copy+delete

## 提案

### 待决：存储与恢复模型

单一数据库、双侧副本和嵌入 sync root 均保留为候选。进入 `Under Review` 前必须回答：

- 两侧存储无法由单个 SQLite transaction 原子提交，如何 prepare/commit/recover？
- 部分文件成功、部分失败时，哪些 snapshot 可以推进？
- 内部状态目录如何从 scan/filter 中强制排除？
- 跨进程 folder lock 由共享 Go core execution coordinator 获取/释放；CLI 与 Desktop 都必须经过它。`worker.Runner` 只拥有进程内 job lifecycle。
- `modernc.org/sqlite` 是否值得引入；文件格式能否由更小的数据模型完成？

### 数据库 Schema

```sql
CREATE TABLE snapshot (
    relative_path TEXT PRIMARY KEY,
    mod_time_unix INTEGER,
    size INTEGER,
    file_id TEXT,              -- inode on Unix / file index on NTFS
    checksum TEXT,             -- optional, SYN-11
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT,
    completed_at TEXT,
    direction TEXT,
    variant TEXT,
    files_copied INTEGER,
    files_deleted INTEGER,
    errors TEXT
);
```

### Moved File Detection

原理：比较当前扫描与上次 DB snapshot。若 `file_id` 相同但 `relative_path` 不同 → moved。
`file_id` 生成：Unix = `device`+`inode`，Windows = `file index` (MFT)。
Fallback：file_id 不可用时退化为 copy+delete。

## 影响

- DB 为 changes 模式（VAR-03/04）前置依赖
- 只有成功落盘的操作才能推进 snapshot
- 断电恢复必须有 journal/commit marker 测试，不能用“双侧 SQLite transaction”表述

## 文件变更

| 文件                                             | 变更                                       |
| ------------------------------------------------ | ------------------------------------------ |
| `backend/internal/sync/database/`                | 新增包：SQLite 操作                        |
| `backend/internal/sync/database/schema.go`       | 建表、迁移                                 |
| `backend/internal/sync/database/snapshot.go`     | 快照读写                                   |
| `backend/internal/sync/database/movedetect.go`   | SYN-02 移动检测                            |
| `backend/internal/sync/execution_coordinator.go` | 跨进程 folder lock owner；CLI/Desktop 共享 |

## 风险

| 风险                 | 缓解                                       |
| -------------------- | ------------------------------------------ |
| SQLite 并发写入冲突  | file lock + WAL mode                       |
| file_id 跨平台不一致 | 按 OS 独立实现，不可用时 fallback          |
| 双侧副本部分提交     | 明确 prepare/commit/recovery；故障注入测试 |
| 状态目录被同步       | core 强制排除 internal metadata path       |

---

**状态**: Approved
**最后更新**: 2026-07-29

## Feature Map 追踪

本 RFC 明确拥有：`DB-01`, `DB-02`, `DB-03`, `SYN-01`, `SYN-02`。

Decision、Status 与 Evidence 以 [FFS Feature Map](../FFS-FEATURE-MAP.md) 为唯一事实源；本 RFC 负责 Commando 设计与验收。
