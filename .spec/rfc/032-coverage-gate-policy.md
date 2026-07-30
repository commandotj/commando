# RFC-2026-032: Coverage Gate & Untestable Code Policy

---

作者: albert.li/AI
创建时间: 2026-07-30
状态: Approved

---

## 摘要

定义代码覆盖率门禁策略。所有新 Go 包默认要求 100% 语句覆盖率。对无法通过单元测试覆盖的路径（TOCTOU race、平台特定、驱动注册），使用 `// coverage:ignore` 注释标记，由 `scripts/covfilter` 工具在覆盖率计算中排除。

## 规则

### 1. coverage-required 门禁

- 所有 `backend/internal/` 下新建包须带 `.coverage-required` 文件，内容为 `100`
- husky pre-commit 钩子 `check-changed-coverage.sh` 检查变更包的覆盖率
- 覆盖率计算使用 `scripts/covfilter`，排除已标记的 `// coverage:ignore` 行

### 2. coverage:ignore 使用条件

仅在以下情况使用：

| 类别        | 示例                       | 理由                                               |
| ----------- | -------------------------- | -------------------------------------------------- |
| TOCTOU race | `Stat` 之后 `Walk` 失败    | 文件在两次调用间被删除，窗口过窄无法可靠触发       |
| 驱动注册    | `sql.Open("sqlite", ...)`  | 驱动通过 blank import 注册，永不失败               |
| 平台特定    | `syscall.Stat_t` 仅在 Unix | Windows fallback 需 Windows CI；用 build tags 分离 |
| 硬件故障    | `Read` 中途磁盘 I/O 错误   | 需真实硬件故障，不可在单测中模拟                   |

**禁止**为以下情况使用 `// coverage:ignore`：

- 未处理的错误路径（应先添加测试）
- 复杂业务逻辑分支（应重构为可测试）
- 因偷懒而跳过的测试

### 3. 可测试错误路径指南

错误路径应通过以下方式变为可测试：

- **接口注入**：`Open` 接受 `driverName` 参数 → 测试传无效名称
- **状态机**：`Close` 后再调 `WriteSnapshot` → Begin 失败
- **数据驱动**：错误 schema → `Scan` 失败

### 4. covfilter 注释格式

单一语句块（如裸露的 `return`）：

```
// coverage:ignore reason
statement
```

`if err != nil { ... }` 块（需双注释）：

```
// coverage:ignore reason
if val, err := doThing(); err != nil {
    // coverage:ignore reason
    return err
}
```

**限制**：不支持 `if := ; err != nil { ... } else { ... }` 构造。避免 else 分支。

## 当前状态

| 包              | 覆盖率 | 备注                                                |
| --------------- | ------ | --------------------------------------------------- |
| `sync/engine`   | 100%   | ✅                                                  |
| `sync/delete`   | 100%   | ✅                                                  |
| `sync/database` | 87.9%  | sql.Open 驱动注册、FileID 非 Unix fallback → 待改善 |

## 实施

1. `scripts/check-changed-coverage.sh` — 已部署，husky pre-commit
2. `scripts/covfilter/main.go` — 已部署
3. `.coverage-required` — 按包创建

---

**状态**: Approved
**最后更新**: 2026-07-30
