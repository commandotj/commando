import { contextBridge, ipcRenderer } from "electron";
import os from "os";
import "./logger";

contextBridge.exposeInMainWorld("fsApi", {
    listDir: (path: string) => ipcRenderer.invoke("list-dir", path),
    getHomeDir: () => os.homedir(),
    listDrives: () => ipcRenderer.invoke("list-drives"),
    /**
     * 发起复制任务，支持单个，返回 taskId 或 taskId[]
     */
    copyFile: (src: string, dest: string) => {
        return ipcRenderer.invoke("copy-file", { src, dest });
    },
    /**
     * 批量复制任务，推荐新接口
     */
    copyBatch: (srcs: string[], dest: string) =>
        ipcRenderer.invoke("copy-batch", { srcs, dest }),
    /**
     * 监听复制进度事件（多任务支持，msg 带 taskId）
     */
    onCopyProgress: (cb: (msg: ProgressMsg | DoneMsg | ErrorMsg) => void) => {
        ipcRenderer.on("copy-progress", (_event, msg) => cb(msg));
    },
    /**
     * 监听批量复制进度事件
     */
    onCopyBatchProgress: (
        cb: (msg: ProgressMsg | DoneMsg | ErrorMsg) => void
    ) => {
        ipcRenderer.on("copy-batch-progress", (_event, msg) => cb(msg));
    },
    /**
     * 查询复制队列状态
     */
    getCopyQueueStatus: () => ipcRenderer.invoke("get-copy-queue-status"),
    /**
     * 取消复制任务（需主进程支持）
     */
    cancelCopyTask: (taskId: string) =>
        ipcRenderer.invoke("cancel-copy-task", taskId),
});

// Expose menuApi for listening to menu actions
contextBridge.exposeInMainWorld("menuApi", {
    onMenuAction: (callback: (action: string) => void) => {
        ipcRenderer.on("menu-action", (_event, action) => callback(action));
    },
});

export {};
