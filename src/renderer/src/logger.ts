type LogLevel = "info" | "warn" | "error" | "debug";

declare global {
  interface Window {
    logApi: {
      log: (level: LogLevel, message: string, meta?: unknown) => void;
    };
  }
}

const logger = {
  info: (message: string, meta?: unknown) =>
    window.logApi.log("info", message, meta),
  warn: (message: string, meta?: unknown) =>
    window.logApi.log("warn", message, meta),
  error: (message: string, meta?: unknown) =>
    window.logApi.log("error", message, meta),
  debug: (message: string, meta?: unknown) =>
    window.logApi.log("debug", message, meta),
};

export default logger;
