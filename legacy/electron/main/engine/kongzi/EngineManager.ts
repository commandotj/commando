/**
 * 孔子引擎管理器 - 时空通道协调者，负责所有IPC通信和引擎协调
 *
 * 孔子思想核心：
 * - 有教无类：统一管理所有引擎和IPC通道
 * - 因材施教：根据任务特点选择合适的引擎
 * - 循序渐进：按优先级和依赖关系安排任务
 * - 学而时习：定期监控改进
 * - 时空协调：作为汉朝与春秋战国的桥梁，处理所有跨时空通信
 *
 * 管理的春秋战国诸子百家：
 * - 鲁班：工匠精神，文件引擎
 * - 墨子：兼爱非攻，文件同步引擎
 * - 邹忌：谏言纳谏，Diff引擎
 * - 左丘明：春秋史学家，Git版本控制
 * - 老子：道家创始人，日志记录引擎
 */

import type { Logger } from "@common/types/LoggerTypes";
import { logger } from "../laozi";
import { Composer } from "./Composer";
import { defaultKongziComposerConfig } from "./ComposerConfig";
import { CopyStatusManager } from "./CopyStatusManager";

export interface BaseEngine {
    name: string;
    version: string;
    capabilities: EngineCapability[];
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    executeTask(task: EngineTask): Promise<EngineResult>;
    getStatus(): EngineStatus;
}

export interface EngineCapability {
    type: "file_operation" | "sync" | "comparison" | "version_control";
    operations: string[];
    constraints?: {
        maxFileSize?: number;
        supportedFormats?: string[];
        performance?: "high" | "medium" | "low";
    };
}

export interface EngineTask {
    id: string;
    type: "copy" | "move" | "delete" | "sync" | "compare" | "commit";
    priority: number;
    source?: string | string[];
    destination?: string;
    options?: Record<string, unknown>;
    progressCallback?: (progress: TaskProgress) => void;
}

export interface EngineResult {
    success: boolean;
    taskId: string;
    data?: unknown;
    error?: string;
    metrics?: {
        duration: number;
        bytesProcessed?: number;
        filesProcessed?: number;
    };
}

export interface EngineStatus {
    running: boolean;
    activeTasks: number;
    queueSize: number;
    errorCount: number;
    lastActivity: Date;
}

export interface TaskProgress {
    taskId: string;
    percentage: number;
    currentFile?: string;
    totalFiles?: number;
    processedFiles?: number;
    bytesTransferred?: number;
    totalBytes?: number;
    speed?: number;
    eta?: number;
    message?: string;
}

export interface EngineManagerDeps {
    logger: Logger;
}

/**
 * 孔子引擎管理器
 *
 * 核心哲学：
 * - 有教无类：统一接口管理所有引擎
 * - 因材施教：智能选择最适合的引擎
 * - 循序渐进：合理安排任务执行顺序
 * - 学而时习：定期监控改进
 */
export class EngineManager {
    private readonly engines = new Map<string, BaseEngine>();
    private readonly deps: EngineManagerDeps;
    private readonly composer: Composer;
    private readonly statusManager: CopyStatusManager;

    constructor(deps: EngineManagerDeps = { logger }) {
        this.deps = deps;
        this.composer = new Composer(defaultKongziComposerConfig);
        this.statusManager = new CopyStatusManager(deps.logger);
    }

    /**
     * 初始化组合器 - 孔子组装春秋战国诸子百家
     */
    async initializeComposer(): Promise<void> {
        this.deps.logger.info("孔子开始组装春秋战国诸子百家");
        const assembledEngines = await this.composer.assembleEngines();

        // 将组合器组装的引擎添加到管理器
        for (const [name, engine] of assembledEngines) {
            this.engines.set(name, engine);
        }

        // 配置引擎通信
        this.composer.configureEngineCommunication();

        this.deps.logger.info("孔子完成春秋战国诸子百家组装");
    }

    /**
     * 注册引擎 - 孔子管理春秋战国诸子百家
     */
    registerEngine(engine: BaseEngine): void {
        this.engines.set(engine.name, engine);
        this.deps.logger.info(`引擎已注册: ${engine.name} v${engine.version}`);
    }

    /**
     * 移除引擎
     */
    unregisterEngine(name: string): void {
        const engine = this.engines.get(name);
        if (engine) {
            this.engines.delete(name);
            this.deps.logger.info(`引擎已移除: ${name}`);
        }
    }

    /**
     * 获取所有引擎
     */
    getEngines(): BaseEngine[] {
        return Array.from(this.engines.values());
    }

    /**
     * 根据任务选择最适合的引擎
     */
    selectEngine(task: EngineTask): BaseEngine | null {
        const candidates = this.getEngines().filter(engine =>
            engine.capabilities.some(
                cap => cap.type === this.mapTaskToCapability(task.type)
            )
        );

        if (candidates.length === 0) {
            return null;
        }

        // 选择第一个匹配的引擎（可以增加更复杂的选择逻辑）
        return candidates[0];
    }

    /**
     * 执行任务
     */
    async executeTask(task: EngineTask): Promise<EngineResult> {
        const engine = this.selectEngine(task);
        if (!engine) {
            return {
                success: false,
                taskId: task.id,
                error: `没有找到支持 ${task.type} 操作的引擎`,
            };
        }

        this.deps.logger.info(`任务 ${task.id} 分配给引擎 ${engine.name}`);

        try {
            return await engine.executeTask(task);
        } catch (error) {
            this.deps.logger.error(`引擎 ${engine.name} 执行任务失败`, {
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
     * 初始化所有引擎
     */
    async initialize(): Promise<void> {
        // 首先组装诸子百家
        await this.initializeComposer();

        // IPC处理器注册已移到 KongziService，由 ServiceDecorator 自动处理
        // registerIpcHandlers() 已废弃，避免重复注册冲突

        for (const engine of this.engines.values()) {
            try {
                await engine.initialize();
                this.deps.logger.info(`引擎 ${engine.name} 初始化成功`);
            } catch (error) {
                this.deps.logger.error(`引擎 ${engine.name} 初始化失败`, {
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    /**
     * 清理所有引擎
     */
    async cleanup(): Promise<void> {
        for (const engine of this.engines.values()) {
            try {
                await engine.cleanup();
                this.deps.logger.info(`引擎 ${engine.name} 清理完成`);
            } catch (error) {
                this.deps.logger.error(`引擎 ${engine.name} 清理失败`, {
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    private mapTaskToCapability(taskType: string): EngineCapability["type"] {
        switch (taskType) {
            case "copy":
            case "move":
            case "delete":
                return "file_operation";
            case "sync":
                return "sync";
            case "compare":
                return "comparison";
            case "commit":
                return "version_control";
            default:
                return "file_operation";
        }
    }
}
