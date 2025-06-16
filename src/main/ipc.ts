import { ipcMain, BrowserWindow } from "electron";
import { listDirSync } from "./listDir";
import { listDrives } from "./drive";
import {
    addCopyTask,
    getCopyQueueStatus,
    cancelCopyTask,
} from "./workerManager";

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
            return [];
        }
    });

    // IPC handler for listing drives
    ipcMain.handle("list-drives", async () => {
        return await listDrives();
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
}
