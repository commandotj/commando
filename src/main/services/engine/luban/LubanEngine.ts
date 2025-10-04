import * as gracefulFs from "graceful-fs"
import path from "path"
import logger from "../../../log/logger"
import { ENGINE_DEFAULTS } from "../shared/defaults"
import { mergeBatchOptions, mergeDefaultOptions } from "./options"
import { ensureDirectoryExists, validateFilePaths } from "./fsHelpers"
import { streamCopy } from "./streamCopy"
import { calculateFileChecksum } from "./checksum"
import { createBatches } from "./batchUtils"
import { performFileOperation } from "./fileOperationExecutor"
import { sleep } from "../shared/sleep"
import type {
    BatchOperationOptions,
    BatchOperationResult,
    FileOperationOptions,
    FileOperationResult,
} from "../shared/types"
import type { Logger } from "../shared/loggerTypes"

export interface LubanEngineDeps {
    logger: Logger
    ensureDirectoryExists: (dirPath: string) => Promise<void>
    validateFilePaths: (source: string, destination?: string) => void
    streamCopy: typeof streamCopy
    calculateChecksum: (filePath: string, options?: FileOperationOptions) => Promise<string>
    sleep: (ms: number) => Promise<void>
    fs: typeof gracefulFs.promises
}

const defaultDeps: LubanEngineDeps = {
    logger,
    ensureDirectoryExists,
    validateFilePaths,
    streamCopy,
    calculateChecksum: calculateFileChecksum,
    sleep,
    fs: gracefulFs.promises,
}

export class LubanEngine {
    constructor(private readonly deps: LubanEngineDeps = defaultDeps) {}

    async copyFile(
        source: string,
        destination: string,
        options: FileOperationOptions = {}
    ): Promise<FileOperationResult> {
        const startTime = Date.now()
        const normalizedSource = path.normalize(source)
        const normalizedDestination = path.normalize(destination)
        const operationOptions = mergeDefaultOptions(options)

        this.deps.validateFilePaths(normalizedSource, normalizedDestination)

        try {
            const result = await performFileOperation({
                source: normalizedSource,
                destination: normalizedDestination,
                options: operationOptions,
                deps: {
                    logger: this.deps.logger,
                    ensureDirectoryExists: this.deps.ensureDirectoryExists,
                    streamCopy: params => this.deps.streamCopy(params),
                    calculateChecksum: filePath => this.deps.calculateChecksum(filePath),
                    sleep: this.deps.sleep,
                    defaults: {
                        maxRetries: ENGINE_DEFAULTS.MAX_RETRIES,
                        retryDelay: ENGINE_DEFAULTS.RETRY_DELAY,
                    },
                },
            })

            const duration = Date.now() - startTime

            if (operationOptions.verbose) {
                this.deps.logger.info(
                    `文件复制完成: ${normalizedSource} -> ${normalizedDestination}, ${result.bytesProcessed} bytes, ${duration}ms, checksum: ${result.checksum ?? "N/A"}`
                )
            }

            return {
                success: true,
                source: normalizedSource,
                destination: normalizedDestination,
                bytesProcessed: result.bytesProcessed,
                duration,
                checksum: result.checksum,
            }
        } catch (error) {
            const duration = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : String(error)

            this.deps.logger.error(
                `文件复制失败: ${normalizedSource} -> ${normalizedDestination}, error: ${errorMessage}, ${duration}ms`
            )

            return {
                success: false,
                source: normalizedSource,
                destination: normalizedDestination,
                bytesProcessed: 0,
                duration,
                error: errorMessage,
            }
        }
    }

    async copyBatch(
        sources: string[],
        destinationDir: string,
        options: BatchOperationOptions = {}
    ): Promise<BatchOperationResult> {
        if (!Array.isArray(sources) || sources.length === 0) {
            throw new Error("源文件列表不能为空")
        }

        const startTime = Date.now()
        const batchOptions = mergeBatchOptions(options)
        const normalizedDestinationDir = path.normalize(destinationDir)
        await this.deps.ensureDirectoryExists(normalizedDestinationDir)

        if (batchOptions.verbose) {
            this.deps.logger.info(
                `开始批量文件复制: ${sources.length} 个文件到 ${normalizedDestinationDir}, 并发数: ${batchOptions.concurrency}`
            )
        }

        const results: FileOperationResult[] = []
        const errors: string[] = []
        let successCount = 0
        let failureCount = 0

        const concurrencyLimit = batchOptions.concurrency ?? ENGINE_DEFAULTS.CONCURRENCY
        const batches = createBatches(sources, concurrencyLimit)

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(async sourcePath => {
                    const fileName = path.basename(sourcePath)
                    const destinationPath = path.join(normalizedDestinationDir, fileName)

                    try {
                        const result = await this.copyFile(sourcePath, destinationPath, batchOptions)
                        if (result.success) {
                            successCount++
                        } else {
                            failureCount++
                            if (result.error) {
                                errors.push(`${sourcePath}: ${result.error}`)
                            }
                        }
                        return result
                    } catch (error) {
                        failureCount++
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        errors.push(`${sourcePath}: ${errorMessage}`)

                        if (batchOptions.stopOnError && batchOptions.errorMode === "throw") {
                            throw error
                        }

                        return {
                            success: false,
                            source: sourcePath,
                            destination: destinationPath,
                            bytesProcessed: 0,
                            duration: 0,
                            error: errorMessage,
                        }
                    }
                })
            )

            results.push(...batchResults)

            if (batchOptions.stopOnError && batchResults.some(result => !result.success)) {
                break
            }
        }

        const totalDuration = Date.now() - startTime
        const totalSuccess = successCount === sources.length

        if (batchOptions.verbose) {
            this.deps.logger.info(
                `批量文件复制完成: ${successCount}/${sources.length} 成功, ${failureCount} 失败, ${totalDuration}ms, 总体结果: ${totalSuccess ? "成功" : "失败"}`
            )
        }

        return {
            success: totalSuccess,
            successCount,
            failureCount,
            totalCount: sources.length,
            results,
            totalDuration,
            errors,
        }
    }

    async moveFile(
        source: string,
        destination: string,
        options: FileOperationOptions = {}
    ): Promise<FileOperationResult> {
        const copyResult = await this.copyFile(source, destination, options)
        if (!copyResult.success) {
            return copyResult
        }

        try {
            await this.deps.fs.unlink(path.normalize(source))
            if (options.verbose) {
                this.deps.logger.info(`文件移动完成: ${path.normalize(source)} -> ${path.normalize(destination)}`)
            }
            return copyResult
        } catch (error) {
            const errorMessage = `文件复制成功但删除源文件失败: ${error instanceof Error ? error.message : String(error)}`
            this.deps.logger.error(
                `文件移动部分失败: ${path.normalize(source)} -> ${path.normalize(destination)}, error: ${errorMessage}`
            )
            return {
                ...copyResult,
                success: false,
                error: errorMessage,
            }
        }
    }

    async deleteFile(filePath: string, options: FileOperationOptions = {}): Promise<FileOperationResult> {
        const startTime = Date.now()
        const normalizedPath = path.normalize(filePath)

        try {
            this.deps.validateFilePaths(normalizedPath)
            const stats = await this.deps.fs.stat(normalizedPath)

            options.progressCallback?.({
                currentFile: normalizedPath,
                bytesProcessed: 0,
                totalBytes: stats.size,
                percentage: 0,
                speed: 0,
                estimatedTimeRemaining: 0,
                operation: "delete",
                startTime,
            })

            await this.deps.fs.unlink(normalizedPath)

            const duration = Date.now() - startTime

            options.progressCallback?.({
                currentFile: normalizedPath,
                bytesProcessed: stats.size,
                totalBytes: stats.size,
                percentage: 100,
                speed: stats.size / Math.max(duration / 1000, 1),
                estimatedTimeRemaining: 0,
                operation: "delete",
                startTime,
            })

            if (options.verbose) {
                this.deps.logger.info(`文件删除完成: ${normalizedPath}, ${stats.size} bytes, ${duration}ms`)
            }

            return {
                success: true,
                source: normalizedPath,
                bytesProcessed: stats.size,
                duration,
            }
        } catch (error) {
            const duration = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : String(error)
            this.deps.logger.error(`文件删除失败: ${normalizedPath}, error: ${errorMessage}, ${duration}ms`)
            return {
                success: false,
                source: normalizedPath,
                bytesProcessed: 0,
                duration,
                error: errorMessage,
            }
        }
    }

    async verifyFile(
        filePath: string,
        expectedChecksum?: string,
        options: FileOperationOptions = {}
    ): Promise<FileOperationResult & { checksum: string }> {
        const startTime = Date.now()
        const normalizedPath = path.normalize(filePath)

        try {
            this.deps.validateFilePaths(normalizedPath)
            const checksum = await this.deps.calculateChecksum(normalizedPath, options)
            const duration = Date.now() - startTime
            const isValid = expectedChecksum ? checksum === expectedChecksum : true

            if (options.verbose) {
                this.deps.logger.info(
                    `文件验证完成: ${normalizedPath}, checksum: ${checksum}, expected: ${expectedChecksum ?? "N/A"}, valid: ${isValid}, ${duration}ms`
                )
            }

            return {
                success: isValid,
                source: normalizedPath,
                bytesProcessed: (await this.deps.fs.stat(normalizedPath)).size,
                duration,
                checksum,
                error: isValid ? undefined : `校验和不匹配: 期望 ${expectedChecksum}, 实际 ${checksum}`,
            }
        } catch (error) {
            const duration = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : String(error)
            this.deps.logger.error(`文件验证失败: ${normalizedPath}, error: ${errorMessage}, ${duration}ms`)
            return {
                success: false,
                source: normalizedPath,
                bytesProcessed: 0,
                duration,
                checksum: "",
                error: errorMessage,
            }
        }
    }

    async getFileInfo(filePath: string): Promise<{
        path: string
        size: number
        isFile: boolean
        isDirectory: boolean
        mtime: Date
        atime: Date
        ctime: Date
        mode: number
    }> {
        const normalizedPath = path.normalize(filePath)
        const stats = await this.deps.fs.stat(normalizedPath)
        return {
            path: normalizedPath,
            size: stats.size,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            mtime: stats.mtime,
            atime: stats.atime,
            ctime: stats.ctime,
            mode: stats.mode,
        }
    }
}

export const lubanEngine = new LubanEngine()
export default LubanEngine
