# RFC-2026-013: Wails Dev/Prod 应用身份分离

---

作者: Codex/albert.li
创建时间: 2026-07-27
状态: Completed
修改历史:

- 2026-07-27: 用户批准 Wails 对齐方案、`me.systembug` 域名前缀与 Dev/Prod 共存目标 by Codex
- 2026-07-27: 补充测试先行的原子实施清单 by Codex
- 2026-07-27: 完成 Dev/Prod 身份、图标、打包入口与运行时验证 by Codex

---

## 摘要

本 RFC 定义 Commando 桌面应用的生产与开发身份。生产包必须为 `Commando.app`，开发包必须为 `Commando Dev.app`；两者使用不同 bundle ID、SingleInstance ID、显示名称和图标，可以在 macOS 上同时运行。

实现继续使用 Wails 3 的 `build/config.yml`、根 `Taskfile.yml` 与平台 Taskfile，不引入第二套构建系统。

## 背景

### 问题描述

当前 Wails Taskfile 使用：

```yaml
APP_NAME: "commando"
```

因此生产 bundle 为 `commando.app`，开发 bundle 为 `commando.dev.app`。名称不符合产品展示要求。

更严重的问题是生产与开发 plist 都使用 `com.systembug.commando`，Go 运行时 `SingleInstance.UniqueID` 也硬编码为同一值。即使只重命名 `.app`，两个进程仍会互相阻止，WebView 本地数据也无法可靠隔离。

### Wails 3 基线

Wails 3 使用 `build/config.yml` 管理产品元数据，使用 Taskfile 管理平台构建、输出路径与打包。官方构建系统允许项目定制 Taskfile。

锁定版本 `v3.0.0-alpha2.119` 的 iOS Dev 模板已使用以下模式：

- Dev bundle ID：生产 ID 加 `.dev`
- Dev 名称：生产名称加 `(Dev)`

macOS Dev 模板尚未应用同样隔离。本 RFC 将同一模式应用到 macOS，并保留 Wails 构建入口。

官方参考：

- <https://v3.wails.io/concepts/build-system/>
- <https://v3.wails.io/guides/build/customization/>
- <https://v3.wails.io/guides/build/macos/>

### 域名规则

项目域名为 `systembug.me`，正确反向 DNS 前缀为 `me.systembug`。当前 `com.systembug` 前缀不对应项目域名。

## 目标

### 主要目标

- [x] 生产 bundle 输出为 `bin/Commando.app`。
- [x] 开发 bundle 输出为 `bin/Commando Dev.app`。
- [x] 生产 bundle ID 为 `me.systembug.commando`。
- [x] 开发 bundle ID 为 `me.systembug.commando.dev`。
- [x] 生产与开发使用不同 SingleInstance ID。
- [x] 生产与开发可同时运行，且各自仍阻止同身份的第二实例。
- [x] 开发图标拥有明显 `DEV` 角标，Dock 中可快速区分。
- [x] `pnpm dev` 只运行 `Commando Dev.app`。
- [x] `pnpm desktop:install` 只部署 production bundle 到 `/Applications/Commando.app`。
- [x] CLI 二进制 `commando` 不受影响。

### 非目标

- 不修改 Go 核心同步逻辑。
- 不修改 Wails IPC 服务。
- 不创建 `config.prod.yml` 与 `config.dev.yml` 两套重复配置。
- 不改变 Vite 开发端口 `5189`。
- 不迁移尚未确认存在的历史偏好、Keychain 或更新通道数据。

### 成功标准

1. `wails3 task darwin:package` 生成 `bin/Commando.app`。
2. Wails Dev 组装并运行 `bin/Commando Dev.app`。
3. 两个 plist 的名称、可执行文件和 bundle ID 与本 RFC 一致。
4. 两个应用可同时启动。
5. 再次启动生产版时只聚焦生产窗口；再次启动开发版时只聚焦开发窗口。
6. 两个 bundle 均通过 ad-hoc `codesign --verify --deep --strict`。
7. Go tests、UI tests 与 desktop build 继续通过。

## 提案

### 身份矩阵

| 属性              | Production              | Development                 |
| ----------------- | ----------------------- | --------------------------- |
| Bundle 路径       | `bin/Commando.app`      | `bin/Commando Dev.app`      |
| Bundle 名称       | `Commando`              | `Commando Dev`              |
| Bundle ID         | `me.systembug.commando` | `me.systembug.commando.dev` |
| SingleInstance ID | `me.systembug.commando` | `me.systembug.commando.dev` |
| 可执行文件        | `Commando`              | `Commando`                  |
| 图标              | 正式 C1 图标            | C1 图标加紫色 `DEV` 角标    |
| Vite 端口         | 不使用                  | `5189`                      |

### Wails 配置

`apps/desktop/build/config.yml` 保持单一生产元数据源：

```yaml
info:
    productName: "Commando"
    productIdentifier: "me.systembug.commando"
```

`apps/desktop/Taskfile.yml` 使用 Wails 标准 `APP_NAME` 控制生产名称，并新增只服务开发 bundle 的变量：

```yaml
vars:
    APP_NAME: "Commando"
    DEV_APP_NAME: "Commando Dev"
```

不新增外部打包脚本。

### macOS plist

生产 `Info.plist`：

```text
CFBundleName       = Commando
CFBundleExecutable = Commando
CFBundleIdentifier = me.systembug.commando
```

开发 `Info.dev.plist`：

```text
CFBundleName        = Commando Dev
CFBundleDisplayName = Commando Dev
CFBundleExecutable  = Commando
CFBundleIdentifier  = me.systembug.commando.dev
WailsDevelopmentMode = true
```

`LSMultipleInstancesProhibited` 可以保留。不同 bundle ID 代表两个应用身份；同一身份仍禁止多实例。

### Go 运行时身份

Go 运行时不得继续使用单一硬编码常量。新增纯函数描述身份：

```go
type appIdentity struct {
    Name       string
    BundleID   string
    InstanceID string
}

func identityForMode(production bool) appIdentity
```

使用两个小型 build-tag 文件定义当前构建模式：

```text
identity_mode_prod.go //go:build production
identity_mode_dev.go  //go:build !production
```

`application.Options.Name`、`SingleInstance.UniqueID` 与主窗口标题统一读取同一 `appIdentity`。数据结构成为唯一事实来源，不允许 plist 与运行时各自拼字符串。

### 图标

生产继续使用 RFC-2026-011 的 C1 图标。

开发新增 `build/appicon-dev.png`：保留 C1 主体与构图，只在右上角加入紫色 `DEV` 角标。Wails `generate icons` 从该 PNG 生成 `build/darwin/icons-dev.icns`。开发 bundle 复制 `icons-dev.icns`，生产 bundle 继续复制 `icons.icns`。

角标必须在 32px 下仍形成明显色块。文字在小尺寸不可读时，紫色角标本身仍提供环境区分。

### 数据隔离

当前桌面后端未建立自定义配置数据库；持久化 UI 状态只使用 WebView `localStorage`。不同 bundle ID 使 macOS WebView 容器隔离。

若以后增加配置目录、Keychain 或自动更新，必须以同一 `appIdentity.BundleID` 为命名根，保持身份链一致。

## 替代方案

### 方案 A：只改 bundle 文件名

只生成 `Commando.app` 与 `Commando Dev.app`。

拒绝原因：bundle ID 与 SingleInstance ID 仍相同，无法可靠共存。

### 方案 B：Wails Taskfile 身份分离

使用单一 `config.yml`，在 Wails Taskfile、plist 与 Go build mode 中分离身份。

采用原因：遵循 Wails 官方扩展点，概念最少，生产元数据无复制。

### 方案 C：两套完整配置

新增 `config.prod.yml` 与 `config.dev.yml`。

拒绝原因：产品名称、版本、签名、协议与平台配置会重复并漂移。

## 影响分析

### 正面影响

- 生产 bundle 名符合品牌。
- Dev/Prod 可同时运行。
- Dock、Activity Monitor 与崩溃日志可区分环境。
- SingleInstance 行为从隐式字符串变为显式身份数据。

### 兼容性影响

生产 bundle ID 从 `com.systembug.commando` 改为 `me.systembug.commando`。macOS 会将其视为新应用身份。

若旧 ID 已公开发布并产生用户数据，必须先补充迁移计划。若尚未公开发布，本次修正应在首个稳定版本前完成。

CLI `commando` 位于独立 Go 命令，不受桌面 `APP_NAME` 大小写变化影响。

### 性能影响

无运行时性能影响。增加一个开发 `.icns` 资产，仅影响仓库与开发 bundle 体积。

## 风险评估

| 风险                        | 概率 | 影响 | 缓解措施                                |
| --------------------------- | ---- | ---- | --------------------------------------- |
| 旧 bundle ID 用户数据不可见 | 中   | 高   | 实施前确认是否已有公开发布              |
| plist 与 Go 身份再次漂移    | 中   | 高   | 使用身份矩阵测试与纯函数                |
| Dev/Prod 仍互相阻止         | 低   | 高   | 同时验证 bundle ID 与 SingleInstance ID |
| Dev 图标生成覆盖正式图标    | 低   | 中   | 使用独立源文件与输出文件                |
| APP_NAME 大小写影响 CLI     | 低   | 中   | CLI 独立测试，桌面可执行文件单独验证    |
| 旧小写 bundle 残留误导测试  | 中   | 中   | 验证前清理或移出旧构建产物              |

## 实施计划

### 文件职责

- `apps/desktop/identity.go`：定义不可变 `appIdentity` 数据与 `identityForMode(production bool)` 纯函数。
- `apps/desktop/identity_mode_prod.go`：仅在 `production` build tag 下选择生产身份。
- `apps/desktop/identity_mode_dev.go`：未设置 `production` build tag 时选择开发身份。
- `apps/desktop/main.go`：消费当前身份；不再保存独立名称或实例 ID。
- `apps/desktop/main_test.go`：用字面量验证两种模式，防止分支反转或身份串线。
- `apps/desktop/build/config.yml`：保存 Wails 生产产品名与生产 bundle ID。
- `apps/desktop/Taskfile.yml`：保存生产和开发 bundle 名称。
- `apps/desktop/build/Taskfile.yml`：从两个 PNG 分别生成生产和开发图标资产。
- `apps/desktop/build/darwin/Info.plist`：生产 bundle 元数据。
- `apps/desktop/build/darwin/Info.dev.plist`：开发 bundle 元数据和 Wails 开发标记。
- `apps/desktop/build/darwin/Taskfile.yml`：构建、组装、签名和运行两个 macOS bundle。
- `apps/desktop/build/appicon-dev.png`：带紫色 `DEV` 角标的开发图标源。
- `apps/desktop/build/darwin/icons-dev.icns`：开发 bundle 图标。

### 原子执行清单

1. 修改 `apps/desktop/main_test.go`，新增 `TestIdentityForModeProduction` 与 `TestIdentityForModeDevelopment`；预期 `go test ./apps/desktop` 因 `identityForMode` 未定义而失败。
2. 运行 `go test ./apps/desktop`，确认失败原因只来自缺少身份函数。
3. 新增 `identity.go`、`identity_mode_prod.go`、`identity_mode_dev.go`，并修改 `main.go` 统一消费 `currentAppIdentity()`。
4. 运行 `go test ./apps/desktop` 与 `go test -tags production ./apps/desktop`，确认默认和生产 build tag 均通过。
5. 修改 `build/config.yml`、根 `Taskfile.yml`、两个 macOS plist 与 darwin Taskfile，使 bundle 名、可执行文件名、bundle ID 和图标路径符合身份矩阵。
6. 运行 `plutil -lint` 检查两个 plist，并用 `wails3 task --list` 检查 Taskfile 可解析。
7. 基于 `build/appicon.png` 创建 `build/appicon-dev.png`，仅增加紫色 `DEV` 角标；生成独立 `icons-dev.icns`。
8. 运行 `wails3 task darwin:package` 生成并签名 `bin/Commando.app`。
9. 运行开发 bundle 组装任务，生成并签名 `bin/Commando Dev.app`。
10. 用 `plutil`、`codesign`、`file` 与图标文件校验验证两个 bundle。
11. 启动两个 bundle，验证可同时存在；分别再次启动，验证同身份 SingleInstance 行为。
12. 运行 `pnpm test:go`、`pnpm --filter @commando/ui test` 与 `go build ./apps/desktop`。
13. 新增 `pnpm desktop:package` 与 `pnpm desktop:install`，分别生成 production bundle、部署到 `/Applications/Commando.app`；验证 `pnpm dev` 仍只运行 Dev bundle。
14. 将 RFC 状态更新为 `Completed`，勾选目标和实施项，并同步 `.spec/ROADMAP.md`。

### 阶段 1：身份数据

- [x] 新增纯函数 `identityForMode(production bool)`。
- [x] 新增 production/dev build-tag 模式常量。
- [x] 更新 `main.go` 使用统一身份。
- [x] 更新单元测试覆盖两个模式。

### 阶段 2：Wails 元数据

- [x] 更新 `build/config.yml` 的生产 bundle ID。
- [x] 更新根 Taskfile 的 `APP_NAME` 与 `DEV_APP_NAME`。
- [x] 更新生产与开发 plist。

### 阶段 3：Dev 图标

- [x] 创建 `build/appicon-dev.png`。
- [x] 生成 `build/darwin/icons-dev.icns`。
- [x] 开发 bundle 使用 `icons-dev.icns`。

### 阶段 4：bundle 组装

- [x] 生产 bundle 使用 `Commando.app`。
- [x] 开发 bundle 使用 `Commando Dev.app`。
- [x] 两者复制同名 `Commando` 可执行文件。
- [x] 两者分别 ad-hoc 签名。

### 阶段 5：验证

- [x] 验证两个 plist。
- [x] 验证两个图标。
- [x] 验证两个 bundle 签名。
- [x] 验证 Dev/Prod 同时运行。
- [x] 验证同身份第二实例聚焦现有窗口。
- [x] 运行项目质量门。

## 完成证据

- `pnpm dev` 启动路径为 `bin/Commando Dev.app/Contents/MacOS/Commando`。
- production 与 development 同时运行时各有一个独立进程；重复启动后进程数不增加。
- production plist 为 `me.systembug.commando`，development plist 为 `me.systembug.commando.dev`。
- 两个 bundle 均通过 `codesign --verify --deep --strict`。
- production 与 development `.icns` 的 SHA-256 不同。
- `pnpm test:go` 通过。
- `pnpm --filter @commando/ui test` 通过：20 suites、128 tests。
- `go build ./apps/desktop` 通过。
- `pnpm desktop:install` 经 `make -n desktop-install` 验证只以 production `Commando.app` 为源；未在 RFC 验证中覆盖用户现有 `/Applications/Commando.app`。

## 测试策略

### Go 测试

```bash
go test ./apps/desktop
go test -tags production ./apps/desktop
```

测试 `identityForMode(false)` 与 `identityForMode(true)` 的名称、bundle ID 和实例 ID。

### 构建测试

```bash
pnpm --filter @commando/desktop build
cd apps/desktop
../../scripts/wails3.sh task darwin:package
```

### bundle 验证

```bash
plutil -p "bin/Commando.app/Contents/Info.plist"
plutil -p "bin/Commando Dev.app/Contents/Info.plist"
codesign --verify --deep --strict "bin/Commando.app"
codesign --verify --deep --strict "bin/Commando Dev.app"
```

### 项目质量门

```bash
pnpm test:go
pnpm --filter @commando/ui test
go build ./apps/desktop
```

## 回滚

恢复 `APP_NAME: "commando"`、原 plist、原 `appBundleID` 常量与单一图标任务，重新构建 `commando.app` 与 `commando.dev.app`。

不得删除用户数据目录作为回滚步骤。

## 后续工作

若确认 `com.systembug.commando` 已对外发布，另建迁移 RFC，处理偏好、Keychain、URL scheme、更新通道与签名身份迁移。
