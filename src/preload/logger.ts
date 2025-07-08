import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("logApi", {
    log: (
        level: "info" | "warn" | "error" | "debug",
        message: string,
        meta?: unknown
    ) => {
        ipcRenderer.invoke("log:message", { level, message, meta });
    },
});
