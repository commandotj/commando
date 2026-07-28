type LogLevel = "info" | "warn" | "error" | "debug";

declare global {
    interface Window {
        logApi: {
            log: (
                level: LogLevel,
                message: string,
                meta?: Record<string, unknown>
            ) => void;
        };
    }
}
