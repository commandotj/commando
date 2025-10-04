import { ENGINE_DEFAULTS } from "../shared/defaults"
import type { BatchOperationOptions, FileOperationOptions } from "../shared/types"

export function mergeDefaultOptions(options: FileOperationOptions): FileOperationOptions {
    return {
        overwrite: false,
        preserveTimestamps: true,
        verifyIntegrity: false,
        bufferSize: ENGINE_DEFAULTS.BUFFER_SIZE,
        maxRetries: ENGINE_DEFAULTS.MAX_RETRIES,
        retryDelay: ENGINE_DEFAULTS.RETRY_DELAY,
        verbose: false,
        ...options,
    }
}

export function mergeBatchOptions(options: BatchOperationOptions): BatchOperationOptions {
    return {
        ...mergeDefaultOptions(options),
        concurrency: ENGINE_DEFAULTS.CONCURRENCY,
        stopOnError: false,
        errorMode: "collect",
        ...options,
    }
}
