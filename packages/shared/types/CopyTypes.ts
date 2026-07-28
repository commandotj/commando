/** Shared copy/sync progress message types. */

export interface CopyParams {
    src: string;
    dest: string;
}

export interface ProgressMsg {
    type: "progress";
    copied: number;
    total: number;
    taskId?: string;
    file?: string;
    current?: number;
    status?: string;
}

export interface DoneMsg {
    type: "done";
    taskId?: string;
    status?: string;
}

export interface ErrorMsg {
    type: "error";
    error: string;
    taskId?: string;
}

export type CopyWorkerMessage = ProgressMsg | DoneMsg | ErrorMsg;
