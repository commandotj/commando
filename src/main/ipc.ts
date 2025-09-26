import { ipcMain, BrowserWindow } from "electron";
import {
    addCopyTask,
    getCopyQueueStatus,
    cancelCopyTask,
} from "./workerManager";
import logger from "./log/logger";
import { batchCopy, cancelBatchCopy } from "./batchCopyService";

export function registerIpcHandlers({
    preload,
    url,
    indexHtml,
    env,
}: {
    preload: string;
    url: string;
    indexHtml: string;
    env: Record<string, string>;
}): void {
    // IPC handler for directory listing is now handled by DirectoryService
    // The directory:list channel is automatically registered by DirectoryService

    // IPC handler for drive operations is now handled by DriveService
    // The drive:list, drive:details, drive:refresh channels are automatically registered by DriveService

    // New window example arg: new windows url
    ipcMain.handle("open-win", (_, arg) => {
        const childWindow = new BrowserWindow({
            webPreferences: {
                preload,
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
            },
        });

        if (env.VITE_DEV_SERVER_URL) {
            childWindow.loadURL(`${url}#${arg}`);
        } else {
            childWindow.loadFile(indexHtml, { hash: arg });
        }
    });

    // 复制请求 handler（队列化，返回 taskId）
    ipcMain.handle("copy-file", (event, { src, dest }) => {
        // 参数校验可根据需要补充
        return addCopyTask({ params: { src, dest }, event });
    });

    // 查询复制队列状态 handler
    ipcMain.handle("get-copy-queue-status", () => {
        return getCopyQueueStatus();
    });

    // 取消复制任务 handler
    ipcMain.handle("cancel-copy-task", (_event, taskId) => {
        cancelCopyTask(taskId);
        return true;
    });

    // 日志 handler：接收渲染进程日志，归档到主进程
    ipcMain.handle("log:message", (_event, { level, message, meta }) => {
        if (typeof logger[level] === "function") {
            logger[level](message, meta);
        } else {
            logger.info(message, meta);
        }
    });

    // 批量复制请求 handler（队列化，返回 batchId）
    ipcMain.handle("copy-batch", async (event, { srcs, dest }) => {
        // 参数校验
        if (!Array.isArray(srcs) || typeof dest !== "string") {
            throw new Error("Invalid parameters for copy-batch");
        }
        // 分发给 batchCopyService 处理
        return batchCopy({ srcs, dest, event });
    });

    // 取消批量复制任务 handler
    ipcMain.handle("cancel-copy-batch", (_event, batchId: string) => {
        if (typeof batchId === "string") {
            cancelBatchCopy(batchId);
            return true;
        }
        return false;
    });
}
