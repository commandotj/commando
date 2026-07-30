/** Sync direction — mirrors backend internal/sync.Direction */
export type SyncDirection = "left-to-right" | "right-to-left" | "bidirectional";

export type SyncAction = "copy" | "delete" | "skip" | "conflict";

export type SyncStrategyId =
    "mirror-right" | "update-right" | "mirror-left" | "update-left" | "two-way";

export interface SyncStrategy {
    id: SyncStrategyId;
    direction: SyncDirection;
    deleteExtraneous: boolean;
    label: string;
    description: string;
}

export interface SyncOptions {
    deleteExtraneous: boolean;
    dryRun: boolean;
    useChecksum: boolean;
    filter?: SyncFilterRules;
}

export interface SyncFilterRules {
    include: string[];
    exclude: string[];
}

export interface SyncPlanItem {
    relativePath: string;
    action: SyncAction;
    source: string;
    destination: string;
    reason: string;
}

export interface SyncPlan {
    leftRoot: string;
    rightRoot: string;
    direction: SyncDirection;
    items: SyncPlanItem[];
    conflicts: number;
    toCopy: number;
    toDelete: number;
    toSkip: number;
}

/** Row in a compare report — explicit from/to paths for export and UI. */
export interface CompareReportItem {
    relativePath: string;
    action: SyncAction;
    from: string;
    to: string;
    reason: string;
}

/** Compare output from Go sync module (strategy + planned actions). */
export interface CompareReport {
    strategy: SyncStrategy;
    leftRoot: string;
    rightRoot: string;
    generatedAt: string;
    items: CompareReportItem[];
    conflicts: number;
    toCopy: number;
    toDelete: number;
    toSkip: number;
    plan: SyncPlan;
}

export type SyncExportFormat = "json" | "csv" | "text";

export interface SyncExecuteResult {
    copied: number;
    skipped: number;
    deleted: number;
    errors: string[];
}

export type SyncJobStatus = "idle" | "comparing" | "syncing" | "done" | "error";

export interface SyncProgressPayload {
    jobId?: string;
    type?: string;
    status?: string;
    result?: unknown;
    error?: string;
    // Per-item progress (RFC-034)
    file?: string;
    action?: SyncAction;
    done?: number;
    total?: number;
}
