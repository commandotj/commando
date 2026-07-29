import type { CopyWorkerMessage } from "@commandojs/shared/types/CopyTypes";
import type {
    DirectoryEntry,
    ListDirectoryOptions,
    NavigationResult,
} from "@commandojs/shared/types/DirectoryTypes";
import type { DriveInfo } from "@commandojs/shared/types/DriveTypes";
import { Events } from "@wailsio/runtime";
import { WAILS_EVENTS } from "./constants";

type WailsFileService = {
    ListDir: (
        path: string,
        options: ListDirectoryOptions
    ) => Promise<DirectoryEntry[]>;
    Navigate: (
        path: string,
        addToHistory: boolean
    ) => Promise<NavigationResult>;
    GetHomeDir: () => Promise<string>;
    GoToParent: (path: string) => Promise<NavigationResult>;
};

type WailsCopyService = {
    CopyBatch: (
        sources: string[],
        destination: string
    ) => PromiseLike<{ batchId: string }>;
    CancelCopyBatch: (
        batchId: string
    ) => PromiseLike<{ cancelled?: boolean; taskId?: string } | null>;
    GetCopyQueueStatus: () => PromiseLike<{ queueSize?: number } | null>;
};

type WailsDriveService = {
    ListDrives: () => Promise<DriveInfo[]>;
    GetDriveDetails: (device: string) => Promise<DriveInfo>;
};

const noop = (): void => undefined;

const emptyOptions = (): ListDirectoryOptions => ({});

type BatchProgressPayload = {
    taskId?: string;
    type?: string;
    current?: number;
    total?: number;
    file?: string;
    status?: string;
    fileProgress?: { copied?: number; total?: number; error?: string };
    results?: Array<{ source: string; success: boolean; error?: string }>;
    error?: string;
};

function payloadFromEvent(event: unknown): BatchProgressPayload {
    if (event && typeof event === "object" && "data" in event) {
        return (event as { data: BatchProgressPayload }).data ?? {};
    }
    return (event as BatchProgressPayload) ?? {};
}

/** Bridge generated Wails bindings to the renderer window.fsApi contract. */
export function installFsApi(
    fileService: WailsFileService,
    copyService: WailsCopyService,
    driveService: WailsDriveService,
    homeDir: string
): void {
    let currentPath = homeDir;

    window.fsApi = {
        listDir: (path, options) =>
            fileService.ListDir(path, options ?? emptyOptions()),
        navigate: async (path, addToHistory = true) => {
            const result = await fileService.Navigate(path, addToHistory);
            if (result.success) {
                currentPath = result.path;
            }
            return result;
        },
        getCurrentDir: async () => ({
            path: currentPath,
            entries: currentPath
                ? await fileService.ListDir(currentPath, emptyOptions())
                : [],
        }),
        goToParent: async () => {
            if (!currentPath) {
                return { success: false, path: "", entries: [] };
            }
            const result = await fileService.GoToParent(currentPath);
            if (result.success) {
                currentPath = result.path;
            }
            return result;
        },
        getHistory: async () => (currentPath ? [currentPath] : []),
        refresh: async () => {
            if (!currentPath) {
                return [];
            }
            return fileService.ListDir(currentPath, emptyOptions());
        },
        onDirectoryChanged: noop,
        onServiceLoading: noop,
        onDriveLoading: noop,
        onDriveListChanged: noop,
        onDriveRefreshed: noop,
        onDriveChanged: noop,
        getHomeDir: () => homeDir,
        listDrives: () => driveService.ListDrives(),
        refreshDrives: () => driveService.ListDrives(),
        getDriveDetails: device => driveService.GetDriveDetails(device),
        copyFile: async (src, dest) => {
            const result = await copyService.CopyBatch([src], dest);
            return result.batchId;
        },
        copyBatch: async (srcs, dest) => {
            const result = await copyService.CopyBatch(srcs, dest);
            return result.batchId;
        },
        copyEntries: async entries =>
            Promise.all(
                entries.map(async entry => {
                    try {
                        await copyService.CopyBatch(
                            [entry.source],
                            entry.destination
                        );
                        return {
                            success: true,
                            source: entry.source,
                            destination: entry.destination,
                        };
                    } catch (error) {
                        return {
                            success: false,
                            source: entry.source,
                            destination: entry.destination,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        };
                    }
                })
            ),
        onCopyProgress: cb => {
            Events.On(WAILS_EVENTS.COPY_BATCH_PROGRESS, event => {
                const payload = payloadFromEvent(event);
                if (payload.type === "progress") {
                    cb({
                        type: "progress",
                        copied: payload.current ?? 0,
                        total: payload.total ?? 0,
                    });
                } else if (payload.type === "done") {
                    cb({ type: "done" });
                } else if (payload.error) {
                    cb({ type: "error", error: payload.error });
                }
            });
        },
        onCopyBatchProgress: cb => {
            Events.On(WAILS_EVENTS.COPY_BATCH_PROGRESS, event => {
                const payload = payloadFromEvent(event);
                if (!payload.taskId) {
                    return;
                }
                cb(payload as CopyWorkerMessage & BatchProgressPayload);
            });
        },
        getCopyQueueStatus: async () => await copyService.GetCopyQueueStatus(),
        cancelCopyTask: async taskId => {
            const result = await copyService.CancelCopyBatch(taskId);
            return result ?? { cancelled: false, taskId };
        },
        cancelCopyBatch: async batchId => {
            const result = await copyService.CancelCopyBatch(batchId);
            return {
                cancelled: result?.cancelled ?? false,
                taskId: result?.taskId ?? batchId,
            };
        },
    };
}
