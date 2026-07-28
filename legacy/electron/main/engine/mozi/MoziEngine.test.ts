/**
 * 墨子引擎测试
 */

import { MoziEngine, type MoziEngineDeps } from "./Engine";
import type { Logger } from "../../../common/types/LoggerTypes";

// Mock dependencies
const mockLogger: Logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

const mockFs = {
    readdir: jest.fn(),
    stat: jest.fn(),
    copyFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    utimes: jest.fn(),
} as any;

const mockDeps: MoziEngineDeps = {
    logger: mockLogger,
    fs: mockFs,
};

describe("MoziEngine", () => {
    let engine: MoziEngine;

    beforeEach(() => {
        engine = new MoziEngine(mockDeps);
        jest.clearAllMocks();
    });

    describe("initialization", () => {
        it("should initialize successfully", async () => {
            await engine.initialize();
            expect(mockLogger.info).toHaveBeenCalledWith(
                "墨子同步引擎初始化完成"
            );
        });

        it("should cleanup successfully", async () => {
            await engine.cleanup();
            expect(mockLogger.info).toHaveBeenCalledWith(
                "墨子同步引擎清理完成"
            );
        });
    });

    describe("engine properties", () => {
        it("should have correct engine info", () => {
            expect(engine.name).toBe("MoziEngine");
            expect(engine.version).toBe("1.0.0");
            expect(engine.capabilities).toHaveLength(1);
            expect(engine.capabilities[0].type).toBe("sync");
        });
    });

    describe("status reporting", () => {
        it("should return correct initial status", () => {
            const status = engine.getStatus();
            expect(status.running).toBe(false);
            expect(status.activeTasks).toBe(0);
            expect(status.queueSize).toBe(0);
            expect(status.errorCount).toBe(0);
            expect(status.lastActivity).toBeInstanceOf(Date);
        });
    });

    describe("task execution", () => {
        it("should reject non-sync tasks", async () => {
            const task = {
                id: "test-task",
                type: "copy" as const,
                priority: 1,
                source: "/source",
                destination: "/dest",
            };

            const result = await engine.executeTask(task);
            expect(result.success).toBe(false);
            expect(result.error).toBe("墨子引擎只支持同步操作");
        });

        it("should execute sync task successfully", async () => {
            // Mock file system operations
            mockFs.readdir.mockResolvedValue([
                {
                    name: "file1.txt",
                    isDirectory: () => false,
                    isFile: () => true,
                },
            ]);
            mockFs.stat.mockResolvedValue({
                mtime: new Date("2024-01-01"),
                size: 100,
            });
            mockFs.copyFile.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);

            const task = {
                id: "sync-task",
                type: "sync" as const,
                priority: 1,
                source: "/source",
                destination: "/dest",
                options: {
                    dryRun: false,
                    preserveTimestamps: true,
                } as Record<string, unknown>,
            };

            const result = await engine.executeTask(task);
            expect(result.success).toBe(true);
            expect(result.taskId).toBe("sync-task");
            expect(result.data).toBeDefined();
        });
    });

    describe("sync operations", () => {
        beforeEach(() => {
            // Common mocks for sync operations
            mockFs.readdir.mockResolvedValue([]);
            mockFs.stat.mockResolvedValue({
                mtime: new Date(),
                size: 0,
            });
            mockFs.copyFile.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);
        });

        it("should handle empty directories", async () => {
            const task = {
                id: "empty-sync",
                type: "sync" as const,
                priority: 1,
                source: "/empty",
                destination: "/dest",
            };

            const result = await engine.executeTask(task);
            expect(result.success).toBe(true);
        });

        it("should handle sync errors gracefully", async () => {
            mockFs.readdir.mockRejectedValue(new Error("Permission denied"));

            const task = {
                id: "error-sync",
                type: "sync" as const,
                priority: 1,
                source: "/no-permission",
                destination: "/dest",
            };

            const result = await engine.executeTask(task);
            expect(result.success).toBe(true); // Should complete with errors reported
            expect(result.data).toBeDefined();
        });
    });

    describe("progress reporting", () => {
        it("should call progress callback during sync", async () => {
            const progressCallback = jest.fn();

            mockFs.readdir.mockResolvedValue([
                {
                    name: "file1.txt",
                    isDirectory: () => false,
                    isFile: () => true,
                },
            ]);
            mockFs.stat.mockResolvedValue({
                mtime: new Date(),
                size: 100,
            });
            mockFs.copyFile.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);

            const task = {
                id: "progress-sync",
                type: "sync" as const,
                priority: 1,
                source: "/source",
                destination: "/dest",
                progressCallback,
            };

            await engine.executeTask(task);
            expect(progressCallback).toHaveBeenCalled();
        });
    });
});
