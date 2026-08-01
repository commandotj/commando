import type { SyncExecuteResult } from "@commandojs/shared/types/SyncTypes";

/** Go nil slices JSON-decode as null; UI always expects an array. */
export function normalizeExecuteResult(
    raw: SyncExecuteResult | null | undefined
): SyncExecuteResult {
    return {
        copied: raw?.copied ?? 0,
        skipped: raw?.skipped ?? 0,
        deleted: raw?.deleted ?? 0,
        errors: raw?.errors ?? [],
    };
}
