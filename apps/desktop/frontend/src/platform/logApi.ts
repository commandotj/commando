type LogLevel = "info" | "warn" | "error" | "debug";

const CONSOLE_BY_LEVEL: Record<LogLevel, (message?: unknown, ...args: unknown[]) => void> = {
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

export function installLogApi(): void {
  window.logApi = {
    log: (level: LogLevel, message: string, meta?: unknown) => {
      const writer = CONSOLE_BY_LEVEL[level] ?? console.log.bind(console);
      if (meta !== undefined) {
        writer(`[renderer] ${message}`, meta);
        return;
      }
      writer(`[renderer] ${message}`);
    },
  };
}
