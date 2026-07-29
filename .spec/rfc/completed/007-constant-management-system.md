# RFC-2025-007: Constant Management System

> **❌ Deprecated** — Electron-era TypeScript constant management. Go backend uses Go constants/iota. Deprecated 2026-07-29.

---

作者: Albert Lee/AI
创建时间: 2025-01-14
修改历史:

- 2025-01-14: 初稿 - 常量管理系统设计

---

## 摘要

本RFC定义了commando-react项目的常量管理系统，建立统一的字符串常量规范，彻底消除代码中的硬编码字符串。该系统通过分类管理和TypeScript类型安全，确保代码的可维护性和一致性。

## 背景

### 硬编码字符串问题

项目中存在大量硬编码字符串，包括IPC通道名称、日志消息、错误信息等。这些硬编码字符串导致：

- **维护困难**：修改字符串需要在多处更改
- **类型不安全**：无法利用TypeScript的类型检查
- **拼写错误风险**：容易出现不一致的字符串
- **重构困难**：难以批量修改和重构

### 解决方案需求

需要建立统一的常量管理系统，所有字符串都通过类型安全的常量定义，按功能分类管理，便于维护和重构。

## 目标

### 主要目标

- [ ] 消除所有硬编码字符串
- [ ] 建立分类的常量管理体系
- [ ] 确保TypeScript类型安全
- [ ] 提供统一的常量命名规范

### 成功标准

- 代码中零硬编码字符串
- 所有常量都有适当的TypeScript类型
- 常量按功能正确分类
- 支持重构工具的自动化操作

## 常量分类系统

### 核心常量类别

#### 1. IPC通信常量

```typescript
// src/common/constants/IPCChannels.ts
export namespace IPCChannels {
    export namespace FILE_OPERATIONS {
        export namespace COPY {
            export const REQUEST = "file.operations.copy.request" as const;
            export const PROGRESS = "file.operations.copy.progress" as const;
            export const COMPLETED = "file.operations.copy.completed" as const;
            export const ERROR = "file.operations.copy.error" as const;
            export const CANCELLED = "file.operations.copy.cancelled" as const;
        }
        export namespace MOVE {
            export const REQUEST = "file.operations.move.request" as const;
            export const PROGRESS = "file.operations.move.progress" as const;
            export const COMPLETED = "file.operations.move.completed" as const;
            export const ERROR = "file.operations.move.error" as const;
            export const CANCELLED = "file.operations.move.cancelled" as const;
        }
        export namespace DELETE {
            export const REQUEST = "file.operations.delete.request" as const;
            export const PROGRESS = "file.operations.delete.progress" as const;
            export const COMPLETED =
                "file.operations.delete.completed" as const;
            export const ERROR = "file.operations.delete.error" as const;
            export const CANCELLED =
                "file.operations.delete.cancelled" as const;
        }
        export namespace RENAME {
            export const REQUEST = "file.operations.rename.request" as const;
            export const COMPLETED =
                "file.operations.rename.completed" as const;
            export const ERROR = "file.operations.rename.error" as const;
        }
    }
    export namespace SYSTEM_EVENTS {
        export const WORKER_POOL_STATUS = "system.worker.pool.status" as const;
        export const MEMORY_WARNING = "system.memory.warning" as const;
        export const PERFORMANCE_ALERT = "system.performance.alert" as const;
    }
    export namespace UI_FEEDBACK {
        export const NOTIFICATION = "ui.feedback.notification" as const;
        export const STATUS_UPDATE = "ui.feedback.status.update" as const;
    }
}
```

#### 2. 服务标识常量

```typescript
// src/common/constants/ServiceIdentifiers.ts
export namespace ServiceIdentifiers {
    export const COPY_SERVICE = "CopyService" as const;
    export const MOVE_SERVICE = "MoveService" as const;
    export const DELETE_SERVICE = "DeleteService" as const;
    export const RENAME_SERVICE = "RenameService" as const;
    export const FILE_WATCHER_SERVICE = "FileWatcherService" as const;
}
```

#### 3. 任务状态常量

```typescript
// src/common/constants/TaskStatus.ts
export namespace TaskStatus {
    export const PENDING = "pending" as const;
    export const QUEUED = "queued" as const;
    export const RUNNING = "running" as const;
    export const PAUSED = "paused" as const;
    export const COMPLETED = "completed" as const;
    export const FAILED = "failed" as const;
    export const CANCELLED = "cancelled" as const;
    export const TIMEOUT = "timeout" as const;
}

export type TaskStatusValue = (typeof TaskStatus)[keyof typeof TaskStatus];
```

#### 4. 日志消息常量

```typescript
// src/common/constants/LogMessages.ts
export namespace LogMessages {
    // Worker相关
    export const WORKER_CREATED =
        "Worker instance created successfully" as const;
    export const WORKER_TERMINATED = "Worker instance terminated" as const;
    export const ORPHANED_WORKER_MESSAGE =
        "Received message from orphaned worker" as const;

    // 任务相关
    export const TASK_SCHEDULED = "Task scheduled for execution" as const;
    export const TASK_STARTED = "Task execution started" as const;
    export const TASK_COMPLETED =
        "Task execution completed successfully" as const;
    export const TASK_FAILED = "Task execution failed" as const;
    export const TASK_CLEANED_UP = "Task resources cleaned up" as const;

    // 系统相关
    export const SYSTEM_STARTUP = "System initialization completed" as const;
    export const SYSTEM_SHUTDOWN = "System shutdown initiated" as const;
    export const MEMORY_WARNING = "System memory usage warning" as const;
    export const PERFORMANCE_ALERT =
        "System performance degradation detected" as const;

    // 操作相关
    export const OPERATION_STARTED = "File operation started" as const;
    export const OPERATION_PROGRESS =
        "File operation progress updated" as const;
    export const OPERATION_COMPLETED =
        "File operation completed successfully" as const;
    export const OPERATION_FAILED = "File operation failed" as const;
    export const OPERATION_CANCELLED =
        "File operation cancelled by user" as const;

    // 路由相关
    export const MESSAGE_ROUTED = "Message successfully routed to UI" as const;
    export const UNKNOWN_MESSAGE_TYPE =
        "Unknown message type encountered during routing" as const;
    export const ROUTING_FAILED = "Message routing failed" as const;
}
```

#### 5. 错误消息常量

```typescript
// src/common/constants/ErrorMessages.ts
export namespace ErrorMessages {
    // 参数验证错误
    export const INVALID_PARAMS_REQUIRED_MISSING =
        "Invalid parameters: required field missing" as const;
    export const INVALID_PARAMS_WRONG_TYPE =
        "Invalid parameters: incorrect parameter type" as const;
    export const INVALID_PATH_FORMAT = "Invalid file path format" as const;

    // 文件系统错误
    export const FILE_NOT_FOUND =
        "Specified file or directory not found" as const;
    export const FILE_ACCESS_DENIED =
        "Access denied to file or directory" as const;
    export const FILE_ALREADY_EXISTS =
        "File or directory already exists" as const;
    export const DISK_SPACE_INSUFFICIENT =
        "Insufficient disk space for operation" as const;

    // Worker相关错误
    export const WORKER_CREATION_FAILED =
        "Failed to create worker instance" as const;
    export const WORKER_COMMUNICATION_FAILED =
        "Worker communication error" as const;
    export const WORKER_TIMEOUT = "Worker operation timeout" as const;
    export const WORKER_POOL_EXHAUSTED =
        "Worker pool resources exhausted" as const;

    // 服务错误
    export const SERVICE_NOT_REGISTERED =
        "Requested service is not registered" as const;
    export const SERVICE_INITIALIZATION_FAILED =
        "Service initialization failed" as const;
    export const SERVICE_UNAVAILABLE =
        "Service temporarily unavailable" as const;
}
```

#### 6. UI组件标识常量

```typescript
// src/common/constants/UIComponents.ts
export namespace UIComponents {
    export const FILE_PANE = "FilePane" as const;
    export const PROGRESS_PANEL = "ProgressPanel" as const;
    export const STATUS_BAR = "StatusBar" as const;
    export const NOTIFICATION_TOAST = "NotificationToast" as const;
    export const CONTEXT_MENU = "ContextMenu" as const;
    export const TOOLBAR = "Toolbar" as const;
    export const SIDEBAR = "Sidebar" as const;
}
```

#### 7. 操作类型常量

```typescript
// src/common/constants/OperationTypes.ts
export namespace OperationTypes {
    export namespace FILE {
        export const COPY = "file.copy" as const;
        export const MOVE = "file.move" as const;
        export const DELETE = "file.delete" as const;
        export const RENAME = "file.rename" as const;
        export const CREATE_FOLDER = "file.create.folder" as const;
        export const GET_METADATA = "file.get.metadata" as const;
        export const SET_PERMISSIONS = "file.set.permissions" as const;
    }

    export namespace BATCH {
        export const COPY_MULTIPLE = "batch.copy.multiple" as const;
        export const MOVE_MULTIPLE = "batch.move.multiple" as const;
        export const DELETE_MULTIPLE = "batch.delete.multiple" as const;
        export const COMPRESS = "batch.compress" as const;
        export const EXTRACT = "batch.extract" as const;
    }
}
```

#### 8. Worker事件常量

```typescript
// src/common/constants/WorkerEvents.ts
export namespace WorkerEvents {
    export const MESSAGE = "message" as const;
    export const ERROR = "error" as const;
    export const EXIT = "exit" as const;
    export const ONLINE = "online" as const;
    export const OFFLINE = "offline" as const;
}
```

#### 9. 配置常量

```typescript
// src/common/constants/ConfigKeys.ts
export namespace ConfigKeys {
    export namespace PERFORMANCE {
        export const MAX_WORKERS = "performance.maxWorkers" as const;
        export const IDLE_TIMEOUT = "performance.idleTimeout" as const;
        export const MEMORY_LIMIT = "performance.memoryLimit" as const;
        export const CPU_THRESHOLD = "performance.cpuThreshold" as const;
    }

    export namespace UI {
        export const THEME = "ui.theme" as const;
        export const LANGUAGE = "ui.language" as const;
        export const FONT_SIZE = "ui.fontSize" as const;
        export const SHOW_HIDDEN_FILES = "ui.showHiddenFiles" as const;
    }
}
```

#### 10. 测试常量

```typescript
// src/common/constants/TestMessages.ts
export namespace TestMessages {
    export const SHOULD_HANDLE_OPERATION_CORRECTLY =
        "should handle operation correctly" as const;
    export const SHOULD_VALIDATE_PARAMETERS =
        "should validate input parameters" as const;
    export const SHOULD_HANDLE_ERRORS_GRACEFULLY =
        "should handle errors gracefully" as const;
    export const SHOULD_EMIT_PROGRESS_EVENTS =
        "should emit progress events during operation" as const;
    export const SHOULD_CLEANUP_RESOURCES =
        "should cleanup resources after completion" as const;
}
```

## 命名规范

### 常量命名规则

1. **全大写下划线分隔**：`COPY_OPERATION`, `FILE_NOT_FOUND`
2. **描述性命名**：使用完整单词，避免缩写
3. **分层命名空间**：按功能层次组织常量
4. **一致性前缀**：同类常量使用一致的前缀

### 命名空间组织

```typescript
// 按功能域组织
export namespace [FunctionalDomain] {
    export namespace [SubDomain] {
        export const [CONSTANT_NAME] = 'value' as const;
    }
}
```

### 类型定义

为常量值创建联合类型：

```typescript
export type TaskStatusValue = (typeof TaskStatus)[keyof typeof TaskStatus];
export type IPCChannelValue =
    (typeof IPCChannels.FILE_OPERATIONS.COPY)[keyof typeof IPCChannels.FILE_OPERATIONS.COPY];
```

## 使用指南

### 导入规范

```typescript
// 导入特定命名空间
import { IPCChannels } from '../common/constants/IPCChannels';
import { TaskStatus } from '../common/constants/TaskStatus';
import { LogMessages } from '../common/constants/LogMessages';

// 使用常量
event.sender.send(IPCChannels.FILE_OPERATIONS.COPY.PROGRESS, data);
logger.info(LogMessages.OPERATION_STARTED);
if (task.status === TaskStatus.COMPLETED) { ... }
```

### 迁移指南

#### 步骤1：识别硬编码字符串

```bash
# 查找项目中的硬编码字符串
grep -r "'[^']*'" src/ --include="*.ts" --include="*.tsx"
```

#### 步骤2：分类和定义常量

将找到的字符串按功能分类，定义到对应的常量文件中。

#### 步骤3：批量替换

使用IDE的重构功能批量替换硬编码字符串为常量引用。

#### 步骤4：类型检查

确保所有替换后的代码通过TypeScript类型检查。

## 开发工具集成

### ESLint规则

创建自定义ESLint规则防止硬编码字符串：

```javascript
// eslint-rules/no-hardcoded-strings.js
module.exports = {
    create(context) {
        return {
            Literal(node) {
                if (typeof node.value === "string" && node.value.length > 0) {
                    // 检测硬编码字符串并报告错误
                    context.report({
                        node,
                        message:
                            "Hardcoded strings are not allowed. Use constants instead.",
                    });
                }
            },
        };
    },
};
```

### TypeScript严格检查

启用严格模式确保类型安全：

```json
// tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "noImplicitReturns": true
    }
}
```

## 维护策略

### 定期审查

- 每月审查新增的常量定义
- 检查是否有遗漏的硬编码字符串
- 验证命名规范的一致性

### 自动化检查

- CI/CD流水线中集成硬编码字符串检查
- Pre-commit hook防止硬编码字符串提交
- 自动化测试验证常量的正确性

### 文档同步

- 保持RFC文档与实际实现的同步
- 及时更新常量分类和命名规范
- 提供迁移指南和最佳实践

## 影响分析

### 正面影响

- **提高代码质量**：消除硬编码字符串，提高可维护性
- **类型安全**：利用TypeScript类型检查防止错误
- **重构友好**：支持IDE的自动化重构功能
- **一致性**：统一的命名和组织规范

### 实施成本

- **初期投入**：需要时间设计和实施常量系统
- **迁移工作量**：需要逐步替换现有的硬编码字符串
- **学习成本**：开发者需要了解新的常量组织方式

### 风险缓解

- **渐进式迁移**：逐步替换，避免大规模破坏性变更
- **完善文档**：提供详细的使用指南和示例
- **工具支持**：开发自动化工具辅助迁移过程

## 实施计划

### 阶段1：基础设施建设（1周）

- [ ] 创建常量文件结构
- [ ] 定义核心常量类别
- [ ] 建立命名规范

### 阶段2：工具开发（1周）

- [ ] 开发ESLint规则
- [ ] 创建迁移脚本
- [ ] 集成CI/CD检查

### 阶段3：逐步迁移（2-3周）

- [ ] IPC通道常量迁移
- [ ] 日志和错误消息迁移
- [ ] UI组件标识迁移
- [ ] 配置和测试常量迁移

### 阶段4：验证和优化（1周）

- [ ] 全面测试验证
- [ ] 性能影响评估
- [ ] 文档完善

## 结论

常量管理系统为commando-react项目提供了统一的字符串管理方案。通过消除硬编码字符串，项目将获得更好的类型安全、可维护性和一致性。该系统的实施将显著提高代码质量，为项目的长期发展奠定坚实基础。

---

**状态**: ❌ Deprecated
**最后更新**: 2025-01-14
**下次评审**: 2025-02-14
