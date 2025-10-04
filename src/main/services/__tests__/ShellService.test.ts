/**
 * @jest-environment node
 */

// ShellService 单元测试，验证命令执行、文件操作、进程管理等功能

import { BrowserWindow } from "electron"
import ShellService from "../ShellService"
import { CommandExecutor } from "../shell/CommandExecutor"
import { ProcessManager } from "../shell/ProcessManager"
import logger from "../../log/logger"

// Mock dependencies
jest.mock("../../log/logger", () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}))

jest.mock("@engines/luban/LubanEngine", () => ({
    LubanEngine: jest.fn().mockImplementation(() => ({
        copyFile: jest.fn(),
        moveFile: jest.fn(),
        deleteFile: jest.fn(),
        getFileInfo: jest.fn(),
    })),
}))

jest.mock("../shell/CommandExecutor", () => ({
    CommandExecutor: jest.fn().mockImplementation(() => ({
        executeCommand: jest.fn(),
        executeCommandAsync: jest.fn(),
        killProcess: jest.fn(),
        getActiveProcesses: jest.fn(),
        cleanup: jest.fn(),
    })),
}))

jest.mock("../shell/ProcessManager", () => ({
    ProcessManager: jest.fn().mockImplementation(() => ({
        getProcessList: jest.fn(),
        getProcessInfo: jest.fn(),
        killProcess: jest.fn(),
        isProcessRunning: jest.fn(),
        getSystemResources: jest.fn(),
    })),
}))

const mockSecurityValidator = {
    validateCommand: jest.fn(),
    validatePath: jest.fn(),
    validateFileOperation: jest.fn(),
    logSecurityEvent: jest.fn(),
}

jest.mock("../shell/SecurityValidator", () => ({
    SecurityValidator: mockSecurityValidator,
}))

describe("ShellService", () => {
    let shellService: ShellService
    let mockMainWindow: BrowserWindow
    let mockCommandExecutor: jest.Mocked<CommandExecutor>
    let mockProcessManager: jest.Mocked<ProcessManager>

    beforeEach(() => {
        jest.clearAllMocks()

        // Create mock BrowserWindow
        mockMainWindow = {
            isDestroyed: jest.fn().mockReturnValue(false),
            webContents: {
                send: jest.fn(),
            },
        } as unknown as BrowserWindow

        shellService = new ShellService(mockMainWindow)

        // Get mocked instances
        mockCommandExecutor = (shellService as any).commandExecutor
        mockProcessManager = (shellService as any).processManager
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe("服务初始化", () => {
        it("应该正确初始化服务", async () => {
            await shellService.initialize()
            expect(logger.info).toHaveBeenCalledWith(
                "ShellService initialized with command execution and process management"
            )
        })

        it("应该正确清理服务", async () => {
            await shellService.cleanup()
            expect(logger.info).toHaveBeenCalledWith("ShellService cleaning up")
            expect(mockCommandExecutor.cleanup).toHaveBeenCalled()
        })

        it("应该返回正确的元数据", () => {
            const metadata = shellService.getMetadata()
            expect(metadata.name).toBe("ShellService")
            expect(metadata.version).toBe("1.0.0")
            expect(metadata.ipcChannels).toHaveLength(10)
        })
    })

    describe("命令执行", () => {
        it("应该执行同步命令", async () => {
            const mockResult = {
                success: true,
                exitCode: 0,
                stdout: "test output",
                stderr: "",
                duration: 100,
            }
            mockCommandExecutor.executeCommand.mockResolvedValue(mockResult)

            const result = await shellService.handleExecute({} as any, "echo test")

            expect(mockCommandExecutor.executeCommand).toHaveBeenCalledWith("echo test", {})
            expect(result).toEqual(mockResult)
        })

        it("应该执行异步命令", async () => {
            const mockProcess = { pid: 12345 } as any
            const mockPromise = Promise.resolve({
                success: true,
                exitCode: 0,
                stdout: "async output",
                stderr: "",
                duration: 200,
            })
            mockCommandExecutor.executeCommandAsync.mockResolvedValue({
                process: mockProcess,
                promise: mockPromise,
            })

            const result = await shellService.handleExecuteAsync({} as any, "echo async test")

            expect(mockCommandExecutor.executeCommandAsync).toHaveBeenCalledWith(
                "echo async test",
                {},
                expect.any(Function),
                expect.any(Function)
            )
            expect(result.processId).toBe(12345)
        })
    })

    describe("文件操作", () => {
        it("应该执行复制操作", async () => {
            const mockResult = {
                success: true,
                source: "/source",
                destination: "/dest",
                bytesProcessed: 1024,
                duration: 100,
            }
            const mockLubanEngine = (shellService as any).lubanEngine
            mockLubanEngine.copyFile.mockResolvedValue(mockResult)
            mockSecurityValidator.validateFileOperation.mockReturnValue({
                safe: true,
                riskLevel: "low",
                riskDescription: "安全",
            })

            const result = await shellService.handleFileOperation({} as any, {
                operation: "copy",
                source: "/source",
                destination: "/dest",
                options: { overwrite: true },
            })

            expect(mockSecurityValidator.validateFileOperation).toHaveBeenCalledWith("copy", "/source", "/dest")
            expect(mockLubanEngine.copyFile).toHaveBeenCalledWith("/source", "/dest", {
                overwrite: true,
                preserveTimestamps: undefined,
                verifyIntegrity: undefined,
            })
            expect(result).toEqual(mockResult)
        })

        it("应该执行移动操作", async () => {
            const mockResult = {
                success: true,
                source: "/source",
                destination: "/dest",
                bytesProcessed: 1024,
                duration: 100,
            }
            const mockLubanEngine = (shellService as any).lubanEngine
            mockLubanEngine.moveFile.mockResolvedValue(mockResult)
            mockSecurityValidator.validateFileOperation.mockReturnValue({
                safe: true,
                riskLevel: "low",
                riskDescription: "安全",
            })

            const result = await shellService.handleFileOperation({} as any, {
                operation: "move",
                source: "/source",
                destination: "/dest",
            })

            expect(mockLubanEngine.moveFile).toHaveBeenCalledWith("/source", "/dest", {
                overwrite: undefined,
                preserveTimestamps: undefined,
                verifyIntegrity: undefined,
            })
            expect(result).toEqual(mockResult)
        })

        it("应该执行删除操作", async () => {
            const mockResult = {
                success: true,
                source: "/file",
                bytesProcessed: 0,
                duration: 50,
            }
            const mockLubanEngine = (shellService as any).lubanEngine
            mockLubanEngine.deleteFile.mockResolvedValue(mockResult)
            mockSecurityValidator.validateFileOperation.mockReturnValue({
                safe: true,
                riskLevel: "low",
                riskDescription: "安全",
            })

            const result = await shellService.handleFileOperation({} as any, {
                operation: "delete",
                source: "/file",
            })

            expect(mockLubanEngine.deleteFile).toHaveBeenCalledWith("/file", {
                verbose: true,
            })
            expect(result).toEqual(mockResult)
        })

        it("应该拒绝不安全的文件操作", async () => {
            mockSecurityValidator.validateFileOperation.mockReturnValue({
                safe: false,
                riskLevel: "critical",
                riskDescription: "危险操作",
            })

            await expect(
                shellService.handleFileOperation({} as any, {
                    operation: "delete",
                    source: "/etc/passwd",
                })
            ).rejects.toThrow("危险操作")
        })
    })

    describe("进程管理", () => {
        it("应该获取进程列表", async () => {
            const mockProcesses = [
                {
                    pid: 1234,
                    name: "node",
                    cpu: 10.5,
                    memory: 1024000,
                    startTime: new Date(),
                    command: "node app.js",
                    cwd: "/app",
                },
            ]
            mockProcessManager.getProcessList.mockResolvedValue(mockProcesses)

            const result = await shellService.handleProcessList({} as any)

            expect(mockProcessManager.getProcessList).toHaveBeenCalled()
            expect(result).toEqual(mockProcesses)
        })

        it("应该获取进程信息", async () => {
            const mockProcess = {
                pid: 1234,
                name: "node",
                cpu: 10.5,
                memory: 1024000,
                startTime: new Date(),
                command: "node app.js",
                cwd: "/app",
            }
            mockProcessManager.getProcessInfo.mockResolvedValue(mockProcess)

            const result = await shellService.handleProcessInfo({} as any, 1234)

            expect(mockProcessManager.getProcessInfo).toHaveBeenCalledWith(1234)
            expect(result).toEqual(mockProcess)
        })

        it("应该终止进程", async () => {
            mockProcessManager.killProcess.mockResolvedValue(true)

            const result = await shellService.handleProcessKill({} as any, 1234, "SIGTERM")

            expect(mockProcessManager.killProcess).toHaveBeenCalledWith(1234, "SIGTERM")
            expect(result).toBe(true)
        })
    })

    describe("安全验证", () => {
        it("应该验证命令安全性", async () => {
            const mockValidation = {
                safe: true,
                riskLevel: "low" as const,
                riskDescription: "安全",
            }
            mockSecurityValidator.validateCommand.mockReturnValue(mockValidation)

            const result = await shellService.handleValidateCommand({} as any, "echo test")

            expect(mockSecurityValidator.validateCommand).toHaveBeenCalledWith("echo test")
            expect(result).toEqual(mockValidation)
        })

        it("应该验证路径安全性", async () => {
            const mockValidation = {
                safe: true,
                riskLevel: "low" as const,
                riskDescription: "安全",
            }
            mockSecurityValidator.validatePath.mockReturnValue(mockValidation)

            const result = await shellService.handleValidatePath({} as any, "/tmp/test")

            expect(mockSecurityValidator.validatePath).toHaveBeenCalledWith("/tmp/test")
            expect(result).toEqual(mockValidation)
        })
    })

    describe("系统资源", () => {
        it("应该获取系统资源信息", async () => {
            const mockResources = {
                cpuUsage: 25.5,
                memoryUsage: 60.2,
                totalMemory: 8589934592,
                freeMemory: 3435973836,
            }
            mockProcessManager.getSystemResources.mockResolvedValue(mockResources)

            const result = await shellService.handleSystemResources({} as any)

            expect(mockProcessManager.getSystemResources).toHaveBeenCalled()
            expect(result).toEqual(mockResources)
        })
    })

    describe("进度跟踪", () => {
        it("应该发送进度更新", () => {
            const mockWebContents = mockMainWindow.webContents as any
            shellService.sendLoadingState(true, "测试消息")

            expect(mockWebContents.send).toHaveBeenCalledWith("service:loading", {
                service: "ShellService",
                loading: true,
                message: "测试消息",
                error: undefined,
                timestamp: expect.any(Number),
            })
        })

        it("应该处理窗口销毁状态", () => {
            const mockWebContents = mockMainWindow.webContents as any
            mockMainWindow.isDestroyed = jest.fn().mockReturnValue(true)

            shellService.sendLoadingState(true, "测试消息")

            expect(mockWebContents.send).not.toHaveBeenCalled()
        })
    })

    describe("错误处理", () => {
        it("应该处理文件操作错误", async () => {
            const mockLubanEngine = (shellService as any).lubanEngine
            mockLubanEngine.copyFile.mockRejectedValue(new Error("复制失败"))
            mockSecurityValidator.validateFileOperation.mockReturnValue({
                safe: true,
                riskLevel: "low",
                riskDescription: "安全",
            })

            await expect(
                shellService.handleFileOperation({} as any, {
                    operation: "copy",
                    source: "/source",
                    destination: "/dest",
                })
            ).rejects.toThrow("复制失败")
        })

        it("应该处理命令执行错误", async () => {
            mockCommandExecutor.executeCommand.mockRejectedValue(new Error("命令执行失败"))

            await expect(shellService.handleExecute({} as any, "invalid-command")).rejects.toThrow("命令执行失败")
        })
    })
})
