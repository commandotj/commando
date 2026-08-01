import type {
    CompareReport,
    CompareReportItem,
    SyncDirection,
    SyncPlan,
    SyncPlanItem,
    SyncStrategy,
    SyncStrategyId,
} from "@commandojs/shared/types/SyncTypes";
import { SYNC_STRATEGY_DELETE_EXTRANEOUS } from "../constants/sync";

const STRATEGY_DIRECTION: Record<SyncStrategyId, SyncDirection> = {
    "mirror-right": "left-to-right",
    "update-right": "left-to-right",
    "mirror-left": "right-to-left",
    "update-left": "right-to-left",
    "two-way": "bidirectional",
};

function strategyFromId(strategyId: SyncStrategyId): SyncStrategy {
    return {
        id: strategyId,
        direction: STRATEGY_DIRECTION[strategyId],
        deleteExtraneous: SYNC_STRATEGY_DELETE_EXTRANEOUS[strategyId],
        label: strategyId,
        description: "",
    };
}

function planItemToReportItem(item: SyncPlanItem): CompareReportItem {
    return {
        relativePath: item.relativePath,
        action: item.action,
        from: item.source,
        to: item.destination,
        reason: item.reason,
    };
}

/** CLI `sync plan --progress` returns a Plan; UI expects CompareReport. */
export function compareReportFromPlan(
    plan: SyncPlan,
    strategyId: SyncStrategyId
): CompareReport {
    return {
        strategy: strategyFromId(strategyId),
        leftRoot: plan.leftRoot,
        rightRoot: plan.rightRoot,
        generatedAt: new Date().toISOString(),
        items: (plan.items ?? []).map(planItemToReportItem),
        conflicts: plan.conflicts,
        toCopy: plan.toCopy,
        toDelete: plan.toDelete,
        toSkip: plan.toSkip,
        plan,
    };
}

function isCompareReportItem(
    value: unknown
): value is CompareReportItem {
    return (
        typeof value === "object" &&
        value !== null &&
        "from" in value &&
        typeof (value as CompareReportItem).from === "string"
    );
}

/** Accept CLI Plan or legacy CompareReport from Wails. */
export function normalizeCompareResult(
    result: unknown,
    strategyId: SyncStrategyId
): CompareReport {
    if (!result || typeof result !== "object") {
        throw new Error("Invalid compare result");
    }
    const record = result as Record<string, unknown>;
    const items = record.items;
    if (Array.isArray(items) && items.length > 0 && isCompareReportItem(items[0])) {
        return result as CompareReport;
    }
    if ("leftRoot" in record && "rightRoot" in record) {
        return compareReportFromPlan(result as SyncPlan, strategyId);
    }
    throw new Error("Invalid compare result");
}
