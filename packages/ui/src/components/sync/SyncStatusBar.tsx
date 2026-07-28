import React from "react";
import { useAppSelector } from "../../app/hooks";
import { useI18n } from "../../hooks/useI18n";
import { useSyncRootsState } from "../../hooks/useSyncRootsState";
import { getSyncRootsStatusKey } from "../../common/syncRoots";

const SyncStatusBar: React.FC = () => {
    const { t } = useI18n();
    const { status, plan, error } = useAppSelector(state => state.sync);
    const { leftRoot, rightRoot, state: rootsState } = useSyncRootsState();

    const busy = status === "comparing" || status === "syncing";

    let message = t(getSyncRootsStatusKey(rootsState));
    if (status === "comparing") {
        message = t("sync.status.comparing");
    } else if (status === "syncing") {
        message = t("sync.status.syncing");
    } else if (status === "done" && plan) {
        message = t("sync.status.compared", {
            copy: plan.toCopy,
            delete: plan.toDelete,
        });
    } else if (status === "done") {
        message = t("sync.status.complete");
    } else if (status === "error" && error) {
        message = error;
    } else if (rootsState.kind === "ready" && status === "idle") {
        message = t("sync.status.ready");
    }

    const rootsLabel = [leftRoot, rightRoot].filter(Boolean).join(" ↔ ");

    return (
        <footer
            className={`sync-status-bar ${busy ? "sync-status-bar--busy" : ""}`}
            aria-live="polite"
        >
            <span className="sync-status-pulse">{message}</span>
            {rootsLabel && (
                <span className="sync-status-bar__roots">{rootsLabel}</span>
            )}
        </footer>
    );
};

export default SyncStatusBar;
