/**
 * 孔子组合器 - 时空通道协调者之组装器
 *
 * 孔子思想体现在组合器中：
 * - 有教无类：统一管理诸子百家之组装
 * - 因材施教：根据诸子百家特点配置合适之依赖
 * - 循序渐进：按依赖关系顺序组装诸子百家
 * - 学而时习：持续优化诸子百家组合
 * - 时空协调：管理诸子百家间之通信和依赖关系
 */

import type { BaseEngine } from "./EngineManager";
// import type { Logger } from "@common/types/LoggerTypes";
import { laoziLoggerService } from "../laozi/Service";

// 诸子百家依赖配置
export interface EngineDependencyConfig {
    name: string;
    dependencies: string[];
    services: {
        logging?: boolean;
        // 可扩展其他标准服务
    };
}

// 诸子百家通信配置
export interface EngineCommunicationConfig {
    from: string;
    to: string;
    method: "direct" | "through-kongzi";
    messageType: string;
}

// 孔子组合器配置
export interface ComposerConfig {
    engines: EngineDependencyConfig[];
    communications: EngineCommunicationConfig[];
    standardServices: {
        logging: boolean;
    };
}

/**
 * 孔子组合器 - 负责召集管理诸子百家
 *
 * 孔子曰：有教无类，统一管理诸子百家之召集也
 */
export class Composer {
    private readonly config: ComposerConfig;
    private readonly engines = new Map<string, BaseEngine>();

    constructor(config: ComposerConfig) {
        this.config = config;
    }

    /**
     * 召集诸子百家 - 根据配置召集所有诸子百家
     *
     * 孔子曰：循序渐进，按依赖关系排序诸子百家也
     */
    async assembleEngines(): Promise<Map<string, BaseEngine>> {
        // 1. 按依赖关系排序诸子百家
        const sortedEngines = this.sortEnginesByDependencies();

        // 2. 按顺序初始化诸子百家
        for (const engineConfig of sortedEngines) {
            await this.assembleEngine(engineConfig);
        }

        return this.engines;
    }

    /**
     * 召集单个诸子百家 - 根据配置召集诸子百家及其依赖
     *
     * 孔子曰：因材施教，根据诸子百家特点配置合适之依赖也
     */
    private async assembleEngine(
        config: EngineDependencyConfig
    ): Promise<void> {
        // 获取诸子百家实例（这里需要根据实际诸子百家类型创建）
        const engine = await this.createEngine(config);

        // 配置标准服务依赖
        if (config.services.logging) {
            await this.configureLoggingService(engine, config.name);
        }

        // 注册诸子百家
        this.engines.set(config.name, engine);

        // 通过老子记录诸子百家召集
        const laoziLogger = laoziLoggerService.forEngine(config.name);
        laoziLogger.info(`孔子曰：有教无类，今已召集${config.name}也`);
    }

    /**
     * 配置日志服务 - 为诸子百家配置老子日志服务
     *
     * 孔子曰：诸子百家不能直接访问老子，必须通过孔子协调也
     */
    private async configureLoggingService(
        _engine: BaseEngine,
        engineName: string
    ): Promise<void> {
        // 这里可以配置诸子百家之日志服务
        // 但诸子百家不能直接访问老子，必须通过孔子协调
        const laoziLogger = laoziLoggerService.forEngine(engineName);
        laoziLogger.info(`孔子曰：因材施教，今为${engineName}配置日志服务也`);
    }

    /**
     * 创建诸子百家实例 - 根据配置创建诸子百家
     *
     * 孔子曰：学而时习，持续优化诸子百家组合也
     */
    private async createEngine(
        config: EngineDependencyConfig
    ): Promise<BaseEngine> {
        // 根据诸子百家名称创建对应实例
        switch (config.name) {
            // case "LaoziEngine":
            //     // 老子引擎 - 日志记录引擎（暂未实现独立Engine，使用LaoziLoggerService）
            //     const { default: LaoziEngine } = await import(
            //         "../laozi/LaoziEngine"
            //     );
            //     return new LaoziEngine();

            case "LubanEngine":
                // 鲁班引擎 - 文件操作引擎
                const { LubanEngine } = await import("../luban/Engine");
                return new LubanEngine();

            case "MoziEngine":
                // 墨子引擎 - 文件同步引擎
                const { MoziEngine } = await import("../mozi/Engine");
                return new MoziEngine();

            case "ZoujiEngine":
                // 邹忌引擎 - Diff引擎
                const { ZoujiEngine } = await import("../zouji/Engine");
                return new ZoujiEngine();

            case "ZuoqiumingEngine":
                // 左丘明引擎 - Git版本控制引擎
                const { ZuoqiumingEngine } =
                    await import("../zuoqiuming/Engine");
                return new ZuoqiumingEngine();

            default:
                throw new Error(`未知之诸子百家: ${config.name}`);
        }
    }

    /**
     * 按依赖关系排序诸子百家
     *
     * 孔子曰：循序渐进，按依赖关系排序诸子百家也
     */
    private sortEnginesByDependencies(): EngineDependencyConfig[] {
        const sorted: EngineDependencyConfig[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (config: EngineDependencyConfig) => {
            if (visiting.has(config.name)) {
                throw new Error(`循环依赖检测到: ${config.name}`);
            }
            if (visited.has(config.name)) {
                return;
            }

            visiting.add(config.name);

            // 先处理依赖
            for (const depName of config.dependencies) {
                const depConfig = this.config.engines.find(
                    e => e.name === depName
                );
                if (depConfig) {
                    visit(depConfig);
                }
            }

            visiting.delete(config.name);
            visited.add(config.name);
            sorted.push(config);
        };

        for (const engineConfig of this.config.engines) {
            visit(engineConfig);
        }

        return sorted;
    }

    /**
     * 配置诸子百家通信 - 设置诸子百家间之通信方式
     *
     * 孔子曰：时空协调，管理诸子百家间之通信和依赖关系也
     */
    configureEngineCommunication(): void {
        for (const commConfig of this.config.communications) {
            if (commConfig.method === "through-kongzi") {
                // 通过孔子协调之通信
                this.setupKongziMediatedCommunication(commConfig);
            } else {
                // 直接通信（需要谨慎使用）
                this.setupDirectCommunication(commConfig);
            }
        }
    }

    /**
     * 设置孔子协调之通信
     *
     * 孔子曰：有教无类，统一管理诸子百家之通信也
     */
    private setupKongziMediatedCommunication(
        config: EngineCommunicationConfig
    ): void {
        // 孔子作为中介者，协调诸子百家间通信
        const laoziLogger = laoziLoggerService.forEngine("KongziComposer");
        laoziLogger.info(
            `孔子曰：有教无类，今设置${config.from}至${config.to}之协调通信也`
        );
    }

    /**
     * 设置直接通信
     *
     * 孔子曰：直接通信需要谨慎使用，可能违反时空架构也
     */
    private setupDirectCommunication(config: EngineCommunicationConfig): void {
        // 直接通信（需要谨慎使用，可能违反时空架构）
        const laoziLogger = laoziLoggerService.forEngine("KongziComposer");
        laoziLogger.warn(
            `孔子曰：直接通信需谨慎，今设置${config.from}至${config.to}也（慎用）`
        );
    }

    /**
     * 获取诸子百家实例
     *
     * 孔子曰：因材施教，根据诸子百家特点获取合适之实例也
     */
    getEngine(name: string): BaseEngine | undefined {
        return this.engines.get(name);
    }

    /**
     * 获取所有诸子百家
     *
     * 孔子曰：有教无类，统一管理所有诸子百家也
     */
    getAllEngines(): Map<string, BaseEngine> {
        return this.engines;
    }
}
