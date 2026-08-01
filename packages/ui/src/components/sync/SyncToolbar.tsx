import React from "react";
import { CounterClockwiseClockIcon, PlayIcon } from "@radix-ui/react-icons";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
    compareSync,
    runSync,
    setPlanModalOpen,
    setStrategyId,
} from "../../app/syncSlice";
import { cancelSyncJob } from "../../services/syncApiService";
import { SYNC_STRATEGY_OPTIONS } from "../../constants/sync";
import { useI18n } from "../../hooks/useI18n";
import { ThemeSwitchButton } from "../ThemeSwitcher";
import SyncLocaleSelector from "./SyncLocaleSelector";
import SyncLegend from "./SyncLegend";
import SyncMoreOptions from "./SyncMoreOptions";
import SyncProgressBar from "./SyncProgressBar";
import SyncResultPanel from "./SyncResultPanel";
import SyncPlanModal from "./SyncPlanModal";
import { useSyncRootsState } from "../../hooks/useSyncRootsState";
import SyncSummaryStrip from "./SyncSummaryStrip";

const SyncToolbar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useI18n();
    const {
        strategyId,
        plan,
        status,
        error,
        planModalOpen,
        progressFile,
        progressAction,
        progressDone,
        progressTotal,
        lastJobId,
    } = useAppSelector(state => state.sync);
    const { state: rootsState, rootsReady } = useSyncRootsState();
    const busy = status === "comparing" || status === "syncing";

    const handleModalClose = (): void => {
        if (status === "comparing" && lastJobId) {
            void cancelSyncJob(lastJobId);
        }
        dispatch(setPlanModalOpen(false));
    };

    const startCompareWithModal = (): void => {
        dispatch(setPlanModalOpen(true));
        void dispatch(compareSync());
    };

    const handleCompare = (): void => {
        startCompareWithModal();
    };

    const handleSync = (): void => {
        startCompareWithModal();
    };

    const handleConfirmSync = (): void => {
        void dispatch(runSync());
    };

    return (
        <>
            <header className="sync-toolbar">
                <div className="sync-toolbar__top wails-drag">
                    <span className="sync-toolbar__brand">Commando Sync</span>
                    <div className="sync-toolbar__actions">
                        <SyncLocaleSelector />
                        <ThemeSwitchButton />
                    </div>
                </div>
                <div className="sync-toolbar__bottom wails-no-drag">
                    <select
                        className="sync-select"
                        value={strategyId}
                        onChange={e =>
                            dispatch(
                                setStrategyId(
                                    e.target.value as typeof strategyId
                                )
                            )
                        }
                        aria-label={t("sync.toolbar.strategy")}
                    >
                        {SYNC_STRATEGY_OPTIONS.map(strategy => (
                            <option key={strategy.id} value={strategy.id}>
                                {t(strategy.labelKey)}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className="sync-btn sync-btn--ghost"
                        disabled={busy}
                        onClick={handleCompare}
                    >
                        <CounterClockwiseClockIcon width={14} height={14} />
                        {busy && status === "comparing"
                            ? t("sync.toolbar.comparing")
                            : t("sync.toolbar.compare")}
                    </button>

                    <button
                        type="button"
                        className="sync-btn sync-btn--primary"
                        disabled={busy || (!plan && !rootsReady)}
                        onClick={handleSync}
                    >
                        <PlayIcon width={14} height={14} />
                        {busy && status === "syncing"
                            ? t("sync.toolbar.syncing")
                            : t("sync.toolbar.sync")}
                    </button>

                    <SyncLegend />
                    <SyncMoreOptions />
                </div>
            </header>

            <SyncSummaryStrip plan={plan} rootsState={rootsState} />

            <SyncPlanModal
                open={planModalOpen}
                plan={plan}
                comparing={status === "comparing"}
                progressFile={progressFile}
                progressAction={progressAction}
                progressDone={progressDone}
                progressTotal={progressTotal}
                loading={status === "syncing"}
                onClose={handleModalClose}
                onConfirm={handleConfirmSync}
            />

            {error && (
                <div className="sync-error-banner" role="alert">
                    {error}
                </div>
            )}
            <SyncProgressBar />
            <SyncResultPanel />
        </>
    );
};

export default SyncToolbar;
