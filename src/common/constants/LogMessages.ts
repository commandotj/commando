/**
 * 日志消息常量
 * 定义系统中所有日志消息的标准化文本
 */

export namespace LogMessages {
    // Worker相关
    export const WORKER_CREATED = 'Worker instance created successfully' as const;
    export const WORKER_TERMINATED = 'Worker instance terminated' as const;
    export const WORKER_TYPE_REGISTERED = 'Worker type registered successfully' as const;
    export const ORPHANED_WORKER_MESSAGE = 'Received message from orphaned worker' as const;

    // 任务相关
    export const TASK_SCHEDULED = 'Task scheduled for execution' as const;
    export const TASK_STARTED = 'Task execution started' as const;
    export const TASK_COMPLETED = 'Task execution completed successfully' as const;
    export const TASK_FAILED = 'Task execution failed' as const;
    export const TASK_CLEANED_UP = 'Task resources cleaned up' as const;

    // 系统相关
    export const SYSTEM_STARTUP = 'System initialization completed' as const;
    export const SYSTEM_SHUTDOWN = 'System shutdown initiated' as const;
    export const MEMORY_WARNING = 'System memory usage warning' as const;
    export const PERFORMANCE_ALERT = 'System performance degradation detected' as const;

    // 操作相关
    export const OPERATION_STARTED = 'File operation started' as const;
    export const OPERATION_PROGRESS = 'File operation progress updated' as const;
    export const OPERATION_COMPLETED = 'File operation completed successfully' as const;
    export const OPERATION_FAILED = 'File operation failed' as const;
    export const OPERATION_CANCELLED = 'File operation cancelled by user' as const;

    // 路由相关
    export const MESSAGE_ROUTED = 'Message successfully routed to UI' as const;
    export const UNKNOWN_MESSAGE_TYPE = 'Unknown message type encountered during routing' as const;
    export const ROUTING_FAILED = 'Message routing failed' as const;

    // Pool管理
    export const POOL_CREATED = 'Worker pool created' as const;
    export const POOL_DESTROYED = 'Worker pool destroyed' as const;
    export const IDLE_WORKERS_CLEANED = 'Idle workers cleaned up' as const;
}

export type LogMessageValue = typeof LogMessages[keyof typeof LogMessages];