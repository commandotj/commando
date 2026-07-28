import * as gracefulFs from "graceful-fs";
import path from "path";
import type { FileOperationOptions } from "../shared/types";
import type { Logger } from "../../../common/types/LoggerTypes";

export interface PerformFileOperationDeps {
    logger: Logger;
    ensureDirectoryExists: (dirPath: string) => Promise<void>;
    streamCopy: (params: {
        source: string;
        destination: string;
        stats: gracefulFs.Stats;
        options: FileOperationOptions;
    }) => Promise<{
        bytesProcessed: number;
    }>;
    calculateChecksum: (filePath: string) => Promise<string>;
    sleep: (ms: number) => Promise<void>;
    defaults: {
        maxRetries: number;
        retryDelay: number;
    };
}

interface PerformFileOperationParams {
    source: string;
    destination: string;
    options: FileOperationOptions;
    deps: PerformFileOperationDeps;
}

export async function performFileOperation({
    source,
    destination,
    options,
    deps,
}: PerformFileOperationParams): Promise<{
    bytesProcessed: number;
    checksum?: string;
}> {
    const {
        logger,
        ensureDirectoryExists,
        streamCopy,
        calculateChecksum,
        sleep,
        defaults,
    } = deps;
    let lastError: Error | null = null;
    const maxRetries = options.maxRetries ?? defaults.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const delay =
                    (options.retryDelay ?? defaults.retryDelay) *
                    Math.pow(2, attempt - 1);
                if (options.verbose) {
                    logger.info(
                        `文件操作重试 (${attempt}/${maxRetries}): ${source} -> ${destination}, delay: ${delay}ms, lastError: ${lastError?.message}`
                    );
                }
                await sleep(delay);
            }

            await ensureDirectoryExists(path.dirname(destination));

            const sourceStats = await gracefulFs.promises.stat(source);
            if (!sourceStats.isFile()) {
                throw new Error(`源路径不是文件: ${source}`);
            }

            if (!options.overwrite) {
                try {
                    await gracefulFs.promises.access(destination);
                    throw new Error(`目标文件已存在: ${destination}`);
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                        throw error;
                    }
                }
            }

            const copyResult = await streamCopy({
                source,
                destination,
                stats: sourceStats,
                options,
            });

            let checksum: string | undefined;
            if (options.verifyIntegrity) {
                const sourceChecksum = await calculateChecksum(source);
                const destChecksum = await calculateChecksum(destination);
                if (sourceChecksum !== destChecksum) {
                    throw new Error(
                        `文件完整性验证失败: 源文件 ${sourceChecksum} != 目标文件 ${destChecksum}`
                    );
                }
                checksum = destChecksum;
            }

            if (options.preserveTimestamps) {
                await gracefulFs.promises.utimes(
                    destination,
                    sourceStats.atime,
                    sourceStats.mtime
                );
            }

            return {
                bytesProcessed: copyResult.bytesProcessed,
                checksum,
            };
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error));
            if (attempt === maxRetries) {
                throw lastError;
            }
        }
    }

    throw lastError ?? new Error("未知错误");
}
