# RFC-2026-039: Execute — Verify Parity for Delete (Versioning & VersionReplace)

---

作者: albert.li/AI
创建时间: 2026-07-31
状态: Draft — 待审批
父 RFC: [RFC-2026-038](./038-sync-execution-verify-restore-replan.md)（umbrella）

修改历史:

- 2026-07-31: 初稿
- 2026-07-31: 风险表：`delete_test.go` 编译破坏；无 UI 入口时优先级说明

---

## 1. 摘要

`Options.VerifyCopies` 目前只校验 copy 操作（对比 source/destination 内容），delete 操作（versioning/VersionReplace 备份）完全没有校验。本 RFC 让两条路径对称——copy 有 verify，delete 也要有。

## 2. 现状核实

- `executor.go:65` `VerifyCopies` 分支只在 `ActionCopy` case 内，`ActionDelete` case（`executor.go:75-88`）没有任何校验
- `dels.Delete(ctx, path, method, destDir, template) error`（`delete.go:22`）不返回实际写入路径，无法在调用方做"备份是否真的落盘"的校验
- `Method` 枚举有四种：`Permanent`/`Trash`/`Versioning`/`VersionReplace`（`delete.go:14-18`），只有后两种产生可校验的备份文件

## 3. 前置改动：`Delete` 签名

```go
// delete.go
func Delete(ctx context.Context, path string, method Method, destDir string, template string) (restorePath string, err error) {
    switch method {
    case Permanent:
        return "", os.Remove(path)
    case Trash:
        return "", trash(ctx, path)
    case Versioning:
        dest, err := version(ctx, path, destDir)
        return dest, err
    case VersionReplace:
        dest, err := versionReplace(ctx, path, destDir)
        return dest, err
    default:
        return "", os.Remove(path)
    }
}
```

`version`/`versionReplace`（`delete_version.go`）已经在内部算出 `dest` 路径，只是当前函数签名没有把它返回出去——改动是把已经算出来的值传上去，不是新增计算逻辑。

**唯一业务调用点：** `executor.go` ActionDelete case。

**测试调用点（签名变更会编译炸）：** `backend/internal/sync/delete/delete_test.go` 约 8 处 `Delete(ctx, path, method, …)` — 须同步改为 `(restorePath, err)` 接收。

## 4. Verify 覆盖 Delete

```go
// executor.go ActionDelete case
case ActionDelete:
    if opts.DryRun {
        result.Deleted++
        continue
    }
    method := deleteMethod(opts.DeleteMethod)
    restorePath, err := dels.Delete(ctx, item.Source, method, opts.VersionDir, "")
    if err != nil {
        result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", item.RelativePath, err))
        if opts.ErrorMode == "stop" {
            return result, fmt.Errorf("delete %s: %w", item.RelativePath, err)
        }
        continue
    }
    if opts.VerifyCopies && (method == dels.Versioning || method == dels.VersionReplace) {
        if _, statErr := os.Stat(restorePath); statErr != nil {
            result.Errors = append(result.Errors, fmt.Sprintf("%s: version backup missing after delete", item.RelativePath))
            if opts.ErrorMode == "stop" {
                return result, fmt.Errorf("verify delete %s: backup missing", item.RelativePath)
            }
            continue
        }
    }
    result.Deleted++
    if restorePath != "" {
        result.Restorable = append(result.Restorable, RestoreEntry{
            RelativePath: item.RelativePath,
            OriginalPath: item.Source,
            BackupPath:   restorePath,
        })
    }
```

**`Restorable[]` 填充：** Versioning/VersionReplace 成功且（若启用 verify）校验通过后追加条目，供 RFC-040 清理/撤销。Permanent/Trash 不产生条目。

**为什么两种模式都要覆盖 verify：** `VersionReplace` 跟 `Versioning` 同样写入可恢复文件；遗漏则数据安全漏洞。

## 5. 测试计划

| 测试名                                                              | 验证什么                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `TestDelete_VersioningReturnsBackupPath`                            | Versioning 模式返回真实备份路径                                  |
| `TestDelete_VersionReplaceReturnsBackupPath`                        | VersionReplace 模式同样返回真实备份路径                          |
| `TestDelete_PermanentTrash_EmptyRestorePath`                        | Permanent/Trash 模式 `restorePath` 为空字符串，不是 nil 或 panic |
| `TestExecute_VerifyDelete_Versioning_Success`                       | 正常 versioning 删除后 verify 通过，`Deleted` 计数正确           |
| `TestExecute_VerifyDelete_VersionReplace_Success`                   | 正常 VersionReplace 删除后 verify 通过                           |
| `TestExecute_VerifyDelete_ErrorModeStop_AbortsOnMissingBackup`      | `ErrorMode=stop` 时备份缺失中止整体执行                          |
| `TestExecute_VerifyDelete_ErrorModeIgnore_ContinuesOnMissingBackup` | `ErrorMode=ignore` 时记错继续，不中止                            |
| `TestExecute_VerifyCopiesFalse_SkipsDeleteVerify`                   | `VerifyCopies=false` 时 delete 不做任何校验（现状行为保持不变）  |

## 6. 依赖与验收范围

| 范围                                        | Gate                                        |
| ------------------------------------------- | ------------------------------------------- |
| Library（`executor` + `delete` 单测）       | 本 RFC §5 测试全绿即可标 **library Done**   |
| CLI `sync run --verify`（待 021 暴露 flag） | 与 041 持久化一并验收                       |
| **Desktop UI**                              | **RFC-034 Gap 4** 完成后，经 spawn 路径验收 |

## 7. 风险

| 风险                                 | 缓解                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `Delete` 签名改动                    | **编译期：** `executor.go` + `delete_test.go` 全部更新；`go test ./internal/sync/delete/...` 门禁                  |
| Verify 增加 `os.Stat`                | `VerifyCopies` 可选；默认 off                                                                                      |
| **无 CLI/UI 入口暴露 delete verify** | 当前 `VerifyCopies` 仅 library/CLI 内联；本 RFC 为 **library 正确性**；与 RFC-040 UI 一并验收前标「CLI-only Done」 |
| 数据安全优先级                       | Versioning/VersionReplace 路径为真实漏洞面；Permanent/Trash 无 backup 路径，verify 不适用                          |

---

**状态**: Draft
**最后更新**: 2026-07-31
