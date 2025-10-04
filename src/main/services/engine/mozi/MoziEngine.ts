/**
 * 墨子引擎 - 专注于同步操作
 *
 * 墨子思想：
 * - 兼爱非攻：无差别同步所有文件
 * - 节用尚贤：高效节约的同步策略
 * - 天志明鬼：记录所有同步过程和状态
 */

import type { BaseEngine, EngineCapability, EngineTask, EngineResult, EngineStatus, TaskProgress } from "../kongzi/KongziEngineManager"
import type { Logger } from "../shared/loggerTypes"
import logger from "../../../log/logger"
import * as gracefulFs from "graceful-fs"
import path from "path"

export interface MoziEngineDeps {
    logger: Logger
    fs: typeof gracefulFs.promises
}

export interface SyncTaskConfig {
    dryRun?: boolean
    deleteExtraneous?: boolean
    preserveTimestamps?: boolean
    excludePatterns?: string[]
    maxConcurrency?: number
}

export interface SyncItem {
    relativePath: string
    sourcePath: string
    targetPath: string
    sourceStats?: gracefulFs.Stats
    targetStats?: gracefulFs.Stats
    action: "copy" | "update" | "delete" | "skip"
    reason?: string
}

export interface SyncResult {
    success: boolean
    itemsProcessed: number
    itemsSkipped: number
    itemsErrored: number
    bytesTransferred: number
    duration: number
    errors?: Array<{ path: string; error: string }>
}

/**
 * 墨子同步引擎
 *
 * 实现理念：
 * - 兼爱：不区分文件类型，统一处理
 * - 节用：最小化不必要的操作
 * - 尚贤：智能同步策略
 */
export class MoziEngine implements BaseEngine {
    name = "MoziEngine"
    version = "1.0.0"

    capabilities: EngineCapability[] = [
        {
            type: "sync",
            operations: ["sync", "mirror", "backup"],
            constraints: {
                performance: "high"
            }
        }
    ]

    private readonly deps: MoziEngineDeps
    private running = false
    private activeTasks = 0

    constructor(deps: MoziEngineDeps = { logger, fs: gracefulFs.promises }) {
        this.deps = deps
    }

    async initialize(): Promise<void> {
        this.deps.logger.info("墨子同步引擎初始化完成")
    }

    async cleanup(): Promise<void> {
        this.deps.logger.info("墨子同步引擎清理完成")
    }

    getStatus(): EngineStatus {
        return {
            running: this.running,
            activeTasks: this.activeTasks,
            queueSize: 0,
            errorCount: 0,
            lastActivity: new Date()
        }
    }

    async executeTask(task: EngineTask): Promise<EngineResult> {
        if (task.type !== "sync") {
            return {
                success: false,
                taskId: task.id,
                error: "墨子引擎只支持同步操作"
            }
        }

        this.activeTasks++
        this.running = true

        try {
            const result = await this.performSync(
                task.source!,
                task.destination!,
                task.options as SyncTaskConfig || {},
                task.progressCallback
            )

            return {
                success: result.success,
                taskId: task.id,
                data: result,
                metrics: {
                    duration: result.duration,
                    bytesProcessed: result.bytesTransferred,
                    filesProcessed: result.itemsProcessed
                }
            }
        } finally {
            this.activeTasks--
            this.running = this.activeTasks > 0
        }
    }

    /**
     * 执行同步操作
     */
    private async performSync(
        sourcePath: string,
        targetPath: string,
        config: SyncTaskConfig,
        progressCallback?: (progress: TaskProgress) => void
    ): Promise<SyncResult> {
        const startTime = Date.now()

        // 分析同步项目
        const items = await this.analyzeSyncItems(sourcePath, targetPath, config)
        let processedItems = 0
        let skippedItems = 0
        let erroredItems = 0
        let bytesTransferred = 0
        const errors: Array<{ path: string; error: string }> = []

        // 执行同步
        for (const item of items) {
            try {
                if (item.action === "skip") {
                    skippedItems++
                    continue
                }

                const result = await this.syncItem(item, config)
                if (result.synced) {
                    processedItems++
                    bytesTransferred += result.bytesTransferred
                } else {
                    skippedItems++
                }

                // 报告进度
                if (progressCallback) {
                    progressCallback({
                        taskId: "",
                        percentage: ((processedItems + skippedItems + erroredItems) / items.length) * 100,
                        currentFile: item.relativePath,
                        totalFiles: items.length,
                        processedFiles: processedItems,
                        bytesTransferred,
                        message: `${item.action}: ${item.relativePath}`
                    })
                }
            } catch (error) {
                erroredItems++
                errors.push({
                    path: item.relativePath,
                    error: error instanceof Error ? error.message : String(error)
                })
                this.deps.logger.warn(`同步失败: ${item.relativePath}`, { error })
            }
        }

        return {
            success: erroredItems === 0,
            itemsProcessed: processedItems,
            itemsSkipped: skippedItems,
            itemsErrored: erroredItems,
            bytesTransferred,
            duration: Date.now() - startTime,
            errors: errors.length > 0 ? errors : undefined
        }
    }

    /**
     * 分析需要同步的项目
     */
    private async analyzeSyncItems(
        sourcePath: string,
        targetPath: string,
        config: SyncTaskConfig
    ): Promise<SyncItem[]> {
        const items: SyncItem[] = []

        // 递归扫描源目录
        await this.scanDirectory(sourcePath, "", items, targetPath, config)

        // 如果需要删除多余文件，扫描目标目录
        if (config.deleteExtraneous) {
            await this.scanForExtraneous(targetPath, sourcePath, "", items, config)
        }

        return items
    }

    /**
     * 递归扫描目录
     */
    private async scanDirectory(
        currentPath: string,
        relativePath: string,
        items: SyncItem[],
        targetBasePath: string,
        config: SyncTaskConfig
    ): Promise<void> {
        try {
            const entries = await this.deps.fs.readdir(currentPath, { withFileTypes: true })

            for (const entry of entries) {
                const itemRelativePath = path.join(relativePath, entry.name)
                const sourcePath = path.join(currentPath, entry.name)
                const targetPath = path.join(targetBasePath, itemRelativePath)

                // 检查排除模式
                if (this.shouldExclude(itemRelativePath, config.excludePatterns)) {
                    continue
                }

                if (entry.isDirectory()) {
                    // 确保目标目录存在
                    await this.ensureDirectoryExists(targetPath)

                    // 递归处理子目录
                    await this.scanDirectory(sourcePath, itemRelativePath, items, targetBasePath, config)
                } else if (entry.isFile()) {
                    const sourceStats = await this.deps.fs.stat(sourcePath)
                    let targetStats: gracefulFs.Stats | undefined

                    try {
                        targetStats = await this.deps.fs.stat(targetPath)
                    } catch {
                        // 目标文件不存在
                    }

                    const action = this.determineAction(sourceStats, targetStats, config)

                    items.push({
                        relativePath: itemRelativePath,
                        sourcePath,
                        targetPath,
                        sourceStats,
                        targetStats,
                        action
                    })
                }
            }
        } catch (error) {
            this.deps.logger.warn(`扫描目录失败：${currentPath}`, {
                error: error instanceof Error ? error.message : String(error)
            })
        }
    }

    /**
     * 扫描目标目录中多余的文件
     */
    private async scanForExtraneous(
        targetPath: string,
        sourceBasePath: string,
        relativePath: string,
        items: SyncItem[],
        config: SyncTaskConfig
    ): Promise<void> {
        try {
            const entries = await this.deps.fs.readdir(targetPath, { withFileTypes: true })

            for (const entry of entries) {
                const itemRelativePath = path.join(relativePath, entry.name)
                const fullTargetPath = path.join(targetPath, entry.name)
                const correspondingSourcePath = path.join(sourceBasePath, itemRelativePath)

                // 检查排除模式
                if (this.shouldExclude(itemRelativePath, config.excludePatterns)) {
                    continue
                }

                try {
                    await this.deps.fs.access(correspondingSourcePath)
                    // 源文件存在，递归处理（如果是目录）
                    if (entry.isDirectory()) {
                        await this.scanForExtraneous(
                            fullTargetPath,
                            sourceBasePath,
                            itemRelativePath,
                            items,
                            config
                        )
                    }
                } catch {
                    // 源文件不存在，标记为删除
                    const targetStats = await this.deps.fs.stat(fullTargetPath)
                    items.push({
                        relativePath: itemRelativePath,
                        sourcePath: "",
                        targetPath: fullTargetPath,
                        targetStats,
                        action: "delete",
                        reason: "源文件不存在"
                    })
                }
            }
        } catch (error) {
            this.deps.logger.warn(`扫描多余文件失败：${targetPath}`, {
                error: error instanceof Error ? error.message : String(error)
            })
        }
    }

    /**
     * 判断同步动作
     */
    private determineAction(
        sourceStats: gracefulFs.Stats,
        targetStats?: gracefulFs.Stats,
        _config?: SyncTaskConfig
    ): SyncItem["action"] {
        if (!targetStats) {
            return "copy"
        }

        // 比较修改时间
        if (sourceStats.mtime > targetStats.mtime) {
            return "update"
        }

        // 比较文件大小
        if (sourceStats.size !== targetStats.size) {
            return "update"
        }

        return "skip"
    }

    /**
     * 同步单个项目
     */
    private async syncItem(item: SyncItem, config: SyncTaskConfig): Promise<{ synced: boolean, bytesTransferred: number }> {
        try {
            // 确保目标目录存在
            const targetDir = path.dirname(item.targetPath)
            await this.ensureDirectoryExists(targetDir)

            // 复制文件
            await this.deps.fs.copyFile(item.sourcePath, item.targetPath)

            // 保持时间戳
            if (config.preserveTimestamps && item.sourceStats) {
                await this.deps.fs.utimes(
                    item.targetPath,
                    item.sourceStats.atime,
                    item.sourceStats.mtime
                )
            }

            return {
                synced: true,
                bytesTransferred: item.sourceStats?.size || 0
            }
        } catch (error) {
            this.deps.logger.warn(`同步文件失败: ${item.relativePath}`, { error })
            throw error
        }
    }

    /**
     * 确保目录存在
     */
    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await this.deps.fs.mkdir(dirPath, { recursive: true })
        } catch (error) {
            // 目录可能已存在，忽略错误
        }
    }

    /**
     * 检查是否应该排除
     */
    private shouldExclude(relativePath: string, excludePatterns?: string[]): boolean {
        if (!excludePatterns) return false

        return excludePatterns.some(pattern => {
            // 简单的glob模式匹配
            const regex = new RegExp(pattern.replace(/\*/g, ".*"))
            return regex.test(relativePath)
        })
    }
}