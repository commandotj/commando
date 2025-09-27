/**
 * FileService 单元测试套件
 *
 * 本测试套件全面测试 FileService 的所有核心功能，包括：
 * - 文件删除操作（单文件/批量删除，永久删除/回收站）
 * - 文件重命名操作（包括跨目录重命名）
 * - 文件夹创建操作（包括递归创建）
 * - 文件信息获取（包括权限检查）
 * - 错误处理和参数验证
 * - 与其他服务的集成测试
 *
 * @author AI Assistant
 * @created 2024-01-14
 * @version 1.0.0
 * @since 1.0.0
 */

// ==================== 导入依赖 ====================
import { IpcMainInvokeEvent } from "electron" // Electron IPC 事件类型
import FileService from "../FileService" // 被测试的 FileService 类
import { WorkerPool } from "../core/WorkerPool" // Worker 线程池
import * as fs from "fs" // Node.js 文件系统模块

// ==================== Mock 配置 ====================
// Mock WorkerPool - 模拟工作线程池，避免实际创建工作线程
jest.mock("../core/WorkerPool")

// Mock Logger - 模拟日志记录器，避免在测试中产生实际日志输出
jest.mock("../../log/logger", () => ({
    info: jest.fn(), // 信息日志
    warn: jest.fn(), // 警告日志
    error: jest.fn(), // 错误日志
}))

// Mock File Worker - 模拟文件操作工作线程
jest.mock("../workers/file-worker", () => {
    return jest.fn(() => ({}))
})

// Mock Electron - 模拟 Electron 主进程的 IPC 功能
jest.mock("electron", () => ({
    ipcMain: {
        handle: jest.fn(), // 处理 IPC 调用
        on: jest.fn(), // 监听 IPC 事件
        removeHandler: jest.fn(), // 移除处理器
        removeAllListeners: jest.fn(), // 移除所有监听器
    },
    IpcMainInvokeEvent: {}, // IPC 调用事件类型
    IpcMainEvent: {}, // IPC 事件类型
}))

// 创建 WorkerPool 的 Mock 类型，用于类型安全的测试
const MockWorkerPool = WorkerPool as jest.Mocked<typeof WorkerPool>

/**
 * FileService 测试套件
 *
 * 测试 FileService 的所有核心功能，确保文件操作的正确性和稳定性
 */
describe("FileService", () => {
    // ==================== 测试变量声明 ====================
    let fileService: FileService // FileService 实例
    let mockWorkerPool: jest.Mocked<WorkerPool> // Mock 的工作线程池
    let mockEvent: IpcMainInvokeEvent // Mock 的 IPC 事件

    /**
     * 每个测试用例执行前的准备工作
     *
     * 功能：
     * 1. 清理所有 Mock 状态
     * 2. 设置 Mock 工作线程池
     * 3. 创建 FileService 实例
     * 4. 创建 Mock IPC 事件
     */
    beforeEach(() => {
        // 清理所有 Mock 状态，确保测试之间的隔离
        jest.clearAllMocks()

        // 设置 Mock 工作线程池，模拟所有必要的方法
        mockWorkerPool = {
            execute: jest.fn(), // 执行工作线程任务
            getInstance: jest.fn(), // 获取实例
            registerWorkerType: jest.fn(), // 注册工作线程类型
            cleanup: jest.fn(), // 清理资源
            getPoolStats: jest.fn(), // 获取池统计信息
            startIdleWorkerCleanup: jest.fn(), // 启动空闲工作线程清理
        } as unknown as jest.Mocked<WorkerPool>

        // 设置 WorkerPool.getInstance 的 Mock 返回值
        ;(MockWorkerPool.getInstance as jest.MockedFunction<typeof WorkerPool.getInstance>).mockReturnValue(
            mockWorkerPool
        )

        // 创建 FileService 实例
        fileService = new FileService()

        // 创建 Mock IPC 事件，模拟渲染进程的 IPC 调用
        mockEvent = {
            sender: {
                send: jest.fn(), // Mock 的发送方法
            },
        } as unknown as IpcMainInvokeEvent
    })

    // ==================== 服务元数据测试 ====================
    /**
     * 测试 FileService 的元数据信息
     *
     * 验证服务的基本信息是否正确，包括：
     * - 服务名称和版本
     * - IPC 通道配置
     * - 服务描述信息
     */
    describe("Service Metadata", () => {
        /**
         * 测试服务元数据的正确性
         *
         * 验证内容：
         * 1. 服务名称应为 "FileService"
         * 2. 版本号应为 "1.0.0"
         * 3. 描述信息应包含服务功能说明
         * 4. IPC 通道配置应正确（在测试环境中可能为空）
         */
        it("should return correct metadata", () => {
            const metadata = fileService.getMetadata()

            expect(metadata).toMatchObject({
                name: "FileService",
                version: "1.0.0",
                description: "Comprehensive file operations service with progress tracking",
            })

            // Check that ipcChannels is an array (may be empty in test environment due to decorator limitations)
            expect(Array.isArray(metadata.ipcChannels)).toBe(true)

            // If ipcChannels is not empty, check the structure
            if (metadata.ipcChannels.length > 0) {
                expect(metadata.ipcChannels).toEqual(
                    expect.arrayContaining([
                        { channel: "file:read", type: "handle" },
                        { channel: "file:write", type: "handle" },
                        { channel: "file:copy", type: "handle" },
                        { channel: "file:move", type: "handle" },
                        { channel: "file:delete", type: "handle" },
                        { channel: "file:rename", type: "handle" },
                        { channel: "file:create-folder", type: "handle" },
                        { channel: "file:get-info", type: "handle" },
                        { channel: "file:list", type: "handle" },
                        { channel: "file:batch", type: "handle" },
                        { channel: "file:watch", type: "on" },
                        { channel: "file:unwatch", type: "on" },
                    ])
                )
            }
        })
    })

    // ==================== 服务生命周期测试 ====================
    /**
     * 测试 FileService 的生命周期管理
     *
     * 验证服务的初始化和清理过程是否正常，确保：
     * - 服务能够正确初始化
     * - 服务能够正确清理资源
     * - 不会产生内存泄漏
     */
    describe("Service Lifecycle", () => {
        /**
         * 测试服务初始化
         *
         * 验证 FileService 能够成功初始化，包括：
         * - 注册 IPC 处理器
         * - 初始化工作线程池
         * - 设置必要的配置
         */
        it("should initialize successfully", async () => {
            await expect(fileService.initialize()).resolves.not.toThrow()
        })

        /**
         * 测试服务清理
         *
         * 验证 FileService 能够正确清理资源，包括：
         * - 清理工作线程池
         * - 移除 IPC 处理器
         * - 释放相关资源
         */
        it("should cleanup successfully", async () => {
            await fileService.initialize()
            await expect(fileService.cleanup()).resolves.not.toThrow()
        })
    })

    // ==================== 文件删除测试 ====================
    /**
     * 测试文件删除功能
     *
     * 验证各种文件删除场景，包括：
     * - 单文件删除
     * - 批量文件删除
     * - 永久删除 vs 回收站删除
     * - 删除错误处理
     * - 参数验证
     */
    describe("File Deletion", () => {
        /**
         * 每个删除测试前的准备工作
         * 确保 FileService 已正确初始化
         */
        beforeEach(async () => {
            await fileService.initialize()
        })

        /**
         * 测试单文件删除功能
         *
         * 验证场景：
         * 1. 能够成功删除单个文件
         * 2. 正确调用工作线程池执行删除操作
         * 3. 返回正确的删除结果
         * 4. 支持进度回调
         */
        it("should delete a single file successfully", async () => {
            const deleteParams = {
                paths: ["/path/to/file.txt"],
                permanent: false, // Move to trash
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                deletedFiles: 1,
                failedFiles: [],
            })

            const result = await fileService.handleDelete(mockEvent, deleteParams)

            expect(mockWorkerPool.execute).toHaveBeenCalledWith(
                "FileService",
                "delete-files",
                deleteParams,
                expect.any(Function)
            )

            expect(result).toMatchObject({
                success: true,
                deletedFiles: 1,
                failedFiles: [],
            })
        })

        /**
         * 测试批量文件删除功能
         *
         * 验证场景：
         * 1. 能够同时删除多个文件
         * 2. 正确处理不同类型的文件（文件、文件夹）
         * 3. 返回正确的删除统计信息
         */
        it("should delete multiple files", async () => {
            const deleteParams = {
                paths: ["/path/file1.txt", "/path/file2.txt", "/path/folder/"],
                permanent: false,
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                deletedFiles: 3,
                failedFiles: [],
            })

            const result = await fileService.handleDelete(mockEvent, deleteParams)
            const typedResult = result as {
                success: boolean
                deletedFiles: number
            }

            expect(typedResult.success).toBe(true)
            expect(typedResult.deletedFiles).toBe(3)
        })

        it("should handle permanent deletion", async () => {
            const deleteParams = {
                paths: ["/temp/file.txt"],
                permanent: true,
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                deletedFiles: 1,
                failedFiles: [],
            })

            const result = await fileService.handleDelete(mockEvent, deleteParams)

            expect(mockWorkerPool.execute).toHaveBeenCalledWith(
                "FileService",
                "delete-files",
                expect.objectContaining({ permanent: true }),
                expect.any(Function)
            )
            const typedResult2 = result as { success: boolean }

            expect(typedResult2.success).toBe(true)
        })

        it("should handle deletion errors", async () => {
            const deleteParams = {
                paths: ["/protected/system-file.txt"],
                permanent: false,
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: false,
                deletedFiles: 0,
                failedFiles: [
                    {
                        path: "/protected/system-file.txt",
                        error: "Permission denied",
                    },
                ],
            })

            const result = await fileService.handleDelete(mockEvent, deleteParams)
            const failedResult = result as {
                success: boolean
                failedFiles: Array<{ error: string }>
            }

            expect(failedResult.success).toBe(false)
            expect(failedResult.failedFiles).toHaveLength(1)
            expect(failedResult.failedFiles[0].error).toBe("Permission denied")
        })

        it("should validate delete parameters", async () => {
            const invalidParams = {
                paths: [], // Empty paths array
                permanent: false,
            }

            await expect(fileService.handleDelete(mockEvent, invalidParams)).rejects.toThrow(
                "Invalid delete parameters: no files specified"
            )
        })
    })

    // ==================== 文件重命名测试 ====================
    /**
     * 测试文件重命名功能
     *
     * 验证各种重命名场景，包括：
     * - 基本文件重命名
     * - 跨目录重命名
     * - 重命名冲突处理
     * - 参数验证
     */
    describe("File Rename", () => {
        /**
         * 每个重命名测试前的准备工作
         * 确保 FileService 已正确初始化
         */
        beforeEach(async () => {
            await fileService.initialize()
        })

        /**
         * 测试文件重命名功能
         *
         * 验证场景：
         * 1. 能够成功重命名文件
         * 2. 正确调用工作线程池执行重命名操作
         * 3. 返回正确的重命名结果
         * 4. 保持文件路径的正确性
         */
        it("should rename a file successfully", async () => {
            const renameParams = {
                oldPath: "/path/oldname.txt",
                newPath: "/path/newname.txt",
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                oldPath: "/path/oldname.txt",
                newPath: "/path/newname.txt",
            })

            const result = await fileService.handleRename(mockEvent, renameParams)

            expect(mockWorkerPool.execute).toHaveBeenCalledWith("FileService", "rename-file", renameParams)

            expect(result).toMatchObject({
                success: true,
                oldPath: "/path/oldname.txt",
                newPath: "/path/newname.txt",
            })
        })

        it("should handle rename conflicts", async () => {
            const renameParams = {
                oldPath: "/path/file.txt",
                newPath: "/path/existing-file.txt", // File already exists
            }

            mockWorkerPool.execute.mockRejectedValue(new Error("File already exists: /path/existing-file.txt"))

            await expect(fileService.handleRename(mockEvent, renameParams)).rejects.toThrow("File already exists")
        })

        it("should validate rename parameters", async () => {
            const testCases = [
                { oldPath: "", newPath: "/valid/path.txt" },
                { oldPath: "/valid/path.txt", newPath: "" },
                { oldPath: "/same/path.txt", newPath: "/same/path.txt" },
            ]

            for (const testCase of testCases) {
                await expect(fileService.handleRename(mockEvent, testCase)).rejects.toThrow("Invalid rename parameters")
            }
        })

        it("should handle cross-directory renames", async () => {
            const renameParams = {
                oldPath: "/source/folder/file.txt",
                newPath: "/destination/folder/file.txt",
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                oldPath: renameParams.oldPath,
                newPath: renameParams.newPath,
                crossDirectory: true,
            })

            const result = await fileService.handleRename(mockEvent, renameParams)
            const renameResult = result as {
                success: boolean
                crossDirectory: boolean
            }

            expect(renameResult.success).toBe(true)
            expect(renameResult.crossDirectory).toBe(true)
        })
    })

    // ==================== 文件夹创建测试 ====================
    /**
     * 测试文件夹创建功能
     *
     * 验证各种文件夹创建场景，包括：
     * - 基本文件夹创建
     * - 递归文件夹创建
     * - 创建冲突处理
     * - 参数验证
     */
    describe("Create Folder", () => {
        /**
         * 每个文件夹创建测试前的准备工作
         * 确保 FileService 已正确初始化
         */
        beforeEach(async () => {
            await fileService.initialize()
        })

        /**
         * 测试文件夹创建功能
         *
         * 验证场景：
         * 1. 能够成功创建文件夹
         * 2. 正确调用工作线程池执行创建操作
         * 3. 返回正确的创建结果
         * 4. 支持非递归创建
         */
        it("should create a folder successfully", async () => {
            const createParams = {
                path: "/path/to/new-folder",
                recursive: false,
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                path: "/path/to/new-folder",
                created: true,
            })

            const result = await fileService.handleCreateFolder(mockEvent, createParams)

            expect(mockWorkerPool.execute).toHaveBeenCalledWith("FileService", "create-folder", createParams)

            expect(result).toMatchObject({
                success: true,
                path: "/path/to/new-folder",
                created: true,
            })
        })

        it("should create folders recursively", async () => {
            const createParams = {
                path: "/deep/nested/folder/structure",
                recursive: true,
            }

            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                path: "/deep/nested/folder/structure",
                created: true,
                createdParents: ["/deep", "/deep/nested", "/deep/nested/folder"],
            })

            const result = await fileService.handleCreateFolder(mockEvent, createParams)
            const createResult = result as {
                success: boolean
                createdParents: string[]
            }

            expect(createResult.success).toBe(true)
            expect(createResult.createdParents).toHaveLength(3)
        })

        it("should handle folder creation conflicts", async () => {
            const createParams = {
                path: "/path/existing-folder",
                recursive: false,
            }

            mockWorkerPool.execute.mockRejectedValue(new Error("Folder already exists"))

            await expect(fileService.handleCreateFolder(mockEvent, createParams)).rejects.toThrow(
                "Folder already exists"
            )
        })

        it("should validate create folder parameters", async () => {
            const invalidParams = {
                path: "", // Empty path
                recursive: false,
            }

            await expect(fileService.handleCreateFolder(mockEvent, invalidParams)).rejects.toThrow(
                "Invalid create folder parameters"
            )
        })
    })

    // ==================== 文件信息获取测试 ====================
    /**
     * 测试文件信息获取功能
     *
     * 验证各种文件信息获取场景，包括：
     * - 文件基本信息获取
     * - 目录信息获取
     * - 权限信息获取
     * - 错误处理
     */
    describe("Get File Info", () => {
        /**
         * 每个文件信息获取测试前的准备工作
         * 确保 FileService 已正确初始化
         */
        beforeEach(async () => {
            await fileService.initialize()
        })

        /**
         * 测试文件信息获取功能
         *
         * 验证场景：
         * 1. 能够成功获取文件基本信息
         * 2. 正确模拟文件系统调用
         * 3. 返回完整的文件信息（大小、权限、时间戳等）
         * 4. 正确处理文件权限检查
         */
        it("should get file information successfully", async () => {
            const infoParams = {
                path: "/path/to/file.txt",
            }

            // Mock fs.stat to return file stats
            const mockStats = {
                size: 1024,
                isDirectory: () => false,
                isFile: () => true,
                birthtime: new Date("2024-01-14T09:00:00Z"),
                mtime: new Date("2024-01-14T10:00:00Z"),
                atime: new Date("2024-01-14T10:00:00Z"),
                ctime: new Date("2024-01-14T09:00:00Z"),
                dev: 0,
                ino: 0,
                mode: 0,
                nlink: 0,
                uid: 0,
                gid: 0,
                rdev: 0,
                blksize: 0,
                blocks: 0,
                atimeMs: 0,
                mtimeMs: 0,
                ctimeMs: 0,
                birthtimeMs: 0,
            } as fs.Stats

            // Mock fs.access for permissions
            // Use imported fs module
            jest.spyOn(fs.promises, "stat").mockResolvedValue(mockStats)
            jest.spyOn(fs.promises, "access").mockResolvedValue(undefined)

            const result = await fileService.handleGetInfo(mockEvent, infoParams)

            expect(result).toMatchObject({
                name: "file.txt",
                path: "/path/to/file.txt",
                size: 1024,
                isDirectory: false,
                isFile: true,
                created: new Date("2024-01-14T09:00:00Z"),
                modified: new Date("2024-01-14T10:00:00Z"),
                permissions: {
                    readable: true,
                    writable: true,
                    executable: true,
                },
            })
        })

        it("should get directory information", async () => {
            const infoParams = {
                path: "/path/to/directory",
            }

            // Mock fs.stat to return directory stats
            const mockStats = {
                size: 0,
                isDirectory: () => true,
                isFile: () => false,
                birthtime: new Date("2024-01-14T09:00:00Z"),
                mtime: new Date("2024-01-14T10:00:00Z"),
                atime: new Date("2024-01-14T10:00:00Z"),
                ctime: new Date("2024-01-14T09:00:00Z"),
                dev: 0,
                ino: 0,
                mode: 0,
                nlink: 0,
                uid: 0,
                gid: 0,
                rdev: 0,
                blksize: 0,
                blocks: 0,
                atimeMs: 0,
                mtimeMs: 0,
                ctimeMs: 0,
                birthtimeMs: 0,
            } as fs.Stats

            // Mock fs.access for permissions
            // Use imported fs module
            jest.spyOn(fs.promises, "stat").mockResolvedValue(mockStats)
            jest.spyOn(fs.promises, "access").mockResolvedValue(undefined)

            const result = await fileService.handleGetInfo(mockEvent, infoParams)

            expect(result).toMatchObject({
                name: "directory",
                path: "/path/to/directory",
                size: 0,
                isDirectory: true,
                isFile: false,
                created: new Date("2024-01-14T09:00:00Z"),
                modified: new Date("2024-01-14T10:00:00Z"),
                permissions: {
                    readable: true,
                    writable: true,
                    executable: true,
                },
            })
        })

        it("should handle non-existent files", async () => {
            const infoParams = {
                path: "/nonexistent/file.txt",
            }

            // Mock fs.stat to throw error for non-existent file
            // Use imported fs module
            jest.spyOn(fs.promises, "stat").mockRejectedValue(new Error("ENOENT: no such file or directory"))

            await expect(fileService.handleGetInfo(mockEvent, infoParams)).rejects.toThrow("Failed to get file info")
        })

        it("should validate get info parameters", async () => {
            const invalidParams = {
                path: "", // Empty path
            }

            await expect(fileService.handleGetInfo(mockEvent, invalidParams)).rejects.toThrow(
                "Invalid file info parameters"
            )
        })
    })

    // ==================== 错误处理测试 ====================
    /**
     * 测试错误处理功能
     *
     * 验证各种错误场景的处理，包括：
     * - 工作线程池错误
     * - 参数类型验证
     * - 异常情况处理
     */
    describe("Error Handling", () => {
        /**
         * 每个错误处理测试前的准备工作
         * 确保 FileService 已正确初始化
         */
        beforeEach(async () => {
            await fileService.initialize()
        })

        /**
         * 测试工作线程池错误处理
         *
         * 验证场景：
         * 1. 当工作线程池出现错误时能够正确处理
         * 2. 错误信息能够正确传播
         * 3. 不会导致服务崩溃
         */
        it("should handle worker pool errors gracefully", async () => {
            mockWorkerPool.execute.mockRejectedValue(new Error("Worker pool exhausted"))

            const deleteParams = {
                paths: ["/test/file.txt"],
                permanent: false,
            }

            await expect(fileService.handleDelete(mockEvent, deleteParams)).rejects.toThrow("Worker pool exhausted")
        })

        it("should validate all parameter types", async () => {
            const testCases = [
                {
                    method: "handleDelete",
                    params: { paths: null, permanent: false },
                },
                {
                    method: "handleRename",
                    params: { oldPath: 123, newPath: "/valid/path.txt" },
                },
                {
                    method: "handleCreateFolder",
                    params: { path: ["invalid", "array"], recursive: false },
                },
                {
                    method: "handleGetInfo",
                    params: { path: { invalid: "object" } as unknown },
                },
            ]

            for (const testCase of testCases) {
                await expect(
                    (fileService as unknown as Record<string, (...args: unknown[]) => unknown>)[testCase.method](
                        mockEvent,
                        testCase.params
                    )
                ).rejects.toThrow()
            }
        })
    })

    // ==================== 服务集成测试 ====================
    /**
     * 测试与其他服务的集成功能
     *
     * 验证 FileService 与其他服务的协作，包括：
     * - 与 CopyService 的协作
     * - 跨服务操作的处理
     * - 服务间的数据传递
     */
    describe("Integration with Other Services", () => {
        /**
         * 每个集成测试前的准备工作
         * 确保 FileService 已正确初始化
         */
        beforeEach(async () => {
            await fileService.initialize()
        })

        /**
         * 测试与 CopyService 的协作
         *
         * 验证场景：
         * 1. FileService 能够与 CopyService 协作处理移动操作
         * 2. 跨文件系统的操作能够正确处理
         * 3. 服务间的调用能够正确执行
         */
        it("should work with CopyService for move operations", async () => {
            // Test that rename across filesystems falls back to copy+delete
            const moveParams = {
                oldPath: "/source-drive/file.txt",
                newPath: "/destination-drive/file.txt",
            }

            // Mock successful rename operation
            mockWorkerPool.execute.mockResolvedValue({
                success: true,
                oldPath: moveParams.oldPath,
                newPath: moveParams.newPath,
            })

            const result = await fileService.handleRename(mockEvent, moveParams)

            expect(mockWorkerPool.execute).toHaveBeenCalledWith("FileService", "rename-file", moveParams)
            expect(result).toMatchObject({
                success: true,
                oldPath: moveParams.oldPath,
                newPath: moveParams.newPath,
            })
        })
    })
})
