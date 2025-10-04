/**
 * 引擎通用类型声明
 */

export interface FileOperationProgress {
    currentFile: string
    bytesProcessed: number
    totalBytes: number
    percentage: number
    speed: number
    estimatedTimeRemaining: number
    operation: "copy" | "move" | "delete" | "verify"
    startTime: number
}

export interface FileOperationOptions {
    progressCallback?: (progress: FileOperationProgress) => void
    overwrite?: boolean
    preserveTimestamps?: boolean
    verifyIntegrity?: boolean
    bufferSize?: number
    maxRetries?: number
    retryDelay?: number
    verbose?: boolean
}

export interface BatchOperationOptions extends FileOperationOptions {
    concurrency?: number
    stopOnError?: boolean
    errorMode?: "collect" | "throw" | "skip"
}

export interface FileOperationResult {
    success: boolean
    source: string
    destination?: string
    bytesProcessed: number
    duration: number
    error?: string
    checksum?: string
}

export interface BatchOperationResult {
    success: boolean
    successCount: number
    failureCount: number
    totalCount: number
    results: FileOperationResult[]
    totalDuration: number
    errors: string[]
}
