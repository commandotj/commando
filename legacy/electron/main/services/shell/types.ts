/**
 * Shell Service 类型定义
 * 定义ShellService相关的接口和类型
 */

export interface CommandExecutionOptions {
    /** 工作目录 */
    cwd?: string;
    /** 环境变量 */
    env?: Record<string, string>;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 是否异步执行 */
    async?: boolean;
    /** 是否显示输出 */
    silent?: boolean;
    /** 最大输出长度 */
    maxOutputLength?: number;
}

export interface CommandExecutionResult {
    /** 执行是否成功 */
    success: boolean;
    /** 退出码 */
    exitCode: number;
    /** 标准输出 */
    stdout: string;
    /** 标准错误 */
    stderr: string;
    /** 执行时间（毫秒） */
    duration: number;
    /** 错误信息 */
    error?: string;
    /** 进程ID */
    pid?: number;
}

export interface ProcessInfo {
    /** 进程ID */
    pid: number;
    /** 进程名称 */
    name: string;
    /** CPU使用率 */
    cpu: number;
    /** 内存使用量（字节） */
    memory: number;
    /** 启动时间 */
    startTime: Date;
    /** 命令行参数 */
    command: string;
    /** 工作目录 */
    cwd: string;
}

export interface FileOperationParams {
    /** 操作类型 */
    operation: "copy" | "move" | "delete" | "create" | "list";
    /** 源路径 */
    source: string;
    /** 目标路径 */
    destination?: string;
    /** 操作选项 */
    options?: {
        overwrite?: boolean;
        recursive?: boolean;
        preserveTimestamps?: boolean;
        verifyIntegrity?: boolean;
    };
}

export interface SecurityValidationResult {
    /** 是否安全 */
    safe: boolean;
    /** 风险等级 */
    riskLevel: "low" | "medium" | "high" | "critical";
    /** 风险描述 */
    riskDescription: string;
    /** 建议 */
    recommendation?: string;
}

export interface ShellProgress {
    /** 操作类型 */
    operation: "command" | "file-operation" | "process-management";
    /** 当前步骤 */
    currentStep: string;
    /** 进度百分比 */
    percentage: number;
    /** 已处理项目数 */
    processed: number;
    /** 总项目数 */
    total: number;
    /** 开始时间 */
    startTime: number;
    /** 预计剩余时间（毫秒） */
    estimatedTimeRemaining: number;
}
