import { contextBridge, ipcRenderer } from "electron";
import os from "os";
import type { CopyWorkerMessage } from "../../typings/copy";
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
    onCopyProgress: (cb: (msg: CopyWorkerMessage) => void) => {
        ipcRenderer.on("copy-progress", (_event, msg) =>
            cb(msg as CopyWorkerMessage)
        );
    },
    /**
     * 监听批量复制进度事件
     */
    onCopyBatchProgress: (cb: (msg: CopyWorkerMessage) => void) => {
        ipcRenderer.on("copy-batch-progress", (_event, msg) =>
            cb(msg as CopyWorkerMessage)
        );
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
    /**
     * 取消批量复制任务
     */
    cancelCopyBatch: (batchId: string) =>
        ipcRenderer.invoke("cancel-copy-batch", batchId),
});

// Expose menuApi for listening to menu actions
contextBridge.exposeInMainWorld("menuApi", {
    onMenuAction: (callback: (action: string) => void) => {
        ipcRenderer.on("menu-action", (_event, action) => callback(action));
    },
});

export {};
