import type {
    CompareReport,
    SyncExecuteResult,
    SyncExportFormat,
    SyncOptions,
    SyncPlan,
    SyncProgressPayload,
    SyncStrategyId,
} from "@commandojs/shared/types/SyncTypes";
import { normalizeCompareResult } from "../common/compareReport";
import { waitForSyncJob } from "./syncJobHub";

export interface SyncRequestPayload {
    leftRoot: string;
    rightRoot: string;
    strategyId: SyncStrategyId;
    options: SyncOptions;
}

function requireSyncApi(): NonNullable<typeof window.syncApi> {
    if (!window.syncApi) {
        throw new Error("Sync API is not available in this environment");
    }
    return window.syncApi;
}

export async function compareFolders(
    request: SyncRequestPayload
): Promise<CompareReport> {
    const api = requireSyncApi();
    const { jobId } = await api.compare({
        ...request,
        options: { ...request.options, dryRun: true },
    });
    const raw = await waitForSyncJob<unknown>(jobId, () => {});
    return normalizeCompareResult(raw, request.strategyId);
}

export async function executePlan(
    plan: SyncPlan,
    options: SyncOptions,
    onProgress?: (payload: SyncProgressPayload) => void
): Promise<SyncExecuteResult> {
    const api = requireSyncApi();
    const { jobId } = await api.execute(plan, options);
    return waitForSyncJob<SyncExecuteResult>(jobId, p => onProgress?.(p));
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
