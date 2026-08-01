import type { CopyWorkerMessage } from "@commandojs/shared/types/CopyTypes";
import type {
    CompareReport,
    SyncExportFormat,
    SyncOptions,
    SyncStrategyId,
} from "@commandojs/shared/types/SyncTypes";
import type {
    DirectoryEntry,
    NavigationResult,
    ListDirectoryOptions,
} from "@commandojs/shared/types/DirectoryTypes";
import type { DriveInfo } from "@commandojs/shared/types/DriveTypes";

export {};

declare global {
    interface Window {
        logApi: {
            log: (
                level: "info" | "warn" | "error" | "debug",
                message: string,
                meta?: unknown
            ) => void;
        };
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
            refreshDrives: () => Promise<DriveInfo[]>;
            getDriveDetails: (device: string) => Promise<DriveInfo>;

            // 服务加载状态监听（通用）
            onServiceLoading: (
                cb: (data: {
                    service: string;
                    loading: boolean;
                    message?: string;
                    error?: boolean;
                    timestamp: number;
                }) => void
            ) => void;

            // 驱动器事件监听
            onDriveLoading: (
                cb: (data: {
                    loading: boolean;
                    message?: string;
                    error?: boolean;
                    timestamp: number;
                }) => void
            ) => void;
            onDriveListChanged: (
                cb: (data: { drives: DriveInfo[]; timestamp: number }) => void
            ) => void;
            onDriveRefreshed: (
                cb: (data: { drives: DriveInfo[]; timestamp: number }) => void
            ) => void;
            onDriveChanged: (
                cb: (data: { drives: DriveInfo[]; timestamp: number }) => void
            ) => void;

            // 文件操作
            copyFile: (src: string, dest: string) => Promise<string>;
            copyBatch: (srcs: string[], dest: string) => Promise<string>;
            copyEntries: (
                entries: Array<{
                    source: string;
                    destination: string;
                    overwrite?: boolean;
                }>
            ) => Promise<
                Array<{
                    success: boolean;
                    source: string;
                    destination: string;
                    bytesProcessed?: number;
                    duration?: number;
                    checksum?: string;
                    error?: string;
                }>
            >;
            onCopyProgress: (cb: (msg: CopyWorkerMessage) => void) => void;
            onCopyBatchProgress: (cb: (msg: CopyWorkerMessage) => void) => void;
            getCopyQueueStatus: () => Promise<unknown>;
            cancelCopyTask: (taskId: string) => Promise<unknown>;
            cancelCopyBatch: (
                batchId: string
            ) => Promise<{ cancelled: boolean; taskId: string }>;
        };
        syncApi: {
            plan: (req: {
                leftRoot: string;
                rightRoot: string;
                strategyId: SyncStrategyId;
                direction?: string;
                options?: {
                    deleteExtraneous?: boolean;
                    dryRun?: boolean;
                    useChecksum?: boolean;
                };
            }) => Promise<{ jobId: string }>;
            compare: (req: {
                leftRoot: string;
                rightRoot: string;
                strategyId: SyncStrategyId;
                direction?: string;
                options?: {
                    deleteExtraneous?: boolean;
                    dryRun?: boolean;
                    useChecksum?: boolean;
                };
            }) => Promise<{ jobId: string }>;
            exportReport: (req: {
                report: CompareReport;
                filePath: string;
                format?: SyncExportFormat;
            }) => Promise<{ filePath: string }>;
            execute: (
                plan: unknown,
                opts: SyncOptions
            ) => Promise<{ jobId: string }>;
            cancel: (
                jobId: string
            ) => Promise<{ cancelled?: boolean; jobId?: string } | null>;
            onProgress: (
                cb: (payload: {
                    jobId?: string;
                    type?: string;
                    status?: string;
                    result?: unknown;
                    error?: string;
                }) => void
            ) => void;
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
