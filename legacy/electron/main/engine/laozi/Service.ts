/**
 * 老子日志服务 - 基于pino构建的道家日志系统
 *
 * 老子思想体现在日志服务中：
 * - 道法自然：让pino自然记录系统运行规律
 * - 无为而治：不干预pino的自然记录过程
 * - 上善若水：如水般流畅地记录所有事件
 * - 大音希声：简洁而深刻的记录风格
 *
 * 作为春秋战国道家创始人，老子为所有引擎提供日志记录服务
 * 与司马迁（汉朝史学家）形成史学双雄
 */

import type { Logger } from "@common/types/LoggerTypes";
import logger from "./Logger";

export interface LoggerServiceDeps {
    logger?: Logger;
}

/**
 * 老子日志服务 - 为所有引擎提供统一的日志记录服务
 */
export class LoggerService {
    private readonly logger: Logger;
    // Deps for future extension
    // private readonly deps: LoggerServiceDeps;

    constructor(deps: LoggerServiceDeps = {}) {
        // this.deps = deps;
        this.logger = deps.logger || logger;
    }

    /**
     * 老子记录系统运行的自然规律
     */
    info(message: string, meta?: Record<string, unknown>): void {
        this.logger.info(`[老子-道法自然] ${message}`, meta);
    }

    /**
     * 老子记录系统运行中的异常
     */
    error(message: string, meta?: Record<string, unknown>): void {
        this.logger.error(`[老子-道法自然] ${message}`, meta);
    }

    /**
     * 老子记录系统运行中的警告
     */
    warn(message: string, meta?: Record<string, unknown>): void {
        this.logger.warn(`[老子-道法自然] ${message}`, meta);
    }

    /**
     * 老子记录系统运行的调试信息
     */
    debug(message: string, meta?: Record<string, unknown>): void {
        this.logger.debug(`[老子-道法自然] ${message}`, meta);
    }

    /**
     * 老子为特定引擎记录日志
     */
    forEngine(engineName: string): LoggerService {
        return new LoggerService({
            logger: {
                info: (message: string, meta?: Record<string, unknown>) => {
                    this.logger.info(
                        `[老子-道法自然-${engineName}] ${message}`,
                        meta
                    );
                },
                error: (message: string, meta?: Record<string, unknown>) => {
                    this.logger.error(
                        `[老子-道法自然-${engineName}] ${message}`,
                        meta
                    );
                },
                warn: (message: string, meta?: Record<string, unknown>) => {
                    this.logger.warn(
                        `[老子-道法自然-${engineName}] ${message}`,
                        meta
                    );
                },
                debug: (message: string, meta?: Record<string, unknown>) => {
                    this.logger.debug(
                        `[老子-道法自然-${engineName}] ${message}`,
                        meta
                    );
                },
            },
        });
    }
}

// 导出单例实例
export const laoziLoggerService = new LoggerService();
