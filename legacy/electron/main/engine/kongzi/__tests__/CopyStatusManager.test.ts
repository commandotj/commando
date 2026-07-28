/**
 * CopyStatusManager 单元测试
 *
 * 测试孔子状态管理器的功能
 */

import { CopyStatusManager } from "../CopyStatusManager";
import { IpcMainInvokeEvent } from "electron";

// Mock logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

// Mock IPC event
const mockEvent = {
    sender: {
        send: jest.fn(),
    },
} as unknown as IpcMainInvokeEvent;

describe("CopyStatusManager", () => {
    let statusManager: CopyStatusManager;

    beforeEach(() => {
        statusManager = new CopyStatusManager(mockLogger);
        jest.clearAllMocks();
    });

    describe("startTask", () => {
        it("应该开始复制任务并报告pending状态", () => {
            const taskId = "test-task-123";
            const totalFiles = 5;

            statusManager.startTask(taskId, totalFiles, mockEvent);

            const status = statusManager.getTaskStatus(taskId);
            expect(status).toBeDefined();
            expect(status?.taskId).toBe(taskId);
            expect(status?.status).toBe("pending");
            expect(status?.totalFiles).toBe(totalFiles);
            expect(status?.completedFiles).toBe(0);
            expect(status?.progress).toBe(0);
            expect(status?.retryable).toBe(true);

            expect(mockEvent.sender.send).toHaveBeenCalledWith(
                "copy-status-update",
                status
            );
            expect(mockLogger.info).toHaveBeenCalledWith("孔子开始复制任务", {
                taskId,
                totalFiles,
            });
        });
    });

    describe("updateProgress", () => {
        it("应该更新复制进度并报告running状态", () => {
            const taskId = "test-task-123";
            const totalFiles = 5;

            // 先开始任务
            statusManager.startTask(taskId, totalFiles, mockEvent);
            jest.clearAllMocks();

            // 更新进度
            statusManager.updateProgress(
                taskId,
                50,
                "test-file.txt",
                2,
                1000,
                mockEvent
            );

            const status = statusManager.getTaskStatus(taskId);
            expect(status?.status).toBe("running");
            expect(status?.progress).toBe(50);
            expect(status?.currentFile).toBe("test-file.txt");
            expect(status?.completedFiles).toBe(2);
            expect(status?.estimatedTimeRemaining).toBe(1000);

            expect(mockEvent.sender.send).toHaveBeenCalledWith(
                "copy-status-update",
                status
            );
            expect(mockLogger.info).toHaveBeenCalledWith("孔子报告复制进度", {
                taskId,
                progress: 50,
                currentFile: "test-file.txt",
            });
        });
    });

    describe("completeTask", () => {
        it("应该完成复制任务并报告completed状态", () => {
            const taskId = "test-task-123";
            const totalFiles = 5;

            // 先开始任务
            statusManager.startTask(taskId, totalFiles, mockEvent);
            jest.clearAllMocks();

            // 完成任务
            statusManager.completeTask(taskId, mockEvent);

            const status = statusManager.getTaskStatus(taskId);
            expect(status?.status).toBe("completed");
            expect(status?.progress).toBe(100);

            expect(mockEvent.sender.send).toHaveBeenCalledWith(
                "copy-status-update",
                status
            );
            expect(mockLogger.info).toHaveBeenCalledWith("孔子完成复制任务", {
                taskId,
            });
        });
    });

    describe("failTask", () => {
        it("应该报告复制失败", () => {
            const taskId = "test-task-123";
            const totalFiles = 5;
            const error = "Permission denied";
            const errorType = "permission" as const;
            const retryable = true;

            // 先开始任务
            statusManager.startTask(taskId, totalFiles, mockEvent);
            jest.clearAllMocks();

            // 报告失败
            statusManager.failTask(
                taskId,
                error,
                errorType,
                retryable,
                mockEvent
            );

            const status = statusManager.getTaskStatus(taskId);
            expect(status?.status).toBe("failed");
            expect(status?.error).toBe(error);
            expect(status?.errorType).toBe(errorType);
            expect(status?.retryable).toBe(retryable);

            expect(mockEvent.sender.send).toHaveBeenCalledWith(
                "copy-status-update",
                status
            );
            expect(mockLogger.error).toHaveBeenCalledWith("孔子报告复制失败", {
                taskId,
                error,
                errorType,
                retryable,
            });
        });
    });

    describe("cancelTask", () => {
        it("应该取消复制任务并报告cancelled状态", () => {
            const taskId = "test-task-123";
            const totalFiles = 5;

            // 先开始任务
            statusManager.startTask(taskId, totalFiles, mockEvent);
            jest.clearAllMocks();

            // 取消任务
            statusManager.cancelTask(taskId, mockEvent);

            const status = statusManager.getTaskStatus(taskId);
            expect(status?.status).toBe("cancelled");

            expect(mockEvent.sender.send).toHaveBeenCalledWith(
                "copy-status-update",
                status
            );
            expect(mockLogger.info).toHaveBeenCalledWith("孔子取消复制任务", {
                taskId,
            });
        });
    });

    describe("analyzeError", () => {
        it("应该正确分析权限错误", () => {
            const error = new Error("Permission denied");
            const result = statusManager.analyzeError(error);

            expect(result.errorType).toBe("permission");
            expect(result.retryable).toBe(true);
            expect(result.suggestion).toBe(
                "请检查文件权限或使用管理员权限运行"
            );
        });

        it("应该正确分析磁盘空间错误", () => {
            const error = new Error("No space left on device");
            const result = statusManager.analyzeError(error);

            expect(result.errorType).toBe("disk_space");
            expect(result.retryable).toBe(true);
            expect(result.suggestion).toBe("请清理磁盘空间或选择其他目标位置");
        });

        it("应该正确分析文件锁定错误", () => {
            const error = new Error("File is locked");
            const result = statusManager.analyzeError(error);

            expect(result.errorType).toBe("file_locked");
            expect(result.retryable).toBe(true);
            expect(result.suggestion).toBe(
                "文件正在被其他程序使用，请关闭相关程序后重试"
            );
        });

        it("应该正确分析网络错误", () => {
            const error = new Error("Network timeout");
            const result = statusManager.analyzeError(error);

            expect(result.errorType).toBe("network");
            expect(result.retryable).toBe(true);
            expect(result.suggestion).toBe("网络连接问题，请检查网络连接");
        });

        it("应该处理未知错误", () => {
            const error = new Error("Unknown error");
            const result = statusManager.analyzeError(error);

            expect(result.errorType).toBe("unknown");
            expect(result.retryable).toBe(true);
            expect(result.suggestion).toBeUndefined();
        });
    });

    describe("getAllActiveTasks", () => {
        it("应该返回所有活跃任务", () => {
            const taskId1 = "task-1";
            const taskId2 = "task-2";

            statusManager.startTask(taskId1, 3, mockEvent);
            statusManager.startTask(taskId2, 5, mockEvent);

            const activeTasks = statusManager.getAllActiveTasks();
            expect(activeTasks).toHaveLength(2);
            expect(activeTasks.map(t => t.taskId)).toContain(taskId1);
            expect(activeTasks.map(t => t.taskId)).toContain(taskId2);
        });
    });

    describe("cleanupTask", () => {
        it("应该清理完成的任务", () => {
            const taskId = "test-task-123";
            const totalFiles = 5;

            statusManager.startTask(taskId, totalFiles, mockEvent);
            statusManager.completeTask(taskId, mockEvent);
            statusManager.cleanupTask(taskId);

            const status = statusManager.getTaskStatus(taskId);
            expect(status).toBeUndefined();
            expect(mockLogger.info).toHaveBeenCalledWith("孔子清理复制任务", {
                taskId,
            });
        });
    });
});
