# RFC 009: Shell Service API 设计文档

> **❌ Deprecated** — Electron-era shell/process/LubanEngine service. Go backend replaces with direct internal packages. Deprecated 2026-07-29.

**作者**: AI Assistant
**创建时间**: 2025-01-27
**版本**: 1.0.0
**状态**: ❌ Deprecated

## 概述

本文档描述了 ShellService 的设计和实现，该服务提供安全的 shell 命令执行、文件操作、进程管理等功能，基于 LubanEngine 进行文件操作，集成安全验证和进度跟踪。

## 背景

在文件管理应用中，需要提供以下功能：

1. **Shell 命令执行** - 执行系统命令和脚本
2. **文件操作** - 基于现有 LubanEngine 的文件操作
3. **进程管理** - 监控和管理系统进程
4. **安全控制** - 防止危险命令和路径访问
5. **进度跟踪** - 实时反馈操作进度

## 设计目标

1. **安全性优先** - 全面的安全验证和权限控制
2. **功能完整** - 支持命令执行、文件操作、进程管理
3. **性能优化** - 异步执行和进度跟踪
4. **错误处理** - 完善的错误处理和重试机制
5. **类型安全** - 完整的 TypeScript 类型定义

## 架构设计

### 服务结构

```
ShellService
├── CommandExecutor (命令执行器)
│   ├── 同步命令执行
│   ├── 异步命令执行
│   └── 进程管理
├── ProcessManager (进程管理器)
│   ├── 进程列表获取
│   ├── 进程信息查询
│   ├── 进程终止
│   └── 系统资源监控
├── SecurityValidator (安全验证器)
│   ├── 命令安全验证
│   ├── 路径安全验证
│   └── 文件操作安全验证
└── LubanEngine 集成
    ├── 文件复制/移动
    ├── 文件删除
    └── 文件验证
```

### IPC 通道

| 通道                     | 类型   | 描述                |
| ------------------------ | ------ | ------------------- |
| `shell:execute`          | handle | 执行同步 shell 命令 |
| `shell:execute-async`    | handle | 执行异步 shell 命令 |
| `shell:file-operation`   | handle | 执行文件操作        |
| `shell:process-list`     | handle | 获取进程列表        |
| `shell:process-info`     | handle | 获取进程信息        |
| `shell:process-kill`     | handle | 终止进程            |
| `shell:validate-command` | handle | 验证命令安全性      |
| `shell:validate-path`    | handle | 验证路径安全性      |
| `shell:system-resources` | handle | 获取系统资源信息    |
| `shell:progress`         | on     | 进度更新通知        |

## API 设计

### 命令执行

#### 同步命令执行

```typescript
// 执行同步命令
const result = await window.electronAPI.invoke(
    "shell:execute",
    'echo "Hello World"',
    {
        cwd: "/path/to/working/directory",
        timeout: 30000,
        silent: false,
    }
);

// 返回结果
interface CommandExecutionResult {
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    duration: number;
    error?: string;
    pid?: number;
}
```

#### 异步命令执行

```typescript
// 执行异步命令
const { processId, promise } = await window.electronAPI.invoke(
    "shell:execute-async",
    "long-running-command",
    {
        cwd: "/path/to/working/directory",
        timeout: 60000,
    }
);

// 监听输出
window.electronAPI.on("shell:output", data => {
    if (data.type === "stdout") {
        console.log("输出:", data.data);
    } else if (data.type === "stderr") {
        console.error("错误:", data.data);
    }
});

// 等待完成
const result = await promise;
```

### 文件操作

```typescript
// 文件复制
const copyResult = await window.electronAPI.invoke("shell:file-operation", {
    operation: "copy",
    source: "/path/to/source",
    destination: "/path/to/destination",
    options: {
        overwrite: true,
        preserveTimestamps: true,
        verifyIntegrity: true,
    },
});

// 文件移动
const moveResult = await window.electronAPI.invoke("shell:file-operation", {
    operation: "move",
    source: "/path/to/source",
    destination: "/path/to/destination",
});

// 文件删除
const deleteResult = await window.electronAPI.invoke("shell:file-operation", {
    operation: "delete",
    source: "/path/to/file",
});
```

### 进程管理

```typescript
// 获取进程列表
const processes = await window.electronAPI.invoke("shell:process-list");

// 获取特定进程信息
const processInfo = await window.electronAPI.invoke("shell:process-info", 1234);

// 终止进程
const killResult = await window.electronAPI.invoke(
    "shell:process-kill",
    1234,
    "SIGTERM"
);

// 获取系统资源
const resources = await window.electronAPI.invoke("shell:system-resources");

// 进程信息结构
interface ProcessInfo {
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    startTime: Date;
    command: string;
    cwd: string;
}
```

### 安全验证

```typescript
// 验证命令安全性
const commandValidation = await window.electronAPI.invoke(
    "shell:validate-command",
    "rm -rf /"
);

// 验证路径安全性
const pathValidation = await window.electronAPI.invoke(
    "shell:validate-path",
    "/etc/passwd"
);

// 验证结果结构
interface SecurityValidationResult {
    safe: boolean;
    riskLevel: "low" | "medium" | "high" | "critical";
    riskDescription: string;
    recommendation?: string;
}
```

## 安全机制

### 命令安全验证

1. **危险命令黑名单**

    ```typescript
    const DANGEROUS_COMMANDS = [
        "rm -rf /",
        "rm -rf /*",
        "format",
        "fdisk",
        "shutdown",
        "reboot",
        // ... 更多危险命令
    ];
    ```

2. **命令注入检测**
    - 检测特殊字符: `;&|`$`
    - 检测命令替换: `$()`, `${}`
    - 检测管道操作: `&&`, `||`, `>>`

3. **路径遍历检测**
    - 检测 `../` 模式
    - 检测 `..\\` 模式
    - 检测相对路径攻击

### 路径安全验证

1. **危险路径黑名单**

    ```typescript
    const DANGEROUS_PATHS = [
        "/dev/",
        "/proc/",
        "/sys/",
        "/boot/",
        "/etc/passwd",
        "/etc/shadow",
        // ... 更多危险路径
    ];
    ```

2. **允许路径白名单**
    - 项目目录
    - 临时目录
    - 用户目录

### 文件操作安全

1. **操作类型验证**
    - 检查操作权限
    - 验证源路径和目标路径
    - 防止系统文件操作

2. **权限检查**
    - 读取权限验证
    - 写入权限验证
    - 执行权限验证

## 实现细节

### CommandExecutor 设计

```typescript
export class CommandExecutor {
    private activeProcesses = new Map<number, ChildProcess>();

    // 同步命令执行
    async executeCommand(
        command: string,
        options: CommandExecutionOptions
    ): Promise<CommandExecutionResult>;

    // 异步命令执行
    async executeCommandAsync(
        command: string,
        options: CommandExecutionOptions,
        onOutput?,
        onError?
    ): Promise<{
        process: ChildProcess;
        promise: Promise<CommandExecutionResult>;
    }>;

    // 进程管理
    killProcess(pid: number): boolean;
    getActiveProcesses(): number[];
    cleanup(): void;
}
```

### ProcessManager 设计

```typescript
export class ProcessManager {
    // 获取进程列表
    async getProcessList(): Promise<ProcessInfo[]>;

    // 获取进程信息
    async getProcessInfo(pid: number): Promise<ProcessInfo | null>;

    // 终止进程
    async killProcess(pid: number, signal?: string): Promise<boolean>;

    // 检查进程状态
    async isProcessRunning(pid: number): Promise<boolean>;

    // 获取系统资源
    async getSystemResources(): Promise<SystemResources>;
}
```

### SecurityValidator 设计

```typescript
export class SecurityValidator {
    // 验证命令安全性
    static validateCommand(command: string): SecurityValidationResult;

    // 验证路径安全性
    static validatePath(filePath: string): SecurityValidationResult;

    // 验证文件操作安全性
    static validateFileOperation(
        operation: string,
        sourcePath: string,
        destPath?: string
    ): SecurityValidationResult;

    // 记录安全事件
    static logSecurityEvent(
        type: string,
        input: string,
        result: SecurityValidationResult
    ): void;
}
```

## 使用示例

### 基本命令执行

```typescript
// 执行简单命令
const result = await window.electronAPI.invoke("shell:execute", "ls -la", {
    cwd: "/home/user",
    timeout: 5000,
});

if (result.success) {
    console.log("命令输出:", result.stdout);
} else {
    console.error("命令失败:", result.error);
}
```

### 文件操作

```typescript
// 复制文件
const copyResult = await window.electronAPI.invoke("shell:file-operation", {
    operation: "copy",
    source: "/path/to/source.txt",
    destination: "/path/to/destination.txt",
    options: {
        overwrite: true,
        verifyIntegrity: true,
    },
});

if (copyResult.success) {
    console.log("文件复制成功");
} else {
    console.error("文件复制失败:", copyResult.error);
}
```

### 进程监控

```typescript
// 获取所有进程
const processes = await window.electronAPI.invoke("shell:process-list");

// 过滤特定进程
const nodeProcesses = processes.filter(p => p.name.includes("node"));

// 终止特定进程
for (const process of nodeProcesses) {
    if (process.cpu > 50) {
        // CPU 使用率超过 50%
        await window.electronAPI.invoke("shell:process-kill", process.pid);
    }
}
```

### 安全验证

```typescript
// 验证命令安全性
const validation = await window.electronAPI.invoke(
    "shell:validate-command",
    "rm -rf /tmp/*"
);

if (!validation.safe) {
    console.warn("危险命令:", validation.riskDescription);
    console.log("建议:", validation.recommendation);
} else {
    // 执行命令
    const result = await window.electronAPI.invoke(
        "shell:execute",
        "rm -rf /tmp/*"
    );
}
```

## 进度跟踪

### 进度事件

```typescript
// 监听进度更新
window.electronAPI.on("shell:progress", progress => {
    console.log(`操作: ${progress.operation}`);
    console.log(`步骤: ${progress.currentStep}`);
    console.log(`进度: ${progress.percentage}%`);
    console.log(`已处理: ${progress.processed}/${progress.total}`);
});
```

### 输出事件

```typescript
// 监听命令输出
window.electronAPI.on("shell:output", data => {
    if (data.type === "stdout") {
        console.log("标准输出:", data.data);
    } else if (data.type === "stderr") {
        console.error("标准错误:", data.data);
    }
});
```

## 错误处理

### 错误类型

1. **安全错误** - 命令或路径不安全
2. **执行错误** - 命令执行失败
3. **权限错误** - 权限不足
4. **超时错误** - 操作超时
5. **系统错误** - 系统级错误

### 错误处理策略

```typescript
try {
    const result = await window.electronAPI.invoke(
        "shell:execute",
        "dangerous-command"
    );
} catch (error) {
    if (error.message.includes("安全验证失败")) {
        // 处理安全错误
        console.error("命令不安全，请检查输入");
    } else if (error.message.includes("权限不足")) {
        // 处理权限错误
        console.error("权限不足，请以管理员身份运行");
    } else {
        // 处理其他错误
        console.error("执行失败:", error.message);
    }
}
```

## 性能优化

### 异步执行

- 长时间运行的命令使用异步执行
- 支持进度回调
- 支持取消操作

### 资源管理

- 自动清理已完成的进程
- 限制并发进程数量
- 内存使用监控

### 缓存机制

- 进程信息缓存
- 系统资源缓存
- 安全验证结果缓存

## 测试策略

### 单元测试

- CommandExecutor 测试
- ProcessManager 测试
- SecurityValidator 测试
- ShellService 集成测试

### 安全测试

- 危险命令检测测试
- 路径遍历攻击测试
- 权限绕过测试
- 注入攻击测试

### 性能测试

- 并发命令执行测试
- 大量进程监控测试
- 内存泄漏测试
- 超时处理测试

## 安全考虑

### 输入验证

- 严格的命令参数验证
- 路径规范化处理
- 特殊字符过滤

### 权限控制

- 最小权限原则
- 操作权限检查
- 资源访问限制

### 日志记录

- 安全事件记录
- 操作审计日志
- 错误日志记录

## 未来扩展

1. **脚本支持** - 支持执行脚本文件
2. **命令历史** - 记录和重放命令历史
3. **工作流** - 支持命令工作流
4. **插件系统** - 支持自定义命令插件
5. **远程执行** - 支持远程命令执行

## 总结

ShellService 提供了完整的 shell 命令执行、文件操作和进程管理功能，通过严格的安全验证和错误处理机制，确保系统的安全性和稳定性。该服务与现有的 LubanEngine 完美集成，提供了统一的文件操作接口，同时支持实时进度跟踪和状态监控。
