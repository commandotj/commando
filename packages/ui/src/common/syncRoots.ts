/** Normalize a sync root path for equality checks. */
export function normalizeSyncRootPath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) {
        return "";
    }
    if (trimmed === "/") {
        return "/";
    }
    return trimmed.replace(/\/+$/, "");
}

/** Whether two sync roots refer to the same folder. */
export function areSyncRootsEqual(left: string, right: string): boolean {
    const normalizedLeft = normalizeSyncRootPath(left);
    const normalizedRight = normalizeSyncRootPath(right);
    if (!normalizedLeft || !normalizedRight) {
        return false;
    }
    return normalizedLeft === normalizedRight;
}

export type SyncRootsState =
    | { kind: "missing-both" }
    | { kind: "missing-left" }
    | { kind: "missing-right" }
    | { kind: "same-path"; path: string }
    | { kind: "ready" };

/** Derive compare/sync readiness from left and right sync roots. */
export function getSyncRootsState(
    leftRoot: string,
    rightRoot: string
): SyncRootsState {
    const left = normalizeSyncRootPath(leftRoot);
    const right = normalizeSyncRootPath(rightRoot);

    if (!left && !right) {
        return { kind: "missing-both" };
    }
    if (!left) {
        return { kind: "missing-left" };
    }
    if (!right) {
        return { kind: "missing-right" };
    }
    if (left === right) {
        return { kind: "same-path", path: left };
    }
    return { kind: "ready" };
}

export function isSyncRootsReady(state: SyncRootsState): boolean {
    return state.kind === "ready";
}

const ONBOARDING_I18N_KEY: Record<SyncRootsState["kind"], string> = {
    "missing-both": "sync.onboarding.pickFolders",
    "missing-left": "sync.onboarding.setLeftRoot",
    "missing-right": "sync.onboarding.setRightRoot",
    "same-path": "sync.onboarding.sameRoots",
    "ready": "sync.onboarding.clickCompare",
};

const STATUS_I18N_KEY: Record<SyncRootsState["kind"], string> = {
    "missing-both": "sync.status.ready",
    "missing-left": "sync.status.missingLeft",
    "missing-right": "sync.status.missingRight",
    "same-path": "sync.status.sameRoots",
    "ready": "sync.status.ready",
};

/** i18n key for toolbar/summary onboarding prompts. */
export function getSyncRootsOnboardingKey(state: SyncRootsState): string {
    return ONBOARDING_I18N_KEY[state.kind];
}

/** i18n key for status bar when compare/sync is not ready. */
export function getSyncRootsStatusKey(state: SyncRootsState): string {
    return STATUS_I18N_KEY[state.kind];
}
