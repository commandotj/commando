import * as gracefulFs from "graceful-fs";
import path from "path";
import { logger } from "../laozi";
import { ENGINE_DEFAULTS } from "../shared/defaults";
import { mergeBatchOptions, mergeDefaultOptions } from "./options";
import { ensureDirectoryExists, validateFilePaths } from "./fsHelpers";
import { streamCopy } from "./streamCopy";
import { calculateFileChecksum } from "./checksum";
import { createBatches } from "./batchUtils";
import { performFileOperation } from "./fileOperationExecutor";
import { sleep } from "../shared/sleep";
import type {
    BatchOperationOptions,
    BatchOperationResult,
    FileOperationOptions,
    FileOperationResult,
} from "../shared/types";
import type { Logger } from "../../../common/types/LoggerTypes";
import type {
    BaseEngine,
    EngineCapability,
    EngineTask,
    EngineResult,
    EngineStatus,
} from "../kongzi/EngineManager";

export interface LubanEngineDeps {
    logger: Logger;
    ensureDirectoryExists: (dirPath: string) => Promise<void>;
    validateFilePaths: (source: string, destination?: string) => void;
    streamCopy: typeof streamCopy;
    calculateChecksum: (
        filePath: string,
        options?: FileOperationOptions
    ) => Promise<string>;
    sleep: (ms: number) => Promise<void>;
    fs: typeof gracefulFs.promises;
}

const defaultDeps: LubanEngineDeps = {
    logger,
    ensureDirectoryExists,
    validateFilePaths,
    streamCopy,
    calculateChecksum: calculateFileChecksum,
    sleep,
    fs: gracefulFs.promises,
};

export class LubanEngine implements BaseEngine {
    name = "LubanEngine";
    version = "1.0.0";

    /**
     * 鲁班引擎能力定义
     *
     * 鲁班曰：工匠精神，精于文件操作
     * - 复制：精确复制文件
     * - 移动：高效移动文件
     * - 删除：安全删除文件
     * - 批量操作：支持大量文件处理
     */
    capabilities: EngineCapability[] = [
        {
            type: "file_operation",
            operations: ["copy", "move", "delete"],
            constraints: {
                performance: "high",
                maxFileSize: 1024 * 1024 * 1024, // 1GB
            },
        },
    ];

    private isInitialized = false;

    constructor(private readonly deps: LubanEngineDeps = defaultDeps) {}

    async copyFile(
        source: string,
        destination: string,
        options: FileOperationOptions = {}
    ): Promise<FileOperationResult> {
        const startTime = Date.now();
        const normalizedSource = path.normalize(source);
        const normalizedDestination = path.normalize(destination);
        const operationOptions = mergeDefaultOptions(options);

        this.deps.validateFilePaths(normalizedSource, normalizedDestination);

        try {
            const result = await performFileOperation({
                source: normalizedSource,
                destination: normalizedDestination,
                options: operationOptions,
                deps: {
                    logger: this.deps.logger,
                    ensureDirectoryExists: this.deps.ensureDirectoryExists,
                    streamCopy: params => this.deps.streamCopy(params),
                    calculateChecksum: filePath =>
                        this.deps.calculateChecksum(filePath),
                    sleep: this.deps.sleep,
                    defaults: {
                        maxRetries: ENGINE_DEFAULTS.MAX_RETRIES,
                        retryDelay: ENGINE_DEFAULTS.RETRY_DELAY,
                    },
                },
            });

            const duration = Date.now() - startTime;

            if (operationOptions.verbose) {
                this.deps.logger.info(
                    `文件复制完成: ${normalizedSource} -> ${normalizedDestination}, ${result.bytesProcessed} bytes, ${duration}ms, checksum: ${result.checksum ?? "N/A"}`
                );
            }

            return {
                success: true,
                source: normalizedSource,
                destination: normalizedDestination,
                bytesProcessed: result.bytesProcessed,
                duration,
                checksum: result.checksum,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            this.deps.logger.error(
                `文件复制失败: ${normalizedSource} -> ${normalizedDestination}, error: ${errorMessage}, ${duration}ms`
            );

            return {
                success: false,
                source: normalizedSource,
                destination: normalizedDestination,
                bytesProcessed: 0,
                duration,
                error: errorMessage,
            };
        }
    }

    async copyBatch(
        sources: string[],
        destinationDir: string,
        options: BatchOperationOptions = {}
    ): Promise<BatchOperationResult> {
        if (!Array.isArray(sources) || sources.length === 0) {
            throw new Error("源文件列表不能为空");
        }

        const startTime = Date.now();
        const batchOptions = mergeBatchOptions(options);
        const normalizedDestinationDir = path.normalize(destinationDir);
        await this.deps.ensureDirectoryExists(normalizedDestinationDir);

        if (batchOptions.verbose) {
            this.deps.logger.info(
                `开始批量文件复制: ${sources.length} 个文件到 ${normalizedDestinationDir}, 并发数: ${batchOptions.concurrency}`
            );
        }

        const results: FileOperationResult[] = [];
        const errors: string[] = [];
        let successCount = 0;
        let failureCount = 0;

        const concurrencyLimit =
            batchOptions.concurrency ?? ENGINE_DEFAULTS.CONCURRENCY;
        const batches = createBatches(sources, concurrencyLimit);

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(async sourcePath => {
                    const fileName = path.basename(sourcePath);
                    const destinationPath = path.join(
                        normalizedDestinationDir,
                        fileName
                    );

                    try {
                        const result = await this.copyFile(
                            sourcePath,
                            destinationPath,
                            batchOptions
                        );
                        if (result.success) {
                            successCount++;
                        } else {
                            failureCount++;
                            if (result.error) {
                                errors.push(`${sourcePath}: ${result.error}`);
                            }
                        }
                        return result;
                    } catch (error) {
                        failureCount++;
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : String(error);
                        errors.push(`${sourcePath}: ${errorMessage}`);

                        if (
                            batchOptions.stopOnError &&
                            batchOptions.errorMode === "throw"
                        ) {
                            throw error;
                        }

                        return {
                            success: false,
                            source: sourcePath,
                            destination: destinationPath,
                            bytesProcessed: 0,
                            duration: 0,
                            error: errorMessage,
                        };
                    }
                })
            );

            results.push(...batchResults);

            if (
                batchOptions.stopOnError &&
                batchResults.some(result => !result.success)
            ) {
                break;
            }
        }

        const totalDuration = Date.now() - startTime;
        const totalSuccess = successCount === sources.length;

        if (batchOptions.verbose) {
            this.deps.logger.info(
                `批量文件复制完成: ${successCount}/${sources.length} 成功, ${failureCount} 失败, ${totalDuration}ms, 总体结果: ${totalSuccess ? "成功" : "失败"}`
            );
        }

        return {
            success: totalSuccess,
            successCount,
            failureCount,
            totalCount: sources.length,
            results,
            totalDuration,
            errors,
        };
    }

    async moveFile(
        source: string,
        destination: string,
        options: FileOperationOptions = {}
    ): Promise<FileOperationResult> {
        const copyResult = await this.copyFile(source, destination, options);
        if (!copyResult.success) {
            return copyResult;
        }

        try {
            await this.deps.fs.unlink(path.normalize(source));
            if (options.verbose) {
                this.deps.logger.info(
                    `文件移动完成: ${path.normalize(source)} -> ${path.normalize(destination)}`
                );
            }
            return copyResult;
        } catch (error) {
            const errorMessage = `文件复制成功但删除源文件失败: ${error instanceof Error ? error.message : String(error)}`;
            this.deps.logger.error(
                `文件移动部分失败: ${path.normalize(source)} -> ${path.normalize(destination)}, error: ${errorMessage}`
            );
            return {
                ...copyResult,
                success: false,
                error: errorMessage,
            };
        }
    }

    async deleteFile(
        filePath: string,
        options: FileOperationOptions = {}
    ): Promise<FileOperationResult> {
        const startTime = Date.now();
        const normalizedPath = path.normalize(filePath);

        try {
            this.deps.validateFilePaths(normalizedPath);
            const stats = await this.deps.fs.stat(normalizedPath);

            options.progressCallback?.({
                currentFile: normalizedPath,
                bytesProcessed: 0,
                totalBytes: stats.size,
                percentage: 0,
                speed: 0,
                estimatedTimeRemaining: 0,
                operation: "delete",
                startTime,
            });

            await this.deps.fs.unlink(normalizedPath);

            const duration = Date.now() - startTime;

            options.progressCallback?.({
                currentFile: normalizedPath,
                bytesProcessed: stats.size,
                totalBytes: stats.size,
                percentage: 100,
                speed: stats.size / Math.max(duration / 1000, 1),
                estimatedTimeRemaining: 0,
                operation: "delete",
                startTime,
            });

            if (options.verbose) {
                this.deps.logger.info(
                    `文件删除完成: ${normalizedPath}, ${stats.size} bytes, ${duration}ms`
                );
            }

            return {
                success: true,
                source: normalizedPath,
                bytesProcessed: stats.size,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            this.deps.logger.error(
                `文件删除失败: ${normalizedPath}, error: ${errorMessage}, ${duration}ms`
            );
            return {
                success: false,
                source: normalizedPath,
                bytesProcessed: 0,
                duration,
                error: errorMessage,
            };
        }
    }

    async verifyFile(
        filePath: string,
        expectedChecksum?: string,
        options: FileOperationOptions = {}
    ): Promise<FileOperationResult & { checksum: string }> {
        const startTime = Date.now();
        const normalizedPath = path.normalize(filePath);

        try {
            this.deps.validateFilePaths(normalizedPath);
            const checksum = await this.deps.calculateChecksum(
                normalizedPath,
                options
            );
            const duration = Date.now() - startTime;
            const isValid = expectedChecksum
                ? checksum === expectedChecksum
                : true;

            if (options.verbose) {
                this.deps.logger.info(
                    `文件验证完成: ${normalizedPath}, checksum: ${checksum}, expected: ${expectedChecksum ?? "N/A"}, valid: ${isValid}, ${duration}ms`
                );
            }

            return {
                success: isValid,
                source: normalizedPath,
                bytesProcessed: (await this.deps.fs.stat(normalizedPath)).size,
                duration,
                checksum,
                error: isValid
                    ? undefined
                    : `校验和不匹配: 期望 ${expectedChecksum}, 实际 ${checksum}`,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            this.deps.logger.error(
                `文件验证失败: ${normalizedPath}, error: ${errorMessage}, ${duration}ms`
            );
            return {
                success: false,
                source: normalizedPath,
                bytesProcessed: 0,
                duration,
                checksum: "",
                error: errorMessage,
            };
        }
    }

    async getFileInfo(filePath: string): Promise<{
        path: string;
        size: number;
        isFile: boolean;
        isDirectory: boolean;
        mtime: Date;
        atime: Date;
        ctime: Date;
        mode: number;
    }> {
        const normalizedPath = path.normalize(filePath);
        const stats = await this.deps.fs.stat(normalizedPath);
        return {
            path: normalizedPath,
            size: stats.size,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            mtime: stats.mtime,
            atime: stats.atime,
            ctime: stats.ctime,
            mode: stats.mode,
        };
    }

    /**
     * 初始化鲁班引擎
     *
     * 鲁班曰：工欲善其事，必先利其器
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.deps.logger.info("鲁班引擎初始化开始");

        // 鲁班引擎初始化逻辑
        // 可以在这里进行必要的准备工作

        this.isInitialized = true;
        this.deps.logger.info("鲁班引擎初始化完成");
    }

    /**
     * 清理鲁班引擎
     *
     * 鲁班曰：善始善终，清理资源
     */
    async cleanup(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        this.deps.logger.info("鲁班引擎清理开始");

        // 鲁班引擎清理逻辑
        // 可以在这里进行资源清理

        this.isInitialized = false;
        this.deps.logger.info("鲁班引擎清理完成");
    }

    /**
     * 执行引擎任务
     *
     * 鲁班曰：因材施教，根据任务类型执行相应操作
     */
    async executeTask(task: EngineTask): Promise<EngineResult> {
        this.deps.logger.info("鲁班开始执行任务", {
            taskId: task.id,
            type: task.type,
        });

        try {
            switch (task.type) {
                case "copy":
                    if (Array.isArray(task.source)) {
                        // 批量复制
                        const result = await this.copyBatch(
                            task.source as string[],
                            task.destination || "",
                            task.options || {}
                        );
                        return {
                            success: result.success,
                            taskId: task.id,
                            data: result,
                        };
                    } else {
                        // 单个复制
                        const result = await this.copyFile(
                            task.source as string,
                            task.destination || "",
                            task.options || {}
                        );
                        return {
                            success: result.success,
                            taskId: task.id,
                            data: result,
                        };
                    }

                case "move":
                    // 移动操作
                    const moveResult = await this.moveFile(
                        task.source as string,
                        task.destination || "",
                        task.options || {}
                    );
                    return {
                        success: moveResult.success,
                        taskId: task.id,
                        data: moveResult,
                    };

                case "delete":
                    // 删除操作
                    const deleteResult = await this.deleteFile(
                        task.source as string,
                        task.options || {}
                    );
                    return {
                        success: deleteResult.success,
                        taskId: task.id,
                        data: deleteResult,
                    };

                default:
                    return {
                        success: false,
                        taskId: task.id,
                        error: `鲁班不支持操作类型: ${task.type}`,
                    };
            }
        } catch (error) {
            this.deps.logger.error("鲁班执行任务失败", {
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error),
            });

            return {
                success: false,
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * 获取引擎状态
     *
     * 鲁班曰：知己知彼，百战不殆
     */
    getStatus(): EngineStatus {
        return {
            running: this.isInitialized,
            activeTasks: 0, // 鲁班当前活跃任务数
            queueSize: 0, // 鲁班队列大小
            errorCount: 0, // 鲁班错误计数
            lastActivity: new Date(),
        };
    }
}

export const lubanEngine = new LubanEngine();
export default LubanEngine;
