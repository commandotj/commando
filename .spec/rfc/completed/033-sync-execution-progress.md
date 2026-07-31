# RFC-2026-033: Sync Execution — Progress, Cancel & Resume

---

作者: albert.li/AI
创建时间: 2026-07-30
状态: Draft — 待审批

修改历史:

- 2026-07-30: 初稿
- 2026-07-31: §11 与 RFC-041 replay 关系

---

## 1. 摘要

`commando sync run` 当前静默执行至完成。需要进度流、取消语义、断点恢复。

## 2. E2E 流程

### 正常同步 + 进度

```
$ commando sync run --left /a --right /b --progress
{"type":"progress","file":"a.txt","action":"copy","done":1,"total":3}
{"type":"progress","file":"b.txt","action":"skip","done":2,"total":3}
{"type":"result","copied":2,"skipped":1,"deleted":0,"errors":[]}
exit 0
```

### 取消（Ctrl+C）

```
{"type":"progress","file":"a.txt","action":"copy","done":1,"total":10}
^C
{"type":"result","copied":1,"skipped":0,"errors":[]}
exit 3
```

已完成的 `a.txt` 写入 progress 表。rest 保留。

### 恢复

```
$ commando sync run --left /a --right /b --progress --resume
{"type":"progress","file":"a.txt","action":"skip","done":1,"total":9}
{"type":"progress","file":"b.txt","action":"copy","done":2,"total":9}
...
exit 0
```

`a.txt` 标记 skip（已完成），total 显示剩余 9 项。

### 重置

```
$ commando sync run --left /a --right /b --reset
# 清空 progress 表，全部从头
```

## 3. 数据模型

DB 位置：`{leftRoot}/.commando/sync.db`（一个 left root 一个 DB）

job_id 隔离多 right：

```
jobID = left + "|" + right + "|" + direction
```

```sql
CREATE TABLE progress (
    job_id        TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    action        TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'done',
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (job_id, relative_path)
);
```

`.commando/` 由 `filter.DefaultRules` 的 `.*/**` 自动排除。无需额外配置。

## 4. 交互时序

```
CLI                           Execute                  DB
 │                               │                      │
 │─ BuildPlan ──────────────────→│                      │
 │← Plan                         │                      │
 │                               │                      │
 │─ Execute(ctx,plan,progressFn)→│                      │
 │   progressFn() ←──────────────│                      │
 │   fmt.Println(NDJSON)         │─ MarkDone ──────────→│ INSERT
 │   ...repeat...                │                      │
 │← *Result + err ───────────────│                      │
 │  {"type":"result"}            │                      │
```

## 5. 退出码

| 码  | 含义                          |
| --- | ----------------------------- |
| 0   | 成功                          |
| 1   | 警告（skip/conflict，无错误） |
| 2   | 错误（item error）            |
| 3   | 中止（用户取消）              |

## 6. CLI 标志

| Flag         | 默认  | 说明          |
| ------------ | ----- | ------------- |
| `--progress` | false | NDJSON 进度行 |
| `--resume`   | false | 跳过已完成项  |
| `--reset`    | false | 清空进度      |

`--resume` 和 `--reset` 互斥。

## 7. 接口

```go
type ProgressFn func(relPath string, action Action, done, total int, err error)

func Execute(ctx context.Context, plan *Plan, opts Options, progress ProgressFn) (*ExecuteResult, error)

func (db *DB) MarkDone(jobID, relPath, action string) error
func (db *DB) DonePaths(jobID string) (map[string]bool, error)
func (db *DB) ClearProgress(jobID string) error
```

## 8. 文件

| 文件                   | 变更                                                |
| ---------------------- | --------------------------------------------------- |
| `sync/executor.go`     | ProgressFn + progress 回调 + saveProgress           |
| `sync/planner.go`      | DBPath 默认 `{left}/.commando/sync.db`、resume skip |
| `database/schema.go`   | progress 表                                         |
| `database/snapshot.go` | MarkDone/DonePaths/ClearProgress                    |
| `cmd/.../sync.go`      | --progress/--resume/--reset、信号处理               |

## 9. 正确性保证

恢复时用 timestamp 快速验证：

| 字段    | 写入时机         | 恢复时检查           |
| ------- | ---------------- | -------------------- |
| `mtime` | 每次 copy 成功后 | 与 source mtime 比较 |
| `size`  | 每次 copy 成功后 | 与 source size 比较  |

匹配 → skip。不匹配 → 重新 copy。

```sql
CREATE TABLE progress (
    job_id        TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    action        TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'done',
    mtime         INTEGER NOT NULL DEFAULT 0,
    size          INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (job_id, relative_path)
);
```

## 10. 进度生命周期

```
开始 → 每项 markDone → 成功(0 errors) → auto-clear
                    → 失败/取消    → 保留 → --resume 或 --reset
```

- Desktop UI 消费 ProgressFn → 独立 RFC
- `--signal` 可配置？→ 目前固定 SIGINT
- Pause（暂停）→ 不在此 RFC

## 11. 与 RFC-041 `replay` 的关系

|      | RFC-033 `--resume`           | RFC-041 `replay`                        |
| ---- | ---------------------------- | --------------------------------------- |
| 存储 | SQLite `sync.db` progress 表 | JSON `.commando/plans/{id}.result.json` |
| 粒度 | `job_id` + `relative_path`   | `Plan.ID` + `DoneItems`                 |
| 场景 | 同一次 `run` 崩溃/取消后续跑 | 跨会话重放已保存 plan                   |

**互斥：** `sync run --resume` 与 `sync replay --plan-id` 不得同时使用（CLI 报错）。详见 RFC-041 §11。

---

**状态**: Draft
**最后更新**: 2026-07-31
