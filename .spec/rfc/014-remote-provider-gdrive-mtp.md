# RFC-2026-014: 远程存储扩展 — Google Drive / MTP

---

作者: albert.li / AI
创建时间: 2026-07-28
状态: **Proposed** — 未批准前禁止实施
修改历史:

- 2026-07-28: 初稿 — 从 RFC-2026-012 OQ-02 拆出（REM-04/REM-05 独立范围）

---

## 摘要

本 RFC 定义 Commando `internal/sync/remote` 包对 **Google Drive** 与 **MTP（手机/相机等便携设备）** 两种远程存储的支持，功能对标 FreeFileSync 14.x 同名能力。

**拆分原因：** RFC-2026-012（sync 模块 FFS 1:1 对标）§12 OQ-02 已裁定 Google Drive / MTP 优先级独立于主里程碑，不与 M0–M6 绑定，避免这两个协议的接入复杂度（OAuth 流程、设备驱动差异）拖慢核心 Compare/Sync 引擎交付。

**与 RFC-012 关系：** 本 RFC 依赖 RFC-012 的 `remote.RemoteFS` 接口（§2.1.4 `remote` 子包）与整体架构；`remote` 包禁止被 `variant`/`plan` 直接依赖，仅被 `engine`/`execute` 调用——此约束延续 RFC-012 §2.1.2，不在本 RFC 重复定义，如需变更须回 RFC-012 修订。

**完成定义：** §4 全部 ✅ + golden/集成测试通过 + `Completed`。

**当前状态：** `Proposed` — **不得写实现代码**（见 §0，规则与 RFC-012 §0 同构）。

---

## §0 治理闸门

| 规则     | 说明                                                                                      |
| -------- | ----------------------------------------------------------------------------------------- |
| **G-01** | 状态 `< Approved` 时，禁止合并 `remote/gdrive.go`、`remote/mtp.go` 任何新功能代码         |
| **G-02** | 仅允许：RFC 文档修订、依赖库调研、mock 测试桩搭建（不含真实凭证的集成代码）               |
| **G-03** | `Approved` 后方可实施；不占用 RFC-012 M0–M6 任何里程碑 CI 门禁                            |
| **G-04** | 与 RFC-012 `remote.RemoteFS` 接口冲突时，以 RFC-012 为准，本 RFC 修订接入方式而非接口本身 |

---

## 1. 设计原则

1. **接口复用** — 实现 RFC-012 §2.1.4 已定义的 `remote.RemoteFS` 接口（`Root() string`, `Walk(ctx, Matcher) (engine.Index, error)`），不新增根接口。
2. **第三方库优先**（RFC-012 DEC-05 同策略）— Google Drive 用官方 `google.golang.org/api/drive/v3`；MTP 用成熟 Go MTP 客户端（libmtp 绑定或纯 Go 实现，选型见 §3）。
3. **凭证不入库** — OAuth token / 设备配对信息存用户本地配置（`~/.commando/credentials/`），不进 `SyncProfile`（不随 sync root 分发，避免凭证跟着文件夹被复制走）。
4. **只读优先落地** — 两种 Provider 先支持作为 Compare 的只读扫描源，再支持作为 Sync 目标（写入路径），降低首个里程碑风险。

---

## 2. 架构

```
internal/sync/remote/
├── fs.go              # RemoteFS interface（RFC-012 已定义，本 RFC 不改）
├── local.go           # RFC-012 已实现
├── sftp.go / ftp.go    # RFC-012 已实现
├── gdrive.go           # NewGoogleDrive(cfg GDriveConfig) (RemoteFS, error)  — 本 RFC
├── gdrive_auth.go      # OAuth2 flow, token 存取                              — 本 RFC
├── mtp.go              # NewMTP(cfg MTPConfig) (RemoteFS, error)             — 本 RFC
└── mtp_device.go        # 设备枚举、挂载/卸载                                  — 本 RFC
```

### 2.1 Google Drive

```go
type GDriveConfig struct {
    AccountEmail string
    TokenPath    string // ~/.commando/credentials/gdrive-<hash>.json
    RootFolderID string // Drive 内根文件夹 ID，非本地路径
}

func NewGoogleDrive(cfg GDriveConfig) (RemoteFS, error)
```

- 认证：OAuth2 Installed App flow（用户浏览器授权一次，token 本地缓存并自动刷新）
- 遍历：Drive API `files.list`，按 `parents` 字段重建目录树映射为 `engine.Index`
- 已知限制（FFS 对标范围内如实标注）：Google Docs/Sheets 等原生格式无二进制内容，Compare content 模式跳过，仅用 metadata（size 为 -1 时降级 time-only 比较）

### 2.2 MTP

```go
type MTPConfig struct {
    DeviceSerial string // 设备枚举匹配用
    MountPath    string // 部分平台走 OS 挂载而非 libmtp 直连，见 §3
}

func NewMTP(cfg MTPConfig) (RemoteFS, error)
```

- macOS/Linux：libmtp 绑定或 OS 原生挂载（如 macOS Image Capture 框架）二选一，选型待 §3 定
- Windows：MTP 设备通常以 Shell 命名空间对象出现，非常规文件路径，需 Windows Portable Devices API
- **按平台差异化实现**（与 RFC-012 OQ-03 回收站 API 同样策略）：`mtp_darwin.go` / `mtp_windows.go` / `mtp_linux.go`，Go build tag 分文件，不用运行时 `runtime.GOOS` 分支

---

## 3. 待决事项（批准前必须关闭）

| ID       | 问题                                                 | 选项                                                                                         | 建议                                                                 |
| -------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| OQ-14-01 | MTP 用 libmtp cgo 绑定还是 OS 原生挂载 API           | A cgo libmtp（跨平台一致，需 CGO_ENABLED） / B 各平台原生 API（无 cgo 依赖，行为可能不一致） | 建议 B，与 OQ-03 回收站策略一致；由负责人拍板                        |
| OQ-14-02 | Google Drive 认证在 CLI 场景如何完成（无浏览器环境） | A 仅支持 GUI 触发 OAuth / B 额外支持 device code flow（CLI 友好）                            | 建议 B（CLI-first 是 RFC-012 既定方向，见 RFC-012 §6），由负责人拍板 |
| OQ-14-03 | 里程碑编号                                           | 独立 M0'–M2' 或复用 RFC-012 M5 编号占位                                                      | 建议独立编号，避免与 RFC-012 里程碑表混淆                            |

**关闭方式：** 负责人在本 RFC 修改历史注明 `OQ-14-xx → 选项X`。

---

## 4. 功能清单（验收表）

状态图例：⬜ 未做 · 🟡 部分 · ✅ 完成

| ID     | 功能                                   | 验收标准                                         | 状态 |
| ------ | -------------------------------------- | ------------------------------------------------ | ---- |
| GD-01  | Google Drive OAuth2 授权               | 首次授权 + token 自动刷新                        | ⬜   |
| GD-02  | Drive 目录遍历建索引                   | 映射为 `engine.Index`                            | ⬜   |
| GD-03  | Drive 文件下载（作为 Compare/Sync 源） | 内容一致性校验                                   | ⬜   |
| GD-04  | Drive 文件上传（作为 Sync 目标）       | 覆盖/新建正确                                    | ⬜   |
| GD-05  | Google 原生格式降级处理                | Docs/Sheets 走 time-only 比较，不误报 conflict   | ⬜   |
| MTP-01 | 设备枚举                               | 列出已连接 MTP 设备                              | ⬜   |
| MTP-02 | 设备目录遍历建索引                     | 映射为 `engine.Index`                            | ⬜   |
| MTP-03 | 设备文件读取                           | 作为 Compare/Sync 源                             | ⬜   |
| MTP-04 | 设备文件写入                           | 作为 Sync 目标                                   | ⬜   |
| MTP-05 | 设备拔出/断连处理                      | Prescan 检测不可达，硬拒绝（对齐 RFC-012 PS-09） | ⬜   |

---

## 5. 测试计划

- **Mock 优先**：无真实 Google 账号/MTP 设备时，`remote/gdrive_test.go` / `remote/mtp_test.go` 用 mock server / mock 设备接口跑，CI 默认跳过需要真实凭证的用例（`t.Skip` + 环境变量开关，标准做法同 RFC-012 §7.3 REM-* 行）
- **集成测试**：本地开发者可选跑真实账号/设备用例，不进 CI 强制门禁
- 具体测试用例表（函数名/输入/期望）待 `Approved` 后在实施 PR 中补齐，遵循 RFC-012 §7.12 同等颗粒度约定

---

## 6. 风险评估

| 风险                 | 概率 | 影响 | 缓解                                                                  |
| -------------------- | ---- | ---- | --------------------------------------------------------------------- |
| MTP 跨平台行为不一致 | 高   | 中   | 按平台原生 API 实现，golden 测试各平台分别验收                        |
| Google API 配额/费用 | 低   | 低   | 使用免费额度内的只读+基本写入操作                                     |
| OAuth 凭证泄露       | 低   | 高   | token 本地加密存储，不进 SyncProfile / 不随 sync root 分发（见 §1.3） |

---

## 7. 相关 RFC

| RFC          | 关系                                                                            |
| ------------ | ------------------------------------------------------------------------------- |
| RFC-2026-012 | 父 RFC；本 RFC 从其 OQ-02 拆出，依赖其 `remote.RemoteFS` 接口与整体治理闸门模式 |

---

## 8. 批准清单

```text
[ ] 我已阅读 §4 功能清单并接受范围
[ ] 我已关闭 §3 全部 OQ-14-xx
[ ] 我批准 RFC-2026-014 状态 → Approved
```

**批准记录：** _（日期 / 签字 / 备注）_

---

| 字段         | 值                                                      |
| ------------ | ------------------------------------------------------- |
| **状态**     | `Proposed`                                              |
| **版本**     | v1.0                                                    |
| **最后更新** | 2026-07-28                                              |
| **下一动作** | 负责人关闭 §3 OQ-14-01…03 → 签字 §8 → 状态改 `Approved` |
