import React from "react";
import { Cross1Icon } from "@radix-ui/react-icons";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { clearSyncPlan } from "../../app/syncSlice";
import { cancelSyncJob } from "../../services/syncApiService";
import { useI18n } from "../../hooks/useI18n";

const SyncProgressBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useI18n();
    const {
        status,
        lastJobId,
        progressFile,
        progressAction,
        progressDone,
        progressTotal,
    } = useAppSelector(s => s.sync);
    const busy = status === "syncing";

    if (!busy) return null;

    const pct =
        progressTotal > 0
            ? Math.round((progressDone / progressTotal) * 100)
            : 0;

    const actionLabel =
        progressAction && progressAction !== "skip"
            ? progressAction
            : t("sync.status.syncing");

    const handleCancel = () => {
        if (lastJobId) {
            cancelSyncJob(lastJobId).catch(() => {});
        }
        dispatch(clearSyncPlan());
    };

    return (
        <div className="sync-progress-bar">
            <div className="sync-progress-bar__info">
                <span className="sync-progress-bar__action">{actionLabel}</span>
                <span className="sync-progress-bar__file">
                    {progressFile || "…"}
                </span>
                <span className="sync-progress-bar__count">
                    {progressDone.toLocaleString()}/
                    {progressTotal > 0 ? progressTotal.toLocaleString() : "…"}
                    {progressTotal > 0 ? ` (${pct}%)` : ""}
                </span>
            </div>
            {progressTotal > 0 && (
                <div
                    className="sync-progress-bar__track"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <div
                        className="sync-progress-bar__fill"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}
            <button
                type="button"
                className="sync-btn sync-btn--ghost sync-progress-bar__cancel"
                onClick={handleCancel}
            >
                <Cross1Icon width={14} height={14} />
                {t("sync.plan.cancel")}
            </button>
        </div>
    );
};

export default SyncProgressBar;
