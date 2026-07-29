# RFC-2026-029: Platform, Distribution, Localization & Scale

---

作者: albert.li / AI
创建时间: 2026-07-29
状态: Proposed
修改历史:

- 2026-07-29: 创建 Owner RFC，承接 RFC-012 平台、发行、本地化与非功能能力
- 2026-07-29: 对齐 Feature Map 稳定 ID；删除未经评审的依赖、产品分层和实现预设

---

## 摘要

本 RFC 负责 Commando 跨平台支持、发行方式、本地化和规模指标的产品决策与验收。FreeFileSync 只提供能力线索；Commando 必须基于 Go、Wails 3、React、现有构建链和真实用户场景独立设计。

## 边界

- Go core 保持 CLI/Desktop 共用，不把平台差异传播进同步领域模型。
- 平台差异通过 Go build tags、Wails 配置或 typed provider 隔离。
- React UI 不直接调用 Wails、shell command 或平台 API。
- 安装器、更新器、portable 发行、签名和权限服从 Wails 3 官方生命周期。
- edition/entitlement 属于独立产品决策，不因 FFS 存在而自动采用。
- FFS 规模数据只作来源事实，不直接成为 Commando 性能承诺。
- 本 RFC 不引入 Feature Map 之外的平行 ID 命名空间。

## Feature Map 追踪

本 RFC 明确拥有：

`PLT-01`, `PLT-02`, `PLT-03`, `PLT-04`, `NFR-01`, `NFR-02`, `NFR-03`, `I18N-01`, `DIST-01`, `DIST-02`, `DIST-03`, `DIST-04`, `DIST-05`, `DIST-06`, `DIST-07`

Decision、Status 与 Evidence 以 [FFS Feature Map](../FFS-FEATURE-MAP.md) 为唯一事实源。本 RFC 负责逐项形成 Commando 的 `Adopt / Adapt / Reject / Defer` 决策和验收证据。

## 评审任务

- [ ] 定义 Windows、macOS、Linux 支持矩阵与 CI 证据。
- [ ] 定义架构、文件数量、内存、I/O 和取消响应的可复现基准。
- [ ] 定义语言包边界、fallback 和缺失翻译行为。
- [ ] 评审本地安装、portable、自动更新、静默安装与签名策略。
- [ ] 独立评审 edition/entitlement；不得复制 FFS 商业分层。
- [ ] 为每个 Feature ID 写入 Decision、理由和验收证据。

## 风险

| 风险                            | 缓解                                           |
| ------------------------------- | ---------------------------------------------- |
| 把 FFS 观察值写成 Commando 承诺 | 只接受可复现基准和明确环境                     |
| 平台分支污染 core               | build tags/provider 隔离，领域模型保持平台无关 |
| 自制脚本复制 Wails 生命周期     | 使用项目包管理器调用 Wails 3 官方 CLI          |
| 自动更新或安装破坏用户数据      | 配置迁移、回滚和兼容性必须单独验收             |

---

**状态**: Proposed
**最后更新**: 2026-07-29
