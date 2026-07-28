/**
 * Professional File Engine Types
 * 专业文件引擎类型定义
 *
 * 共享类型定义，供renderer、main、preload进程使用
 */

/**
 * 文件操作进度回调接口
 * 提供详细的操作进度信息
 */
export interface FileOperationProgress {
    /** 当前处理的文件路径 */
    currentFile: string;
    /** 已处理字节数 */
    bytesProcessed: number;
    /** 总字节数 */
    totalBytes: number;
    /** 进度百分比 (0-100) */
    percentage: number;
    /** 当前操作速度 (bytes/second) */
    speed: number;
    /** 预估剩余时间 (milliseconds) */
    estimatedTimeRemaining: number;
    /** 当前操作类型 */
    operation: "copy" | "move" | "delete" | "verify";
    /** 操作开始时间 */
    startTime: number;
}

/**
 * 文件操作选项接口
 * 配置文件操作的各种参数
 */
export interface FileOperationOptions {
    /** 进度回调函数 */
    progressCallback?: (progress: FileOperationProgress) => void;
    /** 是否覆盖已存在文件 */
    overwrite?: boolean;
    /** 是否保留文件时间戳 */
    preserveTimestamps?: boolean;
    /** 是否验证文件完整性 */
    verifyIntegrity?: boolean;
    /** 缓冲区大小 (默认64KB) */
    bufferSize?: number;
    /** 最大重试次数 */
    maxRetries?: number;
    /** 重试延迟 (milliseconds) */
    retryDelay?: number;
    /** 是否启用详细日志 */
    verbose?: boolean;
}

/**
 * 批量操作选项接口
 * 继承基本操作选项，添加批量操作特有配置
 */
export interface BatchOperationOptions extends FileOperationOptions {
    /** 并发操作数量限制 */
    concurrency?: number;
    /** 是否在遇到错误时停止 */
    stopOnError?: boolean;
    /** 错误收集模式 */
    errorMode?: "collect" | "throw" | "skip";
}

/**
 * 文件操作结果接口
 * 描述单个文件操作的执行结果
 */
export interface FileOperationResult {
    /** 操作是否成功 */
    success: boolean;
    /** 源文件路径 */
    source: string;
    /** 目标文件路径 */
    destination?: string;
    /** 处理的字节数 */
    bytesProcessed: number;
    /** 操作耗时 (milliseconds) */
    duration: number;
    /** 错误信息 (如果失败) */
    error?: string;
    /** 文件校验和 (如果启用验证) */
    checksum?: string;
}

/**
 * 批量操作结果接口
 * 描述批量文件操作的汇总结果
 */
export interface BatchOperationResult {
    /** 总体操作是否成功 */
    success: boolean;
    /** 成功操作数量 */
    successCount: number;
    /** 失败操作数量 */
    failureCount: number;
    /** 总操作数量 */
    totalCount: number;
    /** 详细结果列表 */
    results: FileOperationResult[];
    /** 操作耗时 (milliseconds) */
    totalDuration: number;
    /** 错误汇总 */
    errors: string[];
}

/**
 * 文件信息接口
 * 描述文件的基本属性和元数据
 */
export interface FileInfo {
    /** 文件路径 */
    path: string;
    /** 文件大小 (bytes) */
    size: number;
    /** 是否为文件 */
    isFile: boolean;
    /** 是否为目录 */
    isDirectory: boolean;
    /** 修改时间 */
    mtime: Date;
    /** 访问时间 */
    atime: Date;
    /** 创建时间 */
    ctime: Date;
    /** 文件权限模式 */
    mode: number;
}

/**
 * 文件复制参数接口
 * 用于IPC通信的参数结构
 */
export interface FileCopyParams {
    /** 源文件路径 */
    source: string;
    /** 目标文件路径 */
    destination: string;
    /** 操作选项 */
    options?: FileOperationOptions;
}

/**
 * 批量文件复制参数接口
 * 用于IPC通信的批量操作参数结构
 */
export interface BatchFileCopyParams {
    /** 源文件路径数组 */
    sources: string[];
    /** 目标目录路径 */
    destinationDir: string;
    /** 批量操作选项 */
    options?: BatchOperationOptions;
}

/**
 * 文件移动参数接口
 * 用于IPC通信的移动操作参数结构
 */
export interface FileMoveParams {
    /** 源文件路径 */
    source: string;
    /** 目标文件路径 */
    destination: string;
    /** 操作选项 */
    options?: FileOperationOptions;
}

/**
 * 文件删除参数接口
 * 用于IPC通信的删除操作参数结构
 */
export interface FileDeleteParams {
    /** 要删除的文件路径 */
    filePath: string;
    /** 操作选项 */
    options?: FileOperationOptions;
}

/**
 * 文件验证参数接口
 * 用于IPC通信的验证操作参数结构
 */
export interface FileVerifyParams {
    /** 文件路径 */
    filePath: string;
    /** 期望的校验和（可选） */
    expectedChecksum?: string;
    /** 操作选项 */
    options?: FileOperationOptions;
}

/**
 * 文件操作类型枚举
 * 定义所有支持的文件操作类型
 */
export enum FileOperationType {
    COPY = "copy",
    MOVE = "move",
    DELETE = "delete",
    VERIFY = "verify",
    BATCH_COPY = "batch_copy",
    BATCH_MOVE = "batch_move",
    BATCH_DELETE = "batch_delete",
}

/**
 * 文件操作状态枚举
 * 定义文件操作的各种状态
 */
export enum FileOperationStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
}

/**
 * 文件操作错误类型枚举
 * 定义常见的文件操作错误类型
 */
export enum FileOperationErrorType {
    FILE_NOT_FOUND = "file_not_found",
    PERMISSION_DENIED = "permission_denied",
    DISK_FULL = "disk_full",
    INVALID_PATH = "invalid_path",
    FILE_EXISTS = "file_exists",
    CHECKSUM_MISMATCH = "checksum_mismatch",
    OPERATION_CANCELLED = "operation_cancelled",
    UNKNOWN_ERROR = "unknown_error",
}

/**
 * 扩展的文件操作结果接口
 * 包含更详细的状态和错误信息
 */
export interface ExtendedFileOperationResult extends FileOperationResult {
    /** 操作状态 */
    status: FileOperationStatus;
    /** 错误类型 */
    errorType?: FileOperationErrorType;
    /** 操作ID（用于追踪） */
    operationId?: string;
    /** 操作类型 */
    operationType: FileOperationType;
}

/**
 * 文件操作配置接口
 * 全局配置选项
 */
export interface FileEngineConfig {
    /** 默认缓冲区大小 */
    defaultBufferSize: number;
    /** 默认最大重试次数 */
    defaultMaxRetries: number;
    /** 默认重试延迟 */
    defaultRetryDelay: number;
    /** 默认并发数量 */
    defaultConcurrency: number;
    /** 是否启用进度回调 */
    enableProgressCallback: boolean;
    /** 是否启用完整性验证 */
    enableIntegrityVerification: boolean;
    /** 是否保留时间戳 */
    preserveTimestamps: boolean;
    /** 日志级别 */
    logLevel: "error" | "warn" | "info" | "debug";
}
