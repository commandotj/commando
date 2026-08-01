import type { SyncProgressPayload } from "@commandojs/shared/types/SyncTypes";

type JobHandler = (payload: SyncProgressPayload) => void;

const globalHandlers = new Set<JobHandler>();
const jobBuffers = new Map<string, SyncProgressPayload[]>();
const jobHandlers = new Map<string, Set<JobHandler>>();

/** Normalize Wails event payloads (camelCase or legacy PascalCase). */
export function normalizeSyncProgressPayload(
    raw: SyncProgressPayload & Record<string, unknown>
): SyncProgressPayload {
    const jobId =
        raw.jobId ??
        (typeof raw.JobID === "string" ? raw.JobID : undefined);
    const type =
        raw.type ?? (typeof raw.Type === "string" ? raw.Type : undefined);
    const status =
        raw.status ??
        (typeof raw.Status === "string" ? raw.Status : undefined);
    const error =
        raw.error ?? (typeof raw.Error === "string" ? raw.Error : undefined);
    const file =
        raw.file ?? (typeof raw.File === "string" ? raw.File : undefined);
    const action =
        raw.action ??
        (typeof raw.Action === "string" ? raw.Action : undefined);
    const done =
        raw.done ??
        (typeof raw.Done === "number" ? raw.Done : undefined);
    const total =
        raw.total ??
        (typeof raw.Total === "number" ? raw.Total : undefined);

    return {
        jobId,
        type,
        status,
        result: raw.result ?? raw.Result,
        error,
        file,
        action: action as SyncProgressPayload["action"],
        done,
        total,
    };
}

export function subscribeSyncProgress(handler: JobHandler): () => void {
    globalHandlers.add(handler);
    return () => globalHandlers.delete(handler);
}

/** Called from Wails platform layer on each sync-progress event. */
export function dispatchSyncProgress(payload: SyncProgressPayload): void {
    const normalized = normalizeSyncProgressPayload(
        payload as SyncProgressPayload & Record<string, unknown>
    );

    globalHandlers.forEach(handler => handler(normalized));

    const jobId = normalized.jobId;
    if (!jobId) {
        return;
    }
    const handlers = jobHandlers.get(jobId);
    if (handlers) {
        handlers.forEach(handler => handler(normalized));
        return;
    }
    const buffered = jobBuffers.get(jobId) ?? [];
    buffered.push(normalized);
    jobBuffers.set(jobId, buffered);
}

function attachJobHandler(jobId: string, handler: JobHandler): () => void {
    let handlers = jobHandlers.get(jobId);
    if (!handlers) {
        handlers = new Set();
        jobHandlers.set(jobId, handlers);
    }
    handlers.add(handler);

    const buffered = jobBuffers.get(jobId) ?? [];
    jobBuffers.delete(jobId);
    queueMicrotask(() => {
        for (const payload of buffered) {
            handler(payload);
        }
    });

    return () => {
        handlers?.delete(handler);
        if (handlers && handlers.size === 0) {
            jobHandlers.delete(jobId);
        }
    };
}

/** Wait for CLI job completion; replays events that arrived before subscribe. */
export function waitForSyncJob<T>(
    jobId: string,
    onProgress: (payload: SyncProgressPayload) => void
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let settled = false;
        let detach = (): void => {};
        detach = attachJobHandler(jobId, payload => {
            if (settled) {
                return;
            }
            if (payload.type === "progress") {
                onProgress(payload);
                return;
            }
            if (payload.type !== "done") {
                return;
            }
            settled = true;
            detach();
            if (payload.status === "error" || payload.error) {
                reject(new Error(payload.error ?? "Sync job failed"));
                return;
            }
            if (payload.status === "canceled") {
                reject(new Error("Sync job canceled"));
                return;
            }
            resolve(payload.result as T);
        });
    });
}
