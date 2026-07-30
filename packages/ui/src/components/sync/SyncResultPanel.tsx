import React from "react";
import { Cross1Icon } from "@radix-ui/react-icons";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { clearSyncPlan } from "../../app/syncSlice";
import { SYNC_STRATEGY_OPTIONS } from "../../constants/sync";

const SyncResultPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const { report, status } = useAppSelector(s => s.sync);

    if (status !== "done" || !report) return null;

    const strategyLabel =
        SYNC_STRATEGY_OPTIONS.find(s => s.id === report.strategy.id)
            ?.labelKey ?? report.strategy.id;

    return (
        <div className="sync-result-panel">
            <div className="sync-result-panel__header">
                <span>
                    {strategyLabel}: {report.toCopy} copied, {report.toSkip}{" "}
                    skipped
                </span>
                <button
                    className="sync-btn sync-btn--ghost"
                    onClick={() => dispatch(clearSyncPlan())}
                >
                    <Cross1Icon width={14} height={14} />
                </button>
            </div>
            {report.items.length > 0 && (
                <div className="sync-result-panel__items">
                    {report.items.map((item, i) => (
                        <div
                            key={i}
                            className={`sync-result-panel__item sync-result-panel__item--${item.action}`}
                        >
                            <span className="sync-result-panel__path">
                                {item.relativePath}
                            </span>
                            <span className="sync-result-panel__action">
                                {item.action}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SyncResultPanel;
