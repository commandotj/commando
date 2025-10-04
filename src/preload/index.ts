import { contextBridge, ipcRenderer } from "electron";
import type { DriveInfo } from "@common/types/DriveTypes";
import * as os from "os";
import path from "path";
import type { CopyWorkerMessage } from "../../typings/copy";
import "./logger";

contextBridge.exposeInMainWorld("fsApi", {
    // 目录操作 - 使用新的DirectoryService
    listDir: (
        path: string,
        options?: {
            includeHidden?: boolean;
            sortBy?: "name" | "size" | "mtime" | "type";
            sortOrder?: "asc" | "desc";
            includePermissions?: boolean;
        }
    ) => ipcRenderer.invoke("directory:list", { path, options }),

    // 目录导航
    navigate: (path: string, addToHistory?: boolean) =>
        ipcRenderer.invoke("directory:navigate", { path, addToHistory }),

    // 获取当前目录
    getCurrentDir: () => ipcRenderer.invoke("directory:current"),

    // 导航到父目录
    goToParent: () => ipcRenderer.invoke("directory:parent"),

    // 获取导航历史
    getHistory: () => ipcRenderer.invoke("directory:history"),

    // 刷新当前目录
    refresh: () => ipcRenderer.invoke("directory:refresh"),

    // 监听目录变化
    onDirectoryChanged: (
        cb: (data: { path: string; entryCount: number }) => void
    ) => {
        ipcRenderer.on("directory:changed", (_event, data) => cb(data));
    },

    // 服务加载状态监听（通用）
    onServiceLoading: (
        cb: (data: {
            service: string;
            loading: boolean;
            message?: string;
            error?: boolean;
            timestamp: number;
        }) => void
    ) => {
        ipcRenderer.on("service:loading", (_event, data) => cb(data));
    },

    // 驱动器事件监听
    onDriveLoading: (
        cb: (data: {
            loading: boolean;
            message?: string;
            error?: boolean;
            timestamp: number;
        }) => void
    ) => {
        ipcRenderer.on("drive:loading", (_event, data) => cb(data));
    },
    onDriveListChanged: (
        cb: (data: { drives: DriveInfo[]; timestamp: number }) => void
    ) => {
        ipcRenderer.on("drive:list:changed", (_event, data) => cb(data));
    },
    onDriveRefreshed: (
        cb: (data: { drives: DriveInfo[]; timestamp: number }) => void
    ) => {
        ipcRenderer.on("drive:refreshed", (_event, data) => cb(data));
    },
    onDriveChanged: (
        cb: (data: { drives: DriveInfo[]; timestamp: number }) => void
    ) => {
        ipcRenderer.on("drive:changed", (_event, data) => cb(data));
    },

    // 其他文件系统操作
    getHomeDir: () => os.homedir(),
    listDrives: () => ipcRenderer.invoke("drive:list"),
    refreshDrives: () => ipcRenderer.invoke("drive:refresh"),
    getDriveDetails: (device: string) =>
        ipcRenderer.invoke("drive:details", { device }),
    /**
     * 发起复制任务，支持单个，返回 taskId 或 taskId[]
     */
    copyFile: (src: string, dest: string) => {
        return ipcRenderer.invoke("copy:file", { src, dest });
    },
    /**
     * 批量复制任务，推荐新接口
     */
    copyBatch: async (srcs: string[], dest: string) => {
        const response = await ipcRenderer.invoke("copy:batch", {
            sources: srcs,
            destination: dest,
        });

        if (response && typeof response === "object" && response !== null) {
            const batchId = (response as { batchId?: unknown }).batchId;
            if (typeof batchId === "string" && batchId.length > 0) {
                return batchId;
            }
        }

        return typeof response === "string"
            ? response
            : `copy-batch-${Date.now()}`;
    },
    /**
     * Perform explicit copy operations with overwrite and rename support.
     */
    copyEntries: async (
        entries: Array<{
            source: string;
            destination: string;
            overwrite?: boolean;
        }>
    ) => {
        if (!Array.isArray(entries) || entries.length === 0) {
            return [] as Array<{
                success: boolean;
                source: string;
                destination: string;
                error?: string;
            }>;
        }

        const groups = new Map<
            string,
            Array<{
                source: string;
                destination: string;
                overwrite?: boolean;
            }>
        >();

        for (const entry of entries) {
            const destinationDir = path.dirname(entry.destination);
            const group = groups.get(destinationDir) ?? [];
            group.push(entry);
            groups.set(destinationDir, group);
        }

        const aggregatedResults: Array<{
            success: boolean;
            source: string;
            destination: string;
            error?: string;
        }> = [];

        for (const [, tasks] of groups) {
            const payload = {
                entries: tasks.map(task => ({
                    source: task.source,
                    destination: task.destination,
                    overwrite: Boolean(task.overwrite),
                })),
            };

            try {
                const response = (await ipcRenderer.invoke(
                    "copy:batch",
                    payload
                )) as {
                    results?: Array<{
                        source: string;
                        destination: string;
                        success: boolean;
                        error?: string;
                    }>;
                };

                if (response && Array.isArray(response.results)) {
                    aggregatedResults.push(...response.results);
                } else {
                    aggregatedResults.push(
                        ...tasks.map(task => ({
                            success: true,
                            source: task.source,
                            destination: task.destination,
                        }))
                    );
                }
            } catch (error) {
                aggregatedResults.push(
                    ...tasks.map(task => ({
                        success: false,
                        source: task.source,
                        destination: task.destination,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    }))
                );
            }
        }

        return aggregatedResults;
    },
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
        ipcRenderer.invoke("copy:cancel", { taskId: batchId }),
});

// Expose menuApi for listening to menu actions
contextBridge.exposeInMainWorld("menuApi", {
    onMenuAction: (callback: (action: string) => void) => {
        ipcRenderer.on("menu-action", (_event, action) => callback(action));
    },
});

export {};
