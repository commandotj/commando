import * as gracefulFs from "graceful-fs"
import * as crypto from "crypto"
import type { FileOperationOptions } from "../shared/types"

export function calculateFileChecksum(filePath: string, options?: FileOperationOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256")
        const stream = gracefulFs.createReadStream(filePath)

        let bytesProcessed = 0
        const startTime = Date.now()

        if (options?.progressCallback) {
            stream.on("data", (chunk: string | Buffer) => {
                const chunkSize = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk)
                bytesProcessed += chunkSize
                options.progressCallback?.({
                    currentFile: filePath,
                    bytesProcessed,
                    totalBytes: bytesProcessed,
                    percentage: 50,
                    speed: bytesProcessed / ((Date.now() - startTime) / 1000),
                    estimatedTimeRemaining: 0,
                    operation: "verify",
                    startTime,
                })
            })
        }

        stream.on("data", (chunk: string | Buffer) => {
            hash.update(chunk)
        })

        stream.on("end", () => {
            resolve(hash.digest("hex"))
        })

        stream.on("error", reject)
    })
}
