/**
 * 孔子引擎管理器 - 负责协调和管理所有文件引擎
 *
 * 孔子思想核心：
 * - 有教无类：统一管理所有引擎
 * - 因材施教：根据任务特点选择合适的引擎
 * - 循序渐进：按优先级和依赖关系安排任务
 * - 学而时习：定期监控改进
 */

import type { Logger } from "@engine-shared/loggerTypes"
import logger from "../../../log/logger"

export interface BaseEngine {
    name: string
    version: string
    capabilities: EngineCapability[]
    initialize(): Promise<void>
    cleanup(): Promise<void>
    executeTask(task: EngineTask): Promise<EngineResult>
    getStatus(): EngineStatus
}

export interface EngineCapability {
    type: "file_operation" | "sync" | "comparison" | "version_control"
    operations: string[]
    constraints?: {
        maxFileSize?: number
        supportedFormats?: string[]
        performance?: "high" | "medium" | "low"
    }
}

export interface EngineTask {
    id: string
    type: "copy" | "move" | "delete" | "sync" | "compare" | "commit"
    priority: number
    source?: string
    destination?: string
    options?: Record<string, unknown>
    progressCallback?: (progress: TaskProgress) => void
}

export interface EngineResult {
    success: boolean
    taskId: string
    data?: unknown
    error?: string
    metrics?: {
        duration: number
        bytesProcessed?: number
        filesProcessed?: number
    }
}

export interface EngineStatus {
    running: boolean
    activeTasks: number
    queueSize: number
    errorCount: number
    lastActivity: Date
}

export interface TaskProgress {
    taskId: string
    percentage: number
    currentFile?: string
    totalFiles?: number
    processedFiles?: number
    bytesTransferred?: number
    totalBytes?: number
    speed?: number
    eta?: number
    message?: string
}

export interface KongziEngineManagerDeps {
    logger: Logger
}

/**
 * 孔子引擎管理器
 *
 * 核心哲学：
 * - 有教无类：统一接口管理所有引擎
 * - 因材施教：智能选择最适合的引擎
 * - 循序渐进：合理安排任务执行顺序
 * - 学而时习：定期监控改进
 */
export class KongziEngineManager {
    private readonly engines = new Map<string, BaseEngine>()
    private readonly deps: KongziEngineManagerDeps

    constructor(deps: KongziEngineManagerDeps = { logger }) {
        this.deps = deps
    }

    /**
     * 注册引擎
     */
    registerEngine(engine: BaseEngine): void {
        this.engines.set(engine.name, engine)
        this.deps.logger.info(`引擎已注册: ${engine.name} v${engine.version}`)
    }

    /**
     * 移除引擎
     */
    unregisterEngine(name: string): void {
        const engine = this.engines.get(name)
        if (engine) {
            this.engines.delete(name)
            this.deps.logger.info(`引擎已移除: ${name}`)
        }
    }

    /**
     * 获取所有引擎
     */
    getEngines(): BaseEngine[] {
        return Array.from(this.engines.values())
    }

    /**
     * 根据任务选择最适合的引擎
     */
    selectEngine(task: EngineTask): BaseEngine | null {
        const candidates = this.getEngines().filter(engine =>
            engine.capabilities.some(cap =>
                cap.type === this.mapTaskToCapability(task.type)
            )
        )

        if (candidates.length === 0) {
            return null
        }

        // 选择第一个匹配的引擎（可以增加更复杂的选择逻辑）
        return candidates[0]
    }

    /**
     * 执行任务
     */
    async executeTask(task: EngineTask): Promise<EngineResult> {
        const engine = this.selectEngine(task)
        if (!engine) {
            return {
                success: false,
                taskId: task.id,
                error: `没有找到支持 ${task.type} 操作的引擎`
            }
        }

        this.deps.logger.info(`任务 ${task.id} 分配给引擎 ${engine.name}`)

        try {
            return await engine.executeTask(task)
        } catch (error) {
            this.deps.logger.error(`引擎 ${engine.name} 执行任务失败`, {
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error)
            })

            return {
                success: false,
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error)
            }
        }
    }

    /**
     * 初始化所有引擎
     */
    async initializeAll(): Promise<void> {
        for (const engine of this.engines.values()) {
            try {
                await engine.initialize()
                this.deps.logger.info(`引擎 ${engine.name} 初始化成功`)
            } catch (error) {
                this.deps.logger.error(`引擎 ${engine.name} 初始化失败`, {
                    error: error instanceof Error ? error.message : String(error)
                })
            }
        }
    }

    /**
     * 清理所有引擎
     */
    async cleanupAll(): Promise<void> {
        for (const engine of this.engines.values()) {
            try {
                await engine.cleanup()
                this.deps.logger.info(`引擎 ${engine.name} 清理完成`)
            } catch (error) {
                this.deps.logger.error(`引擎 ${engine.name} 清理失败`, {
                    error: error instanceof Error ? error.message : String(error)
                })
            }
        }
    }

    private mapTaskToCapability(taskType: string): EngineCapability["type"] {
        switch (taskType) {
            case "copy":
            case "move":
            case "delete":
                return "file_operation"
            case "sync":
                return "sync"
            case "compare":
                return "comparison"
            case "commit":
                return "version_control"
            default:
                return "file_operation"
        }
    }
}