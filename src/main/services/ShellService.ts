/**
 * Shell Service 实现
 * 提供shell命令执行、文件操作、进程管理等功能
 * 基于LubanEngine进行文件操作，集成安全验证和进度跟踪
 */

import { IpcMainInvokeEvent, BrowserWindow } from "electron"
import { Service, ServiceMetadata, BaseService } from "./core/ServiceDecorator"
import { LubanEngine } from "@engines/luban/LubanEngine"
import { CommandExecutor } from "./shell/CommandExecutor"
import { ProcessManager } from "./shell/ProcessManager"
import { SecurityValidator } from "./shell/SecurityValidator"
import {
    CommandExecutionOptions,
    CommandExecutionResult,
    ProcessInfo,
    FileOperationParams,
    ShellProgress,
} from "./shell/types"
import logger from "../log/logger"

@Service({
    name: "ShellService",
    version: "1.0.0",
    description: "Shell command execution and process management service",
})
export default class ShellService implements BaseService {
    private lubanEngine: LubanEngine
    private commandExecutor: CommandExecutor
    private processManager: ProcessManager
    private mainWindow: BrowserWindow | null = null

    constructor(mainWindow?: BrowserWindow) {
        this.mainWindow = mainWindow || null
        this.lubanEngine = new LubanEngine()
        this.commandExecutor = new CommandExecutor()
        this.processManager = new ProcessManager()
    }

    async initialize(): Promise<void> {
        logger.info("ShellService initialized with command execution and process management")
    }

    async cleanup(): Promise<void> {
        logger.info("ShellService cleaning up")
        this.commandExecutor.cleanup()
    }

    setMainWindow(mainWindow: BrowserWindow): void {
        this.mainWindow = mainWindow
    }

    sendLoadingState(loading: boolean, message?: string, error?: boolean): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send("service:loading", {
                service: this.getMetadata().name,
                loading,
                message,
                error,
                timestamp: Date.now(),
            })
        }
    }

    getMetadata(): ServiceMetadata {
        return {
            name: "ShellService",
            version: "1.0.0",
            ipcChannels: [
                { channel: "shell:execute", type: "handle" },
                { channel: "shell:execute-async", type: "handle" },
                { channel: "shell:file-operation", type: "handle" },
                { channel: "shell:process-list", type: "handle" },
                { channel: "shell:process-info", type: "handle" },
                { channel: "shell:process-kill", type: "handle" },
                { channel: "shell:validate-command", type: "handle" },
                { channel: "shell:validate-path", type: "handle" },
                { channel: "shell:system-resources", type: "handle" },
                { channel: "shell:progress", type: "on" },
            ],
            description: "Shell command execution and process management service",
        }
    }

    /**
     * 执行shell命令（同步）
     */
    async handleExecute(
        _event: IpcMainInvokeEvent,
        command: string,
        options: CommandExecutionOptions = {}
    ): Promise<CommandExecutionResult> {
        this.sendProgress({
            operation: "command",
            currentStep: "验证命令安全性",
            percentage: 10,
            processed: 0,
            total: 1,
            startTime: Date.now(),
            estimatedTimeRemaining: 0,
        })

        const result = await this.commandExecutor.executeCommand(command, options)

        this.sendProgress({
            operation: "command",
            currentStep: "命令执行完成",
            percentage: 100,
            processed: 1,
            total: 1,
            startTime: Date.now(),
            estimatedTimeRemaining: 0,
        })

        return result
    }

    /**
     * 执行shell命令（异步）
     */
    async handleExecuteAsync(
        _event: IpcMainInvokeEvent,
        command: string,
        options: CommandExecutionOptions = {}
    ): Promise<{ processId: number; promise: Promise<CommandExecutionResult> }> {
        this.sendProgress({
            operation: "command",
            currentStep: "启动异步命令执行",
            percentage: 5,
            processed: 0,
            total: 1,
            startTime: Date.now(),
            estimatedTimeRemaining: 0,
        })

        const { process, promise } = await this.commandExecutor.executeCommandAsync(
            command,
            options,
            data => {
                // 发送标准输出
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send("shell:output", {
                        type: "stdout",
                        data,
                        timestamp: Date.now(),
                    })
                }
            },
            data => {
                // 发送标准错误
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send("shell:output", {
                        type: "stderr",
                        data,
                        timestamp: Date.now(),
                    })
                }
            }
        )

        return {
            processId: process.pid || 0,
            promise,
        }
    }

    /**
     * 执行文件操作
     */
    async handleFileOperation(_event: IpcMainInvokeEvent, params: FileOperationParams): Promise<unknown> {
        this.sendProgress({
            operation: "file-operation",
            currentStep: `执行${params.operation}操作`,
            percentage: 10,
            processed: 0,
            total: 1,
            startTime: Date.now(),
            estimatedTimeRemaining: 0,
        })

        // 安全验证
        const securityResult = SecurityValidator.validateFileOperation(
            params.operation,
            params.source,
            params.destination
        )
        SecurityValidator.logSecurityEvent("file-operation", `${params.operation}:${params.source}`, securityResult)

        if (!securityResult.safe) {
            throw new Error(securityResult.riskDescription)
        }

        let result: unknown

        try {
            switch (params.operation) {
                case "copy":
                    if (!params.destination) {
                        throw new Error("复制操作需要目标路径")
                    }
                    result = await this.lubanEngine.copyFile(params.source, params.destination, {
                        overwrite: params.options?.overwrite,
                        preserveTimestamps: params.options?.preserveTimestamps,
                        verifyIntegrity: params.options?.verifyIntegrity,
                    })
                    break

                case "move":
                    if (!params.destination) {
                        throw new Error("移动操作需要目标路径")
                    }
                    result = await this.lubanEngine.moveFile(params.source, params.destination, {
                        overwrite: params.options?.overwrite,
                        preserveTimestamps: params.options?.preserveTimestamps,
                        verifyIntegrity: params.options?.verifyIntegrity,
                    })
                    break

                case "delete":
                    result = await this.lubanEngine.deleteFile(params.source, {
                        verbose: true,
                    })
                    break

                case "create":
                    if (!params.destination) {
                        throw new Error("创建操作需要目标路径")
                    }
                    // 使用LubanEngine的底层功能创建文件
                    result = await this.lubanEngine.getFileInfo(params.destination)
                    break

                case "list":
                    result = await this.lubanEngine.getFileInfo(params.source)
                    break

                default:
                    throw new Error(`不支持的操作类型: ${params.operation}`)
            }

            this.sendProgress({
                operation: "file-operation",
                currentStep: `${params.operation}操作完成`,
                percentage: 100,
                processed: 1,
                total: 1,
                startTime: Date.now(),
                estimatedTimeRemaining: 0,
            })

            return result
        } catch (error) {
            logger.error(`文件操作失败: ${params.operation}`, {
                source: params.source,
                destination: params.destination,
                error,
            })
            throw error
        }
    }

    /**
     * 获取进程列表
     */
    async handleProcessList(_event: IpcMainInvokeEvent): Promise<ProcessInfo[]> {
        this.sendProgress({
            operation: "process-management",
            currentStep: "获取进程列表",
            percentage: 50,
            processed: 0,
            total: 1,
            startTime: Date.now(),
            estimatedTimeRemaining: 0,
        })

        const processes = await this.processManager.getProcessList()

        this.sendProgress({
            operation: "process-management",
            currentStep: "进程列表获取完成",
            percentage: 100,
            processed: 1,
            total: 1,
            startTime: Date.now(),
            estimatedTimeRemaining: 0,
        })

        return processes
    }

    /**
     * 获取进程信息
     */
    async handleProcessInfo(_event: IpcMainInvokeEvent, pid: number): Promise<ProcessInfo | null> {
        return await this.processManager.getProcessInfo(pid)
    }

    /**
     * 终止进程
     */
    async handleProcessKill(_event: IpcMainInvokeEvent, pid: number, signal?: string): Promise<boolean> {
        return await this.processManager.killProcess(pid, signal)
    }

    /**
     * 验证命令安全性
     */
    async handleValidateCommand(_event: IpcMainInvokeEvent, command: string): Promise<unknown> {
        return SecurityValidator.validateCommand(command)
    }

    /**
     * 验证路径安全性
     */
    async handleValidatePath(_event: IpcMainInvokeEvent, path: string): Promise<unknown> {
        return SecurityValidator.validatePath(path)
    }

    /**
     * 获取系统资源信息
     */
    async handleSystemResources(_event: IpcMainInvokeEvent): Promise<unknown> {
        return await this.processManager.getSystemResources()
    }

    /**
     * 发送进度更新
     */
    private sendProgress(progress: ShellProgress): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send("shell:progress", progress)
        }
    }
}
