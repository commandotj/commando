/**
 * 任务状态常量
 * 定义系统中所有任务状态的标准化值
 */

export const PENDING = "pending" as const;
export const QUEUED = "queued" as const;
export const RUNNING = "running" as const;
export const PAUSED = "paused" as const;
export const COMPLETED = "completed" as const;
export const FAILED = "failed" as const;
export const CANCELLED = "cancelled" as const;
export const TIMEOUT = "timeout" as const;

export const TaskStatus = {
    PENDING,
    QUEUED,
    RUNNING,
    PAUSED,
    COMPLETED,
    FAILED,
    CANCELLED,
    TIMEOUT,
} as const;

export type TaskStatusValue = (typeof TaskStatus)[keyof typeof TaskStatus];
