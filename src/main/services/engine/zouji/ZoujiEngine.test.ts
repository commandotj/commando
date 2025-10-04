/**
 * 邹忌引擎测试
 */

import { ZoujiEngine, type ZoujiEngineDeps } from "./ZoujiEngine"
import type { Logger } from "../shared/loggerTypes"

// Mock dependencies
const mockLogger: Logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}

const mockFs = {
    stat: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn()
} as any

const mockDeps: ZoujiEngineDeps = {
    logger: mockLogger,
    fs: mockFs
}

describe("ZoujiEngine", () => {
    let engine: ZoujiEngine

    beforeEach(() => {
        engine = new ZoujiEngine(mockDeps)
        jest.clearAllMocks()
    })

    describe("initialization", () => {
        it("should initialize successfully", async () => {
            await engine.initialize()
            expect(mockLogger.info).toHaveBeenCalledWith("邹忌比较引擎初始化完成")
        })

        it("should cleanup successfully", async () => {
            await engine.cleanup()
            expect(mockLogger.info).toHaveBeenCalledWith("邹忌比较引擎清理完成")
        })
    })

    describe("engine properties", () => {
        it("should have correct engine info", () => {
            expect(engine.name).toBe("ZoujiEngine")
            expect(engine.version).toBe("1.0.0")
            expect(engine.capabilities).toHaveLength(1)
            expect(engine.capabilities[0].type).toBe("comparison")
        })
    })

    describe("status reporting", () => {
        it("should return correct initial status", () => {
            const status = engine.getStatus()
            expect(status.running).toBe(false)
            expect(status.activeTasks).toBe(0)
            expect(status.queueSize).toBe(0)
            expect(status.errorCount).toBe(0)
            expect(status.lastActivity).toBeInstanceOf(Date)
        })
    })

    describe("task execution", () => {
        it("should reject non-compare tasks", async () => {
            const task = {
                id: "test-task",
                type: "copy" as const,
                priority: 1,
                source: "/source",
                destination: "/dest"
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(false)
            expect(result.error).toBe("邹忌引擎只支持比较操作")
        })

        it("should execute compare task successfully", async () => {
            // Mock file system operations
            mockFs.stat.mockResolvedValue({
                size: 100,
                mtime: new Date("2024-01-01"),
                mode: 0o644
            })
            mockFs.readFile.mockResolvedValue(Buffer.from("test content"))

            const task = {
                id: "compare-task",
                type: "compare" as const,
                priority: 1,
                source: "/file1.txt",
                destination: "/file2.txt",
                options: {
                    compareContent: true,
                    compareAttributes: true,
                    generateDiff: true
                } as Record<string, unknown>
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(true)
            expect(result.taskId).toBe("compare-task")
            expect(result.data).toBeDefined()
        })
    })

    describe("file comparison", () => {
        beforeEach(() => {
            mockFs.stat.mockResolvedValue({
                size: 100,
                mtime: new Date("2024-01-01"),
                mode: 0o644
            })
        })

        it("should detect identical files", async () => {
            mockFs.readFile.mockResolvedValue(Buffer.from("same content"))

            const task = {
                id: "identical-compare",
                type: "compare" as const,
                priority: 1,
                source: "/file1.txt",
                destination: "/file2.txt",
                options: { compareContent: true } as Record<string, unknown>
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(true)
            const data = result.data as any
            expect(data.identical).toBe(true)
        })

        it("should detect different files", async () => {
            mockFs.readFile
                .mockResolvedValueOnce(Buffer.from("content 1"))
                .mockResolvedValueOnce(Buffer.from("content 2"))

            const task = {
                id: "different-compare",
                type: "compare" as const,
                priority: 1,
                source: "/file1.txt",
                destination: "/file2.txt",
                options: { compareContent: true } as Record<string, unknown>
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(true)
            const data = result.data as any
            expect(data.identical).toBe(false)
        })

        it("should handle missing files", async () => {
            mockFs.stat.mockRejectedValue(new Error("File not found"))

            const task = {
                id: "missing-compare",
                type: "compare" as const,
                priority: 1,
                source: "/missing1.txt",
                destination: "/missing2.txt"
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
        })
    })

    describe("attribute comparison", () => {
        it("should compare file attributes", async () => {
            mockFs.stat
                .mockResolvedValueOnce({
                    size: 100,
                    mtime: new Date("2024-01-01"),
                    mode: 0o644
                })
                .mockResolvedValueOnce({
                    size: 200,
                    mtime: new Date("2024-01-02"),
                    mode: 0o755
                })

            const task = {
                id: "attr-compare",
                type: "compare" as const,
                priority: 1,
                source: "/file1.txt",
                destination: "/file2.txt",
                options: { compareAttributes: true } as Record<string, unknown>
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(true)
            const data = result.data as any
            expect(data.attributes.sizeDifferent).toBe(true)
            expect(data.attributes.timeDifferent).toBe(true)
            expect(data.attributes.permissionsDifferent).toBe(true)
        })
    })

    describe("progress reporting", () => {
        it("should call progress callback during comparison", async () => {
            const progressCallback = jest.fn()

            mockFs.stat.mockResolvedValue({
                size: 100,
                mtime: new Date(),
                mode: 0o644
            })
            mockFs.readFile.mockResolvedValue(Buffer.from("test"))

            const task = {
                id: "progress-compare",
                type: "compare" as const,
                priority: 1,
                source: "/file1.txt",
                destination: "/file2.txt",
                progressCallback
            }

            await engine.executeTask(task)
            expect(progressCallback).toHaveBeenCalled()
        })
    })
})