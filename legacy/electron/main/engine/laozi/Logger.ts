import pino, { TransportSingleOptions } from "pino";
import type { Logger } from "@common/types/LoggerTypes";

/**
 * 老子日志引擎 - 基于pino构建的道家日志系统
 *
 * 老子思想核心：
 * - 道法自然：基于pino自然记录系统运行规律
 * - 无为而治：让pino自然运行，老子负责包装和协调
 * - 上善若水：如水般流畅地记录所有事件
 * - 大音希声：简洁而深刻的记录风格
 * - 道可道，非常道：记录可记录的系统状态
 *
 * 技术实现：
 * - 基于pino构建，不替换pino的核心功能
 * - 老子作为pino的包装器，添加道家思想标签
 * - 保持pino的所有性能和功能特性
 * - 与司马迁（汉朝史学家）形成史学双雄
 */

const isDev = process.env.NODE_ENV !== "production";

const transport: TransportSingleOptions | undefined = isDev
    ? {
          target: "pino-pretty",
          options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
          },
      }
    : undefined;

const baseLogger = pino({
    level: isDev ? "debug" : "info",
    transport,
    base: undefined,
});

const formatMeta = (
    meta?: Record<string, unknown>
): Record<string, unknown> | undefined =>
    meta && Object.keys(meta).length > 0 ? meta : undefined;

const wrap =
    (method: (obj: unknown, msg?: string) => void) =>
    (message: string, meta?: Record<string, unknown>): void => {
        const formattedMeta = formatMeta(meta);
        if (formattedMeta) {
            method(formattedMeta, message);
        } else {
            method(message);
        }
    };

/**
 * 老子日志引擎 - 基于pino构建的道家日志系统
 *
 * 老子思想体现在日志记录中：
 * - 道法自然：让pino自然记录系统运行规律
 * - 无为而治：不干预pino的自然记录过程
 * - 上善若水：如水般流畅地记录所有事件
 * - 大音希声：简洁而深刻的记录风格
 */
const laoziLogger: Logger = {
    info: (message: string, meta?: Record<string, unknown>) => {
        // 老子记录系统运行的自然规律
        wrap(baseLogger.info.bind(baseLogger))(
            `[老子-道法自然] ${message}`,
            meta
        );
    },
    error: (message: string, meta?: Record<string, unknown>) => {
        // 老子记录系统运行中的异常
        wrap(baseLogger.error.bind(baseLogger))(
            `[老子-道法自然] ${message}`,
            meta
        );
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
        // 老子记录系统运行中的警告
        wrap(baseLogger.warn.bind(baseLogger))(
            `[老子-道法自然] ${message}`,
            meta
        );
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
        // 老子记录系统运行的调试信息
        wrap(baseLogger.debug.bind(baseLogger))(
            `[老子-道法自然] ${message}`,
            meta
        );
    },
};

export default laoziLogger;
