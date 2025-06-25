import type { CopyWorkerMessage } from "../../../typings/copy";

export {};

declare global {
    interface Window {
        fsApi: {
            listDir: (path: string) => Promise<unknown>;
            getHomeDir: () => string;
            listDrives: () => Promise<
                Array<{
                    device: string;
                    description: string;
                    size: number;
                    mountpoints: Array<{ path: string }>;
                    isSystem: boolean;
                    isRemovable: boolean;
                }>
            >;
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
