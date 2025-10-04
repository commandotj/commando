/**
 * 左丘明引擎 - 专注于版本控制操作
 *
 * 左丘明思想：
 * - 史记详实：记录所有版本变化
 * - 春秋笔法：精确描述变更历史
 * - 忠实记录：保持版本信息的完整性
 */

import type { BaseEngine, EngineCapability, EngineTask, EngineResult, EngineStatus, TaskProgress } from "../kongzi/KongziEngineManager"
import type { Logger } from "../shared/loggerTypes"
import logger from "../../../log/logger"
import * as gracefulFs from "graceful-fs"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface ZuoqiumingEngineDeps {
    logger: Logger
    fs: typeof gracefulFs.promises
}

export interface VersionControlConfig {
    repositoryPath: string
    commitMessage?: string
    author?: {
        name: string
        email: string
    }
    createBranch?: string
    mergeBranch?: string
    excludePatterns?: string[]
}

export interface CommitInfo {
    hash: string
    message: string
    author: string
    date: Date
    files: string[]
}

export interface VersionControlResult {
    success: boolean
    operation: string
    hash?: string
    message?: string
    files?: string[]
    conflictFiles?: string[]
    error?: string
}

/**
 * 左丘明版本控制引擎
 *
 * 实现理念：
 * - 史记详实：完整记录所有版本信息
 * - 春秋笔法：准确描述变更状态
 * - 忠实记录：保持历史的真实性
 */
export class ZuoqiumingEngine implements BaseEngine {
    name = "ZuoqiumingEngine"
    version = "1.0.0"

    capabilities: EngineCapability[] = [
        {
            type: "version_control",
            operations: ["commit", "branch", "merge", "status", "log", "diff"],
            constraints: {
                performance: "medium"
            }
        }
    ]

    private readonly deps: ZuoqiumingEngineDeps
    private running = false
    private activeTasks = 0

    constructor(deps: ZuoqiumingEngineDeps = { logger, fs: gracefulFs.promises }) {
        this.deps = deps
    }

    async initialize(): Promise<void> {
        this.deps.logger.info("左丘明版本控制引擎初始化完成")
    }

    async cleanup(): Promise<void> {
        this.deps.logger.info("左丘明版本控制引擎清理完成")
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
        if (task.type !== "commit") {
            return {
                success: false,
                taskId: task.id,
                error: "左丘明引擎主要支持版本控制操作"
            }
        }

        this.activeTasks++
        this.running = true

        try {
            const result = await this.performVersionControl(
                task.options as unknown as VersionControlConfig,
                task.progressCallback
            )

            return {
                success: result.success,
                taskId: task.id,
                data: result,
                metrics: {
                    duration: 0,
                    filesProcessed: result.files?.length || 0
                }
            }
        } finally {
            this.activeTasks--
            this.running = this.activeTasks > 0
        }
    }

    /**
     * 执行版本控制操作
     */
    private async performVersionControl(
        config: VersionControlConfig,
        progressCallback?: (progress: TaskProgress) => void
    ): Promise<VersionControlResult> {
        try {
            // 检查是否为Git仓库
            const isGitRepo = await this.isGitRepository(config.repositoryPath)
            if (!isGitRepo) {
                return {
                    success: false,
                    operation: "check",
                    error: "指定路径不是Git仓库"
                }
            }

            // 检查仓库状态
            const status = await this.getRepositoryStatus(config.repositoryPath)

            if (progressCallback) {
                progressCallback({
                    taskId: "",
                    percentage: 25,
                    message: "检查仓库状态完成",
                    currentFile: config.repositoryPath
                })
            }

            // 添加文件到暂存区
            if (status.modified.length > 0 || status.untracked.length > 0) {
                await this.addFiles(config.repositoryPath, config.excludePatterns)

                if (progressCallback) {
                    progressCallback({
                        taskId: "",
                        percentage: 50,
                        message: "文件已添加到暂存区"
                    })
                }
            }

            // 创建提交
            const commitResult = await this.createCommit(
                config.repositoryPath,
                config.commitMessage || "Auto commit by 左丘明引擎",
                config.author
            )

            if (progressCallback) {
                progressCallback({
                    taskId: "",
                    percentage: 100,
                    message: "提交创建完成"
                })
            }

            return {
                success: true,
                operation: "commit",
                hash: commitResult.hash,
                message: commitResult.message,
                files: commitResult.files
            }

        } catch (error) {
            this.deps.logger.error("版本控制操作失败", { error })
            return {
                success: false,
                operation: "commit",
                error: error instanceof Error ? error.message : String(error)
            }
        }
    }

    /**
     * 检查是否为Git仓库
     */
    private async isGitRepository(repoPath: string): Promise<boolean> {
        try {
            const { stdout } = await execAsync("git rev-parse --is-inside-work-tree", {
                cwd: repoPath
            })
            return stdout.trim() === "true"
        } catch {
            return false
        }
    }

    /**
     * 获取仓库状态
     */
    private async getRepositoryStatus(repoPath: string): Promise<{
        modified: string[]
        untracked: string[]
        staged: string[]
    }> {
        const { stdout } = await execAsync("git status --porcelain", {
            cwd: repoPath
        })

        const modified: string[] = []
        const untracked: string[] = []
        const staged: string[] = []

        stdout.split('\n').forEach(line => {
            if (line.trim()) {
                const status = line.substring(0, 2)
                const file = line.substring(3)

                if (status[0] === 'M' || status[0] === 'A' || status[0] === 'D') {
                    staged.push(file)
                }
                if (status[1] === 'M') {
                    modified.push(file)
                }
                if (status === '??') {
                    untracked.push(file)
                }
            }
        })

        return { modified, untracked, staged }
    }

    /**
     * 添加文件到暂存区
     */
    private async addFiles(repoPath: string, excludePatterns?: string[]): Promise<void> {
        try {
            // 添加所有修改的文件
            await execAsync("git add .", { cwd: repoPath })

            // 如果有排除模式，移除这些文件
            if (excludePatterns && excludePatterns.length > 0) {
                for (const pattern of excludePatterns) {
                    try {
                        await execAsync(`git reset HEAD -- "${pattern}"`, { cwd: repoPath })
                    } catch {
                        // 忽略不存在的文件
                    }
                }
            }
        } catch (error) {
            this.deps.logger.warn("添加文件到暂存区时出现问题", { error })
            throw error
        }
    }

    /**
     * 创建提交
     */
    private async createCommit(
        repoPath: string,
        message: string,
        author?: { name: string; email: string }
    ): Promise<CommitInfo> {
        try {
            // 设置作者信息
            if (author) {
                await execAsync(`git config user.name "${author.name}"`, { cwd: repoPath })
                await execAsync(`git config user.email "${author.email}"`, { cwd: repoPath })
            }

            // 创建提交
            await execAsync(`git commit -m "${message}"`, { cwd: repoPath })

            // 获取提交信息
            const { stdout: hashOutput } = await execAsync("git rev-parse HEAD", { cwd: repoPath })
            const hash = hashOutput.trim()

            const { stdout: logOutput } = await execAsync(
                `git show --name-only --format="format:%an|%ad|%s" ${hash}`,
                { cwd: repoPath }
            )

            const lines = logOutput.split('\n')
            const [authorInfo, dateInfo, messageInfo] = lines[0].split('|')
            const files = lines.slice(2).filter(line => line.trim())

            return {
                hash,
                message: messageInfo,
                author: authorInfo,
                date: new Date(dateInfo),
                files
            }

        } catch (error) {
            this.deps.logger.error("创建提交失败", { error })
            throw error
        }
    }

    /**
     * 获取提交历史
     */
    async getCommitHistory(repoPath: string, limit = 10): Promise<CommitInfo[]> {
        try {
            const { stdout } = await execAsync(
                `git log --oneline --format="format:%H|%an|%ad|%s" -${limit}`,
                { cwd: repoPath }
            )

            return stdout.split('\n').map(line => {
                const [hash, author, date, message] = line.split('|')
                return {
                    hash,
                    author,
                    date: new Date(date),
                    message,
                    files: [] // 需要单独查询文件列表
                }
            })
        } catch (error) {
            this.deps.logger.error("获取提交历史失败", { error })
            return []
        }
    }

    /**
     * 获取文件差异
     */
    async getFileDiff(repoPath: string, filePath: string, commitHash?: string): Promise<string> {
        try {
            const command = commitHash
                ? `git show ${commitHash}:${filePath}`
                : `git diff HEAD -- ${filePath}`

            const { stdout } = await execAsync(command, { cwd: repoPath })
            return stdout
        } catch (error) {
            this.deps.logger.error("获取文件差异失败", { error })
            return ""
        }
    }
}