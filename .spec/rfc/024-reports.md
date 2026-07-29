# RFC-2026-024: Reports — Session Log, LastSyncs & Email

---

作者: albert.li
创建时间: 2026-07-29
状态: Approved

批准记录:

- 2026-07-29: albert.li — RPT-01/02/03 Adopt(已实现), RPT-04 Adapt(计划中)
  修改历史:

- 2026-07-29: 依据 Feature ID 追踪，承接 UI-24、RPT 与 SYN-20

---

## 摘要

以同步历史、可审计会话报告和通知为能力输入，设计 Commando 原生报告模型。文件位置、格式与邮件传输不继承 FFS。

## 目标

- [ ] UI-24: LastSyncs.log — 最近 N 次同步日志
- [ ] RPT-04: 同步会话 HTML/文本日志
- [ ] SYN-20: 邮件同步报告 — 可选集成

## 提案

### LastSyncs.log (UI-24)

位置与格式待 desktop storage policy 决定；默认保留上限必须可配置并支持原子更新。

格式：

```
2026-07-29 14:30:22 | mirror-right | /a ↔ /b | ✓ 42 copied, 5 deleted, 1 error
2026-07-28 10:00:00 | two-way     | /c ↔ /d | ✓ 12 copied, 0 deleted
```

UI：`SyncStatusBar` 底部显示上次同步时间，点击展开历史。

### Session Log (RPT-04)

每次同步可生成结构化结果与 escaped HTML 视图。文件路径、错误文本和远程地址必须 HTML escape；报告不得包含凭据。

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Sync Report 2026-07-29</title>
    </head>
    <body>
        <h1>Sync Report</h1>
        <p>Strategy: mirror-right | Started: 14:30 | Duration: 00:02:15</p>
        <table>
            <tr>
                <th>File</th>
                <th>Action</th>
                <th>Result</th>
            </tr>
            <tr>
                <td>data.bin</td>
                <td>→ copy</td>
                <td>✓</td>
            </tr>
        </table>
    </body>
</html>
```

具体目录由 desktop service 控制；`packages/ui` 不直接读取任意本地路径。

### Email Report (SYN-20)

可选 SMTP 配置，同步完成后发送摘要。

非敏感 SMTP metadata 可存全局设置；密码/token 必须存 OS keychain 或 secret reference，禁止进入 JSON/profile：

```json
{
    "emailReport": {
        "smtpHost": "smtp.example.com",
        "smtpPort": 587,
        "from": "commando@example.com",
        "to": ["user@example.com"],
        "onSuccess": false,
        "onWarning": true,
        "onError": true
    }
}
```

## 文件变更

| 文件                                               | 变更                               |
| -------------------------------------------------- | ---------------------------------- |
| `packages/ui/src/components/sync/LastSyncsLog.tsx` | UI-24                              |
| `backend/internal/sync/report/session_log.go`      | RPT-04 HTML 生成                   |
| `backend/internal/sync/report/email.go`            | SYN-20 SMTP                        |
| `apps/desktop/services/`                           | 受控历史读取、报告保存与凭据引用   |
| `apps/desktop/frontend/src/platform/`              | Wails binding adapter              |
| desktop app-data directory                         | 实际路径由平台 storage policy 决定 |

---

**状态**: Approved
**最后更新**: 2026-07-29

## Task Tracking 追踪

本 RFC 明确拥有：`UI-24`, `SYN-20`, `RPT-01`, `RPT-02`, `RPT-03`, `RPT-04`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
