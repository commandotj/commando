import { ipcMain } from "electron"
import logger from "./log/logger"

export function registerIpcHandlers(): void {
    // IPC handler for directory listing is now handled by DirectoryService
    // The directory:list channel is automatically registered by DirectoryService

    // IPC handler for drive operations is now handled by DriveService
    // The drive:list, drive:details, drive:refresh channels are automatically registered by DriveService

    // IPC handler for copy operations is now handled by CopyService
    // The copy:file, copy:batch, copy:cancel channels are automatically registered by CopyService

    // Window management is now handled by WindowService
    // The window:* channels are automatically registered by WindowService

    // 日志 handler：接收渲染进程日志，归档到主进程
    ipcMain.handle("log:message", (_event, { level, message, meta }) => {
        if (typeof logger[level] === "function") {
            logger[level](message, meta)
        } else {
            logger.info(message, meta)
        }
    })
}
