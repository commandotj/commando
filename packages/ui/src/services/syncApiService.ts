import type {
    CompareReport,
    SyncExecuteResult,
    SyncExportFormat,
    SyncPlan,
    SyncProgressPayload,
    SyncStrategyId,
} from "@commando/shared/types/SyncTypes";

export interface SyncRequestPayload {
    leftRoot: string;
    rightRoot: string;
    strategyId: SyncStrategyId;
    options: {
        deleteExtraneous?: boolean;
        dryRun?: boolean;
        useChecksum?: boolean;
    };
}

function requireSyncApi(): NonNullable<typeof window.syncApi> {
    if (!window.syncApi) {
        throw new Error("Sync API is not available in this environment");
    }
    return window.syncApi;
}

function waitForJob<T>(jobId: string): Promise<T> {
    const api = requireSyncApi();
    return new Promise<T>((resolve, reject) => {
        api.onProgress((payload: SyncProgressPayload) => {
            if (payload.jobId !== jobId) {
                return;
            }
            const terminal =
                payload.type === "done" ||
                payload.status === "done" ||
                payload.status === "error" ||
                payload.status === "canceled";
            if (!terminal) {
                return;
            }
            if (payload.status === "error" || payload.error) {
                reject(new Error(payload.error ?? "Sync job failed"));
                return;
            }
            resolve(payload.result as T);
        });
    });
}

export async function compareFolders(
    request: SyncRequestPayload
): Promise<CompareReport> {
    const api = requireSyncApi();
    const { jobId } = await api.compare({
        ...request,
        options: { ...request.options, dryRun: true },
    });
    return waitForJob<CompareReport>(jobId);
}

export async function executePlan(
    plan: SyncPlan,
    options: SyncRequestPayload["options"]
): Promise<SyncExecuteResult> {
    const api = requireSyncApi();
    const { jobId } = await api.execute(plan, options);
    return waitForJob<SyncExecuteResult>(jobId);
}

export async function exportCompareReport(
    report: CompareReport,
    filePath: string,
    format: SyncExportFormat = "json"
): Promise<string> {
    const api = requireSyncApi();
    const result = await api.exportReport({ report, filePath, format });
    return result.filePath;
}

export async function cancelSyncJob(jobId: string): Promise<void> {
    const api = requireSyncApi();
    await api.cancel(jobId);
}
