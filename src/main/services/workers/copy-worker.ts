/**
 * Copy Worker Implementation (TypeScript)
 * Handles file copy operations in background thread
 * Uses Vite worker syntax with proper module imports
 */
import { parentPort } from "worker_threads";
import { promises as fs } from "fs";
import path from "path";

interface WorkerMessage {
    id: string;
    type: "request" | "response" | "progress" | "error";
    operation: string;
    payload?: unknown;
    timestamp: number;
}

interface WorkerRequest extends WorkerMessage {
    type: "request";
    payload: CopyFileParams | BatchCopyParams | CancelParams;
}

interface CopyFileParams {
    source: string;
    destination: string;
}

interface BatchCopyTask {
    source: string;
    destination: string;
    overwrite?: boolean;
}

interface BatchCopyParams {
    tasks: BatchCopyTask[];
}

interface CancelParams {
    taskId: string;
}

// Handle messages from main thread
parentPort?.on("message", async (message: WorkerRequest) => {
    const { id, type, operation, payload } = message;

    if (type !== "request") {
        return;
    }

    try {
        let result: unknown;

        switch (operation) {
            case "copy-file":
                result = await copyFile(
                    payload as CopyFileParams,
                    (progress: number) => {
                        parentPort?.postMessage({
                            id,
                            type: "progress",
                            operation,
                            progress,
                            timestamp: Date.now(),
                        });
                    }
                );
                break;

            case "copy-batch":
                result = await copyBatch(
                    payload as BatchCopyParams,
                    (progress: unknown) => {
                        parentPort?.postMessage({
                            id,
                            type: "progress",
                            operation,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ...(progress as any),
                            timestamp: Date.now(),
                        });
                    }
                );
                break;

            case "cancel-copy":
                result = await cancelCopy(payload as CancelParams);
                break;

            default:
                throw new Error(`Unknown operation: ${operation}`);
        }

        parentPort?.postMessage({
            id,
            type: "response",
            operation,
            result,
            timestamp: Date.now(),
        });
    } catch (error: unknown) {
        parentPort?.postMessage({
            id,
            type: "error",
            operation,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
        });
    }
});

async function copyFile(
    { source }: CopyFileParams,
    onProgress: (progress: number) => void
): Promise<unknown> {
    // Mock implementation for testing
    const stats = await fs.stat(source).catch(() => ({ size: 1024 }));

    onProgress(50);

    // Simulate copy delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In real implementation, would use fs.copyFile or streams
    // await fs.copyFile(source, destination);

    onProgress(100);

    return {
        success: true,
        copiedFiles: 1,
        totalSize: stats.size,
    };
}

async function copyBatch(
    { tasks }: BatchCopyParams,
    onProgress: (progress: unknown) => void
): Promise<unknown> {
    let copiedFiles = 0;
    const failedFiles: {
        source: string;
        destination: string;
        error: string;
    }[] = [];
    const results: Array<{
        source: string;
        destination: string;
        success: boolean;
        error?: string;
    }> = [];
    let totalSize = 0;

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const progress = Math.round(((i + 1) / tasks.length) * 100);

        try {
            const { bytesCopied } = await processCopyTask(task);
            totalSize += bytesCopied;
            copiedFiles++;

            onProgress({
                progress,
                currentItem: task.source,
                completedFiles: i + 1,
                totalFiles: tasks.length,
                detail: {
                    source: task.source,
                    destination: task.destination,
                    bytesCopied,
                    totalBytes: bytesCopied,
                    succeeded: true,
                },
            });

            results.push({
                source: task.source,
                destination: task.destination,
                success: true,
            });
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            failedFiles.push({
                source: task.source,
                destination: task.destination,
                error: errorMessage,
            });

            onProgress({
                progress,
                currentItem: task.source,
                completedFiles: i + 1,
                totalFiles: tasks.length,
                detail: {
                    source: task.source,
                    destination: task.destination,
                    error: errorMessage,
                    succeeded: false,
                },
            });

            results.push({
                source: task.source,
                destination: task.destination,
                success: false,
                error: errorMessage,
            });

            // Attempt to clean up partially copied destination on failure
            try {
                await fs.rm(task.destination, { recursive: true, force: true });
            } catch {
                // Ignore cleanup errors
            }
        }
    }

    return {
        success: failedFiles.length === 0,
        batchId: `batch-${Date.now()}`,
        totalFiles: tasks.length,
        copiedFiles,
        failedFiles,
        totalSize,
        results,
    };
}

async function processCopyTask(
    task: BatchCopyTask
): Promise<{ bytesCopied: number }> {
    const stats = await fs.lstat(task.source);

    if (stats.isDirectory()) {
        const bytesCopied = await copyDirectory(
            task.source,
            task.destination,
            task.overwrite === true
        );
        return { bytesCopied };
    }

    if (stats.isSymbolicLink()) {
        await copySymlink(
            task.source,
            task.destination,
            task.overwrite === true
        );
        return { bytesCopied: 0 };
    }

    if (stats.isFile()) {
        const bytesCopied = await copyFileWithMetadata(
            task.source,
            task.destination,
            stats,
            task.overwrite === true
        );
        return { bytesCopied };
    }

    throw new Error(`Unsupported file type: ${task.source}`);
}

async function copyFileWithMetadata(
    source: string,
    destination: string,
    stats: import("fs").Stats,
    overwrite: boolean
): Promise<number> {
    await ensureParentDirectory(destination);

    const destExists = await pathExists(destination);
    if (destExists) {
        if (!overwrite) {
            throw new Error(`Destination already exists: ${destination}`);
        }
        await fs.rm(destination, { force: true, recursive: true });
    }

    await fs.copyFile(source, destination);

    try {
        await fs.chmod(destination, stats.mode);
    } catch {
        // ignore permission errors
    }

    try {
        await fs.utimes(destination, stats.atime, stats.mtime);
    } catch {
        // ignore timestamp errors
    }

    return stats.size;
}

async function copyDirectory(
    sourceDir: string,
    destinationDir: string,
    overwrite: boolean
): Promise<number> {
    const destinationExists = await pathExists(destinationDir);
    if (destinationExists) {
        if (!overwrite) {
            throw new Error(`Destination already exists: ${destinationDir}`);
        }
        await fs.rm(destinationDir, { recursive: true, force: true });
    }

    await fs.mkdir(destinationDir, { recursive: true });
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    let totalBytes = 0;

    for (const entry of entries) {
        const srcPath = path.join(sourceDir, entry.name);
        const destPath = path.join(destinationDir, entry.name);

        if (entry.isDirectory()) {
            totalBytes += await copyDirectory(srcPath, destPath, overwrite);
        } else if (entry.isSymbolicLink()) {
            await copySymlink(srcPath, destPath, overwrite);
        } else {
            const fileStats = await fs.stat(srcPath);
            totalBytes += await copyFileWithMetadata(
                srcPath,
                destPath,
                fileStats,
                true
            );
        }
    }

    return totalBytes;
}

async function copySymlink(
    source: string,
    destination: string,
    overwrite: boolean
): Promise<void> {
    await ensureParentDirectory(destination);
    if (await pathExists(destination)) {
        if (!overwrite) {
            throw new Error(`Destination already exists: ${destination}`);
        }
        await fs.rm(destination, { recursive: true, force: true });
    }
    const linkTarget = await fs.readlink(source);
    await fs.symlink(linkTarget, destination);
}

async function ensureParentDirectory(targetPath: string): Promise<void> {
    const parent = path.dirname(targetPath);
    await fs.mkdir(parent, { recursive: true });
}

async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function cancelCopy({ taskId }: CancelParams): Promise<unknown> {
    // Mock cancellation - in real implementation would track and cancel operations
    return {
        cancelled: true,
        taskId,
    };
}
