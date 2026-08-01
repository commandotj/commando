import { Events } from "@wailsio/runtime";
import {
    dispatchSyncProgress,
    subscribeSyncProgress,
} from "@commandojs/ui/services/syncJobHub";
import {
    CancelSync,
    Compare,
    Execute,
    ExportReport,
    Plan,
} from "../../bindings/github.com/systembug/commando/apps/desktop/services/syncservice.js";
import type * as SyncModels from "../../bindings/github.com/systembug/commando/internal/sync/models.js";
import type * as ServiceModels from "../../bindings/github.com/systembug/commando/apps/desktop/services/models.js";
import type { SyncProgressPayload } from "@commandojs/shared/types/SyncTypes";
import { WAILS_EVENTS } from "./constants";

function payloadFromEvent<T>(event: unknown): T {
    if (event && typeof event === "object" && "data" in event) {
        return (event as { data: T }).data;
    }
    return event as T;
}

let progressListenerInstalled = false;

function ensureProgressListener(): void {
    if (progressListenerInstalled) {
        return;
    }
    progressListenerInstalled = true;
    Events.On(WAILS_EVENTS.SYNC_PROGRESS, event => {
        dispatchSyncProgress(payloadFromEvent<SyncProgressPayload>(event));
    });
}

/** Bridge generated sync bindings to window.syncApi. */
export function installSyncApi(): void {
    ensureProgressListener();

    window.syncApi = {
        plan: req => Plan(req as ServiceModels.SyncRequest),
        compare: req => Compare(req as ServiceModels.SyncRequest),
        exportReport: req =>
            ExportReport({
                report: req.report as SyncModels.CompareReport,
                filePath: req.filePath,
                format: (req.format ?? "json") as SyncModels.ExportFormat,
            }),
        execute: (plan, opts) =>
            Execute(plan as SyncModels.Plan, opts as SyncModels.Options),
        cancel: jobId => CancelSync(jobId),
        onProgress: cb => subscribeSyncProgress(cb),
    };
}
