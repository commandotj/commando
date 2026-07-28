import * as gracefulFs from "graceful-fs";
import { ENGINE_DEFAULTS } from "../shared/defaults";
import type { FileOperationOptions } from "../shared/types";

interface StreamCopyParams {
    source: string;
    destination: string;
    stats: gracefulFs.Stats;
    options: FileOperationOptions;
}

export function streamCopy({
    source,
    destination,
    stats,
    options,
}: StreamCopyParams): Promise<{ bytesProcessed: number }> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const totalBytes = stats.size;
        let bytesProcessed = 0;
        const bufferSize = options.bufferSize ?? ENGINE_DEFAULTS.BUFFER_SIZE;

        const readStream = gracefulFs.createReadStream(source, {
            highWaterMark: bufferSize,
        });
        const writeStream = gracefulFs.createWriteStream(destination, {
            highWaterMark: bufferSize,
        });

        let lastProgressTime = startTime;
        let lastBytesProcessed = 0;

        const updateProgress = (): void => {
            if (options.progressCallback && totalBytes > 0) {
                const currentTime = Date.now();
                const timeSinceLastUpdate = currentTime - lastProgressTime;
                const speed =
                    timeSinceLastUpdate > 0
                        ? (bytesProcessed - lastBytesProcessed) /
                          (timeSinceLastUpdate / 1000)
                        : 0;
                const remainingBytes = totalBytes - bytesProcessed;
                const estimatedTimeRemaining =
                    speed > 0 ? (remainingBytes / speed) * 1000 : 0;

                options.progressCallback({
                    currentFile: source,
                    bytesProcessed,
                    totalBytes,
                    percentage: (bytesProcessed / totalBytes) * 100,
                    speed,
                    estimatedTimeRemaining,
                    operation: "copy",
                    startTime,
                });

                lastProgressTime = currentTime;
                lastBytesProcessed = bytesProcessed;
            }
        };

        const handleError = (error: Error): void => {
            readStream.destroy();
            writeStream.destroy();
            gracefulFs.unlink(destination, () => undefined);
            reject(error);
        };

        readStream.on("error", handleError);
        writeStream.on("error", handleError);

        readStream.on("data", (chunk: string | Buffer) => {
            const chunkSize = Buffer.isBuffer(chunk)
                ? chunk.length
                : Buffer.byteLength(chunk);
            bytesProcessed += chunkSize;
            updateProgress();
        });

        writeStream.on("finish", () => {
            updateProgress();
            resolve({ bytesProcessed });
        });

        readStream.pipe(writeStream);
    });
}
