import React from "react";
import { CounterClockwiseClockIcon, PlayIcon } from "@radix-ui/react-icons";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchDirectory } from "../../app/fileManagerSlice";
import {
    compareSync,
    runSync,
    setDeleteExtraneous,
    setDryRun,
    setPlanModalOpen,
    setStrategyId,
} from "../../app/syncSlice";
import { SYNC_STRATEGY_OPTIONS } from "../../constants/sync";
import { useI18n } from "../../hooks/useI18n";
import { ThemeSwitchButton } from "../ThemeSwitcher";
import SyncLegend from "./SyncLegend";
import SyncPlanModal from "./SyncPlanModal";
import SyncSummaryStrip from "./SyncSummaryStrip";

const SyncToolbar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useI18n();
    const { panes } = useAppSelector(state => state.fileManager);
    const { strategyId, options, plan, status, error, planModalOpen } =
        useAppSelector(state => state.sync);

    const leftRoot = panes[0].syncRoot;
    const rightRoot = panes[1].syncRoot;
    const rootsReady = Boolean(leftRoot && rightRoot);
    const busy = status === "comparing" || status === "syncing";

    const handleCompare = (): void => {
        void dispatch(compareSync());
    };

    const handleSync = (): void => {
        if (plan) {
            dispatch(setPlanModalOpen(true));
            return;
        }
        void dispatch(compareSync());
    };

    const handleConfirmSync = (): void => {
        void dispatch(runSync()).then(result => {
            if (runSync.fulfilled.match(result)) {
                dispatch(fetchDirectory({ paneIndex: 0, path: leftRoot }));
                dispatch(fetchDirectory({ paneIndex: 1, path: rightRoot }));
            }
        });
    };

    return (
        <>
            <header className="sync-toolbar">
                <div
                    className="sync-titlebar wails-drag"
                    aria-label="Window title bar"
                >
                    <div className="sync-toolbar__brand">Commando Sync</div>
                </div>
                <div className="sync-toolbar__top wails-no-drag">
                    <SyncSummaryStrip
                        plan={plan}
                        comparing={status === "comparing"}
                        rootsReady={rootsReady}
                    />
                    <ThemeSwitchButton />
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
                        disabled={!rootsReady || busy}
                        onClick={handleCompare}
                    >
                        <CounterClockwiseClockIcon
                            width={14}
                            height={14}
                            aria-hidden
                        />
                        {busy && status === "comparing"
                            ? t("sync.toolbar.comparing")
                            : t("sync.toolbar.compare")}
                    </button>

                    <button
                        type="button"
                        className="sync-btn sync-btn--primary"
                        disabled={!rootsReady || busy}
                        onClick={handleSync}
                    >
                        <PlayIcon width={14} height={14} aria-hidden />
                        {busy && status === "syncing"
                            ? t("sync.toolbar.syncing")
                            : t("sync.toolbar.sync")}
                    </button>

                    <label className="sync-toggle">
                        <input
                            type="checkbox"
                            checked={options.deleteExtraneous}
                            onChange={e =>
                                dispatch(setDeleteExtraneous(e.target.checked))
                            }
                        />
                        {t("sync.toolbar.deleteExtraneous")}
                    </label>

                    <label className="sync-toggle">
                        <input
                            type="checkbox"
                            checked={options.dryRun}
                            onChange={e =>
                                dispatch(setDryRun(e.target.checked))
                            }
                        />
                        {t("sync.toolbar.dryRun")}
                    </label>

                    <SyncLegend />
                </div>
            </header>

            <SyncPlanModal
                open={planModalOpen}
                plan={plan}
                loading={status === "syncing"}
                onClose={() => dispatch(setPlanModalOpen(false))}
                onConfirm={handleConfirmSync}
            />

            {error && (
                <div className="sync-error-banner" role="alert">
                    {error}
                </div>
            )}
        </>
    );
};

export default SyncToolbar;
