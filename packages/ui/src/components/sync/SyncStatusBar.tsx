import React from "react";
import { useAppSelector } from "../../app/hooks";
import { useI18n } from "../../hooks/useI18n";

const SyncStatusBar: React.FC = () => {
    const { t } = useI18n();
    const { status, plan, error } = useAppSelector(state => state.sync);
    const { panes } = useAppSelector(state => state.fileManager);

    const busy = status === "comparing" || status === "syncing";

    let message = t("sync.status.ready");
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
    }

    const rootsLabel = [panes[0].syncRoot, panes[1].syncRoot]
        .filter(Boolean)
        .join(" ↔ ");

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
