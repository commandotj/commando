import { ipcMain, BrowserWindow } from "electron";
import { listDirSync } from "./listDir";
import { listDrives } from "./drive";
import {
    addCopyTask,
    getCopyQueueStatus,
    cancelCopyTask,
} from "./workerManager";
import logger from "./logger";

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
    // IPC handler for directory listing
    ipcMain.handle("list-dir", async (_event, dirPath) => {
        try {
            return listDirSync(dirPath);
        } catch (err) {
            logger.error("list-dir 失败", {
                time: new Date().toISOString(),
                error: err instanceof Error ? err.message : String(err),
            });
            return [];
        }
    });

    // IPC handler for listing drives
    ipcMain.handle("list-drives", async () => {
        const start = Date.now();
        try {
            const drives = await listDrives();
            const durationMs = Date.now() - start;
            logger.info("list-drives 请求", {
                time: new Date().toISOString(),
                count: drives.length,
                durationMs,
            });
            return drives;
        } catch (err) {
            logger.error("list-drives 失败", {
                time: new Date().toISOString(),
                error: err instanceof Error ? err.message : String(err),
            });
            return [];
        }
    });

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
        return addCopyTask({ src, dest }, event);
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
}
