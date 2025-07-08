---
作者: albert.li/AI
创建时间: 2024-06-09
修改历史:
  - 2024-06-09: 初稿 by AI
  - 2024-06-09: 按 feature name 目录重构
---

# commando-react 日志模块设计（基于 winston）

## 架构概览
- 主进程 logger.ts：winston 日志核心，支持多级别、控制台+文件归档。
- 主进程 ipcLogger.ts：IPC handler，接收渲染进程日志，归档到主进程。
- preload/logger.ts：contextBridge 暴露 logApi，安全桥接。
- 渲染进程 logger.ts：封装 window.logApi.log，提供 info/warn/error/debug。
- typings/logger.d.ts：类型声明，三端共享。

## API 说明
- logApi.log(level, message, meta?)
  - level: 'info' | 'warn' | 'error' | 'debug'
  - message: string
  - meta: 任意结构化数据（可选）

## 日志链路
1. 渲染进程调用 logger.info/warn/error/debug
2. 通过 preload logApi.log 发送到主进程
3. 主进程 ipcLogger.ts 归档到 winston
4. 控制台+文件 logs/app.log

## 扩展点
- 支持日志分级、归档策略、格式化自定义
- 可扩展为多进程/多窗口日志归档
- 可集成远程日志、Sentry 等

## 测试要点
- mock IPC/winston，验证主流程、异常、类型
- 覆盖 info/warn/error/debug、meta 结构、链路完整性
- 类型安全、linter、运行时链路全通过 