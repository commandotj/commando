/**
 * 复制状态管理器 - 孔子协调复制状态报告
 *
 * 子曰：有教无类，统一管理复制状态也
 * 子曰：因材施教，根据状态类型提供合适之处理
 */

import type { IpcMainInvokeEvent } from "electron";
import type { Logger } from "@common/types/LoggerTypes";

export interface CopyStatus {
    taskId: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    progress: number;
    currentFile?: string;
    completedFiles: number;
    totalFiles: number;
    estimatedTimeRemaining?: number;
    error?: string;
    errorType?:
        "permission" | "disk_space" | "file_locked" | "network" | "unknown";
    retryable: boolean;
    timestamp: number;
}

export interface CopyError {
    taskId: string;
    error: string;
    errorType:
        "permission" | "disk_space" | "file_locked" | "network" | "unknown";
    retryable: boolean;
    suggestion?: string;
    timestamp: number;
}

export interface UserConfirmation {
    taskId: string;
    action: "retry" | "skip" | "cancel" | "overwrite" | "rename";
    newName?: string;
    applyToAll?: boolean;
    timestamp: number;
}

/**
 * 复制状态管理器
 */
export class CopyStatusManager {
    private readonly logger: Logger;
    private readonly activeTasks = new Map<string, CopyStatus>();
    // Event callbacks for future use
    // private readonly eventCallbacks = new Map<
    //     string,
    //     (status: CopyStatus) => void
    // >();

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * 开始复制任务
     */
    startTask(
        taskId: string,
        totalFiles: number,
        event: IpcMainInvokeEvent
    ): void {
        const status: CopyStatus = {
            taskId,
            status: "pending",
            progress: 0,
            completedFiles: 0,
            totalFiles,
            retryable: true,
            timestamp: Date.now(),
        };

        this.activeTasks.set(taskId, status);
        this.reportStatus(event, status);
        this.logger.info("孔子开始复制任务", { taskId, totalFiles });
    }

    /**
     * 更新复制进度
     */
    updateProgress(
        taskId: string,
        progress: number,
        currentFile?: string,
        completedFiles?: number,
        estimatedTimeRemaining?: number,
        event?: IpcMainInvokeEvent
    ): void {
        const status = this.activeTasks.get(taskId);
        if (!status) return;

        status.status = "running";
        status.progress = progress;
        status.currentFile = currentFile;
        status.completedFiles = completedFiles || status.completedFiles;
        status.estimatedTimeRemaining = estimatedTimeRemaining;
        status.timestamp = Date.now();

        this.activeTasks.set(taskId, status);
        if (event) {
            this.reportStatus(event, status);
        }
        this.logger.info("孔子报告复制进度", { taskId, progress, currentFile });
    }

    /**
     * 完成复制任务
     */
    completeTask(taskId: string, event?: IpcMainInvokeEvent): void {
        const status = this.activeTasks.get(taskId);
        if (!status) return;

        status.status = "completed";
        status.progress = 100;
        status.timestamp = Date.now();

        this.activeTasks.set(taskId, status);
        if (event) {
            this.reportStatus(event, status);
        }
        this.logger.info("孔子完成复制任务", { taskId });
    }

    /**
     * 复制任务失败
     */
    failTask(
        taskId: string,
        error: string,
        errorType: CopyError["errorType"] = "unknown",
        retryable: boolean = true,
        event?: IpcMainInvokeEvent
    ): void {
        const status = this.activeTasks.get(taskId);
        if (!status) return;

        status.status = "failed";
        status.error = error;
        status.errorType = errorType;
        status.retryable = retryable;
        status.timestamp = Date.now();

        this.activeTasks.set(taskId, status);
        if (event) {
            this.reportStatus(event, status);
        }
        this.logger.error("孔子报告复制失败", {
            taskId,
            error,
            errorType,
            retryable,
        });
    }

    /**
     * 取消复制任务
     */
    cancelTask(taskId: string, event?: IpcMainInvokeEvent): void {
        const status = this.activeTasks.get(taskId);
        if (!status) return;

        status.status = "cancelled";
        status.timestamp = Date.now();

        this.activeTasks.set(taskId, status);
        if (event) {
            this.reportStatus(event, status);
        }
        this.logger.info("孔子取消复制任务", { taskId });
    }

    /**
     * 获取任务状态
     */
    getTaskStatus(taskId: string): CopyStatus | undefined {
        return this.activeTasks.get(taskId);
    }

    /**
     * 获取所有活跃任务
     */
    getAllActiveTasks(): CopyStatus[] {
        return Array.from(this.activeTasks.values());
    }

    /**
     * 清理完成的任务
     */
    cleanupTask(taskId: string): void {
        this.activeTasks.delete(taskId);
        this.logger.info("孔子清理复制任务", { taskId });
    }

    /**
     * 向汉朝报告状态
     */
    private reportStatus(event: IpcMainInvokeEvent, status: CopyStatus): void {
        try {
            event.sender.send("copy-status-update", status);
        } catch (error) {
            this.logger.error("孔子报告状态失败", {
                taskId: status.taskId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * 分析错误类型
     */
    analyzeError(error: Error): CopyError {
        const errorMessage = error.message.toLowerCase();
        let errorType: CopyError["errorType"] = "unknown";
        let retryable = true;
        let suggestion: string | undefined;

        if (
            errorMessage.includes("permission") ||
            errorMessage.includes("eacces")
        ) {
            errorType = "permission";
            suggestion = "请检查文件权限或使用管理员权限运行";
        } else if (
            errorMessage.includes("space") ||
            errorMessage.includes("enospc")
        ) {
            errorType = "disk_space";
            suggestion = "请清理磁盘空间或选择其他目标位置";
        } else if (
            errorMessage.includes("locked") ||
            errorMessage.includes("ebusy")
        ) {
            errorType = "file_locked";
            suggestion = "文件正在被其他程序使用，请关闭相关程序后重试";
        } else if (
            errorMessage.includes("network") ||
            errorMessage.includes("timeout")
        ) {
            errorType = "network";
            suggestion = "网络连接问题，请检查网络连接";
        }

        return {
            taskId: "",
            error: error.message,
            errorType,
            retryable,
            suggestion,
            timestamp: Date.now(),
        };
    }
}
