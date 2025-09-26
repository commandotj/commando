import type { CopyWorkerMessage } from "../../../typings/copy";
import type {
    DirectoryEntry,
    NavigationResult,
    ListDirectoryOptions,
} from "@common/types/DirectoryTypes";
import type { DriveInfo } from "@common/types/DriveTypes";

export {};

declare global {
    interface Window {
        fsApi: {
            // 目录操作 - 使用DirectoryService
            listDir: (
                path: string,
                options?: ListDirectoryOptions
            ) => Promise<DirectoryEntry[]>;

            // 目录导航
            navigate: (
                path: string,
                addToHistory?: boolean
            ) => Promise<NavigationResult>;
            getCurrentDir: () => Promise<{
                path: string;
                entries: DirectoryEntry[];
            }>;
            goToParent: () => Promise<NavigationResult>;
            getHistory: () => Promise<string[]>;
            refresh: () => Promise<DirectoryEntry[]>;

            // 目录变化监听
            onDirectoryChanged: (
                cb: (data: { path: string; entryCount: number }) => void
            ) => void;

            // 其他文件系统操作
            getHomeDir: () => string;
            listDrives: () => Promise<DriveInfo[]>;

            // 文件操作
            copyFile: (src: string, dest: string) => Promise<string>;
            copyBatch: (srcs: string[], dest: string) => Promise<string>;
            onCopyProgress: (cb: (msg: CopyWorkerMessage) => void) => void;
            onCopyBatchProgress: (cb: (msg: CopyWorkerMessage) => void) => void;
            getCopyQueueStatus: () => Promise<unknown>;
            cancelCopyTask: (taskId: string) => Promise<boolean>;
            cancelCopyBatch: (batchId: string) => Promise<boolean>;
        };
        electron: {
            ipcRenderer: {
                on: (
                    channel: string,
                    listener: (event: unknown, ...args: unknown[]) => void
                ) => void;
                removeListener: (
                    channel: string,
                    listener: (...args: unknown[]) => void
                ) => void;
            };
        };
    }
}
