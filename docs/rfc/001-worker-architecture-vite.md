# RFC-2025-001: Worker Architecture for Electron-Vite

---
作者: Albert Lee/AI
创建时间: 2025-01-14
修改历史:
  - 2025-01-14: 初稿 - Worker架构设计与Vite集成
---

## 摘要

本RFC定义了commando-react文件管理系统在electron-vite环境下的Worker架构设计。该架构通过服务层与工作线程的分离，实现高性能的文件操作处理，确保用户界面的响应性和系统的整体稳定性。

## 背景

### 问题描述

commando-react作为双面板文件管理器，面临以下核心挑战：

1. **UI阻塞问题**：大文件操作阻塞主线程，导致界面无响应
2. **并发处理需求**：用户需要同时执行多个文件操作
3. **进度反馈缺失**：缺乏实时进度更新和错误处理机制
4. **资源管理困难**：无法控制系统资源消耗

### electron-vite环境约束

- 使用`?modulePath`语法导入Worker文件
- 需要`externalizeDepsPlugin`处理Node.js原生模块
- 要求完整的TypeScript类型支持

## 架构设计

### 核心架构

采用三层分离架构，确保UI响应性和高并发处理能力：

```
Renderer Process ◄──IPC──► Main Process ◄──Message──► Worker Threads
  UI Components              Service Layer            File Operations
  Progress Display           Worker Pool               Task Execution
  User Interaction           Task Scheduling           Progress Reporting
```

### 关键组件

**Service Layer**: 处理IPC通信，管理任务生命周期
**Worker Pool**: 维护Worker实例，负载均衡和资源管理
**Task Scheduler**: 优先级队列，并发控制，性能监控

### 通信协议

采用分层消息协议，支持文件操作、任务管理和系统控制三大类消息，每类消息包含请求、进度、完成、错误等状态。消息按优先级处理：系统控制(最高) → 用户直接操作 → 批量文件操作 → 后台任务(最低)。

## 技术方案

### 推荐方案：Worker Pool + 任务调度

基于electron-vite环境特性，实现三层架构的Worker系统：

#### 核心特性

**Vite兼容性**：使用`?modulePath`语法导入Worker，确保构建时的正确路径解析
**动态调度**：基于系统负载自动调整Worker数量和任务并发度
**资源控制**：多维度监控内存、CPU、I/O使用情况，防止资源耗尽
**故障恢复**：支持Worker崩溃重启、任务重试和断点续传机制

#### 实现策略

- **优先级队列**：用户操作 > 批量文件操作 > 后台任务
- **负载均衡**：加权轮询算法分配任务到最适合的Worker
- **生命周期管理**：Worker创建、复用、销毁的完整流程控制

### 备选方案对比

**UtilityProcess架构**：提供进程级隔离和更强的安全性，适合处理大文件或高安全要求场景，但启动开销大，不适合频繁的小任务。

**直接异步处理**：实现简单，无进程通信开销，适合轻量级操作和原型开发，但缺乏并发控制，CPU密集操作会阻塞UI。

### 方案选择

基于commando-react作为生产级文件管理器的定位，**Worker Pool + 任务调度**方案在性能、可扩展性和架构清晰度方面提供最佳平衡，能够满足双面板文件管理器的并发处理需求。

## 通信架构

### 消息路由机制

系统实现完整的身份识别和上下文追踪机制：

**Worker身份管理**：每个Worker获得唯一标识符，消息携带完整身份信息
**上下文关联**：维护任务执行上下文，包括请求来源、会话信息、优先级
**精确路由**：通过请求映射表，确保Worker响应准确路由到对应UI组件

### Service-UI消息路由

**上下文管理**：Service维护完整的请求上下文映射，确保响应准确路由

```typescript
// Service中的上下文管理
export class CopyService implements BaseService {
    private requestContexts = new Map<string, RequestContext>();

    async handleCopyFiles(event: IpcMainInvokeEvent, params: CopyFilesParams): Promise<TaskHandle> {
        // 创建请求上下文
        const requestContext: RequestContext = {
            requestId: uuidv4(),
            sessionId: this.extractSessionId(event),
            ipcEvent: event,
            originalParams: params,
            createdAt: Date.now(),
            status: TaskStatus.PENDING
        };

        // 保存上下文映射
        this.requestContexts.set(requestContext.requestId, requestContext);

        // 提交任务到WorkerPool，传递完整上下文
        const taskHandle = await this.workerPool.submitTask({
            poolId: PoolIdentifiers.COPY_SERVICE,
            task: this.createTaskFromParams(params),
            context: {
                requestId: requestContext.requestId,
                sessionId: requestContext.sessionId,
                routing: {
                    sourceService: ServiceIdentifiers.COPY_SERVICE,
                    targetUI: UIComponents.FILE_PANE,
                    ipcEventId: requestContext.requestId
                }
            },
            callbacks: {
                onProgress: (progress, context) => this.routeProgressToUI(progress, context),
                onComplete: (result, context) => this.routeCompletionToUI(result, context),
                onError: (error, context) => this.routeErrorToUI(error, context)
            }
        });

        return this.createTaskHandle(taskHandle, requestContext);
    }

    private routeProgressToUI(progress: TaskProgress, context: MessageContext): void {
        // 根据上下文路由进度到正确的UI
        const requestContext = this.requestContexts.get(context.task.requestId);
        if (requestContext && requestContext.ipcEvent) {
            const uiProgress = this.transformProgressForUI(progress, context);
            requestContext.ipcEvent.sender.send(IPCChannels.FILE_OPERATIONS.COPY.PROGRESS, {
                requestId: context.task.requestId,
                workerId: context.identity.workerId,
                taskId: context.task.taskId,
                progress: uiProgress,
                timestamp: Date.now()
            });
        }
    }
}
```

## 常量管理

系统采用统一常量管理，所有IPC通道、操作类型、消息优先级等都通过全局常量定义，放置在`src/common/constants/`目录下管理。这种设计消除硬编码字符串，提高代码可维护性和类型安全性。

### 主要常量模块

- **IPCChannels**: 定义所有IPC通信通道（文件操作、系统事件、UI反馈）
- **ServiceIdentifiers**: 服务标识符（CopyService、MoveService等）
- **UIComponents**: UI组件标识（FilePane、ProgressPanel等）
- **TaskStatus**: 任务状态（pending、running、completed等）
- **MessagePriority**: 消息优先级（CRITICAL、HIGH、NORMAL、LOW）

*详细常量定义参见RFC-2025-002（常量管理系统）*

### 消息类型体系

系统定义了完整的消息协议，包括：

- **基础消息类型**: 任务请求、响应、进度报告、控制命令等
- **执行状态**: SUCCESS、ERROR、TIMEOUT、CANCELLED、IN_PROGRESS
- **故障类型**: WORKER_FAILURE、RESOURCE_EXHAUSTION、PERMISSION_DENIED等
- **协议版本**: 支持版本兼容性，当前版本2.0.0

所有消息都包含完整的上下文信息、优先级和路由信息，确保在复杂并发环境下的可靠通信。

### 消息流程和路由规则

**多Worker并发消息路由流程**：

```
1. UI发起请求 → Service(IpcMainInvokeEvent + requestId)
2. Service创建TaskContext → 包含requestId和IPC上下文
3. WorkerPool分配Worker → 返回workerId和taskId
4. Worker执行任务 → 消息包含workerId + taskId + requestId
5. Service接收Worker消息 → 根据requestId查找IPC上下文
6. Service路由消息到UI → 使用原始IpcMainInvokeEvent.sender
```

**消息路由示例**：

```typescript
// 消息路由流程示例
export class MessageRouter {

    // Worker消息到达Service
    public routeWorkerMessage(message: WorkerProtocol.Message): void {
        const { requestId } = message.context.task;
        const requestContext = this.getRequestContext(requestId);

        if (!requestContext) {
            logger.warn(LogMessages.ORPHANED_WORKER_MESSAGE, {
                workerId: message.context.identity.workerId,
                taskId: message.context.task.taskId,
                requestId
            });
            return;
        }

        // 根据消息类型路由到UI
        switch (message.messageType) {
            case MessageType.PROGRESS_REPORT:
                this.routeProgressToUI(message as ProgressReport, requestContext);
                break;
            case MessageType.TASK_RESPONSE:
                this.routeCompletionToUI(message as TaskResponse, requestContext);
                break;
            default:
                logger.warn(LogMessages.UNKNOWN_MESSAGE_TYPE, { message });
        }
    }

    private routeProgressToUI(progress: ProgressReport, context: RequestContext): void {
        // 构造UI进度消息
        const uiMessage = {
            type: UIMessageType.TASK_PROGRESS,
            requestId: context.requestId,
            workerId: progress.context.identity.workerId,
            taskId: progress.context.task.taskId,
            progress: progress.progress,
            display: progress.display,
            timestamp: progress.timestamp
        };

        // 发送到原始IPC通道
        context.ipcEvent.sender.send(IPCChannels.FILE_OPERATIONS.COPY.PROGRESS, uiMessage);

        // 记录路由日志
        logger.debug('Progress routed to UI', {
            requestId: context.requestId,
            workerId: progress.context.identity.workerId,
            percentage: progress.progress.percentage
        });
    }
}
```

## 4. 并发场景处理

**多任务并发管理**：Service如何管理多个并发Worker和任务

```typescript
// Service中的并发任务管理
export class CopyService {
    private activeTasks = new Map<string, ActiveTask>();

    interface ActiveTask {
        requestId: string;
        taskId: string;
        workerId: string;
        requestContext: RequestContext;
        startTime: number;
        lastUpdate: number;
        status: TaskStatus;
    }

    // 任务状态更新处理
    private updateTaskStatus(message: WorkerProtocol.Message): void {
        const task = this.activeTasks.get(message.context.task.taskId);
        if (task) {
            task.lastUpdate = Date.now();
            task.status = this.deriveTaskStatus(message);

            // 清理已完成任务
            if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
                this.cleanupTask(task);
            }
        }
    }

    // 任务清理
    private cleanupTask(task: ActiveTask): void {
        this.activeTasks.delete(task.taskId);
        this.requestContexts.delete(task.requestId);

        logger.info(LogMessages.TASK_CLEANED_UP, {
            requestId: task.requestId,
            taskId: task.taskId,
            workerId: task.workerId,
            duration: Date.now() - task.startTime
        });
    }
}
```

### 5. 错误处理和恢复机制

**Worker失联和错误恢复**：当Worker异常时如何处理UI反馈

```typescript
// Worker异常处理
export class WorkerErrorHandler {

    // Worker异常恢复
    public handleWorkerFailure(workerId: string, error: Error): void {
        // 查找该Worker的所有活跃任务
        const affectedTasks = this.findTasksByWorker(workerId);

        for (const task of affectedTasks) {
            // 通知UI任务失败
            this.notifyTaskFailure(task, {
                type: FailureType.WORKER_FAILURE,
                workerId,
                error: error.message,
                canRetry: true
            });

            // 决定是否重试
            if (task.retryCount < task.maxRetries) {
                this.retryTask(task);
            } else {
                this.markTaskAsFailed(task);
            }
        }
    }

    private notifyTaskFailure(task: ActiveTask, failure: TaskFailure): void {
        const requestContext = this.getRequestContext(task.requestId);
        if (requestContext) {
            requestContext.ipcEvent.sender.send(IPCChannels.FILE_OPERATIONS.COPY.ERROR, {
                requestId: task.requestId,
                taskId: task.taskId,
                error: failure,
                timestamp: Date.now()
            });
        }
    }
}
```

这样就建立了完整的多Worker并发场景下的消息路由和UI反馈机制。每个消息都包含完整的上下文信息，Service能够准确地将Worker响应路由到对应的UI请求。

## 实施指导

### 核心组件实现

#### 1. WorkerPool - 通用池管理器

```typescript
class WorkerPool {
    // 服务注册自己的Worker工厂
    registerWorkerType(
        name: string,
        config: WorkerConfig,
        workerFactory: () => Worker
    ): void

    // 执行任务
    async execute<T>(
        workerType: string,
        operation: string,
        payload: any,
        onProgress?: (progress: WorkerProgress) => void
    ): Promise<T>
}
```

#### 2. Service层 - Worker工厂提供者

```typescript
// 每个Service导入自己的Worker并在initialize()中注册
import createCopyWorker from "./workers/copy-worker?nodeWorker";
import { ServiceIdentifiers } from "@common/constants/ServiceIdentifiers";

@Service({
    name: "CopyService",
    version: "1.0.0",
    description: "Handles file copy operations with progress tracking"
    // 注意：不再需要workerScript和maxWorkers字段
})
class CopyService implements BaseService {
    private workerPool: WorkerPool;

    constructor() {
        this.workerPool = WorkerPool.getInstance();
    }

    async initialize() {
        // Service负责注册自己的Worker工厂
        this.workerPool.registerWorkerType(
            ServiceIdentifiers.COPY_SERVICE,
            { maxWorkers: 3, idleTimeout: 300000, maxRetries: 3 },
            createCopyWorker  // Vite的createWorker函数
        );
    }

    // 使用WorkerPool执行任务
    async handleFile(event: IpcMainInvokeEvent, params: CopyParams) {
        return await this.workerPool.execute(
            ServiceIdentifiers.COPY_SERVICE,
            "copy-file",
            params,
            (progress) => event.sender.send("copy:progress", progress)
        );
    }
}
```

#### 3. ServiceDecorator更新

ServiceDecorator不再自动注册Worker，而是让每个Service在自己的`initialize()`方法中注册：

```typescript
// ✅ 新设计：Service自主注册Worker
class ServiceRegistry {
    register(serviceClass: new () => BaseService): void {
        const instance = new serviceClass();
        // 只绑定IPC处理器
        this.bindIpcHandlers(instance, metadata);
        // Worker注册由Service.initialize()处理
    }
}
```

### Vite Worker集成

#### 正确的Worker导入方式
```typescript
// ✅ 正确：使用?nodeWorker后缀
import createWorker from "./my-worker?nodeWorker";

// ❌ 错误：使用?modulePath（已废弃）
import workerPath from "./my-worker?modulePath";

// 使用
const worker = createWorker(); // 直接调用工厂函数
```

#### 构建配置
```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['worker_threads', 'fs', 'path']
      }
    },
    plugins: [externalizeDepsPlugin()]
  }
});
```

### 架构原则

- **职责分离**: WorkerPool只管理池化，不知道具体Worker实现
- **Service自治**: 每个Service负责导入和注册自己的Worker
- **工厂模式**: 使用Vite的createWorker工厂函数创建Worker实例
- **常量管理**: 所有字符串通过constants文件统一管理

## 总结

本RFC定义了commando-react项目的Worker架构设计，通过三层分离架构实现高性能文件操作处理。核心特性包括：

- **性能隔离**: CPU密集型操作在独立Worker中执行，确保UI响应性
- **并发管理**: 智能任务调度和Worker池管理，支持多任务并行处理
- **消息路由**: 完整的身份识别和上下文追踪机制，确保消息准确路由
- **故障恢复**: 自动重试、Worker重启和资源清理机制
- **Vite集成**: 使用`?modulePath`语法，与electron-vite构建系统深度集成

该架构为commando-react提供了生产级的文件管理能力，在性能、可扩展性和架构清晰度方面达到最佳平衡。

---

**状态**: 🟢 Approved
**最后更新**: 2025-01-14