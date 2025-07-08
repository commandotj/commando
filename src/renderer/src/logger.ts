type LogLevel = "info" | "warn" | "error" | "debug";

declare global {
    interface Window {
        logApi: {
            log: (level: LogLevel, message: string, meta?: any) => void;
        };
    }
}

const logger = {
    info: (message: string, meta?: any) =>
        window.logApi.log("info", message, meta),
    warn: (message: string, meta?: any) =>
        window.logApi.log("warn", message, meta),
    error: (message: string, meta?: any) =>
        window.logApi.log("error", message, meta),
    debug: (message: string, meta?: any) =>
        window.logApi.log("debug", message, meta),
};

export default logger;
