/**
 * 司马迁日志服务 - 汉朝史学家，负责记录汉朝历史
 *
 * 司马迁思想核心：
 * - 秉笔直书：客观记录所有事件
 * - 史家精神：详细追踪系统运行
 * - 时间序列：按时间顺序记录历史
 * - 分类记录：按级别和类型组织日志
 * - 春秋笔法：简洁而深刻的记录风格
 *
 * 作为汉朝史学家，司马迁负责记录渲染进程的运行历史
 * 通过时空隧道（IPC）将历史记录发送到春秋战国（主进程）
 */

type LogLevel = "info" | "warn" | "error" | "debug";

declare global {
    interface Window {
        logApi: {
            log: (level: LogLevel, message: string, meta?: unknown) => void;
        };
    }
}

/**
 * 司马迁日志服务 - 汉朝史学家
 * 负责记录汉朝（渲染进程）的所有历史事件
 */
function emitLog(level: LogLevel, message: string, meta?: unknown): void {
    const prefixed = `[司马迁-汉朝史学家] ${message}`;
    if (window.logApi?.log) {
        window.logApi.log(level, prefixed, meta);
        return;
    }
    const writer = console[level]?.bind(console) ?? console.log.bind(console);
    if (meta !== undefined) {
        writer(prefixed, meta);
        return;
    }
    writer(prefixed);
}

const simaQianLogger = {
    info: (message: string, meta?: unknown) => emitLog("info", message, meta),
    warn: (message: string, meta?: unknown) => emitLog("warn", message, meta),
    error: (message: string, meta?: unknown) => emitLog("error", message, meta),
    debug: (message: string, meta?: unknown) => emitLog("debug", message, meta),
};

export default simaQianLogger;
