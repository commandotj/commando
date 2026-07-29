# RFC 008: Window Service API 设计文档

> **❌ Deprecated** — Electron-era IPC window service. Wails 3 runtime handles windows natively. Deprecated 2026-07-29.

**作者**: AI Assistant
**创建时间**: 2025-01-27
**版本**: 1.0.0
**状态**: ❌ Deprecated

## 概述

本文档描述了 WindowService 的设计和实现，该服务用于替代原有的 `open-win` IPC 处理器，提供完整的窗口管理功能。

## 背景

原有的 `open-win` 处理器直接写在 `ipc.ts` 中，存在以下问题：

1. 不符合服务化架构模式
2. 功能单一，只支持创建窗口
3. 缺少窗口状态跟踪和生命周期管理
4. 没有统一的错误处理机制

## 设计目标

1. **服务化架构**: 遵循现有的服务注册和管理模式
2. **功能完整**: 提供创建、关闭、最小化、最大化等完整窗口操作
3. **状态跟踪**: 实时跟踪窗口状态和生命周期
4. **错误处理**: 统一的错误处理和日志记录
5. **类型安全**: 完整的 TypeScript 类型定义

## 架构设计

### 服务结构

```
WindowService
├── 窗口创建 (handleCreate)
├── 窗口操作 (handleClose, handleMinimize, handleMaximize, etc.)
├── 窗口信息 (handleList, handleGetInfo)
├── 窗口状态管理 (handleShow, handleHide, handleFocus)
└── 窗口配置 (handleSetBounds, handleSetTitle, handleSetAlwaysOnTop)
```

### IPC 通道

| 通道                       | 类型   | 描述            |
| -------------------------- | ------ | --------------- |
| `window:create`            | handle | 创建新窗口      |
| `window:close`             | handle | 关闭窗口        |
| `window:minimize`          | handle | 最小化窗口      |
| `window:maximize`          | handle | 最大化/还原窗口 |
| `window:restore`           | handle | 恢复窗口        |
| `window:center`            | handle | 居中窗口        |
| `window:set-bounds`        | handle | 设置窗口边界    |
| `window:set-title`         | handle | 设置窗口标题    |
| `window:set-always-on-top` | handle | 设置窗口置顶    |
| `window:list`              | handle | 获取窗口列表    |
| `window:get-info`          | handle | 获取窗口信息    |
| `window:focus`             | handle | 聚焦窗口        |
| `window:show`              | handle | 显示窗口        |
| `window:hide`              | handle | 隐藏窗口        |
| `window:toggle-fullscreen` | handle | 切换全屏模式    |

## API 设计

### 窗口创建

```typescript
// 创建新窗口
const result = await window.electronAPI.invoke('window:create', {
    width: 1200,
    height: 800,
    center: true,
    resizable: true,
    title: '新窗口'
}, 'route-path')

// 返回结果
{
    id: 12345,
    success: true,
    error?: string
}
```

### 窗口操作

```typescript
// 关闭窗口
await window.electronAPI.invoke("window:close", windowId);

// 最小化窗口
await window.electronAPI.invoke("window:minimize", windowId);

// 最大化窗口
await window.electronAPI.invoke("window:maximize", windowId);

// 居中窗口
await window.electronAPI.invoke("window:center", windowId);
```

### 窗口信息

```typescript
// 获取窗口列表
const windows = await window.electronAPI.invoke("window:list");

// 获取特定窗口信息
const info = await window.electronAPI.invoke("window:get-info", windowId);

// 窗口信息结构
interface WindowInfo {
    id: number;
    title: string;
    bounds: { x: number; y: number; width: number; height: number };
    isVisible: boolean;
    isMinimized: boolean;
    isMaximized: boolean;
    isFullScreen: boolean;
    isAlwaysOnTop: boolean;
    url?: string;
}
```

## 实现细节

### 窗口生命周期管理

1. **创建**: 使用 BrowserWindow 构造函数创建窗口
2. **注册**: 将窗口添加到内部映射表进行跟踪
3. **事件监听**: 监听窗口关闭事件，自动清理
4. **清理**: 应用退出时关闭所有子窗口

### 错误处理

- 统一的错误响应格式
- 详细的错误日志记录
- 窗口不存在或已销毁的检查
- 操作失败时的回滚机制

### 配置管理

- 支持开发和生产环境的不同配置
- 动态设置 preload、URL、indexHtml 等参数
- 支持自定义窗口选项

## 使用示例

### 基本窗口创建

```typescript
// 渲染进程中
const createWindow = async () => {
    try {
        const result = await window.electronAPI.invoke(
            "window:create",
            {
                width: 800,
                height: 600,
                title: "设置窗口",
            },
            "settings"
        );

        if (result.success) {
            console.log("窗口创建成功:", result.id);
        } else {
            console.error("窗口创建失败:", result.error);
        }
    } catch (error) {
        console.error("创建窗口时发生错误:", error);
    }
};
```

### 窗口管理

```typescript
// 获取所有窗口
const windows = await window.electronAPI.invoke("window:list");

// 关闭特定窗口
const closeWindow = async (windowId: number) => {
    const result = await window.electronAPI.invoke("window:close", windowId);
    if (result.success) {
        console.log("窗口已关闭");
    }
};

// 切换窗口状态
const toggleMaximize = async (windowId: number) => {
    await window.electronAPI.invoke("window:maximize", windowId);
};
```

## 迁移指南

### 从 open-win 迁移

**旧代码**:

```typescript
// 旧的方式
await window.electronAPI.invoke("open-win", "route-path");
```

**新代码**:

```typescript
// 新的方式
const result = await window.electronAPI.invoke(
    "window:create",
    {
        width: 1200,
        height: 800,
        center: true,
    },
    "route-path"
);

if (result.success) {
    console.log("窗口ID:", result.id);
}
```

### 配置更新

需要在主进程中配置 WindowService：

```typescript
// src/main/index.ts
const windowService = getServiceRegistry().getService("WindowService");
if (windowService) {
    windowService.setWindowConfig({ preload, url, indexHtml, env });
}
```

## 测试

### 单元测试

- 窗口创建和销毁测试
- 各种窗口操作测试
- 错误处理测试
- 状态跟踪测试

### 集成测试

- IPC 通信测试
- 窗口生命周期测试
- 多窗口管理测试

## 性能考虑

1. **内存管理**: 及时清理已关闭的窗口引用
2. **事件监听**: 避免内存泄漏，正确移除事件监听器
3. **窗口数量**: 限制同时打开的窗口数量
4. **资源清理**: 应用退出时清理所有资源

## 安全考虑

1. **权限控制**: 限制窗口创建和操作的权限
2. **路径验证**: 验证窗口加载的路径安全性
3. **参数验证**: 验证窗口选项参数的有效性
4. **错误信息**: 避免泄露敏感信息

## 未来扩展

1. **窗口分组**: 支持窗口分组管理
2. **布局保存**: 保存和恢复窗口布局
3. **快捷键**: 支持窗口操作的快捷键
4. **主题支持**: 支持窗口主题切换
5. **多显示器**: 支持多显示器窗口管理

## 总结

WindowService 提供了完整的窗口管理功能，替代了原有的简单 `open-win` 处理器。通过服务化架构，实现了更好的代码组织、错误处理和功能扩展性。该服务与现有的服务架构完全兼容，可以无缝集成到现有系统中。
