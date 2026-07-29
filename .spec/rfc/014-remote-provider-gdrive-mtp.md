# RFC-2026-014: 远程存储扩展 — Google Drive / MTP

---

作者: albert.li / AI
创建时间: 2026-07-28
状态: **Proposed** — 未批准前禁止实施
修改历史:

- 2026-07-28: 初稿 — 承接 REM-04/REM-05
- 2026-07-29: 对齐 RFC-012 v4；删除对旧 RemoteFS 草案、里程碑和治理闸门的依赖

---

## 摘要

本 RFC 在独立叶子包 `backend/internal/remote/` 中评审 **Google Drive** 与 **MTP（手机/相机等便携设备）** 两种远程存储能力。借鉴 FreeFileSync 的能力价值，不复制其包结构、行为或 UI。

**拆分原因：** RFC-2026-012 将 Google Drive / MTP 登记为独立能力域。OAuth、设备驱动和远程语义需要独立产品与架构评审，不能拖入 Compare/Sync 核心。

**与 RFC-012 关系：** RFC-012 只登记能力、决策与 Owner。本 RFC 必须基于现有 Go core、Wails service 和 frontend adapter 自行评审 provider 接口；不得引用 RFC-012 v3 已删除的 `RemoteFS` 草案。

**完成定义：** §4 全部 ✅ + golden/集成测试通过 + `Completed`。

**当前状态：** `Proposed` — 设计获批前不得扩写实现。

---

## §0 治理闸门

| 规则     | 说明                                                                                         |
| -------- | -------------------------------------------------------------------------------------------- |
| **G-01** | 状态 `< Approved` 时，禁止合并 `remote/gdrive.go`、`remote/mtp.go` 任何新功能代码            |
| **G-02** | 仅允许：RFC 文档修订、依赖库调研、mock 测试桩搭建（不含真实凭证的集成代码）                  |
| **G-03** | `Approved` 后方可实施；本 RFC 自己定义里程碑与验收                                           |
| **G-04** | provider 接口必须由现有 `fsutil`、`sync/engine`、Wails adapter 调用流推导，不接受父 RFC 预设 |

---

## 1. 设计原则

1. **接口先审查** — 先验证现有 `fsutil`、`sync/engine` 与 Wails adapter 边界，再定义最小 provider 接口；不得预设 RFC-012 v3 的接口正确。
2. **第三方库先验证** — Google Drive 优先官方 API；MTP 在 libmtp binding、纯 Go 与平台 adapter 间做实证选型。
3. **凭证不入配置文件** — OAuth token / 设备配对秘密写入操作系统 keychain/credential store；`SyncProfile` 只保存不含秘密的 credential reference。
4. **只读优先落地** — 两种 Provider 先支持作为 Compare 的只读扫描源，再支持作为 Sync 目标（写入路径），降低首个里程碑风险。

---

## 2. 架构

```
internal/remote/
├── provider.go        # Provider、Entry；不依赖 sync/engine
├── local.go           # 只有复用价值成立时才适配本地路径
├── gdrive.go          # Google Drive provider
├── gdrive_auth.go      # OAuth2 flow, token 存取                              — 本 RFC
├── mtp.go             # MTP provider
└── mtp_device.go        # 设备枚举、挂载/卸载                                  — 本 RFC
```

### 2.1 Google Drive

```go
type GDriveConfig struct {
    AccountEmail string
    CredentialID string // 操作系统 secret store 中的引用，不是 token 文件路径
    RootFolderID string // Drive 内根文件夹 ID，非本地路径
}

func NewGoogleDrive(cfg GDriveConfig) (Provider, error)
```

- 认证：OAuth2 Installed App flow（用户浏览器授权一次，token 本地缓存并自动刷新）
- 遍历：Drive API `files.list`，按 `parents` 字段重建为 provider-owned `[]remote.Entry`；`sync/engine` 单向转换
- 已知限制（FFS 对标范围内如实标注）：Google Docs/Sheets 等原生格式无二进制内容，Compare content 模式跳过，仅用 metadata（size 为 -1 时降级 time-only 比较）

### 2.2 MTP

```go
type MTPConfig struct {
    DeviceSerial string // 设备枚举匹配用
    MountPath    string // 部分平台走 OS 挂载而非 libmtp 直连，见 §3
}

func NewMTP(cfg MTPConfig) (Provider, error)
```

- macOS/Linux：libmtp 绑定或 OS 原生挂载（如 macOS Image Capture 框架）二选一，选型待 §3 定
- Windows：MTP 设备通常以 Shell 命名空间对象出现，非常规文件路径，需 Windows Portable Devices API
- **按平台差异化实现**：`mtp_darwin.go` / `mtp_windows.go` / `mtp_linux.go` 使用 Go build tags；共同语义留在平台无关文件

---

## 3. 待决事项（批准前必须关闭）

| ID       | 问题                                                 | 选项                                                                                         | 建议                                           |
| -------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| OQ-14-01 | MTP 用 libmtp cgo 绑定还是 OS 原生挂载 API           | A cgo libmtp（跨平台一致，需 CGO_ENABLED） / B 各平台原生 API（无 cgo 依赖，行为可能不一致） | 建议 B；需用目标设备矩阵验证                   |
| OQ-14-02 | Google Drive 认证在 CLI 场景如何完成（无浏览器环境） | A 仅支持 GUI 触发 OAuth / B 额外支持 device code flow（CLI 友好）                            | 建议 B；需验证 provider 官方支持与凭据存储边界 |
| OQ-14-03 | 交付顺序                                             | Google Drive 与 MTP 独立里程碑                                                               | 依据用户价值与可测试设备决定                   |

**关闭方式：** 负责人在本 RFC 修改历史注明 `OQ-14-xx → 选项X`。

---

## 4. 功能清单（验收表）

状态图例：⬜ 未做 · 🟡 部分 · ✅ 完成

| ID     | 功能                                   | 验收标准                                             | 状态 |
| ------ | -------------------------------------- | ---------------------------------------------------- | ---- |
| GD-01  | Google Drive OAuth2 授权               | 首次授权 + token 自动刷新                            | ⬜   |
| GD-02  | Drive 目录遍历                         | 返回 provider-owned entries；engine 单向转换         | ⬜   |
| GD-03  | Drive 文件下载（作为 Compare/Sync 源） | 内容一致性校验                                       | ⬜   |
| GD-04  | Drive 文件上传（作为 Sync 目标）       | 覆盖/新建正确                                        | ⬜   |
| GD-05  | Google 原生格式降级处理                | Docs/Sheets 走 time-only 比较，不误报 conflict       | ⬜   |
| MTP-01 | 设备枚举                               | 列出已连接 MTP 设备                                  | ⬜   |
| MTP-02 | 设备目录遍历                           | 返回 provider-owned entries；engine 单向转换         | ⬜   |
| MTP-03 | 设备文件读取                           | 作为 Compare/Sync 源                                 | ⬜   |
| MTP-04 | 设备文件写入                           | 作为 Sync 目标                                       | ⬜   |
| MTP-05 | 设备拔出/断连处理                      | typed unavailable/disconnected outcome；不得继续写入 | ⬜   |

---

## 5. 测试计划

- **Mock 优先**：无真实 Google 账号/MTP 设备时，provider 测试用 mock server / mock 设备接口；CI 默认跳过需要真实凭证的用例。
- **集成测试**：本地开发者可选跑真实账号/设备用例，不进 CI 强制门禁
- 具体测试用例表必须在进入 `Under Review` 前补齐，包含函数、输入、期望与平台。

---

## 6. 风险评估

| 风险                 | 概率 | 影响 | 缓解                                                                   |
| -------------------- | ---- | ---- | ---------------------------------------------------------------------- |
| MTP 跨平台行为不一致 | 高   | 中   | 按平台原生 API 实现，golden 测试各平台分别验收                         |
| Google API 配额/费用 | 低   | 低   | 使用免费额度内的只读+基本写入操作                                      |
| OAuth 凭证泄露       | 低   | 高   | token 存 OS keychain/secret store；profile 只保存 credential reference |

---

## 7. 相关 RFC

| RFC          | 关系                                            |
| ------------ | ----------------------------------------------- |
| RFC-2026-012 | 能力目录与 Owner 登记；不提供 provider 接口设计 |

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

## Task Tracking 追踪

本 RFC 明确拥有：`LINK-05`, `REM-04`, `REM-05`。

Feature ID 与实施状态以 [TASK TRACKING](../TASK_TRACKING.md) 为准，优先级与 RFC 状态以 [ROADMAP](../ROADMAP.md) 为准；本 RFC 负责产品决策、Commando 设计与验收。
