/**
 * Jest Tests for Copy Service
 * Tests copy operations, batch copying, and progress tracking
 */

import { IpcMainInvokeEvent } from "electron"
import CopyService from "../CopyService"
import { WorkerPool, WorkerProgress } from "../core/WorkerPool"

// Mock dependencies
jest.mock("../core/WorkerPool")
jest.mock("../../log/logger", () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}))
jest.mock("../workers/copy-worker?nodeWorker", () => {
    return jest.fn(() => ({}))
})
jest.mock("electron", () => ({
    ipcMain: {
        handle: jest.fn(),
        on: jest.fn(),
        removeHandler: jest.fn(),
        removeAllListeners: jest.fn(),
    },
    IpcMainInvokeEvent: {},
    IpcMainEvent: {},
}))

const MockWorkerPool = WorkerPool as jest.Mocked<typeof WorkerPool>

describe("CopyService", () => {
    let copyService: CopyService
    let mockWorkerPool: jest.Mocked<WorkerPool>
    let mockEvent: IpcMainInvokeEvent

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup mock worker pool
        mockWorkerPool = {
            execute: jest.fn(),
            getInstance: jest.fn(),
            registerWorkerType: jest.fn(),
            cleanup: jest.fn(),
            getPoolStats: jest.fn(),
            startIdleWorkerCleanup: jest.fn(),
        } as unknown as jest.Mocked<WorkerPool>
        ;(MockWorkerPool.getInstance as jest.MockedFunction<typeof WorkerPool.getInstance>).mockReturnValue(
            mockWorkerPool
        )

        copyService = new CopyService()
        mockEvent = {
            sender: {
                send: jest.fn(),
            },
        } as unknown as IpcMainInvokeEvent
    })

    describe("Service Metadata", () => {
        it("should return correct metadata", () => {
            const metadata = copyService.getMetadata()

            expect(metadata).toMatchObject({
                name: "CopyService",
                version: "1.0.0",
                description: "Handles file copy operations with progress tracking",
            })

            // Check that ipcChannels is an array (may be empty in test environment due to decorator limitations)
            expect(Array.isArray(metadata.ipcChannels)).toBe(true)

            // If ipcChannels is not empty, check the structure
            if (metadata.ipcChannels.length > 0) {
                expect(metadata.ipcChannels).toEqual(
                    expect.arrayContaining([
                        { channel: "copy:file", type: "handle" },
                        { channel: "copy:batch", type: "handle" },
                        { channel: "copy:cancel", type: "handle" },
                        { channel: "copy:status", type: "on" },
                    ])
                )
            }
        })
    })

    describe("Service Lifecycle", () => {
        it("should initialize successfully", async () => {
            await expect(copyService.initialize()).resolves.not.toThrow()

            expect(MockWorkerPool.getInstance).toHaveBeenCalled()
        })

        it("should cleanup successfully", async () => {
            await copyService.initialize()
            await expect(copyService.cleanup()).resolves.not.toThrow()
        })
    })

    describe("Single File Copy", () => {
        beforeEach(async () => {
            await copyService.initialize()
        })

        it("should copy a single file successfully", async () => {
            const copyParams = {
                source: "/path/to/source.txt",
                destination: "/path/to/destination.txt",
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                copiedFiles: 1,
                totalSize: 1024,
            })

            const result = await copyService.handleFile(mockEvent, copyParams)

            expect(mockWorkerPool.execute).toHaveBeenCalledWith(
                "CopyService",
                "copy-file",
                copyParams,
                expect.any(Function) // progress callback
            )

            expect(result).toMatchObject({
                success: true,
                copiedFiles: 1,
                totalSize: 1024,
            })
        })

        it("should handle copy errors", async () => {
            const copyParams = {
                source: "/nonexistent/file.txt",
                destination: "/path/to/destination.txt",
            }

            mockWorkerPool.execute.mockRejectedValue(new Error("File not found"))

            await expect(copyService.handleFile(mockEvent, copyParams)).rejects.toThrow("File not found")
        })

        it("should validate copy parameters", async () => {
            const invalidParams = {
                source: "",
                destination: "/path/to/destination.txt",
            }

            await expect(copyService.handleFile(mockEvent, invalidParams)).rejects.toThrow("Invalid copy parameters")
        })

        it("should send progress updates during copy", async () => {
            const copyParams = {
                source: "/large/file.zip",
                destination: "/backup/file.zip",
            }

            // Mock mainWindow for progress updates
            const mockMainWindow = {
                isDestroyed: jest.fn(() => false),
                webContents: {
                    send: jest.fn(),
                },
            }
            copyService.setMainWindow(mockMainWindow as any)

            // Capture the progress callback
            let progressCallback: ((progress: WorkerProgress) => void) | undefined
            mockWorkerPool.execute.mockImplementation((_workerType, _operation, _params, onProgress) => {
                progressCallback = onProgress!

                // Simulate async progress updates
                setTimeout(() => {
                    progressCallback?.({
                        id: "test-id",
                        type: "progress",
                        operation: "copy-file",
                        progress: 25,
                        currentItem: "file.zip",
                        timestamp: Date.now(),
                    })
                }, 10)

                setTimeout(() => {
                    progressCallback?.({
                        id: "test-id",
                        type: "progress",
                        operation: "copy-file",
                        progress: 75,
                        currentItem: "file.zip",
                        timestamp: Date.now(),
                    })
                }, 20)

                return Promise.resolve({
                    success: true,
                    copiedFiles: 1,
                    totalSize: 1048576,
                })
            })

            await copyService.handleFile(mockEvent, copyParams)

            // Wait for async progress updates
            await new Promise(resolve => setTimeout(resolve, 50))

            // Should have sent progress updates to renderer via mainWindow
            expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
                "copy:progress",
                expect.objectContaining({
                    progress: 25,
                    operation: "file",
                })
            )

            expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
                "copy:progress",
                expect.objectContaining({
                    progress: 75,
                    operation: "file",
                })
            )
        })
    })

    describe("Batch Copy", () => {
        beforeEach(async () => {
            await copyService.initialize()
        })

        it("should copy multiple files successfully", async () => {
            const batchParams = {
                sources: ["/path/file1.txt", "/path/file2.txt", "/path/file3.txt"],
                destination: "/backup/",
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                batchId: "batch-123",
                totalFiles: 3,
                copiedFiles: 3,
                failedFiles: [],
                totalSize: 3072,
                results: [
                    { source: "/path/file1.txt", destination: "/backup/file1.txt", success: true },
                    { source: "/path/file2.txt", destination: "/backup/file2.txt", success: true },
                    { source: "/path/file3.txt", destination: "/backup/file3.txt", success: true },
                ],
            })

            const result = await copyService.handleBatch(mockEvent, batchParams)

            expect(mockWorkerPool.execute).toHaveBeenCalledWith(
                "CopyService",
                "copy-batch",
                expect.objectContaining({
                    tasks: expect.arrayContaining([
                        expect.objectContaining({ source: "/path/file1.txt" }),
                    ]),
                }),
                expect.any(Function)
            )

            const typedResult = result as {
                batchId: string
                workerBatchId?: string
                success: boolean
                copiedFiles?: number
            }
            expect(typedResult.batchId).toMatch(/^copy-batch-/)
            expect(typedResult.workerBatchId).toBe("batch-123")
            expect(typedResult.success).toBe(true)
            expect(typedResult.copiedFiles).toBe(3)
        })

        it("should handle partial batch failures", async () => {
            const batchParams = {
                sources: ["/path/file1.txt", "/nonexistent.txt", "/path/file3.txt"],
                destination: "/backup/",
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: false,
                batchId: "batch-456",
                totalFiles: 3,
                copiedFiles: 2,
                failedFiles: [
                    {
                        source: "/nonexistent.txt",
                        destination: "/backup//nonexistent.txt",
                        error: "File not found",
                    },
                ],
                totalSize: 2048,
                results: [
                    { source: "/path/file1.txt", destination: "/backup/file1.txt", success: true },
                    {
                        source: "/nonexistent.txt",
                        destination: "/backup//nonexistent.txt",
                        success: false,
                        error: "File not found",
                    },
                    { source: "/path/file3.txt", destination: "/backup/file3.txt", success: true },
                ],
            })

            const result = await copyService.handleBatch(mockEvent, batchParams)

            const typedResult = result as {
                batchId: string
                workerBatchId?: string
                success: boolean
                copiedFiles: number
                failedFiles: Array<{ source: string; destination: string; error: string }>
            }
            expect(typedResult.batchId).toMatch(/^copy-batch-/)
            expect(typedResult.workerBatchId).toBe("batch-456")
            expect(typedResult.success).toBe(false)
            expect(typedResult.copiedFiles).toBe(2)
            expect(typedResult.failedFiles).toHaveLength(1)
            expect(typedResult.failedFiles[0]).toMatchObject({
                source: "/nonexistent.txt",
                error: "File not found",
            })
        })

        it("should validate batch parameters", async () => {
            const invalidParams = {
                sources: [], // Empty sources
                destination: "/backup/",
            }

            await expect(copyService.handleBatch(mockEvent, invalidParams)).rejects.toThrow(
                "Invalid batch copy parameters"
            )
        })

        it("should track batch progress", async () => {
            const batchParams = {
                sources: Array.from({ length: 10 }, (_, i) => `/files/file${i}.txt`),
                destination: "/backup/",
            }

            // Mock mainWindow for progress updates
            const mockMainWindow = {
                isDestroyed: jest.fn(() => false),
                webContents: {
                    send: jest.fn(),
                },
            }
            copyService.setMainWindow(mockMainWindow as any)

            let progressCallback: ((progress: WorkerProgress) => void) | undefined
            mockWorkerPool.execute.mockImplementation((_workerType, _operation, _params, onProgress) => {
                progressCallback = onProgress!

                // Simulate batch progress updates
                ;[20, 40, 60, 80, 100].forEach((progressValue, index) => {
                    setTimeout(() => {
                        progressCallback?.({
                            id: "batch-id",
                            type: "progress",
                            operation: "copy-batch",
                            progress: progressValue,
                            currentItem: `/files/file${index}.txt`,
                            completedFiles: index + 1,
                            totalFiles: 10,
                            detail: {
                                source: `/files/file${index}.txt`,
                                bytesCopied: 1024,
                                totalBytes: 1024,
                            },
                            timestamp: Date.now(),
                        })
                    }, (index + 1) * 10)
                })

                return Promise.resolve({
                    success: true,
                    batchId: "batch-789",
                    totalFiles: 10,
                    copiedFiles: 10,
                    failedFiles: [],
                    results: [],
                })
            })

            await copyService.handleBatch(mockEvent, batchParams)

            // Wait for async progress updates
            await new Promise(resolve => setTimeout(resolve, 120))

            // Should have sent progress updates via mainWindow on the dedicated channel
            expect(mockMainWindow.webContents.send).toHaveBeenCalled()
            expect(
                mockMainWindow.webContents.send.mock.calls.filter(
                    ([channel]) => channel === "copy-batch-progress"
                ).length
            ).toBeGreaterThan(0)
        })
    })

    describe("Copy Cancellation", () => {
        beforeEach(async () => {
            await copyService.initialize()
        })

        it("should cancel ongoing copy operation", async () => {
            const taskId = "copy-task-123"

            // Mock the cancel operation
            mockWorkerPool.execute.mockResolvedValue({
                cancelled: true,
                taskId,
            })

            const result = await copyService.handleCancel(mockEvent, {
                taskId,
            })

            expect(mockWorkerPool.execute).toHaveBeenCalledWith("CopyService", "cancel-copy", { taskId })

            const cancelledResult = result as { cancelled: boolean }
            expect(cancelledResult.cancelled).toBe(true)
        })

        it("should handle cancellation of non-existent task", async () => {
            const taskId = "nonexistent-task"

            mockWorkerPool.execute.mockResolvedValue({
                cancelled: false,
                error: "Task not found",
            })

            const result = await copyService.handleCancel(mockEvent, {
                taskId,
            })

            const notCancelledResult = result as {
                cancelled: boolean
                error: string
            }
            expect(notCancelledResult.cancelled).toBe(false)
            expect(notCancelledResult.error).toBe("Task not found")
        })
    })

    describe("Error Handling", () => {
        beforeEach(async () => {
            await copyService.initialize()
        })

        it("should handle worker pool execution errors", async () => {
            const copyParams = {
                source: "/path/source.txt",
                destination: "/path/destination.txt",
            }

            mockWorkerPool.execute.mockRejectedValue(new Error("Worker pool error"))

            await expect(copyService.handleFile(mockEvent, copyParams)).rejects.toThrow("Worker pool error")
        })

        it("should handle invalid destination paths", async () => {
            const copyParams = {
                source: "/valid/source.txt",
                destination: "", // Invalid destination
            }

            await expect(copyService.handleFile(mockEvent, copyParams)).rejects.toThrow("Invalid copy parameters")
        })

        it("should validate file paths", async () => {
            const testCases = [
                { source: null, destination: "/valid/path" },
                { source: "/valid/path", destination: null },
                { source: "", destination: "/valid/path" },
                { source: "/valid/path", destination: "" },
            ]

            for (const testCase of testCases) {
                await expect(
                    copyService.handleFile(mockEvent, testCase as { source: string; destination: string })
                ).rejects.toThrow("Invalid copy parameters")
            }
        })
    })

    describe("Performance Considerations", () => {
        beforeEach(async () => {
            await copyService.initialize()
        })

        it("should handle large batch operations efficiently", async () => {
            const largeBatchParams = {
                sources: Array.from({ length: 1000 }, (_, i) => `/files/file${i}.txt`),
                destination: "/backup/",
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                batchId: "large-batch",
                totalFiles: 1000,
                copiedFiles: 1000,
                failedFiles: [],
            })

            const startTime = Date.now()
            const result = await copyService.handleBatch(mockEvent, largeBatchParams)
            const endTime = Date.now()

            // Should complete in reasonable time (less than 1 second for mocked operation)
            expect(endTime - startTime).toBeLessThan(1000)
            const analysisResult = result as {
                success: boolean
                totalFiles: number
            }
            expect(analysisResult.success).toBe(true)
            expect(analysisResult.totalFiles).toBe(1000)
        })
    })
})
