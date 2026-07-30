import React from "react";
import { Cross1Icon } from "@radix-ui/react-icons";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { clearSyncPlan } from "../../app/syncSlice";
import { cancelSyncJob } from "../../services/syncApiService";

const SyncProgressBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { status, lastJobId, progressFile, progressDone, progressTotal } =
        useAppSelector(s => s.sync);
    const busy = status === "comparing" || status === "syncing";

    if (!busy) return null;

    const pct =
        progressTotal > 0
            ? Math.round((progressDone / progressTotal) * 100)
            : 0;

    const handleCancel = () => {
        if (lastJobId) {
            cancelSyncJob(lastJobId).catch(() => {});
        }
        dispatch(clearSyncPlan());
    };

    return (
        <div className="sync-progress-bar">
            <div className="sync-progress-bar__info">
                {status === "comparing"
                    ? "Comparing..."
                    : `Syncing: ${progressFile || "..."}`}
                <span className="sync-progress-bar__count">
                    {progressDone}/{progressTotal}
                </span>
            </div>
            <div className="sync-progress-bar__track">
                <div
                    className="sync-progress-bar__fill"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <button
                className="sync-btn sync-btn--ghost sync-progress-bar__cancel"
                onClick={handleCancel}
            >
                <Cross1Icon width={14} height={14} />
                Cancel
            </button>
        </div>
    );
};

export default SyncProgressBar;
